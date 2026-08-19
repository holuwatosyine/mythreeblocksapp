import * as THREE from 'three/webgpu';
import { registerDevtools } from 'three-blocks/devtools';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

import { color, materialColor, varying } from 'three/tsl';

import {
    ComputeBVHSampler,
    ComputeInstanceCulling,
    fresnel,
    PBF,
    SPH,
    sphereImpostorPosition,
} from 'three-blocks';

import { ComputeSDFGenerator, SDFVolumeConstraint } from 'three-blocks/sdf-raymarching';
import { SpatialGridHelper } from 'three-blocks/boids';
import { TriangleGeometry } from '../helpers/exampleGeometries.js';
import { instanceCullingIndex } from 'three-blocks/instance-culling';
import { sphereImpostorAlpha, sphereImpostorNormal, sphereImpostorShadow } from 'three-blocks/sphere-impostors';
import { computeBoundsTree } from 'three-mesh-bvh';
import { shaderCache } from 'three-blocks/shaders';
import { createExampleCaption } from '../helpers/ExampleCaption.js';
import { createExampleGui } from '../helpers/exampleGui.js';
import { withAssetLoader } from '../helpers/LoadingManager.js';

const DEBUG = new URLSearchParams( window.location.search ).has( 'debug' );
const REDUCED_MOTION = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
const PARTICLE_COUNT = 4096 * 2;
const PARTICLE_RADIUS = 0.4;
const DOMAIN_SIZE = new THREE.Vector3( 60, 40, 30 );
const POINTER_OFFSCREEN = new THREE.Vector3( - 9999, - 9999, - 9999 );
const PALETTES = {
	SPH: {
		base: 0xe0a23e,
		highlight: 0xffe1a1,
		background: 0x17120d,
		outline: 0xe6c78a,
		floor: 0x211a12,
		plinth: 0x302319,
		label: 'force response',
		detail: 'Pressure expands and rebounds',
	},
	PBF: {
		base: 0x397ddc,
		highlight: 0xa4dcff,
		background: 0x09131d,
		outline: 0x8cc6ed,
		floor: 0x0b1924,
		plinth: 0x152c3c,
		label: 'constraint response',
		detail: 'Position constraints hold volume',
	},
};
const FLOW_SPEED_LIMITS = {
	PBF: 5.0,
	SPH: 3.0,
};

let container;
let containerStyle;
let renderer;
let devtools;
let controls;
let scene;
let camera;
let gui;
let flowSpeedController;
let clock;
let bunnyMesh;
let stage;
let floorMaterial;
let plinthMaterial;
let rimMaterial;
let accentLight;
let sampler;
let sdfGenerator;
let helper;
let captionElement;
let resizeObserver;
let portraitLayout = null;
let mounted = false;
let framePending = false;
let renderGeneration = 0;
let options;
let pausedFlowSpeed = null;

const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let pointerActive = false;

const solverViews = {
	SPH: null,
	PBF: null,
};

const sdfConstraints = {
	SPH: null,
	PBF: null,
};

const liquidBunnyShaderResources = {
	get sdfGenerator() { return sdfGenerator; },
	get bvhStorage() {

		const storage = sdfGenerator?._bvhData?.storage;
		return storage?.nodes?.proxyObject ?? storage;

	},
	get sdfConstraints() { return sdfConstraints; },
	get sampler() { return sampler; },
	get sph() { return solverViews.SPH?.fluid; },
	get pbf() { return solverViews.PBF?.fluid; },
	get sphGrid() { return solverViews.SPH?.fluid?.grid; },
	get pbfGrid() { return solverViews.PBF?.fluid?.grid; },
	get solverViews() { return solverViews; },
	get bunnyGeometry() { return bunnyMesh?.geometry; },
};

const viewParams = {
	solver: 'PBF',
	useSpatialGrid: true,
	showSpatialGridHelper: false,
	pointerEnabled: true,
	pointerRadius: 10,
	pointerStrength: 80,
};

const sharedParams = {
	mass: 1.0,
	timeScale: REDUCED_MOTION ? 0 : 3.0,
	fixedTimeStep: 1 / 120,
};

const solverFlowSpeeds = {
	PBF: Math.min( sharedParams.timeScale, FLOW_SPEED_LIMITS.PBF ),
	SPH: Math.min( sharedParams.timeScale, FLOW_SPEED_LIMITS.SPH ),
};

