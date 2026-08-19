import * as THREE from 'three/webgpu';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { color, mix, screenUV, smoothstep, vec2 } from 'three/tsl';

import { IndirectBatchedMesh } from 'three-blocks';
import { registerDevtools } from 'three-blocks/devtools';
import { ObjectAnimationVideo } from 'three-blocks/experimental/object-animation-video';
import { shaderCache } from 'three-blocks/shaders';
import { createExampleGui } from '../helpers/exampleGui.js';
import { LoadingManager } from '../helpers/LoadingManager.js';
import { frameCameraForAspect } from '../helpers/mobile.js';

const MODE_STREAMED = 'Streamed batch';
const MODE_GPU_DRIVEN = 'GPU-driven';
const REDUCED_MOTION = window.matchMedia?.( '(prefers-reduced-motion: reduce)' ).matches ?? false;

const params = {
	mode: MODE_GPU_DRIVEN,
	playing: true,
	playbackSpeed: 1,
	orbit: true,
};

let container;
let previousContainerPosition = '';
let renderer;
let devtools;
let scene;
let camera;
let controls;
let gui;
let loadingManager;
let animation;
let stage;
let hudElement;
let hudStyleElement;
let hudHeadlineElement;
let hudModeElement;
let hudProgressElement;
let activeView;
let activeBindings = [];
let resizeObserver;
let webGPUErrorElement;
let lastTimestamp = 0;
let visibleCount = 0;
let nextCountReadback = 0;
let countReadbackPending = false;
let mounted = false;
let lifecycleGeneration = 0;
let modeRevision = 0;
let activeAssets;

const batchViews = {
	[ MODE_STREAMED ]: null,
	[ MODE_GPU_DRIVEN ]: null,
};

function requireAsset( assets, key ) {

	const asset = assets?.[ key ];
	if ( asset instanceof URL ) return asset.href;
	if ( typeof asset === 'string' && asset.length > 0 ) return asset;
	throw new Error( `Object Animation Video requires assets.${key}.` );

}

export async function mount( containerElement, {
	assets = {},
	initialMode = MODE_GPU_DRIVEN,
	orbit = true,
	playing = ! REDUCED_MOTION,
	playbackSpeed = 1,
} = {} ) {

	container = containerElement;
	activeAssets = {
		animationManifest: requireAsset( assets, 'animationManifest' ),
		model: requireAsset( assets, 'model' ),
	};
	params.mode = [ MODE_STREAMED, MODE_GPU_DRIVEN ].includes( initialMode ) ? initialMode : MODE_GPU_DRIVEN;
	params.orbit = Boolean( orbit );
	params.playing = Boolean( playing );
	params.playbackSpeed = Number.isFinite( playbackSpeed ) ? playbackSpeed : 1;
	mounted = true;
	const generation = ++ lifecycleGeneration;

	if ( WebGPU.isAvailable() === false ) {

		webGPUErrorElement = WebGPU.getErrorMessage();
		container.appendChild( webGPUErrorElement );
		throw new Error( 'No WebGPU support' );

	}

	try {

		await init( generation );

	} catch ( error ) {

		if ( generation === lifecycleGeneration ) unmount();
		throw error;

	}
	return {
		pause() {

			params.playing = false;
			animation?.pause();

		},
		dispose: unmount,
	};

}

function isCurrent( generation ) {

	return mounted && generation === lifecycleGeneration;

}

