import * as THREE from 'three/webgpu';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { registerDevtools } from 'three-blocks/devtools';

import { transformNormalToView, transformNormal, positionLocal, normalLocal, color, materialColor, instanceIndex } from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PBF } from 'three-blocks';
import { MeshTransmissionNodeMaterial } from 'three-blocks/transmission';
import { LoadingManager } from '../helpers/LoadingManager.js';
import { shaderCache } from 'three-blocks/shaders';
import { createExampleGui } from '../helpers/exampleGui.js';
import { frameCameraForAspect } from '../helpers/mobile.js';

const DEBUG_FROM_URL = new URLSearchParams( window.location.search ).has( 'debug' );

let container;
let camera;
let scene;
let renderer;
let devtools;
let controls;
let mesh;
let gui;
let sph;
let loadingManager;
let environmentTexture;
let resizeObserver;
let debugMode = DEBUG_FROM_URL;

const viewParams = {
	rotationSpeed: 0.18,
	fluidSpeed: 1.35,
};

function requireAsset( assets, key ) {

	const asset = assets?.[ key ];
	if ( asset instanceof URL ) return asset.href;
	if ( typeof asset === 'string' && asset.length > 0 ) return asset;
	throw new Error( `Living Glass requires assets.${key}.` );

}

export async function mount( containerElement, {
	assets = {},
	debug = DEBUG_FROM_URL,
} = {} ) {

	container = containerElement;
	debugMode = Boolean( debug );
	const resolvedAssets = {
		environment: requireAsset( assets, 'environment' ),
		transcoderPath: assets?.transcoderPath ?? assets?.basis ?? null,
	};

	await init( resolvedAssets );
	return { dispose: unmount };

}

