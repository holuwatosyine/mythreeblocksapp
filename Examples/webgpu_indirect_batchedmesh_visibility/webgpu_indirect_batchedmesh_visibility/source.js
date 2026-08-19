/**
 * The Brick Room
 *
 * One MLS-MPM/APIC particle drives each colorful toy brick. The solver writes
 * every tumbling transform and LOD choice directly into one IndirectBatchedMesh,
 * then the GPU culler compacts visible pieces into 24 indirect commands. Pointer
 * motion stirs the shared grid; BUILD assembles a giant brick from the sea.
 */

import * as THREE from 'three/webgpu';
import { registerDevtools } from 'three-blocks/devtools';

import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
	If,
	Fn,
	Loop,
	clamp,
	color,
	cross,
	dot,
	float,
	hash,
	int,
	instanceIndex,
	mat4,
	max,
	min,
	mix,
	normalize,
	positionWorld,
	smoothstep,
	storage,
	uniform,
	uint,
	vec3,
	vec4,
} from 'three/tsl';

import { IndirectBatchedMesh } from 'three-blocks';
import { MPMGranularModel, MPMSolver } from 'three-blocks/mpm';
import { shaderCache } from 'three-blocks/shaders';
import {
	BRICK_ARCHETYPE_COUNT,
	BRICK_ARCHETYPES,
	BRICK_COUNT_OPTIONS,
	BRICK_GEOMETRY_COUNT,
	BRICK_LOD_TIERS,
	BRICK_PALETTE,
	DEFAULT_BRICK_COUNT,
	MPM_BOUNDARY_MARGIN,
	MPM_GRID_SIZE,
	ROOM_SIZE,
	auditBrickGeometries,
	createBuildTargets,
	createBrickGeometries,
	createInitialBrickField,
	random01,
} from './field-data.js';

const REDUCED_MOTION_QUERY = window.matchMedia( '(prefers-reduced-motion: reduce)' );
const POINTER_TARGET_Y = 0;
const POINTER_TARGET_Z = - 1.2;
const POINTER_RADIUS = 2.9;
const MAX_POINTER_ACCELERATION = 390;
const ROOM_FLOOR_Y = 0.26;
// The authored eight-unit room represents a roughly three-metre playroom, so
// Earth gravity is converted through that visual scale before entering MPM.
const ROOM_HEIGHT_METERS = 3;
const WORLD_GRAVITY_Y = - 9.81 * ROOM_SIZE[ 1 ] / ROOM_HEIGHT_METERS;
const MPM_GRAVITY_Y = WORLD_GRAVITY_Y * MPM_GRID_SIZE[ 1 ] / ROOM_SIZE[ 1 ];
const MAX_PARTICLE_SPEED = 72;
const PIECE_RELEASE_RATE = 8_192;
const COLLISION_PUSHBACK = 0.98;
const CAMERA_PRESETS = Object.freeze( {
	overview: Object.freeze( {
		position: Object.freeze( [ 10, 24, 18 ] ),
		target: Object.freeze( [ 0, 1.25, - 1.5 ] ),
		label: 'Overview',
	} ),
	kid: Object.freeze( {
		position: Object.freeze( [ 13, 3.15, 13 ] ),
		target: Object.freeze( [ 3, 0.3, 3.7 ] ),
		label: 'Kid’s-eye',
	} ),
} );
const LOD_NEAR_DISTANCE = 12;
const LOD_FAR_DISTANCE = 28;
const LOD_HYSTERESIS = 0.1;
const PIECE_SCALE_MIN = 0.36;
const PIECE_SCALE_MAX = 0.44;
const MAX_SPIN_RATE = 8;
const BUILD_SPRING = 72;
const BUILD_DAMPING = 15;
const HUD_READBACK_INTERVAL = 250;
const TAU = Math.PI * 2;
const PUSH_COLOR = 0x2468d2;

let container;
let containerStyle;
let mountAssets = null;
let renderer;
let devtools;
let scene;
let camera;
let stage;
let resizeObserver;
let environmentTexture;
let brickMesh;
let brickMaterial;
let brickGeometries = [];
let geometryAudit = [];
let brickField;
let solver;
let seedPositionAttribute;
let furnitureColliderAttribute;
let geometryBoundsAttribute;
let brickSeedInitializer;
let brickOrientationSeedPass;
let brickPosePass;
let shaderRegistration;
let quaternionAttribute;
let buildTargetAttribute;
let buildTargets;
let floorMaterial;
let rugMaterial;
let cursorGroup;
let cursorWireMaterial;
let cursorLight;
let interfaceElement;
let interfaceStyle;
let pauseButton;
let resetButton;
let buildButton;
let cameraButton;
let countSelect;
let statusElement;
let mounted = false;
let ready = false;
let paused = false;
let resetting = false;
let rebuilding = false;
let simulationSeeded = false;
let pieceCount = DEFAULT_BRICK_COUNT;
let fixedTimeStep = null;
let previousTime = 0;
let contextLossReport = null;
let cameraPreset = 'kid';
let buildActive = false;
let buildPhase = 0;
let releaseElapsed = 0;
let activePieceCount = 1;
let hudReadbackEnabled = true;
let hudReadbackPending = false;
let nextHudReadback = 0;
let drawnPieces = 0;
let drawnTriangles = 0;
let systemGeneration = 0;
let uPointerPosition;
let uPointerVelocity;
let uPointerInfluence;
let uPointerStrength;
let uFrameDelta;
let uCameraPosition;
let uBuildPhase;
let uActivePieceCount;

const ownedGeometries = new Set();
const ownedMaterials = new Set();
const furnitureColliders = [];
const eventDisposers = [];
const raycaster = new THREE.Raycaster();
const pointerBounds = new THREE.Box3(
	new THREE.Vector3( - ROOM_SIZE[ 0 ] * 0.5 + 0.45, 0.55, - ROOM_SIZE[ 2 ] * 0.5 + 0.45 ),
	new THREE.Vector3( ROOM_SIZE[ 0 ] * 0.5 - 0.45, ROOM_SIZE[ 1 ] - 0.55, ROOM_SIZE[ 2 ] * 0.5 - 0.45 )
);
const pointerNdc = new THREE.Vector2();
const pointerPlane = new THREE.Plane();
const pointerPlaneNormal = new THREE.Vector3();
const pointerHit = new THREE.Vector3();
const pointerTarget = new THREE.Vector3( 0, POINTER_TARGET_Y, POINTER_TARGET_Z );
const pointerRayOrigin = new THREE.Vector3();
const pointerRayDirection = new THREE.Vector3( 0, 0, - 1 );
const pointerVelocity = new THREE.Vector3();
const pointerPrevious = new THREE.Vector3();
const matrix = new THREE.Matrix4();
const quaternion = new THREE.Quaternion();
const euler = new THREE.Euler();
const scale = new THREE.Vector3();
const worldPosition = new THREE.Vector3();
const instanceColor = new THREE.Color();
const cameraTarget = new THREE.Vector3();
const cameraPositionGoal = new THREE.Vector3();
const cameraTargetGoal = new THREE.Vector3();

const pointerState = {
	inside: false,
	pressed: false,
	projected: false,
	lastMoveTime: 0,
};

export async function mount( containerElement, options = {} ) {

	if ( mounted ) throw new Error( 'The Brick Room is already mounted.' );
	container = containerElement;
	mountAssets = options.assets ?? {};
	const requestedCount = Number( options.pieceCount );
	pieceCount = Number.isInteger( requestedCount ) && requestedCount > 0
		? Math.min( BRICK_COUNT_OPTIONS.at( - 1 ), requestedCount )
		: ( options.reducedWorkload || window.innerWidth < 512 ? BRICK_COUNT_OPTIONS[ 0 ] : DEFAULT_BRICK_COUNT );
	paused = options.paused ?? REDUCED_MOTION_QUERY.matches;
	fixedTimeStep = Number.isFinite( Number( options.fixedTimeStep ) ) && Number( options.fixedTimeStep ) > 0
		? Number( options.fixedTimeStep )
		: null;
	hudReadbackEnabled = options.hudReadback ?? fixedTimeStep === null;
	cameraPreset = options.cameraPreset === 'overview' ? 'overview' : 'kid';
	containerStyle = {
		position: container.style.position,
		overflow: container.style.overflow,
		touchAction: container.style.touchAction,
		background: container.style.background,
	};
	container.style.position = 'relative';
	container.style.overflow = 'hidden';
	container.style.touchAction = 'none';
	container.style.background = '#b9d8ee';
	mounted = true;

	if ( WebGPU.isAvailable() === false ) {

		container.appendChild( WebGPU.getErrorMessage() );
		throw new Error( 'The Brick Room requires WebGPU.' );

	}

	try {

		await init();
		return createExampleHandle();

	} catch ( error ) {

		await unmount();
		throw error;

	}

}

