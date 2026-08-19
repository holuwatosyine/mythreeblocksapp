import * as THREE from 'three/webgpu';
import { registerDevtools } from 'three-blocks/devtools';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createExampleCaption } from '../helpers/ExampleCaption.js';
import { createExampleGui } from '../helpers/exampleGui.js';
import { withAssetLoader } from '../helpers/LoadingManager.js';
import { portraitWidthScale } from '../helpers/mobile.js';
import { shaderCache } from 'three-blocks/shaders';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import {
	attribute,
	clamp,
	color,
	float,
	Fn,
	hash,
	instancedArray,
	luminance,
	materialReference,
	mix,
	mrt,
	mx_noise_float,
	normalView,
	output,
	pass,
	positionGeometry,
	positionWorld,
	smoothstep,
	uniform,
	uint,
	uv,
	vec3,
	vec4,
} from 'three/tsl';
import { WaterVolume } from 'three-blocks/water';
import { ComputeSphereRasterizer } from 'three-blocks/water';
import { createOceanPointerInteraction } from './ocean-interaction.js';

// Keep the software renderer's particle budget and solver tuning while giving
// the dedicated card the full Hokusai scenography of the Utsubo installation
// shown at World Expo 2025, Osaka. Presentation values are ported from the
// reference build (github.com/utsuboco/fluid, `electron` branch) running with
// `hd&fullscreen`: static level camera, gradient bowl backdrop, gliding birds,
// and three floating boats with morph-leaning fishermen.
const PARTICLE_CAPACITY = 524288;
const GRID_SIZE = new THREE.Vector3( 128, 64, 64 );
const FIXED_TIME_STEP = 1 / 120;
// With two solver substeps, this keeps every kernel step at or below 1 / 120.
const MAX_SIMULATION_FRAME_DELTA = 1 / 60;
const DEFAULT_SIMULATION_TIME_SCALE = 1.45;
const PARTICLE_RADIUS = 0.115;
const INITIAL_WATER_DEPTH = 3.12;
const DOMAIN_SIZE = new THREE.Vector3( 35, 12, 28 );
// Fill height is normalized to the domain, so derive it from a world-space
// depth to raise the ceiling without also deepening the seeded ocean.
const FILL_HEIGHT = INITIAL_WATER_DEPTH / DOMAIN_SIZE.y;
const SURFACE_DIAGNOSTIC_LEVEL = 2.3;
const INTERACTION_RADIUS_WORLD = 2.53;
const INTERACTION_IMPULSE = 204;

// The reference installation simulates a 160×80×130 basin. Everything visual
// is authored in those units and mapped into this domain with one uniform
// scale, anchored so the reference waterline (≈10 cells, from 393k particles
// at rest density 2 over the 160×130 floor) lands on our still-water level.
const EXPO_SCALE = DOMAIN_SIZE.x / 160;
const EXPO_CENTER = new THREE.Vector3( 80, 10, 65 );
const EXPO_CAMERA_POSITION = new THREE.Vector3( 80, 28, 183 );
const EXPO_CAMERA_TARGET = new THREE.Vector3( 80, 28, 20 );
const EXPO_VERTICAL_FOV = 33.7;
// Reference fov 33.7° was tuned against a 16:9 wall; landscape preserves that
// horizontal field while portrait preserves particle scale.
const EXPO_HORIZONTAL_FOV = 2 * Math.atan( Math.tan( THREE.MathUtils.degToRad( EXPO_VERTICAL_FOV ) / 2 ) * ( 16 / 9 ) );
const activeDomainSize = DOMAIN_SIZE.clone();
const domainMatrix = new THREE.Matrix4();
const domainScaleMatrix = new THREE.Matrix4();
const renderDomainSize = uniform( DOMAIN_SIZE.clone() ).setName( 'water_renderDomainSize' );
const EXPO_PALETTE = Object.freeze( {
	waterBlue: 0x0281db,
	waterDarkBlue: 0x22405f,
	waterLift: 0x2fa8ff,
	waterWhite: 0xffffff,
	waterSpecular: 0xfcf7e6,
	backgroundLeft: 0x969696,
	backgroundRight: 0x85d2ff,
	backgroundBottom: 0x003180,
	directional: 0xf5f5ff,
	ambient: 0xccdaff,
	pointLight: 0x008bd1,
	sky: 0xdcecf9,
	ink: 0x092f55,
} );
// Grid layout from the reference `addBoats()` at hd (3 boats, 30-unit spacing).
const EXPO_BOAT_SPOTS = [
	new THREE.Vector2( 65, 50 ),
	new THREE.Vector2( 95, 50 ),
	new THREE.Vector2( 65, 80 ),
];
const EXPO_BOAT_LENGTH = 20;
const EXPO_BIRD_SPOTS = [
	{ position: new THREE.Vector3( 45, 40, 60 ), scale: 0.5, yaw: Math.PI / 4 },
	{ position: new THREE.Vector3( 80, 26.7, 50 ), scale: 0.45, yaw: 0.2 },
	{ position: new THREE.Vector3( 135, 59, 70 ), scale: 0.5, yaw: - 0.5 },
];
const params = new URLSearchParams( window.location.search );
const MAX_RENDER_PIXEL_RATIO = 1;
const MPM_FORMULATION = params.get( 'formulation' ) === 'reference' ? 'reference' : 'fused';
const MPM_SORTING = params.get( 'sorting' ) === '1'
	? {
		blockSize: Math.max( 1, Number( params.get( 'blockSize' ) ) || 4 ),
		interval: Math.max( 1, Number( params.get( 'sortInterval' ) ) || 1 ),
	}
	: null;
const MPM_PACKED_GRID = params.get( 'packedGrid' ) === '1';
const MPM_P2G_MODE = [ 'atomic', 'subgroup', 'auto' ].includes( params.get( 'p2gMode' ) )
	? params.get( 'p2gMode' )
	: 'atomic';

const numberParam = ( name, fallback ) => {

	const value = Number( params.get( name ) );
	return params.has( name ) && Number.isFinite( value ) ? value : fallback;

};
const SEED_WAVES = params.get( 'seedwaves' ) !== '0';
const OCEAN_FORCE = params.get( 'oceanforce' ) !== '0';
const SEED_PROFILE = params.get( 'seedprofile' ) !== '0';
const DENSITY_PREDICTION = params.get( 'predict' ) !== '0';
const WAVE_ENERGY_DEFAULT = 2.25;
const WAVE_ENERGY_MAX = 3;
const TUNING = {
	stiffness: numberParam( 'stiffness', 6000 ),
	restDensity: params.has( 'restdensity' ) ? numberParam( 'restdensity', 2 ) : undefined,
	viscosity: numberParam( 'viscosity', 1 ),
	substeps: Math.max( 1, Math.round( numberParam( 'substeps', 2 ) ) ),
	velocityDamping: numberParam( 'damping', 0.9995 ),
	floorFriction: numberParam( 'friction', 0.96 ),
	gravityY: numberParam( 'gravity', - 74 ),
	maxVelocity: numberParam( 'maxvel', 48 ),
};
const MPM_DIAGNOSTICS = params.get( 'diag' ) === '1' ? { overflowAudit: true } : null;
const WAVE_NUDGE_RATE = numberParam( 'nudge', 3.25 );
const WAVE_COMPONENTS = [
	{ wavelength: 17, direction: [ 1, 0.22 ], amplitude: numberParam( 'amp', 0.55 ), phase: 0 },
	{ wavelength: 11.5, direction: [ - 0.2, 1 ], amplitude: numberParam( 'amp2', 0.3 ), phase: 1.8 },
];
const REDUCED_MOTION = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

