import * as THREE from 'three/webgpu';
import { registerDevtools } from 'three-blocks/devtools';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createExampleGui } from '../helpers/exampleGui.js';
import { isMobileViewport } from '../helpers/mobile.js';
import { shaderCache } from 'three-blocks/shaders';
import {
	clamp,
	color,
	float,
	hash,
	min,
	mix,
	pass,
	positionWorld,
	rtt,
	smoothstep,
	texture,
	uniform,
	uint,
	uv,
	vec2,
	vec3,
	vec4,
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { WaterRayMarchRenderer, WaterVolume } from 'three-blocks/water';

import {
    createWaterComposite,
    WaterCaustics,
    WATER_RAYMARCH_QUALITY_PRESETS,
    getWaterRayMarchQualityPreset,
} from 'three-blocks/water';

import { createOceanPointerInteraction } from './ocean-interaction.js';

const PARTICLE_CAPACITY = 524288;
const GRID_SIZE = new THREE.Vector3( 128, 64, 64 );
const FIXED_TIME_STEP = 1 / 120;
const FILL_HEIGHT = 0.39;
const DOMAIN_SIZE = new THREE.Vector3( 44, 8, 22 );
const INTERACTION_RADIUS_WORLD = 2.53;
const INTERACTION_IMPULSE = 204;
// Late-afternoon sun (~33° elevation): long glitter paths, leaning column
// shadows, and a warm key against the cool water without going full sunset.
const SUN_DIRECTION = new THREE.Vector3( - 10, 7.2, 5 ).normalize();
const SUN_AZIMUTH_XZ = new THREE.Vector2( SUN_DIRECTION.x, SUN_DIRECTION.z ).normalize();
// One golden-hour palette drives the authored equirect sky, the analytic
// water reflection, and the fog so every reflective term tells the same story.
const OCEAN_SKY = {
	zenith: 0x1e5fb2,
	upper: 0x4189d6,
	low: 0xa3cce8,
	horizonCool: 0xe6efef,
	horizonWarm: 0xffd9a0,
	sunGlow: 0xffaf62,
	sunCore: 0xfff1cf,
	seaFar: 0x2e6473,
	seaDeep: 0x0d3037,
	haze: 0xcfdcdd,
};

const params = new URLSearchParams( window.location.search );
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
const WAVE_ENERGY_DEFAULT = 2;
const WAVE_ENERGY_MAX = 3;
const WATER_DEBUG = params.get( 'waterdebug' );
const VOLUME_SCATTER_ENABLED = params.get( 'volscatter' ) !== '0';
const WAVE_REFLECTION_ENABLED = params.get( 'wavereflect' ) !== '0';
const TEMPORAL_OVERRIDE = params.has( 'temporal' ) ? params.get( 'temporal' ) !== '0' : null;
const UNDERWATER_ENABLED = params.get( 'underwater' ) === '1';
// The golden-hour presentation stage is the default; `?stage=debug` restores
// the four-quadrant calibration checker (also one click away in the GUI).
const INITIAL_DEBUG_FLOOR = params.get( 'stage' ) === 'debug';
const DEBUG_FLOOR_BACKGROUND = 0x817782;
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
const RAYMARCH_QUALITY_LABELS = Object.freeze( {
	Performance: 'performance',
	Balanced: 'balanced',
	High: 'high',
	Cinematic: 'cinematic',
	Extreme: 'extreme',
} );
const RAYMARCH_QUALITY_OPTIONS = [ ...Object.keys( RAYMARCH_QUALITY_LABELS ), 'Custom' ];
const requestedQuality = String( params.get( 'quality' ) ?? 'cinematic' ).toLowerCase();
const initialRaymarchQuality = Object.hasOwn( WATER_RAYMARCH_QUALITY_PRESETS, requestedQuality )
	? requestedQuality
	: 'cinematic';
let activeRaymarchQuality = initialRaymarchQuality;
// Example-side preset adjustments. The trims are measured visually
// indistinguishable at the default framing but ~30% cheaper together: the
// resolve bilateral at radius 5 was the single largest render item (11×11
// taps per canvas pixel), the 448-step DDA cap is over-provisioned (the grid
// diagonal needs ≤ 256), the trace reads through the edge-aware resolve
// cleanly at 0.85 scale, and temporal accumulation hides what remains.
// Whitewater goes the other way: full-resolution accumulation keeps spray
// droplets crisp, and the pixel budget bounds its absolute cost. Extreme
// stays untouched as the highest-fidelity preset. URL parameters still override
// every field.
const trimRaymarchSettings = ( name, settings ) => name === 'extreme' ? settings : {
	...settings,
	resolutionScale: Math.min( settings.resolutionScale, 0.85 ),
	whitewaterScale: 1,
	normalFilterRadius: Math.min( settings.normalFilterRadius, 3 ),
	maxSteps: Math.min( settings.maxSteps, 288 ),
	temporal: true,
};
const initialRaymarchSettings = trimRaymarchSettings(
	initialRaymarchQuality,
	getWaterRayMarchQualityPreset( initialRaymarchQuality )
);
// Quarter-res threshold bloom over the HDR composite. Threshold 1 keeps it a
// light-source effect (sun disc, glints, hottest caustics), not a glow filter.
const BLOOM_ENABLED = params.get( 'bloom' ) !== '0';
const BLOOM_STRENGTH = numberParam( 'bloomstrength', 0.55 );
const BLOOM_RADIUS = numberParam( 'bloomradius', 0.25 );
const BLOOM_THRESHOLD = numberParam( 'bloomthreshold', 0.85 );
// Adaptive quality: the drawing buffer is capped at a pixel budget (the
// full-resolution composite + resolve chain dominates cost, so pixels are the
// strongest lever), and a frame-time governor walks preset × budget tiers
// until the machine holds a smooth rate. An explicit quality choice pins the
// selected preset.
const AUTO_QUALITY_ENABLED = params.get( 'autoquality' ) !== '0'
	&& ! params.has( 'quality' );
const MAX_RENDER_PIXEL_RATIO = 1;
const MAX_PIXELS_OVERRIDE = params.has( 'maxpixels' )
	? Math.max( 4e5, numberParam( 'maxpixels', 3.6e6 ) )
	: null;
const AUTO_QUALITY_LADDER = Object.freeze( [
	{ preset: 'Cinematic', pixels: 3.6e6 },
	{ preset: 'Cinematic', pixels: 2.6e6 },
	{ preset: 'High', pixels: 2.6e6 },
	{ preset: 'Balanced', pixels: 2.2e6 },
	{ preset: 'Balanced', pixels: 1.6e6 },
	{ preset: 'Performance', pixels: 1.4e6 },
] );
const AUTO_QUALITY_WINDOW = 32;
const AUTO_QUALITY_WARMUP_FRAMES = 150;
const AUTO_QUALITY_STEP_DOWN_MS = numberParam( 'autobudget', 22 );
const AUTO_QUALITY_STEP_UP_MS = Math.min( 12, AUTO_QUALITY_STEP_DOWN_MS * 0.5 );
const AUTO_QUALITY_CALM_WINDOWS = 5;
const RAYMARCH_SCATTER_SAMPLE_OPTIONS = [ 0, 4, 8, 12 ];
const customRaymarchParams = [
	'rayres',
	'whitewaterscale',
	'raystep',
	'rayiso',
	'rayrefine',
	'raysteps',
	'raydepthrange',
	'raythickness',
	'raynormal',
	'rayfilter',
	'raytrilinear',
	'rayscatter',
	'wavereflect',
	'temporal',
].some( name => params.has( name ) );
const initialRaymarchQualityLabel = customRaymarchParams
	? 'Custom'
	: Object.keys( RAYMARCH_QUALITY_LABELS ).find(
		label => RAYMARCH_QUALITY_LABELS[ label ] === initialRaymarchQuality
	) ?? 'Cinematic';

let container;
let renderer;
let devtools;
let scene;
let camera;
let controls;
let gui;
let water;
let waterCaustics;
let solver;
let raymarchRenderer;
let raymarchComposite;
let raymarchFoamMesh;
let renderPipeline;
let scenePass;
let sceneColorNode;
let sceneDepthNode;
let oceanEnvironment;
let stageFloor;
let stageMaterial;
let debugFloorNode;
let stageCausticsNode;
let resizeObserver;
let pointerHandlers;
let bloomNode;
let compositeColorNode;
let raymarchRebuildTimer;
let autoQualityTier = 0;
let autoQualityFramesSeen = 0;
let autoQualityCalmWindows = 0;
let renderPixelBudget = AUTO_QUALITY_LADDER[ 0 ].pixels;
const autoQualityDeltas = [];
let underwaterProbePending = false;
let cameraUnderwater = false;
let underwaterSurfaceHeight = null;
let raymarchQualityController;
let elapsed = 0;
let previousFrame = performance.now();
let fixedFrameTimeStep = null;
let simulatedFrames = 0;
let disposed = false;

const oceanShaderResources = {
	get water() { return water; },
	get solver() { return solver; },
	get waterCaustics() { return waterCaustics; },
	get raymarchRenderer() { return raymarchRenderer; },
	get raymarchComposite() { return raymarchComposite; },
	get scenePass() { return scenePass; },
	get renderPipeline() { return renderPipeline; },
};

const defaultUi = {
	particleCount: PARTICLE_CAPACITY,
	simulate: ! REDUCED_MOTION,
	waveEnergy: Math.min( WAVE_ENERGY_MAX, Math.max( 0, numberParam( 'waves', WAVE_ENERGY_DEFAULT ) ) ),
	whitewater: params.get( 'foam' ) !== '0',
	foamDisplayDensity: Math.min( 1, Math.max( 0, numberParam( 'foamdensity', 0.8 ) ) ),
	debugFloor: INITIAL_DEBUG_FLOOR,
	raymarchQuality: initialRaymarchQualityLabel,
	raymarchResolution: Math.min( 1, Math.max( 0.25, numberParam( 'rayres', initialRaymarchSettings.resolutionScale ) ) ),
	raymarchWhitewaterScale: Math.min( 1, Math.max( 0.0625, numberParam( 'whitewaterscale', initialRaymarchSettings.whitewaterScale ) ) ),
	raymarchStep: Math.min( 2.5, Math.max( 1, numberParam( 'raystep', initialRaymarchSettings.stepScale ) ) ),
	raymarchIso: Math.min( 1.5, Math.max( 0.5, numberParam( 'rayiso', initialRaymarchSettings.isoScale ) ) ),
	raymarchRefinement: Math.min( 8, Math.max( 1, Math.round( numberParam( 'rayrefine', initialRaymarchSettings.refinementSteps ) ) ) ),
	raymarchMaxSteps: Math.min( 768, Math.max( 32, Math.round( numberParam( 'raysteps', initialRaymarchSettings.maxSteps ) ) ) ),
	raymarchDepthRange: Math.min( 2, Math.max( 0.01, numberParam( 'raydepthrange', initialRaymarchSettings.resolveDepthRange ) ) ),
	raymarchThickness: Math.min( 12, Math.max( 0.25, numberParam( 'raythickness', initialRaymarchSettings.maxThickness ) ) ),
	raymarchNormalSmoothing: Math.min( 5, Math.max( 0, numberParam( 'raynormal', initialRaymarchSettings.normalSmoothing ) ) ),
	raymarchNormalFilter: Math.min( 5, Math.max( 0, Math.round( numberParam( 'rayfilter', initialRaymarchSettings.normalFilterRadius ) ) ) ),
	raymarchTrilinear: params.has( 'raytrilinear' )
		? params.get( 'raytrilinear' ) !== '0'
		: initialRaymarchSettings.trilinearTracing,
	raymarchScatterSamples: VOLUME_SCATTER_ENABLED
		? RAYMARCH_SCATTER_SAMPLE_OPTIONS.reduce( ( closest, candidate ) =>
			Math.abs( candidate - numberParam( 'rayscatter', initialRaymarchSettings.scatterSamples ) ) <
			Math.abs( closest - numberParam( 'rayscatter', initialRaymarchSettings.scatterSamples ) )
				? candidate
				: closest
		)
		: 0,
	raymarchTemporal: TEMPORAL_OVERRIDE ?? initialRaymarchSettings.temporal,
	raymarchWavesReflectionSteps: WAVE_REFLECTION_ENABLED
		? initialRaymarchSettings.wavesReflectionSteps
		: 0,
	autoQuality: AUTO_QUALITY_ENABLED,
	autoRotate: ! REDUCED_MOTION,
};

const ui = { ...defaultUi };
let diagnosticsOptions = {};
let controlsExpanded = true;

function setRaymarchQualityState( quality ) {

	const requested = String( quality );
	const name = RAYMARCH_QUALITY_LABELS[ requested ] ?? requested.toLowerCase();
	if ( ! Object.hasOwn( WATER_RAYMARCH_QUALITY_PRESETS, name ) ) return null;
	const label = Object.keys( RAYMARCH_QUALITY_LABELS ).find(
		candidate => RAYMARCH_QUALITY_LABELS[ candidate ] === name
	);
	if ( label === undefined ) return null;
	const settings = trimRaymarchSettings( name, getWaterRayMarchQualityPreset( name ) );
	activeRaymarchQuality = name;
	Object.assign( ui, {
		raymarchQuality: label,
		raymarchResolution: settings.resolutionScale,
		raymarchWhitewaterScale: settings.whitewaterScale,
		raymarchStep: settings.stepScale,
		raymarchIso: settings.isoScale,
		raymarchRefinement: settings.refinementSteps,
		raymarchMaxSteps: settings.maxSteps,
		raymarchDepthRange: settings.resolveDepthRange,
		raymarchThickness: settings.maxThickness,
		raymarchNormalSmoothing: settings.normalSmoothing,
		raymarchNormalFilter: settings.normalFilterRadius,
		raymarchTrilinear: settings.trilinearTracing,
		raymarchScatterSamples: VOLUME_SCATTER_ENABLED ? settings.scatterSamples : 0,
		raymarchWavesReflectionSteps: WAVE_REFLECTION_ENABLED ? settings.wavesReflectionSteps : 0,
		raymarchTemporal: TEMPORAL_OVERRIDE ?? settings.temporal,
	} );
	return { name, settings };

}

function configureInitialState( quality, initialState ) {

	Object.assign( ui, defaultUi );
	activeRaymarchQuality = initialRaymarchQuality;
	if ( quality !== undefined && setRaymarchQualityState( quality ) ) ui.autoQuality = false;
	for ( const [ key, value ] of Object.entries( initialState ) ) {

		if ( value !== undefined && Object.hasOwn( ui, key ) ) ui[ key ] = value;

	}
	ui.particleCount = Math.min( PARTICLE_CAPACITY, Math.max( 1, Math.round( Number( ui.particleCount ) ) ) );
	ui.waveEnergy = Math.min( WAVE_ENERGY_MAX, Math.max( 0, Number( ui.waveEnergy ) ) );
	ui.foamDisplayDensity = Math.min( 1, Math.max( 0, Number( ui.foamDisplayDensity ) ) );
	ui.simulate = ui.simulate === true;
	ui.whitewater = ui.whitewater !== false;
	ui.debugFloor = ui.debugFloor === true;
	ui.autoQuality = ui.autoQuality === true;
	ui.autoRotate = ui.autoRotate === true && ! REDUCED_MOTION;

}

export async function mount( containerElement, {
	quality,
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
	diagnosticsOptions = { ...diagnostics };
	controlsExpanded = expandControls !== false;
	configureInitialState( quality, initialState );
	if ( WebGPU.isAvailable() === false ) {

		container.appendChild( WebGPU.getErrorMessage() );
		throw new Error( 'No WebGPU support' );

	}
	await init();
	return createOceanHandle();

}

async function init() {

	const mobile = isMobileViewport();
	container.style.position = 'relative';
	container.style.overflow = 'hidden';
	container.style.touchAction = 'none';

	scene = new THREE.Scene();
	scene.fog = new THREE.Fog( OCEAN_SKY.haze, 72, 155 );

	camera = new THREE.PerspectiveCamera( 43, 1, 0.1, 180 );
	// Start on the backlit side: the drift orbit still tours every azimuth,
	// but the first frame faces the sun path, where the water sings.
	camera.position.set( mobile ? 34 : 40, mobile ? 16 : 12, mobile ? - 17 : - 20 );
	scene.add( camera );

	renderer = new THREE.WebGPURenderer( {
		antialias: true,
		trackTimestamp: diagnosticsOptions.timestamps === true,
	} );
	devtools = registerDevtools( { renderer, container } );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio, MAX_RENDER_PIXEL_RATIO ) );
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 0.96;
	container.appendChild( renderer.domElement );
	await renderer.init();
	// The first seed dispatch happens inside createSimulation(). Publish a stable,
	// getter-backed owner before that provider lookup so hydration can resolve the
	// same resources after initialization.
	shaderCache.container( 'ocean/simulation-and-rendering', oceanShaderResources );

	controls = new OrbitControls( camera, renderer.domElement );
	controls.enabled = ! mobile;
	controls.target.set( 0, 2.6, 0 );
	controls.enableDamping = true;
	controls.dampingFactor = 0.055;
	controls.autoRotate = ui.autoRotate;
	controls.autoRotateSpeed = 0.22;
	controls.minDistance = 15;
	controls.maxDistance = 90;
	controls.maxPolarAngle = UNDERWATER_ENABLED ? Math.PI * 0.92 : Math.PI * 0.48;
	controls.update();

	createLighting();
	await createSimulation();
	createWaterCaustics();
	createPresentationStage();
	stageCausticsNode.value = waterCaustics ? 1 : 0;
	createRaymarchedWater();
	createRenderPipeline();
	pointerHandlers = createOceanPointerInteraction( {
		renderer,
		camera,
		domainSize: DOMAIN_SIZE,
		floorLevel: water.floorLevel,
		fillHeight: FILL_HEIGHT,
		interactionPosition: water.uniforms.pointerPosition,
		interactionStrength: water.uniforms.pointerStrength,
	} );
	createGUI();

	resizeObserver = new ResizeObserver( resize );
	resizeObserver.observe( container );
	resize();

	// Initialize the foam buffers before the first visible frame.
	if ( ui.simulate ) stepSimulation( FIXED_TIME_STEP, 0 );
	renderer.setAnimationLoop( animate );
	window.addEventListener( 'pagehide', dispose, { once: true } );

}

