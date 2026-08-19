import * as THREE from 'three/webgpu';
import { Fn, float, mix, uniform, vec3 } from 'three/tsl';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { registerDevtools } from 'three-blocks/devtools';
import { SplatMesh } from 'three-blocks/gaussian-splats';
import { shaderCache } from 'three-blocks/shaders';
import { createExampleCaption } from '../helpers/ExampleCaption.js';
import { createExampleGui } from '../helpers/exampleGui.js';
import { withAssetLoader } from '../helpers/LoadingManager.js';

const MAX_PIXEL_RATIO = 1.35;
const INTRO_SECONDS = 8.4;
const CAMERA_DURATION_SECONDS = 26.67;
const MAX_REVEAL_SPEED = 1.8;
const MAX_ORBIT_TILT = THREE.MathUtils.degToRad( 30 );
const REDUCED_MOTION = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
const CAPTURE_ANCHOR_COUNT = 80;
const CAPTURE_VIEWS_PER_ANCHOR = 3;
const CAPTURE_VIEW_COUNT = 240;
const CAPTURE_SHELL_RADIUS = 0.52;
// Nine representative production anchors, transformed from Blender (x, y, z) to Three.js (x, z, -y).
const CAPTURE_PATH_SAMPLES = [
	new THREE.Vector3( 34.751160, 4.853852, 5.047333 ),
	new THREE.Vector3( 31.056515, 5.154822, 6.805145 ),
	new THREE.Vector3( 26.956867, 5.773217, 8.903921 ),
	new THREE.Vector3( 23.179718, 6.353522, 10.832287 ),
	new THREE.Vector3( 19.079190, 6.748810, 12.757940 ),
	new THREE.Vector3( 15.499367, 6.872237, 14.281134 ),
	new THREE.Vector3( 11.498325, 6.758336, 15.796051 ),
	new THREE.Vector3( 7.068621, 6.507028, 17.174889 ),
	new THREE.Vector3( 3.082789, 6.241018, 18.122570 ),
];
const CAPTURE_HELPER_BOUNDS = new THREE.Box3().setFromPoints( CAPTURE_PATH_SAMPLES );
const CAPTURE_HELPER_CENTER = CAPTURE_HELPER_BOUNDS.getCenter( new THREE.Vector3() );
const CAPTURE_HELPER_RADIUS = CAPTURE_HELPER_BOUNDS.getSize( new THREE.Vector3() ).length() * 0.5 + CAPTURE_SHELL_RADIUS;
const CAPTURE_HELPER_VIEW_AXIS = new THREE.Vector3( 0.32, 0.52, 0.79 ).normalize();
// Website playback is authored here; training used Blender's frame 0–80 camera path.
const cameraPath = {
	frameStart: 0,
	frameEnd: 2,
	horizontalFov: 1.0867502689,
	orbitRadius: 1.7,
	positions: [
		new THREE.Vector3( 34.7512, 4.8539, 5.0473 ),
		new THREE.Vector3( 30.2394, 5.2662, 7.2173 ),
		CAPTURE_PATH_SAMPLES[ 5 ],
	],
	rotations: [
		new THREE.Quaternion( - 0.01642463, 0.83016330, 0.01406575, 0.55710101 ),
		new THREE.Quaternion( 0.02924651, 0.85054952, - 0.05547458, 0.52214253 ),
		new THREE.Quaternion( 0.01281055, 0.84012032, - 0.03149750, 0.54133320 ),
	],
};
const cameraPathFirstLegLength = cameraPath.positions[ 0 ].distanceTo( cameraPath.positions[ 1 ] );
const cameraPathFirstLegRatio = cameraPathFirstLegLength / (
	cameraPathFirstLegLength + cameraPath.positions[ 1 ].distanceTo( cameraPath.positions[ 2 ] )
);
const revealProgress = uniform( 1 );
const pathPosition = new THREE.Vector3();
const pathRotation = new THREE.Quaternion();
const pathForward = new THREE.Vector3();
const pathPivot = new THREE.Vector3();
const pathOffset = new THREE.Vector3();
const pathSpherical = new THREE.Spherical();

