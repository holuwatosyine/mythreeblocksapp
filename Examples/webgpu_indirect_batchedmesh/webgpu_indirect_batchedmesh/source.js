import * as THREE from 'three/webgpu';
import { registerDevtools } from 'three-blocks/devtools';
import {
	color,
	float,
	floor,
	Fn,
	fract,
	hash,
	instanceIndex,
	mat4,
	mix,
	mod,
	positionWorld,
	step,
	storage,
	texture,
	uint,
	uniform,
	uv,
	varying,
	varyingProperty,
	vec2,
	vec4,
} from 'three/tsl';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CityGenerator } from 'three/addons/generators/CityGenerator.js';
import { SkyMesh } from 'three/addons/objects/SkyMesh.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

import { IndirectBatchedMesh } from 'three-blocks';
import { shaderCache } from 'three-blocks/shaders';
import { createExampleGui } from '../helpers/exampleGui.js';
import {
	ARCHETYPE_DEFINITIONS,
	CITY_BASE_PARAMETERS,
	CITY_SEED,
	createSlotAssignment,
	createTowerShapeValues,
	decodeCityCell,
	GRID_SIZE_OPTIONS,
	HASH_COORDINATE_OFFSET,
	PARK_ARCHETYPE,
	wrapCityRingBlock,
} from './city-data.js';

const URL_PARAMETERS = new URLSearchParams( window.location.search );
const DEBUG = URL_PARAMETERS.has( 'debug' );
const REDUCED_MOTION = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
const MODE_INDIRECT = 'IndirectBatchedMesh';
const MODE_BATCHED = 'BatchedMesh';
const MODE_INSTANCED = 'InstancedMesh';
const MODE_MESHES = 'Individual meshes';
const VIEW_SECTOR = 'Sector view';
const VIEW_OVERVIEW = 'Whole city';
const VIEW_STREET = 'Street level';
const UI_UPDATE_INTERVAL = 250;
const FACADE_ATLAS_COLUMNS = 2;
const FACADE_ATLAS_ROWS = 2;
const FACADE_TILE_WIDTH = 96;
const FACADE_TILE_HEIGHT = 192;
const ARCHETYPE_COUNT = ARCHETYPE_DEFINITIONS.length;
const INDIRECT_GENERATION_DISPATCH_COUNT = 1;
const INDIRECT_CULLING_DISPATCH_COUNT = 9;
const INSTANCED_GENERATION_DISPATCH_COUNT = ARCHETYPE_COUNT;
const METRIC_WINDOW = 120;
const METRIC_WARMUP_FRAMES = 18;
const SECTOR_TRAVEL_DIRECTION = new THREE.Vector2( 1, 0.38 ).normalize();
const STREET_TRAVEL_DIRECTION = new THREE.Vector2( 0, 1 );

let container;
let containerStyle;
let renderer;
let devtools;
let scene;
let camera;
let controls;
let gui;
let renderingController;
let cullingController;
let orbitController;
let gridController;
let resizeObserver;
let cityLayout;
let cityParameters;
let slotAssignment;
let slotCellIndicesSB;
let sourceGeometries = [];
let indirectCity;
let batchedCity;
let instancedCity;
let meshCity;
let meshRepresentative;
let indirectMaterial;
let batchedMaterial;
let instancedMaterial;
let meshMaterial;
let cityGenerationCompute;
let instancedGenerationComputes = [];
let instancedMatrixAttributes = [];
let cityTravelNode;
let facadeTextures;
let stage;
let road;
let hud;
let hudStyle;
let hudEyebrow;
let hudHeadline;
let hudCandidates;
let hudDrawn;
let hudSubmissions;
let hudCpu;
let hudGpu;
let hudMode;
let hudBreakdown;
let hudStatus;
let toast;
let toastTimeout = 0;
let portraitLayout = null;
let baselineDrawCount = 0;
let batchedVisibleCount = 0;
let lastHudState = '';
let nextUiUpdate = 0;
let previousFrameTime = 0;
let batchedOriginBlockX = Number.NaN;
let batchedOriginBlockZ = Number.NaN;
let meshOriginBlockX = Number.NaN;
let meshOriginBlockZ = Number.NaN;
let indirectGenerationDirty = true;
let instancedGenerationDirty = true;
let mounted = false;
let rebuilding = false;
let compilingMode = '';
let modeRequest = 0;
let rebuildRequest = 0;
let timestampSupported = false;
let statsPending = false;
let statsPromise = null;
let metricWarmup = METRIC_WARMUP_FRAMES;
let lastGpuMilliseconds = Number.NaN;
let lastSurvivorCount = 0;
let perArchetypeSurvivors = new Uint32Array( ARCHETYPE_COUNT );
let frameSamples = [];
let submitSamples = [];
let gpuSamples = [];
let compiledModes = new Set();
const warningModes = new Set();

const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();
const rotation = new THREE.Euler();
const cityTravel = new THREE.Vector2();
const towerMatrix = new THREE.Matrix4();

const params = {
	rendering: MODE_INDIRECT,
	culling: true,
	gridSize: GRID_SIZE_OPTIONS[ 0 ],
	view: VIEW_SECTOR,
	autoOrbit: ! REDUCED_MOTION,
	travel: ! REDUCED_MOTION,
	travelSpeed: 42,
	hudStats: true,
	exposure: 0.68,
};

function towerCount() {

	return slotAssignment?.cellCount ?? 0;

}

export async function mount( containerElement, options = {} ) {

	container = containerElement;
	params.rendering = normalizeMode( options.mode ) ?? MODE_INDIRECT;
	params.culling = options.culling ?? true;
	params.gridSize = GRID_SIZE_OPTIONS.includes( options.gridSize ) ? options.gridSize : GRID_SIZE_OPTIONS[ 0 ];
	params.view = normalizeView( options.initialView ) ?? VIEW_SECTOR;
	params.autoOrbit = options.autoOrbit ?? ! REDUCED_MOTION;
	params.travel = options.travel ?? ! REDUCED_MOTION;
	params.travelSpeed = Number.isFinite( options.travelSpeed ) ? options.travelSpeed : 42;
	params.hudStats = options.hudStats ?? true;
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
	return createExampleHandle();

}

function normalizeMode( mode ) {

	const modes = {
		indirect: MODE_INDIRECT,
		batched: MODE_BATCHED,
		instanced: MODE_INSTANCED,
		meshes: MODE_MESHES,
	};
	return Object.values( modes ).includes( mode ) ? mode : modes[ mode ];

}

function normalizeView( view ) {

	const views = {
		sector: VIEW_SECTOR,
		street: VIEW_STREET,
		overview: VIEW_OVERVIEW,
	};
	return Object.values( views ).includes( view ) ? view : views[ view ];

}

async function init() {

	configureCitySize( params.gridSize );
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x40515e );
	scene.fog = new THREE.Fog( 0x8b9da7, 950, 3450 );
	camera = new THREE.PerspectiveCamera( 48, 1, 1, 3800 );

	renderer = new THREE.WebGPURenderer( { antialias: false, trackTimestamp: true } );
	devtools = registerDevtools( { renderer, container } );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, 1 ) );
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = params.exposure;
	renderer.domElement.setAttribute( 'role', 'img' );
	renderer.domElement.setAttribute(
		'aria-label',
		'Endless procedural city comparing GPU-driven IndirectBatchedMesh, native BatchedMesh, eight InstancedMesh pools, and individual Mesh objects.'
	);
	container.appendChild( renderer.domElement );
	await renderer.init();
	timestampSupported = renderer.backend?.trackTimestamp === true;

	if ( ! mounted ) return;

	controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true;
	controls.dampingFactor = 0.05;
	controls.enablePan = false;
	controls.autoRotate = params.autoOrbit;
	controls.autoRotateSpeed = 0.22;
	controls.minPolarAngle = 0.44;
	controls.maxPolarAngle = 1.3;

	cityTravelNode = uniform( cityTravel ).setName( 'endlessCityTravel' );
	facadeTextures = createFacadeTextures();
	sourceGeometries = createPrototypeGeometries();
	createStage();
	createHud();
	createSizeDependentMaterials();
	createIndirectCity();
	renderer.compute( cityGenerationCompute );
	indirectGenerationDirty = false;
	scene.add( indirectCity );

	await setupGui();
	if ( ! mounted ) return;

	resizeObserver = new ResizeObserver( resize );
	resizeObserver.observe( container );
	resize();
	await compileMode( MODE_INDIRECT );
	if ( ! mounted ) return;

	resetMetrics();
	previousFrameTime = performance.now();
	renderer.setAnimationLoop( render );

}

function configureCitySize( blocks ) {

	cityParameters = {
		...CITY_BASE_PARAMETERS,
		blocksX: blocks,
		blocksZ: blocks,
	};
	cityLayout = new CityGenerator( cityParameters ).layout;
	slotAssignment = createSlotAssignment( blocks, cityParameters.lotsX, cityParameters.lotsZ );
	slotCellIndicesSB = new THREE.StorageBufferAttribute( slotAssignment.slotCellIndices, 1 );

}

function createStage() {

	stage = new THREE.Group();
	stage.name = 'CopperHourCityStage';

	const sky = new SkyMesh();
	sky.name = 'CopperHourSky';
	sky.scale.setScalar( 18000 );
	sky.frustumCulled = false;
	sky.material.fog = false;
	sky.turbidity.value = 9;
	sky.rayleigh.value = 2.1;
	sky.mieCoefficient.value = 0.012;
	sky.mieDirectionalG.value = 0.9;
	sky.cloudCoverage.value = 0.28;
	sky.cloudDensity.value = 0.34;
	sky.cloudSpeed.value = 0;

	const sun = new THREE.Vector3().setFromSphericalCoords(
		1,
		THREE.MathUtils.degToRad( 78 ),
		THREE.MathUtils.degToRad( 238 )
	);
	sky.sunPosition.value.copy( sun );
	stage.add( sky );

	road = new THREE.Mesh(
		createRoadGeometry(),
		new THREE.MeshStandardNodeMaterial( {
			color: 0x202830,
			metalness: 0.08,
			roughness: 0.72,
		} )
	);
	road.name = 'CityGround';
	road.position.y = - 0.08;
	stage.add( road );

	const sunlight = new THREE.DirectionalLight( 0xffb27d, 4.6 );
	sunlight.name = 'LowCopperSun';
	sunlight.position.copy( sun ).multiplyScalar( 4200 );
	const skylight = new THREE.HemisphereLight( 0xbad7e3, 0x181d25, 1.85 );
	skylight.name = 'DuskFill';
	const horizonFill = new THREE.DirectionalLight( 0x79a7c3, 0.86 );
	horizonFill.position.set( - 1600, 900, 1400 );
	stage.add( sunlight, skylight, horizonFill );
	scene.add( stage );

}