function createLighting() {

	const sun = new THREE.DirectionalLight( 0xffd9a8, 3 );
	sun.position.copy( SUN_DIRECTION ).multiplyScalar( 22 );
	scene.add( sun );
	scene.add( new THREE.HemisphereLight( 0xcfe6f5, 0x8a7d6a, 1 ) );
	oceanEnvironment = createOceanEnvironment();
	scene.environment = oceanEnvironment;
	applyStageBackdrop();

}

// Presentation mode lives inside the authored sky; the calibration checker
// keeps its flat neutral backdrop so quadrant readings stay untinted.
function applyStageBackdrop() {

	if ( ui.debugFloor ) {

		scene.background = new THREE.Color( DEBUG_FLOOR_BACKGROUND );
		scene.fog.color.set( DEBUG_FLOOR_BACKGROUND );

	} else {

		scene.background = oceanEnvironment;
		scene.fog.color.set( OCEAN_SKY.haze );

	}

}

// A small authored equirectangular sky gives grazing Fresnel something
// structured to reflect. PMREM generation happens lazily in the composite;
// the analytic two-stop gradient remains the library fallback for callers
// that do not supply an environment.
//
// The sky is synthesized directly into a FLOAT equirect. An 8-bit canvas
// source quantizes the slow vertical ramp into one-code plateaus, and a
// near-flat grazing reflection sweeps across those plateau edges as nested
// contour rings — smoothing the authored content cannot fix a bit-depth
// artifact, only float data can.
function createOceanEnvironment() {

	const width = 1024;
	const height = 512;
	const data = new Float32Array( width * height * 4 );
	const random = seed => {

		const value = Math.sin( seed * 91.731 ) * 43758.5453;
		return value - Math.floor( value );

	};
	// three's equirect convention: u = atan2(z, x)/2π + 0.5 and
	// v = asin(y)/π + 0.5, with data row 0 read at v = 0 — so the nadir lives
	// in row 0 and the zenith in the last row (verified against the rendered
	// background with an up-facing camera probe).
	const rowForY = y => ( Math.asin( Math.min( 1, Math.max( - 1, y ) ) ) / Math.PI + 0.5 ) * ( height - 1 );
	const sunAzimuth = Math.atan2( SUN_DIRECTION.z, SUN_DIRECTION.x );
	const sunColumn = ( sunAzimuth / ( Math.PI * 2 ) + 0.5 ) * width;
	const sunRow = rowForY( SUN_DIRECTION.y );
	// Working-space (linear) key colors in elevation space (direction.y);
	// hex construction converts from sRGB.
	const skyKeys = [
		[ - 1, new THREE.Color( OCEAN_SKY.seaDeep ) ],
		[ - 0.08, new THREE.Color( OCEAN_SKY.seaFar ) ],
		[ 0, new THREE.Color( OCEAN_SKY.horizonCool ) ],
		[ 0.16, new THREE.Color( OCEAN_SKY.low ) ],
		[ 0.52, new THREE.Color( OCEAN_SKY.upper ) ],
		[ 1, new THREE.Color( OCEAN_SKY.zenith ) ],
	];
	const warmColor = new THREE.Color( OCEAN_SKY.horizonWarm );
	const glowColor = new THREE.Color( OCEAN_SKY.sunGlow );
	const rampColor = new THREE.Color();
	const warmTarget = new THREE.Color();
	const pixelColor = new THREE.Color();
	for ( let row = 0; row < height; row ++ ) {

		const y = Math.sin( Math.PI * ( row / ( height - 1 ) - 0.5 ) );
		let segment = 0;
		while ( segment < skyKeys.length - 2 && skyKeys[ segment + 1 ][ 0 ] < y ) segment ++;
		const [ from, fromColor ] = skyKeys[ segment ];
		const [ to, toColor ] = skyKeys[ segment + 1 ];
		const eased = 0.5 - 0.5 * Math.cos( Math.PI * Math.min( 1, Math.max( 0, ( y - from ) / ( to - from ) ) ) );
		rampColor.copy( fromColor ).lerp( toColor, eased );
		// Golden haze hugs the horizon around the sun azimuth and spills a
		// little below it, where the far sea would catch the same light.
		const altitudeEnvelope = y >= 0 ? Math.exp( - y * 7.5 ) : Math.exp( y * 16 );
		for ( let column = 0; column < width; column ++ ) {

			const azimuth = ( column / width - 0.5 ) * Math.PI * 2;
			const warmth = Math.pow( Math.max( 0, Math.cos( azimuth - sunAzimuth ) ), 5 ) * altitudeEnvelope;
			warmTarget.copy( warmColor ).lerp( glowColor, Math.min( 1, warmth * 0.75 ) );
			pixelColor.copy( rampColor ).lerp( warmTarget, Math.min( 1, warmth * 0.85 ) );
			const offset = ( row * width + column ) * 4;
			data[ offset ] = pixelColor.r;
			data[ offset + 1 ] = pixelColor.g;
			data[ offset + 2 ] = pixelColor.b;
			data[ offset + 3 ] = 1;

		}

	}

	// Screen-blend a Gaussian layer over the ramp inside its ±3σ footprint.
	const screenBlend = ( centerX, centerY, radiusX, radiusY, rotation, alpha, tint ) => {

		const cos = Math.cos( rotation );
		const sin = Math.sin( rotation );
		const extentX = Math.ceil( Math.hypot( radiusX * cos, radiusY * sin ) * 3 );
		const extentY = Math.ceil( Math.hypot( radiusX * sin, radiusY * cos ) * 3 );
		const minY = Math.max( 0, Math.floor( centerY - extentY ) );
		const maxY = Math.min( height - 1, Math.ceil( centerY + extentY ) );
		const minX = Math.floor( centerX - extentX );
		const maxX = Math.ceil( centerX + extentX );
		for ( let row = minY; row <= maxY; row ++ ) {

			for ( let column = minX; column <= maxX; column ++ ) {

				// Equirect wrap keeps wisps continuous across the seam.
				const wrapped = ( ( column % width ) + width ) % width;
				const deltaX = column - centerX;
				const deltaY = row - centerY;
				const localX = ( deltaX * cos + deltaY * sin ) / radiusX;
				const localY = ( deltaY * cos - deltaX * sin ) / radiusY;
				const coverage = alpha * Math.exp( - 0.5 * ( localX * localX + localY * localY ) );
				if ( coverage < 1e-4 ) continue;
				const offset = ( row * width + wrapped ) * 4;
				data[ offset ] += ( 1 - data[ offset ] ) * tint.r * coverage;
				data[ offset + 1 ] += ( 1 - data[ offset + 1 ] ) * tint.g * coverage;
				data[ offset + 2 ] += ( 1 - data[ offset + 2 ] ) * tint.b * coverage;

			}

		}

	};

	// Additive Gaussian deposit for the sun: the disc must exceed 1.0 in the
	// float texture so tone mapping and the bloom threshold treat it as a real
	// light source rather than a white decal.
	const addBlend = ( centerX, centerY, radiusX, radiusY, energy, tint ) => {

		const extentX = Math.ceil( radiusX * 3 );
		const extentY = Math.ceil( radiusY * 3 );
		const minY = Math.max( 0, Math.floor( centerY - extentY ) );
		const maxY = Math.min( height - 1, Math.ceil( centerY + extentY ) );
		for ( let row = minY; row <= maxY; row ++ ) {

			for ( let column = Math.floor( centerX - extentX ); column <= Math.ceil( centerX + extentX ); column ++ ) {

				const wrapped = ( ( column % width ) + width ) % width;
				const localX = ( column - centerX ) / radiusX;
				const localY = ( row - centerY ) / radiusY;
				const deposit = energy * Math.exp( - 0.5 * ( localX * localX + localY * localY ) );
				if ( deposit < 1e-4 ) continue;
				const offset = ( row * width + wrapped ) * 4;
				data[ offset ] += tint.r * deposit;
				data[ offset + 1 ] += tint.g * deposit;
				data[ offset + 2 ] += tint.b * deposit;

			}

		}

	};

	const sunCore = new THREE.Color( OCEAN_SKY.sunCore );
	const sunHalo = new THREE.Color( OCEAN_SKY.sunGlow );
	addBlend( sunColumn, sunRow, 6, 6, 3.4, sunCore );
	addBlend( sunColumn, sunRow, 22, 15, 0.5, sunHalo );
	addBlend( sunColumn, sunRow, 72, 26, 0.14, sunHalo );

	// Deterministic cloud wisps: anisotropic Gaussians riding just above the
	// horizon, catching gold near the sun azimuth and staying cool opposite.
	const wispTint = new THREE.Color( 0xe9edec );
	const warmWisp = new THREE.Color( 0xffdcb0 );
	const tintColor = new THREE.Color();
	for ( let cloud = 0; cloud < 24; cloud ++ ) {

		const x = random( cloud * 7 + 1 ) * width;
		const y = rowForY( 0.05 + random( cloud * 7 + 2 ) * 0.4 );
		const wispWidth = 46 + random( cloud * 7 + 3 ) * 118;
		const wispHeight = 3 + random( cloud * 7 + 4 ) * 9;
		const rotation = ( random( cloud * 7 + 5 ) - 0.5 ) * 0.3;
		const alpha = 0.02 + random( cloud * 7 + 6 ) * 0.05;
		const azimuth = ( x / width - 0.5 ) * Math.PI * 2;
		const sunward = Math.pow( Math.max( 0, Math.cos( azimuth - sunAzimuth ) ), 3 );
		tintColor.copy( wispTint ).lerp( warmWisp, sunward * 0.7 );
		for ( let lobe = 0; lobe < 3; lobe ++ ) {

			screenBlend(
				x + ( lobe - 1 ) * wispWidth * 0.28,
				y + ( random( cloud * 19 + lobe ) - 0.5 ) * wispHeight * 1.5,
				wispWidth * ( 0.3 + lobe * 0.08 ) * 0.65,
				wispHeight * ( 0.65 + random( cloud * 23 + lobe ) * 0.55 ) * 0.65,
				rotation,
				alpha,
				tintColor
			);

		}

	}

	// Half float: universally filterable on WebGPU (float32 filtering is an
	// optional feature) and still ~8× the effective ramp resolution of the
	// 8-bit canvas this replaces.
	const halfData = new Uint16Array( data.length );
	for ( let index = 0; index < data.length; index ++ ) halfData[ index ] = THREE.DataUtils.toHalfFloat( data[ index ] );

	const environment = new THREE.DataTexture( halfData, width, height, THREE.RGBAFormat, THREE.HalfFloatType );
	environment.name = 'OceanEnvironment';
	environment.mapping = THREE.EquirectangularReflectionMapping;
	environment.colorSpace = THREE.LinearSRGBColorSpace;
	environment.minFilter = THREE.LinearFilter;
	environment.magFilter = THREE.LinearFilter;
	environment.generateMipmaps = false;
	environment.needsUpdate = true;
	return environment;

}

