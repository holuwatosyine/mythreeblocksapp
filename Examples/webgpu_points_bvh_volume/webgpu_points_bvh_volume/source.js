/**
 * WebGPU Point Cloud BVH Volume Raymarching
 *
 * Demonstrates the fastest possible raymarched volume rendering from a point cloud
 * using PointsBVH from three-mesh-bvh. The pipeline:
 * 1. Load point cloud data via SplatMesh
 * 2. Build PointsBVH for O(log N) nearest-point queries
 * 3. Generate SDF volume via GPU compute (precomputed for fast raymarching)
 * 4. Visualize with sphere-tracing raymarcher
 *
 * Features:
 * - Auto-computed shell radius from point density
 * - Isosurface extraction via raymarching
 * - SDF gradient normals for lighting
 * - Safari/Firefox WebGPU compatible
 */

import * as THREE from 'three/webgpu';
import { registerDevtools } from 'three-blocks/devtools';

import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { createExampleCaption } from '../helpers/ExampleCaption.js';
import { withAssetLoader } from '../helpers/LoadingManager.js';

import {
	PointsBVH,
	acceleratedRaycast,
	computeBoundsTree,
	disposeBoundsTree,
} from 'three-mesh-bvh';

import { RayMarchSDFNodeMaterial } from 'three-blocks/sdf-raymarching';
import { SplatMesh, GaussianSplatsPoints } from 'three-blocks/gaussian-splats';
import { frameCameraForAspect } from '../helpers/mobile.js';

import {
    ComputePointsSDFGenerator,
    SDFSliceVolumeNodeMaterial,
    createSDFBoundsHelper,
    updateSDFBoundsHelper,
} from 'three-blocks/sdf-raymarching';

import { createExampleGui } from '../helpers/exampleGui.js';

//
// BVH Acceleration Setup for Points
//

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Points.prototype.raycast = acceleratedRaycast;


//
// Module Variables
//

let container, renderer, scene, camera, controls;
let devtools;
let gui, infoElement, resizeObserver;
let containerPosition = '';

// Point Cloud & SDF

let pointsGeometry, pointsBVH;
let sdfGenerator;
let pointCount = 0;

// Visualization

let splats, pointCloud;
let boundsHelper;
let raymarchQuad, sliceVolume;

// State

let rebuildPromise = null;
let materialControllers = [];
let exampleOptions;

// Reusable objects

const timer = new THREE.Timer();
const _normalStep = new THREE.Vector3();
const _boundsSize = new THREE.Vector3();
const _frameCenter = new THREE.Vector3();
const _frameSize = new THREE.Vector3();
const _cameraDirection = new THREE.Vector3( 0.22, 0.12, 1 ).normalize();
const _sliceCameraPosition = new THREE.Vector3();
const _renderResolution = new THREE.Vector2();
// World-fixed key light: the turntable sweeps the object between front-lit and
// backlit, which is what sells the translucency. Starts behind the object.
const _worldLightDirection = new THREE.Vector3( - 0.35, 0.4, - 0.85 ).normalize();
const _viewLightDirection = new THREE.Vector3();
const MAX_SLICE_COUNT = 192;
const PAGE_QUERY = new URLSearchParams( window.location.search );
const DEBUG = PAGE_QUERY.has( 'debug' );
const REDUCED_MOTION = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

//
// Parameters
//

