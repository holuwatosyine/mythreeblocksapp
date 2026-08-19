import * as THREE from 'three/webgpu';
import { registerDevtools } from 'three-blocks/devtools';
import { vec4, vec3, float, clamp, directionToColor } from 'three/tsl';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createExampleGui } from '../helpers/exampleGui.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { withAssetLoader } from '../helpers/LoadingManager.js';

import {
    SplatMesh,
    SplatSequence,
    GaussianSplatsHelper,
    GaussianSplatsPoints,
    // Exported TSL nodes for custom visualization
    gaussianDepth,
    gaussianColor,
    gaussianUV,
    gaussianAlphaUV,
    gaussianPower,
    gaussianLuminance,
    gaussianHue,
    gaussianNormal,
    gaussianAAFactor,
    gaussianSH,
    gaussianSHColor,
} from 'three-blocks/gaussian-splats';

import { GridPristine } from 'three-blocks/grid-pristine';

let container;
let renderer;
let devtools;
let scene;
let camera;
let controls;
let gui;
let splats = null;
let sequence = null; // 4D playback controller (numbered PLY sequence)
let lastSequenceFiles = null; // retained so toggling sequence options can reload the same clip
let clock = null;
let frameController = null; // GUI timeline scrubber
let splatsHelper = null;
let splatsPoints = null;
let lastVisualFrame = -1; // last frame the bounding box / points overlays were refreshed for
let grid = null;
let dropZone = null;
let fileInfoElement = null;
let redPointLight = null;
let bluePointLight = null;
let environmentUrl = null;
let transcoderPath = null;

const params = {
	showDropZone: true,
	showGrid: true,
	showBoundingBox: true,
	showPoints: false,
	displayMode: 'splats',
	// 4D playback (numbered PLY sequence)
	playing: true,
	scrub: 0, // normalized timeline position 0..1
	frameRate: 30,
	playbackSpeed: 1,
	loop: true,
	sequenceSH: false, // view-dependent SH per frame is ~80% of a 4D frame's payload — off by default
	visualization: 'None',
	lightingMode: 'unlit',
	enableSH: true,
	shDegree: 3,
	shStrength: 1.0,
	alphaBoost: 1.0,
	globalOpacity: 1.0,
	alphaClip: 0.0,
	minPixelRadius: 2.0,
	maxPixelRadius: 1000,
	sigmaCoverage: 2.0,
	environmentIntensity: 0.5,
	redLightIntensity: 2,
	blueLightIntensity: 2,
};

// File info for display
const fileInfo = {
	name: 'No file loaded',
	splatCount: 0,
};

// Visualization options using exported TSL nodes
const visualizationModes = [
	'None',
	'Normal',
	'Depth',
	'Gaussian Alpha',
	'Power',
	'UV',
	'Flat Color',
	'Luminance',
	'Hue',
	'Base Opacity',
	'SH Contribution',
	'SH Color RGB',
];

/**
 * Apply visualization mode by overriding material's outputNode.
 */
