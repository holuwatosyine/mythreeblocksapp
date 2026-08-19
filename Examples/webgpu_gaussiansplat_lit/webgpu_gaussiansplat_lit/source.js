import * as THREE from 'three/webgpu';
import { BasicPointShadowFilter, float } from 'three/tsl';
import { registerDevtools } from 'three-blocks/devtools';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

import { SplatMesh } from 'three-blocks/gaussian-splats';
import { shaderCache } from 'three-blocks/shaders';
import { createExampleGui } from '../helpers/exampleGui.js';
import { LoadingManager } from '../helpers/LoadingManager.js';
import { frameCameraForAspect } from '../helpers/mobile.js';

let container;
let renderer;
let devtools;
let shaderRegistration;
let scene;
let camera;
let controls;
let gui;
let loadingManager;
let resizeObserver;
let splats = null;
let environmentTexture = null;
let prefersReducedMotion = false;
let assets;
let splatQuality = 'balanced';
let showEngineeringViews = false;
let animationPaused = false;
const _pointColor1 = new THREE.Color();
const _pointColor2 = new THREE.Color();
const _directionalColor = new THREE.Color();
const _directionalDirection = new THREE.Vector3();
const _white = new THREE.Color( 0xffffff );
// ponytail: shadow maps cannot identify their caster; use a separate receiver map if
// splats must receive other objects' shadows without receiving their own.
const ignoreReceivedShadow = () => float( 1 );

// Lights
let directionalLight = null;
let directionalLightTarget = null;
let directionalLightHelper = null;
let pointLight1 = null;
let pointLight2 = null;
const pointLightHelpers = [];

// PBR Meshes
let torusMesh = null;
let torusKnotMesh = null;

// Ground
let groundMesh = null;

const relightingShaderResources = {
	get splats() { return splats; },
	get environment() { return environmentTexture; },
	get directionalLight() { return directionalLight; },
	get pointLights() { return [ pointLight1, pointLight2 ]; },
	get meshes() { return [ torusMesh, torusKnotMesh, groundMesh ]; },
};

const params = {
	// Lights
	dirLightPosX: - 3.5,
	dirLightPosY: 5.5,
	dirLightPosZ: 4.5,
	dirLightIntensity: 2.2,
	dirLightColor: 0xfff1db,
	directionalLightScale: 0.55,
	directionalShadowStrength: 0.72,
	showDirectionalLightHelper: true,
	showPointLightHelpers: true,
	gaussianCastShadow: true,
	shadowAlphaCutoff: 0.08,
	shadowSigmaCoverage: 2.0,
	shadowStride: 1,
	pointLight1PosX: - 2.4,
	pointLight1PosY: 2.5,
	pointLight1PosZ: 2.4,
	pointLight1Intensity: 250,
	pointLight1Color: 0xff9b61,
	pointLight2PosX: 2.8,
	pointLight2PosY: 2.5,
	pointLight2PosZ: - 1.8,
	pointLight2Intensity: 250,
	pointLight2Color: 0x6f9dff,
	// Splat Material
	lightingMode: 'lit',
	compositeLightingMode: 'scene',
	environmentIntensity: 0.35,
	environmentRotation: - 0.4,
	roughness: 0.82,
	metalness: 0.0,
	relightStrength: 0.78,
	relightContrast: 0.75,
	diffuseWrap: 0.18,
	ambientIntensity: 0.22,
	pointLightScale: 0.012,
	pointLightRange: 3.2,
	pointColorSaturation: 0.7,
	relightSpecular: 0.08,
	shStrength: 1.0,
	shSpecularIntensity: 1.0,
	exposure: 1.35,
	alphaBoost: 1.35,
	globalOpacity: 1.0,
	alphaClip: 0.01,
	fragmentAlphaClip: 1 / 255,
	minPixelRadius: 2.0,
	sigmaCoverage: 2.0,
	// Debug
	deferredView: 'lit',
	normalMode: 'hybrid',
	normalBlend: 0.35,
	normalRadius: 3,
	normalMaxDistance: 0.45,
	normalFilterBlend: 0.85,
	normalConfidenceFloor: 0.12,
	twoSidedLighting: true,
	animateLights: true,
	pointLightOrbitSpeed: 0.8,
	rendererStatus: 'initializing',
	sortAlgorithm: 'radix', // 'radix' (O(n)) or 'bitonic' (O(n log²n))
	// Performance
	maxStdDev: Math.sqrt( 5 ),
	radiusClip: 2.0,
	adaptiveSigma: true,
	adaptiveSigmaThreshold: 8.0,
};