const MATERIAL_PRESETS = Object.freeze( {
	'Imperial Jade': Object.freeze( {
		raymarchRoughness: 0.18,
		surfaceColor: 0x17795c,
		highlightColor: 0xe4fff5,
		translucency: 0.94,
		absorptionDensity: 6.4,
		absorptionColor: 0x36bd7f,
		scatterColor: 0xa8ffcc,
		envIntensity: 1,
		scatterSoftness: 1,
		ior: 1.66,
		dispersion: 0,
		cloudStrength: 0.58,
		veinStrength: 0.72,
		veinColor: 0x173324,
		finishIntensity: 1,
		surfaceDetail: 0.64,
		filmic: 1,
		exposure: 0.25,
		ditherStrength: 1,
		marchJitter: 1,
		quality: 3,
	} ),
	'Lavender Jade': Object.freeze( {
		raymarchRoughness: 0.22,
		surfaceColor: 0x9f8fc2,
		highlightColor: 0xf5efff,
		translucency: 0.9,
		absorptionDensity: 5.8,
		absorptionColor: 0xa184bc,
		scatterColor: 0xe4d6ff,
		envIntensity: 1,
		scatterSoftness: 1,
		ior: 1.66,
		dispersion: 0,
		cloudStrength: 0.72,
		veinStrength: 0.42,
		veinColor: 0x463c58,
		finishIntensity: 0.92,
		surfaceDetail: 0.52,
		filmic: 1,
		exposure: 0.18,
		ditherStrength: 1,
		marchJitter: 1,
		quality: 3,
	} ),
	Wax: Object.freeze( {
		raymarchRoughness: 0.34,
		surfaceColor: 0xd99a70,
		highlightColor: 0xffead2,
		translucency: 0.82,
		absorptionDensity: 3.1,
		absorptionColor: 0xd98f62,
		scatterColor: 0xffe6c4,
		envIntensity: 0.88,
		scatterSoftness: 0.92,
		ior: 1.47,
		dispersion: 0,
		cloudStrength: 0.2,
		veinStrength: 0,
		veinColor: 0x6b3f2e,
		finishIntensity: 0.42,
		surfaceDetail: 0.22,
		filmic: 1,
		exposure: 0.2,
		ditherStrength: 1,
		marchJitter: 1,
		quality: 3,
	} ),
	Marble: Object.freeze( {
		raymarchRoughness: 0.38,
		surfaceColor: 0xb7bbb5,
		highlightColor: 0xf5f4ec,
		translucency: 0.46,
		absorptionDensity: 9.2,
		absorptionColor: 0x91988f,
		scatterColor: 0xf0ead8,
		envIntensity: 0.92,
		scatterSoftness: 0.58,
		ior: 1.5,
		dispersion: 0,
		cloudStrength: 0.48,
		veinStrength: 1.45,
		veinColor: 0x252923,
		finishIntensity: 0.36,
		surfaceDetail: 0.72,
		filmic: 1,
		exposure: 0.12,
		ditherStrength: 1,
		marchJitter: 1,
		quality: 3,
	} ),
} );

const INITIAL_SHAPE = PAGE_QUERY.get( 'shape' ) === 'jewel' ? 'jewel' : 'scan';
const requestedPreset = PAGE_QUERY.get( 'material' );
const INITIAL_PRESET = Object.hasOwn( MATERIAL_PRESETS, requestedPreset )
	? requestedPreset
	: 'Imperial Jade';

const params = {
	shape: INITIAL_SHAPE,
	materialPreset: INITIAL_PRESET,
	motion: ! REDUCED_MOTION,
	rotationSpeed: 0.42,
	// SDF generation
	sdfResolution: 128,
	sdfMargin: 0.3,
	sdfThreshold: 0.0,
	shellRadius: 'auto',
	computedShellRadius: 0,

	// View modes: 'scene' | 'raymarch' | 'slices'
	viewMode: 'raymarch',
	raymarchSurface: 0.0,
	raymarchRoughness: 0.24,
	raymarchAO: 0.9,
	raymarchStepScale: 0.72,
	...MATERIAL_PRESETS[ INITIAL_PRESET ],
	sliceCount: 40,
	sliceOpacity: 0.1,
	sliceBandVoxels: 0.5,
	sliceSpread: 1.3,
	sliceSheetOpacity: 0,

	// Debug visualization
	showPoints: false,
	pointSize: 2,
	pointColor: 0x00ffff,
	showBounds: false,
};

const initialViewMode = new URLSearchParams( window.location.search ).get( 'view' );
if ( [ 'scene', 'raymarch', 'slices' ].includes( initialViewMode ) ) {

	params.viewMode = initialViewMode;

}

//
// Entry Point
//

export async function mount( containerElement, mountOptions = {} ) {

	container = containerElement;
	const requestedMaterial = mountOptions.material ?? INITIAL_PRESET;
	exampleOptions = {
		assets: mountOptions.assets ?? {},
		debug: mountOptions.debug ?? DEBUG,
	};
	params.shape = [ 'scan', 'jewel' ].includes( mountOptions.shape ) ? mountOptions.shape : INITIAL_SHAPE;
	params.materialPreset = Object.hasOwn( MATERIAL_PRESETS, requestedMaterial ) ? requestedMaterial : INITIAL_PRESET;
	Object.assign( params, MATERIAL_PRESETS[ params.materialPreset ] );
	if ( Number.isInteger( mountOptions.quality ) ) params.quality = THREE.MathUtils.clamp( mountOptions.quality, 1, 4 );
	params.motion = mountOptions.motion ?? ! REDUCED_MOTION;
	params.sdfResolution = Number.isInteger( mountOptions.sdfResolution )
		? THREE.MathUtils.clamp( mountOptions.sdfResolution, 8, 256 )
		: 128;
	const requestedView = mountOptions.initialView ?? initialViewMode;
	params.viewMode = [ 'scene', 'raymarch', 'slices' ].includes( requestedView ) ? requestedView : 'raymarch';
	containerPosition = container.style.position;
	container.style.position = 'relative';

	if ( WebGPU.isAvailable() === false ) {

		container.appendChild( WebGPU.getErrorMessage() );
		throw new Error( 'No WebGPU support' );

	}

	await init();
	return createExampleHandle();

}