let container;
let renderer;
let devtools;
let scene;
let camera;
let cameraTarget;
let cameraRig;
let gui;
let particleSurfaceBuffer;
let particleColorBuffer;
let water;
let solver;
let rasterizer;
let foamMesh;
let renderPipeline;
let scenePass;
let gtaoPass;
let gtaoStrengthNode;
let stageGroup;
let bowlMesh;
let boats = [];
let birds = [];
let scenographyDisposables = [];
let overlayElements = [];
let resizeObserver;
let pointerHandlers;
let elapsed = 0;
let previousFrame = performance.now();
let fixedFrameTimeStep = null;
let simulatedFrames = 0;
let disposed = false;

const waterComputeShaderResources = {
	get water() { return water; },
	get solver() { return solver; },
	get rasterizer() { return rasterizer; },
	get rasterizerInternals() { return rasterizerShaderResources(); },
	get particleSurfaceBuffer() { return particleSurfaceBuffer; },
	get particleColorBuffer() { return particleColorBuffer; },
	get renderDomainSize() { return renderDomainSize; },
	get foamMesh() { return foamMesh; },
	get scenePass() { return scenePass; },
	get gtaoPass() { return gtaoPass; },
	get renderPipeline() { return renderPipeline; },
};

function prefixSumShaderResources( prefixSum ) {

	if ( ! prefixSum ) return null;
	return {
		dataBuffer: prefixSum.dataBuffer,
		countUniform: prefixSum.countUniform,
		localStorage: prefixSum.localStorage,
		blockSumsBuffer: prefixSum.blockSumsBuffer,
		blockPrefixSum: prefixSumShaderResources( prefixSum.blockPrefixSum ),
		localScanFn: prefixSum.localScanFn,
		addBlockSumsFn: prefixSum.addBlockSumsFn,
		computeBatch: prefixSum.computeBatch,
	};

}

function rasterizerShaderResources() {

	if ( ! rasterizer ) return null;
	return {
		particles: rasterizer.particles,
		colors: rasterizer.colors,
		uniforms: rasterizer.uniforms,
		tileCounts: rasterizer._tileCounts,
		tileOffsets: rasterizer._tileOffsets,
		tileCursors: rasterizer._tileCursors,
		tileEntries: rasterizer._tileEntries,
		counters: rasterizer._counters,
		largeIds: rasterizer._largeIds,
		projected: rasterizer._projected,
		idBuffer: rasterizer._idBuffer,
		depthBuffer: rasterizer._depthBuffer,
		largeDispatch: rasterizer._largeDispatch,
		prefixSum: prefixSumShaderResources( rasterizer._prefixSum ),
		clear: rasterizer._clear,
		project: rasterizer._project,
		prepareLargeDispatch: rasterizer._prepareLargeDispatch,
		largeCount: rasterizer._largeCount,
		copyCounts: rasterizer._copyCounts,
		copyCursors: rasterizer._copyCursors,
		scatter: rasterizer._scatter,
		largeScatter: rasterizer._largeScatter,
		raster: rasterizer._raster,
	};

}

const defaultUi = {
	particleCount: PARTICLE_CAPACITY,
	simulate: ! REDUCED_MOTION,
	motionSpeed: Math.min( 2, Math.max( 0.5, numberParam( 'timescale', DEFAULT_SIMULATION_TIME_SCALE ) ) ),
	waveEnergy: Math.min( WAVE_ENERGY_MAX, Math.max( 0, numberParam( 'waves', WAVE_ENERGY_DEFAULT ) ) ),
	whitewater: params.get( 'foam' ) !== '0',
	foamDisplayDensity: Math.min( 1, Math.max( 0, numberParam( 'foamdensity', 0.65 ) ) ),
	gtao: params.get( 'ao' ) !== '0',
	gtaoStrength: 0.7,
	gtaoRadius: 0.26,
};

const ui = { ...defaultUi };
let exampleAssets;
let diagnosticsOptions = {};
let controlsExpanded = true;

function configureInitialState( initialState ) {

	Object.assign( ui, defaultUi );
	for ( const [ key, value ] of Object.entries( initialState ) ) {

		if ( value !== undefined && Object.hasOwn( ui, key ) ) ui[ key ] = value;

	}
	ui.particleCount = Math.min( PARTICLE_CAPACITY, Math.max( 1, Math.round( Number( ui.particleCount ) ) ) );
	ui.motionSpeed = Math.min( 2, Math.max( 0.5, Number( ui.motionSpeed ) ) );
	ui.waveEnergy = Math.min( WAVE_ENERGY_MAX, Math.max( 0, Number( ui.waveEnergy ) ) );
	ui.foamDisplayDensity = Math.min( 1, Math.max( 0, Number( ui.foamDisplayDensity ) ) );
	ui.gtaoStrength = Math.min( 0.8, Math.max( 0, Number( ui.gtaoStrength ) ) );
	ui.simulate = ui.simulate === true;
	ui.whitewater = ui.whitewater !== false;
	ui.gtao = ui.gtao !== false;

}

// Map a reference-basin position (160×80×130 units) into this scene, keeping
// the waterline and basin center aligned.
function mapExpoPosition( x, y, z, target = new THREE.Vector3() ) {

	const still = water ? water.getStillWaterLevel() : FILL_HEIGHT * DOMAIN_SIZE.y * 0.88;
	return target.set(
		( x - EXPO_CENTER.x ) * EXPO_SCALE,
		( y - EXPO_CENTER.y ) * EXPO_SCALE + still,
		( z - EXPO_CENTER.z ) * EXPO_SCALE
	);

}

function applyViewportLayout( aspect ) {

	activeDomainSize.copy( DOMAIN_SIZE );
	activeDomainSize.x *= portraitWidthScale( aspect );
	renderDomainSize.value.copy( activeDomainSize );
	domainMatrix
		.makeTranslation( 0, ( 0.5 - 3 / GRID_SIZE.y ) * DOMAIN_SIZE.y, 0 )
		.multiply( domainScaleMatrix.makeScale( activeDomainSize.x, DOMAIN_SIZE.y, DOMAIN_SIZE.z ) );
	water?.setDomainTransform( domainMatrix );

}