// Continuous analytic reflection used by the water composite. The scene keeps
// the authored float equirect for ordinary materials, but SSF water benefits
// from evaluating the simple reference sky directly: no PMREM atlas seams or
// narrow texel ramps can turn small depth ripples into horizontal contour bars.
function sampleOceanReflection( direction, roughness ) {

	// Mirrors the authored equirect palette (deep azure overhead, golden haze
	// hugging the sun's horizon, teal sea below) so traced reflections and the
	// visible sky always agree. Broad transitions remain deliberate: normals
	// carrying real sub-cell ripples must not sweep across razor-thin color
	// boundaries and turn into screen-horizontal contour bars.
	const altitude = direction.y;
	const azimuthAlignment = direction.xz.dot( vec2( SUN_AZIMUTH_XZ.x, SUN_AZIMUTH_XZ.y ) )
		.div( direction.xz.length().max( 1e-4 ) )
		.max( 0 );
	const warmFalloff = mix( float( 16 ), float( 7.5 ), smoothstep( - 0.05, 0.05, altitude ) );
	const warmth = azimuthAlignment.pow( 5 ).mul( altitude.abs().mul( warmFalloff ).negate().exp() );
	const horizonBase = mix(
		vec3( color( OCEAN_SKY.horizonCool ) ),
		mix( vec3( color( OCEAN_SKY.horizonWarm ) ), vec3( color( OCEAN_SKY.sunGlow ) ), warmth.mul( 0.75 ).min( 1 ) ),
		warmth.mul( 0.85 ).min( 1 )
	);
	const skyLow = mix( horizonBase, vec3( color( OCEAN_SKY.upper ) ), smoothstep( 0.02, 0.5, altitude ) );
	const sky = mix( skyLow, vec3( color( OCEAN_SKY.zenith ) ), smoothstep( 0.42, 0.92, altitude ) );
	// Steep splash normals reflect the lower hemisphere: distant lit sea near
	// the horizon falling toward deep teal, never ink black, so energetic
	// interaction crests keep volume instead of acquiring an outline.
	const sea = mix(
		vec3( color( OCEAN_SKY.seaFar ) ),
		vec3( color( OCEAN_SKY.seaDeep ) ),
		smoothstep( 0.02, 0.5, altitude.negate() )
	);
	const base = mix( sea, sky, smoothstep( - 0.14, 0.12, altitude ) );
	const softened = mix(
		base,
		mix( vec3( color( OCEAN_SKY.horizonCool ) ), vec3( color( OCEAN_SKY.upper ) ), 0.5 ),
		roughness.mul( 0.38 )
	);
	const sunCosine = direction.dot( vec3( SUN_DIRECTION ) ).max( 0 );
	const discPower = mix( float( 1400 ), float( 96 ), roughness );
	const disc = sunCosine.pow( discPower ).mul( mix( float( 3 ), float( 0.6 ), roughness ) );
	const halo = sunCosine.pow( 12 ).mul( 0.42 );
	return softened
		.add( vec3( color( OCEAN_SKY.sunCore ) ).mul( disc ) )
		.add( vec3( color( OCEAN_SKY.sunGlow ) ).mul( halo ) );

}