function resolveAssets( assetOptions = {} ) {

	const filesRoot = assetOptions.files ? String( assetOptions.files ).replace( /\/$/u, '' ) : null;
	const resolved = {
		environment: assetOptions.environment ?? ( filesRoot ? `${filesRoot}/ninomaru_teien_2k.ktx2` : null ),
		splat: assetOptions.splat ?? ( filesRoot ? `${filesRoot}/splat/cactus.sog` : null ),
	};
	const missing = Object.entries( resolved ).filter( ( [ , value ] ) => ! value ).map( ( [ key ] ) => key );
	if ( missing.length > 0 ) throw new Error( `Gaussian relighting requires assets: ${missing.join( ', ' )}.` );
	resolved.transcoderPath = assetOptions.transcoderPath ?? assetOptions.basis ?? null;
	return resolved;

}

export async function mount( containerElement, options = {} ) {

	container = containerElement;
	assets = resolveAssets( options.assets );
	splatQuality = options.quality ?? 'balanced';
	const debugParameter = new URLSearchParams( window.location.search ).get( 'debug' );
	showEngineeringViews = options.showEngineeringViews ?? debugParameter !== null;
	if ( WebGPU.isAvailable() === false ) {

		container.appendChild( WebGPU.getErrorMessage() );
		throw new Error( 'No WebGPU support' );

	}

	await init();
	if ( options.lightingMode !== undefined ) applyLightingMode( options.lightingMode );
	if ( options.engineeringView !== undefined ) setEngineeringView( options.engineeringView );
	if ( options.animateLights !== undefined ) params.animateLights = Boolean( options.animateLights );
	return createController();

}

async function init() {

	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	animationPaused = false;
	prefersReducedMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	params.animateLights = ! prefersReducedMotion;
	const aspect = width / height;
	camera = new THREE.PerspectiveCamera( 60, aspect, 0.1, 1000 );
	camera.position.set( 0, 1.8, 4.4 );

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x080b12 );
	scene.fog = new THREE.FogExp2( 0x080b12, 0.028 );

	renderer = new THREE.WebGPURenderer( { antialias: false, trackTimestamp: true } );
	devtools = registerDevtools( { renderer, container } );
	void devtools?.setStatsPanelMode( 'expanded' );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, 1.5 ) );
	renderer.setSize( width, height );
	renderer.toneMapping = THREE.AgXToneMapping;
	renderer.toneMappingExposure = 0.9;
	container.appendChild( renderer.domElement );
	await renderer.init();
	shaderRegistration = shaderCache.container( 'gaussian-relighting/scene', relightingShaderResources );

	// Loading manager
	loadingManager = new LoadingManager();
	loadingManager.setItems( [
		{ name: 'Environment', weight: 1 },
		{ name: 'Gaussian Splat', weight: 1 },
	] );
	loadingManager.init( container );

	// Enable shadows
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

	controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true;
	controls.target.set( 0, 0.85, 0 );
	controls.update();
	await loadingManager.load( 'Environment', loadEnvironment );

	// Create lights
	createLights();

	// Create PBR meshes
	createPBRMeshes();

	// Create ground plane
	createGround();

	// Load Gaussian Splats
	await loadingManager.load( 'Gaussian Splat', loadSplats );

	await setupGui();

	loadingManager.complete();

	resizeObserver = new ResizeObserver( onResize );
	resizeObserver.observe( container );
	onResize();
	renderer.setAnimationLoop( render );

}

async function loadEnvironment() {

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

		environmentTexture = await loader.loadAsync( assets.environment );

	} finally {

		loader.dispose?.();

	}
	environmentTexture.mapping = THREE.EquirectangularReflectionMapping;
	scene.environment = environmentTexture;
	scene.environmentIntensity = params.environmentIntensity;
	scene.environmentRotation.y = params.environmentRotation;

}

function applyLightingMode( mode ) {

	params.lightingMode = mode === 'unlit' ? 'unlit' : 'lit';
	params.deferredView = 'lit';
	if ( splats?.material ) splats.material.lightingMode = params.lightingMode;
	gui?.controllersRecursive?.().forEach( controller => controller.updateDisplay() );

}