export async function mount( containerElement, {
	assets = {},
	initialState = {},
	diagnostics = {},
	controlsExpanded: expandControls = true,
	fixedFrameTimeStep: requestedFrameTimeStep = null,
} = {} ) {

	container = containerElement;
	disposed = false;
	previousFrame = performance.now();
	fixedFrameTimeStep = Number.isFinite( requestedFrameTimeStep ) && requestedFrameTimeStep > 0
		? Math.min( 0.05, requestedFrameTimeStep )
		: null;
	const waterAssets = assets.waterCompute ?? assets;
	exampleAssets = {
		bird: waterAssets.bird,
		boat: waterAssets.boat,
		mask: waterAssets.mask,
		sign: waterAssets.sign,
	};
	const missingAssets = Object.entries( exampleAssets )
		.filter( ( [ , value ] ) => typeof value !== 'string' || value.length === 0 )
		.map( ( [ name ] ) => name );
	if ( missingAssets.length > 0 ) {

		throw new Error( `Water compute requires asset URLs for: ${missingAssets.join( ', ' )}` );

	}
	diagnosticsOptions = { ...diagnostics };
	controlsExpanded = expandControls !== false;
	configureInitialState( initialState );

	if ( WebGPU.isAvailable() === false ) {

		container.appendChild( WebGPU.getErrorMessage() );
		throw new Error( 'No WebGPU support' );

	}

	await init();
	return createComputeWaterHandle();

}

async function init() {

	container.style.position = 'relative';
	container.style.overflow = 'hidden';
	container.style.touchAction = 'none';

	scene = new THREE.Scene();
	scene.background = new THREE.Color( EXPO_PALETTE.sky );

	camera = new THREE.PerspectiveCamera( EXPO_VERTICAL_FOV, 1, 0.1, 220 );
	cameraTarget = new THREE.Vector3();
	// Keep an OrbitControls-shaped target wrapper around the installation's
	// static, reference-framed camera.
	cameraRig = { target: cameraTarget, update() {}, autoRotate: false };
	scene.add( camera );

	renderer = new THREE.WebGPURenderer( {
		antialias: true,
		trackTimestamp: diagnosticsOptions.timestamps === true,
	} );
	devtools = registerDevtools( { renderer, container } );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio, MAX_RENDER_PIXEL_RATIO ) );
	// The reference build renders unmapped colors and grades at the end of its
	// post stack; tone mapping would pull the vivid aizuri blues toward gray.
	renderer.toneMapping = THREE.NoToneMapping;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	container.appendChild( renderer.domElement );
	await renderer.init();
	shaderCache.container( 'water/solver-and-rasterizer', waterComputeShaderResources );

	applyViewportLayout( container.clientWidth / Math.max( 1, container.clientHeight ) );
	createSimulation();
	applyExpoCamera();
	createLighting();
	createRasterizer();
	createWhitewater();
	createRenderPipeline();
	pointerHandlers = createOceanPointerInteraction( {
		renderer,
		camera,
		domainSize: activeDomainSize,
		floorLevel: water.floorLevel,
		fillHeight: FILL_HEIGHT,
		surfaceY: water.getStillWaterLevel(),
		interactionPosition: water.uniforms.pointerPosition,
		interactionStrength: water.uniforms.pointerStrength,
	} );
	createGUI();

	resizeObserver = new ResizeObserver( resize );
	resizeObserver.observe( container );
	resize();

	if ( ui.simulate ) stepSimulation( FIXED_TIME_STEP, 0 );
	window.addEventListener( 'pagehide', dispose, { once: true } );
	const scenographyReady = withAssetLoader(
		container,
		[ 'Bird model', 'Boat model' ],
		manager => createExpoScenography( exampleAssets, manager )
	).catch( error => {

		console.warn( 'Hokusai scenography unavailable:', error );

	} );
	// Do not let network/cache timing decide which scene graph reaches the first
	// render.
	await scenographyReady;

	if ( ! disposed ) renderer.setAnimationLoop( animate );

}

// Keep the reference camera level in landscape; portrait looks down toward the
// waterline so the interactive surface fills more of the screen.
function applyExpoCamera() {

	mapExpoPosition( EXPO_CAMERA_POSITION.x, EXPO_CAMERA_POSITION.y, EXPO_CAMERA_POSITION.z, camera.position );
	mapExpoPosition(
		EXPO_CAMERA_TARGET.x,
		camera.aspect < 1 ? EXPO_CENTER.y : EXPO_CAMERA_TARGET.y,
		EXPO_CAMERA_TARGET.z,
		cameraTarget
	);
	camera.lookAt( cameraTarget );

}

function createLighting() {

	// Reference LightingSetup values, positions mapped from basin units.
	const sun = new THREE.DirectionalLight( EXPO_PALETTE.directional, 3.2 );
	mapExpoPosition( 54, 37, 113, sun.position );
	mapExpoPosition( 60, 25, 0, sun.target.position );
	sun.castShadow = true;
	sun.shadow.mapSize.set( 2048, 2048 );
	sun.shadow.camera.near = 0.1;
	sun.shadow.camera.far = 80;
	sun.shadow.camera.left = - 26;
	sun.shadow.camera.right = 26;
	sun.shadow.camera.top = 18;
	sun.shadow.camera.bottom = - 10;
	sun.shadow.radius = 5;
	sun.shadow.bias = - 0.002;
	// The reference softens every receiver through custom shadow mixes
	// (0.5–0.8 floors); one global intensity approximates that wash.
	sun.shadow.intensity = 0.55;
	scene.add( sun );
	scene.add( sun.target );

	// The reference runs 1.9 but recovers contrast through particle
	// self-shadowing the compute rasterizer cannot do; a lower fill plus GTAO
	// lands on the same read.
	scene.add( new THREE.AmbientLight( EXPO_PALETTE.ambient, 1.35 ) );

	// Cool bounce from the back-left of the installation.
	const bounce = new THREE.PointLight( EXPO_PALETTE.pointLight, 6, 106 * EXPO_SCALE, 0.7 );
	mapExpoPosition( - 39, 54, - 50, bounce.position );
	scene.add( bounce );

}