let container;
let containerStyle;
let renderer;
let devtools;
let scene;
let camera;
let controls;
let resizeObserver;
let timer;
let gui;
let splats = null;
let captureHelpers = null;
let captionElement = null;
let options;
let mounted = false;
let introElapsed = 0;
let introActive = false;
let cameraFrame = 0;
let cameraPlaying = false;
let baseAzimuth = 0;
let basePolar = Math.PI * 0.5;
let orbitAzimuth = 0;
let orbitPolar = 0;
let cameraGuiState = null;

const revealShaderResources = {
	get splatBuffers() { return splats?.buffers; },
	get drawStructNode() { return splats?.drawStructNode; },
	get indirectDispatchNode() { return splats?._indirectDispatchNode; },
	get sorter() { return splats?._sorter; },
	get tileRenderer() { return splats?._tileRenderer; },
	revealProgress,
};

export async function mount( containerElement, mountOptions = {} ) {

	container = containerElement;
	options = {
		assets: mountOptions.assets ?? {},
		intro: mountOptions.intro ?? ! REDUCED_MOTION,
		playback: mountOptions.playback ?? ! REDUCED_MOTION,
		quality: mountOptions.quality ?? 'quality',
	};
	containerStyle = {
		position: container.style.position,
		overflow: container.style.overflow,
		touchAction: container.style.touchAction,
	};
	container.style.position = 'relative';
	container.style.overflow = 'hidden';
	container.style.touchAction = 'none';
	mounted = true;

	if ( WebGPU.isAvailable() === false ) {

		container.appendChild( WebGPU.getErrorMessage() );
		throw new Error( 'No WebGPU support' );

	}

	await init();
	return createHandle();

}

function assetUrl() {

	const direct = options.assets?.meshToSplatScene;
	if ( typeof direct === 'string' && direct.length > 0 ) return direct;
	const root = options.assets?.media;
	if ( typeof root !== 'string' || root.length === 0 ) {

		throw new Error( 'Mesh to Splat Scene requires assets.meshToSplatScene or assets.media.' );

	}
	return `${root.replace( /\/$/u, '' )}/splat/blender-4-splash-scene.sog`;

}

async function init() {

	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	camera = new THREE.PerspectiveCamera( 44, width / height, 0.01, 1000 );

	scene = new THREE.Scene();
	// Identity output transform below: provide the finished display-space backdrop directly.
	scene.backgroundNode = vec3( 0.72, 0.82, 0.96 );

	const adapter = await navigator.gpu.requestAdapter();
	if ( ! adapter ) throw new Error( 'No WebGPU adapter available' );
	renderer = new THREE.WebGPURenderer( {
		antialias: false,
		requiredLimits: {
			maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
			maxBufferSize: adapter.limits.maxBufferSize,
		},
	} );
	devtools = registerDevtools( { renderer, container } );
	void devtools?.setStatsPanelMode( 'expanded' );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, MAX_PIXEL_RATIO ) );
	renderer.setSize( width, height );
	// Brush trains and alpha-composites against display-encoded PNGs. Preserve those values
	// through the framebuffer instead of applying a second scene-linear tone map.
	renderer.toneMapping = THREE.NoToneMapping;
	renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
	container.appendChild( renderer.domElement );
	await renderer.init();

	controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true;
	controls.dampingFactor = 0.035;
	controls.enablePan = false;
	controls.enableZoom = false;

	splats = await withAssetLoader( container, [ 'Courtyard capture' ], manager => (
		manager.load( 'Courtyard capture', onProgress => SplatMesh.load( assetUrl(), {
			quality: options.quality,
			sh: 3,
			attributeMode: 'sog',
			compaction: true,
			shColorMode: 'cached',
			rendererMode: 'compute-tiles',
			alphaMode: 'premultiplied',
			computeTiles: { allowRasterFallback: true, normalFilter: false },
			compositing: 'display',
			maxBufferBytes: adapter.limits.maxStorageBufferBindingSize,
			performance: {
				maxStdDev: Math.sqrt( 8 ),
				radiusClip: 0.2,
				fragmentAlphaClip: 0.5 / 255,
				alphaClip: 0.5 / 255,
				minContribution: 1,
				opacityAwareRadius: true,
			},
			appearance: {
				mode: 'unlit',
			},
			onProgress,
		} ) )
	) );
	if ( ! mounted ) {

		splats.dispose();
		splats = null;
		return;

	}

	const sourceBounds = splats._sourceBounds?.clone();
	if ( ! sourceBounds || sourceBounds.isEmpty() ) throw new Error( 'Mesh to Splat Scene has no bounds.' );
	configureReveal( splats, sourceBounds );
	shaderCache.container( 'mesh-to-splat-scene/reveal', revealShaderResources );
	splats.material.lightingMode = 'unlit';
	splats.rebuildMaterialHooks();
	scene.add( splats );
	captureHelpers = createCaptureHelpers();
	captureHelpers.visible = false;
	scene.add( captureHelpers );

	frameScene( sourceBounds.clone().applyMatrix4( splats._coordTransform ) );
	captionElement = createCaptionElement();
	container.appendChild( captionElement );
	setupGui();

	timer = new THREE.Timer();
	timer.connect( document );
	resizeObserver = new ResizeObserver( onResize );
	resizeObserver.observe( container );
	startIntro( options.intro );
	renderer.setAnimationLoop( render );

}