async function init() {

	createInfoElement();

	// Camera

	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	camera = new THREE.PerspectiveCamera( 50, width / height, 0.01, 1000 );
	camera.position.set( 0, 1.5, 3 );
	camera.lookAt( 0, 0, 0 );

	// Scene

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x040607 );

	// Renderer

	renderer = new THREE.WebGPURenderer( { antialias: true, trackTimestamp: true } );
	devtools = registerDevtools( { renderer, container } );
	renderer.shadowMap.enabled = true;
	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, 1.5 ) );
	renderer.setSize( width, height );
	renderer.domElement.dataset.jadeSurface = 'true';
	container.appendChild( renderer.domElement );

	await renderer.init();

	// Controls

	controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true;
	controls.autoRotate = params.motion;
	controls.autoRotateSpeed = params.rotationSpeed;
	controls.target.set( 0, 0, 0 );
	controls.update();

	// Load point cloud

	await loadPointCloud();

	// Build SDF

	await rebuildSDF();

	// GUI

	await setupGui();

	// Start render loop

	renderer.setAnimationLoop( animate );
	resizeObserver = new ResizeObserver( onWindowResize );
	resizeObserver.observe( container );
	onWindowResize();

}

//
// Point Cloud Loading
//

function pointCloudAssetUrl() {

	const pointCloudAsset = exampleOptions.assets.pointCloud;
	if ( pointCloudAsset ) return pointCloudAsset instanceof URL ? pointCloudAsset.href : pointCloudAsset;

	const filesRoot = exampleOptions.assets.files;
	if ( filesRoot ) {

		return new URL( 'splat/cactus.sog', new URL( filesRoot, window.location.href ) ).href;

	}

	throw new Error( 'The scanned shape requires assets.pointCloud or assets.files.' );

}

async function loadPointCloud() {

	if ( params.shape === 'jewel' ) {

		createJewelPointCloud();
		return;

	}

	// Load point cloud data using SplatMesh + GaussianSplatsPoints

	try {

		// Load as Gaussian splats
		splats = await withAssetLoader( container, [ 'Scanned point cloud' ], manager => (
			manager.load( 'Scanned point cloud', onProgress => SplatMesh.load( pointCloudAssetUrl(), { onProgress } ) )
		) );
		splats.visible = params.viewMode === 'scene';
		scene.add( splats );

		// Use GaussianSplatsPoints to get positions with correct coordinate transform
		pointCloud = new GaussianSplatsPoints( splats, {
			pointSize: params.pointSize,
			color: params.pointColor,
			sizeAttenuation: false,
		} );
		pointCloud.material.transparent = true;
		pointCloud.material.opacity = 0.5;
		pointCloud.visible = params.showPoints;
		scene.add( pointCloud );

		// Use the geometry from GaussianSplatsPoints for BVH
		pointsGeometry = pointCloud.geometry;
		pointCount = splats.count || splats.maxSplats;

		// Build PointsBVH
		pointsGeometry.computeBoundsTree( { type: PointsBVH } );
		pointsBVH = pointsGeometry.boundsTree;
		framePointCloud();

		updateInfo();

	} catch ( error ) {

		console.error( 'Failed to load point cloud:', error );
		if ( splats ) {

			scene.remove( splats );
			splats.dispose();
			splats = null;

		}

		// Fallback: create procedural point cloud
		createProceduralPointCloud();

	}

}

function createProceduralPointCloud() {

	// Generate a sphere point cloud as fallback
	const count = 50000;
	pointCount = count;

	const positions = new Float32Array( count * 3 );

	for ( let i = 0; i < count; i ++ ) {

		// Random point on sphere surface
		const theta = Math.random() * Math.PI * 2;
		const phi = Math.acos( 2 * Math.random() - 1 );
		const r = 0.5 + Math.random() * 0.1; // Slightly fuzzy sphere

		positions[ i * 3 + 0 ] = r * Math.sin( phi ) * Math.cos( theta );
		positions[ i * 3 + 1 ] = r * Math.sin( phi ) * Math.sin( theta );
		positions[ i * 3 + 2 ] = r * Math.cos( phi );

	}

	buildProceduralPoints( positions );

}