const sphParams = {
	h: 1.0,
	restDensity: 1.0,
	viscosityMu: 0.8,
	pressureStiffness: 200.0,
	maxSpeed: 15.0,
};

const pbfParams = {
	fluidVolumeFraction: 0.25,
	particleRadius: PARTICLE_RADIUS * 0.5,
	spacing: 0.725,
	h: 1.45,
	solverIterations: 2,
	lambdaEpsilon: 5.0,
	xsphViscosity: 0.5,
	corrK: 0.0,
	corrN: 4.0,
};

function computeGeometryVolume( geometry ) {

	const position = geometry.getAttribute( 'position' );
	if ( ! position || position.itemSize < 3 ) return 0;
	const index = geometry.getIndex();
	const vertexCount = index ? index.count : position.count;
	let signedVolumeTimesSix = 0;

	for ( let offset = 0; offset + 2 < vertexCount; offset += 3 ) {

		const a = index ? index.getX( offset ) : offset;
		const b = index ? index.getX( offset + 1 ) : offset + 1;
		const c = index ? index.getX( offset + 2 ) : offset + 2;
		const ax = position.getX( a );
		const ay = position.getY( a );
		const az = position.getZ( a );
		const bx = position.getX( b );
		const by = position.getY( b );
		const bz = position.getZ( b );
		const cx = position.getX( c );
		const cy = position.getY( c );
		const cz = position.getZ( c );
		signedVolumeTimesSix += ax * ( by * cz - bz * cy )
			+ ay * ( bz * cx - bx * cz )
			+ az * ( bx * cy - by * cx );

	}

	return Math.abs( signedVolumeTimesSix / 6 );

}