function configureReveal( mesh, bounds ) {

	const minimum = bounds.min;
	const maximum = bounds.max;
	const size = bounds.getSize( new THREE.Vector3() );
	const sceneScale = Math.max( size.x, size.y, size.z, 1e-5 );
	const revealOrigin = cameraPath.positions[ 0 ].clone().applyMatrix4( mesh._coordTransform.clone().invert() );
	const nearDistance = bounds.distanceToPoint( revealOrigin );
	const farthest = new THREE.Vector3(
		Math.abs( revealOrigin.x - minimum.x ) > Math.abs( revealOrigin.x - maximum.x ) ? minimum.x : maximum.x,
		Math.abs( revealOrigin.y - minimum.y ) > Math.abs( revealOrigin.y - maximum.y ) ? minimum.y : maximum.y,
		Math.abs( revealOrigin.z - minimum.z ) > Math.abs( revealOrigin.z - maximum.z ) ? minimum.z : maximum.z
	);
	const distanceSpan = Math.max( farthest.distanceTo( revealOrigin ) - nearDistance, 1e-5 );
	const hash = index => float( index ).mul( 12.9898 ).sin().mul( 43758.5453 ).fract();
	const state = ( position, index ) => {

		const jitter = hash( index ).toVar();
		// The intro camera is above the COLMAP Y-down scene, so this near-to-far wave
		// reveals the top first and finishes at the farthest scene boundary.
		const delay = position.sub( vec3( revealOrigin.x, revealOrigin.y, revealOrigin.z ) )
			.length().sub( nearDistance ).div( distanceSpan ).clamp( 0, 1 ).mul( 0.64 ).toVar();
		const t = revealProgress.sub( delay ).div( 0.36 ).clamp( 0, 1 ).toVar();
		const eased = t.mul( t ).mul( t ).mul( t.mul( 6 ).sub( 15 ).mul( t ).add( 10 ) ).toVar();
		const missing = eased.oneMinus().toVar();
		const bloom = eased.mul( missing ).mul( 4 ).toVar();
		return { jitter, eased, missing, bloom };

	};

	mesh.material.customPositionNode = Fn( ( [ position, index ] ) => {

		const reveal = state( position, index );
		const microPhase = reveal.jitter.mul( Math.PI * 2 ).toVar();
		const microDrift = reveal.bloom.mul( sceneScale * 0.0005 ).toVar();
		return position.add( vec3(
			microPhase.sin().mul( microDrift ),
			reveal.missing.mul( reveal.missing ).mul( sceneScale * - 0.02 ),
			microPhase.cos().mul( microDrift )
		) );

	} );
	mesh.material.customScaleNode = Fn( ( [ scale, position, index ] ) => {

		const reveal = state( position, index );
		return scale.sub( reveal.missing.mul( 0.9 ) ).add( reveal.bloom.mul( 0.12 ) );

	} );
	mesh.material.customColorNode = Fn( ( [ sourceColor, position, index ] ) => {

		const reveal = state( position, index );
		const wash = mix( vec3( 0.48, 0.68, 1.0 ), vec3( 0.78, 0.52, 0.96 ), reveal.jitter );
		return mix( sourceColor.xyz, wash, reveal.bloom.mul( 0.18 ) );

	} );
	mesh.material.customOpacityNode = Fn( ( [ opacity, position, index ] ) => {

		return opacity.mul( state( position, index ).eased );

	} );

}