function setEngineeringView( view ) {

	params.deferredView = [ 'lit', 'normal', 'albedo', 'shadow' ].includes( view ) ? view : 'lit';
	gui?.controllersRecursive?.().forEach( controller => controller.updateDisplay() );

}

function configure( options = {} ) {

	if ( options.lightingMode !== undefined ) applyLightingMode( options.lightingMode );
	if ( options.engineeringView !== undefined ) setEngineeringView( options.engineeringView );
	if ( options.animateLights !== undefined ) params.animateLights = Boolean( options.animateLights );
	for ( const name of [ 'roughness', 'metalness', 'environmentIntensity', 'relightStrength', 'relightContrast' ] ) {

		if ( Number.isFinite( Number( options[ name ] ) ) ) params[ name ] = Number( options[ name ] );

	}
	if ( options.castShadow !== undefined ) {

		params.gaussianCastShadow = Boolean( options.castShadow );
		applyGaussianShadowSettings();

	}
	gui?.controllersRecursive?.().forEach( controller => controller.updateDisplay() );

}

function pause() {

	animationPaused = true;
	renderer?.setAnimationLoop( null );

}

function resume() {

	if ( ! renderer ) return;
	animationPaused = false;
	renderer.setAnimationLoop( render );

}

function getDiagnostics() {

	return {
		ready: splats !== null,
		paused: animationPaused,
		lightingMode: params.lightingMode,
		engineeringView: params.deferredView,
		animateLights: params.animateLights,
		renderer: params.rendererStatus,
		stats: splats?.stats ?? null,
	};

}

function createController() {

	return {
		pause,
		resume,
		configure,
		setLightingMode: applyLightingMode,
		setEngineeringView,
		getDiagnostics,
		dispose: unmount,
	};

}

function applyGaussianShadowSettings() {

	if ( ! directionalLight ) return;
	for ( const light of [ directionalLight, pointLight1, pointLight2 ] ) {

		if ( ! light ) continue;
		light.shadow.needsUpdate = true;
		splats?.setShadowLightOptions( light, {
			enabled: params.gaussianCastShadow,
			mode: 'clip',
			alphaCutoff: params.shadowAlphaCutoff,
			sigmaCoverage: params.shadowSigmaCoverage,
			stride: params.shadowStride,
		} );

	}

}

function updateLightHelpers() {

	if ( directionalLightHelper ) {

		directionalLightHelper.visible = params.showDirectionalLightHelper;
		directionalLightHelper.update();

	}
	for ( const helper of pointLightHelpers ) {

		helper.visible = params.showPointLightHelpers;
		helper.update();

	}

}

function createLights() {

	directionalLight = new THREE.DirectionalLight( params.dirLightColor, params.dirLightIntensity );
	directionalLight.position.set( params.dirLightPosX, params.dirLightPosY, params.dirLightPosZ );
	directionalLightTarget = new THREE.Object3D();
	directionalLightTarget.position.set( 0, 0.9, 0 );
	directionalLight.target = directionalLightTarget;
	directionalLight.castShadow = true;
	directionalLight.shadow.mapSize.set( 2048, 2048 );
	directionalLight.shadow.camera.near = 0.5;
	directionalLight.shadow.camera.far = 20;
	directionalLight.shadow.camera.left = - 3;
	directionalLight.shadow.camera.right = 3;
	directionalLight.shadow.camera.top = 3;
	directionalLight.shadow.camera.bottom = - 3;
	directionalLight.shadow.bias = - 0.0002;
	directionalLight.shadow.normalBias = 0.025;
	directionalLight.shadow.radius = 3;
	scene.add( directionalLightTarget );
	scene.add( directionalLight );

	pointLight1 = new THREE.PointLight( params.pointLight1Color, params.pointLight1Intensity, 8, 2 );
	pointLight1.position.set( params.pointLight1PosX, params.pointLight1PosY, params.pointLight1PosZ );
	pointLight1.castShadow = true;
	pointLight1.shadow.filterNode = BasicPointShadowFilter;
	scene.add( pointLight1 );

	pointLight2 = new THREE.PointLight( params.pointLight2Color, params.pointLight2Intensity, 7, 2 );
	pointLight2.position.set( params.pointLight2PosX, params.pointLight2PosY, params.pointLight2PosZ );
	pointLight2.castShadow = true;
	pointLight2.shadow.filterNode = BasicPointShadowFilter;
	scene.add( pointLight2 );

	directionalLightHelper = new THREE.DirectionalLightHelper( directionalLight, 0.5 );
	pointLightHelpers.push(
		new THREE.PointLightHelper( pointLight1, 0.25 ),
		new THREE.PointLightHelper( pointLight2, 0.25 )
	);
	scene.add( directionalLightHelper, ...pointLightHelpers );
	updateLightHelpers();

}