function applyVisualization( mode ) {

	if ( ! splats || ! splats.material ) return;

	const material = splats.material;

	if ( mode === 'None' ) {

		material.outputNode = null;
		material._applyLightingMode(); // Restore proper emissive/color nodes
		material.needsUpdate = true;
		return;

	}

	const globalOpacityUniform = material._globalOpacityUniform;

	const opacity = gaussianAlphaUV( gaussianUV )
		.mul( gaussianColor.a )
		.mul( gaussianAAFactor )
		.mul( globalOpacityUniform );

	const makeOutput = ( colorNode ) => vec4( colorNode, opacity );

	switch ( mode ) {

	case 'Normal':
		// True 3D normals from Gaussian ellipsoid (smallest scale axis)
		material.outputNode = makeOutput( directionToColor( gaussianNormal ) );
		break;

	case 'Depth':
		const normalizedDepth = clamp( gaussianDepth.div( float( 50 ) ), 0, 1 );
		material.outputNode = makeOutput( vec3( normalizedDepth, normalizedDepth, normalizedDepth ) );
		break;

	case 'Gaussian Alpha':
		const alpha = gaussianAlphaUV( gaussianUV );
		material.outputNode = makeOutput( vec3( alpha, alpha, alpha ) );
		break;

	case 'Power':
		const power = gaussianPower( gaussianUV );
		material.outputNode = makeOutput( vec3( power, power, power ) );
		break;

	case 'UV':
		const uvVis = clamp( gaussianUV.mul( 0.25 ).add( 0.5 ), 0, 1 );
		material.outputNode = makeOutput( vec3( uvVis.x, uvVis.y, float( 0.5 ) ) );
		break;

	case 'Flat Color':
		material.outputNode = makeOutput( clamp( gaussianColor.rgb, 0, 1 ) );
		break;

	case 'Luminance':
		const lum = gaussianLuminance( gaussianColor.rgb );
		material.outputNode = makeOutput( vec3( lum, lum, lum ) );
		break;

	case 'Hue':
		material.outputNode = makeOutput( gaussianHue( gaussianColor.rgb ) );
		break;

	case 'Base Opacity':
		const baseOpacity = clamp( gaussianColor.a, 0, 1 );
		material.outputNode = makeOutput( vec3( baseOpacity, baseOpacity, baseOpacity ) );
		break;

	case 'SH Contribution':
		const shAbs = gaussianSH.abs().mul( 5.0 );
		const shSign = gaussianSH.sign();
		const shR = clamp( shSign.mul( shAbs ).add( 0.5 ), 0, 1 );
		const shB = clamp( shSign.negate().mul( shAbs ).add( 0.5 ), 0, 1 );
		const shG = clamp( float( 0.5 ).sub( shAbs.mul( 0.5 ) ), 0, 1 );
		material.outputNode = makeOutput( vec3( shR, shG, shB ) );
		break;

	case 'SH Color RGB':
		const shColorVis = clamp( gaussianSHColor.mul( 2.0 ).add( 0.5 ), 0, 1 );
		material.outputNode = makeOutput( shColorVis );
		break;

	default:
		material.outputNode = null;
		return;

	}

	material.needsUpdate = true;

}

export async function mount( containerElement, mountOptions = {} ) {

	container = containerElement;
	environmentUrl = mountOptions.assets?.environment;
	transcoderPath = mountOptions.assets?.transcoderPath ?? mountOptions.assets?.basis ?? null;
	if ( typeof environmentUrl !== 'string' || environmentUrl.length === 0 ) {

		throw new Error( 'Gaussian Splatting Visualizer requires an environment asset.' );

	}
	if ( WebGPU.isAvailable() === false ) {

		container.appendChild( WebGPU.getErrorMessage() );
		throw new Error( 'No WebGPU support' );

	}

	await init();

}

async function init() {

	const aspect = window.innerWidth / window.innerHeight;
	camera = new THREE.PerspectiveCamera( 60, aspect, 0.1, 1000 );
	camera.position.set( 0, 2, 5 );

	clock = new THREE.Clock();

	scene = new THREE.Scene();

	const adapter = await navigator.gpu.requestAdapter();
	const maxSize = adapter.limits.maxStorageBufferBindingSize;
	const maxBufferSize = adapter.limits.maxBufferSize;
	renderer = new THREE.WebGPURenderer( {
		requiredLimits: {
			maxBufferSize: maxBufferSize,
			maxStorageBufferBindingSize: maxSize
		}
	} );
	devtools = registerDevtools( { renderer, container } );
	void devtools?.setStatsPanelMode( 'expanded' );
	renderer.setPixelRatio( 1 );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );
	await renderer.init();

	// Load the environment map: GPU-compressed UASTC HDR (.ktx2) transcodes to
	// BC6H where the hardware supports it; plain .hdr URLs keep the RGBE path.
	const useKtx2 = /\.ktx2(?:\?|$)/iu.test( String( environmentUrl ) );
	if ( useKtx2 && ! transcoderPath ) throw new Error( 'KTX2 environments require assets.transcoderPath.' );
	const environmentLoader = useKtx2
		? new KTX2Loader()
			.setTranscoderPath( `${String( transcoderPath ).replace( /\/$/u, '' )}/` )
			.detectSupport( renderer )
		: new HDRLoader();
	const envTexture = await withAssetLoader( container, [ 'HDR environment' ], manager => (
		manager.load( 'HDR environment', onProgress => new Promise( ( resolve, reject ) => {

			environmentLoader.load( environmentUrl, resolve, onProgress, reject );

		} ) )
	) ).finally( () => environmentLoader.dispose?.() );
	envTexture.mapping = THREE.EquirectangularReflectionMapping;
	scene.environment = envTexture;
	scene.environmentIntensity = params.environmentIntensity;

	// Create rotating point lights
	redPointLight = new THREE.PointLight( 0xff0000, params.redLightIntensity );
	redPointLight.position.set( 3, 1, 0 );
	scene.add( redPointLight );

	bluePointLight = new THREE.PointLight( 0x0000ff, params.blueLightIntensity );
	bluePointLight.position.set( - 3, 1, 0 );
	scene.add( bluePointLight );

	controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true;
	controls.target.set( 0, 0, 0 );
	controls.update();

	// Add grid for reference
	grid = new GridPristine();
	grid.scale.setScalar( 2 );
	grid.position.y = - 1;
	scene.add( grid );

	// Create drop zone UI
	createDropZone();

	// Create file info display
	createFileInfoDisplay();

	setupGui();

	renderer.setAnimationLoop( render );
	window.addEventListener( 'resize', onResize );

}