async function init() {

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xb9d8ee );
	scene.fog = new THREE.Fog( 0xb9d8ee, 65, 125 );

	camera = new THREE.PerspectiveCamera( 62, 1, 0.08, 160 );
	const initialCamera = CAMERA_PRESETS[ cameraPreset ];
	camera.position.fromArray( initialCamera.position );
	cameraTarget.fromArray( initialCamera.target );
	cameraPositionGoal.copy( camera.position );
	cameraTargetGoal.copy( cameraTarget );
	camera.lookAt( cameraTarget );
	camera.updateMatrixWorld();
	camera.getWorldDirection( pointerPlaneNormal );
	pointerPlane.setFromNormalAndCoplanarPoint( pointerPlaneNormal, cameraTarget );
	pointerRayOrigin.copy( camera.position );
	pointerRayDirection.copy( cameraTarget ).sub( pointerRayOrigin ).normalize();

	renderer = new THREE.WebGPURenderer( { antialias: true } );
	devtools = registerDevtools( { renderer, container } );
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 0.8;
	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, 1.5 ) );
	renderer.domElement.setAttribute( 'role', 'application' );
	renderer.domElement.setAttribute( 'tabindex', '0' );
	renderer.domElement.setAttribute(
		'aria-label',
		'Interactive playroom where colorful toy bricks rain from the ceiling. Move to stir, hold to push, or build a giant brick.'
	);
	container.appendChild( renderer.domElement );
	await renderer.init();
	observeContextLoss();

	// GPU-compressed UASTC HDR environment: BC6H where the hardware supports
	// it, RGBA16F elsewhere. Three prefilters it on first environment use.
	const environmentUrl = mountAssets?.environment;
	const environmentTranscoder = mountAssets?.transcoderPath ?? mountAssets?.basis;
	if ( typeof environmentUrl !== 'string' || environmentUrl.length === 0 ) throw new Error( 'The Brick Room requires assets.environment.' );
	if ( ! environmentTranscoder ) throw new Error( 'KTX2 environments require assets.transcoderPath.' );
	const environmentLoader = new KTX2Loader()
		.setTranscoderPath( `${String( environmentTranscoder ).replace( /\/$/u, '' )}/` )
		.detectSupport( renderer );
	try {

		environmentTexture = await environmentLoader.loadAsync( environmentUrl );

	} finally {

		environmentLoader.dispose();

	}
	environmentTexture.mapping = THREE.EquirectangularReflectionMapping;
	scene.environment = environmentTexture;
	// Photographic HDR reads stronger than the old neutral studio; keep it subtle.
	scene.environmentIntensity = 0.55;

	brickGeometries = createBrickGeometries( THREE, mergeGeometries );
	for ( const geometry of brickGeometries ) ownedGeometries.add( geometry );
	geometryAudit = auditBrickGeometries( brickGeometries );
	buildTargets = createBuildTargets();
	buildTargetAttribute = new THREE.StorageBufferAttribute( buildTargets.positions, 4 );
	createStage();
	createBrickSystem();
	createPointerCursor();
	createInterface();
	bindInteraction();

	resizeObserver = new ResizeObserver( resize );
	resizeObserver.observe( container );
	resize();

	// Compile and submit one upload/render cycle before the solver takes ownership
	// of the shared matrix buffer. This makes initial mount and Scatter follow the
	// same seed transaction instead of racing the batch's first CPU buffer upload.
	await renderer.compileAsync( scene, camera );
	renderer.render( scene, camera );
	await renderer.backend?.device?.queue?.onSubmittedWorkDone?.();
	await resetBricks( { announce: false } );

	ready = true;
	updateInterface();
	previousTime = performance.now();
	renderer.setAnimationLoop( render );

}

function observeContextLoss() {

	const lost = renderer?.backend?.device?.lost;
	if ( ! lost?.then ) return;
	void lost.then( info => {

		contextLossReport = {
			at: new Date().toISOString(),
			reason: info?.reason ?? 'unknown',
			message: info?.message ?? 'WebGPU device lost.',
		};
		if ( mounted ) showStatus( `GPU context lost · ${ contextLossReport.reason }`, 'error' );

	} );

}

function ownGeometry( geometry ) {

	ownedGeometries.add( geometry );
	return geometry;

}

function ownMaterial( material ) {

	ownedMaterials.add( material );
	return material;

}

function roomMaterial( color, roughness = 0.82 ) {

	return ownMaterial( new THREE.MeshStandardNodeMaterial( {
		color,
		roughness,
		metalness: 0,
	} ) );

}

function addRoomBox( name, size, position, material, radius = 0 ) {

	const geometry = radius > 0
		? new RoundedBoxGeometry( size[ 0 ], size[ 1 ], size[ 2 ], 4, radius )
		: new THREE.BoxGeometry( size[ 0 ], size[ 1 ], size[ 2 ] );
	const mesh = new THREE.Mesh( ownGeometry( geometry ), material );
	mesh.name = name;
	mesh.position.fromArray( position );
	mesh.receiveShadow = true;
	stage.add( mesh );
	return mesh;

}

function addFurnitureBox( name, size, position, material, radius = 0.06 ) {

	const mesh = addRoomBox( name, size, position, material, radius );
	furnitureColliders.push( { name, size, position } );
	return mesh;

}

function addKidChair( name, x, z, backDirection, material, trimMaterial ) {

	addFurnitureBox( `${ name }Seat`, [ 1.9, 0.28, 1.8 ], [ x, 1.18, z ], material, 0.1 );
	addFurnitureBox(
		`${ name }Back`,
		[ 1.9, 1.5, 0.26 ],
		[ x, 2.02, z + backDirection * 0.77 ],
		material,
		0.08
	);
	for ( const xOffset of [ - 0.72, 0.72 ] ) {

		for ( const zOffset of [ - 0.65, 0.65 ] ) {

			addRoomBox(
				`${ name }Leg`,
				[ 0.24, 1.02, 0.24 ],
				[ x + xOffset, 0.65, z + zOffset ],
				trimMaterial,
				0.05
			);

		}

	}

}