function createJewelPointCloud() {

	// An oval cabochon: points sampled uniformly over a continuously curved
	// ellipsoid, then run through the exact same BVH → SDF → raymarch pipeline
	// as a scan. The curved face gives refraction and body thickness a real
	// gradient instead of the slab-like plateau of a rounded box.
	const count = 120000;
	pointCount = count;

	const jewelGeometry = new THREE.SphereGeometry( 0.75, 96, 64 );
	jewelGeometry.scale( 1, 0.95 / 1.5, 0.7 / 1.5 );
	const sampler = new MeshSurfaceSampler( new THREE.Mesh( jewelGeometry ) ).build();

	const positions = new Float32Array( count * 3 );
	const samplePosition = new THREE.Vector3();
	for ( let i = 0; i < count; i ++ ) {

		sampler.sample( samplePosition );
		positions[ i * 3 + 0 ] = samplePosition.x;
		positions[ i * 3 + 1 ] = samplePosition.y;
		positions[ i * 3 + 2 ] = samplePosition.z;

	}

	jewelGeometry.dispose();
	buildProceduralPoints( positions );

}

function buildProceduralPoints( positions ) {

	pointsGeometry = new THREE.BufferGeometry();
	pointsGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );

	// Build PointsBVH
	pointsGeometry.computeBoundsTree( { type: PointsBVH } );
	pointsBVH = pointsGeometry.boundsTree;
	framePointCloud();

	// Create point cloud visualization
	const pointsMaterial = new THREE.PointsMaterial( {
		size: params.pointSize,
		sizeAttenuation: false,
		color: params.pointColor,
		transparent: true,
		opacity: 0.5,
	} );

	pointCloud = new THREE.Points( pointsGeometry, pointsMaterial );
	pointCloud.visible = params.showPoints;
	scene.add( pointCloud );

}

function framePointCloud() {

	pointsGeometry.computeBoundingBox();
	pointsGeometry.boundingBox.getCenter( _frameCenter );
	pointsGeometry.boundingBox.getSize( _frameSize );

	const radius = Math.max( _frameSize.length() * 0.5, 0.1 );
	const halfFov = THREE.MathUtils.degToRad( camera.fov * 0.5 );
	const distance = radius / Math.sin( halfFov ) * 1.08;

	controls.target.copy( _frameCenter );
	camera.position.copy( _frameCenter ).addScaledVector( _cameraDirection, distance );
	frameCameraForAspect( camera, controls.target, true );
	camera.near = Math.max( distance / 500, 0.001 );
	camera.far = distance * 20;
	camera.updateProjectionMatrix();
	controls.minDistance = radius * 0.55;
	controls.maxDistance = radius * 8;
	controls.update();

}

//
// SDF Generation
//

async function rebuildSDF() {

	if ( rebuildPromise ) {

		return rebuildPromise;

	}

	rebuildPromise = ( async () => {

		if ( ! renderer || ! pointsGeometry || ! pointsBVH ) {

			return;

		}

		// Create or update SDF generator
		if ( sdfGenerator === undefined ) {

			sdfGenerator = new ComputePointsSDFGenerator( {
				resolution: params.sdfResolution,
				margin: params.sdfMargin,
				shellRadius: params.shellRadius,
			} );

		}
		sdfGenerator.resolution = params.sdfResolution;
		sdfGenerator.margin = params.sdfMargin;
		sdfGenerator.threshold = params.sdfThreshold;
		sdfGenerator.shellRadius = params.shellRadius;

		// Generate SDF texture on GPU
		await sdfGenerator.generate( pointsGeometry, pointsBVH, renderer );

		// Store computed shell radius for display
		params.computedShellRadius = sdfGenerator.shellRadius;

		// Update visualization
		updateVisualization();

		updateInfo();

	} )();

	rebuildPromise.finally( () => {

		rebuildPromise = null;

	} );

	return rebuildPromise;

}

//
// Visualization
//

