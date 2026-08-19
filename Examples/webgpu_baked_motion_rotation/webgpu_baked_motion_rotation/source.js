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
const BASE_ROTATION_VELOCITY = 9;
const MAX_ROTATION_VELOCITY = 54;
const BOOST_DECAY = 0.75;
const CAPTURE_FRAME_MARGIN = 1.764;
const DRAG_RADIANS_PER_PIXEL = 0.006;

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
let rotationVelocity = BASE_ROTATION_VELOCITY;
let presentationDistance = 8;
let orbitAngle = 0;
let autoOrbit = ! REDUCED_MOTION;
let dragging = false;
let activePointer = null;
let lastPointerX = 0;
let samplePending = false;
let sampleQueued = false;
const orbitCenter = new THREE.Vector3();
const motionViewPosition = new THREE.Vector3();

export async function mount( element, mountOptions = {} ) {

	container = element;
	options = {
		assets: mountOptions.assets ?? {},
		autoOrbit: mountOptions.autoOrbit ?? ! REDUCED_MOTION,
		initialView: mountOptions.initialView ?? 'interactive',
		poster: mountOptions.poster ?? null,
		softwareDecoder: mountOptions.softwareDecoder ?? false,
	};
	sampleView = options.initialView === 'sample';
	host = createBakedMotionHost( container, {
		poster: options.poster,
		label: 'Static poster of the Baked Motion rotation example.',
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

	rotationVelocity = BASE_ROTATION_VELOCITY;
	autoOrbit = options.autoOrbit && ! sampleView;
	orbitAngle = THREE.MathUtils.degToRad( sampleView ? 38 : 28 );
	dragging = false;
	activePointer = null;
	samplePending = false;
	sampleQueued = false;
	if ( WebGPU.isAvailable() === false ) throw new Error( 'No WebGPU support' );
	if ( typeof VideoDecoder === 'undefined' ) throw new Error( 'WebCodecs VideoDecoder is required.' );

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x0d1018 );
	camera = new THREE.PerspectiveCamera( 40, 1, 0.1, 100 );

	renderer = new THREE.WebGPURenderer( { antialias: true, trackTimestamp: true } );
	devtools = registerDevtools( { renderer, container } );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, 2 ) );
	container.prepend( renderer.domElement );
	await renderer.init();
	resize();

	const manifestUrl = options.assets?.bakedMotion?.rotationManifest ?? options.assets?.rotationManifest;
	if ( typeof manifestUrl !== 'string' || manifestUrl.length === 0 ) {

		throw new Error( 'Baked Motion requires assets.rotationManifest.' );

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
	configureCamera();
	scene.add( motion.mesh );
	await addGlass();
	hud = createBakedMotionHUD( container, {
		mode: 'rotation',
		manifest: motion.manifest,
		accent: '#f1bd63',
	} );
	setMotionView( motion );
	syncGlass();
	await motion.frameReady;
	hud.ready( sampleView ? 'Sample' : 'Auto' );
	hud.updateResidency( motion.getDiagnostics() );

	container.addEventListener( 'wheel', onWheel, { passive: false } );
	renderer.domElement.addEventListener( 'pointerdown', onPointerDown );
	renderer.domElement.addEventListener( 'pointermove', onPointerMove );
	renderer.domElement.addEventListener( 'pointerup', onPointerEnd );
	renderer.domElement.addEventListener( 'pointercancel', onPointerEnd );
	renderer.domElement.addEventListener( 'lostpointercapture', onPointerEnd );
	renderer.domElement.style.cursor = sampleView ? 'default' : 'grab';
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
			hud?.updateResidency( candidate?.getDiagnostics() );

		},
		onError: ( error, candidate ) => {

			host.fail( error, candidate );
			hud?.fail( error instanceof Error ? error.message : 'Unable to resume Baked Motion.' );

		},
	} );
	renderer.setAnimationLoop( render );

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
	glass.rotation.set( 0, THREE.MathUtils.degToRad( - motion.parameters.azimuth ), 0 );

}