function createStage() {

	stage = new THREE.Group();
	stage.name = 'BrickRoomStage';
	scene.add( stage );
	furnitureColliders.length = 0;

	floorMaterial = roomMaterial( 0xe7cf9f, 0.9 );
	const backWallMaterial = roomMaterial( 0xfff4d2, 0.94 );
	const sideWallMaterial = roomMaterial( 0xdcecf8, 0.92 );
	const trimMaterial = roomMaterial( 0x17233c, 0.68 );
	const shelfMaterial = roomMaterial( 0xf7f5ef, 0.76 );
	const honeyWoodMaterial = roomMaterial( 0xe9a94f, 0.68 );
	const paleWoodMaterial = roomMaterial( 0xf2d497, 0.72 );
	const furnitureBlueMaterial = roomMaterial( 0x3980ca, 0.64 );
	const furnitureRedMaterial = roomMaterial( 0xe85a46, 0.66 );
	const furnitureGreenMaterial = roomMaterial( 0x58ad78, 0.7 );
	const cushionMaterial = roomMaterial( 0xf2c848, 0.78 );
	rugMaterial = roomMaterial( 0x4f86cb, 0.88 );
	updateContactMaterials();

	addRoomBox( 'PlayroomFloor', [ ROOM_SIZE[ 0 ] + 0.7, 0.48, ROOM_SIZE[ 2 ] + 0.7 ], [ 0, 0, 0 ], floorMaterial, 0.16 );
	addRoomBox( 'PlayroomBackWall', [ ROOM_SIZE[ 0 ] + 0.7, ROOM_SIZE[ 1 ], 0.34 ], [ 0, ROOM_SIZE[ 1 ] * 0.5, - ROOM_SIZE[ 2 ] * 0.5 - 0.14 ], backWallMaterial, 0.12 );
	addRoomBox( 'PlayroomSideWall', [ 0.34, ROOM_SIZE[ 1 ], ROOM_SIZE[ 2 ] + 0.7 ], [ - ROOM_SIZE[ 0 ] * 0.5 - 0.14, ROOM_SIZE[ 1 ] * 0.5, 0 ], sideWallMaterial, 0.12 );
	addRoomBox( 'BackBaseboard', [ ROOM_SIZE[ 0 ] + 0.3, 0.18, 0.16 ], [ 0, 0.42, - ROOM_SIZE[ 2 ] * 0.5 + 0.02 ], trimMaterial, 0.04 );
	addRoomBox( 'SideBaseboard', [ 0.16, 0.18, ROOM_SIZE[ 2 ] + 0.3 ], [ - ROOM_SIZE[ 0 ] * 0.5 + 0.02, 0.42, 0 ], trimMaterial, 0.04 );
	addRoomBox( 'DisplayShelf', [ 8.8, 0.18, 0.62 ], [ 0.55, 4.62, - ROOM_SIZE[ 2 ] * 0.5 + 0.22 ], shelfMaterial, 0.07 );

	const rug = new THREE.Mesh( ownGeometry( new THREE.CircleGeometry( 7.2, 32 ) ), rugMaterial );
	rug.name = 'RoundPlayRug';
	rug.rotation.x = - Math.PI * 0.5;
	rug.position.set( - 2.5, 0.255, - 0.4 );
	stage.add( rug );

	// A low craft table anchors the kid's-eye shot and catches the BUILD sculpture.
	addFurnitureBox( 'CraftTableTop', [ 6.2, 0.38, 3.8 ], [ 1.2, 2.3, - 1.8 ], honeyWoodMaterial, 0.14 );
	for ( const x of [ - 1.35, 3.75 ] ) {

		for ( const z of [ - 3.15, - 0.45 ] ) {

			addFurnitureBox( 'CraftTableLeg', [ 0.48, 2.1, 0.48 ], [ x, 1.24, z ], paleWoodMaterial, 0.09 );

		}

	}
	addRoomBox( 'CraftTableFrontApron', [ 5.55, 0.42, 0.2 ], [ 1.2, 1.98, 0.01 ], furnitureRedMaterial, 0.05 );
	addRoomBox( 'CraftTableSideApron', [ 0.2, 0.42, 3.25 ], [ - 1.72, 1.98, - 1.8 ], furnitureBlueMaterial, 0.05 );

	// A second activity table, three chairs, a cubby, and a foreground storage bench.
	addFurnitureBox( 'DrawingTableTop', [ 4.4, 0.32, 2.8 ], [ - 10, 1.86, 5.35 ], paleWoodMaterial, 0.12 );
	addFurnitureBox( 'DrawingTableLeftTrestle', [ 0.38, 1.58, 2.25 ], [ - 11.7, 1.03, 5.35 ], furnitureGreenMaterial, 0.08 );
	addFurnitureBox( 'DrawingTableRightTrestle', [ 0.38, 1.58, 2.25 ], [ - 8.3, 1.03, 5.35 ], furnitureGreenMaterial, 0.08 );
	addRoomBox( 'DrawingTableApron', [ 3.55, 0.32, 0.18 ], [ - 10, 1.61, 6.62 ], furnitureBlueMaterial, 0.04 );

	addKidChair( 'BlueChair', 5.45, 1.75, 1, furnitureBlueMaterial, paleWoodMaterial );
	addKidChair( 'RedChair', - 3.65, 0.75, 1, furnitureRedMaterial, paleWoodMaterial );
	addKidChair( 'GreenChair', 4.75, - 5.5, - 1, furnitureGreenMaterial, paleWoodMaterial );

	addFurnitureBox( 'SideCubby', [ 1.7, 3.15, 5.8 ], [ - 15.85, 1.84, - 5.6 ], paleWoodMaterial, 0.12 );
	for ( const z of [ - 7.35, - 5.6, - 3.85 ] ) {

		addRoomBox( 'CubbyInset', [ 0.12, 1.05, 1.28 ], [ - 14.96, 1.85, z ], furnitureBlueMaterial, 0.03 );

	}

	addFurnitureBox( 'StorageBench', [ 4.8, 1.55, 2 ], [ 10.2, 1.03, 7.6 ], furnitureBlueMaterial, 0.14 );
	addFurnitureBox( 'StorageBenchCushion', [ 4.85, 0.3, 2.05 ], [ 10.2, 1.88, 7.6 ], cushionMaterial, 0.13 );
	for ( const x of [ 8.8, 10.2, 11.6 ] ) {

		addRoomBox( 'StorageDrawer', [ 1.15, 0.7, 0.12 ], [ x, 0.98, 6.54 ], furnitureRedMaterial, 0.05 );

	}

	const windowMaterial = ownMaterial( new THREE.MeshStandardNodeMaterial( {
		color: 0xffe7a8,
		emissive: 0xffd27a,
		emissiveIntensity: 1.8,
		roughness: 0.5,
	} ) );
	const window = new THREE.Mesh( ownGeometry( new THREE.PlaneGeometry( 7.2, 3.8 ) ), windowMaterial );
	window.name = 'AfternoonWindow';
	window.position.set( - 7.6, 5.25, - ROOM_SIZE[ 2 ] * 0.5 + 0.19 );
	stage.add( window );
	addRoomBox( 'WindowTop', [ 7.8, 0.18, 0.24 ], [ - 7.6, 7.25, - ROOM_SIZE[ 2 ] * 0.5 + 0.24 ], trimMaterial, 0.03 );
	addRoomBox( 'WindowBottom', [ 7.8, 0.18, 0.24 ], [ - 7.6, 3.25, - ROOM_SIZE[ 2 ] * 0.5 + 0.24 ], trimMaterial, 0.03 );
	addRoomBox( 'WindowLeft', [ 0.18, 4.18, 0.24 ], [ - 11.45, 5.25, - ROOM_SIZE[ 2 ] * 0.5 + 0.24 ], trimMaterial, 0.03 );
	addRoomBox( 'WindowRight', [ 0.18, 4.18, 0.24 ], [ - 3.75, 5.25, - ROOM_SIZE[ 2 ] * 0.5 + 0.24 ], trimMaterial, 0.03 );
	addRoomBox( 'WindowMullion', [ 0.12, 3.8, 0.26 ], [ - 7.6, 5.25, - ROOM_SIZE[ 2 ] * 0.5 + 0.25 ], trimMaterial, 0.02 );

	const shaftGeometry = ownGeometry( new THREE.BufferGeometry() );
	shaftGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [
		- 11.1, 6.7, - 14.7,
		- 4.1, 6.7, - 14.7,
		- 0.8, 0.3, 3.5,
		- 13.2, 0.3, 3.5,
	], 3 ) );
	shaftGeometry.setIndex( [ 0, 1, 2, 0, 2, 3 ] );
	shaftGeometry.computeVertexNormals();
	const shaft = new THREE.Mesh( shaftGeometry, ownMaterial( new THREE.MeshBasicNodeMaterial( {
		color: 0xffd67f,
		transparent: true,
		opacity: 0.085,
		depthWrite: false,
		side: THREE.DoubleSide,
	} ) ) );
	shaft.name = 'VisibleSunShaft';
	stage.add( shaft );

	const crayonColors = [ 0xe63b2e, 0xf6c83f, 0x2468d2, 0x38a96b, 0x7859c8 ];
	for ( const [ index, crayonColor ] of crayonColors.entries() ) {

		const crayon = new THREE.Mesh(
			ownGeometry( new THREE.CylinderGeometry( 0.17, 0.17, 2.1, 6 ) ),
			roomMaterial( crayonColor, 0.6 )
		);
		crayon.name = `OversizedCrayon${ index + 1 }`;
		crayon.rotation.z = Math.PI * 0.5;
		crayon.rotation.y = index * 0.13;
		crayon.position.set( - 13.5 + index * 0.48, 0.52, 8.8 + index * 0.62 );
		stage.add( crayon );

	}

	const bin = new THREE.Group();
	bin.name = 'TippedToyBin';
	bin.position.set( 11.4, 1.55, - 10.2 );
	bin.rotation.set( 0.04, - 0.5, 0.34 );
	const binMaterial = roomMaterial( 0xe8583e, 0.68 );
	const binTrim = roomMaterial( 0xffd55f, 0.62 );
	const addBinPanel = ( name, size, position, rotation = [ 0, 0, 0 ], material = binMaterial ) => {

		const panel = new THREE.Mesh( ownGeometry( new THREE.BoxGeometry( ...size ) ), material );
		panel.name = name;
		panel.position.fromArray( position );
		panel.rotation.set( ...rotation );
		bin.add( panel );

	};
	addBinPanel( 'BinFloor', [ 5.6, 0.24, 4.2 ], [ 0, - 1.5, 0 ], [ 0, 0, 0 ], binTrim );
	addBinPanel( 'BinBack', [ 5.6, 3.2, 0.24 ], [ 0, 0, - 2 ] );
	addBinPanel( 'BinLeft', [ 0.24, 3.2, 4.2 ], [ - 2.68, 0, 0 ] );
	addBinPanel( 'BinRight', [ 0.24, 3.2, 4.2 ], [ 2.68, 0, 0 ] );
	stage.add( bin );

	const artColors = [ 0xe63b2e, 0xf6c83f, 0x2468d2, 0x38a96b ];
	for ( let index = 0; index < artColors.length; index ++ ) {

		addRoomBox(
			`BrickWallArt${ index + 1 }`,
			[ 1.25 + ( index % 2 ) * 0.65, 0.72, 0.12 ],
			[ 6.2 + index * 1.65, 5.8 + ( index % 2 ) * 0.82, - ROOM_SIZE[ 2 ] * 0.5 + 0.27 ],
			roomMaterial( artColors[ index ], 0.54 ),
			0.09
		);

	}

	const displayDefinitions = [
		{ geometry: 3, color: 0xe63b2e, x: - 3.25, scale: 2.15, rotation: - 0.08 },
		{ geometry: 2, color: 0xf6c83f, x: - 0.55, scale: 2.2, rotation: 0.08 },
		{ geometry: 4, color: 0x2468d2, x: 2.35, scale: 2.25, rotation: - 0.05 },
		{ geometry: 5, color: 0x38a96b, x: 4.48, scale: 2.25, rotation: 0.04 },
	];
	for ( const [ index, definition ] of displayDefinitions.entries() ) {

		const material = ownMaterial( new THREE.MeshStandardNodeMaterial( {
			color: definition.color,
			vertexColors: true,
			roughness: 0.34,
			metalness: 0.015,
		} ) );
		const displayBrick = new THREE.Mesh( brickGeometries[ definition.geometry * BRICK_LOD_TIERS ], material );
		displayBrick.name = `WallDisplayBrick${ index + 1 }`;
		displayBrick.position.set( definition.x, 5.45, - ROOM_SIZE[ 2 ] * 0.5 + 0.39 );
		displayBrick.rotation.set( Math.PI * 0.5, 0, definition.rotation );
		displayBrick.scale.setScalar( definition.scale );
		stage.add( displayBrick );

	}

	const hemisphere = new THREE.HemisphereLight( 0xe5f4ff, 0xc6a57a, 2 );
	const key = new THREE.DirectionalLight( 0xffd69a, 4.7 );
	key.position.set( - 8, 12, 4 );
	const bounce = new THREE.PointLight( 0x87c9ff, 16, 22, 1.55 );
	bounce.position.set( - 4.8, 5.4, 4.2 );
	stage.add( hemisphere, key, bounce );

}

function geometryReservations() {

	return brickGeometries.reduce( ( total, geometry ) => {

		total.vertices += geometry.getAttribute( 'position' ).count;
		total.indices += geometry.getIndex()?.count ?? 0;
		return total;

	}, { vertices: 0, indices: 0 } );

}

function initializeBrickInstances( geometryIds ) {

	const color = instanceColor;
	const positionArray = brickField.positions;
	brickMesh.beginBulkUpdate?.();
	for ( let slot = 0; slot < pieceCount; slot ++ ) {

		const geometryId = geometryIds[ brickField.slotArchetypeIds[ slot ] * BRICK_LOD_TIERS ];
		const instanceId = brickMesh.addInstance( geometryId );
		if ( instanceId !== slot ) throw new Error( `Brick slot ${ slot } was allocated as ${ instanceId }.` );

	}
	brickMesh.endBulkUpdate?.();

	for ( let slot = 0; slot < pieceCount; slot ++ ) {

		const offset = slot * 4;
		worldPosition.set(
			( positionArray[ offset ] - 0.5 ) * ROOM_SIZE[ 0 ],
			positionArray[ offset + 1 ] * ROOM_SIZE[ 1 ],
			( positionArray[ offset + 2 ] - 0.5 ) * ROOM_SIZE[ 2 ]
		);
		const sourceId = brickField.slotSourceIds[ slot ];
		euler.set(
			( random01( sourceId, 11 ) - 0.5 ) * 1.15,
			random01( sourceId, 13 ) * TAU,
			( random01( sourceId, 17 ) - 0.5 ) * 1.15
		);
		quaternion.setFromEuler( euler );
		scale.setScalar( PIECE_SCALE_MIN + random01( sourceId, 19 ) * ( PIECE_SCALE_MAX - PIECE_SCALE_MIN ) );
		matrix.compose( worldPosition, quaternion, scale );
		brickMesh.setMatrixAt( slot, matrix );
		color.setHex( BRICK_PALETTE[ brickField.colorIndices[ slot ] ].value );
		brickMesh.setColorAt( slot, color );

	}

}