async function init( generation ) {

	lastTimestamp = 0;
	visibleCount = 0;
	nextCountReadback = 0;
	countReadbackPending = false;

	previousContainerPosition = container.style.position;
	if ( getComputedStyle( container ).position === 'static' ) container.style.position = 'relative';

	loadingManager = new LoadingManager();
	loadingManager.setItems( [
		{ name: 'Exact transform track', weight: 2 },
		{ name: '361-part model', weight: 1 },
	] );
	loadingManager.init( container );
	const manager = loadingManager;

	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	camera = new THREE.PerspectiveCamera( 45, width / height, 0.1, 80 );
	camera.position.set( 6.2, 3.5, 9.2 );

	scene = new THREE.Scene();
	const glowDistance = screenUV.sub( vec2( 0.48, 0.34 ) ).mul( vec2( 0.9, 1.35 ) ).length();
	const projectorGlow = smoothstep( 0.68, 0.05, glowDistance ).pow( 1.35 );
	const cove = screenUV.y.mix( color( 0x080a13 ), color( 0x1c2338 ) );
	const projection = screenUV.x.mix( color( 0x3a4b6f ), color( 0x7a4f45 ) );
	scene.backgroundNode = mix( cove, projection, projectorGlow.mul( 0.82 ) );
	scene.fog = new THREE.Fog( 0x111626, 14, 32 );

	renderer = new THREE.WebGPURenderer( { antialias: true } );
	devtools = registerDevtools( { renderer, container } );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
	renderer.setSize( width, height );
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.15;
	renderer.domElement.setAttribute( 'role', 'img' );
	renderer.domElement.setAttribute( 'aria-label', 'An animated sculpture made from hundreds of rigid parts driven by one exact transform track.' );
	container.appendChild( renderer.domElement );
	await renderer.init();
	if ( ! isCurrent( generation ) ) return;

	controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true;
	controls.target.set( 0, 3, 0 );
	controls.enabled = params.orbit;
	controls.update();

	createStage();

	if ( ! isCurrent( generation ) ) return;

	const loadedAnimation = await manager.load( 'Exact transform track', async () => {

		const clip = await ObjectAnimationVideo.load( activeAssets.animationManifest, {
			play: false,
			meshoptDecoder: MeshoptDecoder,
		} );
		await clip.firstFrame;
		return clip;

	} );
	if ( ! isCurrent( generation ) ) {

		loadedAnimation.dispose();
		return;

	}
	animation = loadedAnimation;
	const gltf = await manager.load( '361-part model', onProgress => new Promise( ( resolve, reject ) => {

		new GLTFLoader().load( activeAssets.model, resolve, onProgress, reject );

	} ) );
	if ( ! isCurrent( generation ) ) {

		disposeObjectResources( gltf.scene );
		return;

	}

	try {

		createBatchViews( animation.manifest, gltf.scene );

	} finally {

		disposeObjectResources( gltf.scene );

	}

	createHud();
	setupGui();
	animation.playbackSpeed = params.playbackSpeed;
	params.playing ? animation.play() : animation.pause();
	setMode( params.mode );

	manager.complete();
	window.addEventListener( 'resize', onResize );
	if ( typeof ResizeObserver !== 'undefined' ) {

		resizeObserver = new ResizeObserver( onResize );
		resizeObserver.observe( container );

	}
	renderer.setAnimationLoop( render );

}

function createStage() {

	stage = new THREE.Group();
	stage.name = 'ProjectionStage';

	const keyLight = new THREE.DirectionalLight( 0xffd1b0, 3.4 );
	keyLight.position.set( 5, 8, 6 );
	const rimLight = new THREE.DirectionalLight( 0xaabfff, 2.2 );
	rimLight.position.set( - 6, 4, 1 );
	const hemisphere = new THREE.HemisphereLight( 0xb9c7ff, 0x49363f, 1.8 );
	stage.add( keyLight, rimLight, hemisphere );
	scene.add( stage );

}

function createBatchViews( manifest, root ) {

	const namedMeshes = new Map();
	root.traverse( object => {

		if ( object.isMesh ) namedMeshes.set( object.name, object );

	} );

	const entries = manifest.objects
		.map( object => ( { object, source: namedMeshes.get( object.name ) } ) )
		.filter( entry => entry.source );
	if ( entries.length === 0 ) throw new Error( 'The OAV object table did not match any GLTF mesh names.' );

	const uniqueGeometries = [ ...new Set( entries.map( entry => entry.source.geometry ) ) ];
	const maxVertexCount = uniqueGeometries.reduce( ( total, geometry ) => total + geometry.attributes.position.count, 0 );
	const maxIndexCount = uniqueGeometries.reduce( ( total, geometry ) => total + ( geometry.index?.count ?? 0 ), 0 );

	batchViews[ MODE_STREAMED ] = createBatchView( {
		kind: MODE_STREAMED,
		entries,
		uniqueGeometries,
		maxVertexCount,
		maxIndexCount,
		root,
	} );
	batchViews[ MODE_GPU_DRIVEN ] = createBatchView( {
		kind: MODE_GPU_DRIVEN,
		entries,
		uniqueGeometries,
		maxVertexCount,
		maxIndexCount,
		root,
	} );
	const gpuDrivenView = batchViews[ MODE_GPU_DRIVEN ];
	shaderCache.container( 'object-animation/culling', {
		animation,
		gpuDrivenView,
		get culler() { return gpuDrivenView.mesh.culler; },
	} );

}