function updateVisualization() {

	if ( ! sdfGenerator || ! sdfGenerator.sdfTexture ) return;

	// Update bounds helper
	if ( boundsHelper ) {

		updateSDFBoundsHelper( boundsHelper, sdfGenerator );

	} else {

		boundsHelper = createSDFBoundsHelper( sdfGenerator, 0xffff00 );
		boundsHelper.visible = params.showBounds;
		scene.add( boundsHelper );

	}

	// Create or update raymarch quad
	if ( ! raymarchQuad ) {

		const raymarchMaterial = new RayMarchSDFNodeMaterial( sdfGenerator.sdfTexture, {
			color: params.surfaceColor,
			highlightColor: params.highlightColor,
			backgroundTop: 0x10272d,
			backgroundBottom: 0x020506,
			backgroundAlpha: 1,
			roughness: params.raymarchRoughness,
			stepScale: params.raymarchStepScale,
			translucency: params.translucency,
			absorptionDensity: params.absorptionDensity,
			absorptionColor: params.absorptionColor,
			scatterColor: params.scatterColor,
			envIntensity: params.envIntensity,
			scatterSoftness: params.scatterSoftness,
			ior: params.ior,
			dispersion: params.dispersion,
			cloudStrength: params.cloudStrength,
			veinStrength: params.veinStrength,
			veinColor: params.veinColor,
			finishIntensity: params.finishIntensity,
			surfaceDetail: params.surfaceDetail,
			filmic: params.filmic,
			exposure: params.exposure,
			ditherStrength: params.ditherStrength,
			marchJitter: params.marchJitter,
			quality: params.quality,
		} );
		raymarchQuad = new FullScreenQuad( raymarchMaterial );

	} else {

		// Update texture reference
		const fragParams = raymarchQuad.material.fragmentNode.parameters;
		fragParams.sdf.value = sdfGenerator.sdfTexture;

	}

	// Create or update the exploded transparent depth-slice stack.
	if ( ! sliceVolume ) {

		const sliceMaterial = new SDFSliceVolumeNodeMaterial( sdfGenerator.sdfTexture, {
			layerCount: params.sliceCount,
			opacity: params.sliceOpacity,
			sliceSpread: params.sliceSpread,
			sheetOpacity: params.sliceSheetOpacity,
		} );
		sliceVolume = new THREE.InstancedMesh(
			new THREE.PlaneGeometry( 1, 1 ),
			sliceMaterial,
			MAX_SLICE_COUNT
		);
		sliceVolume.name = 'SDF Slice Volume';
		sliceVolume.count = params.sliceCount;
		sliceVolume.frustumCulled = false;
		sliceVolume.matrixAutoUpdate = false;
		sliceVolume.visible = params.viewMode === 'slices';
		scene.add( sliceVolume );

	} else {

		sliceVolume.material.sliceVolumeUniforms.sdf.value = sdfGenerator.sdfTexture;

	}

	sliceVolume.matrix.copy( sdfGenerator.boundsMatrix );
	sliceVolume.matrixWorldNeedsUpdate = true;

}

function updateInfo() {

	if ( ! infoElement ) return;

	const detail = infoElement.querySelector( '[data-detail]' );
	if ( detail ) detail.textContent = `${pointCount.toLocaleString()} points · ${params.sdfResolution}³ field · no mesh`;
	const title = infoElement.querySelector( '[data-title]' );
	if ( title ) title.textContent = params.shape === 'jewel' ? 'Field → cabochon' : 'Points → polished stone';
	const material = infoElement.querySelector( '[data-material]' );
	if ( material ) material.textContent = `${params.materialPreset} · measured through the body`;
	infoElement.style.setProperty(
		'--tb-caption-accent',
		`#${new THREE.Color( params.highlightColor ).getHexString()}`
	);

}

function createInfoElement() {

	infoElement = createExampleCaption( {
		accent: '#e4fff5',
		ariaLabel: 'Points to volume material details',
		label: 'Material details',
		content: `
			<span class="tb-example-caption__eyebrow">Field-cut specimen</span>
			<strong class="tb-example-caption__title" data-title>Points → polished stone</strong>
			<span class="tb-example-caption__meta" data-material>Imperial Jade · measured through the body</span>
			<span class="tb-example-caption__note" data-detail>Building the distance field…</span>
		`,
	} );
	infoElement.dataset.pointsVolumeInterface = '';
	container.appendChild( infoElement );

}

//
// GUI Setup
//

function applyMaterialPreset( presetName, updateUrl = true ) {

	const preset = MATERIAL_PRESETS[ presetName ];
	if ( ! preset ) return;

	params.materialPreset = presetName;
	Object.assign( params, preset );
	for ( const controller of materialControllers ) controller.updateDisplay();
	updateInfo();

	if ( updateUrl ) {

		const url = new URL( window.location.href );
		if ( presetName === 'Imperial Jade' ) url.searchParams.delete( 'material' );
		else url.searchParams.set( 'material', presetName );
		window.history.replaceState( null, '', url );

	}

}

function navigateToShape( shape ) {

	const url = new URL( window.location.href );
	if ( shape === 'jewel' ) url.searchParams.set( 'shape', 'jewel' );
	else url.searchParams.delete( 'shape' );
	window.location.assign( url );

}