function createPBRMeshes() {

	// Torus on the left
	const torusGeometry = new THREE.TorusGeometry( 0.5, 0.2, 32, 64 );
	const torusMaterial = new THREE.MeshStandardNodeMaterial( {
		color: 0xd7c2a0,
		roughness: 0.32,
		metalness: 0.72,
	} );
	torusMesh = new THREE.Mesh( torusGeometry, torusMaterial );
	torusMesh.position.set( - 2, 0.95, 0 );
	torusMesh.castShadow = true;
	torusMesh.receiveShadow = true;
	scene.add( torusMesh );

	// TorusKnot on the right
	const torusKnotGeometry = new THREE.TorusKnotGeometry( 0.5, 0.15, 128, 32 );
	const torusKnotMaterial = new THREE.MeshStandardNodeMaterial( {
		color: 0xa9b9ce,
		roughness: 0.2,
		metalness: 0.88,
	} );
	torusKnotMesh = new THREE.Mesh( torusKnotGeometry, torusKnotMaterial );
	torusKnotMesh.position.set( 2, 0.95, 0 );
	torusKnotMesh.castShadow = true;
	torusKnotMesh.receiveShadow = true;
	scene.add( torusKnotMesh );

}

function createGround() {

	const groundGeometry = new THREE.PlaneGeometry( 80, 80 );
	const groundMaterial = new THREE.MeshStandardNodeMaterial( {
		color: 0x171a22,
		roughness: 0.92,
		metalness: 0,
	} );
	groundMesh = new THREE.Mesh( groundGeometry, groundMaterial );
	groundMesh.rotation.x = - Math.PI / 2;
	groundMesh.position.y = 0.25;
	groundMesh.receiveShadow = true;
	scene.add( groundMesh );

}

async function loadSplats() {

	splats = await SplatMesh.load( assets.splat, {
		quality: splatQuality,
		sh: 3,
		attributeMode: 'sog',
		compaction: true,
		shColorMode: 'cached',
		rendererMode: 'compute-tiles',
		// compute-tiles composites premultiplied internally; the global alphaMode default is
		// now 'straight' (I2), so the tile path needs this passed explicitly.
		alphaMode: 'premultiplied',
		computeTiles: {
			// Keep the splat visible while a zoom-triggered tile-buffer growth validates.
			allowRasterFallback: true,
		},
		sortAlgorithm: params.sortAlgorithm,
		performance: {
			maxStdDev: params.maxStdDev,
			radiusClip: params.radiusClip,
			adaptiveSigma: params.adaptiveSigma,
			adaptiveSigmaThreshold: params.adaptiveSigmaThreshold,
			fragmentAlphaClip: params.fragmentAlphaClip,
			minPixelRadius: params.minPixelRadius,
			sigmaCoverage: params.sigmaCoverage,
		},
		appearance: {
			mode: params.lightingMode,
			roughness: params.roughness,
			metalness: params.metalness,
			exposure: params.exposure,
			shStrength: params.shStrength,
			alphaBoost: params.alphaBoost,
			opacity: params.globalOpacity,
			alphaClip: params.alphaClip,
		},
	} );

	// Position and scale
	splats.position.set( 0, 0.6, 0 );
	splats.scale.setScalar( 0.8 );

	scene.add( splats );
	applyGaussianShadowSettings();

}