function createBatchView( { kind, entries, uniqueGeometries, maxVertexCount, maxIndexCount, root } ) {

	const material = new THREE.MeshPhysicalNodeMaterial( {
		color: 0xd9d9ce,
		metalness: 0.12,
		roughness: 0.3,
		clearcoat: 0.38,
		clearcoatRoughness: 0.24,
	} );
	material.name = 'Porcelain object-animation material';

	const mesh = kind === MODE_GPU_DRIVEN
		? new IndirectBatchedMesh( entries.length, maxVertexCount, maxIndexCount, material )
		: new THREE.BatchedMesh( entries.length, maxVertexCount, maxIndexCount, material );
	mesh.name = kind === MODE_GPU_DRIVEN ? 'OAVGPUDrivenBatch' : 'OAVStreamedBatch';
	mesh.frustumCulled = false;
	mesh.perObjectFrustumCulled = kind === MODE_GPU_DRIVEN;
	mesh.raycast = () => {};
	if ( kind === MODE_GPU_DRIVEN ) mesh.beginBulkUpdate();

	const geometryIds = new Map();
	for ( const sourceGeometry of uniqueGeometries ) {

		const geometry = sourceGeometry.clone();
		geometryIds.set( sourceGeometry, mesh.addGeometry( geometry ) );
		geometry.dispose();

	}

	const mapping = [];
	for ( const entry of entries ) {

		const instanceIndex = mesh.addInstance( geometryIds.get( entry.source.geometry ) );
		mapping.push( { objectIndex: entry.object.index, instanceIndex } );

	}
	if ( kind === MODE_GPU_DRIVEN ) mesh.endBulkUpdate();

	mesh.position.copy( root.position );
	mesh.quaternion.copy( root.quaternion );
	mesh.scale.copy( root.scale );
	mesh.updateMatrixWorld();
	mesh.visible = false;
	scene.add( mesh );

	return { kind, mesh, material, mapping, total: mapping.length };

}

function setMode( mode ) {

	const nextView = batchViews[ mode ];
	if ( ! nextView || ! animation ) return;
	params.mode = mode;
	modeRevision ++;
	unbindActiveView();

	for ( const view of Object.values( batchViews ) ) {

		if ( view ) view.mesh.visible = view === nextView;

	}

	activeView = nextView;
	activeBindings = animation.bindBatchedMesh( nextView.mesh, nextView.mapping );
	animation.update( 0 );
	visibleCount = nextView.total;
	nextCountReadback = 0;
	updateHudMode();

}

function unbindActiveView() {

	if ( animation ) {

		for ( const binding of activeBindings ) animation.unbind( binding, { restore: false } );

	}
	activeBindings = [];
	activeView = null;

}

function setupGui() {

	gui = createExampleGui( 'Playback', { container } );
	gui.domElement.setAttribute( 'aria-label', 'Object animation playback controls' );

	const modeController = gui.add( params, 'mode', {
		'Streamed batch': MODE_STREAMED,
		'GPU-driven culling': MODE_GPU_DRIVEN,
	} ).name( 'Rendering' ).onChange( setMode );
	labelController( modeController, 'Rendering mode' );

	const playingController = gui.add( params, 'playing' ).name( 'Play' ).onChange( playing => {

		playing ? animation.play() : animation.pause();

	} );
	labelController( playingController, 'Play animation' );

	const speedController = gui.add( params, 'playbackSpeed', 0.25, 1.5, 0.05 ).name( 'Speed' ).onChange( speed => {

		animation.playbackSpeed = speed;

	} );
	labelController( speedController, 'Playback speed' );

	const orbitController = gui.add( params, 'orbit' ).name( 'Orbit camera' ).onChange( enabled => {

		controls.enabled = enabled;

	} );
	labelController( orbitController, 'Enable orbit camera' );

	if ( container.clientWidth < 620 ) gui.close();

}

