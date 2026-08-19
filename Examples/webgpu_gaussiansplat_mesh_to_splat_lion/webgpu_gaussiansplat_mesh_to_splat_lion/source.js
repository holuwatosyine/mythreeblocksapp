import * as THREE from 'three/webgpu';
import { cameraWorldMatrix, Fn, fog, positionView, smoothstep, vec3, vec4 } from 'three/tsl';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { registerDevtools } from 'three-blocks/devtools';
import { SplatMesh } from 'three-blocks/gaussian-splats';
import { createExampleCaption } from '../helpers/ExampleCaption.js';
import { withAssetLoader } from '../helpers/LoadingManager.js';

const BUST_FOG_NORMAL = new THREE.Vector3( - 0.2187, - 0.3514, - 0.9103 ).normalize();
const BUST_FOG_PLANE = - 0.8019;
const BUST_FOG_WIDTH = 0.13;
const BUST_FOG_SHRINK = 1.4;
const FADE_SECONDS = 3;
const MAX_PIXEL_RATIO = 1;
const REDUCED_MOTION = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
const CAMERA_DIRECTION = new THREE.Vector3( 0.14, 0.04, 1 ).normalize();
const CAMERA_ORBIT_RADIUS = THREE.MathUtils.degToRad( 15 );
const CAMERA_ORBIT_SPEED = 0.36;

let container;
let containerStyle;
let renderer;
let devtools;
let scene;
let camera;
let controls;
let resizeObserver;
let timer;
let splats = null;
let creditElement = null;
let options;
let mounted = false;
let introElapsed = FADE_SECONDS;
let orbitElapsed = 0;
let orbitAzimuth = 0;
let orbitPolar = 0;
let orbitPaused = false;

export async function mount( containerElement, mountOptions = {} ) {

	container = containerElement;
	options = {
		assets: mountOptions.assets ?? {},
		intro: mountOptions.intro ?? ! REDUCED_MOTION,
		quality: mountOptions.quality ?? 'quality',
	};
	containerStyle = {
		position: container.style.position,
		overflow: container.style.overflow,
		touchAction: container.style.touchAction,
		background: container.style.background,
	};
	container.style.position = 'relative';
	container.style.overflow = 'hidden';
	container.style.touchAction = 'none';
	container.style.background = '#000';
	mounted = true;

	if ( WebGPU.isAvailable() === false ) {

		container.appendChild( WebGPU.getErrorMessage() );
		throw new Error( 'No WebGPU support' );

	}

	await init();
	return createHandle();

}

function assetUrl() {

	const direct = options.assets?.meshToSplatLion;
	if ( typeof direct === 'string' && direct.length > 0 ) return direct;
	const root = options.assets?.media;
	if ( typeof root !== 'string' || root.length === 0 ) {

		throw new Error( 'Mesh to Splat Cave Lion requires assets.meshToSplatLion or assets.media.' );

	}
	return `${root.replace( /\/$/u, '' )}/splat/lion.sog`;

}

async function init() {

	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	camera = new THREE.PerspectiveCamera( 36, width / height, 0.005, 20 );
	scene = new THREE.Scene();

	const adapter = await navigator.gpu.requestAdapter();
	if ( ! adapter ) throw new Error( 'No WebGPU adapter available' );
	renderer = new THREE.WebGPURenderer( {
		antialias: false,
		alpha: true,
		requiredLimits: {
			maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
			maxBufferSize: adapter.limits.maxBufferSize,
		},
	} );
	devtools = registerDevtools( { renderer, container } );
	void devtools?.setStatsPanelMode( 'expanded' );
	renderer.setClearColor( 0x000000, 0 );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, MAX_PIXEL_RATIO ) );
	renderer.setSize( width, height );
	renderer.toneMapping = THREE.NoToneMapping;
	renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
	container.appendChild( renderer.domElement );
	await renderer.init();

	controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true;
	controls.dampingFactor = 0.045;
	controls.enablePan = false;
	controls.addEventListener( 'start', () => orbitPaused = true );
	controls.addEventListener( 'end', () => orbitPaused = false );

	splats = await withAssetLoader( container, [ 'Cave lion' ], manager => (
		manager.load( 'Cave lion', onProgress => SplatMesh.load( assetUrl(), {
			quality: options.quality,
			sh: 3,
			attributeMode: 'sog',
			compaction: true,
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
			appearance: { mode: 'unlit' },
			onProgress,
		} ) )
	) );
	if ( ! mounted ) {

		splats.dispose();
		splats = null;
		return;

	}

	configureBustFog( splats );
	scene.add( splats );
	frameLion();
	creditElement = createCreditElement();
	container.appendChild( creditElement );

	timer = new THREE.Timer();
	timer.connect( document );
	resizeObserver = new ResizeObserver( onResize );
	resizeObserver.observe( container );
	startIntro( options.intro );
	renderer.setAnimationLoop( render );

}