function frameScene( bounds ) {

	const center = bounds.getCenter( new THREE.Vector3() );
	const radius = Math.max( bounds.getSize( new THREE.Vector3() ).length() * 0.5, 0.1 );
	camera.near = 0.05;
	camera.far = cameraPath.positions[ 0 ].distanceTo( center ) + radius * 3;
	updateCameraProjection();
	controls.minDistance = cameraPath.orbitRadius;
	controls.maxDistance = cameraPath.orbitRadius;
	applyCameraFrame( cameraPath.frameStart );

}

function createCaptureHelpers() {

	const group = new THREE.Group();
	group.name = 'Camera Path Capture Helpers';
	const palette = [ 0xf05462, 0x4a8fe7, 0x8bbf68, 0xf3ad3d, 0x9b6ce0, 0x32b6a6, 0xe36eae, 0x6d8fd1, 0xc78442 ];
	const shellGeometry = new THREE.SphereGeometry( 1, 12, 8 );
	const markerGeometry = new THREE.SphereGeometry( 0.22, 10, 6 );
	const shellMaterials = [];
	const markerMaterials = [];
	const linePositions = [];
	const lineColors = [];
	const viewPositions = [];
	const viewColors = [];
	const golden = Math.PI * ( 3 - Math.sqrt( 5 ) );
	const blenderDirection = new THREE.Vector3();
	const direction = new THREE.Vector3();
	const endpoint = new THREE.Vector3();
	const shellRotation = new THREE.Quaternion();
	const tiltRotation = new THREE.Quaternion();
	const zAxis = new THREE.Vector3( 0, 0, 1 );
	const xAxis = new THREE.Vector3( 1, 0, 0 );
	let viewIndex = 0;

	for ( let clusterIndex = 0; clusterIndex < CAPTURE_PATH_SAMPLES.length; clusterIndex ++ ) {

		const center = CAPTURE_PATH_SAMPLES[ clusterIndex ];
		const color = new THREE.Color( palette[ clusterIndex ] );
		const viewsHere = CAPTURE_VIEWS_PER_ANCHOR;
		shellRotation.setFromAxisAngle( zAxis, golden * clusterIndex );
		tiltRotation.setFromAxisAngle( xAxis, golden * clusterIndex * 0.37 );
		shellRotation.multiply( tiltRotation );

		const shellMaterial = new THREE.MeshBasicMaterial( {
			color,
			wireframe: true,
			transparent: true,
			opacity: 0.32,
			depthTest: false,
			depthWrite: false,
		} );
		const markerMaterial = new THREE.MeshBasicMaterial( { color, depthTest: false, depthWrite: false } );
		shellMaterials.push( shellMaterial );
		markerMaterials.push( markerMaterial );
		const shell = new THREE.Mesh( shellGeometry, shellMaterial );
		shell.position.copy( center );
		shell.scale.setScalar( CAPTURE_SHELL_RADIUS );
		shell.renderOrder = 20;
		group.add( shell );
		const marker = new THREE.Mesh( markerGeometry, markerMaterial );
		marker.position.copy( center );
		marker.renderOrder = 21;
		group.add( marker );

		for ( let index = 0; index < viewsHere; index ++ ) {

			const z = 1 - ( 2 * index + 1 ) / viewsHere;
			const radius = Math.sqrt( Math.max( 0, 1 - z * z ) );
			const angle = golden * index;
			blenderDirection.set( Math.cos( angle ) * radius, Math.sin( angle ) * radius, z ).applyQuaternion( shellRotation );
			direction.set( blenderDirection.x, blenderDirection.z, - blenderDirection.y );
			endpoint.copy( direction ).multiplyScalar( CAPTURE_SHELL_RADIUS ).add( center );
			linePositions.push( center.x, center.y, center.z, endpoint.x, endpoint.y, endpoint.z );
			lineColors.push( color.r, color.g, color.b, color.r, color.g, color.b );
			viewPositions.push( endpoint.x, endpoint.y, endpoint.z );
			viewColors.push( color.r, color.g, color.b );
			viewIndex ++;

		}

	}

	if ( viewIndex !== CAPTURE_PATH_SAMPLES.length * CAPTURE_VIEWS_PER_ANCHOR ) throw new Error( `Capture helper view mismatch: ${viewIndex}` );
	const lineGeometry = new THREE.BufferGeometry();
	lineGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( linePositions, 3 ) );
	lineGeometry.setAttribute( 'color', new THREE.Float32BufferAttribute( lineColors, 3 ) );
	const lineMaterial = new THREE.LineBasicMaterial( { vertexColors: true, transparent: true, opacity: 0.58, depthTest: false, depthWrite: false } );
	const rays = new THREE.LineSegments( lineGeometry, lineMaterial );
	rays.renderOrder = 20;
	group.add( rays );
	const viewGeometry = new THREE.BufferGeometry();
	viewGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( viewPositions, 3 ) );
	viewGeometry.setAttribute( 'color', new THREE.Float32BufferAttribute( viewColors, 3 ) );
	const viewMaterial = new THREE.PointsMaterial( { size: 4, sizeAttenuation: false, vertexColors: true, depthTest: false, depthWrite: false } );
	const views = new THREE.Points( viewGeometry, viewMaterial );
	views.renderOrder = 22;
	group.add( views );
	const pathGeometry = new THREE.BufferGeometry().setFromPoints( CAPTURE_PATH_SAMPLES );
	const pathMaterial = new THREE.LineBasicMaterial( { color: 0x17335c, transparent: true, opacity: 0.72, depthTest: false, depthWrite: false } );
	const path = new THREE.Line( pathGeometry, pathMaterial );
	path.renderOrder = 19;
	group.add( path );
	group.userData.dispose = () => {

		shellGeometry.dispose();
		markerGeometry.dispose();
		lineGeometry.dispose();
		viewGeometry.dispose();
		pathGeometry.dispose();
		lineMaterial.dispose();
		viewMaterial.dispose();
		pathMaterial.dispose();
		shellMaterials.forEach( material => material.dispose() );
		markerMaterials.forEach( material => material.dispose() );

	};
	return group;

}