async function setupGui() {

	gui?.destroy();
	gui = await createExampleGui( 'Gaussian Splats · Relit' );
	if ( container.clientWidth < 560 ) gui.close();

	gui.add( params, 'lightingMode', {
		'Relit surface': 'lit',
		'Captured color': 'unlit',
	} ).name( 'Surface' ).onChange( applyLightingMode );
	gui.add( params, 'showDirectionalLightHelper' ).name( 'Directional helper' ).onChange( updateLightHelpers );
	gui.add( params, 'showPointLightHelpers' ).name( 'Point helpers' ).onChange( updateLightHelpers );
	gui.add( params, 'animateLights' ).name( 'Orbit practical lights' );
	gui.add( params, 'pointLightOrbitSpeed', 0.05, 1.2, 0.01 ).name( 'Light speed' );

	const materialFolder = gui.addFolder( 'Material response' );
	materialFolder.add( params, 'roughness', 0, 1, 0.01 ).name( 'Roughness' );
	materialFolder.add( params, 'metalness', 0, 1, 0.01 ).name( 'Metalness' );
	materialFolder.add( params, 'exposure', 0.1, 4, 0.05 ).name( 'Exposure' );
	materialFolder.add( params, 'environmentIntensity', 0, 2, 0.01 ).name( 'Environment' );

	if ( showEngineeringViews ) {

		const debugFolder = gui.addFolder( 'Engineering views' );
		debugFolder.add( params, 'deferredView', {
			Lit: 'lit',
			Normals: 'normal',
			Albedo: 'albedo',
			Shadow: 'shadow',
		} ).name( 'Buffer' );
		debugFolder.add( params, 'normalMode', {
			Hybrid: 'hybrid',
			Geometry: 'geometry',
			Screen: 'screen',
		} ).name( 'Normal source' );

	}

}

function render( now = performance.now() ) {

	controls.update();

	const time = now * 0.001;
	directionalLight.position.set( params.dirLightPosX, params.dirLightPosY, params.dirLightPosZ );
	directionalLight.intensity = params.dirLightIntensity;
	directionalLight.color.set( params.dirLightColor );
	pointLight1.intensity = params.pointLight1Intensity;
	pointLight1.color.set( params.pointLight1Color );
	pointLight2.intensity = params.pointLight2Intensity;
	pointLight2.color.set( params.pointLight2Color );
	if ( ! params.animateLights ) {

		pointLight1.position.set( params.pointLight1PosX, params.pointLight1PosY, params.pointLight1PosZ );
		pointLight2.position.set( params.pointLight2PosX, params.pointLight2PosY, params.pointLight2PosZ );

	}
	// Orbit both practical lights around the splat while preserving the radius and phase implied
	// by their editable positions. Their opposing colors make the changing surface response clear.
	if ( pointLight1 && pointLight2 && params.animateLights ) {

		const centerX = splats?.position.x ?? directionalLightTarget.position.x;
		const centerZ = splats?.position.z ?? directionalLightTarget.position.z;
		const angle = time * params.pointLightOrbitSpeed;
		const radius1 = Math.hypot( params.pointLight1PosX - centerX, params.pointLight1PosZ - centerZ );
		const radius2 = Math.hypot( params.pointLight2PosX - centerX, params.pointLight2PosZ - centerZ );
		const phase1 = Math.atan2( params.pointLight1PosZ - centerZ, params.pointLight1PosX - centerX );
		const phase2 = Math.atan2( params.pointLight2PosZ - centerZ, params.pointLight2PosX - centerX );

		pointLight1.position.set(
			centerX + Math.cos( angle + phase1 ) * radius1,
			params.pointLight1PosY,
			centerZ + Math.sin( angle + phase1 ) * radius1
		);
		pointLight2.position.set(
			centerX + Math.cos( angle + phase2 ) * radius2,
			params.pointLight2PosY,
			centerZ + Math.sin( angle + phase2 ) * radius2
		);

	}
	updateLightHelpers();

	// Animate PBR meshes
	if ( torusMesh && ! prefersReducedMotion ) {

		torusMesh.rotation.x = time * 0.3;
		torusMesh.rotation.y = time * 0.6;

	}

	if ( torusKnotMesh && ! prefersReducedMotion ) {

		torusKnotMesh.rotation.x = time * 0.18;
		torusKnotMesh.rotation.y = time * 0.42;

	}

	if ( splats ) {

		scene.environmentIntensity = params.environmentIntensity;
		scene.environmentRotation.y = params.environmentRotation;

		_pointColor1.copy( pointLight1.color ).lerp( _white, 1 - params.pointColorSaturation );
		_pointColor2.copy( pointLight2.color ).lerp( _white, 1 - params.pointColorSaturation );
		_directionalColor.copy( directionalLight.color );
		_directionalDirection.copy( directionalLight.position ).sub( directionalLightTarget.position ).normalize();
		const compositeMode = params.deferredView === 'lit' ? params.compositeLightingMode : 'custom';
		splats.setComputeTileLighting( {
				mode: compositeMode,
				receivedShadowNode: ignoreReceivedShadow,
				enabled: params.lightingMode === 'lit',
				strength: params.relightStrength,
				contrastLimit: params.relightContrast,
				normalMode: params.normalMode,
				normalBlend: params.normalBlend,
				normalRadius: params.normalRadius,
				normalMaxDistance: params.normalMaxDistance,
				normalFilterBlend: params.normalFilterBlend,
				normalConfidenceFloor: params.normalConfidenceFloor,
				debugMode: params.deferredView,
				cameraPosition: camera.position,
				roughness: params.roughness,
				metalness: params.metalness,
				specularIntensity: params.relightSpecular,
				diffuseWrap: params.diffuseWrap,
				twoSided: params.twoSidedLighting,
				ambientColor: 0xffffff,
				ambientIntensity: params.ambientIntensity,
				directional: {
					light: directionalLight,
					shadowStrength: params.directionalShadowStrength,
					direction: _directionalDirection,
					color: _directionalColor,
					intensity: directionalLight.intensity * params.directionalLightScale,
				},
				points: [
					{ position: pointLight1.position, color: _pointColor1, intensity: pointLight1.intensity * params.pointLightScale, range: params.pointLightRange },
					{ position: pointLight2.position, color: _pointColor2, intensity: pointLight2.intensity * params.pointLightScale, range: params.pointLightRange },
			],
		} );

		if ( splats.material && splats.material.updateUniforms ) {

			splats.material.updateUniforms();

		}

	}

	renderer.render( scene, camera );

	if ( splats ) {

		const splatStats = splats.stats;
		const tileStats = splatStats.computeTiles;
		params.rendererStatus = tileStats
			? `${tileStats.rendererMode}${tileStats.fallbackReason ? `: ${tileStats.fallbackReason}` : ''}`
			: splatStats.rendererMode;



	}

}