function createRoadGeometry() {

	const width = cityLayout.cityW + cityLayout.street * 4;
	const depth = cityLayout.cityD + cityLayout.street * 4;
	return new THREE.PlaneGeometry( width, depth ).rotateX( - Math.PI / 2 );

}

function updateRoadGeometry() {

	if ( ! road ) return;
	road.geometry.dispose();
	road.geometry = createRoadGeometry();

}

function createSizeDependentMaterials() {

	indirectMaterial = createTowerMaterial( 'Indirect city material', true );

}

function geometryReservations() {

	let vertices = 0;
	let indices = 0;
	for ( const geometry of sourceGeometries ) {

		vertices += geometry.getAttribute( 'position' ).count;
		indices += geometry.getIndex()?.count ?? 0;

	}
	return { vertices, indices };

}

function addArchetypePool( city ) {

	city.beginBulkUpdate?.();
	const geometryIds = sourceGeometries.map( geometry => city.addGeometry( geometry ) );
	for ( const range of slotAssignment.ranges ) {

		for ( let index = 0; index < range.count; index ++ ) city.addInstance( geometryIds[ range.archetypeId ] );

	}
	city.endBulkUpdate?.();
	return geometryIds;

}

function createIndirectCity() {

	const count = towerCount();
	const reservations = geometryReservations();
	indirectCity = new IndirectBatchedMesh(
		count,
		Math.max( 1, reservations.vertices ),
		Math.max( 1, reservations.indices ),
		indirectMaterial
	);
	indirectCity.name = 'GPUDrivenCity';
	indirectCity.perObjectFrustumCulled = params.culling;
	indirectCity.raycast = () => {};
	addArchetypePool( indirectCity );
	indirectCity.enableInternalCulling( renderer );
	indirectCity.culler.frustumPadXY.value = 0.012;
	indirectCity.culler.frustumPadZFar.value = 0.018;
	cityGenerationCompute = createCityGenerationCompute();
	indirectGenerationDirty = true;
	lastSurvivorCount = count;
	perArchetypeSurvivors = new Uint32Array( ARCHETYPE_COUNT );
	shaderCache.container( 'endless-city/generation-and-culling', {
		get slotCellIndices() { return slotCellIndicesSB; },
		get geometryIds() { return indirectCity.geometryIdSB; },
		get matrices() { return indirectCity.matricesSB; },
		get generationCompute() { return cityGenerationCompute; },
		get culler() { return indirectCity.culler; },
	} );

}

function createInstancedCity() {

	instancedMaterial = createTowerMaterial( 'Instanced city material' );
	instancedCity = new THREE.Group();
	instancedCity.name = 'DirectInstancedCity';
	instancedMatrixAttributes = [];

	for ( const range of slotAssignment.ranges ) {

		const matrices = new THREE.StorageInstancedBufferAttribute( range.count, 16 );
		const mesh = new THREE.InstancedMesh(
			sourceGeometries[ range.archetypeId ],
			instancedMaterial,
			range.count
		);
		mesh.name = `Instanced_${ ARCHETYPE_DEFINITIONS[ range.archetypeId ].key }`;
		mesh.instanceMatrix = matrices;
		mesh.frustumCulled = false;
		mesh.raycast = () => {};
		instancedMatrixAttributes.push( matrices );
		instancedCity.add( mesh );

	}
	instancedGenerationComputes = createInstancedGenerationComputes();
	instancedGenerationDirty = true;

}

function createBatchedCity() {

	batchedMaterial = createTowerMaterial( 'Native BatchedMesh city material' );
	const reservations = geometryReservations();
	batchedCity = new THREE.BatchedMesh(
		towerCount(),
		Math.max( 1, reservations.vertices ),
		Math.max( 1, reservations.indices ),
		batchedMaterial
	);
	batchedCity.name = 'CPUDrivenBatchedCity';
	batchedCity.perObjectFrustumCulled = true;
	batchedCity.sortObjects = false;
	batchedCity.raycast = () => {};
	addArchetypePool( batchedCity );
	batchedCity.onAfterRender = () => {

		batchedVisibleCount = batchedCity?._multiDrawCount ?? 0;

	};
	batchedOriginBlockX = Number.NaN;
	batchedOriginBlockZ = Number.NaN;
	updateCpuCity( MODE_BATCHED, true );

}

function createMeshCity() {

	meshMaterial = createTowerMaterial( 'Individual-mesh city material' );
	meshCity = new THREE.Group();
	meshCity.name = 'IndividualMeshCity';
	meshRepresentative = null;

	for ( let slotIndex = 0; slotIndex < towerCount(); slotIndex ++ ) {

		const archetypeId = slotAssignment.slotArchetypeIds[ slotIndex ];
		const tower = new THREE.Mesh( sourceGeometries[ archetypeId ], meshMaterial );
		writeTowerMatrix( slotIndex, 0, 0, tower.matrix );
		tower.matrixAutoUpdate = false;
		tower.frustumCulled = true;
		tower.raycast = () => {};
		tower.onBeforeRender = countBaselineDraw;
		meshCity.add( tower );
		meshRepresentative ??= tower;

	}
	meshOriginBlockX = 0;
	meshOriginBlockZ = 0;
	updateCpuCity( MODE_MESHES, true );

}

function createCityGenerationCompute() {

	const count = towerCount();
	const cellIndices = storage( slotCellIndicesSB, 'uint', count ).setName( 'endlessCitySlotCells' );
	const archetypeIds = storage( indirectCity.geometryIdSB, 'uint', count ).setName( 'endlessCityArchetypes' );
	const matrices = storage( indirectCity.matricesSB, 'mat4', count ).setName( 'endlessCityIndirectMatrices' );

	return Fn( () => {

		const cellIndex = cellIndices.element( instanceIndex );
		const archetypeId = archetypeIds.element( instanceIndex );
		matrices.element( instanceIndex ).assign( createTowerMatrixNode( cellIndex, archetypeId ) );

	} )().compute( count ).setName( 'EndlessCity_GenerateIndirectMatrices' );

}

function createInstancedGenerationComputes() {

	const count = towerCount();
	const cellIndices = storage( slotCellIndicesSB, 'uint', count ).setName( 'endlessCityInstancedSlotCells' );
	return slotAssignment.ranges.map( ( range, rangeIndex ) => {

		const matrices = storage( instancedMatrixAttributes[ rangeIndex ], 'mat4', range.count )
			.setName( `endlessCityInstancedMatrices_${ rangeIndex }` );
		return Fn( () => {

			const slotIndex = uint( range.start ).add( instanceIndex );
			const cellIndex = cellIndices.element( slotIndex );
			matrices.element( instanceIndex ).assign( createTowerMatrixNode( cellIndex, uint( range.archetypeId ) ) );

		} )().compute( range.count ).setName( `EndlessCity_Generate_${ ARCHETYPE_DEFINITIONS[ rangeIndex ].key }` );

	} );

}

function createTowerMatrixNode( cellIndex, archetypeId ) {

	const linearIndex = float( cellIndex );
	const gridWidth = cityParameters.blocksX * cityParameters.lotsX;
	const gridX = mod( linearIndex, gridWidth );
	const gridZ = floor( linearIndex.div( gridWidth ) );
	const blockX = floor( gridX.div( cityParameters.lotsX ) );
	const blockZ = floor( gridZ.div( cityParameters.lotsZ ) );
	const lotX = mod( gridX, cityParameters.lotsX );
	const lotZ = mod( gridZ, cityParameters.lotsZ );
	const periodX = cityLayout.blockW + cityLayout.street;
	const periodZ = cityLayout.blockD + cityLayout.street;
	const travelBlocksX = cityTravelNode.x.div( periodX );
	const travelBlocksZ = cityTravelNode.y.div( periodZ );
	const originBlockX = floor( travelBlocksX );
	const originBlockZ = floor( travelBlocksZ );
	const ringBlockX = mod( blockX.sub( originBlockX ), cityParameters.blocksX );
	const ringBlockZ = mod( blockZ.sub( originBlockZ ), cityParameters.blocksZ );
	const worldBlockX = ringBlockX.sub( cityParameters.blocksX * 0.5 ).add( originBlockX );
	const worldBlockZ = ringBlockZ.sub( cityParameters.blocksZ * 0.5 ).add( originBlockZ );
	const worldLotX = worldBlockX.mul( cityParameters.lotsX ).add( lotX );
	const worldLotZ = worldBlockZ.mul( cityParameters.lotsZ ).add( lotZ );
	const shape = createTowerShapeNodes( worldLotX, worldLotZ, worldBlockX, worldBlockZ, archetypeId );
	const x = float( - cityLayout.cityW * 0.5 )
		.add( ringBlockX.mul( periodX ) )
		.add( lotX.add( 0.5 ).mul( cityLayout.lot ) )
		.sub( fract( travelBlocksX ).mul( periodX ) );
	const z = float( - cityLayout.cityD * 0.5 )
		.add( ringBlockZ.mul( periodZ ) )
		.add( lotZ.add( 0.5 ).mul( cityLayout.lot ) )
		.sub( fract( travelBlocksZ ).mul( periodZ ) );
	const angle = shape.quarterTurn.mul( Math.PI * 0.5 );
	const sine = angle.sin();
	const cosine = angle.cos();
	return mat4(
		vec4( cosine.mul( shape.width ), 0, sine.negate().mul( shape.width ), 0 ),
		vec4( 0, shape.height, 0, 0 ),
		vec4( sine.mul( shape.depth ), 0, cosine.mul( shape.depth ), 0 ),
		vec4( x, 0, z, 1 )
	);

}