function createDropZone() {

	dropZone = document.createElement( 'div' );
	dropZone.id = 'gaussiansplat-drop-zone';

	const contentDiv = document.createElement( 'div' );
	contentDiv.style.cssText = `
		text-align: center;
		color: #ffffff;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	`;

	const iconSvg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
	iconSvg.setAttribute( 'width', '64' );
	iconSvg.setAttribute( 'height', '64' );
	iconSvg.setAttribute( 'viewBox', '0 0 24 24' );
	iconSvg.setAttribute( 'fill', 'none' );
	iconSvg.setAttribute( 'stroke', '#4a9eff' );
	iconSvg.setAttribute( 'stroke-width', '1.5' );
	iconSvg.innerHTML = `
		<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
		<polyline points="17 8 12 3 7 8"/>
		<line x1="12" y1="3" x2="12" y2="15"/>
	`;

	const mainText = document.createElement( 'p' );
	mainText.textContent = 'Drop a splat — or a numbered PLY sequence for 4D';
	mainText.style.cssText = `
		font-size: 20px;
		font-weight: 500;
		margin: 16px 0 8px 0;
	`;

	const subText = document.createElement( 'p' );
	subText.textContent = 'Static: .ply, .splat, .splats, .sog  ·  4D: drop multiple numbered .ply (e.g. frame_0001.ply …)';
	subText.style.cssText = `
		font-size: 14px;
		color: #888;
		margin: 0;
	`;

	contentDiv.appendChild( iconSvg );
	contentDiv.appendChild( mainText );
	contentDiv.appendChild( subText );

	dropZone.appendChild( contentDiv );

	dropZone.style.cssText = `
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.8);
		border: 3px dashed #4a9eff;
		z-index: 1000;
		transition: border-color 0.2s, background 0.2s;
	`;

	document.body.appendChild( dropZone );

	// Drag events
	dropZone.addEventListener( 'dragover', ( e ) => {

		e.preventDefault();
		e.stopPropagation();
		dropZone.style.borderColor = '#00ff88';
		dropZone.style.background = 'rgba(0, 50, 30, 0.9)';

	} );

	dropZone.addEventListener( 'dragleave', ( e ) => {

		e.preventDefault();
		e.stopPropagation();
		dropZone.style.borderColor = '#4a9eff';
		dropZone.style.background = 'rgba(0, 0, 0, 0.8)';

	} );

	dropZone.addEventListener( 'drop', async ( e ) => {

		e.preventDefault();
		e.stopPropagation();
		dropZone.style.borderColor = '#4a9eff';
		dropZone.style.background = 'rgba(0, 0, 0, 0.8)';

		await handleFilesDrop( e.dataTransfer.files );

	} );

	// Also handle drops on the whole document when drop zone is hidden
	document.addEventListener( 'dragover', ( e ) => {

		e.preventDefault();
		if ( dropZone.style.display === 'none' ) {

			dropZone.style.display = 'flex';
			params.showDropZone = true;

		}

	} );

	document.addEventListener( 'drop', async ( e ) => {

		e.preventDefault();
		if ( e.target !== dropZone && ! dropZone.contains( e.target ) ) {

			await handleFilesDrop( e.dataTransfer.files );

		}

	} );

}