function smoothValueNoise( coordinate ) {

	const cell = coordinate.floor();
	const fraction = coordinate.fract();
	const curve = fraction.mul( fraction ).mul( fraction.mul( - 2 ).add( 3 ) );
	const sample = point => hash( point.x.add( point.y.mul( 57.137 ) ) );
	return mix(
		mix( sample( cell ), sample( cell.add( vec2( 1, 0 ) ) ), curve.x ),
		mix( sample( cell.add( vec2( 0, 1 ) ) ), sample( cell.add( vec2( 1 ) ) ), curve.x ),
		curve.y
	);

}

function createWaterCaustics() {

	if ( params.get( 'caustics' ) === '0' || activeRaymarchQuality === 'performance' ) {

		waterCaustics = null;
		return;

	}
	waterCaustics = new WaterCaustics( water, {
		resolution: activeRaymarchQuality === 'balanced' ? 256 : 512,
		intensity: numberParam( 'causticintensity', 1.3 ),
		chromatic: params.get( 'causticchroma' ) !== '0',
		temporal: numberParam( 'caustictemporal', 0.6 ),
	} );
	waterCaustics.uniforms.sunDirection.value.copy( SUN_DIRECTION );
	waterCaustics.uniforms.absorption.value = numberParam( 'causticabsorption', 0.65 );

}