function createPrototypeGeometries() {

	const spired = finishArchetype( 'SpiredNeoGothic', [
		createTowerMass( 1, 0.14, 1, 0, 0xd2cbc2 ),
		createTowerMass( 0.91, 0.18, 0.94, 0.14, 0xe1d9cf ),
		createTowerMass( 0.78, 0.52, 0.82, 0.32, 0xeee7dd ),
		createTowerMass( 0.64, 0.13, 0.68, 0.84, 0xe2d8cc ),
		createTowerMass( 0.38, 0.06, 0.42, 0.97, 0xd7cfc5 ),
		createCylinder( 0.015, 0.11, 0.17, 0.94, 4, 0xc8c1b9 ),
	] );

	const ziggurat = finishArchetype( 'SteppedZiggurat', [
		createTowerMass( 1, 0.18, 1, 0, 0xc9bba8 ),
		createTowerMass( 0.82, 0.24, 0.82, 0.18, 0xdacbb8 ),
		createTowerMass( 0.64, 0.28, 0.64, 0.42, 0xe7dbc9 ),
		createTowerMass( 0.45, 0.24, 0.45, 0.7, 0xd7c9b8 ),
		createTowerMass( 0.24, 0.1, 0.24, 0.94, 0xb7aa9d ),
	] );

	const slab = finishArchetype( 'FlatSlab', [
		createTowerMass( 1, 0.12, 0.82, 0, 0xc6c4bd ),
		createTowerMass( 0.88, 0.78, 0.5, 0.12, 0xddd9cf ),
		createTowerMass( 0.94, 0.07, 0.57, 0.9, 0xb7bbb9 ),
		createTowerMass( 0.26, 0.08, 0.2, 0.97, 0x9ca7aa ),
	] );

	const twin = finishArchetype( 'TwinSetback', [
		createTowerMass( 1, 0.14, 1, 0, 0xc6bdb1 ),
		createTowerMassAt( 0.38, 0.7, 0.7, - 0.24, 0.14, 0, 0xe2ddd3 ),
		createTowerMassAt( 0.38, 0.7, 0.7, 0.24, 0.14, 0, 0xd4d4ce ),
		createTowerMassAt( 0.24, 0.16, 0.48, - 0.24, 0.84, 0, 0xc6c9c5 ),
		createTowerMassAt( 0.24, 0.16, 0.48, 0.24, 0.84, 0, 0xb7c0c0 ),
	] );

	const drum = finishArchetype( 'DrumTower', [
		createTowerMass( 1, 0.12, 1, 0, 0xc9bba6 ),
		createCylinder( 0.43, 0.46, 0.76, 0.12, 10, 0xe4d8c8 ),
		createCylinder( 0.28, 0.34, 0.12, 0.88, 10, 0xc5b8a7 ),
		createCylinder( 0.08, 0.2, 0.11, 1, 8, 0x9da9aa ),
	] );

	const lowrise = finishArchetype( 'LowRiseBlock', [
		createTowerMass( 1, 0.64, 0.94, 0, 0xc8c0b5 ),
		createTowerMass( 0.88, 0.12, 0.82, 0.64, 0xdcd5ca ),
		createTowerMassAt( 0.22, 0.1, 0.28, - 0.24, 0.76, 0.12, 0x9da6a5 ),
		createTowerMassAt( 0.18, 0.08, 0.2, 0.24, 0.76, - 0.18, 0xaeb3af ),
	] );

	const landmark = finishArchetype( 'LandmarkSupertall', [
		createTowerMass( 0.92, 0.12, 0.92, 0, 0xbcafa3 ),
		createTowerMass( 0.62, 0.62, 0.62, 0.12, 0xe8dfd3 ),
		createTowerMass( 0.46, 0.2, 0.46, 0.74, 0xd4c7b9 ),
		createCylinder( 0.19, 0.3, 0.16, 0.94, 6, 0xb3b7b3 ),
		createCylinder( 0.012, 0.08, 0.3, 1.1, 6, 0x9fa9a8 ),
	] );

	const parkParts = [ createTowerMass( 1, 0.035, 1, 0, 0x596e59, true ) ];
	const treeLocations = [ [ - 0.29, - 0.28 ], [ 0.26, - 0.24 ], [ - 0.2, 0.27 ], [ 0.29, 0.23 ], [ 0.02, 0.02 ] ];
	for ( let index = 0; index < treeLocations.length; index ++ ) {

		const [ x, z ] = treeLocations[ index ];
		parkParts.push( createCylinderAt( 0.025, 0.035, 0.28, x, 0.035, z, 6, 0x5d4738, true ) );
		const canopy = new THREE.SphereGeometry( index === 4 ? 0.16 : 0.13, 6, 4 );
		canopy.scale( 1, 1.2, 1 );
		canopy.translate( x, index === 4 ? 0.42 : 0.36, z );
		paintGeometry( canopy, index % 2 === 0 ? 0x67855f : 0x78936b, true );
		parkParts.push( canopy );

	}
	const park = finishArchetype( 'ParkLot', parkParts );
	return [ spired, ziggurat, slab, twin, drum, lowrise, landmark, park ];

}

function finishArchetype( name, parts ) {

	const geometry = mergeGeometries( parts, false );
	parts.forEach( part => part.dispose() );
	if ( ! geometry ) throw new Error( `Could not build ${name} city geometry.` );
	geometry.name = name;
	geometry.computeBoundingBox();
	geometry.computeBoundingSphere();
	return geometry;

}

function createTowerMass( width, height, depth, y, colorValue, solid = false ) {

	return createTowerMassAt( width, height, depth, 0, y, 0, colorValue, solid );

}

function createTowerMassAt( width, height, depth, x, y, z, colorValue, solid = false ) {

	const geometry = new THREE.BoxGeometry( width, height, depth );
	geometry.translate( x, y + height * 0.5, z );
	paintGeometry( geometry, colorValue, solid );
	return geometry;

}

function createCylinder( radiusTop, radiusBottom, height, y, segments, colorValue, solid = false ) {

	return createCylinderAt( radiusTop, radiusBottom, height, 0, y, 0, segments, colorValue, solid );

}

function createCylinderAt( radiusTop, radiusBottom, height, x, y, z, segments, colorValue, solid = false ) {

	const geometry = new THREE.CylinderGeometry( radiusTop, radiusBottom, height, segments, 1, false );
	geometry.translate( x, y + height * 0.5, z );
	paintGeometry( geometry, colorValue, solid );
	return geometry;

}

function paintGeometry( geometry, colorValue, solid = false ) {

	const vertexColor = new THREE.Color( colorValue );
	const vertexCount = geometry.getAttribute( 'position' ).count;
	const colors = new Float32Array( vertexCount * 3 );
	const normals = geometry.getAttribute( 'normal' );
	const uvs = geometry.getAttribute( 'uv' );

	for ( let index = 0; index < vertexCount; index ++ ) {

		colors[ index * 3 + 0 ] = vertexColor.r;
		colors[ index * 3 + 1 ] = vertexColor.g;
		colors[ index * 3 + 2 ] = vertexColor.b;
		if ( solid || Math.abs( normals.getY( index ) ) > 0.65 ) uvs.setXY( index, 0.02, 0.02 );

	}
	geometry.setAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
	uvs.needsUpdate = true;

}

function createFacadeTextures() {

	const tileWidth = FACADE_TILE_WIDTH;
	const tileHeight = FACADE_TILE_HEIGHT;
	const width = tileWidth * FACADE_ATLAS_COLUMNS;
	const height = tileHeight * FACADE_ATLAS_ROWS;
	const diffuseCanvas = document.createElement( 'canvas' );
	const emissiveCanvas = document.createElement( 'canvas' );
	diffuseCanvas.width = emissiveCanvas.width = width;
	diffuseCanvas.height = emissiveCanvas.height = height;
	const diffuse = diffuseCanvas.getContext( '2d' );
	const emissive = emissiveCanvas.getContext( '2d' );
	if ( ! diffuse || ! emissive ) throw new Error( 'Canvas textures are unavailable.' );

	diffuse.fillStyle = '#ede8df';
	diffuse.fillRect( 0, 0, width, height );
	emissive.fillStyle = '#000000';
	emissive.fillRect( 0, 0, width, height );
	const patterns = [
		{ columns: 4, rows: 12, insetX: 5, insetY: 4, frame: '#f1e8dc', glass: [ '#26343d', '#1c2832' ], light: 0.44, salt: 241 },
		{ columns: 3, rows: 15, insetX: 6, insetY: 3, frame: '#e5e7e4', glass: [ '#27373f', '#17262f' ], light: 0.56, salt: 277 },
		{ columns: 5, rows: 10, insetX: 4, insetY: 5, frame: '#eee1d1', glass: [ '#30404a', '#202c35' ], light: 0.38, salt: 313 },
		{ columns: 6, rows: 14, insetX: 3, insetY: 3, frame: '#e2ded8', glass: [ '#24313a', '#18252e' ], light: 0.64, salt: 349 },
	];

	for ( let patternIndex = 0; patternIndex < patterns.length; patternIndex ++ ) {

		const pattern = patterns[ patternIndex ];
		const tileX = patternIndex % FACADE_ATLAS_COLUMNS;
		const tileY = Math.floor( patternIndex / FACADE_ATLAS_COLUMNS );
		const originX = tileX * tileWidth;
		const originY = tileY * tileHeight;
		const cellWidth = tileWidth / pattern.columns;
		const cellHeight = tileHeight / pattern.rows;
		diffuse.fillStyle = patternIndex % 2 === 0 ? '#eee9e0' : '#e4e5e1';
		diffuse.fillRect( originX, originY, tileWidth, tileHeight );

		for ( let rowIndex = 0; rowIndex < pattern.rows; rowIndex ++ ) {

			for ( let column = 0; column < pattern.columns; column ++ ) {

				const x = originX + column * cellWidth + pattern.insetX;
				const y = originY + rowIndex * cellHeight + pattern.insetY;
				const windowWidth = cellWidth - pattern.insetX * 2;
				const windowHeight = cellHeight - pattern.insetY * 2 + 1;
				diffuse.fillStyle = pattern.frame;
				diffuse.fillRect( x - 1, y - 1, windowWidth + 2, windowHeight + 2 );
				diffuse.fillStyle = pattern.glass[ seededValue( column, rowIndex, 227 + patternIndex ) > 0.5 ? 0 : 1 ];
				diffuse.fillRect( x, y, windowWidth, windowHeight );
				const light = seededValue( column, rowIndex, pattern.salt );
				if ( light > pattern.light ) {

					emissive.fillStyle = light > 0.82 ? '#ffe2ac' : '#d98b52';
					emissive.fillRect( x + 1, y + 1, windowWidth - 2, windowHeight - 2 );

				}

			}

		}

	}

	const map = new THREE.CanvasTexture( diffuseCanvas );
	const emissiveMap = new THREE.CanvasTexture( emissiveCanvas );
	map.colorSpace = THREE.SRGBColorSpace;
	emissiveMap.colorSpace = THREE.SRGBColorSpace;
	const anisotropy = Math.min( 8, renderer.getMaxAnisotropy() );
	map.anisotropy = anisotropy;
	emissiveMap.anisotropy = anisotropy;
	map.name = 'CityFacadeAtlas';
	emissiveMap.name = 'CityWindowLights';
	return { map, emissiveMap };

}

