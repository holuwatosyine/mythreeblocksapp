/// <reference lib="webworker" />

import * as THREE from 'three/webgpu';
import {
	configureWorkerShaderCapture,
	createWorkerRuntime,
	errorMessage,
	setWorkerShaderCaptureVisibility,
	STATS_SCENE_PANEL,
	type AppScene, type AppWorkerEvents, type AppWorkerRequests, type AppWorkerState,
	type RuntimeStatus, type ScrollState, type WorkerRuntime,
} from 'three-blocks/app';
import { createSceneHotReloader, type SceneHotReloader } from 'three-blocks/hmr';
import { createDispatcher, type FrameContext } from 'three-blocks/runtime';
import type { TextConfiguration } from 'three-blocks/text';
import { loadThreeBlocksMeshoptDecoder, threeBlocksConfig } from 'three-blocks/vite/config';
import {
	createWorkerClient,
	createWorkerServer,
	serializeWorkerError,
	type WorkerClient,
} from 'three-blocks/worker';
import { assetManifest } from './assets';
import { createScene, loadShaderManifest, sceneKey } from './scene';
import type {
	AppPageEvents,
	AppPageRequests,
	StarterPageState,
	StarterShaderParityControl,
	StarterWorkerState,
} from './protocol';

type FrameValues = { readonly scroll: ScrollState };
interface TextEffect {
	pointer( value: AppWorkerState[ 'pointer' ] ): void;
	render(): void;
	dispose(): void;
}
interface TextModule {
	readonly textConfig: TextConfiguration;
	readonly createTextEffect?: (
		renderer: THREE.WebGPURenderer,
		scene: THREE.Scene,
		camera: THREE.PerspectiveCamera,
		shaders: ReturnType<WorkerRuntime[ 'createSceneContext' ]>[ 'shaders' ]
	) => TextEffect;
}
const textModules = import.meta.glob<TextModule>( '../three-blocks.text.ts', { eager: true } );
const textModule = Object.values( textModules )[ 0 ];
const textConfig = textModule?.textConfig;
const emptyScroll: ScrollState = { progress: 0, position: 0, velocity: 0, direction: 0 };

let viewport = { width: 1, height: 1, dpr: 1 };
let scroll = emptyScroll;
let visible = true;
let initialized = false;
let renderer: THREE.WebGPURenderer | undefined;
let camera: THREE.PerspectiveCamera | undefined;
let environmentTarget: THREE.RenderTarget | undefined;
let page: WorkerClient<StarterPageState, AppPageEvents, AppPageRequests> | undefined;
let runtime: WorkerRuntime | undefined;
let reloader: SceneHotReloader<AppScene, WorkerRuntime> | undefined;
let textEffect: TextEffect | undefined;
let statsPanel: AppWorkerState[ 'statsPanel' ] = { name: STATS_SCENE_PANEL, enabled: false, visible: false };
let shaderParity: StarterShaderParityControl = { controlled: false, targetFrame: 0 };
let completedShaderParityFrame = 0;
const workerId = crypto.randomUUID();
const setStatus = ( value: RuntimeStatus ): void => page?.state.set( 'lifecycle', value );
const reportError = ( error: unknown ): void => page?.events.emit( 'error', serializeWorkerError( error, {
	source: 'render.worker',
	lifecyclePhase: 'transport',
} ) );

function fail( error: unknown ): void {
	reportError( error );
	setStatus( { stage: 'error', detail: errorMessage( error ) } );
}

function resize(): void {
	if ( renderer === undefined || camera === undefined ) return;
	renderer.setPixelRatio( viewport.dpr );
	renderer.setSize( viewport.width, viewport.height, false );
	camera.aspect = viewport.width / Math.max( viewport.height, 1 );
	const framingScale = camera.aspect < 0.8 ? Math.min( 2.2, 1.1 / Math.max( camera.aspect, 0.5 ) ) : 1;
	camera.position.set( 0, - 0.05 + 0.25 * framingScale, 5 * framingScale );
	camera.updateProjectionMatrix();
}