function createBrickSystem() {

	releaseElapsed = 0;
	activePieceCount = 1;
	brickField = createInitialBrickField( pieceCount );
	const reservations = geometryReservations();
	brickMaterial = ownMaterial( new THREE.MeshStandardNodeMaterial( {
		color: 0xffffff,
		vertexColors: true,
		roughness: 0.31,
		metalness: 0.018,
	} ) );
	brickMaterial.envMapIntensity = 0.78;
	brickMesh = new IndirectBatchedMesh(
		pieceCount,
		Math.max( 1, reservations.vertices ),
		Math.max( 1, reservations.indices ),
		brickMaterial
	);
	brickMesh.name = 'MLSMPMBrickBatch';
	brickMesh.raycast = () => {};
	brickMesh.perObjectFrustumCulled = true;
	const geometryIds = brickGeometries.map( geometry => brickMesh.addGeometry( geometry ) );
	initializeBrickInstances( geometryIds );
	brickMesh.enableInternalCulling( renderer );
	brickMesh.culler.frustumPadXY.value = 0.06;
	brickMesh.culler.frustumPadZNear.value = 0.03;
	brickMesh.culler.frustumPadZFar.value = 0.03;
	stage.add( brickMesh );

	seedPositionAttribute = new THREE.StorageBufferAttribute( brickField.positions, 4 );
	const seedPositions = storage( seedPositionAttribute, 'vec4', pieceCount ).toReadOnly()
		.setName( 'brickRoomSeedPositions' );
	quaternionAttribute = new THREE.StorageBufferAttribute( new Float32Array( pieceCount * 4 ), 4 );
	const renderQuaternions = storage( quaternionAttribute, 'vec4', pieceCount )
		.setName( 'brickRoomQuaternions' );
	const targetPositions = storage( buildTargetAttribute, 'vec4', buildTargets.count ).toReadOnly()
		.setName( 'brickRoomBuildTargets' );
	const boundsData = new Float32Array( BRICK_ARCHETYPE_COUNT * 8 );
	for ( let archetypeId = 0; archetypeId < BRICK_ARCHETYPE_COUNT; archetypeId ++ ) {

		const box = brickGeometries[ archetypeId * BRICK_LOD_TIERS ].boundingBox;
		if ( ! box ) throw new Error( `Brick archetype ${ archetypeId } has no LOD 0 bounding box.` );
		const offset = archetypeId * 8;
		boundsData.set( [ box.min.x, box.min.y, box.min.z, 0 ], offset );
		boundsData.set( [ box.max.x, box.max.y, box.max.z, 0 ], offset + 4 );

	}
	geometryBoundsAttribute = new THREE.StorageBufferAttribute( boundsData, 4 );
	const geometryBounds = storage( geometryBoundsAttribute, 'vec4', BRICK_ARCHETYPE_COUNT * 2 ).toReadOnly()
		.setName( 'brickRoomGeometryBounds' );
	const instanceGeometryIds = storage( brickMesh.geometryIdSB, 'uint', pieceCount )
		.setName( 'brickRoomGeometryIds' );
	const renderMatrices = storage( brickMesh.matricesSB, 'mat4', pieceCount )
		.setName( 'brickRoomRenderMatrices' );
	const colliderData = new Float32Array( furnitureColliders.length * 8 );
	for ( const [ index, collider ] of furnitureColliders.entries() ) {

		const offset = index * 8;
		colliderData.set( [ ...collider.position, 0 ], offset );
		colliderData.set( [ ...collider.size.map( value => value * 0.5 ), 0 ], offset + 4 );

	}
	furnitureColliderAttribute = new THREE.StorageBufferAttribute( colliderData, 4 );
	const furnitureColliderData = storage(
		furnitureColliderAttribute,
		'vec4',
		furnitureColliders.length * 2
	).toReadOnly().setName( 'brickRoomFurnitureColliders' );
	const roomSizeNode = uniform( new THREE.Vector3( ...ROOM_SIZE ) ).setName( 'brickRoomSize' );
	const gridSizeNode = uniform( new THREE.Vector3( ...MPM_GRID_SIZE ) ).setName( 'brickRoomGridSize' );
	uPointerPosition = uniform( pointerTarget.clone() ).setName( 'brickRoomPointerPosition' );
	uPointerVelocity = uniform( new THREE.Vector3() ).setName( 'brickRoomPointerVelocity' );
	uPointerInfluence = uniform( 0 ).setName( 'brickRoomPointerInfluence' );
	uPointerStrength = uniform( 18 ).setName( 'brickRoomPointerStrength' );
	uFrameDelta = uniform( 1 / 60 ).setName( 'brickRoomFrameDelta' );
	uCameraPosition = uniform( camera.position.clone() ).setName( 'brickRoomCameraPosition' );
	uBuildPhase = uniform( 0 ).setName( 'brickRoomBuildPhase' );
	uActivePieceCount = uniform( activePieceCount, 'uint' ).setName( 'brickRoomActivePieceCount' );
	const pointerRadiusNode = uniform( POINTER_RADIUS ).setName( 'brickRoomPointerRadius' );

	const multiplyQuaternion = ( left, right ) => vec4(
		left.xyz.mul( right.w ).add( right.xyz.mul( left.w ) ).add( cross( left.xyz, right.xyz ) ),
		left.w.mul( right.w ).sub( dot( left.xyz, right.xyz ) )
	);
	const quaternionFrame = ( rotation, pieceScale ) => {

		const x = rotation.x;
		const y = rotation.y;
		const z = rotation.z;
		const w = rotation.w;
		return {
			basisX: vec3(
				float( 1 ).sub( y.mul( y ).add( z.mul( z ) ).mul( 2 ) ),
				x.mul( y ).add( z.mul( w ) ).mul( 2 ),
				x.mul( z ).sub( y.mul( w ) ).mul( 2 )
			).mul( pieceScale ),
			basisY: vec3(
				x.mul( y ).sub( z.mul( w ) ).mul( 2 ),
				float( 1 ).sub( x.mul( x ).add( z.mul( z ) ).mul( 2 ) ),
				y.mul( z ).add( x.mul( w ) ).mul( 2 )
			).mul( pieceScale ),
			basisZ: vec3(
				x.mul( z ).add( y.mul( w ) ).mul( 2 ),
				y.mul( z ).sub( x.mul( w ) ).mul( 2 ),
				float( 1 ).sub( x.mul( x ).add( y.mul( y ) ).mul( 2 ) )
			).mul( pieceScale ),
		};

	};

	const particleForce = ( { position, velocity, dt } ) => {

		const particleWorld = vec3(
			position.x.sub( 0.5 ).mul( ROOM_SIZE[ 0 ] ),
			position.y.mul( ROOM_SIZE[ 1 ] ),
			position.z.sub( 0.5 ).mul( ROOM_SIZE[ 2 ] )
		).toVar( 'brickRoomParticleWorld' );
		const geometryId = instanceGeometryIds.element( instanceIndex );
		const archetypeId = geometryId.div( uint( BRICK_LOD_TIERS ) );
		const boundsOffset = archetypeId.mul( uint( 2 ) );
		const boundsMin = geometryBounds.element( boundsOffset ).xyz;
		const boundsMax = geometryBounds.element( boundsOffset.add( uint( 1 ) ) ).xyz;
		const localCenter = boundsMin.add( boundsMax ).mul( 0.5 );
		const localHalfSize = boundsMax.sub( boundsMin ).mul( 0.5 );
		const pieceScale = mix(
			float( PIECE_SCALE_MIN ),
			float( PIECE_SCALE_MAX ),
			hash( instanceIndex.add( uint( 313 ) ) )
		);
		const collisionFrame = quaternionFrame( renderQuaternions.element( instanceIndex ), pieceScale );
		const centerOffset = collisionFrame.basisX.mul( localCenter.x )
			.add( collisionFrame.basisY.mul( localCenter.y ) )
			.add( collisionFrame.basisZ.mul( localCenter.z ) );
		const worldHalfSize = collisionFrame.basisX.abs().mul( localHalfSize.x )
			.add( collisionFrame.basisY.abs().mul( localHalfSize.y ) )
			.add( collisionFrame.basisZ.abs().mul( localHalfSize.z ) );
		const pointerDelta = particleWorld.sub( uPointerPosition ).toVar( 'brickRoomPointerDelta' );
		const distance = pointerDelta.length().toVar( 'brickRoomPointerDistance' );
		If(
			uPointerInfluence.greaterThan( 0.001 ).and( distance.lessThan( pointerRadiusNode ) ),
			() => {

				const falloff = float( 1 ).sub( smoothstep( float( 0 ), pointerRadiusNode, distance ) )
					.pow( 2.2 );
				const pushDirection = normalize( pointerDelta.add( vec3( 0.0001, 0.0002, - 0.0001 ) ) );
				const unclampedAcceleration = pushDirection.add( vec3( 0, 0.32, 0 ) )
					.mul( uPointerStrength )
					.mul( falloff )
					.mul( uPointerInfluence )
					.toVar( 'brickRoomPointerAcceleration' );
				const worldAcceleration = unclampedAcceleration.mul(
					min(
						1,
						float( MAX_POINTER_ACCELERATION )
							.div( max( unclampedAcceleration.length(), 0.0001 ) )
					)
				);
				const gridAcceleration = worldAcceleration.div( roomSizeNode ).mul( gridSizeNode );
				const pointerCarry = uPointerVelocity.div( roomSizeNode ).mul( gridSizeNode )
					.mul( falloff )
					.mul( uPointerInfluence )
					.mul( 0.6 );
				velocity.addAssign( gridAcceleration.mul( dt ).add( pointerCarry ) );

			}
		);
		If(
			uBuildPhase.greaterThan( 0.001 ).and( instanceIndex.lessThan( uint( buildTargets.count ) ) ),
			() => {

				const targetDelta = targetPositions.element( instanceIndex ).xyz.sub( position ).mul( gridSizeNode );
				const buildAcceleration = targetDelta.mul( BUILD_SPRING )
					.sub( velocity.mul( BUILD_DAMPING ) )
					.mul( uBuildPhase );
				velocity.addAssign( buildAcceleration.mul( dt ) );

			}
		);
		velocity.mulAssign( max( 0.995, float( 1 ).sub( dt.mul( 0.18 ) ) ) );
		const worldVelocity = velocity.div( gridSizeNode ).mul( roomSizeNode );
		const predictedCenter = particleWorld.add( centerOffset ).add( worldVelocity.mul( dt ) )
			.toVar( 'brickRoomPredictedCenter' );
		const applyWorldCorrection = correction => {

			velocity.addAssign(
				correction
					.div( roomSizeNode )
					.mul( gridSizeNode )
					.div( max( dt, 0.00001 ) )
					.mul( COLLISION_PUSHBACK )
			);
			predictedCenter.addAssign( correction );

		};
		const roomMinimum = vec3( - ROOM_SIZE[ 0 ] * 0.5, ROOM_FLOOR_Y, - ROOM_SIZE[ 2 ] * 0.5 );
		const roomMaximum = vec3( ROOM_SIZE[ 0 ] * 0.5, ROOM_SIZE[ 1 ], ROOM_SIZE[ 2 ] * 0.5 );
		const containedCenter = clamp(
			predictedCenter,
			roomMinimum.add( worldHalfSize ),
			roomMaximum.sub( worldHalfSize )
		);
		const boundaryCorrection = containedCenter.sub( predictedCenter );
		applyWorldCorrection( boundaryCorrection );

		Loop( { start: 0, end: furnitureColliders.length, type: 'uint' }, ( { i } ) => {

			const colliderOffset = i.mul( uint( 2 ) );
			const colliderCenter = furnitureColliderData.element( colliderOffset ).xyz;
			const colliderHalfSize = furnitureColliderData.element( colliderOffset.add( uint( 1 ) ) ).xyz;
			const delta = predictedCenter.sub( colliderCenter )
				.toVar( 'brickRoomFurnitureDelta' );
			const penetration = colliderHalfSize.add( worldHalfSize ).sub( delta.abs() )
				.toVar( 'brickRoomFurniturePenetration' );
			If(
				penetration.x.greaterThan( 0 )
					.and( penetration.y.greaterThan( 0 ) )
					.and( penetration.z.greaterThan( 0 ) ),
				() => {

					const correction = vec3( 0 )
						.toVar( 'brickRoomFurnitureCorrection' );
					If(
						penetration.x.lessThanEqual( penetration.y )
							.and( penetration.x.lessThanEqual( penetration.z ) ),
						() => {

							correction.x.assign(
								delta.x.lessThan( 0 ).select( penetration.x.negate(), penetration.x )
							);

						}
					).ElseIf( penetration.y.lessThanEqual( penetration.z ), () => {

						correction.y.assign(
							delta.y.lessThan( 0 ).select( penetration.y.negate(), penetration.y )
						);

					} ).Else( () => {

						correction.z.assign(
							delta.z.lessThan( 0 ).select( penetration.z.negate(), penetration.z )
						);

					} );
					applyWorldCorrection( correction );

				}
			);

		} );
		velocity.assign( clamp( velocity, vec3( - MAX_PARTICLE_SPEED ), vec3( MAX_PARTICLE_SPEED ) ) );

	};

	solver = new MPMSolver( {
		capacity: pieceCount,
		gridSize: new THREE.Vector3( ...MPM_GRID_SIZE ),
		material: new MPMGranularModel( {
			stiffness: 1_200,
			restDensity: 2,
			friction: 0.72,
			flowViscosity: 6,
			shearDamping: 0.58,
		} ),
		gravity: new THREE.Vector3( 0, MPM_GRAVITY_Y, 0 ),
		maxVelocity: MAX_PARTICLE_SPEED,
		substeps: 3,
		p2gMode: 'auto',
		densityPrediction: true,
		boundary: {
			margin: MPM_BOUNDARY_MARGIN,
			floorFriction: 0.52,
			wallPushback: 0.58,
			velocityDamping: 0.998,
		},
		particleForce,
	} );
	solver.particleCount = pieceCount;
	brickSeedInitializer = ( { index } ) => {

		const driftX = hash( index.add( uint( 701 ) ) ).sub( 0.5 ).mul( 1.2 );
		const driftY = hash( index.add( uint( 907 ) ) ).mul( - 0.9 ).sub( 0.35 );
		const driftZ = hash( index.add( uint( 1_103 ) ) ).sub( 0.5 ).mul( 1.2 );
		return {
			position: seedPositions.element( index ).xyz,
			velocity: vec3( driftX, driftY, driftZ ),
		};

	};
	simulationSeeded = false;

	brickOrientationSeedPass = Fn( () => {

		const index = instanceIndex;
		renderQuaternions.element( index ).assign( normalize( vec4(
			hash( index.add( uint( 2_003 ) ) ).sub( 0.5 ),
			hash( index.add( uint( 2_129 ) ) ).sub( 0.5 ),
			hash( index.add( uint( 2_261 ) ) ).sub( 0.5 ),
			hash( index.add( uint( 2_379 ) ) ).sub( 0.5 )
		) ) );

	} )().compute( pieceCount, [ 64 ] ).setName( 'brickRoom_seedOrientations' );

	brickPosePass = Fn( () => {

		const index = instanceIndex;
		const particle = solver.particleBuffer.element( index );
		const position = particle.get( 'position' ).xyz.toConst( 'brickRoomPosePosition' );
		const velocity = particle.get( 'velocity' ).xyz.toConst( 'brickRoomPoseVelocity' );
		const C = particle.get( 'C' ).toConst( 'brickRoomPoseC' );
		const c0 = C.element( int( 0 ) );
		const c1 = C.element( int( 1 ) );
		const c2 = C.element( int( 2 ) );
		const omega = vec3(
			c1.z.sub( c2.y ),
			c2.x.sub( c0.z ),
			c0.y.sub( c1.x )
		).mul( 0.5 ).toVar( 'brickRoomAngularVelocity' );
		const spin = omega.length().toConst( 'brickRoomSpinRate' );
		const halfAngle = clamp( spin, 0, MAX_SPIN_RATE ).mul( uFrameDelta ).mul( 0.5 );
		const deltaRotation = vec4(
			omega.div( max( spin, 1e-5 ) ).mul( halfAngle.sin() ),
			halfAngle.cos()
		);
		const current = renderQuaternions.element( index ).toConst( 'brickRoomCurrentQuaternion' );
		const integrated = normalize( multiplyQuaternion( deltaRotation, current ) )
			.toVar( 'brickRoomIntegratedQuaternion' );
		const unitFrame = quaternionFrame( integrated, float( 1 ) );
		const localUp = normalize( unitFrame.basisY ).toConst( 'brickRoomLocalUp' );
		const nearestUp = localUp.y.lessThan( 0 ).select( vec3( 0, - 1, 0 ), vec3( 0, 1, 0 ) );
		const settleCorrection = normalize( vec4(
			cross( localUp, nearestUp ),
			max( dot( localUp, nearestUp ).add( 1 ), 1e-4 )
		) );
		const flat = normalize( multiplyQuaternion( settleCorrection, integrated ) );
		const alignedFlat = dot( integrated, flat ).lessThan( 0 ).select( flat.negate(), flat );
		const worldVelocity = velocity.div( gridSizeNode ).mul( roomSizeNode );
		const settleWeight = clamp(
			smoothstep( 3, 0.25, worldVelocity.length() ).mul( uFrameDelta ).mul( 3.2 ),
			0,
			0.14
		);
		const nextRotation = normalize( mix( integrated, alignedFlat, settleWeight ) )
			.toVar( 'brickRoomNextQuaternion' );
		renderQuaternions.element( index ).assign( nextRotation );

		const world = vec3(
			position.x.sub( 0.5 ).mul( ROOM_SIZE[ 0 ] ),
			position.y.mul( ROOM_SIZE[ 1 ] ),
			position.z.sub( 0.5 ).mul( ROOM_SIZE[ 2 ] )
		).toVar( 'brickRoomWorldPosition' );
		const active = index.lessThan( uActivePieceCount );
		const visibleWorld = active.select( world, vec3( 0, - 1_000, 0 ) );
		const previousGeometryId = instanceGeometryIds.element( index ).toConst( 'brickRoomPreviousGeometryId' );
		const previousTier = previousGeometryId.mod( uint( BRICK_LOD_TIERS ) );
		const distance = visibleWorld.sub( uCameraPosition ).length().toConst( 'brickRoomCameraDistance' );
		const tierFromNear = distance.greaterThan( LOD_NEAR_DISTANCE * ( 1 + LOD_HYSTERESIS ) )
			.select( uint( 1 ), uint( 0 ) );
		const tierFromMiddle = distance.lessThan( LOD_NEAR_DISTANCE * ( 1 - LOD_HYSTERESIS ) )
			.select(
				uint( 0 ),
				distance.greaterThan( LOD_FAR_DISTANCE * ( 1 + LOD_HYSTERESIS ) )
					.select( uint( 2 ), uint( 1 ) )
			);
		const tierFromFar = distance.lessThan( LOD_FAR_DISTANCE * ( 1 - LOD_HYSTERESIS ) )
			.select( uint( 1 ), uint( 2 ) );
		const tier = previousTier.equal( uint( 0 ) ).select(
			tierFromNear,
			previousTier.equal( uint( 1 ) ).select( tierFromMiddle, tierFromFar )
		);
		instanceGeometryIds.element( index ).assign(
			previousGeometryId.div( uint( BRICK_LOD_TIERS ) ).mul( uint( BRICK_LOD_TIERS ) ).add( tier )
		);

		const pieceScale = mix(
			float( PIECE_SCALE_MIN ),
			float( PIECE_SCALE_MAX ),
			hash( index.add( uint( 313 ) ) )
		);
		const renderFrame = quaternionFrame( nextRotation, active.select( pieceScale, float( 0 ) ) );
		renderMatrices.element( index ).assign( mat4(
			vec4( renderFrame.basisX, 0 ),
			vec4( renderFrame.basisY, 0 ),
			vec4( renderFrame.basisZ, 0 ),
			vec4( visibleWorld, 1 )
		) );

	} )().compute( pieceCount, [ 64 ] ).setName( 'brickRoom_poseAndLod' );
	solver.postPasses = [ brickPosePass ];
	updateContactMaterials();

	shaderRegistration = shaderCache.container( 'brick-room/simulation', {
		get particleState() { return solver?.particleBuffer; },
		get gridAtomic() { return solver?.gridAtomicBuffer; },
		get gridMirror() { return solver?.gridMirrorBuffer; },
		get seedPositions() { return seedPositions; },
		get furnitureColliders() { return furnitureColliderAttribute; },
		get matrices() { return brickMesh?.matricesSB; },
		get colors() { return brickMesh?.colorsSB; },
		get geometryIds() { return brickMesh?.geometryIdSB; },
		get geometryBounds() { return geometryBoundsAttribute; },
		get quaternions() { return quaternionAttribute; },
		get buildTargets() { return buildTargetAttribute; },
		get culler() { return brickMesh?.culler; },
		uniforms: {
			solver: solver.uniforms,
			pointerPosition: uPointerPosition,
			pointerVelocity: uPointerVelocity,
			pointerInfluence: uPointerInfluence,
			pointerStrength: uPointerStrength,
			frameDelta: uFrameDelta,
			cameraPosition: uCameraPosition,
			buildPhase: uBuildPhase,
			activePieceCount: uActivePieceCount,
		},
	} );

}