function createSimulation() {

	particleSurfaceBuffer = instancedArray( PARTICLE_CAPACITY, 'vec4' ).setName( 'ocean_sphereSurfaces' );
	particleColorBuffer = instancedArray( PARTICLE_CAPACITY, 'vec3' ).setName( 'ocean_particleColors' );

	water = new WaterVolume( {
		capacity: PARTICLE_CAPACITY,
		gridSize: GRID_SIZE,
		domainSize: DOMAIN_SIZE,
		fillHeight: FILL_HEIGHT,
		preset: 'ocean-swell',
		gravity: Math.abs( TUNING.gravityY ) * ( DOMAIN_SIZE.y / GRID_SIZE.y ),
		waves: {
			energy: ui.waveEnergy,
			components: WAVE_COMPONENTS,
			nudgeRate: OCEAN_FORCE ? WAVE_NUDGE_RATE : 0,
		},
		material: {
			stiffness: TUNING.stiffness,
			viscosity: TUNING.viscosity,
			restDensity: TUNING.restDensity,
		},
		boundary: {
			floorFriction: TUNING.floorFriction,
			velocityDamping: TUNING.velocityDamping,
		},
		seed: {
			profile: SEED_PROFILE,
			waves: SEED_WAVES,
		},
		pointer: { radius: INTERACTION_RADIUS_WORLD, impulse: INTERACTION_IMPULSE },
		surfaceField: { texture: true, foamGain: 0, foamSpeedThreshold: 14, foamDecay: 1 },
		foam: {
			capacity: 131072,
			kineticEnergyWindow: [ 30, 120 ],
			shearWindow: [ 8, 22 ],
			crestWindow: [ 3.2, 9 ],
			spawnRate: 4,
			trappedAirStrength: 0.9,
			crestStrength: 1.2,
			lifetime: [ 0.7, 2 ],
			foamDepositRate: 0.3,
		},
		solver: {
			formulation: MPM_FORMULATION,
			densityPrediction: DENSITY_PREDICTION,
			substeps: TUNING.substeps,
			maxVelocity: TUNING.maxVelocity,
			sorting: MPM_SORTING,
			packedGridMirror: MPM_PACKED_GRID,
			p2gMode: MPM_P2G_MODE,
			diagnostics: MPM_DIAGNOSTICS,
		},
		onParticleUpdate: ( { index, position, velocity } ) => {

			writeSurface( index, position, velocity );

		},
	} );
	shaderCache.container( 'water/surface-field', { texture: water.surface?.texture } );
	water.setDomainTransform( domainMatrix );
	solver = water.solver;
	water.particleCount = ui.particleCount;
	water.seed( renderer );

}

// Render-facing sphere/color buffers for the software rasterizer, written
// directly by the solver's per-particle hook. Colors follow the reference
// particle material: a vivid aizuri-blue body over dark depths, noise-lifted
// pockets standing in for the print's tonal grain, and hard white churn.
function writeSurface( index, position, velocity ) {

	const worldPosition = position
		.sub( vec3( 0.5, 3 / GRID_SIZE.y, 0.5 ) )
		.mul( renderDomainSize );
	particleSurfaceBuffer.element( index ).assign( vec4( worldPosition, PARTICLE_RADIUS ) );

	const surfaceHeight = clamp( position.y.sub( 3 / GRID_SIZE.y ).div( FILL_HEIGHT ), 0, 1 );
	const speed = clamp( velocity.length().div( 36 ), 0, 1 );
	// Keep mid-depths in the dark ink so troughs and gaps read deep; only the
	// crest band carries the fully saturated aizuri blue.
	const body = mix(
		color( EXPO_PALETTE.waterDarkBlue ),
		color( EXPO_PALETTE.waterBlue ),
		surfaceHeight.pow( 1.7 )
	);
	// The reference extrapolates its noise mix beyond the base blue, producing
	// brighter pockets rather than darker ones; a clamped lift toward a lighter
	// aizuri tone reads the same without leaving the gamut.
	const grain = clamp(
		mx_noise_float( worldPosition.mul( 0.32 ) ).mul( hash( index ) ).mul( 1.6 ),
		0,
		1
	);
	const lifted = mix( body, color( EXPO_PALETTE.waterLift ), grain.mul( surfaceHeight ).mul( 0.16 ) );
	const aeration = clamp( speed.pow( 2 ).mul( 0.55 ).add( surfaceHeight.pow( 12 ).mul( 0.05 ) ), 0, 0.9 );
	particleColorBuffer.element( index ).assign( mix( lifted, color( EXPO_PALETTE.waterWhite ), aeration ) );

}

function createRasterizer() {

	rasterizer = new ComputeSphereRasterizer( particleSurfaceBuffer, {
		colors: particleColorBuffer,
		count: PARTICLE_CAPACITY,
		entryMultiplier: 5,
		depthSlices: 32,
		lodPixelRadius: 0.72,
	} );
	rasterizer.particleCount = ui.particleCount;
	rasterizer.material.roughness = 0.34;
	rasterizer.material.metalness = 0.08;
	// Warm ivory speculars against cool water, straight from the reference
	// ocean-specular pass.
	rasterizer.material.specularColor = new THREE.Color( EXPO_PALETTE.waterSpecular );
	// Keep the deferred resolve independent of Three's lazily generated PMREM target.
	// The constant sky radiance matches the installation backdrop while remaining a
	// stable, texture-free input for shader compilation and production hydration.
	rasterizer.material.envNode = color( EXPO_PALETTE.backgroundRight ).mul( 0.55 );
	rasterizer.material.contactShadowExempt = 0;
	// The resolve reconstructs per-pixel world positions, so the boats drop
	// believable shadows onto the open water.
	rasterizer.receiveShadow = true;
	scene.add( rasterizer );

}

function createWhitewater() {

	foamMesh = water.createFoamMesh( {
		baseSize: 0.095,
		minPixelSize: 2,
		maxPixelSize: 28,
		displayFraction: ui.foamDisplayDensity,
		surfaceField: water.surface.texture,
	} );
	foamMesh.material.contactShadowExempt = 1;
	foamMesh.visible = ui.whitewater;
	scene.add( foamMesh );

}

function setFoamDisplayDensity( value ) {

	ui.foamDisplayDensity = Math.min( 1, Math.max( 0, Number( value ) || 0 ) );
	if ( foamMesh?.userData.whitewaterDisplayFraction ) {

		foamMesh.userData.whitewaterDisplayFraction.value = ui.foamDisplayDensity;

	}

}

// Final grade from the reference output pass (`cdlSettings`): gentle contrast
// around a low pivot plus a saturation push.
const expoGrade = /*@__PURE__*/ Fn( ( [ input ] ) => {

	const contrasted = input.sub( 0.09 ).mul( 1.11 ).add( 0.09 ).max( 0 );
	return mix( vec3( luminance( contrasted ) ), contrasted, 1.16 );

} );

function composedOutputNode() {

	const sceneColorNode = scenePass.getTextureNode( 'output' );
	const sceneWhitewaterNode = scenePass.getTextureNode( 'whitewater' );
	const aoValue = mix( float( 1 ), gtaoPass.getTextureNode().r, gtaoStrengthNode );
	const shadedScene = sceneColorNode.rgb.mul( aoValue );
	const restoredWhitewater = sceneWhitewaterNode.rgb.mul( aoValue.oneMinus() );
	return vec4(
		expoGrade( shadedScene.add( restoredWhitewater ) ),
		sceneColorNode.a
	);

}