function syncGlassDepth() {

	if ( ! glassRig || motion.manifest.camera.type !== 'perspective' ) return;
	glassRig.scale.z = presentationDistance / motion.manifest.camera.radius;
	const depthExtent = glass.geometry.boundingSphere.radius * glassRig.scale.z * 1.05;
	const distanceDelta = presentationDistance - motion.manifest.camera.radius;
	camera.near = Math.max( 0.01, Math.min(
		motion.manifest.camera.near + distanceDelta,
		presentationDistance - depthExtent,
	) );
	camera.far = Math.max(
		motion.manifest.camera.far + distanceDelta,
		presentationDistance + depthExtent,
	);
	camera.updateProjectionMatrix();

}

function onWheel( event ) {

	if ( sampleView ) return;
	event.preventDefault();
	rotationVelocity = Math.min(
		MAX_ROTATION_VELOCITY,
		Math.max( BASE_ROTATION_VELOCITY, rotationVelocity ) + wheelImpulse( event ) * 18,
	);
	autoOrbit = true;
	endDrag();
	hud.setActivity( 'Boost' );

}

function onPointerDown( event ) {

	if ( sampleView || event.isPrimary === false || event.button !== 0 ) return;
	dragging = true;
	activePointer = event.pointerId;
	lastPointerX = event.clientX;
	renderer.domElement.setPointerCapture( event.pointerId );
	renderer.domElement.style.cursor = 'grabbing';
	hud.setActivity( 'Drag' );

}

function onPointerMove( event ) {

	if ( dragging === false || event.pointerId !== activePointer ) return;
	orbitAngle += ( event.clientX - lastPointerX ) * DRAG_RADIANS_PER_PIXEL;
	lastPointerX = event.clientX;

}

function onPointerEnd( event ) {

	if ( activePointer !== null && event.pointerId !== activePointer ) return;
	endDrag();

}

function render( now ) {

	const delta = Math.min( ( now - previousTime ) / 1000 || 0, 0.1 );
	previousTime = now;
	if ( motion.state === 'suspended' ) return;
	if ( ! sampleView ) {

		rotationVelocity = BASE_ROTATION_VELOCITY
			+ ( rotationVelocity - BASE_ROTATION_VELOCITY ) * Math.exp( - BOOST_DECAY * delta );

	}
	const moving = ! sampleView && autoOrbit && dragging === false;
	if ( moving ) orbitAngle += THREE.MathUtils.degToRad( rotationVelocity ) * delta;
	if ( ! sampleView ) queueMotionSample();
	updateMotionHUD( moving );
	if ( ! sampleView ) hud.setActivity( dragging ? 'Drag' : autoOrbit === false ? 'Rest' : rotationVelocity > BASE_ROTATION_VELOCITY + 0.5 ? 'Boost' : 'Auto' );
	renderer.render( scene, camera );
	renderer.resolveTimestampsAsync( THREE.TimestampQuery.RENDER );

}

function updateMotionHUD( moving, force = false ) {

	if ( ! hud || ! motion ) return;
	const sample = paramToFrame( motion.manifest, motion.parameters );
	hud.updateRotation( {
		angle: motion.parameters.azimuth,
		frame: sample.frame,
		speedMultiplier: moving ? rotationVelocity / BASE_ROTATION_VELOCITY : 0,
		degreesPerSecond: moving ? rotationVelocity : 0,
	} );
	const now = performance.now();
	if ( force || now >= nextHudDiagnosticsAt ) {

		nextHudDiagnosticsAt = now + 250;
		hud.updateResidency( motion.getDiagnostics() );

	}

}