function updateCameraProjection() {

	camera.fov = THREE.MathUtils.radToDeg( 2 * Math.atan( Math.tan( cameraPath.horizontalFov * 0.5 ) / camera.aspect ) );
	camera.updateProjectionMatrix();

}

function applyCameraFrame( frame ) {

	const progress = THREE.MathUtils.smootherstep( frame, cameraPath.frameStart, cameraPath.frameEnd );
	const firstAlpha = THREE.MathUtils.clamp( progress / cameraPathFirstLegRatio, 0, 1 );
	const secondAlpha = THREE.MathUtils.clamp( ( progress - cameraPathFirstLegRatio ) / ( 1 - cameraPathFirstLegRatio ), 0, 1 );
	pathPosition.lerpVectors( cameraPath.positions[ 0 ], cameraPath.positions[ 1 ], firstAlpha ).lerp( cameraPath.positions[ 2 ], secondAlpha );
	pathRotation.slerpQuaternions( cameraPath.rotations[ 0 ], cameraPath.rotations[ 1 ], firstAlpha ).slerp( cameraPath.rotations[ 2 ], secondAlpha );
	pathForward.set( 0, 0, - 1 ).applyQuaternion( pathRotation );
	pathPivot.copy( pathForward ).multiplyScalar( cameraPath.orbitRadius ).add( pathPosition );
	applyOrbitPose( pathPosition, pathPivot );

}

function applyCaptureHelperFrame() {

	const verticalHalfFov = THREE.MathUtils.degToRad( camera.fov ) * 0.5;
	const horizontalHalfFov = Math.atan( Math.tan( verticalHalfFov ) * camera.aspect );
	const distance = CAPTURE_HELPER_RADIUS / Math.sin( Math.min( verticalHalfFov, horizontalHalfFov ) ) * 1.08;
	pathPosition.copy( CAPTURE_HELPER_VIEW_AXIS ).multiplyScalar( distance ).add( CAPTURE_HELPER_CENTER );
	applyOrbitPose( pathPosition, CAPTURE_HELPER_CENTER );

}