export async function mount( containerElement, mountOptions = {} ) {

	container = containerElement;
	options = {
		assets: mountOptions.assets ?? {},
		debug: mountOptions.debug ?? DEBUG,
		initializationSteps: Math.max( 1, Math.floor( mountOptions.initializationSteps ?? 1 ) ),
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
	return {
		pause,
		resume,
		setFlowSpeed,
		setSolver: setActiveSolver,
		getDiagnostics,
		dispose: unmount,
	};

}

function requireAsset( key ) {

	const asset = options.assets[ key ];
	if ( asset ) return asset instanceof URL ? asset.href : asset;

	const filesRoot = options.assets.files;
	if ( filesRoot ) {

		return new URL( 'stanford-bunny.fbx', new URL( filesRoot, window.location.href ) ).href;

	}

	throw new Error( `Liquid bunny requires assets.${key} or assets.files.` );

}

async function init() {

	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	camera = new THREE.PerspectiveCamera( 50, width / height, 0.1, 1000 );
	camera.position.set( 0, 25, 70 );
	camera.lookAt( 0, - 20, 0 );

	scene = new THREE.Scene();
	scene.background = new THREE.Color( PALETTES.SPH.background );
	scene.fog = new THREE.Fog( PALETTES.SPH.background, 70, 125 );
	renderer = new THREE.WebGPURenderer( { antialias: true } );
	devtools = registerDevtools( { renderer, container } );
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.shadowMap.transmitted = true;
	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, 1.5 ) );
	renderer.setSize( width, height );
	renderer.toneMapping = THREE.AgXToneMapping;
	renderer.toneMappingExposure = 1.08;
	renderer.domElement.setAttribute( 'role', 'img' );
	renderer.domElement.setAttribute( 'aria-label', 'A liquid Stanford bunny simulated with the PBF solver.' );
	container.appendChild( renderer.domElement );
	await renderer.init();
	shaderCache.container( 'liquid-bunny/solver-and-sdf', liquidBunnyShaderResources );

	// Avoid periodic GPU readbacks while the simulation is running. On a busy
	// PBF queue they stall presentation long enough for the fixed-step solver to
	// catch up several substeps at once, which looks like a global particle shake.

	controls = new OrbitControls( camera, renderer.domElement );
	controls.enabled = false;
	controls.enableDamping = true;
	controls.target.set( 0, - 7, 0 );
	controls.update();

	installPointerEvents();
	createStage();

	const loader = new FBXLoader();
	const fbx = await withAssetLoader( container, [ 'Bunny volume' ], manager => (
		manager.load( 'Bunny volume', onProgress => loader.loadAsync( requireAsset( 'volumeModel' ), onProgress ) )
	) );
	if ( ! mounted ) return;

	let bunnyGeometry;
	fbx.traverse( child => {

		if ( child.isMesh && ! bunnyGeometry ) bunnyGeometry = child.geometry.scale( 0.08, 0.08, 0.08 );

	} );
	if ( ! bunnyGeometry ) throw new Error( 'Stanford bunny asset contains no mesh geometry.' );

	// The sampler initially distributes particles through the bunny, while the
	// PBF rest volume deliberately occupies only part of it. A full-volume rest
	// density behaves like a sealed, completely filled container and cannot fall.
	const bunnyVolume = computeGeometryVolume( bunnyGeometry );
	if ( Number.isFinite( bunnyVolume ) && bunnyVolume > 0 ) {

		const sampledSpacing = Math.cbrt( bunnyVolume / PARTICLE_COUNT );
		pbfParams.spacing = sampledSpacing * Math.cbrt( pbfParams.fluidVolumeFraction );
		pbfParams.h = pbfParams.spacing * 2;

	}

	const bunnyMaterial = new THREE.MeshBasicNodeMaterial( {
		color: PALETTES.SPH.outline,
		side: THREE.FrontSide,
		transparent: true,
		depthWrite: false,
		depthTest: false,
	} );
	bunnyMaterial.opacityNode = fresnel( 2.2, 0.3 ).mul( 0.065 );
	bunnyMesh = new THREE.Mesh( bunnyGeometry, bunnyMaterial );
	bunnyMesh.name = 'LiquidBunnyGuide';
	bunnyMesh.renderOrder = - 9999;
	scene.add( bunnyMesh );

	computeBoundsTree.call( bunnyGeometry );
	const bvh = bunnyGeometry.boundsTree;
	sdfGenerator = new ComputeSDFGenerator( { resolution: 128 } );
	await sdfGenerator.generate( bunnyGeometry, bvh, renderer );
	if ( ! mounted ) return;

	const boundaryOptions = {
		stiffness: 5000.0,
		damping: 0.3,
		threshold: - 0.05,
	};
	sdfConstraints.SPH = new SDFVolumeConstraint( sdfGenerator, boundaryOptions );
	sdfConstraints.PBF = new SDFVolumeConstraint( sdfGenerator, boundaryOptions );

	// One GPU sample pass seeds both solvers. They own independent state and
	// constraint caches, but share the sampled positions and generated bunny SDF.
	sampler = new ComputeBVHSampler( sdfGenerator, renderer, PARTICLE_COUNT, {
		maxAttempts: 64,
		sdfThreshold: boundaryOptions.threshold - pbfParams.particleRadius,
	} );
	sampler.compute();

	const commonOptions = {
		count: PARTICLE_COUNT,
		initialPositions: sampler.positionsBuffer,
		is3D: true,
		domainDimensions: DOMAIN_SIZE,
		mass: sharedParams.mass,
		useDirection: true,
		useMatrices: false,
		useSpatialGrid: viewParams.useSpatialGrid,
		scaleKernelWithDomain: false,
		fixedTimeStep: sharedParams.fixedTimeStep,
	};

	const sph = new SPH( {
		...commonOptions,
		sdfVolumeConstraint: sdfConstraints.SPH,
		h: sphParams.h,
		restDensity: sphParams.restDensity,
		viscosityMu: sphParams.viscosityMu,
		pressureStiffness: sphParams.pressureStiffness,
		maxSpeed: sphParams.maxSpeed,
	} );
	sph.ubos.timeScale.value = solverFlowSpeeds.SPH;
	sph.ubos.maxSpeed.value = sphParams.maxSpeed;

	const pbf = new PBF( {
		...commonOptions,
		sdfVolumeConstraint: sdfConstraints.PBF,
		h: pbfParams.h,
		spacing: pbfParams.spacing,
		particleRadius: pbfParams.particleRadius,
		restDensity: null,
		solverIterations: pbfParams.solverIterations,
		lambdaEpsilon: pbfParams.lambdaEpsilon,
		xsphViscosity: pbfParams.xsphViscosity,
		corrK: pbfParams.corrK,
		corrN: pbfParams.corrN,
	} );
	pbf.ubos.timeScale.value = solverFlowSpeeds.PBF;

	solverViews.SPH = createSolverView( 'SPH', sph );
	solverViews.PBF = createSolverView( 'PBF', pbf );
	// Copy the common sample and initialize derived buffers at the same simulation
	// time before either solver can become active.
	// The first spatial-grid step can resize its buffers and rebuild compute
	// nodes for the next step, so callers can request an extra warm-up step.
	for ( let step = 0; step < options.initializationSteps; step ++ ) {

		await sph.step( renderer, sharedParams.fixedTimeStep );
		await pbf.step( renderer, sharedParams.fixedTimeStep );

	}
	if ( ! mounted ) return;

	captionElement = createCaptionElement();
	container.appendChild( captionElement );
	renderer.domElement.setAttribute( 'aria-describedby', captionElement.id );
	await setupGui();
	applyPointerSettings();
	setActiveSolver( viewParams.solver );

	clock = new THREE.Clock();
	resizeObserver = new ResizeObserver( onResize );
	resizeObserver.observe( container );
	onResize();
	renderer.setAnimationLoop( render );

}

