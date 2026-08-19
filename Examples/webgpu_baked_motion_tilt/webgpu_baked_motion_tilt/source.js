import * as THREE from 'three/webgpu';
import { registerDevtools } from 'three-blocks/devtools';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { BakedMotion, paramToFrame } from 'three-blocks/baked-motion';
import { MeshTransmissionNodeMaterial } from 'three-blocks/transmission';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

import { createBakedMotionHost, observeBakedMotionVisibility } from '../helpers/BakedMotionHost.js';
import { createBakedMotionHUD } from '../helpers/BakedMotionHUD.js';
import { portraitCameraScale } from '../helpers/mobile.js';

const REDUCED_MOTION = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
const PRESENTATION_FOV = 40;
const CAPTURE_FRAME_MARGIN = 1.764;
const POINTER_TILT_GAIN = 2;

let container;
let renderer;
let devtools;
let scene;
let camera;
let motion;
let glass;
let glassRig;
let glassEnvironment;
let options;
let sampleView = false;
let hud;
let host;
let resizeObserver;
let stopVisibilityObserver;
let previousTime = performance.now();
let nextHudDiagnosticsAt = 0;
let ambientTime = 0.75;
let pointerControlled = false;
const pointer = new THREE.Vector2();
const cameraCenter = new THREE.Vector3();
const glassViewCamera = new THREE.PerspectiveCamera();

export async function mount( element, mountOptions = {} ) {

	container = element;
	options = {
		assets: mountOptions.assets ?? {},
		initialPointer: mountOptions.initialPointer ?? [ 0, 0 ],
		initialView: mountOptions.initialView ?? 'interactive',
		poster: mountOptions.poster ?? null,
		softwareDecoder: mountOptions.softwareDecoder ?? false,
	};
	sampleView = options.initialView === 'sample';
	host = createBakedMotionHost( container, {
		poster: options.poster,
		label: 'Static poster of the Baked Motion camera-grid example.',
	} );
	if ( REDUCED_MOTION ) {

		host.static( 'Static view · reduced motion' );
		return createHandle();

	}
	try {

		await mountInteractive();

	} catch ( error ) {

		host.fail( error, motion );
		disposeInteractive();

	}
	return createHandle();

}

async function mountInteractive() {

	ambientTime = 0.75;
	pointerControlled = false;
	pointer.fromArray( options.initialPointer );
	if ( WebGPU.isAvailable() === false ) throw new Error( 'No WebGPU support' );
	if ( typeof VideoDecoder === 'undefined' ) throw new Error( 'WebCodecs VideoDecoder is required.' );

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x0d1018 );
	camera = new THREE.PerspectiveCamera( PRESENTATION_FOV, 1, 0.1, 100 );

	renderer = new THREE.WebGPURenderer( { antialias: true, trackTimestamp: true } );
	devtools = registerDevtools( { renderer, container } );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, 2 ) );
	container.prepend( renderer.domElement );
	await renderer.init();
	resize();

	const manifestUrl = options.assets?.bakedMotion?.tiltManifest ?? options.assets?.tiltManifest;
	if ( typeof manifestUrl !== 'string' || manifestUrl.length === 0 ) {

		throw new Error( 'Baked Motion requires assets.tiltManifest.' );

	}
	motion = new BakedMotion( manifestUrl, {
		renderer,
		strategy: 'stream',
		rendition: 'auto',
		maxRenditionWidth: 2048,
		cpuUpload: options.softwareDecoder,
		hardwareAcceleration: options.softwareDecoder ? 'prefer-software' : 'prefer-hardware',
	} );
	await motion.ready;
	frameCamera();
	scene.add( motion.mesh );
	await addGlass();
	hud = createBakedMotionHUD( container, {
		mode: 'tilt',
		manifest: motion.manifest,
		accent: '#8da0ff',
		previewPages: motion._proxyArrayNode?.albedoPages,
	} );
	if ( ! sampleView ) setAmbientPointer();
	motion.setPointer( pointer.x, pointer.y ).update( sampleView ? 1 : 1 / 60 );
	syncGlass();
	await motion.frameReady;
	hud.ready( sampleView ? 'Sample' : 'Auto' );
	updateResidencyHud( true );

	renderer.domElement.addEventListener( 'pointermove', onPointerMove );
	renderer.domElement.addEventListener( 'pointerleave', onPointerLeave );
	resizeObserver = new ResizeObserver( resize );
	resizeObserver.observe( container );
	previousTime = performance.now();
	nextHudDiagnosticsAt = 0;
	renderer.render( scene, camera );
	host.present( motion );
	stopVisibilityObserver = observeBakedMotionVisibility( container, {
		getActiveMotion: () => motion,
		onChange: candidate => {

			host.update( candidate );
			hud?.setActivity( candidate?.state === 'suspended' ? 'Parked' : sampleView ? 'Sample' : 'Auto' );
			updateResidencyHud( true );

		},
		onError: ( error, candidate ) => {

			host.fail( error, candidate );
			hud?.fail( error instanceof Error ? error.message : 'Unable to resume Baked Motion.' );

		},
	} );
	renderer.setAnimationLoop( render );

}