function createRenderPipeline() {

	scenePass = pass( scene, camera );
	shaderCache.container( 'water/scene-pass', scenePass );
	const contactShadowExempt = materialReference( 'contactShadowExempt', 'float' );
	const sceneMRT = mrt( {
		output,
		normal: normalView,
		whitewater: output.mul( contactShadowExempt ),
	} );
	sceneMRT.setBlendMode( 'whitewater', new THREE.BlendMode( THREE.MaterialBlending ) );
	scenePass.setMRT( sceneMRT );
	const sceneNormalNode = scenePass.getTextureNode( 'normal' );
	const sceneDepthNode = scenePass.getTextureNode( 'depth' );
	gtaoPass = ao( sceneDepthNode, sceneNormalNode, camera );
	gtaoPass.resolutionScale = 0.5;
	gtaoPass.radius.value = ui.gtaoRadius;
	gtaoPass.thickness.value = 0.45;
	gtaoPass.distanceExponent.value = 1.25;
	gtaoPass.distanceFallOff.value = 0.82;
	gtaoPass.samples.value = 12;
	gtaoStrengthNode = uniform( ui.gtaoStrength ).setName( 'ocean_gtaoStrength' );

	renderPipeline = new THREE.RenderPipeline( renderer );
	renderPipeline.outputNode = composedOutputNode();
	updateRenderPipeline();

}

function updateRenderPipeline() {

	if ( ! renderPipeline ) return;
	if ( ui.gtao ) {

		renderPipeline.outputNode = composedOutputNode();

	} else {

		const sceneColorNode = scenePass.getTextureNode( 'output' );
		renderPipeline.outputNode = vec4( expoGrade( sceneColorNode.rgb ), sceneColorNode.a );

	}
	renderPipeline.needsUpdate = true;

}

function setParticleCount( count ) {

	ui.particleCount = Math.min( PARTICLE_CAPACITY, Math.max( 1, Math.round( count ) ) );
	rasterizer.particleCount = ui.particleCount;
	water.particleCount = ui.particleCount;

}

// ─── Hokusai scenography ────────────────────────────────────────────────────

function trackDisposable( resource ) {

	if ( resource ) scenographyDisposables.push( resource );
	return resource;

}

async function createExpoScenography( assets, loadingManager ) {

	const still = water.getStillWaterLevel();

	// Everything below is authored in reference-basin units; this group maps
	// them into the local domain in one place.
	stageGroup = new THREE.Group();
	stageGroup.name = 'HokusaiStage';
	stageGroup.scale.setScalar( EXPO_SCALE );
	stageGroup.position.set(
		- EXPO_CENTER.x * EXPO_SCALE,
		still - EXPO_CENTER.y * EXPO_SCALE,
		- EXPO_CENTER.z * EXPO_SCALE
	);
	scene.add( stageGroup );

	createBowl();
	createOverlays( assets );

	const loader = new GLTFLoader();
	loader.setMeshoptDecoder( MeshoptDecoder );
	const [ birdScene, boatScene ] = await Promise.all( [
		loadingManager.load( 'Bird model', onProgress => loader.loadAsync( assets.bird, onProgress ) ),
		loadingManager.load( 'Boat model', onProgress => loader.loadAsync( assets.boat, onProgress ) ),
	] );
	if ( disposed ) return;

	createBirds( birdScene );
	createBoats( boatScene );

}

// The installation's enclosure: a rounded, back-face box whose gradient walls
// read as sky above deep water, replacing skybox and fog alike.
function createBowl() {

	const still = water.getStillWaterLevel();
	// Wider than the installation's 1.75× so the side walls and their rounded
	// corners stay outside a 16:9 frustum.
	const geometry = trackDisposable( new RoundedBoxGeometry(
		160 * 2.1 * EXPO_SCALE,
		80 * 1.3 * EXPO_SCALE,
		( 130 * 2.2 - 2 ) * EXPO_SCALE,
		16,
		18 * EXPO_SCALE
	) );
	const material = trackDisposable( new THREE.MeshPhysicalNodeMaterial( {
		side: THREE.BackSide,
		roughness: 1,
		metalness: 0,
	} ) );
	material.contactShadowExempt = 0;
	const gradientXMin = ( - 115 - EXPO_CENTER.x ) * EXPO_SCALE;
	const gradientXMax = ( 4 - EXPO_CENTER.x ) * EXPO_SCALE;
	const gradientYMin = ( - 2 - EXPO_CENTER.y ) * EXPO_SCALE + still;
	const gradientYMax = ( 33 - EXPO_CENTER.y ) * EXPO_SCALE + still;
	material.colorNode = Fn( () => {

		const horizontal = smoothstep( gradientXMin, gradientXMax, positionWorld.x ).mix(
			color( EXPO_PALETTE.backgroundLeft ),
			color( EXPO_PALETTE.backgroundRight )
		);
		return smoothstep( gradientYMin, gradientYMax, positionWorld.y ).mix(
			color( EXPO_PALETTE.backgroundBottom ),
			horizontal
		);

	} )();
	// The installation wall behaves like a lightbox: partly self-lit, so the
	// sky stays pale washi rather than dimming with the scene fill.
	material.emissiveNode = material.colorNode.mul( 0.4 );

	bowlMesh = new THREE.Mesh( geometry, material );
	bowlMesh.name = 'HokusaiBowl';
	const height = 80 * 1.3 * EXPO_SCALE;
	// Flush with the basin floor, slightly sunk to stay clear of the water plane.
	bowlMesh.position.set( 0, height / 2 - 0.15, 0 );
	// The walls read as open sky — a bird shadow floating on them breaks the
	// illusion instantly.
	bowlMesh.receiveShadow = false;
	scene.add( bowlMesh );

}

// The lean and flap rigs blend GLTF morph deltas through plain uniforms. The
// deltas become ordinary vertex attributes and hydrate like any other input.
function bakeMorphBlend( geometry, prefix, maxTargets ) {

	const targets = geometry.morphAttributes?.position ?? [];
	const count = Math.min( maxTargets, targets.length );
	for ( let index = 0; index < count; index ++ ) {

		geometry.setAttribute( `${prefix}${index}`, targets[ index ] );

	}
	geometry.morphAttributes = {};
	return count;

}

function morphBlendPositionNode( prefix, weights ) {

	return Fn( () => {

		const blended = positionGeometry.toVar();
		weights.forEach( ( weight, index ) => {

			blended.addAssign( attribute( `${prefix}${index}`, 'vec3' ).mul( weight ) );

		} );
		return blended;

	} )();

}

function createBirds( birdScene ) {

	let template = null;
	birdScene.scene.traverse( child => {

		if ( child.isMesh && ! template ) template = child;

	} );
	if ( ! template ) return;
	trackDisposable( template.geometry );
	trackDisposable( template.material.map );
	const flapTargets = bakeMorphBlend( template.geometry, 'birdFlap', 1 );

	EXPO_BIRD_SPOTS.forEach( ( spot, index ) => {

		// One material per bird: each carries its own flap-phase uniform.
		const flap = uniform( 0 ).setName( `bird${index}Flap` );
		const material = trackDisposable( new THREE.MeshPhysicalNodeMaterial( {
			map: template.material.map,
			roughness: 0.5,
			metalness: 0.2,
		} ) );
		material.contactShadowExempt = 0;
		if ( flapTargets > 0 ) material.positionNode = morphBlendPositionNode( 'birdFlap', [ flap ] );

		const bird = template.clone();
		bird.material = material;
		bird.castShadow = true;
		bird.receiveShadow = true;
		bird.frustumCulled = false;
		// The mesh's own transform carries the meshopt dequantization; place the
		// bird through a wrapper group so that transform survives.
		const perch = new THREE.Group();
		perch.add( bird );
		perch.position.copy( spot.position );
		perch.rotation.y = spot.yaw;
		perch.scale.setScalar( spot.scale );
		stageGroup.add( perch );
		birds.push( { mesh: bird, perch, flap, baseY: spot.position.y, phase: index } );

	} );

}