function createTowerMaterial( name, useStableBatchSlot = false ) {

	const periodX = cityLayout.blockW + cityLayout.street;
	const periodZ = cityLayout.blockD + cityLayout.street;
	let worldBlockX;
	let worldBlockZ;
	let cellX;
	let cellZ;
	if ( useStableBatchSlot ) {

		const slotIndex = uint( varyingProperty( 'float', 'vBatchInstanceId' ) );
		const cellIndices = storage( slotCellIndicesSB, 'uint', towerCount() ).setName( 'endlessCityMaterialCells' );
		const cellIndex = float( cellIndices.element( slotIndex ) );
		const gridWidth = cityParameters.blocksX * cityParameters.lotsX;
		const gridCellX = mod( cellIndex, gridWidth );
		const gridCellZ = floor( cellIndex.div( gridWidth ) );
		const localBlockX = floor( gridCellX.div( cityParameters.lotsX ) );
		const localBlockZ = floor( gridCellZ.div( cityParameters.lotsZ ) );
		const originBlockX = floor( cityTravelNode.x.div( periodX ) );
		const originBlockZ = floor( cityTravelNode.y.div( periodZ ) );
		const ringBlockX = mod( localBlockX.sub( originBlockX ), cityParameters.blocksX );
		const ringBlockZ = mod( localBlockZ.sub( originBlockZ ), cityParameters.blocksZ );
		worldBlockX = ringBlockX.sub( cityParameters.blocksX * 0.5 ).add( originBlockX );
		worldBlockZ = ringBlockZ.sub( cityParameters.blocksZ * 0.5 ).add( originBlockZ );
		cellX = worldBlockX.mul( cityParameters.lotsX ).add( mod( gridCellX, cityParameters.lotsX ) );
		cellZ = worldBlockZ.mul( cityParameters.lotsZ ).add( mod( gridCellZ, cityParameters.lotsZ ) );

	} else {

		const gridX = positionWorld.x.add( cityTravelNode.x ).add( cityLayout.cityW * 0.5 );
		const gridZ = positionWorld.z.add( cityTravelNode.y ).add( cityLayout.cityD * 0.5 );
		const localBlockX = floor( gridX.div( periodX ) );
		const localBlockZ = floor( gridZ.div( periodZ ) );
		worldBlockX = localBlockX.sub( cityParameters.blocksX * 0.5 );
		worldBlockZ = localBlockZ.sub( cityParameters.blocksZ * 0.5 );
		cellX = worldBlockX.mul( cityLayout.lotsX ).add(
			floor( gridX.sub( localBlockX.mul( periodX ) ).div( cityLayout.lot ) )
		);
		cellZ = worldBlockZ.mul( cityLayout.lotsZ ).add(
			floor( gridZ.sub( localBlockZ.mul( periodZ ) ).div( cityLayout.lot ) )
		);

	}
	const cellHash = salt => cityHashNode( cellX, cellZ, salt );
	const districtCharacter = smoothCityNoiseNode( cellX, cellZ, 24, 1271 );
	const core = cityCoreNode( worldBlockX, worldBlockZ );
	const palettePick = fract( cellHash( 1271 ).mul( 0.72 ).add( districtCharacter.mul( 0.46 ) ) );
	const palette = [
		color( 0xc76f50 ), color( 0x9e6e58 ), color( 0xc7a66f ), color( 0xc8b88e ),
		color( 0xc8c1b3 ), color( 0xd2ccbd ), color( 0xa3a19a ), color( 0x87939a ),
	];
	let buildingBase = palette[ 0 ];
	for ( let index = 1; index < palette.length; index ++ ) {

		buildingBase = mix( buildingBase, palette[ index ], step( index / palette.length, palettePick ) );

	}
	buildingBase = varying( buildingBase.mul( cellHash( 3571 ).mul( 0.14 ).add( 0.93 ) ) )
		.setInterpolation( THREE.InterpolationSamplingType.FLAT, THREE.InterpolationSamplingMode.EITHER );
	const facadeVariant = varying( floor( cellHash( 9463 ).mul( FACADE_ATLAS_COLUMNS * FACADE_ATLAS_ROWS ) ) )
		.setInterpolation( THREE.InterpolationSamplingType.FLAT, THREE.InterpolationSamplingMode.EITHER );
	const tileX = mod( facadeVariant, FACADE_ATLAS_COLUMNS );
	const tileY = floor( facadeVariant.div( FACADE_ATLAS_COLUMNS ) );
	const atlasWidth = FACADE_TILE_WIDTH * FACADE_ATLAS_COLUMNS;
	const atlasHeight = FACADE_TILE_HEIGHT * FACADE_ATLAS_ROWS;
	const atlasScale = vec2( ( FACADE_TILE_WIDTH - 1 ) / atlasWidth, ( FACADE_TILE_HEIGHT - 1 ) / atlasHeight );
	const atlasOffset = vec2(
		tileX.mul( FACADE_TILE_WIDTH / atlasWidth ).add( 0.5 / atlasWidth ),
		tileY.mul( FACADE_TILE_HEIGHT / atlasHeight ).add( 0.5 / atlasHeight )
	);
	const atlasUV = uv().mul( atlasScale ).add( atlasOffset );
	const lightLevel = varying( cellHash( 12347 ).mul( 0.72 ).add( 0.58 ).mul( core.mul( 1.25 ).add( 0.62 ) ) )
		.setInterpolation( THREE.InterpolationSamplingType.FLAT, THREE.InterpolationSamplingMode.EITHER );
	const material = new THREE.MeshStandardNodeMaterial( {
		metalness: 0.04,
		roughness: 0.78,
		vertexColors: true,
	} );
	material.colorNode = texture( facadeTextures.map, atlasUV ).rgb.mul( buildingBase );
	material.emissiveNode = texture( facadeTextures.emissiveMap, atlasUV ).rgb.mul( lightLevel );
	material.name = name;
	return material;

}

function cityHashNode( x, z, salt ) {

	const saltBits = ( Math.imul( CITY_SEED, 2654435761 ) ^ Math.imul( salt, 2246822519 ) ) >>> 0;
	const seed = uint( floor( x ).add( HASH_COORDINATE_OFFSET ) )
		.mul( uint( 73856093 ) )
		.bitXor( uint( floor( z ).add( HASH_COORDINATE_OFFSET ) ).mul( uint( 19349663 ) ) )
		.bitXor( uint( saltBits ) );
	return hash( seed );

}

function smoothCityNoiseNode( x, z, scaleValue, salt ) {

	const scaledX = x.div( scaleValue );
	const scaledZ = z.div( scaleValue );
	const x0 = floor( scaledX );
	const z0 = floor( scaledZ );
	const rawX = fract( scaledX );
	const rawZ = fract( scaledZ );
	const blendX = rawX.mul( rawX ).mul( float( 3 ).sub( rawX.mul( 2 ) ) );
	const blendZ = rawZ.mul( rawZ ).mul( float( 3 ).sub( rawZ.mul( 2 ) ) );
	const near = mix( cityHashNode( x0, z0, salt ), cityHashNode( x0.add( 1 ), z0, salt ), blendX );
	const far = mix( cityHashNode( x0, z0.add( 1 ), salt ), cityHashNode( x0.add( 1 ), z0.add( 1 ), salt ), blendX );
	return mix( near, far, blendZ );

}

function cityCoreNode( worldBlockX, worldBlockZ ) {

	const district = smoothCityNoiseNode( worldBlockX, worldBlockZ, 9, 401 );
	const metro = smoothCityNoiseNode( worldBlockX, worldBlockZ, 27, 409 );
	const districtPeak = district.sub( 0.43 ).div( 0.57 ).clamp( 0, 1 ).pow( 2.45 );
	const metroPeak = metro.sub( 0.5 ).div( 0.5 ).clamp( 0, 1 ).pow( 3.1 );
	return districtPeak.max( metroPeak.mul( 0.94 ) ).add( district.mul( 0.12 ) ).clamp( 0, 1 );

}

function archetypeScaleNode( archetypeId, property ) {

	const id = float( archetypeId );
	let value = float( ARCHETYPE_DEFINITIONS[ 0 ][ property ] );
	for ( let index = 1; index < ARCHETYPE_DEFINITIONS.length; index ++ ) {

		value = mix( value, ARCHETYPE_DEFINITIONS[ index ][ property ], step( index - 0.5, id ) );

	}
	return value;

}

function createTowerShapeNodes( worldLotX, worldLotZ, worldBlockX, worldBlockZ, archetypeId ) {

	const district = smoothCityNoiseNode( worldBlockX, worldBlockZ, 9, 401 ).toVar();
	const core = cityCoreNode( worldBlockX, worldBlockZ ).toVar();
	const randomHeight = cityHashNode( worldLotX, worldLotZ, 149 ).toVar();
	const profile = cityHashNode( worldLotX, worldLotZ, 157 ).toVar();
	const compact = step( 0.82, profile );
	const wide = float( 1 ).sub( step( 0.18, profile ) );
	const footprint = mix( mix( 15.4, 18.6, wide ), 13.2, compact );
	const stretched = step( 0.36, profile ).mul( float( 1 ).sub( step( 0.56, profile ) ) );
	const stretch = mix( 1, 1.28, stretched );
	const lotX = mod( worldLotX.add( HASH_COORDINATE_OFFSET ), cityParameters.lotsX );
	const lotZ = mod( worldLotZ.add( HASH_COORDINATE_OFFSET ), cityParameters.lotsZ );
	const boulevardX = mod( worldBlockX.add( HASH_COORDINATE_OFFSET ), 8 ).lessThan( 0.5 ).and( lotX.lessThan( 0.5 ) );
	const boulevardZ = mod( worldBlockZ.add( HASH_COORDINATE_OFFSET ), 8 ).lessThan( 0.5 ).and( lotZ.lessThan( 0.5 ) );
	const boulevard = boulevardX.or( boulevardZ );
	const park = float( archetypeId ).greaterThan( PARK_ARCHETYPE - 0.5 );
	const normalWidth = footprint.add( cityHashNode( worldLotX, worldLotZ, 163 ).mul( 4.8 ) )
		.mul( stretch ).min( 22 ).mul( archetypeScaleNode( archetypeId, 'widthScale' ) );
	const normalHeight = float( 25 ).add( randomHeight.mul( randomHeight ).mul( 76 ) )
		.add( core.mul( core ).mul( 178 ) ).mul( archetypeScaleNode( archetypeId, 'heightScale' ) );
	const normalDepth = footprint.add( cityHashNode( worldLotX, worldLotZ, 173 ).mul( 4.8 ) )
		.min( 22 ).mul( archetypeScaleNode( archetypeId, 'depthScale' ) );

	return {
		width: park.select( float( 22.4 ), boulevard.select( float( 22.6 ), normalWidth ) ),
		height: park.select( district.mul( 3.5 ).add( 8.5 ), boulevard.select( float( 0.32 ), normalHeight ) ),
		depth: park.select( float( 22.4 ), boulevard.select( float( 22.6 ), normalDepth ) ),
		quarterTurn: floor( cityHashNode( worldLotX, worldLotZ, 181 ).mul( 4 ) ),
	};

}