function onPointerMove( event ) {

	const rect = renderer.domElement.getBoundingClientRect();
	if ( ! rect.width || ! rect.height ) return;
	pointer.set(
		( ( event.clientX - rect.left ) / rect.width * 2 - 1 ) * POINTER_TILT_GAIN,
		- ( ( event.clientY - rect.top ) / rect.height * 2 - 1 ) * POINTER_TILT_GAIN,
	);
	pointerControlled = true;

}

function onPointerLeave() {

	pointerControlled = false;

}

function render( now ) {

	const delta = Math.min( ( now - previousTime ) / 1000 || 0, 0.1 );
	previousTime = now;
	if ( motion.state === 'suspended' ) return;
	if ( ! sampleView ) {

		ambientTime += delta;
		if ( pointerControlled === false ) setAmbientPointer();
		motion.setPointer( pointer.x, pointer.y ).update( delta );
		syncGlass();
		hud.setActivity( pointerControlled ? 'Pointer' : 'Auto' );

	}
	updateMotionHUD();
	renderer.render( scene, camera );
	renderer.resolveTimestampsAsync( THREE.TimestampQuery.RENDER );

}

function updateMotionHUD( force = false ) {

	if ( ! hud || ! motion ) return;
	const sample = paramToFrame( motion.manifest, motion.parameters );
	hud.updateTilt( { sample, parameters: motion.parameters } );
	updateResidencyHud( force );

}

async function addGlass() {

	const [ width, height, depth ] = motion.manifest.bounds.size;
	const padding = Math.min( width, height ) * 0.06;
	const size = [ width + padding * 2, height + padding * 2, depth + padding * 2 ];
	// GPU-compressed UASTC HDR environment: BC6H where the hardware supports
	// it, RGBA16F elsewhere. Three prefilters it on first environment use.
	const environmentUrl = options.assets?.environment;
	const environmentTranscoder = options.assets?.transcoderPath ?? options.assets?.basis;
	if ( typeof environmentUrl !== 'string' || environmentUrl.length === 0 ) throw new Error( 'Baked Motion requires assets.environment.' );
	if ( ! environmentTranscoder ) throw new Error( 'KTX2 environments require assets.transcoderPath.' );
	const environmentLoader = new KTX2Loader()
		.setTranscoderPath( `${String( environmentTranscoder ).replace( /\/$/u, '' )}/` )
		.detectSupport( renderer );
	try {

		glassEnvironment = await environmentLoader.loadAsync( environmentUrl );

	} finally {

		environmentLoader.dispose();

	}
	glassEnvironment.mapping = THREE.EquirectangularReflectionMapping;
	scene.environment = glassEnvironment;
	// Photographic HDR reads stronger than the old neutral studio; keep it subtle.
	scene.environmentIntensity = 0.65;

	glass = new THREE.Mesh(
		new RoundedBoxGeometry( ...size, 8, padding ),
		new MeshTransmissionNodeMaterial( {
			color: 0xffffff,
			// A touch of roughness pushes env reflections onto prefiltered PMREM
			// mips (free blur) so the 2K equirect's texels never read sharply.
			roughness: 0.16,
			ior: 1.5,
			thickness: size[ 2 ] * 0.08,
			chromaticAberration: 0.3,
			anisotropicBlur: 0.3,
			ditherStrength: 0.3,
		} ),
	);
	glass.name = 'Baked Motion glass';
	glass.renderOrder = 1;
	glass.geometry.computeBoundingSphere();
	glassRig = new THREE.Group();
	glassRig.name = 'Baked Motion glass rig';
	glassRig.position.copy( motion.mesh.position );
	glassRig.add( glass );
	const keyLight = new THREE.DirectionalLight( 0xffffff, 2 );
	keyLight.position.set( 5, 8, 10 );
	scene.add( glassRig, keyLight, new THREE.AmbientLight( 0xffffff, 0.25 ) );
	syncGlassDepth();

}