// The fluid reference works because the water has a legible, saturated world
// to refract. This stage is rendered normally into the scene color/depth pass;
// the water composite then bends and absorbs it. Inside the simulation bounds,
// the floor also reads the SurfaceField height to add a water-column shadow and
// curvature-driven caustic response before refraction.
function createPresentationStage() {

	const fieldNode = texture( water.surface.texture );
	const localPosition = water.uniforms.worldToVolume.mul( vec4( positionWorld, 1 ) ).xyz;
	const fieldUV = clamp( localPosition.xz, vec2( 0 ), vec2( 1 ) );
	const field = fieldNode.sample( fieldUV );
	const fieldTexel = vec2( 1 / water.surface.width, 1 / water.surface.depth );
	const sampleHeight = offset => fieldNode.sample(
		clamp( fieldUV.add( fieldTexel.mul( offset ) ), vec2( 0 ), vec2( 1 ) )
	).r;
	const heightLeft = sampleHeight( vec2( - 1, 0 ) );
	const heightRight = sampleHeight( vec2( 1, 0 ) );
	const heightDown = sampleHeight( vec2( 0, - 1 ) );
	const heightUp = sampleHeight( vec2( 0, 1 ) );
	// Fractional, rotated taps are important here: an integer/cardinal blur still
	// preserves the XZ grid's square signature in a broad projected shadow. The
	// filter is symmetric, stable in world space, and lets hardware bilinear
	// interpolation reconstruct a continuous height field between columns.
	const innerFilteredHeight = sampleHeight( vec2( 0.92, 0.38 ) )
		.add( sampleHeight( vec2( - 0.92, - 0.38 ) ) )
		.add( sampleHeight( vec2( - 0.38, 0.92 ) ) )
		.add( sampleHeight( vec2( 0.38, - 0.92 ) ) );
	const outerFilteredHeight = sampleHeight( vec2( 2.25, 0.55 ) )
		.add( sampleHeight( vec2( - 2.25, - 0.55 ) ) )
		.add( sampleHeight( vec2( 0.55, - 2.25 ) ) )
		.add( sampleHeight( vec2( - 0.55, 2.25 ) ) )
		.add( sampleHeight( vec2( 1.55, 1.75 ) ) )
		.add( sampleHeight( vec2( - 1.55, - 1.75 ) ) )
		.add( sampleHeight( vec2( - 1.75, 1.55 ) ) )
		.add( sampleHeight( vec2( 1.75, - 1.55 ) ) );
	const filteredHeight = field.r.mul( 0.12 )
		.add( innerFilteredHeight.mul( 0.1 ) )
		.add( outerFilteredHeight.mul( 0.06 ) );
	const domainEdge = min(
		min( localPosition.x, localPosition.x.oneMinus() ),
		min( localPosition.z, localPosition.z.oneMinus() )
	);
	const insideWater = smoothstep( 0, 0.025, domainEdge );
	const columnDepth = filteredHeight.sub( water.floorLevel ).max( 0 ).mul( DOMAIN_SIZE.y );
	// Match the reference presentation's fluid shadow: the checker remains
	// readable through the volume, but loses red much faster than blue. Keeping
	// a small ambient floor prevents deep columns from collapsing to black.
	const shadowTransmission = vec3( columnDepth ).mul( vec3( 1.8, 0.6, 0.28 ) ).negate().exp();
	const legacyWaterShadow = mix(
		vec3( 1 ),
		shadowTransmission.mul( 0.9 ).add( 0.1 ),
		insideWater
	);

	const tileX = positionWorld.x.add( 80 ).mul( 0.5 ).floor();
	const tileZ = positionWorld.z.add( 80 ).mul( 0.5 ).floor();
	const checker = tileX.add( tileZ ).mod( 2 ).abs();
	const blue = vec3( color( 0x287db8 ) );
	const purple = vec3( color( 0xa663d0 ) );
	const green = vec3( color( 0x34a96b ) );
	const yellow = vec3( color( 0xd3ad4b ) );
	const negativeX = positionWorld.x.lessThan( 0 );
	const quadrant = positionWorld.z.lessThan( 0 ).select(
		negativeX.select( blue, purple ),
		negativeX.select( green, yellow )
	);
	const tileVariation = hash( tileX.mul( 0.1031 ).add( tileZ.mul( 0.11369 ) ) ).sub( 0.5 );
	const checkerColor = mix( quadrant.mul( 0.56 ), quadrant.mul( 0.9 ), checker )
		.mul( tileVariation.mul( 0.08 ).add( 1 ) );

	// Presentation alternative: a continuous weathered seabed gives refraction
	// and caustics readable structure. The debug-floor uniform defaults to the
	// four-quadrant calibration target and switches without rebuilding either
	// water renderer.
	const seabedPosition = positionWorld.xz;
	const broadNoise = smoothValueNoise( seabedPosition.mul( 0.075 ) );
	const mediumNoise = smoothValueNoise( seabedPosition.mul( 0.31 ).add( vec2( 13.1, 7.7 ) ) );
	const fineNoise = smoothValueNoise( seabedPosition.mul( 1.15 ).add( vec2( 3.4, 19.2 ) ) );
	const ripplePhase = positionWorld.x.mul( 2.3 )
		.add( positionWorld.z.mul( 0.17 ).sin().mul( 1.8 ) )
		.add( broadNoise.mul( 4.2 ) );
	const sandRipple = ripplePhase.sin().mul( 0.5 ).add( 0.5 ).pow( 9 );
	// Bright warm sand is what lets the turquoise absorption ramp glow; the
	// teal stone keeps large-scale value contrast under deep water.
	const stone = vec3( color( 0x315755 ) );
	const sand = vec3( color( 0x9f9573 ) );
	const shell = vec3( color( 0xb8ae8c ) );
	const naturalSeabed = mix( stone, sand, smoothstep( 0.22, 0.78, broadNoise ) )
		.mul( mediumNoise.mul( 0.2 ).add( 0.85 ) )
		.add( shell.mul( sandRipple.mul( fineNoise ).mul( 0.045 ) ) );
	debugFloorNode = uniform( ui.debugFloor ? 1 : 0 ).setName( 'ocean_debugFloor' );
	const stageAlbedo = mix( naturalSeabed, checkerColor, debugFloorNode );

	const curvature = heightLeft.add( heightRight ).add( heightDown ).add( heightUp )
		.sub( field.r.mul( 4 ) ).abs();
	const caustic = smoothstep( 0.002, 0.018, curvature )
		.mul( smoothstep( 0.15, 0.8, columnDepth ) )
		.mul( insideWater );
	const legacyStageColor = stageAlbedo.mul( legacyWaterShadow )
		.add( vec3( 0.035, 0.16, 0.2 ).mul( caustic ).mul( insideWater )
			.mul( mix( 0.04, 1, debugFloorNode ) ) );
	stageCausticsNode = uniform( 0 ).setName( 'ocean_stageCaustics' );
	let physicalStageColor = legacyStageColor;
	if ( waterCaustics ) {

		// Sun-project the receiver lookup so the column shadow leans with the
		// authored light: the occluding column sits sun-ward of the receiver,
		// at + sunDir.xz/sunDir.y × depth. Foam coverage removes a further 35%
		// of direct light.
		const projectedShadowPosition = positionWorld.add( vec3(
			float( SUN_DIRECTION.x / Math.max( SUN_DIRECTION.y, 1e-4 ) ).mul( columnDepth ),
			0,
			float( SUN_DIRECTION.z / Math.max( SUN_DIRECTION.y, 1e-4 ) ).mul( columnDepth )
		) );
		const shadowEnabled = params.get( 'watershadow' ) === '0' ? float( 0 ) : float( 1 );
		const columnTransmission = mix(
			float( 1 ),
			waterCaustics.sampleShadow( projectedShadowPosition )
				.mul( field.g.mul( 0.35 ).oneMinus() )
				.saturate(),
			shadowEnabled
		);
		const coloredTransmission = mix(
			vec3( 0.16, 0.42, 0.56 ),
			vec3( 1 ),
			columnTransmission
		);
		const shadowedStage = stageAlbedo.mul( coloredTransmission );
		const focusedEnergy = waterCaustics.sample( positionWorld )
			.sub( vec3( columnTransmission ) )
			.max( vec3( 0 ) )
			.saturate();
		// Caustics only return energy removed by the paired water shadow. This
		// bounds the receiver at its unshadowed albedo under a unit sun probe.
		physicalStageColor = shadowedStage.add(
			stageAlbedo.sub( shadowedStage ).max( vec3( 0 ) ).mul( focusedEnergy )
		);

	}
	const stageColor = mix( legacyStageColor, physicalStageColor, stageCausticsNode );

	// The stage is an analytic test environment, not a lit prop. Basic shading
	// preserves its authored quadrant values and avoids pastel overexposure.
	stageMaterial = new THREE.MeshBasicNodeMaterial();
	stageMaterial.colorNode = stageColor;
	stageFloor = new THREE.Mesh( new THREE.PlaneGeometry( 150, 150, 1, 1 ), stageMaterial );
	stageFloor.name = 'OceanPresentationStage';
	stageFloor.rotation.x = - Math.PI / 2;
	stageFloor.position.y = - 0.08;
	stageFloor.receiveShadow = true;
	scene.add( stageFloor );

}


async function createSimulation() {

	const domainMatrix = new THREE.Matrix4()
		.makeTranslation( 0, ( 0.5 - 3 / GRID_SIZE.y ) * DOMAIN_SIZE.y, 0 )
		.multiply( new THREE.Matrix4().makeScale( DOMAIN_SIZE.x, DOMAIN_SIZE.y, DOMAIN_SIZE.z ) );

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
	} );
	water.setDomainTransform( domainMatrix );
	solver = water.solver;
	water.particleCount = ui.particleCount;
	water.seed( renderer );
	const postPasses = typeof solver.postPasses === 'function'
		? [ 0, 1 ].flatMap( frame => solver.postPasses( {
			frame,
			dt: FIXED_TIME_STEP,
			substeps: TUNING.substeps,
		} ) ?? [] )
		: solver.postPasses ?? [];
	await renderer.compileComputeAsync( [ ...new Set( [ ...solver.passes, ...postPasses ] ) ] );

}

function createRaymarchedWater() {

	// The live MPM mass grid is already the simulation's GPU spatial index.
	// Traversing it directly avoids a full particle-buffer CPU readback and PointsBVH
	// rebuild every frame while retaining the same empty-space acceleration idea.
	raymarchRenderer = new WaterRayMarchRenderer( renderer, water, {
		qualityPreset: activeRaymarchQuality,
		resolutionScale: ui.raymarchResolution,
		whitewaterScale: ui.raymarchWhitewaterScale,
		stepScale: ui.raymarchStep,
		isoScale: ui.raymarchIso,
		maxThickness: ui.raymarchThickness,
		resolveDepthRange: ui.raymarchDepthRange,
		maxSteps: ui.raymarchMaxSteps,
		refinementSteps: ui.raymarchRefinement,
		normalSmoothing: ui.raymarchNormalSmoothing,
		normalFilterRadius: ui.raymarchNormalFilter,
		trilinearTracing: ui.raymarchTrilinear,
		scatterSamples: ui.raymarchScatterSamples,
		wavesReflectionSteps: ui.raymarchWavesReflectionSteps,
		temporal: ui.raymarchTemporal,
		// Optional texture-grid mirror for renderer parity diagnostics.
		textureGridMirror: params.get( 'raytexture' ) !== '0',
	} );
	raymarchRenderer.uniforms.sunDirection.value.copy( SUN_DIRECTION );
	raymarchRenderer.uniforms.scatterExtinction.value = numberParam( 'scatterextinction', 0.65 );

}

function markRaymarchQualityCustom() {

	// Hand-tuned settings must survive: the governor stops stepping presets.
	setAutoQuality( false );
	if ( ui.raymarchQuality === 'Custom' ) return;
	ui.raymarchQuality = 'Custom';
	raymarchQualityController?.updateDisplay?.();

}

function applyRaymarchQuality( quality ) {

	if ( quality === 'Custom' ) return;
	clearTimeout( raymarchRebuildTimer );
	raymarchRebuildTimer = null;
	const selection = setRaymarchQualityState( quality );
	if ( selection === null ) return;
	const { name, settings } = selection;
	raymarchRenderer.setQualityPreset( name, {
		...settings,
		wavesReflectionSteps: WAVE_REFLECTION_ENABLED ? settings.wavesReflectionSteps : 0,
		temporal: TEMPORAL_OVERRIDE ?? settings.temporal,
	} );
	raymarchRenderer.resetHistory();
	gui?.controllersRecursive?.().forEach( controller => controller.updateDisplay() );

}

function scheduleRaymarchRebuild() {

	clearTimeout( raymarchRebuildTimer );
	raymarchRebuildTimer = setTimeout( () => {

		raymarchRebuildTimer = null;
		raymarchRenderer.setTraceOptions( {
			maxSteps: ui.raymarchMaxSteps,
			refinementSteps: ui.raymarchRefinement,
			normalSmoothing: ui.raymarchNormalSmoothing,
			normalFilterRadius: ui.raymarchNormalFilter,
			trilinearTracing: ui.raymarchTrilinear,
			scatterSamples: ui.raymarchScatterSamples,
			wavesReflectionSteps: ui.raymarchWavesReflectionSteps,
			temporal: ui.raymarchTemporal,
		} );

	}, 180 );

}

function setFoamDisplayDensity( value ) {

	ui.foamDisplayDensity = Math.min( 1, Math.max( 0, Number( value ) || 0 ) );
	for ( const entry of raymarchFoamMesh?.userData.whitewaterDisplayFractions ?? [] ) {

		entry.uniform.value = Math.min( 1, ui.foamDisplayDensity * entry.scale );

	}

}

function setDebugFloor( enabled ) {

	ui.debugFloor = enabled === true;
	if ( debugFloorNode ) debugFloorNode.value = ui.debugFloor ? 1 : 0;
	if ( scene?.fog ) applyStageBackdrop();

}