// Critically-damped follow (Unity-style SmoothDamp): masks the one-frame
// probe readback latency without overshoot.
function smoothDamp( current, target, state, smoothTime, dt ) {

	const time = Math.max( 1e-4, smoothTime );
	const omega = 2 / time;
	const x = omega * dt;
	const decay = 1 / ( 1 + x + 0.48 * x * x + 0.235 * x * x * x );
	const change = current - target;
	const temp = ( state.velocity + omega * change ) * dt;
	state.velocity = ( state.velocity - omega * temp ) * decay;
	return target + ( change + temp ) * decay;

}

// Five-point hull buoyancy over the water block's batched SurfaceField probes:
// heave from the center sample, pitch/roll from bow/stern and port/starboard
// height differences — the same contract as the water-pro floating bodies.
class HullFloat {

	constructor( object, { halfX, halfZ, spanScale = 1, buoyancyOffset = 0 } ) {

		this.object = object;
		this.buoyancyOffset = buoyancyOffset;
		// Sample points live in object-local units; tilt spans compare against
		// world-space surface heights, so they carry the object's scale.
		this.samplePoints = [
			new THREE.Vector3( 0, 0, 0 ),
			new THREE.Vector3( 0, 0, halfZ ),
			new THREE.Vector3( 0, 0, - halfZ ),
			new THREE.Vector3( halfX, 0, 0 ),
			new THREE.Vector3( - halfX, 0, 0 ),
		];
		this.spanX = halfX * 2 * spanScale;
		this.spanZ = halfZ * 2 * spanScale;
		this.slots = this.samplePoints.map( () => - 1 );
		this.heights = new Float32Array( 5 );
		this.sample = new Float32Array( 4 );
		this.heaveState = { velocity: 0 };
		this.pitchState = { velocity: 0 };
		this.rollState = { velocity: 0 };
		this.euler = new THREE.Euler( 0, 0, 0, 'YXZ' );
		this.pitch = 0;
		this.roll = 0;

	}

	surfaceHeightAt( slotIndex, normX, normZ ) {

		const surface = water.surface;
		let slot = this.slots[ slotIndex ];
		if ( slot === - 1 ) {

			slot = surface.requestProbe( normX, normZ, { persistent: true, unique: true } );
			this.slots[ slotIndex ] = slot;

		}
		const sample = surface.getProbeSample( slot, this.sample );
		surface.setProbePosition( slot, Math.min( 1, Math.max( 0, normX ) ), Math.min( 1, Math.max( 0, normZ ) ) );
		const sampledHeight = sample[ 0 ] ?? 0;
		if ( sampledHeight > 0 ) {

			return _probePoint.set( normX, sampledHeight, normZ ).applyMatrix4( water.volumeToWorldMatrix ).y;

		}
		const stillLevel = water.getStillWaterLevel();
		if ( ! water.waves ) return stillLevel;
		return stillLevel + water.waves.getSurfaceHeightAt(
			( normX - 0.5 ) * water.domainSize.x,
			( normZ - 0.5 ) * water.domainSize.z,
			water.time
		);

	}

	update( dt ) {

		const object = this.object;
		object.updateMatrixWorld();
		for ( let index = 0; index < this.samplePoints.length; index ++ ) {

			_probePoint.copy( this.samplePoints[ index ] );
			object.localToWorld( _probePoint );
			_probeLocal.copy( _probePoint ).applyMatrix4( water.worldToVolumeMatrix );
			this.heights[ index ] = this.surfaceHeightAt( index, _probeLocal.x, _probeLocal.z );

		}

		const targetHeight = this.heights[ 0 ] + this.buoyancyOffset;
		object.position.y = smoothDamp( object.position.y, targetHeight, this.heaveState, 0.22, dt );

		const maxTilt = 0.34;
		const targetPitch = Math.max( - maxTilt, Math.min( maxTilt,
			- Math.atan2( this.heights[ 1 ] - this.heights[ 2 ], this.spanZ ) ) );
		const targetRoll = Math.max( - maxTilt, Math.min( maxTilt,
			Math.atan2( this.heights[ 3 ] - this.heights[ 4 ], this.spanX ) ) );
		this.euler.setFromQuaternion( object.quaternion, 'YXZ' );
		this.euler.x = smoothDamp( this.euler.x, targetPitch, this.pitchState, 0.3, dt );
		this.euler.z = smoothDamp( this.euler.z, targetRoll, this.rollState, 0.3, dt );
		this.pitch = this.euler.x;
		this.roll = this.euler.z;
		object.quaternion.setFromEuler( this.euler );

	}

	dispose() {

		for ( const slot of this.slots ) {

			if ( slot !== - 1 ) water.surface?.releaseProbe( slot );

		}
		this.slots.fill( - 1 );

	}

}

const _probePoint = new THREE.Vector3();
const _probeLocal = new THREE.Vector3();
const _boatBox = new THREE.Box3();
const _boatSize = new THREE.Vector3();