function syncGlass() {

	if ( ! glass || ! motion?.parameters ) return;
	const azimuth = THREE.MathUtils.degToRad( motion.parameters.tiltX );
	const elevation = THREE.MathUtils.degToRad( motion.parameters.tiltY );
	const elevationCosine = Math.cos( elevation );
	glassViewCamera.position.set(
		Math.sin( azimuth ) * elevationCosine,
		Math.sin( elevation ),
		Math.cos( azimuth ) * elevationCosine,
	);
	glassViewCamera.lookAt( 0, 0, 0 );
	glass.quaternion.copy( glassViewCamera.quaternion ).invert();

}

function syncGlassDepth() {

	if ( ! glassRig || motion.manifest.camera.type !== 'perspective' ) return;
	const distance = camera.position.distanceTo( cameraCenter );
	glassRig.scale.z = distance / motion.manifest.camera.radius;
	const depthExtent = glass.geometry.boundingSphere.radius * glassRig.scale.z * 1.05;
	const distanceDelta = distance - motion.manifest.camera.radius;
	camera.near = Math.max( 0.01, Math.min(
		motion.manifest.camera.near + distanceDelta,
		distance - depthExtent,
	) );
	camera.far = Math.max(
		motion.manifest.camera.far + distanceDelta,
		distance + depthExtent,
	);
	camera.updateProjectionMatrix();

}

function updateResidencyHud( force = false ) {

	if ( ! hud || ! motion ) return;
	const now = performance.now();
	if ( ! force && now < nextHudDiagnosticsAt ) return;
	nextHudDiagnosticsAt = now + 250;
	hud.updateResidency( motion.getDiagnostics() );

}

function frameCamera() {

	const sourceCamera = motion.manifest.camera;
	const sourceHeight = sourceCamera.type === 'orthographic'
		? sourceCamera.orthoScale
		: 2 * sourceCamera.radius * Math.tan( THREE.MathUtils.degToRad( sourceCamera.fov ) / 2 );
	const distance = sourceHeight * CAPTURE_FRAME_MARGIN * portraitCameraScale( camera.aspect )
		/ ( 2 * Math.tan( THREE.MathUtils.degToRad( PRESENTATION_FOV ) / 2 ) );
	cameraCenter.fromArray( motion.manifest.bounds.center );
	camera.fov = PRESENTATION_FOV;
	camera.position.set( cameraCenter.x, cameraCenter.y, cameraCenter.z + distance );
	camera.lookAt( cameraCenter );
	const distanceDelta = distance - sourceCamera.radius;
	camera.near = Math.max( 0.01, sourceCamera.near + distanceDelta );
	camera.far = Math.max( camera.near + 0.01, sourceCamera.far + distanceDelta );
	camera.updateProjectionMatrix();
	camera.updateMatrixWorld();
	syncGlassDepth();

}

function resize() {

	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	renderer.setSize( width, height );
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	if ( motion ) frameCamera();

}

function disposeInteractive() {

	renderer?.setAnimationLoop( null );
	stopVisibilityObserver?.();
	resizeObserver?.disconnect();
	renderer?.domElement?.removeEventListener( 'pointermove', onPointerMove );
	renderer?.domElement?.removeEventListener( 'pointerleave', onPointerLeave );
	glassRig?.removeFromParent();
	glass?.geometry.dispose();
	glass?.material.dispose();
	glassEnvironment?.dispose();
	motion?.dispose();
	devtools?.dispose();
	devtools = null;
	renderer?.dispose();
	renderer?.domElement?.remove();
	hud?.dispose();
	glass = null;
	glassRig = null;
	glassEnvironment = null;
	motion = null;
	renderer = null;
	hud = null;
	stopVisibilityObserver = null;

}

export function unmount() {

	disposeInteractive();
	host?.dispose();
	host = null;
	container = null;
	options = null;

}

function createHandle() {

	return {
		get motion() {

			return motion;

		},
		get renderer() {

			return renderer;

		},
		pause() {

			motion?.suspend();

		},
		async resume() {

			await motion?.resume();

		},
		reset() {

			pointer.fromArray( options?.initialPointer ?? [ 0, 0 ] );
			pointerControlled = false;

		},
		async setSample( sample ) {

			if ( ! motion ) return;
			motion._setParameters( { tiltX: sample[ 0 ], tiltY: sample[ 1 ] } );
			syncGlass();
			await motion.frameReady;
			updateMotionHUD( true );

		},
		prewarmPipelineVariants() {

			motion?.prewarmPipelineVariants();

		},
		getDiagnostics() {

			return {
				motion: motion?.getDiagnostics() ?? null,
				pointer: pointer.toArray(),
			};

		},
		dispose: unmount,
	};

}

function setAmbientPointer() {

	pointer.set(
		Math.sin( ambientTime * 0.72 ) * 0.72,
		Math.sin( ambientTime * 0.47 + 1.15 ) * 0.52,
	);

}