async function init( assets ) {

	// Initialize loading manager
	loadingManager = new LoadingManager();
	loadingManager.setItems( [ 'HDR Environment' ] );
	loadingManager.init( container );

	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	const aspect = width / height;
	camera = new THREE.PerspectiveCamera( 45, aspect, 0.1, 1000 );
	camera.position.set( 15, 10, 17 );

	scene = new THREE.Scene();

	const geometry = new RoundedBoxGeometry( 10, 10, 10, 12, 0.85 );
	const material = new MeshTransmissionNodeMaterial( {
		color: 0xeaf5ff,
		roughness: 0.16,
		thickness: 2.1,
		ior: 1.38,
		// Dialled back from 0.32: per-channel refraction turns a perturbed normal into
		// coloured confetti, and the grain below perturbs every pixel.
		chromaticAberration: 0.12,
		anisotropicBlur: 0.06,
		// One grain control. `surfaceDistortion` perturbs the shading normal, which
		// `normalWorld` — and so the refraction — reads too, so the same frost lands on
		// every face. `distortion` only reaches the transmitted side, which Fresnel fades
		// out wherever a face turns away from the camera, so it stays off here.
		distortion: 0,
		surfaceDistortion: 0.03,
		distortionScale: 8,
		temporalDistortion: 0.05,
		attenuationColor: 0xb9ddff,
		attenuationDistance: 18,
		backdropDistance: 1.5,
		samples: 3,
	} );
	material.name = 'MeshTransmission';
	mesh = new THREE.Mesh( geometry, material );
	mesh.position.y = 0;
	scene.add( mesh );


	renderer = new THREE.WebGPURenderer( { antialias: true } );
	devtools = registerDevtools( { renderer, container } );
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.05;
	await renderer.init();
	gui = await createExampleGui( 'Living Glass' );
	if ( width < 620 ) gui.close();
	gui.add( viewParams, 'rotationSpeed', 0, 0.5, 0.01 ).name( 'Turntable' );
	gui.add( viewParams, 'fluidSpeed', 0.2, 2.5, 0.05 ).name( 'Fluid speed' ).onChange( value => {

		if ( sph ) sph.ubos.timeScale.value = value;

	} );
	gui.add( material, 'roughness', 0, 1, 0.01 ).name( 'Glass frost' );
	gui.add( material, 'chromaticAberration', 0, 1, 0.01 ).name( 'Prism fringe' );
	// Two knobs for the grain: how much, and how fine. Everything else that was exposed
	// here either duplicated these or belongs to the material's own debug folder, which
	// `?debug` still opens in full.
	gui.add( material, 'surfaceDistortion', 0, 0.1, 0.001 ).name( 'Grain' );
	gui.add( material, 'distortionScale', 0, 20, 0.1 ).name( 'Grain scale' );
	if ( debugMode ) material.attachGUI( gui );

	if ( renderer.backend.isWebGPUBackend === true ) {

		const size = 20;
		const count = 4096 * 2;
		const simulationScale = 3;

		// PBF parameter controls
		const simParams = {
			is3D: true,
			h: 1.0,
			mass: 1.0,
		};

		sph = new PBF( {
			count,
			is3D: simParams.is3D,
			domainDimensions: new THREE.Vector3( size, size, size ),
			mass: simParams.mass,
			h: simParams.h,
			useDirection: true,
			scaleKernelWithDomain: false,
			useSpatialGrid: true,
		} );
		shaderCache.container( 'living-glass/fluid-solver', sph );

		sph.ubos.timeScale.value = viewParams.fluidSpeed;
		sph.setDomainFromObject( mesh, { padding: 0.0, simulationScale } );

		const geometrySPH = new THREE.SphereGeometry( .1, 8, 4 );
		const materialSPH = new THREE.MeshPhysicalNodeMaterial( { color: 0x888888, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.3 } );
		materialSPH.positionNode = sph.instanceMatrix().mul( positionLocal.mul(
			sph.buffers.directions.element( instanceIndex ).xyz.normalize().mul( .5 ).add( 1 )
		) ).xyz;
		materialSPH.normalNode = transformNormalToView( transformNormal( normalLocal, sph.instanceMatrix() ) ).toVarying( 'v_normalViewGeometry' ).normalize();
		materialSPH.colorNode = sph.buffers.directions.element( instanceIndex ).xyz.length().smoothstep( 4, 14 ).mix(
			materialColor,
			sph.buffers.directions.element( instanceIndex ).xyz.length().smoothstep( 7, 14 ).mul( 1 ).mix(
				color( 0xF5B700 ), color( 0xF5B700 ).mul( 1.5 ) )
		);
		const meshSPH = new THREE.InstancedMesh( geometrySPH, materialSPH, count );
		meshSPH.frustumCulled = false;
		meshSPH.scale.setScalar( 0.9 );
		mesh.add( meshSPH );
		if ( debugMode ) sph.attachGUI( gui );

	}


	const light = new THREE.DirectionalLight( 0xfff2da, 2.2 );
	light.position.set( - 8, 12, 8 );
	scene.add( light );
	const ambientLight = new THREE.HemisphereLight( 0xcce8ff, 0x33281f, 1.25 );
	scene.add( ambientLight );

	scene.background = new THREE.Color( 0x121212 );

	environmentTexture = await loadingManager.load( 'HDR Environment', async ( onProgress ) => {

		// GPU-compressed UASTC HDR environments transcode to BC6H where the
		// hardware supports it; plain .hdr URLs keep the RGBE path.
		const useKtx2 = /\.ktx2(?:\?|$)/iu.test( String( assets.environment ) );
		if ( useKtx2 && ! assets.transcoderPath ) throw new Error( 'KTX2 environments require assets.transcoderPath.' );
		const loader = useKtx2
			? new KTX2Loader()
				.setTranscoderPath( `${String( assets.transcoderPath ).replace( /\/$/u, '' )}/` )
				.detectSupport( renderer )
			: new HDRLoader();
		try {

			return await new Promise( ( resolve, reject ) => {

				loader.load( assets.environment, resolve, onProgress, reject );

			} );

		} finally {

			loader.dispose?.();

		}

	} );

	environmentTexture.mapping = THREE.EquirectangularReflectionMapping;
	scene.environment = environmentTexture;
	scene.background = environmentTexture;
	scene.environmentIntensity = 1.2;
	scene.backgroundBlurriness = 0.14;

	// All assets loaded
	loadingManager.complete();

	renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
	renderer.setSize( width, height );
	container.appendChild( renderer.domElement );


	controls = new OrbitControls( camera, renderer.domElement );
	controls.target.set( 0, 0, 0 );
	controls.enableDamping = true;
	controls.minDistance = 11;
	controls.maxDistance = 42;
	controls.update();

	if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {

		viewParams.rotationSpeed = 0;
		viewParams.fluidSpeed = 0.55;
		if ( sph ) sph.ubos.timeScale.value = viewParams.fluidSpeed;

	}

	renderer.setAnimationLoop( render );

	resizeObserver = new ResizeObserver( onWindowResize );
	resizeObserver.observe( container );

}

function onWindowResize() {

	if ( ! renderer || ! camera ) return;
	const width = Math.max( 1, container?.clientWidth ?? window.innerWidth );
	const height = Math.max( 1, container?.clientHeight ?? window.innerHeight );
	renderer.setSize( width, height );
	const aspect = width / height;
	camera.aspect = Math.max( 1e-6, aspect );
	camera.updateProjectionMatrix();
	frameCameraForAspect( camera, controls.target );

}

async function render( now = performance.now() ) {

	if ( sph ) {

		await sph.step( renderer );

	}

	controls?.update();
	const time = now * 0.001;
	mesh.rotation.x = time * viewParams.rotationSpeed * 0.72;
	mesh.rotation.y = time * viewParams.rotationSpeed;
	renderer.render( scene, camera );
}

export function unmount() {

	renderer?.setAnimationLoop( null );
	resizeObserver?.disconnect();
	resizeObserver = null;
	controls?.dispose();
	gui?.destroy?.();
	sph?.dispose();

	if ( scene ) {

		scene.traverse( object => {

			object.geometry?.dispose?.();
			if ( Array.isArray( object.material ) ) object.material.forEach( material => material.dispose?.() );
			else object.material?.dispose?.();

		} );

	}

	environmentTexture?.dispose();
	devtools?.dispose();
	devtools = null;
	renderer?.dispose();
	renderer?.domElement?.remove();

	environmentTexture = null;
	loadingManager = null;
	sph = null;
	gui = null;
	controls = null;
	mesh = null;
	renderer = null;
	scene = null;
	camera = null;
	container = null;

}