function createFileInfoDisplay() {

	fileInfoElement = document.createElement( 'div' );
	fileInfoElement.id = 'gaussiansplat-file-info';
	fileInfoElement.style.cssText = `
		position: fixed;
		top: 10px;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.7);
		color: #fff;
		padding: 8px 16px;
		border-radius: 4px;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		font-size: 14px;
		z-index: 100;
		display: none;
	`;

	document.body.appendChild( fileInfoElement );

}

function updateFileInfoDisplay() {

	if ( ! fileInfoElement ) return;

	if ( fileInfo.name === 'No file loaded' ) {

		fileInfoElement.style.display = 'none';

	} else {

		fileInfoElement.textContent = `${fileInfo.name} - ${fileInfo.splatCount.toLocaleString()} splats`;
		fileInfoElement.style.display = 'block';

	}

}

const SUPPORTED_EXTENSIONS = [ 'ply', 'splat', 'splats', 'sog' ];

function fileExtension( file ) {

	return file.name.split( '.' ).pop().toLowerCase();

}

/**
 * Entry point for any drop. One supported file loads as a static splat; multiple files play back as
 * a 4D Gaussian-splat sequence (a numbered PLY flipbook, the same idea SuperSplat 1.13 uses).
 */
async function handleFilesDrop( fileList ) {

	const files = Array.from( fileList || [] ).filter( file => SUPPORTED_EXTENSIONS.includes( fileExtension( file ) ) );

	if ( files.length === 0 ) {

		alert( 'Unsupported format. Please use .ply, .splat, .splats, or .sog files.' );
		return;

	}

	if ( files.length > 1 ) {

		await withAssetLoader( container, [ '4D Gaussian sequence' ], manager => (
			manager.load( '4D Gaussian sequence', () => loadSequenceFromFiles( files ) )
		) );

	} else {

		await handleFileDrop( files[ 0 ] );

	}

}

function beginLoadUI( label = 'Loading...' ) {

	dropZone.style.display = 'none';
	params.showDropZone = false;
	fileInfo.name = label;
	fileInfo.splatCount = 0;
	updateFileInfoDisplay();
	fileInfoElement.style.display = 'block';

}

/** Tear down whatever is currently mounted (static splat or 4D sequence) before loading the next. */
function disposeCurrentSplats() {

	// Forget any retained clip; loadSequenceFromFiles re-sets this after its own dispose call, so a
	// static load (which doesn't) correctly leaves the sequence-only SH toggle inert.
	lastSequenceFiles = null;
	lastVisualFrame = -1;

	// A sequence owns its active frame mesh, so disposing the sequence already disposes `splats`.
	const sequenceOwnedActive = Boolean( sequence );

	if ( sequence ) {

		scene.remove( sequence );
		sequence.dispose();
		sequence = null;

	}

	if ( splatsHelper ) {

		scene.remove( splatsHelper );
		splatsHelper.dispose();
		splatsHelper = null;

	}

	if ( splatsPoints ) {

		scene.remove( splatsPoints );
		splatsPoints.dispose();
		splatsPoints = null;

	}

	if ( splats ) {

		if ( ! sequenceOwnedActive ) {

			scene.remove( splats );
			splats.dispose();

		}

		splats = null;

	}

}

/** Apply the current GUI material settings to the active splat mesh (shared by static and 4D paths). */
function applyMaterialSettings() {

	if ( ! splats || ! splats.material ) return;

	splats.material.globalOpacity = params.globalOpacity;
	splats.material.alphaClip = params.alphaClip;
	splats.material.alphaBoost = params.alphaBoost;
	splats.material.minPixelRadius = params.minPixelRadius;
	splats.material.maxPixelRadius = params.maxPixelRadius;
	splats.material.sigmaCoverage = params.sigmaCoverage;
	splats.material.shStrength = params.shStrength;
	splats.material.lightingMode = params.lightingMode;

}

/** Build a clean display name from a sequence's first frame (strips the trailing frame number). */
function sequenceLabel( files ) {

	const first = files[ 0 ]?.name || 'sequence';
	return first.replace( /[._-]?\d+\.(ply|splat|splats|sog)$/i, '' ) || first;

}