function createStage() {

	stage = new THREE.Group();
	stage.name = 'LiquidBunnyGalleryStage';

	floorMaterial = new THREE.MeshStandardNodeMaterial( {
		color: PALETTES.SPH.floor,
		roughness: 0.96,
		metalness: 0.02,
	} );
	const floor = new THREE.Mesh( new THREE.CircleGeometry( 58, 96 ), floorMaterial );
	floor.rotation.x = - Math.PI / 2;
	floor.position.y = - 20.72;
	floor.receiveShadow = true;
	stage.add( floor );

	plinthMaterial = new THREE.MeshStandardNodeMaterial( {
		color: PALETTES.SPH.plinth,
		roughness: 0.72,
		metalness: 0.12,
	} );
	const plinth = new THREE.Mesh( new THREE.CylinderGeometry( 18, 18.8, 0.82, 96 ), plinthMaterial );
	plinth.position.y = - 20.3;
	plinth.receiveShadow = true;
	stage.add( plinth );

	rimMaterial = new THREE.MeshStandardNodeMaterial( {
		color: PALETTES.SPH.base,
		roughness: 0.4,
		metalness: 0.66,
	} );
	const rim = new THREE.Mesh( new THREE.TorusGeometry( 18.05, 0.07, 8, 160 ), rimMaterial );
	rim.rotation.x = Math.PI / 2;
	rim.position.y = - 19.88;
	stage.add( rim );

	stage.add( new THREE.HemisphereLight( 0xe8eef2, 0x24170f, 1.25 ) );

	const key = new THREE.DirectionalLight( 0xffe4bd, 3.8 );
	key.position.set( - 24, 34, 30 );
	key.castShadow = true;
	key.shadow.mapSize.set( 1024, 1024 );
	key.shadow.camera.near = 1;
	key.shadow.camera.far = 120;
	key.shadow.camera.left = - 36;
	key.shadow.camera.right = 36;
	key.shadow.camera.top = 36;
	key.shadow.camera.bottom = - 36;
	key.shadow.bias = - 0.0004;
	stage.add( key );

	accentLight = new THREE.PointLight( PALETTES.SPH.highlight, 34, 72, 1.7 );
	accentLight.position.set( 22, 4, 18 );
	stage.add( accentLight );

	scene.add( stage );

}