async function setupGui() {

	gui = await createExampleGui( 'Points → Volume' );
	gui.domElement.dataset.pointsVolumeInterface = '';
	if ( container.clientWidth < 560 ) gui.close();

	gui.add( params, 'shape', {
		'Scanned cactus': 'scan',
		'Cut cabochon': 'jewel',
	} ).name( 'Shape' ).onChange( navigateToShape );
	gui.add( params, 'materialPreset', Object.keys( MATERIAL_PRESETS ) )
		.name( 'Material' )
		.onChange( applyMaterialPreset );
	gui.add( params, 'viewMode', {
		'Sculpted surface': 'raymarch',
		'Volume slices': 'slices',
		'Input splats': 'scene',
	} ).name( 'Story' );
	gui.add( params, 'motion' ).name( 'Turntable' );
	gui.add( params, 'rotationSpeed', 0.1, 1.2, 0.02 ).name( 'Turntable speed' );
	gui.add( params, 'quality', {
		'Full · 3 light rays': 4,
		'High · 2 light rays': 3,
		'Balanced · 1 light ray': 2,
		'Low · no color split': 1,
		'Economy · 2 noise layers': 0,
	} ).name( 'Quality' );

	const stoneFolder = gui.addFolder( 'Stone character' );
	materialControllers = [
		stoneFolder.add( params, 'raymarchRoughness', 0.04, 1, 0.01 ).name( 'Polish roughness' ),
		stoneFolder.add( params, 'translucency', 0, 1, 0.01 ).name( 'Body light' ),
		stoneFolder.add( params, 'absorptionDensity', 0.5, 24, 0.1 ).name( 'Depth density' ),
		stoneFolder.add( params, 'cloudStrength', 0, 1.5, 0.01 ).name( 'Clouds' ),
		stoneFolder.add( params, 'veinStrength', 0, 2, 0.01 ).name( 'Veins' ),
		stoneFolder.add( params, 'finishIntensity', 0, 1, 0.01 ).name( 'Polish layers' ),
		stoneFolder.add( params, 'surfaceDetail', 0, 1, 0.01 ).name( 'Stone grain' ),
		stoneFolder.add( params, 'ior', 1, 2, 0.01 ).name( 'Refraction' ),
		stoneFolder.addColor( params, 'surfaceColor' ).name( 'Surface tint' ),
		stoneFolder.addColor( params, 'absorptionColor' ).name( 'Depth tint' ),
		stoneFolder.addColor( params, 'scatterColor' ).name( 'Glow tint' ),
		stoneFolder.addColor( params, 'veinColor' ).name( 'Vein tint' ),
	];

	if ( ! exampleOptions.debug ) return;
	const sdfFolder = gui.addFolder( 'Engineering · SDF' );
	sdfFolder.add( params, 'sdfResolution', [ 32, 48, 64, 96, 128 ] ).name( 'Resolution' ).onChange( rebuildSDF );
	sdfFolder.add( params, 'sdfMargin', 0, 1 ).name( 'Margin' ).onChange( rebuildSDF );
	sdfFolder.add( params, 'sdfThreshold', - 0.5, 0.5 ).name( 'Threshold' ).onChange( rebuildSDF );
	sdfFolder.add( { rebuild: () => rebuildSDF() }, 'rebuild' ).name( 'Rebuild field' );

	const renderFolder = gui.addFolder( 'Engineering · render' );
	renderFolder.add( params, 'raymarchAO', 0, 1, 0.01 ).name( 'Ambient occlusion' );
	renderFolder.add( params, 'raymarchStepScale', 0.4, 1, 0.01 ).name( 'Step scale' );
	renderFolder.add( params, 'envIntensity', 0, 2, 0.01 ).name( 'Studio intensity' );
	renderFolder.add( params, 'scatterSoftness', 0, 1, 0.01 ).name( 'Scatter softening' );
	renderFolder.add( params, 'dispersion', 0, 1, 0.01 ).name( 'Color split' );
	renderFolder.add( params, 'filmic', 0, 1, 0.01 ).name( 'Filmic output' );
	renderFolder.add( params, 'exposure', - 3, 3, 0.05 ).name( 'Exposure' );
	renderFolder.add( params, 'ditherStrength', 0, 2, 0.05 ).name( 'Dither' );
	renderFolder.add( params, 'marchJitter', 0, 1, 0.01 ).name( 'March jitter' );
	renderFolder.add( params, 'raymarchSurface', - 0.2, 0.2, 0.005 ).name( 'Surface' );
	renderFolder.add( params, 'sliceCount', 8, MAX_SLICE_COUNT, 1 ).name( 'Slice count' );
	renderFolder.add( params, 'sliceOpacity', 0.005, 0.2, 0.005 ).name( 'Slice opacity' );
	renderFolder.add( params, 'sliceBandVoxels', 0.5, 8, 0.1 ).name( 'Slice band' );
	renderFolder.add( params, 'sliceSpread', 1, 2.5, 0.01 ).name( 'Slice spread' );
	renderFolder.add( params, 'showPoints' ).name( 'Show points' ).onChange( value => {

		if ( pointCloud ) pointCloud.visible = value;

	} );
	renderFolder.add( params, 'showBounds' ).name( 'Show bounds' ).onChange( value => {

		if ( boundsHelper ) boundsHelper.visible = value;

	} );

}