function writeTowerMatrix( slotIndex, originBlockX, originBlockZ, targetMatrix ) {

	const cellIndex = slotAssignment.slotCellIndices[ slotIndex ];
	const archetypeId = slotAssignment.slotArchetypeIds[ slotIndex ];
	const cell = decodeCityCell( cellIndex, cityParameters.blocksX, cityParameters.lotsX, cityParameters.lotsZ );
	const ringBlockX = wrapCityRingBlock( cell.blockX, originBlockX, cityParameters.blocksX );
	const ringBlockZ = wrapCityRingBlock( cell.blockZ, originBlockZ, cityParameters.blocksZ );
	const worldBlockX = ringBlockX - cityParameters.blocksX * 0.5 + originBlockX;
	const worldBlockZ = ringBlockZ - cityParameters.blocksZ * 0.5 + originBlockZ;
	const worldLotX = worldBlockX * cityParameters.lotsX + cell.lotX;
	const worldLotZ = worldBlockZ * cityParameters.lotsZ + cell.lotZ;
	const shape = createTowerShapeValues(
		worldLotX,
		worldLotZ,
		worldBlockX,
		worldBlockZ,
		archetypeId,
		cityParameters.lotsX,
		cityParameters.lotsZ
	);
	const x = - cityLayout.cityW * 0.5
		+ ringBlockX * ( cityLayout.blockW + cityLayout.street )
		+ ( cell.lotX + 0.5 ) * cityLayout.lot;
	const z = - cityLayout.cityD * 0.5
		+ ringBlockZ * ( cityLayout.blockD + cityLayout.street )
		+ ( cell.lotZ + 0.5 ) * cityLayout.lot;
	position.set( x, 0, z );
	rotation.set( 0, shape.quarterTurn * Math.PI * 0.5, 0 );
	quaternion.setFromEuler( rotation );
	scale.set( shape.width, shape.height, shape.depth );
	targetMatrix.compose( position, quaternion, scale );
	return targetMatrix;

}

function updateCpuCity( mode, force = false ) {

	const city = mode === MODE_BATCHED ? batchedCity : meshCity;
	if ( ! city ) return;
	const periodX = cityLayout.blockW + cityLayout.street;
	const periodZ = cityLayout.blockD + cityLayout.street;
	const travelBlocksX = cityTravel.x / periodX;
	const travelBlocksZ = cityTravel.y / periodZ;
	const originBlockX = Math.floor( travelBlocksX );
	const originBlockZ = Math.floor( travelBlocksZ );
	city.position.set(
		- ( travelBlocksX - originBlockX ) * periodX,
		0,
		- ( travelBlocksZ - originBlockZ ) * periodZ
	);

	const previousX = mode === MODE_BATCHED ? batchedOriginBlockX : meshOriginBlockX;
	const previousZ = mode === MODE_BATCHED ? batchedOriginBlockZ : meshOriginBlockZ;
	if ( ! force && originBlockX === previousX && originBlockZ === previousZ ) return;
	if ( mode === MODE_BATCHED ) {

		batchedOriginBlockX = originBlockX;
		batchedOriginBlockZ = originBlockZ;

	} else {

		meshOriginBlockX = originBlockX;
		meshOriginBlockZ = originBlockZ;

	}

	for ( let slotIndex = 0; slotIndex < towerCount(); slotIndex ++ ) {

		writeTowerMatrix( slotIndex, originBlockX, originBlockZ, towerMatrix );
		if ( mode === MODE_BATCHED ) {

			batchedCity.setMatrixAt( slotIndex, towerMatrix );

		} else {

			const tower = meshCity.children[ slotIndex ];
			tower.matrix.copy( towerMatrix );
			tower.matrixWorldNeedsUpdate = true;

		}

	}

}

function seededValue( x, z, salt ) {

	let value = Math.imul( x + salt * 1013, 0x45d9f3b );
	value = Math.imul( value ^ ( z + salt * 1619 ), 0x45d9f3b );
	value ^= value >>> 16;
	return ( value >>> 0 ) / 4294967295;

}

function countBaselineDraw() {

	baselineDrawCount ++;

}

function createHud() {

	hudStyle = document.createElement( 'style' );
	hudStyle.textContent = [
		'.three-blocks-city-ledger {',
		' --mint:#83decf; --copper:#ffae69; --paper:#edf8f5; --quiet:#9bb4b1;',
		' position:absolute; right:clamp(18px,4vw,54px); bottom:clamp(18px,5vh,50px);',
		' width:min(590px,calc(100% - 36px)); color:var(--paper); padding-left:18px;',
		' border-left:1px solid rgba(132,222,205,.58); font-family:"IBM Plex Sans","Segoe UI",sans-serif;',
		' pointer-events:none; z-index:4; text-shadow:0 2px 20px rgba(7,17,24,.58);',
		'}',
		'.three-blocks-city-ledger::before { content:""; position:absolute; left:-5px; top:0; width:9px; height:9px;',
		' border:1px solid var(--mint); transform:rotate(45deg); background:#1b2730; }',
		'.three-blocks-city-ledger__eyebrow { display:flex; align-items:center; gap:9px; margin:0 0 11px;',
		' color:#96b8b3; font:650 10px/1 ui-monospace,"SFMono-Regular",Consolas,monospace;',
		' letter-spacing:.14em; text-transform:uppercase; }',
		'.three-blocks-city-ledger__eyebrow b { color:var(--mint); font-weight:750; }',
		'.three-blocks-city-ledger__eyebrow::after { content:""; width:54px; height:1px;',
		' background:linear-gradient(90deg,var(--mint),transparent); }',
		'.three-blocks-city-ledger h1 { margin:0; font-family:"Arial Narrow","Roboto Condensed",sans-serif;',
		' font-size:clamp(30px,4.8vw,55px); font-stretch:condensed; font-weight:680; letter-spacing:-.04em; line-height:.9; }',
		'.three-blocks-city-ledger h1 em { color:var(--copper); font-style:normal; font-weight:460; }',
		'.three-blocks-city-ledger__flow { display:grid; grid-template-columns:auto minmax(76px,auto) 25px auto minmax(76px,auto);',
		' align-items:end; gap:7px; width:max-content; max-width:100%; margin-top:18px; padding:10px 0 8px;',
		' border-block:1px solid rgba(132,222,205,.26); }',
		'.three-blocks-city-ledger__flow span { color:#91aaa8; font:650 9px/1 ui-monospace,"SFMono-Regular",Consolas,monospace;',
		' letter-spacing:.12em; text-transform:uppercase; }',
		'.three-blocks-city-ledger__flow strong { font:610 19px/1 ui-monospace,"SFMono-Regular",Consolas,monospace;',
		' font-variant-numeric:tabular-nums; text-align:right; }',
		'.three-blocks-city-ledger__flow i { color:var(--mint); font:400 19px/1 ui-monospace,monospace; text-align:center; }',
		'.three-blocks-city-ledger__readout { display:flex; flex-wrap:wrap; gap:0; margin-top:8px; }',
		'.three-blocks-city-ledger__metric { display:grid; gap:4px; min-width:126px; padding:3px 22px 2px 0; }',
		'.three-blocks-city-ledger__metric + .three-blocks-city-ledger__metric { padding-left:22px; border-left:1px solid rgba(132,222,205,.18); }',
		'.three-blocks-city-ledger__metric span { color:#91aaa8; font:650 9px/1 ui-monospace,"SFMono-Regular",Consolas,monospace;',
		' letter-spacing:.12em; text-transform:uppercase; }',
		'.three-blocks-city-ledger__metric strong { color:var(--paper); font:580 14px/1.1 ui-monospace,"SFMono-Regular",Consolas,monospace;',
		' font-variant-numeric:tabular-nums; }',
		'.three-blocks-city-ledger__mode { margin:10px 0 0; color:#adc1be; font-size:11px; line-height:1.45; letter-spacing:.025em; }',
		'.three-blocks-city-ledger__breakdown { margin:6px 0 0; color:#83a29e; font:500 9px/1.45 ui-monospace,monospace; }',
		'.three-blocks-city-ledger__status { margin:7px 0 0; color:var(--mint); font:700 9px/1 ui-monospace,monospace;',
		' letter-spacing:.12em; text-transform:uppercase; min-height:9px; }',
		'.three-blocks-city-toast { position:absolute; left:50%; top:22px; transform:translate(-50%,-12px); opacity:0;',
		' z-index:6; color:#172127; background:rgba(255,184,113,.94); padding:9px 13px; border-radius:2px;',
		' font:700 10px/1.25 ui-monospace,monospace; letter-spacing:.04em; pointer-events:none;',
		' transition:opacity .2s ease,transform .2s ease; }',
		'.three-blocks-city-toast[data-visible="true"] { opacity:1; transform:translate(-50%,0); }',
		'@media (max-width:620px) {',
		' .three-blocks-city-ledger { bottom:18px; }',
		' .three-blocks-city-ledger h1 { font-size:clamp(27px,9.5vw,42px); }',
		' .three-blocks-city-ledger__flow { grid-template-columns:auto minmax(66px,auto) 18px auto minmax(66px,auto); }',
		' .three-blocks-city-ledger__flow strong { font-size:16px; }',
		' .three-blocks-city-ledger__metric { min-width:105px; padding-right:13px; }',
		' .three-blocks-city-ledger__metric + .three-blocks-city-ledger__metric { padding-left:13px; }',
		'}',
		'@media (prefers-reduced-motion:reduce) { .three-blocks-city-toast { transition:none; } }',
	].join( '\n' );
	document.head.appendChild( hudStyle );

	hud = document.createElement( 'section' );
	hud.className = 'three-blocks-city-ledger';
	hud.setAttribute( 'aria-label', 'Four-way city rendering comparison' );
	hud.innerHTML = [
		'<p class="three-blocks-city-ledger__eyebrow" data-city-eyebrow></p>',
		'<h1></h1>',
		'<div class="three-blocks-city-ledger__flow" aria-live="polite">',
		' <span>Candidates</span><strong data-city-candidates></strong><i>→</i>',
		' <span>Drawn</span><strong data-city-drawn></strong>',
		'</div>',
		'<div class="three-blocks-city-ledger__readout">',
		' <div class="three-blocks-city-ledger__metric"><span>Submission</span><strong data-city-submissions></strong></div>',
		' <div class="three-blocks-city-ledger__metric"><span>CPU submit</span><strong data-city-cpu></strong></div>',
		' <div class="three-blocks-city-ledger__metric"><span>GPU frame</span><strong data-city-gpu></strong></div>',
		'</div>',
		'<p class="three-blocks-city-ledger__mode" data-city-mode></p>',
		DEBUG ? '<p class="three-blocks-city-ledger__breakdown" data-city-breakdown></p>' : '',
		'<p class="three-blocks-city-ledger__status" data-city-status></p>',
	].join( '' );
	container.appendChild( hud );
	toast = document.createElement( 'div' );
	toast.className = 'three-blocks-city-toast';
	toast.setAttribute( 'role', 'status' );
	container.appendChild( toast );

	hudEyebrow = hud.querySelector( '[data-city-eyebrow]' );
	hudHeadline = hud.querySelector( 'h1' );
	hudCandidates = hud.querySelector( '[data-city-candidates]' );
	hudDrawn = hud.querySelector( '[data-city-drawn]' );
	hudSubmissions = hud.querySelector( '[data-city-submissions]' );
	hudCpu = hud.querySelector( '[data-city-cpu]' );
	hudGpu = hud.querySelector( '[data-city-gpu]' );
	hudMode = hud.querySelector( '[data-city-mode]' );
	hudBreakdown = hud.querySelector( '[data-city-breakdown]' );
	hudStatus = hud.querySelector( '[data-city-status]' );
	updateHud();

}