function bindSplatVisuals() {

	if ( ! splats ) return;

	splatsHelper = new GaussianSplatsHelper( splats, {
		showBoundingBox: true,
		showPerInstanceBoundingBoxes: false,
	} );
	splatsHelper.visible = params.showBoundingBox;
	scene.add( splatsHelper );

	splatsPoints = new GaussianSplatsPoints( splats, {
		pointSize: 0.005,
		useColors: true,
	} );
	splatsPoints.visible = params.showPoints;
	scene.add( splatsPoints );

	autoCenterCamera();
	applyVisualization( params.visualization );
	applyMaterialSettings();

}

async function handleFileDrop( file ) {

	const ext = fileExtension( file );
	if ( ! SUPPORTED_EXTENSIONS.includes( ext ) ) {

		alert( 'Unsupported format. Please use .ply, .splat, .splats, or .sog files.' );
		return;

	}

	beginLoadUI();
	disposeCurrentSplats();
	await withAssetLoader( container, [ 'Gaussian splat' ], manager => (
		manager.load( 'Gaussian splat', () => loadSplatsFromFile( file ) )
	) );

}

/** Load a numbered set of frame files as a 4D Gaussian-splat sequence and start playback. */
async function loadSequenceFromFiles( files ) {

	beginLoadUI( 'Loading 4D sequence…' );
	disposeCurrentSplats();
	lastSequenceFiles = files;

	try {

		// SplatSequence sorts numbered frames, parses each File once (cached for looping playback), and
		// reuses GPU buffers + the compute pipeline between frames via the engine's grow-only capacity pin.
		// SH defaults off: view-dependent spherical harmonics are ~80% of a frame's bytes and the costliest
		// thing to re-upload every frame — toggle 'View-dependent SH' to trade bandwidth for specular detail.
		sequence = new SplatSequence( files, {
			frameRate: params.frameRate,
			loop: params.loop,
			playbackSpeed: params.playbackSpeed,
			sortFrames: true,
			splatOptions: { sh: params.sequenceSH ? params.shDegree : false },
		} );

		await sequence.setFrame( 0 );
		scene.add( sequence );
		splats = sequence.activeSplats;
		if ( params.playing ) sequence.play();

		bindSplatVisuals();

		params.scrub = 0; // The Timeline mirrors params.scrub via .listen(); no manual refresh needed.

		fileInfo.name = `${sequenceLabel( files )} · 4D ${sequence.frameCount} frames`;
		fileInfo.splatCount = splats ? splats.count : 0;
		updateFileInfoDisplay();

		console.log( `Loaded 4D sequence: ${sequence.frameCount} frames, ${( splats?.count ?? 0 ).toLocaleString()} splats/frame` );

	} catch ( error ) {

		console.error( 'Failed to load sequence:', error );
		fileInfo.name = 'Error loading sequence';
		fileInfo.splatCount = 0;
		updateFileInfoDisplay();

	}

}

async function loadSplatsFromFile( file ) {

	try {

		// Read file as ArrayBuffer
		const buffer = await file.arrayBuffer();

		// Parse directly with the original filename so format detection works
		splats = await SplatMesh.parse( buffer, file.name, {
			sh: params.enableSH ? params.shDegree : false,
		} );

		scene.add( splats );

		// Create helper for bounding box visualization
		splatsHelper = new GaussianSplatsHelper( splats, {
			showBoundingBox: true,
			showPerInstanceBoundingBoxes: false,
		} );
		splatsHelper.visible = params.showBoundingBox;
		scene.add( splatsHelper );

		// Create points visualization
		splatsPoints = new GaussianSplatsPoints( splats, {
			pointSize: 0.005,
			useColors: true,
		} );
		splatsPoints.visible = params.showPoints;
		scene.add( splatsPoints );

		// Update file info
		fileInfo.name = file.name;
		fileInfo.splatCount = splats.count;
		updateFileInfoDisplay();

		// Auto-center camera on the model
		autoCenterCamera();

		// Apply current visualization mode
		applyVisualization( params.visualization );

		// Apply current material settings
		applyMaterialSettings();

		console.log( `Loaded: ${file.name} with ${splats.count.toLocaleString()} splats` );

	} catch ( error ) {

		console.error( 'Failed to load splats:', error );
		fileInfo.name = 'Error loading file';
		fileInfo.splatCount = 0;
		updateFileInfoDisplay();

	}

}