function receiveViewport( value: AppWorkerState[ 'viewport' ] ): void {
	viewport = value;
	resize();
}

function receiveShaderParity( value: StarterShaderParityControl ): void {
	shaderParity = {
		controlled: value.controlled === true,
		targetFrame: Number.isSafeInteger( value.targetFrame ) && value.targetFrame >= 0
			? value.targetFrame
			: 0,
	};
}

async function initialize( boot: AppWorkerState[ 'boot' ] ): Promise<void> {
	if ( initialized ) throw new Error( 'The render worker was initialized twice.' );
	initialized = true;
	configureWorkerShaderCapture( boot.shaderCapture );
	page = createWorkerClient<StarterPageState, AppPageEvents, AppPageRequests>(
		{ validateStructuredClone: threeBlocksConfig.development }
	);
	await page.replaceEndpoint( boot.page );
	setStatus( { stage: 'worker ready', detail: 'Worker ready \u00B7 initializing renderer' } );

	const scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x070910 );
	const activeCamera = new THREE.PerspectiveCamera( 45, 1, 0.1, 100 );
	activeCamera.position.set( 0, 0.2, 5 );
	activeCamera.lookAt( 0, - 0.05, 0 );
	const activeRenderer = new THREE.WebGPURenderer( { antialias: true, canvas: boot.canvas } );
	camera = activeCamera;
	renderer = activeRenderer;
	await activeRenderer.init();
	activeRenderer.shadowMap.enabled = true;
	activeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
	resize();

	const activeRuntime = await createWorkerRuntime( {
		renderer: activeRenderer,
		scene,
		sceneKey,
		loadShaderManifest,
		page,
		configuration: { client: threeBlocksConfig, loadMeshopt: loadThreeBlocksMeshoptDecoder },
		...( textConfig === undefined ? {} : { text: textConfig } ),
	} );
	runtime = activeRuntime;
	activeRuntime.setStatsPanel( statsPanel.name, statsPanel.enabled, statsPanel.visible );

	// Prefilter the compressed HDR environment explicitly before any material
	// compiles: assigning the equirect lazily would rebuild environment-lit
	// materials mid-session, which shader capture rejects as a key collision.
	const sceneContext = activeRuntime.createSceneContext();
	const loadedAssets = await sceneContext.assets.load( assetManifest );
	const equirect = loadedAssets.environment;
	equirect.mapping = THREE.EquirectangularReflectionMapping;
	const environmentGenerator = new THREE.PMREMGenerator( activeRenderer );
	environmentTarget = environmentGenerator.fromEquirectangular( equirect );
	environmentGenerator.dispose();
	equirect.dispose();
	scene.environment = environmentTarget.texture;
	scene.environmentIntensity = 0.9;
	textEffect = textModule?.createTextEffect?.( activeRenderer, scene, activeCamera, sceneContext.shaders );

	const first = await createScene( sceneContext );
	scene.add( first );
	setStatus( { stage: 'assets ready', detail: 'Assets ready \u00B7 compiling scene' } );
	if ( textEffect ) textEffect.render();
	else await activeRenderer.compileAsync( scene, activeCamera );
	setStatus( { stage: 'compiled', detail: `Compiled \u00B7 shaders ${activeRuntime.installation.mode}` } );

	const dispatcher = createDispatcher<Record<string, never>, FrameValues>( { context: { scroll } } );
	const sceneReloader = createSceneHotReloader<AppScene, WorkerRuntime>( first, {
		context: activeRuntime,
		pause: () => dispatcher.pause(),
		resume: () => dispatcher.resume(),
		compile: async ( candidate ) => {
			scene.add( candidate );
			try {
				if ( textEffect ) textEffect.render();
				else await activeRenderer.compileAsync( scene, activeCamera );
			} finally {
				scene.remove( candidate );
			}
		},
		commit: ( candidate, previous ) => {
			scene.remove( previous );
			scene.add( candidate );
		},
	} );
	reloader = sceneReloader;
	dispatcher.register( {
		onRaf( frame: FrameContext<FrameValues> ) {
			sceneReloader.current.update( frame.delta, frame.scroll );
		},
	} );
	dispatcher.register( {
		raf: { renderPriority: Number.POSITIVE_INFINITY },
		onRaf: () => {
			if ( textEffect ) textEffect.render();
			else activeRenderer.render( scene, activeCamera );
		},
	} );
	let running = false;
	let firstFrame = true;
	let shaderMode = activeRuntime.installation.mode;
	let shaderSignature = '';
	const publishDiagnostics = ( force = false ): void => {
		const installation = activeRuntime.installation;
		const stats = installation.runtimeStats;
		const shaders = stats === undefined
			? undefined
			: {
				injected: stats.injected, missed: stats.missed, live: stats.live,
				hydrationMs: stats.hydrationMs, maxHydrationMs: stats.maxHydrationMs,
			};
		const signature = shaders === undefined ? '' : JSON.stringify( shaders );
		if ( ! force && signature === shaderSignature ) return;
		shaderSignature = signature;
		page?.state.set( 'diagnostics', {
			workerId, viewport, scroll, visible, shaderMode,
			...( shaders === undefined ? {} : { shaders } ),
		} );
	};
	activeRenderer.setAnimationLoop( ( time ) => {
		if ( running || ! visible ) return;
		if ( shaderParity.controlled && completedShaderParityFrame >= shaderParity.targetFrame ) return;
		running = true;
		const nextShaderParityFrame = completedShaderParityFrame + 1;
		const frameTime = shaderParity.controlled ? nextShaderParityFrame * ( 1000 / 60 ) : time;
		void ( async () => {
			activeRuntime.beginFrame();
			await dispatcher.runFrame( { now: frameTime * 0.001, context: { scroll } } );
			activeRuntime.endFrame();
			await activeRuntime.captureStatsFrame( activeRenderer, scene, activeCamera );
			if ( shaderParity.controlled ) {
				completedShaderParityFrame = nextShaderParityFrame;
				page?.state.set( 'shaderParity', { completedFrame: completedShaderParityFrame } );
			}
			if ( firstFrame ) {
				firstFrame = false;
				setStatus( { stage: 'first frame', detail: 'Ready' } );
				publishDiagnostics( true );
			} else publishDiagnostics();
		} )().catch( fail ).finally( () => {
			running = false;
		} );
	} );

	import.meta.hot?.accept( './scene', ( module ) => {
		if ( module === undefined ) return;
		setStatus( { stage: 'updating', detail: 'Updating scene\u2026' } );
		void sceneReloader.replace( ( workerRuntime ) => module.createScene(
			workerRuntime.createSceneContext( { hot: true } )
		) ).then( () => {
			shaderMode = 'live';
			setStatus( { stage: 'first frame', detail: 'Scene updated' } );
			publishDiagnostics( true );
		}, fail );
	} );
}

createWorkerServer<StarterWorkerState, AppWorkerEvents, AppWorkerRequests>( self, {
	state: {
		boot: ( value ) => void initialize( value ).catch( fail ),
		viewport: receiveViewport,
		pointer: ( value ) => {
			textEffect?.pointer( value );
			reloader?.current.pointer?.( value );
		},
		scroll: ( value ) => { scroll = value; },
		visibility: ( value ) => {
			visible = value.visible;
			setWorkerShaderCaptureVisibility( value.visible );
		},
		shaderParity: receiveShaderParity,
		statsPanel: ( value ) => {
			statsPanel = value;
			runtime?.setStatsPanel( value.name, value.enabled, value.visible );
		},
	},
	events: {
		refresh: () => setStatus( { stage: 'updating', detail: 'Refresh requested' } ),
		textBatch: ( value ) => runtime?.applyTextDelivery( value ),
	},
}, { validateStructuredClone: threeBlocksConfig.development } );

import.meta.hot?.dispose( () => {
	renderer?.setAnimationLoop( null );
	textEffect?.dispose();
	environmentTarget?.dispose();
	void runtime?.dispose();
	page?.dispose();
} );