function createSolverView( key, fluid ) {

	const palette = PALETTES[ key ];
	const geometry = new TriangleGeometry();
	const material = new THREE.MeshPhysicalNodeMaterial( {
		color: palette.base,
		side: THREE.FrontSide,
		metalness: key === 'SPH' ? 0.36 : 0.24,
		roughness: key === 'SPH' ? 0.28 : 0.2,
	} );
	material.name = `${key} liquid impostors`;

	const mesh = new THREE.Mesh( geometry, material );
	mesh.name = `${key}LiquidBunny`;
	mesh.count = PARTICLE_COUNT;
	mesh.frustumCulled = false;
	mesh.raycast = () => {};
	mesh.castShadow = true;
	scene.add( mesh );

	const culler = new ComputeInstanceCulling( {
		renderer,
		count: PARTICLE_COUNT,
		indexCount: 3,
		refPosition: fluid.buffers.positions.value,
		sortObjects: false,
		boundingSphere: { center: new THREE.Vector3(), radius: PARTICLE_RADIUS },
	} );
	culler.attachGeometry( geometry );
	mesh.onBeforeRender = ( _renderer, _scene, renderCamera ) => {

		culler.setCameraUniforms( renderCamera );
		culler.update();

	};

	const culledIndex = instanceCullingIndex( culler );
	const direction = fluid.buffers.directions.element( culledIndex ).xyz.toVar( `${key.toLowerCase()}ImpostorDirection` );
	const speed = direction.length();
	material.positionNode = sphereImpostorPosition( {
		position: fluid.buffers.positions.element( culledIndex ),
		radius: PARTICLE_RADIUS,
	} );
	material.normalNode = sphereImpostorNormal();
	material.opacityNode = sphereImpostorAlpha();
	material.alphaTest = 0.5;
	material.alphaToCoverage = true;
	material.castShadowNode = sphereImpostorShadow();
	material.colorNode = varying( speed.smoothstep( 3, 13 ).mix(
		materialColor,
		color( palette.highlight ).mul( 1.35 )
	) );

	return { key, fluid, geometry, material, mesh, culler };

}

function getActiveView() {

	return solverViews[ viewParams.solver ];

}

function setActiveSolver( key ) {

	if ( ! solverViews[ key ] ) return;
	viewParams.solver = key;
	sharedParams.timeScale = solverFlowSpeeds[ key ];
	solverViews[ key ].fluid.ubos.timeScale.value = sharedParams.timeScale;
	flowSpeedController?.max( FLOW_SPEED_LIMITS[ key ] );
	flowSpeedController?.updateDisplay();

	for ( const [ solverKey, view ] of Object.entries( solverViews ) ) {

		if ( ! view ) continue;
		view.mesh.visible = solverKey === key;
		view.fluid.ubos.rayOrigin.value.copy( POINTER_OFFSCREEN );

	}

	const palette = PALETTES[ key ];
	scene.background.set( palette.background );
	scene.fog?.color.set( palette.background );
	bunnyMesh.material.color.set( palette.outline );
	floorMaterial?.color.set( palette.floor );
	plinthMaterial?.color.set( palette.plinth );
	rimMaterial?.color.set( palette.base );
	if ( accentLight ) accentLight.color.set( palette.highlight );
	renderer?.domElement.setAttribute( 'aria-label', `A liquid Stanford bunny simulated with the ${key} solver.` );
	updateCaption();
	toggleHelper( viewParams.showSpatialGridHelper );

}

function setFlowSpeed( value ) {

	const key = viewParams.solver;
	const speed = Math.min( Math.max( Number( value ) || 0, 0 ), FLOW_SPEED_LIMITS[ key ] );
	sharedParams.timeScale = speed;
	solverFlowSpeeds[ key ] = speed;
	if ( solverViews[ key ] ) solverViews[ key ].fluid.ubos.timeScale.value = speed;
	pausedFlowSpeed = null;
	flowSpeedController?.updateDisplay();
	updateCaption();
	return speed;

}

function pause() {

	const view = getActiveView();
	if ( ! view || sharedParams.timeScale === 0 ) return;
	pausedFlowSpeed = sharedParams.timeScale;
	sharedParams.timeScale = 0;
	view.fluid.ubos.timeScale.value = 0;
	flowSpeedController?.updateDisplay();
	updateCaption();

}

function resume() {

	const speed = pausedFlowSpeed ?? solverFlowSpeeds[ viewParams.solver ] ?? 1;
	pausedFlowSpeed = null;
	setFlowSpeed( speed > 0 ? speed : 1 );

}

function getDiagnostics() {

	return {
		solver: viewParams.solver,
		flowSpeed: sharedParams.timeScale,
		particleCount: PARTICLE_COUNT,
		spatialGrid: viewParams.useSpatialGrid,
		initializationSteps: options?.initializationSteps ?? 0,
		ready: Boolean( mounted && renderer && solverViews.SPH && solverViews.PBF ),
	};

}