function createExampleHandle() {

	const settle = ( frameCount = 3 ) => new Promise( resolve => {

		let remaining = Math.max( 1, Math.floor( frameCount ) );
		const advance = () => {

			remaining --;
			if ( remaining <= 0 ) resolve();
			else requestAnimationFrame( advance );

		};
		requestAnimationFrame( advance );

	} );

	return {
		version: 1,
		ready: true,
		setViewAzimuth( degrees, elevationDegrees = 7 ) {

			const radius = camera.position.distanceTo( controls.target );
			const azimuth = THREE.MathUtils.degToRad( degrees );
			const elevation = THREE.MathUtils.degToRad( elevationDegrees );
			camera.position.copy( controls.target ).add( new THREE.Vector3(
				Math.sin( azimuth ) * Math.cos( elevation ) * radius,
				Math.sin( elevation ) * radius,
				Math.cos( azimuth ) * Math.cos( elevation ) * radius
			) );
			controls.update();

		},
		setLightAzimuth( degrees, elevationDegrees = 24 ) {

			const azimuth = THREE.MathUtils.degToRad( degrees );
			const elevation = THREE.MathUtils.degToRad( elevationDegrees );
			_worldLightDirection.set(
				Math.sin( azimuth ) * Math.cos( elevation ),
				Math.sin( elevation ),
				Math.cos( azimuth ) * Math.cos( elevation )
			).normalize();

		},
		setMaterial( presetName ) {

			applyMaterialPreset( presetName );

		},
		setMotion( enabled ) {

			params.motion = Boolean( enabled );

		},
		setMaterialProperties( values ) {

			for ( const [ name, value ] of Object.entries( values ) ) {

				if ( ! Object.hasOwn( params, name ) ) throw new Error( `Unknown stone parameter: ${name}` );
				params[ name ] = value;

			}
			for ( const controller of materialControllers ) controller.updateDisplay();

		},
		whenSettled: settle,
		async measurePerformance( frameCount = 30 ) {

			const frames = THREE.MathUtils.clamp( Math.floor( frameCount ), 4, 120 );
			const previousMotion = params.motion;
			params.motion = false;
			try {

				await renderer.resolveTimestampsAsync( THREE.TimestampQuery.RENDER );
				await settle( frames );
				const totalMilliseconds = await renderer.resolveTimestampsAsync(
					THREE.TimestampQuery.RENDER
				);
				return {
					frames,
					totalMilliseconds,
					// Three.js resolves the summed render contexts of the last
					// completed frame, not the sum of every frame in the pool.
					averageFrameMilliseconds: totalMilliseconds,
				};

			} finally {

				params.motion = previousMotion;

			}

		},
		getDiagnostics() {

			return {
				shape: params.shape,
				material: params.materialPreset,
				quality: params.quality,
				resolution: [ _renderResolution.x, _renderResolution.y ],
				renderTimestamp: renderer.info?.render?.timestamp ?? null,
				computeTimestamp: renderer.info?.compute?.timestamp ?? null,
			};

		},
		dispose: unmount,
	};

}

//
// Animation Loop
//

function animate() {

	timer.update();
	const delta = timer.getDelta();

	controls.autoRotate = params.motion;
	controls.autoRotateSpeed = params.rotationSpeed;
	controls.update( delta );
	if ( splats ) splats.visible = params.viewMode === 'scene';
	if ( sliceVolume ) sliceVolume.visible = params.viewMode === 'slices';

	// Render based on view mode
	switch ( params.viewMode ) {

	case 'scene':
		renderer.render( scene, camera );
		break;

	case 'raymarch':
		renderRaymarch();
		break;

	case 'slices':
		renderSlices();
		break;

	}

}