function createBoats( boatScene ) {

	const hullTemplate = boatScene.scene.getObjectByName( 'boat' );
	const sailorTemplate = boatScene.scene.getObjectByName( 'fisherman' );
	if ( ! hullTemplate || ! sailorTemplate ) return;
	trackDisposable( hullTemplate.geometry );
	trackDisposable( sailorTemplate.geometry );

	const hullMaterial = trackDisposable( new THREE.MeshPhysicalNodeMaterial( {
		map: hullTemplate.material.map,
		normalMap: hullTemplate.material.normalMap,
		roughness: 0.8,
		metalness: 0,
	} ) );
	hullMaterial.contactShadowExempt = 0;
	trackDisposable( hullTemplate.material.map );
	trackDisposable( hullTemplate.material.normalMap );

	trackDisposable( sailorTemplate.material.map );
	const leanTargets = bakeMorphBlend( sailorTemplate.geometry, 'sailorLean', 3 );

	// Size the print boat to the reference's 20-unit rigid body. The meshopt
	// quantization folds a dequantize transform into the nodes, so measure the
	// assembled object rather than trusting raw geometry bounds.
	boatScene.scene.updateMatrixWorld( true );
	_boatBox.setFromObject( hullTemplate );
	_boatBox.getSize( _boatSize );
	const hullCenter = _boatBox.getCenter( new THREE.Vector3() );
	const fit = ( EXPO_BOAT_LENGTH * EXPO_SCALE ) / Math.max( _boatSize.x, 1e-3 );
	const still = water.getStillWaterLevel();

	EXPO_BOAT_SPOTS.forEach( ( spot, index ) => {

		const group = new THREE.Group();
		group.name = `HokusaiBoat${index}`;

		const hull = hullTemplate.clone();
		hull.material = hullMaterial;
		hull.castShadow = true;
		hull.receiveShadow = true;
		hull.frustumCulled = false;

		// One material per boat so each crew leans with its own deck.
		const lean = [
			uniform( 0.5 ).setName( `boat${index}LeanPitch` ),
			uniform( 0.5 ).setName( `boat${index}LeanRoll` ),
			uniform( 0 ).setName( `boat${index}LeanHeave` ),
		];
		const sailorMaterial = trackDisposable( new THREE.MeshPhysicalNodeMaterial( {
			vertexColors: true,
			map: sailorTemplate.material.map,
			roughness: 0.5,
			metalness: 0.2,
		} ) );
		sailorMaterial.contactShadowExempt = 0;
		// Reference fake occlusion: hull-shadowed feet, sunlit shoulders.
		sailorMaterial.outputNode = output.mul( mix( 0.2, 0.8, uv().y ) );
		if ( leanTargets > 0 ) {

			sailorMaterial.positionNode = morphBlendPositionNode( 'sailorLean', lean.slice( 0, leanTargets ) );

		}

		const sailor = sailorTemplate.clone();
		sailor.material = sailorMaterial;
		sailor.castShadow = true;
		sailor.receiveShadow = true;
		sailor.frustumCulled = false;

		// Recenter so the group origin sits at the hull's waterline center:
		// buoyancy probes and tilt then pivot where the boat actually floats.
		// Draft comes from the boat's length — the bbox height is dominated by
		// masts and would sink the deck.
		const rig = new THREE.Group();
		rig.add( hull, sailor );
		rig.position.set(
			- hullCenter.x,
			- ( _boatBox.min.y + _boatSize.x * 0.075 ),
			- hullCenter.z
		);

		group.add( rig );
		group.scale.setScalar( fit );
		group.position.set(
			( spot.x - EXPO_CENTER.x ) * EXPO_SCALE,
			still,
			( spot.y - EXPO_CENTER.z ) * EXPO_SCALE
		);
		const baseYaw = ( index / EXPO_BOAT_SPOTS.length ) * Math.PI * 2 / 3 - 0.35;
		group.rotation.y = baseYaw;
		scene.add( group );

		boats.push( {
			group,
			lean,
			float: new HullFloat( group, {
				halfX: _boatSize.x * 0.375,
				halfZ: _boatSize.z * 0.375,
				spanScale: fit,
				buoyancyOffset: 0.06,
			} ),
			anchor: group.position.clone(),
			baseYaw,
			phase: index * 2.1,
		} );

	} );

}

// Cartouche and signature from the print, plus the installation credit.
function createOverlays( assets ) {

	const makeOverlay = ( styles ) => {

		const element = document.createElement( 'img' );
		Object.assign( element.style, {
			position: 'absolute',
			zIndex: '4',
			pointerEvents: 'none',
			height: 'auto',
		}, styles );
		container.appendChild( element );
		overlayElements.push( element );
		return element;

	};
	makeOverlay( { top: '4.5%', left: 'calc(1% + 64px)', width: '70px' } ).src = assets.sign;
	makeOverlay( { top: '14%', left: '1%', width: '64px' } ).src = assets.mask;

	const credit = createExampleCaption( {
		accent: '#64a4ff',
		ariaLabel: 'Wave of Connection installation credit',
		label: 'Project credits',
		content: `
			<span class="tb-example-caption__eyebrow">Osaka World Expo 2025</span>
			<strong class="tb-example-caption__title">Interactive installation “Wave of Connection” by Utsubo</strong>
			<span class="tb-example-caption__note">Presented at the Osaka World Expo 2025 as a celebration of creativity, connection, and cultural innovation.</span>
			<nav class="tb-example-caption__links" aria-label="Official project links">
				<a href="https://www.youtube.com/watch?v=kvlrPu4QMA0" target="_blank" rel="noopener noreferrer">Watch the official film ↗</a>
				<a href="https://www.utsubo.com/?utm_source=threejs-blocks.com&utm_medium=referral&utm_campaign=three-blocks" target="_blank" rel="noopener noreferrer">Visit Utsubo ↗</a>
			</nav>
		`,
	} );
	container.appendChild( credit );
	overlayElements.push( credit );

}

function updateScenography( dt ) {

	for ( const boat of boats ) {

		// Gentle anchor sway keeps the fleet alive between swells.
		boat.group.position.x = boat.anchor.x + Math.sin( elapsed * 0.14 + boat.phase ) * 0.32;
		boat.group.position.z = boat.anchor.z + Math.cos( elapsed * 0.11 + boat.phase ) * 0.26;
		boat.group.rotation.y = boat.baseYaw + Math.sin( elapsed * 0.09 + boat.phase ) * 0.05;
		boat.float.update( dt );

		// The oarsmen lean with the deck, like the reference's morph rig.
		boat.lean[ 0 ].value = THREE.MathUtils.clamp( 0.5 - boat.float.pitch * 2.4, 0, 1 );
		boat.lean[ 1 ].value = THREE.MathUtils.clamp( 0.5 + boat.float.roll * 2.4, 0, 1 );
		boat.lean[ 2 ].value = THREE.MathUtils.clamp( Math.abs( boat.float.heaveState.velocity ) * 0.35, 0, 1 );

	}

	for ( const bird of birds ) {

		const flap = Math.cos( elapsed * 6 + bird.phase ) * 0.5 + 0.5;
		bird.flap.value = THREE.MathUtils.smoothstep( flap, 0.1, 0.9 );
		bird.perch.position.y = bird.baseY + Math.cos( elapsed * 0.5 + bird.phase ) * 10;

	}

}

function createGUI() {

	gui = createExampleGui( 'Ocean / Hokusai expo' );
	if ( container.clientWidth < 680 || ! controlsExpanded ) gui.close();
	gui.add( ui, 'simulate' ).name( 'Run simulation' );
	gui.add( ui, 'motionSpeed', 0.5, 2, 0.05 ).name( 'Wave pace' );
	gui.add( ui, 'waveEnergy', 0, WAVE_ENERGY_MAX, 0.01 ).name( 'Wave energy' ).onChange( value => {

		water.waveEnergy = value;

	} );
	gui.add( ui, 'whitewater' ).name( 'Whitewater' ).onChange( enabled => {

		foamMesh.visible = enabled;

	} );
	gui.add( ui, 'foamDisplayDensity', 0, 1, 0.01 )
		.name( 'Foam display density' )
		.info( 'Stable display thinning only; the physical whitewater simulation and deposits remain intact.' )
		.onChange( setFoamDisplayDensity );
	gui.add( { reset: resetOcean }, 'reset' ).name( 'Reset ocean' );
	const finish = gui.addFolder( 'Finish' );
	finish.add( ui, 'gtao' ).name( 'Contact shading' ).onChange( updateRenderPipeline );
	finish.add( ui, 'gtaoStrength', 0, 0.8, 0.01 ).name( 'Strength' ).onChange( value => {

		gtaoStrengthNode.value = value;

	} );

}