function createCaptionElement() {

	const element = createExampleCaption( {
		accent: '#e0a23e',
		ariaLabel: 'Liquid bunny simulation details',
		bottom: 'clamp(62px, 7vw, 76px)',
		label: 'Simulation details',
		content: `
			<span class="tb-example-caption__eyebrow">Liquid bunny</span>
			<strong class="tb-example-caption__title" data-solver></strong>
			<span class="tb-example-caption__note" data-detail></span>
		`,
	} );
	element.id = 'liquid-bunny-caption';
	element.setAttribute( 'aria-live', 'polite' );
	return element;

}

function updateCaption() {

	if ( ! captionElement ) return;
	const palette = PALETTES[ viewParams.solver ];
	captionElement.style.setProperty( '--tb-caption-accent', new THREE.Color( palette.base ).getStyle() );
	captionElement.querySelector( '[data-solver]' ).textContent = `${viewParams.solver} · ${palette.label}`;
	captionElement.querySelector( '[data-solver]' ).style.color = new THREE.Color( palette.highlight ).getStyle();
	captionElement.querySelector( '[data-detail]' ).textContent = sharedParams.timeScale === 0
		? 'Flow paused · raise Flow speed to animate'
		: `${palette.detail} · drag through the silhouette`;

}

async function setupGui() {

	gui?.destroy();
	flowSpeedController = null;
	gui = await createExampleGui( 'Liquid bunny' );
	if ( ! mounted ) {

		gui.destroy();
		gui = null;
		return;

	}
	if ( container.clientWidth < 620 ) gui.close();

	gui.add( viewParams, 'solver', [ 'PBF', 'SPH' ] ).name( 'Solver' ).onChange( setActiveSolver );
	flowSpeedController = gui.add(
		sharedParams,
		'timeScale',
		0,
		FLOW_SPEED_LIMITS[ viewParams.solver ],
		0.01
	).name( 'Flow speed' ).onChange( value => {

		setFlowSpeed( value );

	} );
	gui.add( viewParams, 'pointerEnabled' ).name( 'Stir with pointer' ).onChange( applyPointerSettings );
	gui.add( controls, 'enabled' ).name( 'Orbit view' );

	if ( options.debug ) setupEngineeringGui();

}

function setupEngineeringGui() {

	const engineering = gui.addFolder( 'Engineering' );
	const shared = engineering.addFolder( 'Shared simulation' );
	shared.add( viewParams, 'useSpatialGrid' ).name( 'Spatial grid' ).onChange( enabled => {

		forEachFluid( fluid => fluid.setSpatialGridEnabled( enabled ) );
		toggleHelper( viewParams.showSpatialGridHelper );

	} );
	shared.add( viewParams, 'showSpatialGridHelper' ).name( 'Show grid cells' ).onChange( toggleHelper );
	shared.add( sharedParams, 'mass', 0.01, 10, 0.01 ).name( 'Mass' ).onChange( value => {

		forEachFluid( fluid => fluid.setMass( value ) );

	} );
	shared.add( sharedParams, 'fixedTimeStep', 1 / 240, 1 / 30, 0.001 ).name( 'Fixed step' ).onChange( value => {

		forEachFluid( fluid => { fluid.fixedTimeStep = value; } );

	} );

	const sphFolder = engineering.addFolder( 'SPH · force solver' );
	sphFolder.add( sphParams, 'h', 0.5, 4, 0.05 ).name( 'Smoothing radius' ).onChange( value => {

		solverViews.SPH.fluid.setSmoothingRadius( value );

	} );
	sphFolder.add( sphParams, 'restDensity', 0.01, 10, 0.01 ).name( 'Rest density' ).onChange( value => {

		solverViews.SPH.fluid.setRestDensity( value );

	} );
	sphFolder.add( sphParams, 'viscosityMu', 0, 5, 0.01 ).name( 'Viscosity' ).onChange( value => {

		solverViews.SPH.fluid.ubos.viscosityMu.value = value;

	} );
	sphFolder.add( sphParams, 'pressureStiffness', 1, 5000, 1 ).name( 'Pressure stiffness' ).onChange( value => {

		solverViews.SPH.fluid.ubos.pressureStiffness.value = value;

	} );
	sphFolder.add( sphParams, 'maxSpeed', 1, 50, 0.5 ).name( 'Maximum speed' ).onChange( value => {

		solverViews.SPH.fluid.ubos.maxSpeed.value = value;

	} );

	const pbfFolder = engineering.addFolder( 'PBF · constraint solver' );
	pbfFolder.add( pbfParams, 'h', 0.5, 4, 0.05 ).name( 'Smoothing radius' ).onChange( value => {

		solverViews.PBF.fluid.setSmoothingRadius( value );

	} );
	pbfFolder.add( pbfParams, 'solverIterations', 1, 10, 1 ).name( 'Iterations' ).onChange( value => {

		solverViews.PBF.fluid.solverIterations = Math.floor( value );

	} );
	pbfFolder.add( pbfParams, 'lambdaEpsilon', 0.1, 200, 0.1 ).name( 'Lambda epsilon' ).onChange( value => {

		solverViews.PBF.fluid.ubos.lambdaEpsilon.value = value;

	} );
	pbfFolder.add( pbfParams, 'xsphViscosity', 0, 1, 0.01 ).name( 'XSPH viscosity' ).onChange( value => {

		solverViews.PBF.fluid.ubos.xsphViscosity.value = value;

	} );
	pbfFolder.add( pbfParams, 'corrK', 0, 0.02, 0.0001 ).name( 'Tensile correction' ).onChange( value => {

		solverViews.PBF.fluid.ubos.sCorrK.value = value;

	} );
	pbfFolder.add( pbfParams, 'corrN', 1, 8, 0.1 ).name( 'Correction exponent' ).onChange( value => {

		solverViews.PBF.fluid.ubos.sCorrN.value = value;

	} );

	const pointerFolder = engineering.addFolder( 'Pointer force' );
	pointerFolder.add( viewParams, 'pointerRadius', 1, 40, 1 ).name( 'Radius' ).onChange( applyPointerSettings );
	pointerFolder.add( viewParams, 'pointerStrength', 0, 400, 1 ).name( 'Strength' ).onChange( applyPointerSettings );

	const cullingFolder = engineering.addFolder( 'GPU culling' );
	solverViews.SPH.culler.attachGUI( cullingFolder.addFolder( 'SPH particles' ) );
	solverViews.PBF.culler.attachGUI( cullingFolder.addFolder( 'PBF particles' ) );

	pbfFolder.close();
	engineering.close();

}