async function setupGui() {

	gui = await createExampleGui( 'GPU City' );
	if ( ! mounted ) {

		gui.destroy();
		gui = null;
		return;

	}
	if ( container.clientWidth < 640 ) gui.close();
	renderingController = gui.add( params, 'rendering', {
		'Indirect · Three Blocks GPU culling': MODE_INDIRECT,
		'Batched · CPU multi-draw': MODE_BATCHED,
		'Instanced · eight direct draws': MODE_INSTANCED,
		'Meshes · CPU scene graph': MODE_MESHES,
	} ).name( 'Rendering' ).onChange( value => void setRenderingMode( value ) );
	labelController( renderingController, 'Rendering mode' );

	cullingController = gui.add( params, 'culling' ).name( 'Three Blocks GPU culling' ).onChange( value => {

		if ( indirectCity ) indirectCity.perObjectFrustumCulled = value;
		if ( ! value ) lastSurvivorCount = towerCount();
		updateHud();

	} );
	labelController( cullingController, 'Toggle GPU frustum culling' );

	const viewController = gui.add( params, 'view', {
		'Sector · culling benchmark': VIEW_SECTOR,
		'Street · cinematic rejection': VIEW_STREET,
		'Overview · whole city': VIEW_OVERVIEW,
	} ).name( 'Camera' ).onChange( () => frameCity( true ) );
	labelController( viewController, 'Camera framing' );

	orbitController = gui.add( params, 'autoOrbit' ).name( 'Orbit city' ).onChange( value => {

		controls.autoRotate = value && params.view !== VIEW_STREET;

	} );
	labelController( orbitController, 'Orbit city automatically' );

	const travelController = gui.add( params, 'travel' ).name( 'Endless travel' );
	labelController( travelController, 'Move through the endlessly generated city' );
	const speedController = gui.add( params, 'travelSpeed', 8, 120, 1 ).name( 'Travel speed' );
	labelController( speedController, 'Endless city travel speed' );

	gridController = gui.add( params, 'gridSize', {
		'96 × 96 · 36,864': 96,
		'144 × 144 · 82,944': 144,
		'192 × 192 · 147,456': 192,
	} ).name( 'City scale' ).onChange( value => void rebuildCitySize( Number( value ) ) );
	labelController( gridController, 'City grid scale' );

	const statsController = gui.add( params, 'hudStats' ).name( 'HUD stats' ).onChange( setHudStatsEnabled );
	labelController( statsController, 'Enable GPU readbacks and timestamp statistics' );
	const exposureController = gui.add( params, 'exposure', 0.35, 1.05, 0.01 ).name( 'Sunset light' ).onChange( updateExposure );
	labelController( exposureController, 'Sunset exposure' );
	updateModeControllers();

}

function labelController( controller, label ) {

	controller.domElement.querySelector( 'select, input, button' )?.setAttribute( 'aria-label', label );

}

function updateModeControllers() {

	if ( params.rendering === MODE_INDIRECT ) cullingController?.enable();
	else cullingController?.disable();
	if ( params.view === VIEW_STREET ) orbitController?.disable();
	else orbitController?.enable();

}

function getCityForMode( mode ) {

	if ( mode === MODE_INDIRECT ) return indirectCity;
	if ( mode === MODE_BATCHED ) return batchedCity;
	if ( mode === MODE_INSTANCED ) return instancedCity;
	return meshCity;

}

function detachCities() {

	indirectCity?.removeFromParent();
	batchedCity?.removeFromParent();
	instancedCity?.removeFromParent();
	meshCity?.removeFromParent();

}

async function nextPaint() {

	await new Promise( resolve => requestAnimationFrame( () => resolve() ) );

}

async function ensureModeCity( mode ) {

	if ( mode === MODE_BATCHED && ! batchedCity ) createBatchedCity();
	else if ( mode === MODE_INSTANCED && ! instancedCity ) createInstancedCity();
	else if ( mode === MODE_MESHES && ! meshCity ) createMeshCity();
	await compileMode( mode );
	return getCityForMode( mode );

}

async function compileMode( mode ) {

	if ( compiledModes.has( mode ) ) return;
	const city = getCityForMode( mode );
	if ( ! city ) return;
	if ( mode === MODE_INDIRECT && indirectGenerationDirty ) {

		renderer.compute( cityGenerationCompute );
		indirectGenerationDirty = false;

	} else if ( mode === MODE_INSTANCED && instancedGenerationDirty ) {

		renderer.compute( instancedGenerationComputes );
		instancedGenerationDirty = false;

	}
	if ( mode === MODE_MESHES && meshRepresentative ) await renderer.compileAsync( meshRepresentative, camera, scene );
	else await renderer.compileAsync( city, camera, scene );
	compiledModes.add( mode );

}

async function setRenderingMode( mode ) {

	params.rendering = mode;
	if ( rebuilding ) {

		updateHud();
		return;

	}
	const request = ++ modeRequest;
	const needsBuild = ! getCityForMode( mode ) || ! compiledModes.has( mode );
	detachCities();
	if ( needsBuild ) {

		compilingMode = mode;
		updateHud();
		await nextPaint();
		if ( ! mounted || request !== modeRequest ) return;

	}
	const city = await ensureModeCity( mode );
	if ( ! mounted || request !== modeRequest || rebuilding ) return;
	if ( mode === MODE_BATCHED || mode === MODE_MESHES ) updateCpuCity( mode, true );
	else if ( mode === MODE_INDIRECT ) indirectGenerationDirty = true;
	else instancedGenerationDirty = true;
	if ( city ) scene.add( city );
	compilingMode = '';
	showScaleWarning( mode );
	updateModeControllers();
	resetMetrics();
	updateHud();

}

async function rebuildCitySize( blocks ) {

	if ( ! GRID_SIZE_OPTIONS.includes( blocks ) || blocks === cityParameters.blocksX ) return;
	params.gridSize = blocks;
	rebuilding = true;
	compilingMode = `Rebuilding ${blocks} × ${blocks}`;
	const request = ++ rebuildRequest;
	modeRequest ++;
	detachCities();
	updateHud();
	await nextPaint();
	if ( ! mounted || request !== rebuildRequest ) return;
	if ( statsPromise ) await statsPromise;

	disposeCities();
	disposeSizeDependentMaterials();
	cityTravel.set( 0, 0 );
	configureCitySize( blocks );
	updateRoadGeometry();
	createSizeDependentMaterials();
	createIndirectCity();
	compiledModes = new Set();
	frameCity( true );
	await compileMode( MODE_INDIRECT );
	if ( ! mounted || request !== rebuildRequest ) return;
	const requestedMode = params.rendering;
	if ( requestedMode !== MODE_INDIRECT ) await ensureModeCity( requestedMode );
	if ( ! mounted || request !== rebuildRequest ) return;
	const city = getCityForMode( requestedMode );
	if ( city ) scene.add( city );
	rebuilding = false;
	compilingMode = '';
	showScaleWarning( requestedMode );
	updateModeControllers();
	resetMetrics();
	updateHud();

}

function showScaleWarning( mode ) {

	if ( cityParameters.blocksX !== 192 || ( mode !== MODE_BATCHED && mode !== MODE_MESHES ) ) return;
	if ( warningModes.has( mode ) || ! toast ) return;
	warningModes.add( mode );
	toast.textContent = mode === MODE_MESHES
		? '147,456 Mesh objects: the stall is the comparison.'
		: '147,456 CPU frustum tests: watch the submit time.';
	toast.dataset.visible = 'true';
	window.clearTimeout( toastTimeout );
	toastTimeout = window.setTimeout( () => {

		if ( toast ) toast.dataset.visible = 'false';

	}, 3600 );

}

function frameCity( force = false ) {

	if ( ! camera || ! controls || ! container ) return;
	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	const portrait = width / height < 0.82;
	if ( ! force && portraitLayout === portrait ) return;
	portraitLayout = portrait;
	const extentScale = cityLayout.cityW / 5938;
	const overview = params.view === VIEW_OVERVIEW;
	const street = params.view === VIEW_STREET;

	if ( street ) {

		const periodX = cityLayout.blockW + cityLayout.street;
		cityTravel.x = Math.round( cityTravel.x / periodX ) * periodX;
		camera.fov = portrait ? 55 : 48;
		camera.position.set( 0, 12, portrait ? 210 : 265 );
		controls.target.set( 0, 19, portrait ? - 390 : - 620 );
		camera.far = 2200 * Math.max( 1, Math.pow( extentScale, 0.25 ) );
		scene.fog.near = 520;
		scene.fog.far = camera.far * 0.92;
		controls.minDistance = 80;
		controls.maxDistance = 950;
		controls.enabled = false;
		controls.autoRotate = false;

	} else {

		camera.fov = 48;
		const direction = new THREE.Vector3( - 0.88, 0.37, - 0.71 ).normalize();
		const distance = overview
			? ( portrait ? 7900 : 6800 ) * extentScale
			: ( portrait ? 1650 : 1325 ) * Math.pow( extentScale, 0.18 );
		controls.target.set( 0, overview ? 92 * Math.pow( extentScale, 0.2 ) : 68, 0 );
		camera.position.copy( controls.target ).addScaledVector( direction, distance );
		camera.far = overview ? 12000 * extentScale : 3800 * Math.pow( extentScale, 0.35 );
		scene.fog.near = overview ? 3600 * extentScale : 950;
		scene.fog.far = overview ? 10800 * extentScale : camera.far * 0.91;
		controls.minDistance = overview ? 4200 * extentScale : 760;
		controls.maxDistance = overview ? 10500 * extentScale : 2300 * Math.pow( extentScale, 0.25 );
		controls.enabled = true;
		controls.autoRotate = params.autoOrbit;

	}
	camera.updateProjectionMatrix();
	if ( street ) camera.lookAt( controls.target );
	else controls.update();
	updateExposure();
	updateModeControllers();
	indirectGenerationDirty = true;
	instancedGenerationDirty = true;

}