function applyOrbitPose( position, pivot ) {

	pathPivot.copy( pivot );
	pathOffset.copy( position ).sub( pathPivot );
	pathSpherical.setFromVector3( pathOffset );
	baseAzimuth = pathSpherical.theta;
	basePolar = pathSpherical.phi;
	pathSpherical.theta += orbitAzimuth;
	pathSpherical.phi = THREE.MathUtils.clamp( pathSpherical.phi + orbitPolar, 1e-4, Math.PI - 1e-4 );
	pathOffset.setFromSpherical( pathSpherical );
	controls.target.copy( pathPivot );
	camera.position.copy( pathPivot ).add( pathOffset );
	camera.lookAt( pathPivot );
	controls.minDistance = pathOffset.length();
	controls.maxDistance = pathOffset.length();
	controls.minAzimuthAngle = baseAzimuth - MAX_ORBIT_TILT;
	controls.maxAzimuthAngle = baseAzimuth + MAX_ORBIT_TILT;
	controls.minPolarAngle = Math.max( 1e-4, basePolar - MAX_ORBIT_TILT );
	controls.maxPolarAngle = Math.min( Math.PI - 1e-4, basePolar + MAX_ORBIT_TILT );

}

function captureOrbitOffset() {

	pathOffset.copy( camera.position ).sub( controls.target );
	pathSpherical.setFromVector3( pathOffset );
	let azimuth = Math.atan2( Math.sin( pathSpherical.theta - baseAzimuth ), Math.cos( pathSpherical.theta - baseAzimuth ) );
	let polar = pathSpherical.phi - basePolar;
	const tilt = Math.hypot( azimuth, polar );
	if ( tilt > MAX_ORBIT_TILT ) {

		azimuth *= MAX_ORBIT_TILT / tilt;
		polar *= MAX_ORBIT_TILT / tilt;

	}
	orbitAzimuth = azimuth;
	orbitPolar = polar;

}

function createCaptionElement() {

	return createExampleCaption( {
		accent: '#64a4ff',
		ariaLabel: 'Mesh to Splat scene details',
		label: 'Scene details',
		content: `
			<span class="tb-example-caption__eyebrow">Mesh → Splat</span>
			<strong class="tb-example-caption__title">Mesh to Splat Scene</strong>
			<span class="tb-example-caption__meta">${splats.count.toLocaleString()} splats · ${CAPTURE_ANCHOR_COUNT} path anchors · ${CAPTURE_VIEW_COUNT} translated views · adaptive SH3</span>
			<span class="tb-example-caption__note">Blender 4.0 splash scene · artwork by Gaku Tada</span>
		`,
	} );

}

function setupGui() {

	gui?.destroy();
	gui = createExampleGui( 'Mesh to Splat Scene' );
	gui.close();
	cameraGuiState = {
		play: cameraPlaying,
		frame: cameraFrame,
		helpers: false,
		replay: () => startIntro( true ),
	};
	gui.add( cameraGuiState, 'replay' ).name( 'Replay scene' );
	gui.add( cameraGuiState, 'play' ).name( 'Play camera' ).onChange( value => {

		cameraPlaying = value;

	} );
	gui.add( cameraGuiState, 'helpers' ).name( 'Capture helpers' ).onChange( value => {

		captureHelpers.visible = value;
		cameraPlaying = false;
		cameraGuiState.play = false;
		introActive = false;
		setReveal( 1 );
		orbitAzimuth = 0;
		orbitPolar = 0;
		if ( value ) applyCaptureHelperFrame();
		else applyCameraFrame( cameraFrame );

	} );
	gui.add( cameraGuiState, 'frame', cameraPath.frameStart, cameraPath.frameEnd, 0.01 ).name( 'Camera beat' ).listen().onChange( value => {

		cameraFrame = value;
		cameraPlaying = false;
		cameraGuiState.play = false;

	} );

}