function configureCamera() {

	const sourceCamera = motion.manifest.camera;
	const sourceHeight = sourceCamera.type === 'orthographic'
		? sourceCamera.orthoScale
		: 2 * sourceCamera.radius * Math.tan( THREE.MathUtils.degToRad( sourceCamera.fov ) / 2 );
	camera.fov = sourceCamera.type === 'perspective' ? sourceCamera.fov : 40;
	presentationDistance = sourceHeight * CAPTURE_FRAME_MARGIN * portraitCameraScale( camera.aspect )
		/ ( 2 * Math.tan( THREE.MathUtils.degToRad( camera.fov ) / 2 ) );
	const distanceDelta = presentationDistance - sourceCamera.radius;
	camera.near = Math.max( 0.01, sourceCamera.near + distanceDelta );
	camera.far = Math.max( camera.near + 0.01, sourceCamera.far + distanceDelta );
	orbitCenter.fromArray( motion.manifest.bounds.center );
	camera.position.set(
		orbitCenter.x,
		orbitCenter.y,
		orbitCenter.z + presentationDistance,
	);
	camera.lookAt( orbitCenter );
	camera.updateProjectionMatrix();
	camera.updateMatrixWorld();
	syncGlassDepth();

}

function queueMotionSample() {

	if ( ! motion ) return;
	if ( samplePending ) {

		sampleQueued = true;
		return;

	}
	samplePending = true;
	sampleQueued = false;
	const sampledMotion = motion;
	setMotionView( sampledMotion );
	syncGlass();
	const complete = () => {

		if ( motion !== sampledMotion ) return;
		samplePending = false;
		if ( sampleQueued ) queueMotionSample();

	};
	sampledMotion.frameReady.then( complete, complete );

}

function setMotionView( sampledMotion ) {

	motionViewPosition.set(
		orbitCenter.x + Math.sin( orbitAngle ),
		orbitCenter.y,
		orbitCenter.z + Math.cos( orbitAngle ),
	);
	sampledMotion.setView( motionViewPosition );

}

function resize() {

	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	renderer.setSize( width, height );
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	if ( motion ) configureCamera();

}

function disposeInteractive() {

	renderer?.setAnimationLoop( null );
	stopVisibilityObserver?.();
	resizeObserver?.disconnect();
	container?.removeEventListener( 'wheel', onWheel );
	renderer?.domElement?.removeEventListener( 'pointerdown', onPointerDown );
	renderer?.domElement?.removeEventListener( 'pointermove', onPointerMove );
	renderer?.domElement?.removeEventListener( 'pointerup', onPointerEnd );
	renderer?.domElement?.removeEventListener( 'pointercancel', onPointerEnd );
	renderer?.domElement?.removeEventListener( 'lostpointercapture', onPointerEnd );
	sampleQueued = false;
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

			autoOrbit = false;
			motion?.suspend();

		},
		async resume() {

			await motion?.resume();
			autoOrbit = options?.autoOrbit && ! sampleView;

		},
		reset() {

			orbitAngle = THREE.MathUtils.degToRad( sampleView ? 38 : 28 );
			rotationVelocity = BASE_ROTATION_VELOCITY;
			queueMotionSample();

		},
		async setSample( sample ) {

			if ( ! motion ) return;
			orbitAngle = THREE.MathUtils.degToRad( sample[ 0 ] );
			setMotionView( motion );
			syncGlass();
			await motion.frameReady;
			updateMotionHUD( false, true );

		},
		prewarmPipelineVariants() {

			motion?.prewarmPipelineVariants();

		},
		getDiagnostics() {

			return {
				autoOrbit,
				motion: motion?.getDiagnostics() ?? null,
				orbitAngle,
			};

		},
		dispose: unmount,
	};

}

function wheelImpulse( event ) {

	const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
	const deltaX = Number( event.deltaX ) || Number( event.wheelDeltaX ) || 0;
	const deltaY = Number( event.deltaY ) || - Number( event.wheelDeltaY ) || - Number( event.wheelDelta ) || 0;
	const magnitude = Math.hypot( deltaX, deltaY ) * scale;
	if ( magnitude <= 0 ) return 0;
	return Math.min( 2.5, Math.max( 0.35, Math.sqrt( magnitude ) / 3 ) );

}

function endDrag() {

	if ( activePointer !== null && renderer?.domElement?.hasPointerCapture( activePointer ) ) {

		renderer.domElement.releasePointerCapture( activePointer );

	}
	dragging = false;
	activePointer = null;
	if ( renderer?.domElement ) renderer.domElement.style.cursor = sampleView ? 'default' : 'grab';

}