function renderRaymarch() {

	if ( ! raymarchQuad || ! sdfGenerator ) {

		renderer.render( scene, camera );
		return;

	}

	// Update raymarch uniforms
	const fragParams = raymarchQuad.material.fragmentNode.parameters;

	camera.updateMatrixWorld();

	fragParams.surface.value = params.raymarchSurface;
	fragParams.roughness.value = params.raymarchRoughness;
	fragParams.ambientOcclusion.value = params.raymarchAO;
	fragParams.stepScale.value = params.raymarchStepScale;
	fragParams.surfaceColor.value.set( params.surfaceColor );
	fragParams.highlightColor.value.set( params.highlightColor );
	fragParams.translucency.value = params.translucency;
	fragParams.absorptionDensity.value = params.absorptionDensity;
	fragParams.absorptionColor.value.set( params.absorptionColor );
	fragParams.scatterColor.value.set( params.scatterColor );
	fragParams.envIntensity.value = params.envIntensity;
	fragParams.scatterSoftness.value = params.scatterSoftness;
	fragParams.ior.value = params.ior;
	fragParams.dispersion.value = params.dispersion;
	fragParams.cloudStrength.value = params.cloudStrength;
	fragParams.veinStrength.value = params.veinStrength;
	fragParams.veinColor.value.set( params.veinColor );
	fragParams.finishIntensity.value = params.finishIntensity;
	fragParams.surfaceDetail.value = params.surfaceDetail;
	fragParams.filmic.value = params.filmic;
	fragParams.exposure.value = params.exposure;
	fragParams.ditherStrength.value = params.ditherStrength;
	fragParams.marchJitter.value = params.marchJitter;
	fragParams.quality.value = params.quality;
	_viewLightDirection.copy( _worldLightDirection ).transformDirection( camera.matrixWorldInverse );
	fragParams.lightDirection.value.copy( _viewLightDirection );
	fragParams.projectionInverse.value.copy( camera.projectionMatrixInverse );
	fragParams.viewToWorld.value.copy( camera.matrixWorld );
	renderer.getDrawingBufferSize( _renderResolution );
	fragParams.resolution.value.copy( _renderResolution );

	// SDF to camera/view space transform
	fragParams.sdfTransform.value.copy( camera.matrixWorldInverse ).multiply( sdfGenerator.boundsMatrix );
	fragParams.sdfTransformInverse.value.copy( fragParams.sdfTransform.value ).invert();
	sdfGenerator.bounds.getSize( _boundsSize );
	fragParams.distanceScale.value = Math.max( _boundsSize.x, _boundsSize.y, _boundsSize.z );

	// Normal step size
	const step = 1.0 / params.sdfResolution;
	_normalStep.set( step, step, step );
	fragParams.normalStep.value.copy( _normalStep );

	// Render
	raymarchQuad.render( renderer );

}

function renderSlices() {

	if ( ! sliceVolume || ! sdfGenerator ) {

		renderer.render( scene, camera );
		return;

	}

	// Fixed texture-depth planes are reordered far-to-near for correct blending.
	// Display spacing is independent from sample depth, creating an exploded stack.
	camera.updateMatrixWorld();
	_sliceCameraPosition.copy( camera.position ).applyMatrix4( sdfGenerator.inverseBoundsMatrix );

	const uniforms = sliceVolume.material.sliceVolumeUniforms;
	const sliceCount = THREE.MathUtils.clamp(
		Math.floor( params.sliceCount ),
		1,
		MAX_SLICE_COUNT
	);
	sdfGenerator.bounds.getSize( _boundsSize );
	const voxelSize = Math.max( _boundsSize.x, _boundsSize.y, _boundsSize.z ) / params.sdfResolution;

	sliceVolume.count = sliceCount;
	uniforms.layerCount.value = sliceCount;
	uniforms.reverseOrder.value = _sliceCameraPosition.z < 0;
	uniforms.sliceSpread.value = params.sliceSpread;
	uniforms.surface.value = params.raymarchSurface;
	uniforms.opacity.value = params.sliceOpacity;
	uniforms.bandWidth.value = voxelSize * params.sliceBandVoxels;
	uniforms.sheetOpacity.value = params.sliceSheetOpacity;

	renderer.render( scene, camera );

}

//
// Event Handlers
//

function onWindowResize() {

	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	frameCameraForAspect( camera, controls.target );

	renderer.setSize( width, height );

}

export function unmount() {

	renderer?.setAnimationLoop( null );
	materialControllers = [];
	resizeObserver?.disconnect();
	resizeObserver = null;

	// Dispose resources
	if ( pointCloud ) {

		if ( pointCloud.geometry !== pointsGeometry ) pointCloud.geometry.dispose();
		pointCloud.material.dispose();
		pointCloud = null;

	}

	if ( splats ) {

		scene.remove( splats );
		splats.dispose();
		splats = null;

	}

	if ( pointsGeometry ) {

		pointsGeometry.disposeBoundsTree?.();
		pointsGeometry.dispose();
		pointsGeometry = null;

	}

	if ( sdfGenerator ) {

		sdfGenerator.dispose();
		sdfGenerator = null;

	}

	if ( raymarchQuad ) {

		raymarchQuad.material.dispose();
		raymarchQuad.dispose();
		raymarchQuad = null;

	}

	if ( sliceVolume ) {

		scene.remove( sliceVolume );
		sliceVolume.geometry.dispose();
		sliceVolume.material.dispose();
		sliceVolume = null;

	}

	if ( boundsHelper ) {

		scene.remove( boundsHelper );
		boundsHelper.traverse?.( object => {

			object.geometry?.dispose?.();
			object.material?.dispose?.();

		} );
		boundsHelper = null;

	}

	gui?.destroy();
	gui = null;
	controls?.dispose();
	controls = null;
	infoElement?.remove();
	infoElement = null;
	devtools?.dispose();
	devtools = null;
	renderer?.dispose();
	renderer?.domElement?.remove();
	renderer = null;
	scene = null;
	camera = null;
	if ( container ) container.style.position = containerPosition;
	containerPosition = '';
	container = null;
	exampleOptions = null;

}