function onResize() {

	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	frameCameraForAspect( camera, controls.target );
	renderer.setSize( width, height );

}

export function unmount() {

	animationPaused = true;
	renderer?.setAnimationLoop( null );
	resizeObserver?.disconnect();
	resizeObserver = null;

	if ( directionalLightHelper ) {

		directionalLightHelper.removeFromParent();
		directionalLightHelper.dispose();
		directionalLightHelper = null;

	}
	for ( const helper of pointLightHelpers ) {

		helper.removeFromParent();
		helper.dispose();

	}
	pointLightHelpers.length = 0;

	if ( directionalLight ) {

		splats?.removeShadowLight( directionalLight );
		scene.remove( directionalLight );
		directionalLight.dispose();
		directionalLight = null;

	}

	if ( directionalLightTarget ) {

		scene.remove( directionalLightTarget );
		directionalLightTarget = null;

	}

	if ( pointLight1 ) {

		splats?.removeShadowLight( pointLight1 );
		scene.remove( pointLight1 );
		pointLight1.dispose();
		pointLight1 = null;

	}

	if ( pointLight2 ) {

		splats?.removeShadowLight( pointLight2 );
		scene.remove( pointLight2 );
		pointLight2.dispose();
		pointLight2 = null;

	}

	// Dispose PBR meshes
	if ( torusMesh ) {

		torusMesh.geometry.dispose();
		torusMesh.material.dispose();
		scene.remove( torusMesh );
		torusMesh = null;

	}

	if ( torusKnotMesh ) {

		torusKnotMesh.geometry.dispose();
		torusKnotMesh.material.dispose();
		scene.remove( torusKnotMesh );
		torusKnotMesh = null;

	}

	// Dispose ground
	if ( groundMesh ) {

		groundMesh.geometry.dispose();
		groundMesh.material.dispose();
		scene.remove( groundMesh );
		groundMesh = null;

	}

	// Dispose splats
	if ( splats ) {

		splats.dispose();
		scene.remove( splats );
		splats = null;

	}

	if ( environmentTexture ) {

		scene.environment = null;
		environmentTexture.dispose();
		environmentTexture = null;

	}

	// Dispose GUI
	if ( gui ) {

		gui.destroy();
		gui = null;

	}

	// Dispose controls
	if ( controls ) {

		controls.dispose();
		controls = null;

	}

	// Dispose renderer
	if ( renderer ) {

		shaderRegistration?.dispose();
		shaderRegistration = null;
		devtools?.dispose();
		devtools = null;
		renderer.dispose();
		renderer.domElement.remove();
		renderer = null;

	}

	scene = null;
	camera = null;
	container = null;
	assets = null;

}