function labelController( controller, label ) {

	controller.domElement.querySelector( 'select, input, button' )?.setAttribute( 'aria-label', label );

}

function createHud() {

	hudStyleElement = document.createElement( 'style' );
	hudStyleElement.textContent = `
		.three-blocks-oav-story {
			position: absolute;
			right: clamp(18px, 4vw, 48px);
			bottom: clamp(18px, 5vh, 46px);
			width: min(440px, calc(100% - 36px));
			color: #f1f0e8;
			font-family: "Avenir Next", "Segoe UI", sans-serif;
			text-align: right;
			pointer-events: none;
			z-index: 4;
		}
		.three-blocks-oav-story__eyebrow {
			margin: 0 0 8px;
			color: #c98a63;
			font: 650 10px/1 ui-monospace, "SFMono-Regular", monospace;
			letter-spacing: .18em;
			text-transform: uppercase;
		}
		.three-blocks-oav-story__headline {
			margin: 0;
			max-width: 420px;
			font-family: "Avenir Next Condensed", "Arial Narrow", sans-serif;
			font-size: clamp(25px, 4.5vw, 46px);
			font-stretch: condensed;
			font-weight: 560;
			letter-spacing: -.025em;
			line-height: .96;
		}
		.three-blocks-oav-story__mode {
			margin: 11px 0 0;
			color: #b9bfd2;
			font-size: 11px;
			font-variant-numeric: tabular-nums;
			letter-spacing: .045em;
		}
		.three-blocks-oav-story__rail {
			width: min(330px, 74vw);
			height: 2px;
			margin: 14px 0 0 auto;
			background: rgba(201, 138, 99, .2);
			overflow: hidden;
		}
		.three-blocks-oav-story__progress {
			display: block;
			width: 0;
			height: 100%;
			background: #e3aa7e;
			transform-origin: left center;
		}
		@media (max-width: 620px) {
			.three-blocks-oav-story__headline { max-width: 300px; }
			.three-blocks-oav-story__mode { max-width: 310px; line-height: 1.35; }
		}
		@media (prefers-reduced-motion: reduce) {
			.three-blocks-oav-story__progress { transition: none; }
		}
	`;
	document.head.appendChild( hudStyleElement );

	hudElement = document.createElement( 'section' );
	hudElement.className = 'three-blocks-oav-story';
	hudElement.setAttribute( 'aria-label', 'Object Animation Video demonstration' );
	hudElement.innerHTML = `
		<p class="three-blocks-oav-story__eyebrow">Object Animation Video</p>
		<h1 class="three-blocks-oav-story__headline"></h1>
		<p class="three-blocks-oav-story__mode"></p>
		<div class="three-blocks-oav-story__rail" aria-hidden="true">
			<span class="three-blocks-oav-story__progress"></span>
		</div>
	`;
	container.appendChild( hudElement );
	hudHeadlineElement = hudElement.querySelector( '.three-blocks-oav-story__headline' );
	hudModeElement = hudElement.querySelector( '.three-blocks-oav-story__mode' );
	hudProgressElement = hudElement.querySelector( '.three-blocks-oav-story__progress' );

	const objectCount = batchViews[ MODE_GPU_DRIVEN ]?.total ?? animation.manifest.objectCount;
	const trackKilobytes = Math.round( ( animation.manifest.track.wireByteLength ?? animation.manifest.track.byteLength ) / 1024 );
	hudHeadlineElement.textContent = `${objectCount} rigid parts · one exact track`;
	hudElement.querySelector( '.three-blocks-oav-story__eyebrow' ).textContent = `Object Animation Video · ${trackKilobytes} KB`;
	updateHudMode();

}

function updateHudMode() {

	if ( ! hudModeElement || ! activeView ) return;
	if ( activeView.kind === MODE_GPU_DRIVEN ) {

		hudModeElement.textContent = `GPU-driven culling · ${visibleCount} of ${activeView.total} parts on camera`;

	} else {

		hudModeElement.textContent = `Streamed batch · all ${activeView.total} parts active`;

	}

}