function updateContactMaterials() {

	if ( ! floorMaterial || ! rugMaterial ) return;
	const stripe = positionWorld.x.add( ROOM_SIZE[ 0 ] * 0.5 ).div( 1.35 ).floor().mod( 2 );
	const planks = mix( color( 0xe8d2a7 ), color( 0xd5b783 ), stripe );
	let contact = float( 0 );
	if ( solver?.gridMirrorBuffer ) {

		const x = int( clamp(
			positionWorld.x.div( ROOM_SIZE[ 0 ] ).add( 0.5 ),
			0,
			0.999
		).mul( MPM_GRID_SIZE[ 0 ] ) );
		const z = int( clamp(
			positionWorld.z.div( ROOM_SIZE[ 2 ] ).add( 0.5 ),
			0,
			0.999
		).mul( MPM_GRID_SIZE[ 2 ] ) );
		const pointer = x.mul( MPM_GRID_SIZE[ 1 ] * MPM_GRID_SIZE[ 2 ] )
			.add( MPM_GRID_SIZE[ 2 ] )
			.add( z );
		contact = smoothstep( 0.08, 1.4, solver.gridMirrorBuffer.element( pointer ).w );

	}
	floorMaterial.colorNode = mix( planks, color( 0x81664f ), contact.mul( 0.34 ) );
	rugMaterial.colorNode = mix( color( 0x4f86cb ), color( 0x20395f ), contact.mul( 0.42 ) );
	floorMaterial.needsUpdate = true;
	rugMaterial.needsUpdate = true;

}