function autoCenterCamera() {

	if ( ! splats || ! splats.buffers || ! splats.buffers.positions ) return;

	// Compute bounding box from positions buffer
	const box = new THREE.Box3();
	const positions = splats.buffers.positions.value.array;
	const count = splats.count;

	if ( count === 0 || positions.length === 0 ) {

		// Default bounds if no data
		box.set(
			new THREE.Vector3( - 2, - 2, - 2 ),
			new THREE.Vector3( 2, 2, 2 )
		);

	} else {

		// Find min/max from positions array
		let minX = Infinity, minY = Infinity, minZ = Infinity;
		let maxX = - Infinity, maxY = - Infinity, maxZ = - Infinity;

		for ( let i = 0; i < count; i ++ ) {

			const x = positions[ i * 3 ];
			const y = positions[ i * 3 + 1 ];
			const z = positions[ i * 3 + 2 ];

			if ( x < minX ) minX = x;
			if ( y < minY ) minY = y;
			if ( z < minZ ) minZ = z;
			if ( x > maxX ) maxX = x;
			if ( y > maxY ) maxY = y;
			if ( z > maxZ ) maxZ = z;

		}

		box.set(
			new THREE.Vector3( minX, minY, minZ ),
			new THREE.Vector3( maxX, maxY, maxZ )
		);

	}

	const center = box.getCenter( new THREE.Vector3() );
	const size = box.getSize( new THREE.Vector3() );
	const maxDim = Math.max( size.x, size.y, size.z );

	// Position camera to see the whole model
	const distance = maxDim * 1.5;
	camera.position.copy( center ).add( new THREE.Vector3( 0, maxDim * 0.3, distance ) );
	controls.target.copy( center );
	controls.update();

	// Update grid position
	if ( grid ) {

		grid.position.y = box.min.y - 0.1;

	}

}