function createRenderPipeline() {

	scenePass = pass( scene, camera );
	sceneColorNode = scenePass.getTextureNode( 'output' );
	sceneDepthNode = scenePass.getTextureNode( 'depth' );

	const compositeOptions = {
		sceneColorNode,
		sceneDepthNode,
		// The legacy fullscreen SurfaceField mask produced the stretched white
		// value-noise stains visible at close range. Deposited coverage now renders
		// as isotropic splats in the independent whitewater target below. Keep the
		// old material path only as an explicit diagnostic A/B.
		surfaceField: water.surface.texture,
		surfaceFoam: params.get( 'surfacefoam' ) === '1',
		worldToVolume: water.uniforms.worldToVolume,
		envNode: params.get( 'env' ) === '0'
			? null
			: params.get( 'env' ) === 'white'
				? () => vec3( 1 )
				: sampleOceanReflection,
		uniforms: {
			// Ocean-blue Beer–Lambert: red dies first, blue survives. Gentler
			// than open-ocean truth so the sand keeps a wide turquoise band.
			absorption: new THREE.Vector3( 3.1, 0.7, 0.2 ),
			// Extinction—not additive cyan haze—carries the body colour. A very
			// dark scatter floor keeps thick water from becoming featureless black.
			scatterColor: new THREE.Color( 0x0a4c52 ),
			// Raymarched volume lighting redirects measured sun/sky energy through
			// this albedo; SSF and `?volscatter=0` retain scatterColor above.
			scatterTint: new THREE.Color( 0x1fbfae ),
			scatterDepth: numberParam( 'scatterdepth', 1.15 ),
			phaseG: numberParam( 'phaseg', 0.8 ),
			horizonOcclusionStrength: numberParam( 'horizonocclusion', 1 ),
			refractionStrength: numberParam( 'refract', 1 ),
			refractionBlur: numberParam( 'refractblur', 0.0018 ),
			thicknessBoost: numberParam( 'thicknessboost', 1.8 ),
			thicknessMax: 3.4,
			// Floored at a wind-blown-ocean microfacet roughness: near-mirror
			// values sample the PMREM's finest mip, whose bilinear texel kinks
			// trace nested contour rings under a slow grazing reflection sweep.
			baseRoughness: numberParam( 'baseroughness', 0.11 ),
			thicknessRoughness: 0.08,
			environmentIntensity: numberParam( 'envintensity', 0.18 ),
			reflectionFloor: new THREE.Color( 0x0c4960 ),
			sunPower: 420,
			sunStrength: numberParam( 'sunstrength', 2.4 ),
			sssStrength: numberParam( 'sss', 0.14 ),
			// These also feed the scatter integral's sky ambient and the
			// wave-on-wave body radiance: cyan keeps deep water luminous while
			// staying dim enough that thickness still grades the body.
			horizonColor: new THREE.Color( 0x2e7290 ),
			zenithColor: new THREE.Color( 0x77b6cf ),
			sunDirection: SUN_DIRECTION,
			sunColor: new THREE.Color( 0xffb763 ),
			foamColor: new THREE.Color( 0xf6f7f2 ),
			// The tighter high-frequency breakup can carry a lower threshold without
			// returning to the old meter-wide smudges; this keeps active crests legible
			// against the now-visible refracted stage.
			foamThreshold: numberParam( 'foamthreshold', 0.1 ),
			foamFeather: numberParam( 'foamfeather', 0.2 ),
			foamAlbedoMax: 0.65,
			foamNoiseScale: numberParam( 'foamscale', 58 ),
			foamNormalStrength: 0.08,
			foamEdgeCutoff: numberParam( 'foamedgecutoff', 0.06 ),
			whitewaterDensity: 1.1,
			whitewaterMaxBrightness: 0.86,
			whitewaterEdgeCutoff: numberParam( 'whitewateredgecutoff', 0.055 ),
			whitewaterEdgePower: numberParam( 'whitewateredgepower', 0.72 ),
			edgeFade: 0.4,
			domainFade: numberParam( 'domainfade', 0.008 ),
			domainNormalFade: numberParam( 'domainnormalfade', 0.035 ),
			domainWallReflection: numberParam( 'domainwallreflection', 0.24 ),
			domainWallColor: new THREE.Color( 0x0d5f6b ),
			// Partial fill keeps a vertical absorption gradient on the exposed
			// cross-section walls: the tank reads as a cutaway, not a slab.
			domainWallFill: numberParam( 'domainwallfill', 0.55 ),
		},
	};
	raymarchComposite = createWaterComposite( raymarchRenderer, {
		...compositeOptions,
		physicalRefraction: true,
		dispersion: [ 'cinematic', 'extreme' ].includes( activeRaymarchQuality ) && params.get( 'dispersion' ) !== '0'
			? numberParam( 'dispersion', 0.004 )
			: 0,
		glitter: [ 'cinematic', 'extreme' ].includes( activeRaymarchQuality ) && params.get( 'glitter' ) !== '0'
			? numberParam( 'glitter', 0.42 )
			: 0,
		reducedMotion: REDUCED_MOTION,
		underwater: UNDERWATER_ENABLED,
		caustics: UNDERWATER_ENABLED ? waterCaustics : null,
		ssr: params.get( 'ssr' ) === '0' || activeRaymarchQuality === 'performance'
			? false
			: {
				steps: Math.round( numberParam(
					'ssrsteps',
					activeRaymarchQuality === 'balanced' ? 8 : activeRaymarchQuality === 'high' ? 12 : 16
				) ),
				refine: 4,
				maxDistance: numberParam( 'ssrdistance', 42 ),
				thickness: numberParam( 'ssrthickness', 0.45 ),
			},
		detailNormals: activeRaymarchQuality === 'performance' || params.get( 'detailnormal' ) === '0'
			? null
			: {
				waves: water.waves,
				surfaceField: water.surface.texture,
				micro: numberParam( 'microdetail', 0.22 ),
			},
		contactFoam: params.get( 'contactfoam' ) === '0' ? 0 : numberParam( 'contactwidth', 0.22 ),
	} );
	// SSF synthesizes finite side walls from a clipped depth sheet and suppresses
	// their reflection. The raymarcher traces actual volume sides, so applying the
	// same wall-reflection suppression creates a black Fresnel outline around the domain.
	raymarchComposite.uniforms.domainWallReflection.value = 1;
	raymarchComposite.uniforms.environmentIntensity.value = numberParam( 'rayenvintensity', 1 );
	// A deep teal reflection floor keeps collapsing-crest pockets and steep
	// grazing rims liquid instead of ink: real water never reflects nothing.
	raymarchComposite.uniforms.reflectionFloor.value.set( 0x0e3a46 );
	raymarchComposite.uniforms.domainNormalFade.value = numberParam(
		'raydomainnormalfade',
		1.25 / GRID_SIZE.x
	);

	const group = new THREE.Group();
	group.name = 'OceanRaymarchWhitewater';
	const diffuse = water.createFoamMesh( {
		baseSize: 0.095,
		minPixelSize: 2,
		maxPixelSize: 28,
		displayFraction: ui.foamDisplayDensity,
		surface: raymarchRenderer,
		sceneDepthNode,
		sunDirection: SUN_DIRECTION,
		surfaceField: water.surface.texture,
		worldToVolume: water.uniforms.worldToVolume,
		volumeGrid: raymarchRenderer.gridTexture,
		volumeAbsorption: numberParam( 'whitewaterabsorption', 0.65 ),
	} );
	const deposits = water.createSurfaceFoamMesh( {
		surface: raymarchRenderer,
		sceneDepthNode,
		splatsPerColumn: 2,
		baseSize: 0.1,
		minPixelSize: 1,
		maxPixelSize: 10,
		displayFraction: ui.foamDisplayDensity,
		jitter: 2.4,
		coverageThreshold: numberParam( 'foamthreshold', 0.08 ),
		coverageFeather: numberParam( 'foamfeather', 0.15 ),
		aging: true,
	} );
	group.add( diffuse, deposits );
	group.userData.whitewaterPixelClamp = diffuse.userData.whitewaterPixelClamp;
	group.userData.surfaceFoamPixelClamp = deposits.userData.whitewaterPixelClamp;
	group.userData.surfaceFoamPath = deposits.userData.surfaceFoamPath;
	group.userData.legacySurfaceFoam = compositeOptions.surfaceFoam;
	group.userData.whitewaterDisplayFractions = [
		{ uniform: diffuse.userData.whitewaterDisplayFraction, scale: 1 },
		{ uniform: deposits.userData.whitewaterDisplayFraction, scale: 1 },
	];
	raymarchFoamMesh = group;
	raymarchFoamMesh.visible = ui.whitewater;
	raymarchRenderer.setWhitewaterMesh( raymarchFoamMesh );

	renderPipeline = new THREE.RenderPipeline( renderer );
	updateRenderPipeline();

}