function resize() {

	if ( ! renderer || ! camera ) return;
	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	camera.aspect = width / height;
	applyViewportLayout( camera.aspect );
	applyExpoCamera();
	// Portrait keeps desktop particle scale and narrows the water instead of
	// backing the camera away from a 16:9 basin.
	camera.fov = camera.aspect < 1
		? EXPO_VERTICAL_FOV
		: THREE.MathUtils.radToDeg( 2 * Math.atan( Math.tan( EXPO_HORIZONTAL_FOV / 2 ) / camera.aspect ) );
	camera.updateProjectionMatrix();
	renderer.setSize( width, height );

}

function stepSimulation( delta = FIXED_TIME_STEP, time = elapsed ) {

	water.waveEnergy = ui.waveEnergy;
	water.uniforms.pointerStrength.value = pointerHandlers?.consumeMove?.()
		? 1
		: water.uniforms.pointerStrength.value * 0.78;
	water.time = time;
	water.step( renderer, Math.min( MAX_SIMULATION_FRAME_DELTA, Math.max( 1 / 360, delta ) ) );
	simulatedFrames ++;

}

function resetOcean() {

	simulatedFrames = 0;
	elapsed = 0;
	water.uniforms.pointerStrength.value = 0;
	water.seed( renderer );

}

async function renderFrameAsync() {

	rasterizer.update( renderer, camera );
	await renderPipeline.renderAsync();

}

function animate( now ) {

	const delta = fixedFrameTimeStep
		?? Math.min( 0.05, Math.max( 0, now - previousFrame ) * 0.001 );
	previousFrame = now;
	camera.lookAt( cameraTarget );
	if ( ui.simulate ) {

		const simulationDelta = Math.min(
			MAX_SIMULATION_FRAME_DELTA,
			Math.max( 1 / 360, delta * ui.motionSpeed )
		);
		elapsed += simulationDelta;
		stepSimulation( simulationDelta, elapsed );

	}
	updateScenography( delta );
	rasterizer.update( renderer, camera );
	renderPipeline.render();

}

async function waitForSubmittedWork() {

	const queue = renderer?.backend?.device?.queue;
	if ( typeof queue?.onSubmittedWorkDone === 'function' ) await queue.onSubmittedWorkDone();

}

async function stepComputeWater( steps = 1, startTime = elapsed ) {

	const count = Math.max( 0, Math.round( Number( steps ) || 0 ) );
	for ( let step = 0; step < count; step ++ ) {

		stepSimulation( FIXED_TIME_STEP, startTime + step * FIXED_TIME_STEP );

	}
	await waitForSubmittedWork();
	return getDiagnostics();

}

async function renderComputeWater() {

	camera.lookAt( cameraTarget );
	await renderFrameAsync();
	await waitForSubmittedWork();
	return getDiagnostics();

}

function pauseComputeWater() {

	ui.simulate = false;
	renderer?.setAnimationLoop( null );

}

function resumeComputeWater() {

	ui.simulate = true;
	previousFrame = performance.now();
	renderer?.setAnimationLoop( animate );

}

function getDiagnostics() {

	return {
		particleCount: ui.particleCount,
		simulatedFrames,
		simulating: ui.simulate,
		domain: activeDomainSize.toArray(),
		grid: GRID_SIZE.toArray(),
		rasterizer: rasterizer?.stats ?? null,
		solver: solver?.getLastStepStats?.() ?? null,
		timestampQueries: renderer?.backend?.trackTimestamp === true,
		scenography: {
			boats: boats.length,
			birds: birds.length,
		assets: { ...exampleAssets },
		},
	};

}

function createComputeWaterHandle() {

	return {
		renderer,
		solver,
		water,
		rasterizer,
		pause: pauseComputeWater,
		resume: resumeComputeWater,
		reset: resetOcean,
		step: stepComputeWater,
		render: renderComputeWater,
		getDiagnostics,
		dispose,
		simulation: {
			water,
			solver,
			settings: ui,
			particleSurfaceBuffer,
			particleCapacity: PARTICLE_CAPACITY,
			surfaceLevel: SURFACE_DIAGNOSTIC_LEVEL,
			floorLevel: water.floorLevel,
			fillHeight: FILL_HEIGHT,
			tuning: {
				...TUNING,
				restDensity: water.restDensity,
				seedWaves: SEED_WAVES,
				oceanForce: OCEAN_FORCE,
				seedProfile: SEED_PROFILE,
				densityPrediction: DENSITY_PREDICTION,
				formulation: MPM_FORMULATION,
				block: 'WaterVolume',
			},
			domainSize: activeDomainSize,
			gridSize: GRID_SIZE,
			fixedTimeStep: FIXED_TIME_STEP,
			interactionStrength: water.uniforms.pointerStrength,
			waveEnergy: water.waves.uniforms.energy,
			waveEnergyMax: WAVE_ENERGY_MAX,
			interactionRadius: INTERACTION_RADIUS_WORLD,
			interactionImpulse: INTERACTION_IMPULSE,
			getSimulatedFrames: () => simulatedFrames,
			setParticleCount,
			stepFrame: stepSimulation,
		},
		presentation: {
			camera,
			controls: cameraRig,
			rasterizer,
			foamMesh,
			gtaoStrength: gtaoStrengthNode,
			setFoamDisplayDensity,
			updateRenderPipeline,
			renderFrame: renderFrameAsync,
			animate,
		},
	};

}

async function dispose() {

	if ( disposed ) return;
	disposed = true;
	renderer?.setAnimationLoop( null );
	window.removeEventListener( 'pagehide', dispose );
	resizeObserver?.disconnect();
	gui?.destroy?.();
	if ( pointerHandlers ) {

		renderer.domElement.removeEventListener( 'pointermove', pointerHandlers.onPointerMove );
		renderer.domElement.removeEventListener( 'pointercancel', pointerHandlers.onPointerLeave );
		renderer.domElement.removeEventListener( 'pointerleave', pointerHandlers.onPointerLeave );

	}
	const queue = renderer?.backend?.device?.queue;
	if ( queue && typeof queue.onSubmittedWorkDone === 'function' ) {

		try {

			await queue.onSubmittedWorkDone();

		} catch {

			// Device loss already releases the resources disposed below.

		}

	}
	for ( const boat of boats ) boat.float.dispose();
	boats = [];
	birds = [];
	for ( const element of overlayElements ) element.remove();
	overlayElements = [];
	for ( const resource of scenographyDisposables ) resource?.dispose?.();
	scenographyDisposables = [];
	rasterizer?.dispose();
	water?.dispose();
	particleSurfaceBuffer?.value?.dispose?.();
	particleColorBuffer?.value?.dispose?.();
	gtaoPass?.dispose();
	scenePass?.dispose?.();
	renderPipeline?.dispose();
	devtools?.dispose();
	devtools = null;
	renderer?.dispose();

}

export async function unmount() {

	await dispose();

}