function setupGui() {

	// Clean up previous GUI if exists
	if ( gui ) {

		if ( typeof gui.destroy === 'function' ) {

			gui.destroy();

		} else if ( gui.paramList?.parent ) {

			gui.paramList.parent.remove( gui.paramList );

		}

	}

	gui = createExampleGui( 'Gaussian Splats Visualizer' );
	const isMobile = window.innerWidth < 512;
	if ( isMobile ) gui.close();

	// File controls
	const fileFolder = gui.addFolder( 'File' );
	fileFolder.add( params, 'showDropZone' ).name( 'Show Drop Zone' ).onChange( ( value ) => {

		dropZone.style.display = value ? 'flex' : 'none';

	} );
	fileFolder.add( { reload: async () => {

		if ( splats && fileInfo.name !== 'No file loaded' ) {

			// Cannot reload since we don't keep the file reference
			// Show drop zone instead
			dropZone.style.display = 'flex';
			params.showDropZone = true;

		}

	} }, 'reload' ).name( 'Load New File' );

	// 4D playback controls (active once a numbered sequence is loaded)
	const playbackFolder = gui.addFolder( '4D Playback' );
	playbackFolder.add( params, 'playing' ).name( 'Play / Pause' ).onChange( ( value ) => {

		if ( ! sequence ) return;
		if ( value ) sequence.play(); else sequence.pause();

	} );
	frameController = playbackFolder.add( params, 'scrub', 0, 1, 0.001 ).name( 'Timeline' ).onChange( ( value ) => {

		if ( ! sequence || sequence.frameCount <= 1 ) return;
		const targetFrame = Math.round( value * ( sequence.frameCount - 1 ) );
		// Ignore the echo from playback-driven display sync: .listen() re-emits 'change' as the
		// playhead advances the slider, and we must not pause/seek on our own update.
		if ( sequence.playing && Math.abs( targetFrame - sequence.currentFrame ) <= 1 ) return;
		params.playing = false;
		sequence.pause();
		sequence.setFrame( targetFrame );

	} ).listen();
	playbackFolder.add( params, 'frameRate', 1, 60, 1 ).name( 'FPS' ).onChange( ( value ) => {

		if ( sequence ) sequence.frameRate = value;

	} );
	playbackFolder.add( params, 'playbackSpeed', 0, 4, 0.1 ).name( 'Speed' ).onChange( ( value ) => {

		if ( sequence ) sequence.playbackSpeed = value;

	} );
	playbackFolder.add( params, 'loop' ).name( 'Loop' ).onChange( ( value ) => {

		if ( sequence ) sequence.loop = value;

	} );
	playbackFolder.add( params, 'sequenceSH' ).name( 'View-dependent SH' ).onChange( () => {

		// SH degree changes the per-frame attribute layout, so reload the clip with the new setting.
		if ( lastSequenceFiles ) void withAssetLoader( container, [ '4D Gaussian sequence' ], manager => (
			manager.load( '4D Gaussian sequence', () => loadSequenceFromFiles( lastSequenceFiles ) )
		) );

	} );

	// Display controls
	const displayFolder = gui.addFolder( 'Display' );
	displayFolder.add( params, 'displayMode', { Splats: 'splats', Points: 'points', Boxes: 'boxes' } ).name( 'Display Mode' ).onChange( async ( value ) => {

		// Toggle between splats, points, and per-instance boxes
		if ( splats ) splats.visible = value === 'splats';
		if ( splatsPoints ) splatsPoints.visible = value === 'points';

		// Handle per-instance boxes - create if needed
		if ( splatsHelper ) {

			if ( value === 'boxes' && ! splatsHelper._perInstanceBoxes ) {

				// Recreate helper with per-instance boxes enabled
				scene.remove( splatsHelper );
				splatsHelper.dispose();
				splatsHelper = new GaussianSplatsHelper( splats, {
					showBoundingBox: params.showBoundingBox,
					showPerInstanceBoundingBoxes: true,
				} );
				scene.add( splatsHelper );

			}

			if ( splatsHelper._perInstanceBoxes ) {

				splatsHelper._perInstanceBoxes.visible = value === 'boxes';

			}

		}

	} );
	displayFolder.add( params, 'showGrid' ).name( 'Show Grid' ).onChange( ( value ) => {

		if ( grid ) grid.visible = value;

	} );
	displayFolder.add( params, 'showBoundingBox' ).name( 'Show Bounding Box' ).onChange( ( value ) => {

		if ( splatsHelper && splatsHelper._boundingBox ) splatsHelper._boundingBox.visible = value;

	} );
	displayFolder.add( params, 'visualization', visualizationModes ).name( 'Visualization' ).onChange( ( value ) => {

		applyVisualization( value );

	} );
	displayFolder.add( params, 'environmentIntensity', 0.0, 2.0, 0.1 ).name( 'Env Intensity' ).onChange( ( value ) => {

		scene.environmentIntensity = value;

	} );
	displayFolder.add( params, 'redLightIntensity', 0.0, 5.0, 0.1 ).name( 'Red Light' ).onChange( ( value ) => {

		if ( redPointLight ) redPointLight.intensity = value;

	} );
	displayFolder.add( params, 'blueLightIntensity', 0.0, 5.0, 0.1 ).name( 'Blue Light' ).onChange( ( value ) => {

		if ( bluePointLight ) bluePointLight.intensity = value;

	} );

	// Material controls
	const materialFolder = gui.addFolder( 'Material' );
	materialFolder.add( params, 'globalOpacity', 0.0, 1.0, 0.01 ).name( 'Opacity' ).onChange( ( value ) => {

		if ( splats && splats.material ) {

			splats.material.globalOpacity = value;

		}

	} );
	materialFolder.add( params, 'alphaClip', 0.0, 1.0, 0.01 ).name( 'Alpha Clip' ).onChange( ( value ) => {

		if ( splats && splats.material ) {

			splats.material.alphaClip = value;

		}

	} );
	materialFolder.add( params, 'alphaBoost', 0.1, 5.0, 0.1 ).name( 'Alpha Boost' ).onChange( ( value ) => {

		if ( splats && splats.material ) {

			splats.material.alphaBoost = value;

		}

	} );
	materialFolder.add( params, 'minPixelRadius', 0.0, 10.0, 0.1 ).name( 'Min Pixel Radius' ).onChange( ( value ) => {

		if ( splats && splats.material ) {

			splats.material.minPixelRadius = value;

		}

	} );
	materialFolder.add( params, 'maxPixelRadius', 10, 2000, 10 ).name( 'Max Pixel Radius' ).onChange( ( value ) => {

		if ( splats && splats.material ) {

			splats.material.maxPixelRadius = value;

		}

	} );
	materialFolder.add( params, 'sigmaCoverage', 1.5, 3.0, 0.1 ).name( 'Sigma Coverage' ).onChange( ( value ) => {

		if ( splats && splats.material ) {

			splats.material.sigmaCoverage = value;

		}

	} );
	materialFolder.add( params, 'lightingMode', [ 'unlit', 'lit' ] ).name( 'Lighting Mode' ).onChange( ( value ) => {

		if ( splats && splats.material ) {

			splats.material.lightingMode = value;

		}

	} );

	// SH controls
	const shFolder = gui.addFolder( 'Spherical Harmonics' );
	shFolder.add( params, 'shDegree', { 'Degree 0 (DC only)': 0, 'Degree 1': 1, 'Degree 2': 2, 'Degree 3': 3 } ).name( 'SH Degree' ).onChange( ( value ) => {

		if ( splats ) {

			splats.shDegree = value;

		}

	} );
	shFolder.add( params, 'shStrength', 0.0, 3.0, 0.1 ).name( 'SH Strength' ).onChange( ( value ) => {

		if ( splats && splats.material ) {

			splats.material.shStrength = value;

		}

	} );

}