function configureBustFog( mesh ) {

	const fogFactor = worldPosition => smoothstep(
		- BUST_FOG_WIDTH,
		0,
		worldPosition.dot( vec3( BUST_FOG_NORMAL ) ).sub( BUST_FOG_PLANE )
	);
	const visibility = position => fogFactor(
		mesh.uniforms.modelMatrix.mul( vec4( position, 1 ) ).xyz
	).oneMinus();
	const fragmentWorldPosition = cameraWorldMatrix.mul( vec4( positionView, 1 ) ).xyz;
	scene.fogNode = fog( vec3( 91 / 255, 57 / 255, 38 / 255 ), fogFactor( fragmentWorldPosition ) );
	mesh.material.customScaleNode = Fn( ( [ scale, position ] ) => (
		scale.sub( visibility( position ).oneMinus().mul( BUST_FOG_SHRINK ) )
	) );
	mesh.material.customOpacityNode = Fn( ( [ opacity, position ] ) => {

		return opacity.mul( visibility( position ).pow( 3 ) );

	} );
	mesh.rebuildMaterialHooks();

}

function frameLion() {

	const bounds = splats?._sourceBounds?.clone().applyMatrix4( splats._coordTransform );
	if ( ! bounds || bounds.isEmpty() ) throw new Error( 'Mesh to Splat Cave Lion has no bounds.' );
	const center = bounds.getCenter( new THREE.Vector3() );
	const size = bounds.getSize( new THREE.Vector3() );
	const radius = Math.max( size.length() * 0.5, 0.01 );
	const verticalFov = THREE.MathUtils.degToRad( camera.fov );
	const horizontalFov = 2 * Math.atan( Math.tan( verticalFov * 0.5 ) * camera.aspect );
	const distance = radius / Math.sin( Math.min( verticalFov, horizontalFov ) * 0.5 ) * 0.648;

	center.x -= size.x * 0.12;
	camera.near = radius * 0.02;
	camera.far = radius * 24;
	camera.position.copy( center ).addScaledVector( CAMERA_DIRECTION, distance );
	camera.updateProjectionMatrix();
	controls.target.copy( center );
	controls.minDistance = radius * 1.35;
	controls.maxDistance = radius * 8;
	orbitElapsed = 0;
	orbitAzimuth = 0;
	orbitPolar = 0;
	orbitPaused = false;
	controls.update();

}

function createCreditElement() {

	return createExampleCaption( {
		accent: '#d7a06c',
		ariaLabel: 'Cave lion model credits',
		label: 'Credits · CC BY',
		content: `
			<span class="tb-example-caption__eyebrow">Mesh to Splat Tools CLI</span>
			<h2 class="tb-example-caption__title">Panthera spelaea</h2>
			<p class="tb-example-caption__note">Eurasian steppe lion or cave lion. Reconstruction of a large female.</p>
			<span class="tb-example-caption__meta">CC BY · Joanna Kobierska</span>
			<nav class="tb-example-caption__links" aria-label="Cave lion source links">
				<a href="https://joanna_kobierska.artstation.com/" target="_blank" rel="noopener noreferrer">Joanna Kobierska ↗</a>
				<a href="https://theartofken.com/" target="_blank" rel="noopener noreferrer">Lion base · Ken Barthelmey ↗</a>
				<a href="https://sketchfab.com/3d-models/crane-de-lion-des-cavernes-grottes-daze-71-30f635acd9a54d06b93119ff84801406" target="_blank" rel="noopener noreferrer">Skull reference · Grottes d'Azé ↗</a>
			</nav>
		`,
	} );

}

function setFade( progress ) {

	if ( renderer ) renderer.domElement.style.opacity = THREE.MathUtils.smootherstep( progress, 0, 1 );

}

function startIntro( enabled = true ) {

	introElapsed = enabled && ! REDUCED_MOTION ? 0 : FADE_SECONDS;
	setFade( introElapsed / FADE_SECONDS );

}

function render() {

	timer?.update();
	const delta = Math.min( timer?.getDelta() ?? 0, 0.05 );
	if ( introElapsed < FADE_SECONDS ) {

		introElapsed = Math.min( FADE_SECONDS, introElapsed + delta );
		setFade( introElapsed / FADE_SECONDS );

	}
	if ( ! REDUCED_MOTION && ! orbitPaused ) {

		orbitElapsed += delta;
		const phase = orbitElapsed * CAMERA_ORBIT_SPEED;
		const radius = CAMERA_ORBIT_RADIUS * THREE.MathUtils.smootherstep( orbitElapsed, 0, 2 );
		const azimuth = Math.sin( phase ) * radius;
		const polar = Math.cos( phase ) * radius;
		controls.rotateLeft( orbitAzimuth - azimuth );
		controls.rotateUp( orbitPolar - polar );
		orbitAzimuth = azimuth;
		orbitPolar = polar;

	}
	controls.update( delta );
	renderer.render( scene, camera );

}

function onResize() {

	if ( ! container || ! renderer || ! camera || ! splats ) return;
	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, MAX_PIXEL_RATIO ) );
	renderer.setSize( width, height );
	camera.aspect = width / height;
	frameLion();

}

export function unmount() {

	mounted = false;
	renderer?.setAnimationLoop( null );
	resizeObserver?.disconnect();
	resizeObserver = null;
	creditElement?.remove();
	creditElement = null;
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
	introElapsed = FADE_SECONDS;

}

function createHandle() {

	return {
		replay() {

			startIntro( true );

		},
		seek( progress ) {

			introElapsed = THREE.MathUtils.clamp( progress, 0, 1 ) * FADE_SECONDS;
			setFade( introElapsed / FADE_SECONDS );

		},
		getDiagnostics() {

			return {
				fade: introElapsed / FADE_SECONDS,
				splatCount: splats?.count ?? 0,
			};

		},
		dispose: unmount,
	};

}