function disposeBrickSystem() {

	systemGeneration ++;
	shaderRegistration?.dispose();
	shaderRegistration = null;
	brickOrientationSeedPass?.dispose?.();
	brickOrientationSeedPass = null;
	brickPosePass?.dispose?.();
	brickPosePass = null;
	solver?.dispose();
	solver = null;
	seedPositionAttribute?.dispose?.();
	seedPositionAttribute = null;
	furnitureColliderAttribute?.dispose?.();
	furnitureColliderAttribute = null;
	geometryBoundsAttribute?.dispose?.();
	geometryBoundsAttribute = null;
	quaternionAttribute?.dispose?.();
	quaternionAttribute = null;
	brickSeedInitializer = null;
	simulationSeeded = false;
	brickMesh?.culler?.dispose?.();
	brickMesh?.removeFromParent();
	brickMesh?.dispose?.();
	brickMesh = null;
	if ( brickMaterial ) {

		ownedMaterials.delete( brickMaterial );
		brickMaterial.dispose();
		brickMaterial = null;

	}
	brickField = null;
	buildPhase = 0;
	uBuildPhase = null;
	uActivePieceCount = null;
	updateContactMaterials();

}

async function rebuildBrickSystem( requestedCount ) {

	const nextCount = Math.round( Number( requestedCount ) );
	if ( rebuilding || resetting || ! Number.isInteger( nextCount ) || nextCount <= 0 ||
		nextCount > BRICK_COUNT_OPTIONS.at( - 1 ) || nextCount === pieceCount ) return;
	const previousCount = pieceCount;
	rebuilding = true;
	ready = false;
	countSelect?.setAttribute( 'disabled', '' );
	renderer.setAnimationLoop( null );
	showStatus( `Rebuilding ${ nextCount.toLocaleString() } pieces…`, 'ready', 0 );
	try {

		disposeBrickSystem();
		pieceCount = nextCount;
		createBrickSystem();
		await renderer.compileAsync( scene, camera );
		renderer.render( scene, camera );
		await renderer.backend?.device?.queue?.onSubmittedWorkDone?.();
		await resetBricks( { announce: false } );
		drawnPieces = 0;
		drawnTriangles = 0;
		showStatus( `${ pieceCount.toLocaleString() } pieces ready` );

	} catch ( error ) {

		disposeBrickSystem();
		pieceCount = previousCount;
		createBrickSystem();
		await renderer.compileAsync( scene, camera );
		renderer.render( scene, camera );
		await renderer.backend?.device?.queue?.onSubmittedWorkDone?.();
		await resetBricks( { announce: false } );
		showStatus( `Could not allocate ${ nextCount.toLocaleString() } pieces`, 'error', 3200 );
		throw error;

	} finally {

		rebuilding = false;
		ready = true;
		countSelect?.removeAttribute( 'disabled' );
		updateInterface();
		previousTime = performance.now();
		if ( mounted ) renderer.setAnimationLoop( render );

	}

}

function createPointerCursor() {

	cursorGroup = new THREE.Group();
	cursorGroup.name = 'BrickPointer';
	cursorGroup.visible = false;
	cursorGroup.position.copy( pointerTarget );

	cursorWireMaterial = ownMaterial( new THREE.MeshBasicNodeMaterial( {
		color: PUSH_COLOR,
		transparent: true,
		opacity: 0.46,
		wireframe: true,
		blending: THREE.AdditiveBlending,
		depthTest: false,
		depthWrite: false,
		side: THREE.DoubleSide,
	} ) );
	const radiusSphere = new THREE.Mesh(
		ownGeometry( new THREE.IcosahedronGeometry( POINTER_RADIUS, 2 ) ),
		cursorWireMaterial
	);
	radiusSphere.name = 'InteractionRadius';
	radiusSphere.renderOrder = 20;
	cursorLight = new THREE.PointLight( PUSH_COLOR, 4.5, POINTER_RADIUS * 2, 1.7 );
	cursorGroup.add( radiusSphere, cursorLight );
	stage.add( cursorGroup );

}

function createInterface() {

	interfaceStyle = document.createElement( 'style' );
	interfaceStyle.textContent = [
		'.brick-room-ui { --ink:#17233c; --paper:#f8f5ed; --red:#e63b2e; --yellow:#f6c83f; --blue:#2468d2;',
		' position:absolute; inset:0; z-index:3; color:var(--ink); pointer-events:none;',
		' font-family:"Trebuchet MS","Avenir Next",system-ui,sans-serif; }',
		'.brick-room-ui * { box-sizing:border-box; }',
		'.brick-room__actions { position:absolute; top:clamp(16px,3vw,38px); right:clamp(16px,3vw,42px); display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; max-width:560px; pointer-events:auto; }',
		'.brick-room__button { min-height:42px; padding:0 14px; border:2px solid var(--ink); border-radius:0; color:var(--ink);',
		' background:var(--paper); box-shadow:4px 4px 0 var(--ink); font:800 10px/1 ui-monospace,SFMono-Regular,monospace;',
		' letter-spacing:.08em; text-transform:uppercase; cursor:pointer; transform:translate(0,0); transition:transform .12s ease,box-shadow .12s ease; }',
		'.brick-room__button[data-action="reset"] { background:var(--yellow); }',
		'.brick-room__button[data-action="build"] { color:#fff; background:var(--red); }',
		'.brick-room__button[data-action="build"][aria-pressed="true"] { color:var(--ink); background:#38a96b; }',
		'.brick-room__button[data-action="camera"] { color:#fff; background:var(--blue); }',
		'.brick-room__count { display:flex; min-height:42px; border:2px solid var(--ink); background:var(--paper); box-shadow:4px 4px 0 var(--ink); }',
		'.brick-room__count span { align-self:center; padding:0 8px; font:800 8px/1 ui-monospace,SFMono-Regular,monospace; letter-spacing:.08em; text-transform:uppercase; }',
		'.brick-room__count select { min-width:108px; border:0; border-left:1px solid rgba(23,35,60,.3); border-radius:0; color:var(--ink); background:#fff8e8;',
		' padding:0 9px; font:800 10px/1 ui-monospace,SFMono-Regular,monospace; cursor:pointer; }',
		'.brick-room__count select:focus-visible { outline:3px solid #fff; outline-offset:3px; }',
		'.brick-room__button:hover { transform:translate(2px,2px); box-shadow:2px 2px 0 var(--ink); }',
		'.brick-room__button:active { transform:translate(4px,4px); box-shadow:0 0 0 var(--ink); }',
		'.brick-room__button:focus-visible { outline:3px solid #fff; outline-offset:3px; }',
		'.brick-room__status { position:absolute; top:94px; right:clamp(16px,3vw,42px); max-width:260px; padding:8px 10px;',
		' color:#fff; background:var(--blue); font:750 9px/1.3 ui-monospace,SFMono-Regular,monospace; letter-spacing:.06em;',
		' text-transform:uppercase; opacity:0; transform:translateY(-4px); transition:opacity .15s ease,transform .15s ease; }',
		'.brick-room__status[data-tone="error"] { background:var(--red); }',
		'.brick-room__status[data-visible="true"] { opacity:1; transform:translateY(0); }',
		'@media (max-width:760px) {',
		' .brick-room__actions { top:auto; bottom:94px; max-width:calc(100vw - 32px); }',
		'}',
		'@media (prefers-reduced-motion:reduce) { .brick-room-ui * { transition:none !important; } }',
	].join( '' );
	container.appendChild( interfaceStyle );

	interfaceElement = document.createElement( 'section' );
	interfaceElement.className = 'brick-room-ui';
	interfaceElement.setAttribute( 'aria-label', 'The Brick Room controls and status' );
	const countOptions = BRICK_COUNT_OPTIONS.includes( pieceCount )
		? BRICK_COUNT_OPTIONS
		: [ pieceCount, ...BRICK_COUNT_OPTIONS ];
	interfaceElement.innerHTML = `
		<div class="brick-room__actions">
			<label class="brick-room__count"><span>Pieces</span><select data-action="count">${
				countOptions.map( count => `<option value="${ count }"${ count === pieceCount ? ' selected' : '' }>${ count.toLocaleString() }</option>` ).join( '' )
			}</select></label>
			<button class="brick-room__button" data-action="camera" type="button">Kid’s-eye</button>
			<button class="brick-room__button" data-action="build" type="button" aria-pressed="false">Build</button>
			<button class="brick-room__button" data-action="pause" type="button">Pause</button>
			<button class="brick-room__button" data-action="reset" type="button">Scatter</button>
		</div>
		<p class="brick-room__status" role="status" aria-live="polite"></p>
	`;
	container.appendChild( interfaceElement );
	pauseButton = interfaceElement.querySelector( '[data-action="pause"]' );
	resetButton = interfaceElement.querySelector( '[data-action="reset"]' );
	buildButton = interfaceElement.querySelector( '[data-action="build"]' );
	cameraButton = interfaceElement.querySelector( '[data-action="camera"]' );
	countSelect = interfaceElement.querySelector( '[data-action="count"]' );
	statusElement = interfaceElement.querySelector( '.brick-room__status' );
	pauseButton.addEventListener( 'click', togglePause );
	resetButton.addEventListener( 'click', resetBricks );
	buildButton.addEventListener( 'click', toggleBuild );
	cameraButton.addEventListener( 'click', toggleCamera );
	countSelect.addEventListener( 'change', handleCountChange );

}