function forEachFluid( callback ) {

	for ( const view of Object.values( solverViews ) ) {

		if ( view ) callback( view.fluid );

	}

}

function applyPointerSettings() {

	forEachFluid( fluid => {

		fluid.ubos.pointerEnabled.value = viewParams.pointerEnabled ? 1 : 0;
		fluid.ubos.pointerRadius.value = viewParams.pointerRadius;
		fluid.ubos.pointerStrength.value = viewParams.pointerStrength;

	} );

}

function installPointerEvents() {

	renderer.domElement.addEventListener( 'pointermove', onPointerMove );
	renderer.domElement.addEventListener( 'pointerdown', onPointerMove );
	renderer.domElement.addEventListener( 'pointerup', onPointerLeave );
	renderer.domElement.addEventListener( 'pointerleave', onPointerLeave );
	renderer.domElement.addEventListener( 'pointercancel', onPointerLeave );

}

function removePointerEvents() {

	renderer?.domElement.removeEventListener( 'pointermove', onPointerMove );
	renderer?.domElement.removeEventListener( 'pointerdown', onPointerMove );
	renderer?.domElement.removeEventListener( 'pointerup', onPointerLeave );
	renderer?.domElement.removeEventListener( 'pointerleave', onPointerLeave );
	renderer?.domElement.removeEventListener( 'pointercancel', onPointerLeave );

}

function onPointerMove( event ) {

	if ( event.isPrimary === false || ! renderer ) return;
	const rect = renderer.domElement.getBoundingClientRect();
	pointer.x = ( ( event.clientX - rect.left ) / Math.max( rect.width, 1 ) ) * 2 - 1;
	pointer.y = - ( ( event.clientY - rect.top ) / Math.max( rect.height, 1 ) ) * 2 + 1;
	pointerActive = true;

}

function onPointerLeave() {

	pointerActive = false;
	getActiveView()?.fluid.ubos.rayOrigin.value.copy( POINTER_OFFSCREEN );

}

function updatePointerRay( fluid ) {

	if ( pointerActive && viewParams.pointerEnabled ) {

		raycaster.setFromCamera( pointer, camera );
		fluid.ubos.rayOrigin.value.copy( raycaster.ray.origin );
		fluid.ubos.rayDirection.value.copy( raycaster.ray.direction ).normalize();

	} else {

		fluid.ubos.rayOrigin.value.copy( POINTER_OFFSCREEN );

	}

}