function updateExposure() {

	if ( renderer ) renderer.toneMappingExposure = params.exposure * ( params.view === VIEW_STREET ? 0.9 : 1 );

}

function resize() {

	if ( ! container || ! renderer || ! camera ) return;
	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	renderer.setSize( width, height );
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	frameCity();

}

function median( values ) {

	if ( values.length === 0 ) return Number.NaN;
	const sorted = [ ...values ].sort( ( a, b ) => a - b );
	const middle = Math.floor( sorted.length / 2 );
	return sorted.length % 2 === 0 ? ( sorted[ middle - 1 ] + sorted[ middle ] ) * 0.5 : sorted[ middle ];

}

function pushMetric( target, value ) {

	if ( ! Number.isFinite( value ) ) return;
	target.push( value );
	if ( target.length > METRIC_WINDOW ) target.shift();

}

function resetMetrics() {

	frameSamples = [];
	submitSamples = [];
	gpuSamples = [];
	metricWarmup = METRIC_WARMUP_FRAMES;
	lastGpuMilliseconds = Number.NaN;
	lastSurvivorCount = params.culling ? 0 : towerCount();
	perArchetypeSurvivors.fill( 0 );
	previousFrameTime = performance.now();
	nextUiUpdate = previousFrameTime + UI_UPDATE_INTERVAL;
	lastHudState = '';

}

function setHudStatsEnabled( enabled ) {

	params.hudStats = enabled;
	if ( renderer?.backend && timestampSupported ) renderer.backend.trackTimestamp = enabled;
	if ( ! statsPromise ) statsPending = false;
	resetMetrics();
	updateHud();

}

function pollHudEvidence() {

	if ( ! params.hudStats || statsPending || rebuilding || compilingMode || ! renderer ) return;
	statsPending = true;
	const mode = params.rendering;
	const request = rebuildRequest;
	const tasks = [];

	if ( mode === MODE_INDIRECT && indirectCity?.culler?.readIndirectArgsAll ) {

		tasks.push( indirectCity.culler.readIndirectArgsAll().then( args => {

			if ( request !== rebuildRequest ) return;
			let survivors = 0;
			const commandCount = Math.min( ARCHETYPE_COUNT, Math.floor( args.length / 5 ) );
			for ( let command = 0; command < commandCount; command ++ ) {

				const count = args[ command * 5 + 1 ] >>> 0;
				perArchetypeSurvivors[ command ] = count;
				survivors += count;

			}
			lastSurvivorCount = survivors;

		} ) );

	}

	if ( timestampSupported && renderer.backend?.trackTimestamp ) {

		tasks.push( Promise.all( [
			renderer.resolveTimestampsAsync( THREE.TimestampQuery.RENDER ),
			renderer.resolveTimestampsAsync( THREE.TimestampQuery.COMPUTE ),
		] ).then( ( [ renderMilliseconds = 0, computeMilliseconds = 0 ] ) => {

			const total = ( Number.isFinite( renderMilliseconds ) ? renderMilliseconds : 0 )
				+ ( Number.isFinite( computeMilliseconds ) ? computeMilliseconds : 0 );
			if ( total > 0 && metricWarmup === 0 ) {

				pushMetric( gpuSamples, total );
				lastGpuMilliseconds = median( gpuSamples );

			}

		} ) );

	}

	statsPromise = Promise.allSettled( tasks ).then( () => {

		statsPending = false;
		statsPromise = null;
		if ( mounted ) updateHud();

	} );

}

function formatMilliseconds( value ) {

	return Number.isFinite( value ) ? `${ value.toFixed( value < 10 ? 2 : 1 ) } ms` : 'warming…';

}

function currentDrawnCount() {

	if ( params.rendering === MODE_INDIRECT ) return lastSurvivorCount;
	if ( params.rendering === MODE_BATCHED ) return batchedVisibleCount;
	if ( params.rendering === MODE_INSTANCED ) return towerCount();
	return baselineDrawCount;

}

function updateHud() {

	if ( ! hudHeadline || ! hudCandidates || ! hudDrawn || ! hudSubmissions || ! hudMode ) return;
	const count = towerCount();
	const countLabel = count.toLocaleString();
	const indirect = params.rendering === MODE_INDIRECT;
	const batched = params.rendering === MODE_BATCHED;
	const instanced = params.rendering === MODE_INSTANCED;
	const headline = indirect
		? `<span>${ countLabel } towers · ${ ARCHETYPE_COUNT } geometries.</span><br><em>One render item · eight indirect commands.</em>`
		: batched
			? `<span>${ countLabel } towers · ${ ARCHETYPE_COUNT } geometries.</span><br><em>CPU-culled batch.</em>`
			: instanced
				? `<span>${ countLabel } instances · ${ ARCHETYPE_COUNT } pools.</span><br><em>Eight direct draws.</em>`
				: `<span>${ countLabel } Mesh objects.</span><br><em>CPU submitted.</em>`;
	const drawn = indirect && ! params.hudStats ? null : currentDrawnCount();
	const submissions = indirect ? '1 item · 8 indirect' : batched ? 'CPU batch' : instanced ? '8 direct' : `${ baselineDrawCount.toLocaleString() } direct`;
	let description;

	if ( indirect && params.culling ) {

		description = `${ INDIRECT_GENERATION_DISPATCH_COUNT } generation + ${ INDIRECT_CULLING_DISPATCH_COUNT } Three Blocks GPU-culling passes · per-geometry survivors compacted on device · 0 on CPU`;

	} else if ( indirect ) {

		description = '1 generation + 9 stable compaction passes · frustum rejection bypassed · all candidates retained';

	} else if ( batched ) {

		description = `${ countLabel } CPU frustum tests every frame · matrix texture uploads when the endless ring wraps`;

	} else if ( instanced ) {

		description = `${ INSTANCED_GENERATION_DISPATCH_COUNT } generation dispatches · no per-instance rejection · full-ring vertex work`;

	} else {

		description = `${ countLabel } Object3D nodes traversed · CPU frustum tests + visible direct draws`;

	}
	if ( ! params.travel ) description += ' · travel paused';
	if ( ! params.hudStats ) description += ' · purity mode: readbacks and timestamps off';
	const cpuMedian = median( submitSamples );
	const frameMedian = median( frameSamples );
	const cpuLabel = ! params.hudStats
		? 'disabled'
		: Number.isFinite( cpuMedian )
			? `${ formatMilliseconds( cpuMedian ) } · frame ${ formatMilliseconds( frameMedian ) }`
			: 'warming…';
	const breakdown = DEBUG && indirect && params.hudStats
		? ARCHETYPE_DEFINITIONS.map( ( definition, index ) => `${ definition.key } ${ perArchetypeSurvivors[ index ].toLocaleString() }` ).join( ' · ' )
		: '';
	const status = compilingMode ? `${ compilingMode }…` : rebuilding ? 'Rebuilding city…' : '';
	const state = [
		headline, drawn, submissions, description, cpuLabel, lastGpuMilliseconds, breakdown, status,
		params.view, params.gridSize, params.travel, params.hudStats,
	].join( '|' );
	if ( state === lastHudState ) return;
	lastHudState = state;
	hudEyebrow.innerHTML = `<b>${ indirect ? 'GPU driven' : batched ? 'CPU batched' : instanced ? 'GPU generated' : 'Scene graph' }</b> · endless ${ params.gridSize } × ${ params.gridSize } ring`;
	hudHeadline.innerHTML = headline;
	hudCandidates.textContent = countLabel;
	hudDrawn.textContent = drawn === null ? '—' : Math.max( 0, drawn ).toLocaleString();
	hudSubmissions.textContent = submissions;
	hudCpu.textContent = cpuLabel;
	hudGpu.textContent = params.hudStats ? formatMilliseconds( lastGpuMilliseconds ) : 'disabled';
	hudMode.textContent = description;
	if ( hudBreakdown ) hudBreakdown.textContent = breakdown;
	hudStatus.textContent = status;

}

function render() {

	if ( ! mounted || ! renderer || ! controls ) return;
	baselineDrawCount = 0;
	const now = performance.now();
	const frameMilliseconds = Math.max( 0, now - previousFrameTime );
	const delta = Math.min( 0.05, frameMilliseconds / 1000 );
	previousFrameTime = now;
	if ( params.travel && ! rebuilding ) {

		const direction = params.view === VIEW_STREET ? STREET_TRAVEL_DIRECTION : SECTOR_TRAVEL_DIRECTION;
		cityTravel.addScaledVector( direction, params.travelSpeed * delta );
		indirectGenerationDirty = true;
		instancedGenerationDirty = true;

	}

	const submitStart = performance.now();
	if ( ! rebuilding && ! compilingMode ) {

		if ( params.rendering === MODE_BATCHED ) updateCpuCity( MODE_BATCHED );
		else if ( params.rendering === MODE_MESHES ) updateCpuCity( MODE_MESHES );
		else if ( params.rendering === MODE_INDIRECT && indirectGenerationDirty ) {

			renderer.compute( cityGenerationCompute );
			indirectGenerationDirty = false;

		} else if ( params.rendering === MODE_INSTANCED && instancedGenerationDirty ) {

			renderer.compute( instancedGenerationComputes );
			instancedGenerationDirty = false;

		}

	}
	if ( params.view === VIEW_STREET ) camera.lookAt( controls.target );
	else controls.update();
	renderer.render( scene, camera );
	const submitMilliseconds = performance.now() - submitStart;
	if ( batchedCity && params.rendering === MODE_BATCHED ) batchedVisibleCount = batchedCity._multiDrawCount ?? batchedVisibleCount;

	if ( ! rebuilding && ! compilingMode ) {

		if ( metricWarmup > 0 ) metricWarmup --;
		else {

			pushMetric( frameSamples, frameMilliseconds );
			pushMetric( submitSamples, submitMilliseconds );

		}

	}

	if ( now >= nextUiUpdate ) {

		nextUiUpdate = now + UI_UPDATE_INTERVAL;
		pollHudEvidence();
		updateHud();

	}

}