function updateHudProgress() {

	if ( ! hudProgressElement || ! animation?.duration ) return;
	const progress = THREE.MathUtils.clamp( animation.time / animation.duration, 0, 1 );
	hudProgressElement.style.transform = `scaleX(${progress})`;

}

function requestVisibleCount( now ) {

	const view = activeView;
	const culler = view?.kind === MODE_GPU_DRIVEN ? view.mesh.culler : null;
	if ( ! culler || countReadbackPending || now < nextCountReadback ) return;

	countReadbackPending = true;
	nextCountReadback = now + 500;
	const generation = lifecycleGeneration;
	const revision = modeRevision;
	culler.readIndirectArgs().then( args => {

		if ( ! isCurrent( generation ) || revision !== modeRevision || activeView !== view ) return;
		visibleCount = Math.min( view.total, args?.[ 1 ] >>> 0 );
		updateHudMode();

	} ).catch( error => {

		if ( isCurrent( generation ) && revision === modeRevision ) console.warn( 'OAV active-count readback failed:', error );

	} ).finally( () => {

		if ( generation === lifecycleGeneration ) countReadbackPending = false;

	} );

}

function render( now = performance.now() ) {

	if ( ! mounted || ! renderer || ! animation || ! activeView ) return;
	if ( lastTimestamp === 0 ) lastTimestamp = now;
	const delta = Math.min( ( now - lastTimestamp ) * 0.001, 0.05 );
	lastTimestamp = now;

	animation.update( delta );
	controls.update();
	renderer.render( scene, camera );
	if ( activeView.kind === MODE_GPU_DRIVEN ) requestVisibleCount( now );
	else visibleCount = activeView.total;

	updateHudProgress();

}

function onResize() {

	if ( ! container || ! renderer || ! camera ) return;
	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	renderer.setSize( width, height );
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	frameCameraForAspect( camera, controls.target );

}

function disposeObjectResources( root ) {

	if ( ! root ) return;
	const geometries = new Set();
	const materials = new Set();
	root.traverse( object => {

		if ( object.geometry ) geometries.add( object.geometry );
		const objectMaterials = Array.isArray( object.material ) ? object.material : [ object.material ];
		for ( const material of objectMaterials ) if ( material ) materials.add( material );

	} );
	for ( const geometry of geometries ) geometry.dispose();
	for ( const material of materials ) material.dispose();

}

function disposeBatchView( mode ) {

	const view = batchViews[ mode ];
	if ( ! view ) return;
	scene?.remove( view.mesh );
	view.mesh.culler?.dispose?.();
	view.mesh.dispose();
	view.material.dispose();
	batchViews[ mode ] = null;

}

function disposeStage() {

	if ( ! stage ) return;
	disposeObjectResources( stage );
	scene?.remove( stage );
	stage = null;

}

function disposeLoadingManager() {

	const screen = loadingManager?.screen;
	screen?.disableInputBlocking();
	screen?.overlay?.remove();
	if ( screen ) screen.overlay = null;
	loadingManager = null;

}

export function unmount() {

	mounted = false;
	lifecycleGeneration ++;
	renderer?.setAnimationLoop( null );
	window.removeEventListener( 'resize', onResize );
	resizeObserver?.disconnect();
	resizeObserver = null;

	gui?.destroy();
	gui = null;
	unbindActiveView();
	animation?.dispose();
	animation = null;

	disposeBatchView( MODE_STREAMED );
	disposeBatchView( MODE_GPU_DRIVEN );
	disposeStage();
	controls?.dispose();
	controls = null;
	disposeLoadingManager();

	hudElement?.remove();
	hudStyleElement?.remove();
	hudElement = null;
	hudStyleElement = null;
	hudHeadlineElement = null;
	hudModeElement = null;
	hudProgressElement = null;
	webGPUErrorElement?.remove();
	webGPUErrorElement = null;
	devtools?.dispose();
	devtools = null;

	if ( renderer ) {

		renderer.dispose();
		renderer.domElement.remove();
		renderer = null;

	}

	if ( container ) container.style.position = previousContainerPosition;
	previousContainerPosition = '';
	container = null;
	scene = null;
	camera = null;
	activeView = null;
	activeBindings = [];
	lastTimestamp = 0;
	visibleCount = 0;
	nextCountReadback = 0;
	countReadbackPending = false;

}