function toggleHelper( show ) {

	disposeHelper();
	const view = getActiveView();
	if ( show && view?.fluid.grid ) {

		helper = new SpatialGridHelper( view.fluid, false );
		scene.add( helper );

	}

}

function disposeHelper() {

	if ( ! helper ) return;
	helper.traverse( object => {

		object.geometry?.dispose?.();
		if ( Array.isArray( object.material ) ) object.material.forEach( material => material.dispose() );
		else object.material?.dispose?.();

	} );
	helper.dispose();
	scene?.remove( helper );
	helper = null;

}

async function render() {

	if ( framePending || ! mounted ) return;
	framePending = true;
	const generation = renderGeneration;

	try {

		const view = getActiveView();
		if ( ! view ) return;
		const delta = Math.min( clock?.getDelta() ?? 0, 0.05 );
		updatePointerRay( view.fluid );
		await view.fluid.step( renderer, delta );
		if ( ! mounted || generation !== renderGeneration || getActiveView() !== view ) return;

		controls.update();
		renderer.render( scene, camera );


	} finally {

		framePending = false;

	}

}

function onResize() {

	if ( ! container || ! renderer || ! camera ) return;
	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	renderer.setSize( width, height );
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	frameBunny();

}

function frameBunny( force = false ) {

	if ( ! container || ! camera || ! controls ) return;
	const aspect = Math.max( 1, container.clientWidth ) / Math.max( 1, container.clientHeight );
	const portrait = aspect < 0.8;
	if ( ! force && portraitLayout === portrait ) return;
	portraitLayout = portrait;

	const direction = new THREE.Vector3( 0, 0.416, 0.91 ).normalize();
	const distance = portrait ? 118 : 77;
	scene.fog.near = distance - 7;
	scene.fog.far = distance + 48;
	controls.target.set( 0, - 7, 0 );
	camera.position.copy( controls.target ).addScaledVector( direction, distance );
	controls.minDistance = portrait ? 84 : 52;
	controls.maxDistance = portrait ? 150 : 104;
	controls.update();

}

function disposeSceneObject( object ) {

	if ( ! object ) return;
	object.traverse( child => {

		child.geometry?.dispose?.();
		if ( Array.isArray( child.material ) ) child.material.forEach( material => material.dispose() );
		else child.material?.dispose?.();

	} );
	scene?.remove( object );

}

function disposeSolverView( key ) {

	const view = solverViews[ key ];
	if ( ! view ) return;
	view.mesh.onBeforeRender = () => {};
	scene?.remove( view.mesh );
	view.culler.dispose();
	view.geometry.dispose();
	view.material.dispose();
	view.fluid.dispose();
	solverViews[ key ] = null;

}

export function unmount() {

	mounted = false;
	renderGeneration ++;
	renderer?.setAnimationLoop( null );
	resizeObserver?.disconnect();
	resizeObserver = null;
	removePointerEvents();
	pointerActive = false;

	disposeHelper();
	disposeSolverView( 'SPH' );
	disposeSolverView( 'PBF' );

	sampler?.dispose?.();
	sampler = null;
	sdfConstraints.SPH?.dispose();
	sdfConstraints.SPH = null;
	sdfConstraints.PBF?.dispose();
	sdfConstraints.PBF = null;
	sdfGenerator?.dispose?.();
	sdfGenerator = null;

	disposeSceneObject( bunnyMesh );
	bunnyMesh = null;
	disposeSceneObject( stage );
	stage = null;
	floorMaterial = null;
	plinthMaterial = null;
	rimMaterial = null;
	accentLight = null;

	captionElement?.remove();
	captionElement = null;
	gui?.destroy();
	gui = null;
	flowSpeedController = null;
	controls?.dispose();
	controls = null;

	if ( renderer ) {

		devtools?.dispose();
		devtools = null;
		renderer.dispose();
		renderer.domElement.remove();
		renderer = null;

	}

	if ( container && containerStyle ) Object.assign( container.style, containerStyle );
	containerStyle = null;
	container = null;
	scene = null;
	camera = null;
	clock = null;
	framePending = false;
	portraitLayout = null;
	pausedFlowSpeed = null;
	options = null;

}