function currentTravelBlocks() {

	const periodX = cityLayout.blockW + cityLayout.street;
	const periodZ = cityLayout.blockD + cityLayout.street;
	return {
		periodX,
		periodZ,
		x: cityTravel.x / periodX,
		z: cityTravel.y / periodZ,
	};

}

function cpuMatrixForCurrentSlot( slotIndex ) {

	const travel = currentTravelBlocks();
	const originX = Math.floor( travel.x );
	const originZ = Math.floor( travel.z );
	const matrix = writeTowerMatrix( slotIndex, originX, originZ, new THREE.Matrix4() );
	matrix.elements[ 12 ] -= ( travel.x - originX ) * travel.periodX;
	matrix.elements[ 14 ] -= ( travel.z - originZ ) * travel.periodZ;
	return matrix;

}

async function runGpuBenchmark( {
	warmupBatches = 2,
	measuredBatches = 7,
	framesPerBatch = 48,
	cpuWarmupMilliseconds = 300,
} = {} ) {

	if ( ! mounted || ! renderer || ! timestampSupported ) {

		return { samples: [], median: Number.NaN, cpuSamples: [], cpuMedian: Number.NaN };

	}
	if ( statsPromise ) await statsPromise;
	const trackTimestamp = renderer.backend.trackTimestamp;
	const samples = [];
	const cpuSamples = [];
	let cpuWarmupToken = 1;
	renderer.setAnimationLoop( null );
	renderer.backend.trackTimestamp = true;
	try {

		const cpuWarmupEnd = performance.now() + cpuWarmupMilliseconds;
		while ( performance.now() < cpuWarmupEnd ) {

			cpuWarmupToken = Math.imul( cpuWarmupToken, 1664525 ) + 1013904223;

		}
		for ( let batch = 0; batch < warmupBatches + measuredBatches; batch ++ ) {

			const submitStart = performance.now();
			for ( let frame = 0; frame < framesPerBatch; frame ++ ) {

				renderer.info.reset();
				renderer.info.frame ++;
				renderer.render( scene, camera );

			}
			const cpuPerFrame = ( performance.now() - submitStart ) / framesPerBatch;
			const [ renderMilliseconds = 0, computeMilliseconds = 0 ] = await Promise.all( [
				renderer.resolveTimestampsAsync( THREE.TimestampQuery.RENDER ),
				renderer.resolveTimestampsAsync( THREE.TimestampQuery.COMPUTE ),
			] );
			const total = ( Number.isFinite( renderMilliseconds ) ? renderMilliseconds : 0 )
				+ ( Number.isFinite( computeMilliseconds ) ? computeMilliseconds : 0 );
			if ( batch >= warmupBatches ) {

				if ( total > 0 ) samples.push( total );
				cpuSamples.push( cpuPerFrame );

			}

		}

	} finally {

		renderer.backend.trackTimestamp = trackTimestamp;
		resetMetrics();
		if ( mounted ) renderer.setAnimationLoop( render );

	}
	return {
		samples,
		median: median( samples ),
		cpuSamples,
		cpuMedian: median( cpuSamples ),
		cpuWarmupToken,
	};

}

function createExampleHandle() {

	return {
		modes: [ MODE_INDIRECT, MODE_BATCHED, MODE_INSTANCED, MODE_MESHES ],
		views: [ VIEW_SECTOR, VIEW_STREET, VIEW_OVERVIEW ],
		getState: () => ( {
			ready: mounted && ! rebuilding && ! compilingMode,
			mode: params.rendering,
			view: params.view,
			gridSize: params.gridSize,
			candidateCount: towerCount(),
			survivorCount: currentDrawnCount(),
			archetypeRanges: slotAssignment.ranges.map( range => ( { ...range } ) ),
			built: {
				indirect: Boolean( indirectCity ),
				batched: Boolean( batchedCity ),
				instanced: Boolean( instancedCity ),
				meshes: Boolean( meshCity ),
			},
		} ),
		getMetrics: () => ( {
			cpuSubmitMedian: median( submitSamples ),
			cpuSubmitSamples: [ ...submitSamples ],
			frameMedian: median( frameSamples ),
			gpuMilliseconds: lastGpuMilliseconds,
			gpuSamples: [ ...gpuSamples ],
			survivorCount: currentDrawnCount(),
			perArchetype: Array.from( perArchetypeSurvivors ),
		} ),
		getCameraState: () => ( {
			position: camera.position.toArray(),
			target: controls.target.toArray(),
		} ),
		getTravelBlocks: currentTravelBlocks,
		setMode: setRenderingMode,
		setGridSize: rebuildCitySize,
		setView: view => {

			const normalized = normalizeView( view );
			if ( ! normalized ) throw new TypeError( `Unknown city view: ${view}` );
			params.view = normalized;
			frameCity( true );

		},
		setCulling: enabled => {

			params.culling = enabled;
			if ( indirectCity ) indirectCity.perObjectFrustumCulled = enabled;

		},
		setTravel: enabled => {

			params.travel = enabled;

		},
		setTravelPosition: ( x, z ) => {

			if ( ! Number.isFinite( x ) || ! Number.isFinite( z ) ) throw new TypeError( 'Travel blocks must be finite.' );
			const { periodX, periodZ } = currentTravelBlocks();
			params.travel = false;
			cityTravel.set( x * periodX, z * periodZ );
			indirectGenerationDirty = true;
			instancedGenerationDirty = true;
			updateModeControllers();

		},
		setCameraState: state => {

			if ( ! Array.isArray( state?.position ) || ! Array.isArray( state?.target ) ) {

				throw new TypeError( 'Camera state requires position and target arrays.' );

			}
			params.autoOrbit = false;
			controls.autoRotate = false;
			controls._sphericalDelta.set( 0, 0, 0 );
			controls._panOffset.set( 0, 0, 0 );
			controls._scale = 1;
			camera.position.fromArray( state.position );
			controls.target.fromArray( state.target );
			controls.update();
			camera.updateMatrixWorld();
			updateModeControllers();

		},
		setHudStats: setHudStatsEnabled,
		runGpuBenchmark,
		whenIdle: async () => {

			while ( mounted && ( rebuilding || compilingMode ) ) await nextPaint();
			await nextPaint();
			await nextPaint();

		},
		inspectIndirectDraws: () => indirectCity.culler.readIndirectArgsAll(),
		inspectGpuSlot: async slotIndex => {

			const byteOffset = slotIndex * 16 * Float32Array.BYTES_PER_ELEMENT;
			const buffer = await renderer.getArrayBufferAsync(
				indirectCity.matricesSB,
				null,
				byteOffset,
				16 * Float32Array.BYTES_PER_ELEMENT
			);
			return Array.from( new Float32Array( buffer ) );

		},
		inspectCpuSlot: slotIndex => cpuMatrixForCurrentSlot( slotIndex ).toArray(),
		dispose: unmount,
	};

}

function disposeCities() {

	if ( indirectCity ) {

		indirectCity.removeFromParent();
		indirectCity.disposeGUI();
		indirectCity.dispose();
		indirectCity = null;

	}
	if ( batchedCity ) {

		batchedCity.removeFromParent();
		batchedCity.dispose();
		batchedCity = null;

	}
	if ( instancedCity ) {

		instancedCity.removeFromParent();
		for ( const child of instancedCity.children ) child.dispose?.();
		instancedCity.clear();
		instancedCity = null;

	}
	if ( meshCity ) {

		meshCity.removeFromParent();
		for ( const child of meshCity.children ) child.parent = null;
		meshCity.children.length = 0;
		meshCity = null;

	}
	meshRepresentative = null;
	cityGenerationCompute = null;
	instancedGenerationComputes = [];
	instancedMatrixAttributes = [];
	batchedVisibleCount = 0;
	baselineDrawCount = 0;
	batchedOriginBlockX = Number.NaN;
	batchedOriginBlockZ = Number.NaN;
	meshOriginBlockX = Number.NaN;
	meshOriginBlockZ = Number.NaN;

}

function disposeSizeDependentMaterials() {

	indirectMaterial?.dispose();
	batchedMaterial?.dispose();
	instancedMaterial?.dispose();
	meshMaterial?.dispose();
	indirectMaterial = null;
	batchedMaterial = null;
	instancedMaterial = null;
	meshMaterial = null;

}

function disposeObjectTree( root ) {

	if ( ! root ) return;
	const geometries = new Set();
	const materials = new Set();
	root.traverse( object => {

		if ( object.geometry ) geometries.add( object.geometry );
		if ( Array.isArray( object.material ) ) object.material.forEach( material => materials.add( material ) );
		else if ( object.material ) materials.add( object.material );

	} );
	geometries.forEach( geometry => geometry.dispose() );
	materials.forEach( material => material.dispose() );

}

export async function unmount() {

	mounted = false;
	modeRequest ++;
	rebuildRequest ++;
	renderer?.setAnimationLoop( null );
	if ( statsPromise ) await statsPromise;
	resizeObserver?.disconnect();
	resizeObserver = null;
	gui?.destroy();
	gui = null;
	renderingController = null;
	cullingController = null;
	orbitController = null;
	gridController = null;
	controls?.dispose();
	controls = null;
	window.clearTimeout( toastTimeout );
	hud?.remove();
	hudStyle?.remove();
	toast?.remove();
	hud = null;
	hudStyle = null;
	toast = null;
	hudEyebrow = null;
	hudHeadline = null;
	hudCandidates = null;
	hudDrawn = null;
	hudSubmissions = null;
	hudCpu = null;
	hudGpu = null;
	hudMode = null;
	hudBreakdown = null;
	hudStatus = null;
	disposeCities();
	disposeSizeDependentMaterials();
	facadeTextures?.map.dispose();
	facadeTextures?.emissiveMap.dispose();
	facadeTextures = null;
	sourceGeometries.forEach( geometry => geometry.dispose() );
	sourceGeometries = [];
	disposeObjectTree( stage );
	scene?.remove( stage );
	stage = null;
	road = null;

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
	cityLayout = null;
	cityParameters = null;
	slotAssignment = null;
	slotCellIndicesSB = null;
	cityTravelNode = null;
	portraitLayout = null;
	lastHudState = '';
	nextUiUpdate = 0;
	previousFrameTime = 0;
	indirectGenerationDirty = true;
	instancedGenerationDirty = true;
	rebuilding = false;
	compilingMode = '';
	statsPending = false;
	statsPromise = null;
	frameSamples = [];
	submitSamples = [];
	gpuSamples = [];
	compiledModes = new Set();
	cityTravel.set( 0, 0 );

}