function render() {

	const delta = clock ? clock.getDelta() : 0;

	controls.update();

	// Advance the 4D sequence (if one is loaded) and keep the timeline + active mesh in sync.
	if ( sequence ) {

		sequence.update( delta );
		if ( sequence.activeSplats ) splats = sequence.activeSplats;
		if ( sequence.playing && sequence.frameCount > 1 ) {

			// .listen() mirrors params.scrub onto the Timeline slider each frame.
			params.scrub = sequence.currentFrame / ( sequence.frameCount - 1 );

		}

		// The bounding-box and points overlays snapshot the mesh when created, so for a sequence they
		// freeze on frame 0 — a stale ghost overlaid on the live splats. Refresh any VISIBLE overlay when
		// the active frame changes (cheap for the box; the points read-back only runs when points are shown).
		if ( sequence.currentFrame !== lastVisualFrame ) {

			lastVisualFrame = sequence.currentFrame;
			if ( splatsHelper?.visible && splatsHelper.update ) splatsHelper.update();
			if ( splatsPoints?.visible && splatsPoints.update ) splatsPoints.update();

		}

	}

	// Rotate point lights around center
	const time = performance.now() * 0.001;
	const radius = 3;
	if ( redPointLight ) {

		redPointLight.position.x = Math.cos( time ) * radius;
		redPointLight.position.z = Math.sin( time ) * radius;

	}

	if ( bluePointLight ) {

		bluePointLight.position.x = Math.cos( time + Math.PI ) * radius;
		bluePointLight.position.z = Math.sin( time + Math.PI ) * radius;

	}

	if ( splats ) {

		if ( splats.material && splats.material.updateUniforms ) {

			splats.material.updateUniforms();

		}

	}

	renderer.render( scene, camera );

}

function onResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

}

export function unmount() {

	renderer.setAnimationLoop( null );
	window.removeEventListener( 'resize', onResize );

	// Remove drop zone
	if ( dropZone ) {

		dropZone.remove();
		dropZone = null;

	}

	// Remove file info display
	if ( fileInfoElement ) {

		fileInfoElement.remove();
		fileInfoElement = null;

	}

	// Dispose grid
	if ( grid ) {

		grid.dispose();
		scene.remove( grid );
		grid = null;

	}

	// Dispose point lights
	if ( redPointLight ) {

		scene.remove( redPointLight );
		redPointLight.dispose();
		redPointLight = null;

	}

	if ( bluePointLight ) {

		scene.remove( bluePointLight );
		bluePointLight.dispose();
		bluePointLight = null;

	}

	// Dispose helper
	if ( splatsHelper ) {

		splatsHelper.dispose();
		scene.remove( splatsHelper );
		splatsHelper = null;

	}

	// Dispose points
	if ( splatsPoints ) {

		splatsPoints.dispose();
		scene.remove( splatsPoints );
		splatsPoints = null;

	}

	// Dispose 4D sequence (also disposes its owned active frame mesh)
	if ( sequence ) {

		sequence.dispose();
		scene.remove( sequence );
		sequence = null;

	}

	// Dispose splats
	if ( splats ) {

		splats.dispose();
		scene.remove( splats );
		splats = null;

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

		devtools?.dispose();
		devtools = null;
		renderer.dispose();
		renderer.domElement.remove();
		renderer = null;

	}

	scene = null;
	camera = null;
	container = null;
	clock = null;
	frameController = null;
	environmentUrl = null;

}