function updateRenderPipeline() {

	if ( ! renderPipeline ) return;
	if ( WATER_DEBUG === 'caustics' && waterCaustics ) {

		const value = waterCaustics.textureNode.sample( uv() );
		renderPipeline.outputNode = vec4( value.rgb, 1 );

	} else if ( WATER_DEBUG === 'thickness' ) {

		const value = raymarchRenderer.thicknessNode.sample( uv() ).r.div( 5 ).saturate();
		renderPipeline.outputNode = vec4( vec3( value ), 1 );

	} else if ( WATER_DEBUG === 'normal' ) {

		const value = raymarchRenderer.normalNode.sample( uv() ).gba.mul( 0.5 ).add( 0.5 );
		renderPipeline.outputNode = vec4( value, 1 );

	} else if ( WATER_DEBUG === 'ripple' ) {

		const texel = raymarchRenderer.uniforms.fullTexelSize;
		const depthAt = offset => raymarchRenderer.depthNode.sample( uv().add( texel.mul( offset ) ) ).r;
		const laplacian = depthAt( vec2( 0 ) ).mul( 4 )
			.sub( depthAt( vec2( 2, 0 ) ) )
			.sub( depthAt( vec2( - 2, 0 ) ) )
			.sub( depthAt( vec2( 0, 2 ) ) )
			.sub( depthAt( vec2( 0, - 2 ) ) );
		renderPipeline.outputNode = vec4( vec3( laplacian.mul( 60 ).add( 0.5 ).saturate() ), 1 );

	} else if ( WATER_DEBUG === 'scatter' ) {

		const value = raymarchRenderer.auxNode
			? raymarchRenderer.auxNode.sample( uv() )
			: vec4( 0 );
		renderPipeline.outputNode = vec4(
			vec3( value.r.mul( 0.5 ), value.g.mul( 0.5 ), value.b.abs() ),
			1
		);

	} else if ( WATER_DEBUG === 'refract' ) {

		const delta = raymarchComposite.diagnostics.refractionDeltaNode;
		const magnitude = delta.length().mul( 24 ).saturate();
		renderPipeline.outputNode = vec4(
			vec3( delta.x.mul( 12 ).add( 0.5 ), delta.y.mul( 12 ).add( 0.5 ), magnitude ),
			1
		);

	} else if ( WATER_DEBUG === 'detailnormal' ) {

		renderPipeline.outputNode = vec4(
			raymarchComposite.diagnostics.detailNormalNode.mul( 0.5 ).add( 0.5 ),
			1
		);

	} else if ( WATER_DEBUG === 'contact' ) {

		renderPipeline.outputNode = vec4( vec3( raymarchComposite.diagnostics.contactFoamMaskNode ), 1 );

	} else if ( WATER_DEBUG === 'ssr' ) {

		const value = raymarchComposite.diagnostics.ssrNode;
		renderPipeline.outputNode = vec4(
			vec3( value.r, value.g.mul( 6 ).add( 0.5 ), value.b.mul( 6 ).add( 0.5 ) ),
			1
		);

	} else if ( BLOOM_ENABLED && activeRaymarchQuality !== 'performance' ) {

		// The composite renders once into a half-float RTT so its HDR glints
		// survive to the bloom threshold; the output quad then adds the bloom
		// mips and applies tone mapping over the sum.
		compositeColorNode ??= rtt( raymarchComposite.node );
		if ( ! bloomNode ) {

			bloomNode = bloom( compositeColorNode, BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD );
			// Quarter-res mip chain: bloom is low-frequency by construction, and
			// half-res (the node default) costs ~3 ms at a 6 M-pixel canvas.
			bloomNode.setResolutionScale( 0.25 );

		}
		renderPipeline.outputNode = compositeColorNode.add( bloomNode );

	} else {

		renderPipeline.outputNode = raymarchComposite.node;

	}
	renderPipeline.needsUpdate = true;

}

function setParticleCount( count ) {

	ui.particleCount = Math.min( PARTICLE_CAPACITY, Math.max( 1, Math.round( count ) ) );
	water.particleCount = ui.particleCount;

}

function setAutoQuality( enabled ) {

	ui.autoQuality = enabled === true;
	autoQualityDeltas.length = 0;
	autoQualityCalmWindows = 0;

}

function applyAutoQualityTier( tier ) {

	const clamped = Math.min( AUTO_QUALITY_LADDER.length - 1, Math.max( 0, tier ) );
	if ( clamped === autoQualityTier ) return;
	autoQualityTier = clamped;
	const entry = AUTO_QUALITY_LADDER[ clamped ];
	renderPixelBudget = entry.pixels;
	if ( ui.raymarchQuality !== entry.preset ) applyRaymarchQuality( entry.preset );
	else raymarchRenderer.resetHistory();
	resize();

}

// Median rAF delta over a short window. Wall time is the honest signal in
// production (timestamp queries are a bench-only opt-in) and it covers the
// whole frame: simulation, trace, composite, bloom, and presentation.
function updateAutoQuality( frameDeltaMs ) {

	if ( ! ui.autoQuality || document.hidden ) return;
	autoQualityFramesSeen ++;
	// Skip startup: pipeline compilation and the seeding beat spike wildly.
	if ( autoQualityFramesSeen < AUTO_QUALITY_WARMUP_FRAMES ) return;
	if ( ! ( frameDeltaMs > 0 ) || frameDeltaMs > 250 ) return;
	autoQualityDeltas.push( frameDeltaMs );
	if ( autoQualityDeltas.length < AUTO_QUALITY_WINDOW ) return;
	autoQualityDeltas.sort( ( a, b ) => a - b );
	const median = autoQualityDeltas[ autoQualityDeltas.length >> 1 ];
	autoQualityDeltas.length = 0;
	if ( median > AUTO_QUALITY_STEP_DOWN_MS ) {

		autoQualityCalmWindows = 0;
		// A machine far over budget skips a rung so escape stays quick.
		const step = median > AUTO_QUALITY_STEP_DOWN_MS * 2 ? 2 : 1;
		applyAutoQualityTier( autoQualityTier + step );

	} else if ( median < AUTO_QUALITY_STEP_UP_MS && autoQualityTier > 0 ) {

		if ( ++ autoQualityCalmWindows >= AUTO_QUALITY_CALM_WINDOWS ) {

			autoQualityCalmWindows = 0;
			applyAutoQualityTier( autoQualityTier - 1 );

		}

	} else {

		autoQualityCalmWindows = 0;

	}

}

function createGUI() {

	gui = createExampleGui( 'Ocean / Raymarched volume' );
	if ( container.clientWidth < 680 || ! controlsExpanded ) gui.close();
	gui.add( ui, 'simulate' ).name( 'Run simulation' );
	gui.add( ui, 'waveEnergy', 0, WAVE_ENERGY_MAX, 0.01 ).name( 'Wave energy' ).onChange( value => {

		water.waveEnergy = value;

	} );
	gui.add( ui, 'whitewater' ).name( 'Whitewater' ).onChange( enabled => {

		raymarchFoamMesh.visible = enabled;

	} );
	gui.add( ui, 'foamDisplayDensity', 0, 1, 0.01 )
		.name( 'Foam display density' )
		.info( 'Stable display thinning only; the physical whitewater simulation and deposits remain intact.' )
		.onChange( setFoamDisplayDensity );
	gui.add( ui, 'debugFloor' )
		.name( 'Debug floor' )
		.info( 'Show the four-quadrant checker used to inspect refraction, depth, blending, and occlusion.' )
		.onChange( setDebugFloor );
	gui.add( { reset: resetOcean }, 'reset' ).name( 'Reset ocean' );
	const raymarch = gui.addFolder( 'Raymarch' );
	raymarch.add( ui, 'autoQuality' )
		.name( 'Auto quality' )
		.info( 'Holds a smooth frame rate by stepping the preset and internal resolution down (and back up) as the machine allows. Adjusting anything manually turns it off.' )
		.onChange( setAutoQuality );
	raymarchQualityController = raymarch.add( ui, 'raymarchQuality', RAYMARCH_QUALITY_OPTIONS )
		.name( 'Quality preset' )
		.info( 'Cinematic traces continuous trilinear density. Extreme adds the widest surface polish and full-resolution whitewater.' )
		.onChange( value => {

			setAutoQuality( false );
			applyRaymarchQuality( value );

		} );
	raymarch.add( ui, 'raymarchResolution', 0.25, 1, 0.05 )
		.name( 'Trace resolution' )
		.info( 'Internal pixel scale. Cost grows approximately with scale squared.' )
		.onChange( value => {

			markRaymarchQualityCustom();
			raymarchRenderer.setResolutionScale( value );

		} );
	raymarch.add( ui, 'raymarchWhitewaterScale', 0.0625, 1, 0.0625 )
		.name( 'Whitewater resolution' )
		.info( 'Independent spray, bubble, and foam accumulation scale.' )
		.onChange( value => {

			markRaymarchQualityCustom();
			raymarchRenderer.setWhitewaterScale( value );

		} );
	raymarch.add( ui, 'raymarchStep', 1, 2.5, 0.05 )
		.name( 'Cell stride' )
		.info( '1 visits every crossed grid cell; larger values are faster but may miss thin features.' )
		.onChange( value => {

			markRaymarchQualityCustom();
			raymarchRenderer.uniforms.stepScale.value = value;

		} );
	raymarch.add( ui, 'raymarchIso', 0.5, 1.5, 0.01 )
		.name( 'Density surface' )
		.info( 'Mass isosurface multiplier. Lower closes gaps; higher tightens the surface.' )
		.onChange( value => {

			markRaymarchQualityCustom();
			raymarchRenderer.uniforms.isoScale.value = value;

		} );
	raymarch.add( ui, 'raymarchRefinement', 1, 8, 1 )
		.name( 'Hit refinement' )
		.info( 'Trilinear binary-search passes after the first occupied cell. Rebuilds the shader.' )
		.onChange( () => {

			markRaymarchQualityCustom();
			scheduleRaymarchRebuild();

		} );
	raymarch.add( ui, 'raymarchMaxSteps', 32, 768, 16 )
		.name( 'DDA step cap' )
		.info( 'Maximum cells visited per ray. The current grid diagonal needs at most 256.' )
		.onChange( () => {

			markRaymarchQualityCustom();
			scheduleRaymarchRebuild();

		} );
	raymarch.add( ui, 'raymarchNormalSmoothing', 0, 5, 0.05 )
		.name( 'Voxel blend radius' )
		.info( 'Visual blend radius in grid cells. Raise it to hide cube-like highlights; lower it to retain sharper cell-scale detail.' )
		.onChange( () => {

			markRaymarchQualityCustom();
			scheduleRaymarchRebuild();

		} );
	raymarch.add( ui, 'raymarchNormalFilter', 0, 5, 1 )
		.name( 'Screen-space polish' )
		.info( 'Edge-aware normal filter radius in pixels. It hides residual voxel seams without moving the water silhouette.' )
		.onChange( () => {

			markRaymarchQualityCustom();
			scheduleRaymarchRebuild();

		} );
	raymarch.add( ui, 'raymarchTrilinear' )
		.name( 'Trilinear traversal' )
		.info( 'Samples the continuous density field in every DDA segment. Used by Cinematic and Extreme; disable it first when tuning for speed.' )
		.onChange( () => {

			markRaymarchQualityCustom();
			scheduleRaymarchRebuild();

		} );
	raymarch.add( ui, 'raymarchScatterSamples', RAYMARCH_SCATTER_SAMPLE_OPTIONS )
		.name( 'Volume light samples' )
		.info( 'Fixed stratified samples through the wet segment. Eight and twelve also enable crest-to-sun horizon occlusion.' )
		.onChange( value => {

			ui.raymarchScatterSamples = Number( value );
			markRaymarchQualityCustom();
			scheduleRaymarchRebuild();

		} );
	raymarch.add( ui, 'raymarchDepthRange', 0.05, 2, 0.05 )
		.name( 'Resolve depth range' )
		.info( 'Depth tolerance for the edge-aware full-resolution resolve.' )
		.onChange( value => {

			markRaymarchQualityCustom();
			raymarchRenderer.uniforms.resolveDepthRange.value = value;

		} );
	raymarch.add( ui, 'raymarchThickness', 0.25, 12, 0.25 )
		.name( 'Optical path cap' )
		.info( 'Maximum integrated water distance; lower values allow earlier ray termination.' )
		.onChange( value => {

			markRaymarchQualityCustom();
			raymarchRenderer.uniforms.maxThickness.value = value;

		} );
	const finish = gui.addFolder( 'Finish' );
	finish.add( ui, 'autoRotate' ).name( 'Drift camera' ).onChange( enabled => {

		controls.autoRotate = enabled && ! REDUCED_MOTION;

	} );

}