function listen( target, type, handler, options ) {

	target.addEventListener( type, handler, options );
	eventDisposers.push( () => target.removeEventListener( type, handler, options ) );

}

function bindInteraction() {

	const canvas = renderer.domElement;
	canvas.style.cursor = 'none';
	listen( canvas, 'pointerenter', event => {

		pointerState.inside = true;
		updatePointerFromEvent( event );

	} );
	listen( canvas, 'pointermove', updatePointerFromEvent );
	listen( canvas, 'pointerdown', event => {

		if ( event.button !== 0 ) return;
		pointerState.inside = true;
		pointerState.pressed = true;
		canvas.setPointerCapture?.( event.pointerId );
		updatePointerFromEvent( event );
		event.preventDefault();

	} );
	const releasePointer = () => {

		pointerState.pressed = false;
		updatePointerInteraction();

	};
	listen( canvas, 'pointerup', releasePointer );
	listen( canvas, 'pointercancel', releasePointer );
	listen( canvas, 'lostpointercapture', releasePointer );
	listen( canvas, 'pointerleave', () => {

		if ( pointerState.pressed ) return;
		pointerState.inside = false;
		releasePointer();

	} );
	listen( canvas, 'contextmenu', event => event.preventDefault() );
	listen( REDUCED_MOTION_QUERY, 'change', event => {

		if ( event.matches ) setPaused( true );

	} );

}

function updatePointerFromEvent( event ) {

	if ( ! renderer || ! camera ) return;
	const bounds = renderer.domElement.getBoundingClientRect();
	if ( bounds.width <= 0 || bounds.height <= 0 ) return;
	pointerNdc.set(
		( event.clientX - bounds.left ) / bounds.width * 2 - 1,
		- ( event.clientY - bounds.top ) / bounds.height * 2 + 1
	);
	updatePointerFromCamera( true );

}

function updatePointerFromCamera( trackVelocity ) {

	raycaster.setFromCamera( pointerNdc, camera );
	pointerRayOrigin.copy( raycaster.ray.origin );
	pointerRayDirection.copy( raycaster.ray.direction );
	if ( ! raycaster.ray.intersectPlane( pointerPlane, pointerHit ) ) return;
	if ( ! pointerBounds.containsPoint( pointerHit ) &&
		! raycaster.ray.intersectBox( pointerBounds, pointerHit ) ) {

		pointerState.projected = false;
		updatePointerInteraction();
		return;

	}
	if ( cameraPreset === 'overview' ) pointerHit.y = Math.min( pointerHit.y, POINTER_TARGET_Y );
	pointerState.projected = true;
	const now = performance.now();
	if ( trackVelocity && pointerState.lastMoveTime > 0 ) {

		const delta = Math.max( 1 / 240, ( now - pointerState.lastMoveTime ) / 1000 );
		pointerVelocity.copy( pointerHit ).sub( pointerPrevious ).divideScalar( delta );
		if ( pointerVelocity.length() > 12 ) pointerVelocity.setLength( 12 );

	} else if ( ! trackVelocity ) pointerVelocity.set( 0, 0, 0 );
	pointerPrevious.copy( pointerHit );
	pointerTarget.copy( pointerHit );
	if ( trackVelocity ) pointerState.lastMoveTime = now;
	updatePointerInteraction();

}

function updatePointerInteraction() {

	if ( ! uPointerInfluence ) return;
	const active = pointerState.projected && ( pointerState.inside || pointerState.pressed );
	uPointerInfluence.value = active ? ( pointerState.pressed ? 1 : 0.12 ) : 0;
	uPointerStrength.value = pointerState.pressed ? 320 : 80;
	uPointerPosition.value.copy( pointerTarget );
	if ( cursorGroup ) {

		cursorGroup.position.copy( pointerTarget );
		cursorGroup.visible = active;

	}

}

function togglePause() {

	setPaused( ! paused );

}

function setBuild( active, announce = true ) {

	buildActive = Boolean( active );
	if ( announce ) showStatus( buildActive ? 'Building the giant brick' : 'Brick released' );
	updateInterface();

}

function toggleBuild() {

	setBuild( ! buildActive );

}

function setCameraPreset( preset ) {

	cameraPreset = preset === 'kid' ? 'kid' : 'overview';
	const next = CAMERA_PRESETS[ cameraPreset ];
	cameraPositionGoal.fromArray( next.position );
	cameraTargetGoal.fromArray( next.target );
	showStatus( `${ next.label } camera` );
	updateInterface();

}

function toggleCamera() {

	setCameraPreset( cameraPreset === 'overview' ? 'kid' : 'overview' );

}

async function handleCountChange() {

	try {

		await rebuildBrickSystem( countSelect.value );

	} catch ( error ) {

		console.error( error );

	} finally {

		if ( countSelect ) countSelect.value = String( pieceCount );

	}

}

function setPaused( value ) {

	paused = Boolean( value );
	updateInterface();
	showStatus( paused ? 'Physics paused' : 'Physics playing' );

}

async function resetBricks( options = {} ) {

	if ( resetting || ! solver || ! renderer ) return;
	const announce = options?.announce !== false;
	const restartAnimationLoop = ready;
	resetting = true;
	setBuild( false, false );
	buildPhase = 0;
	if ( uBuildPhase ) uBuildPhase.value = 0;
	if ( restartAnimationLoop ) renderer.setAnimationLoop( null );
	try {

		solver.time = 0;
		solver.frame = 0;
		solver.particleCount = pieceCount;
		renderer.compute( brickOrientationSeedPass );
		if ( simulationSeeded ) {

			solver.seed( renderer );

		} else {

			if ( ! brickSeedInitializer ) throw new Error( 'The Brick Room seed initializer is unavailable.' );
			solver.seed( renderer, brickSeedInitializer );
			simulationSeeded = true;

		}
		await renderer.backend?.device?.queue?.onSubmittedWorkDone?.();
		setActivePieceCount( 1 );
		solver.step( renderer, 1 / 120 );
		await renderer.backend?.device?.queue?.onSubmittedWorkDone?.();
		renderer.render( scene, camera );
		await renderer.backend?.device?.queue?.onSubmittedWorkDone?.();
		if ( announce ) showStatus( 'Fresh room scattered' );

	} finally {

		resetting = false;
		if ( restartAnimationLoop && mounted ) {

			previousTime = performance.now();
			renderer.setAnimationLoop( render );

		}

	}

}

function showStatus( message, tone = 'ready', hideAfter = 1600 ) {

	if ( ! statusElement ) return;
	statusElement.textContent = message;
	statusElement.dataset.tone = tone;
	statusElement.dataset.visible = 'true';
	window.clearTimeout( showStatus.timeout );
	if ( hideAfter > 0 ) {

		showStatus.timeout = window.setTimeout( () => {

			if ( statusElement ) statusElement.dataset.visible = 'false';

		}, hideAfter );

	}

}

function updateInterface() {

	if ( pauseButton ) pauseButton.textContent = paused ? 'Play' : 'Pause';
	if ( buildButton ) {

		buildButton.textContent = buildActive ? 'Release' : 'Build';
		buildButton.setAttribute( 'aria-pressed', String( buildActive ) );

	}
	if ( cameraButton ) cameraButton.textContent = cameraPreset === 'overview' ? 'Kid’s-eye' : 'Overview';
	if ( countSelect ) countSelect.value = String( pieceCount );

}

function setActivePieceCount( count ) {

	activePieceCount = Math.min( pieceCount, Math.max( 1, Math.floor( count ) ) );
	releaseElapsed = activePieceCount / PIECE_RELEASE_RATE;
	if ( solver ) solver.particleCount = activePieceCount;
	if ( uActivePieceCount ) uActivePieceCount.value = activePieceCount;

}

function releasePieces( delta ) {

	if ( activePieceCount >= pieceCount ) return;
	releaseElapsed += delta;
	setActivePieceCount( releaseElapsed * PIECE_RELEASE_RATE );

}
function pollHudEvidence( now ) {

	if ( ! hudReadbackEnabled || hudReadbackPending || now < nextHudReadback ||
		resetting || rebuilding || ! brickMesh?.culler?.readIndirectArgsAll ) return;
	nextHudReadback = now + HUD_READBACK_INTERVAL;
	hudReadbackPending = true;
	const generation = systemGeneration;
	const culler = brickMesh.culler;
	void culler.readIndirectArgsAll().then( args => {

		if ( generation !== systemGeneration || culler !== brickMesh?.culler ) return;
		let survivors = 0;
		let triangles = 0;
		const commandCount = Math.min( BRICK_GEOMETRY_COUNT, Math.floor( args.length / 5 ) );
		for ( let command = 0; command < commandCount; command ++ ) {

			const count = args[ command * 5 + 1 ] >>> 0;
			survivors += count;
			triangles += count * ( geometryAudit[ command ]?.triangles ?? 0 );

		}
		drawnPieces = survivors;
		drawnTriangles = triangles;

	} ).catch( error => {

		if ( mounted ) console.warn( 'Brick Room HUD readback failed.', error );

	} ).finally( () => {

		hudReadbackPending = false;

	} );

}