function setReveal( value ) {

	const next = THREE.MathUtils.clamp( value, 0, 1 );
	if ( revealProgress.value === next ) return;
	revealProgress.value = next;
	splats?.invalidate();

}

function startIntro( enabled = true ) {

	introElapsed = 0;
	introActive = Boolean( enabled ) && ! REDUCED_MOTION;
	cameraFrame = cameraPath.frameStart;
	cameraPlaying = Boolean( options.playback ) && ! REDUCED_MOTION;
	orbitAzimuth = 0;
	orbitPolar = 0;
	if ( captureHelpers ) captureHelpers.visible = false;
	if ( cameraGuiState ) {

		cameraGuiState.frame = cameraFrame;
		cameraGuiState.play = cameraPlaying;
		cameraGuiState.helpers = false;

	}
	if ( controls ) applyCameraFrame( cameraFrame );
	setReveal( introActive ? 0 : 1 );

}

function render() {

	timer?.update();
	const delta = Math.min( timer?.getDelta() ?? 0, 0.05 );
	controls.update( delta );
	captureOrbitOffset();
	if ( introActive ) {

		introElapsed += delta * Math.pow( MAX_REVEAL_SPEED, revealProgress.value );
		const progress = THREE.MathUtils.clamp( introElapsed / INTRO_SECONDS, 0, 1 );
		setReveal( progress );
		if ( progress >= 1 ) introActive = false;

	}
	if ( cameraPlaying && ! introActive ) {

		cameraFrame = Math.min(
			cameraFrame + delta * ( cameraPath.frameEnd - cameraPath.frameStart ) / CAMERA_DURATION_SECONDS,
			cameraPath.frameEnd
		);
		if ( cameraFrame >= cameraPath.frameEnd ) cameraPlaying = false;
		cameraGuiState.frame = cameraFrame;
		cameraGuiState.play = cameraPlaying;

	}
	if ( captureHelpers?.visible ) applyCaptureHelperFrame();
	else applyCameraFrame( cameraFrame );
	renderer.render( scene, camera );

}

function onResize() {

	if ( ! container || ! renderer || ! camera ) return;
	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, MAX_PIXEL_RATIO ) );
	renderer.setSize( width, height );
	camera.aspect = width / height;
	updateCameraProjection();

}

export function unmount() {

	mounted = false;
	renderer?.setAnimationLoop( null );
	resizeObserver?.disconnect();
	resizeObserver = null;
	captionElement?.remove();
	captionElement = null;
	gui?.destroy();
	gui = null;
	if ( captureHelpers ) {

		scene?.remove( captureHelpers );
		captureHelpers.userData.dispose();
		captureHelpers = null;

	}
	controls?.dispose();
	controls = null;
	if ( splats ) {

		scene?.remove( splats );
		splats.dispose();
		splats = null;

	}
	if ( renderer ) {

		devtools?.dispose();
		devtools = null;
		renderer.dispose();
		renderer.domElement.remove();
		renderer = null;

	}
	if ( container && containerStyle ) Object.assign( container.style, containerStyle );
	containerStyle = null;
	scene = null;
	camera = null;
	timer?.dispose();
	timer = null;
	container = null;
	options = null;
	introElapsed = 0;
	introActive = false;
	cameraFrame = 0;
	cameraPlaying = false;
	cameraGuiState = null;
	orbitAzimuth = 0;
	orbitPolar = 0;
	revealProgress.value = 1;

}

function createHandle() {

	return {
		replay() {

			startIntro( true );

		},
		seek( progress ) {

			introActive = false;
			setReveal( progress );

		},
		seekCamera( progress ) {

			cameraPlaying = false;
			cameraFrame = THREE.MathUtils.lerp( cameraPath.frameStart, cameraPath.frameEnd, THREE.MathUtils.clamp( progress, 0, 1 ) );
			if ( cameraGuiState ) {

				cameraGuiState.frame = cameraFrame;
				cameraGuiState.play = false;

			}
			applyCameraFrame( cameraFrame );

		},
		getDiagnostics() {

			return {
				introActive,
				reveal: revealProgress.value,
				cameraFrame,
				cameraPlaying,
				splatCount: splats?.count ?? 0,
			};

		},
		dispose: unmount,
	};

}