function resize() {

	if ( ! renderer || ! camera ) return;
	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	// Every pass after the trace runs at drawing-buffer resolution, so pixels
	// are the frame's strongest cost lever. Cap the buffer at the active
	// budget: small windows keep native density, a 5K fullscreen canvas stops
	// paying retina prices for a soft, low-frequency image.
	const budget = MAX_PIXELS_OVERRIDE !== null
		? Math.min( renderPixelBudget, MAX_PIXELS_OVERRIDE )
		: renderPixelBudget;
	const pixelRatio = Math.max( 0.5, Math.min(
		Math.min( window.devicePixelRatio, MAX_RENDER_PIXEL_RATIO ),
		Math.sqrt( budget / Math.max( 1, width * height ) )
	) );
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	renderer.setPixelRatio( pixelRatio );
	renderer.setSize( width, height );

}

function stepSimulation( delta = FIXED_TIME_STEP, time = elapsed ) {

	water.waveEnergy = ui.waveEnergy;
	water.uniforms.pointerStrength.value = pointerHandlers?.consumeMove?.()
		? 1
		: water.uniforms.pointerStrength.value * 0.78;
	water.time = time;
	water.step( renderer, Math.min( FIXED_TIME_STEP, Math.max( 1 / 360, delta ) ) );
	simulatedFrames ++;

}

function setCameraUnderwater( value ) {

	cameraUnderwater = value === true;
	const encoded = cameraUnderwater ? 1 : 0;
	raymarchRenderer.uniforms.cameraUnderwater.value = encoded;
	raymarchComposite.uniforms.cameraUnderwater.value = encoded;

}

function updateUnderwaterState() {

	if ( ! UNDERWATER_ENABLED || ! water || ! camera ) return;
	const surfaceEstimate = underwaterSurfaceHeight ?? water.getStillWaterLevel();
	const immediateThreshold = cameraUnderwater ? surfaceEstimate + 0.08 : surfaceEstimate - 0.04;
	setCameraUnderwater( camera.position.y < immediateThreshold );
	if ( underwaterProbePending ) return;
	underwaterProbePending = true;
	water.getHeightAt( camera.position.x, camera.position.z ).then( surfaceHeight => {

		if ( disposed ) return;
		underwaterSurfaceHeight = surfaceHeight;
		const threshold = cameraUnderwater ? surfaceHeight + 0.08 : surfaceHeight - 0.04;
		setCameraUnderwater( camera.position.y < threshold );

	} ).catch( () => {} ).finally( () => {

		underwaterProbePending = false;

	} );

}

function resetOcean() {

	simulatedFrames = 0;
	elapsed = 0;
	water.uniforms.pointerStrength.value = 0;
	water.seed( renderer );
	raymarchRenderer?.resetHistory();
	waterCaustics?.resetHistory();

}

function prepareWaterFrame() {

	updateUnderwaterState();
	waterCaustics?.update( renderer );
	raymarchRenderer.update( renderer, camera );

}

async function renderFrameAsync() {

	prepareWaterFrame();
	await renderPipeline.renderAsync();

}

function animate( now ) {

	const frameDelta = now - previousFrame;
	const delta = fixedFrameTimeStep
		?? Math.min( 0.05, Math.max( 0, frameDelta ) * 0.001 );
	previousFrame = now;
	if ( ! REDUCED_MOTION ) elapsed += delta;
	updateAutoQuality( frameDelta );
	controls.update();
	updateUnderwaterState();
	if ( ui.simulate ) stepSimulation( FIXED_TIME_STEP, elapsed );
	prepareWaterFrame();
	renderPipeline.render();

}

async function waitForSubmittedWork() {

	const queue = renderer?.backend?.device?.queue;
	if ( typeof queue?.onSubmittedWorkDone === 'function' ) await queue.onSubmittedWorkDone();

}

async function stepOcean( steps = 1, startTime = elapsed ) {

	const count = Math.max( 0, Math.round( Number( steps ) || 0 ) );
	for ( let step = 0; step < count; step ++ ) {

		stepSimulation( FIXED_TIME_STEP, startTime + step * FIXED_TIME_STEP );

	}
	await waitForSubmittedWork();
	return getDiagnostics();

}

async function renderOcean() {

	controls.update();
	await renderFrameAsync();
	await waitForSubmittedWork();
	return getDiagnostics();

}

function pauseOcean() {

	ui.simulate = false;
	renderer?.setAnimationLoop( null );

}

function resumeOcean() {

	ui.simulate = true;
	previousFrame = performance.now();
	renderer?.setAnimationLoop( animate );

}

function getDiagnostics() {

	return {
		particleCount: ui.particleCount,
		simulatedFrames,
		simulating: ui.simulate,
		quality: ui.raymarchQuality,
		autoQuality: {
			enabled: ui.autoQuality,
			tier: autoQualityTier,
			pixelBudget: renderPixelBudget,
		},
		domain: DOMAIN_SIZE.toArray(),
		grid: GRID_SIZE.toArray(),
		solver: solver?.getLastStepStats?.() ?? null,
		timestampQueries: renderer?.backend?.trackTimestamp === true,
	};

}

function createOceanHandle() {

	return {
		renderer,
		solver,
		water,
		pause: pauseOcean,
		resume: resumeOcean,
		reset: resetOcean,
		step: stepOcean,
		render: renderOcean,
		getDiagnostics,
		dispose,
		simulation: {
			water,
			solver,
			settings: ui,
			particleCapacity: PARTICLE_CAPACITY,
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
			domainSize: DOMAIN_SIZE,
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
			scene,
			camera,
			controls,
			waterCaustics,
			raymarchRenderer,
			raymarchFoamMesh,
			raymarchComposite,
			environment: oceanEnvironment,
			get bloom() {

				return bloomNode;

			},
			setFoamDisplayDensity,
			setDebugFloor,
			applyRaymarchQuality,
			renderFrame: renderFrameAsync,
			animate,
			autoQuality: {
				apply: applyAutoQualityTier,
				get enabled() {

					return ui.autoQuality;

				},
				get tier() {

					return autoQualityTier;

				},
				get pixelBudget() {

					return renderPixelBudget;

				},
			},
		},
	};

}

function dispose() {

	if ( disposed ) return;
	disposed = true;
	clearTimeout( raymarchRebuildTimer );
	renderer?.setAnimationLoop( null );
	window.removeEventListener( 'pagehide', dispose );
	resizeObserver?.disconnect();
	controls?.dispose();
	gui?.destroy?.();
	if ( pointerHandlers ) {

		renderer.domElement.removeEventListener( 'pointermove', pointerHandlers.onPointerMove );
		renderer.domElement.removeEventListener( 'pointercancel', pointerHandlers.onPointerLeave );
		renderer.domElement.removeEventListener( 'pointerleave', pointerHandlers.onPointerLeave );

	}
	stageFloor?.geometry?.dispose();
	stageMaterial?.dispose();
	bloomNode?.dispose?.();
	compositeColorNode?.renderTarget?.dispose?.();
	raymarchRenderer?.dispose();
	waterCaustics?.dispose();
	water?.dispose();
	scenePass?.dispose?.();
	renderPipeline?.dispose();
	oceanEnvironment?.dispose();
	devtools?.dispose();
	devtools = null;
	renderer?.dispose();

}

export function unmount() {

	dispose();

}