function render() {

	if ( ! mounted || ! ready || ! renderer || ! scene || ! camera ) return;
	const now = performance.now();
	const measuredDelta = Math.min( 1 / 30, Math.max( 1 / 240, ( now - previousTime ) / 1000 || 1 / 60 ) );
	const delta = fixedTimeStep ?? measuredDelta;
	previousTime = now;

	const cameraEase = 1 - Math.exp( - delta * 3.6 );
	camera.position.lerp( cameraPositionGoal, cameraEase );
	cameraTarget.lerp( cameraTargetGoal, cameraEase );
	const cameraMoving = camera.position.distanceToSquared( cameraPositionGoal ) > 1e-5
		|| cameraTarget.distanceToSquared( cameraTargetGoal ) > 1e-5;
	camera.lookAt( cameraTarget );
	camera.updateMatrixWorld();
	camera.getWorldDirection( pointerPlaneNormal );
	pointerPlane.setFromNormalAndCoplanarPoint( pointerPlaneNormal, cameraTarget );
	if ( cameraMoving && pointerState.inside ) updatePointerFromCamera( false );
	uCameraPosition?.value.copy( camera.position );

	const cursorStateEase = 1 - Math.exp( - delta * 18 );
	if ( cursorWireMaterial ) cursorWireMaterial.opacity = THREE.MathUtils.lerp(
		cursorWireMaterial.opacity,
		pointerState.pressed ? 0.72 : 0.46,
		cursorStateEase
	);
	if ( cursorLight ) cursorLight.intensity = THREE.MathUtils.lerp(
		cursorLight.intensity,
		pointerState.pressed ? 7.5 : 4.5,
		cursorStateEase
	);
	pointerVelocity.multiplyScalar( Math.exp( - delta * 7.5 ) );
	uPointerVelocity?.value.copy( pointerVelocity );
	buildPhase += ( Number( buildActive ) - buildPhase ) * ( 1 - Math.exp( - delta * 4.8 ) );
	if ( uBuildPhase ) uBuildPhase.value = buildPhase;
	if ( uFrameDelta ) uFrameDelta.value = paused ? 0 : delta;

	if ( ! paused && ! resetting ) {

		releasePieces( delta );
		solver.step( renderer, delta );

	} else if ( ! resetting && cameraMoving && brickPosePass ) {

		renderer.compute( brickPosePass );

	}

	renderer.render( scene, camera );
	pollHudEvidence( now );

}

function resize() {

	if ( ! renderer || ! camera || ! container ) return;
	const bounds = container.getBoundingClientRect();
	const width = Math.max( 1, Math.round( bounds.width || container.clientWidth || 1 ) );
	const height = Math.max( 1, Math.round( bounds.height || container.clientHeight || 1 ) );
	renderer.setSize( width, height, false );
	camera.aspect = width / height;
	camera.updateProjectionMatrix();

}

function setPointerFromHandle( position, { pressed = false } = {} ) {

	if ( ! Array.isArray( position ) || position.length < 2 ) {

		throw new TypeError( 'setPointer expects [x, z] or [x, y, z] world coordinates.' );

	}
	const x = Number( position[ 0 ] );
	const y = position.length >= 3 ? Number( position[ 1 ] ) : POINTER_TARGET_Y;
	const z = position.length >= 3 ? Number( position[ 2 ] ) : Number( position[ 1 ] );
	if ( ! [ x, y, z ].every( Number.isFinite ) ) throw new TypeError( 'setPointer coordinates must be finite.' );
	pointerTarget.set( x, y, z );
	pointerPrevious.copy( pointerTarget );
	pointerVelocity.set( 0, 0, 0 );
	pointerRayOrigin.copy( camera.position );
	pointerRayDirection.copy( pointerTarget ).sub( pointerRayOrigin ).normalize();
	pointerState.inside = true;
	pointerState.pressed = Boolean( pressed );
	pointerState.projected = true;
	updatePointerInteraction();

}

function inspectRendering() {

	return {
		drawCalls: renderer?.info?.render?.calls ?? 0,
		triangles: renderer?.info?.render?.triangles ?? 0,
		renderItems: 1,
		indirectCommands: BRICK_GEOMETRY_COUNT,
		drawnPieces,
		drawnTriangles,
		activeRootParent: brickMesh?.parent?.name ?? null,
	};

}

function getState() {

	return {
		ready,
		pieceCount,
		archetypeCount: BRICK_ARCHETYPE_COUNT,
		lodTiers: BRICK_LOD_TIERS,
		geometryCount: BRICK_GEOMETRY_COUNT,
		archetypes: BRICK_ARCHETYPES.map( definition => definition.key ),
		fieldDigest: brickField?.digest ?? null,
		paused,
		solver: 'MLS-MPM/APIC',
		material: solver?.material?.name ?? null,
		solverFrame: solver?.frame ?? 0,
		simulationTime: solver?.time ?? 0,
		pointer: {
			inside: pointerState.inside,
			pressed: pointerState.pressed,
			projected: pointerState.projected,
			position: pointerTarget.toArray(),
			rayOrigin: pointerRayOrigin.toArray(),
			rayDirection: pointerRayDirection.toArray(),
		},
		physics: {
			gravityWorldY: WORLD_GRAVITY_Y,
			roomHeightMeters: ROOM_HEIGHT_METERS,
			maxParticleSpeed: MAX_PARTICLE_SPEED,
			furnitureColliderCount: furnitureColliders.length,
			pointerRadius: POINTER_RADIUS,
			maxPointerAcceleration: MAX_POINTER_ACCELERATION,
		},
		roomSize: [ ...ROOM_SIZE ],
		cameraPreset,
		cameraPosition: camera?.position.toArray() ?? null,
		cameraDirection: pointerPlaneNormal.toArray(),
		build: {
			active: buildActive,
			phase: buildPhase,
			targetCount: buildTargets?.count ?? 0,
		},
		release: {
			activePieceCount,
			rate: PIECE_RELEASE_RATE,
			complete: activePieceCount === pieceCount,
		},
		hud: {
			readbackEnabled: hudReadbackEnabled,
			drawnPieces,
			drawnTriangles,
		},
		geometryAudit,
		contextLossReport,
	};

}

function createExampleHandle() {

	return {
		renderer,
		scene,
		camera,
		get mesh() { return brickMesh; },
		get solver() { return solver; },
		countOptions: BRICK_COUNT_OPTIONS,
		getState,
		inspectRendering,
		setPaused,
		setBuild: active => {

			setBuild( active, false );
			buildPhase = Number( buildActive );
			if ( uBuildPhase ) uBuildPhase.value = buildPhase;
			return getState();

		},
		setCamera: preset => {

			setCameraPreset( preset );
			camera.position.copy( cameraPositionGoal );
			cameraTarget.copy( cameraTargetGoal );
			camera.lookAt( cameraTarget );
			camera.updateMatrixWorld();
			uCameraPosition?.value.copy( camera.position );
			camera.getWorldDirection( pointerPlaneNormal );
			pointerPlane.setFromNormalAndCoplanarPoint( pointerPlaneNormal, cameraTarget );
			pointerRayOrigin.copy( camera.position );
			pointerRayDirection.copy( pointerState.inside ? pointerTarget : cameraTarget )
				.sub( pointerRayOrigin )
				.normalize();
			updatePointerInteraction();
			if ( brickPosePass ) renderer.compute( brickPosePass );
			return getState();

		},
		setPieceCount: rebuildBrickSystem,
		releaseAll: () => {

			setActivePieceCount( pieceCount );
			return getState();

		},
		reset: resetBricks,
		setPointer: setPointerFromHandle,
		step: ( frames = 1, dt = 1 / 60 ) => {

			const count = Math.max( 1, Math.round( frames ) );
			if ( uFrameDelta ) uFrameDelta.value = dt;
			for ( let frame = 0; frame < count; frame ++ ) {

				releasePieces( dt );
				solver.step( renderer, dt );
				renderer.render( scene, camera );

			}
			return getState();

		},
		render: () => renderer.render( scene, camera ),
		readIndirectArgsAll: () => brickMesh.culler.readIndirectArgsAll(),
		whenIdle: async () => renderer.backend?.device?.queue?.onSubmittedWorkDone?.(),
		dispose: unmount,
	};

}

export async function unmount() {

	if ( ! mounted && ! renderer ) return;
	mounted = false;
	ready = false;
	window.clearTimeout( showStatus.timeout );
	renderer?.setAnimationLoop( null );
	resizeObserver?.disconnect();
	resizeObserver = null;
	while ( eventDisposers.length > 0 ) eventDisposers.pop()();
	pauseButton?.removeEventListener( 'click', togglePause );
	resetButton?.removeEventListener( 'click', resetBricks );
	buildButton?.removeEventListener( 'click', toggleBuild );
	cameraButton?.removeEventListener( 'click', toggleCamera );
	countSelect?.removeEventListener( 'change', handleCountChange );

	disposeBrickSystem();
	buildTargetAttribute?.dispose?.();
	buildTargetAttribute = null;
	buildTargets = null;

	if ( stage ) {

		stage.removeFromParent();
		stage.clear();
		stage = null;

	}
	for ( const geometry of ownedGeometries ) geometry.dispose?.();
	for ( const material of ownedMaterials ) material.dispose?.();
	ownedGeometries.clear();
	ownedMaterials.clear();
	furnitureColliders.length = 0;
	brickGeometries = [];
	geometryAudit = [];
	environmentTexture?.dispose();
	environmentTexture = null;
	mountAssets = null;
	scene?.clear();
	scene = null;
	camera = null;
	cursorGroup = null;
	cursorWireMaterial = null;
	cursorLight = null;
	floorMaterial = null;
	rugMaterial = null;

	interfaceElement?.remove();
	interfaceElement = null;
	interfaceStyle?.remove();
	interfaceStyle = null;
	pauseButton = null;
	resetButton = null;
	buildButton = null;
	cameraButton = null;
	countSelect = null;
	statusElement = null;

	if ( renderer ) {

		devtools?.dispose();
		devtools = null;
		renderer.dispose();
		renderer.domElement.remove();
		renderer = null;

	}
	if ( container && containerStyle ) {

		container.style.position = containerStyle.position;
		container.style.overflow = containerStyle.overflow;
		container.style.touchAction = containerStyle.touchAction;
		container.style.background = containerStyle.background;

	}
	container = null;
	containerStyle = null;
	previousTime = 0;
	contextLossReport = null;
	rebuilding = false;
	buildActive = false;
	buildPhase = 0;
	hudReadbackPending = false;
	nextHudReadback = 0;
	drawnPieces = 0;
	drawnTriangles = 0;
	pointerState.inside = false;
	pointerState.pressed = false;
	pointerState.projected = false;
	pointerState.lastMoveTime = 0;

}
