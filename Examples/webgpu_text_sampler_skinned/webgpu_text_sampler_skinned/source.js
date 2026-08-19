import * as THREE from 'three/webgpu';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { clamp, color, dot, float, fwidth, max, min, mix, screenUV, smoothstep, texture, textureSize, uv, vec2 } from 'three/tsl';

import { ComputeMeshSurfaceSampler, fresnel } from 'three-blocks';
import { registerDevtools } from 'three-blocks/devtools';
import { parseMSDFFont } from 'three-blocks/msdf-text';
import { shaderCache } from 'three-blocks/shaders';
import { createExampleCaption } from '../helpers/ExampleCaption.js';
import { createExampleGui } from '../helpers/exampleGui.js';
import { withAssetLoader } from '../helpers/LoadingManager.js';

const HIRAGANA = [
	'あ', 'い', 'う', 'え', 'お',
	'か', 'き', 'く', 'け', 'こ',
	'さ', 'し', 'す', 'せ', 'そ',
	'た', 'ち', 'つ', 'て', 'と',
	'な', 'に', 'ぬ', 'ね', 'の',
	'は', 'ひ', 'ふ', 'へ', 'ほ',
	'ま', 'み', 'む', 'め', 'も',
	'や', 'ゆ', 'よ',
	'ら', 'り', 'る', 'れ', 'ろ',
	'わ', 'を', 'ん'
];
const DIGITS = [ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ];
const SAMPLE_COUNT = 8000;
const DEBUG_FROM_URL = new URLSearchParams( window.location.search ).has( 'debug' );
const reducedMotionQuery = window.matchMedia( '(prefers-reduced-motion: reduce)' );
const uBillboardFix = { value: 0 };
const glyphVertex = new THREE.Vector3();
const glyphXAxis = new THREE.Vector3( 1, 0, 0 );
const glyphZAxis = new THREE.Vector3( 0, 0, 1 );

let container;
let containerStyleSnapshot;
let renderer;
let devtools;
let scene;
let camera;
let controls;
let gui;
let resizeObserver;
let caption;
let characterRoot;
let skinnedMesh;
let sampler;
let parentText;
let ktx2Loader;
let atlasMap;
let msdfFont;
let mixer;
let action;
let clipDuration = 0;
let timer;
let glyphTimer = 0;
let glyphSequenceIndex = 0;
let currentGlyph = HIRAGANA[ 0 ];
let poseVersion = 0;
let sampledPoseVersion = - 1;
let framePending = false;
let mounted = false;
let lifecycleGeneration = 0;
let activeAssets;
let debugMode = DEBUG_FROM_URL;

const animationParams = {
	motion: ! reducedMotionQuery.matches,
	playbackSpeed: 0.42,
	manualScrub: false,
	scrubNormalized: 0.18,
};
const glyphParams = {
	mode: 'hiragana',
	cycle: ! reducedMotionQuery.matches,
};
const presentationParams = {
	separation: 15,
	showSource: true,
};
const engineeringParams = {
	billboarding: false,
};

function requireAsset( assets, key ) {

	const asset = assets?.[ key ];
	if ( asset instanceof URL ) return asset.href;
	if ( typeof asset === 'string' && asset.length > 0 ) return asset;
	throw new Error( `Skin / Script requires assets.${key}.` );

}

export async function mount( containerElement, {
	assets = {},
	cycleGlyphs = ! reducedMotionQuery.matches,
	debug = DEBUG_FROM_URL,
	motion = ! reducedMotionQuery.matches,
} = {} ) {

	if ( renderer || mounted ) unmount();
	container = containerElement;
	const fontRoot = `${requireAsset( assets, 'fonts' ).replace( /\/$/u, '' )}/msdf`;
	activeAssets = {
		characterModel: requireAsset( assets, 'characterModel' ),
		fontJSON: `${fontRoot}/noto-sans-jp.msdf.json`,
		fontAtlas: `${fontRoot}/noto-sans-jp.msdf.ktx2`,
		transcoderPath: `${requireAsset( assets, 'basis' ).replace( /\/$/u, '' )}/`,
	};
	debugMode = Boolean( debug );
	animationParams.motion = Boolean( motion );
	glyphParams.cycle = Boolean( cycleGlyphs );
	if ( WebGPU.isAvailable() === false ) {

		container.appendChild( WebGPU.getErrorMessage() );
		throw new Error( 'No WebGPU support' );

	}

	mounted = true;
	const generation = ++ lifecycleGeneration;
	containerStyleSnapshot = {
		position: container.style.position,
		touchAction: container.style.touchAction,
	};
	container.style.position = 'relative';
	container.style.touchAction = 'none';

	try {

		await init( generation );

	} catch ( error ) {

		if ( generation === lifecycleGeneration ) unmount();
		throw error;

	}
	return {
		reset() {

			resetCamera();
			resetGlyphSequence();

		},
		dispose: unmount,
	};

}

async function init( generation ) {

	const { width, height } = getViewport();
	camera = new THREE.PerspectiveCamera( 43, width / height, 0.1, 250 );
	resetCamera();

	scene = new THREE.Scene();
	const glowDistance = screenUV.sub( vec2( 0.5, 0.46 ) ).mul( vec2( 0.95, 1.15 ) ).length();
	const stageGlow = smoothstep( 0.72, 0.08, glowDistance ).pow( 1.25 );
	const cove = screenUV.y.mix( color( 0x0b0918 ), color( 0x28223c ) );
	const glow = screenUV.x.mix( color( 0x5c4b78 ), color( 0x79485f ) );
	scene.backgroundNode = mix( cove, glow, stageGlow.mul( 0.88 ) );
	scene.fog = new THREE.FogExp2( 0x19152b, 0.008 );

	renderer = new THREE.WebGPURenderer( { antialias: true, trackTimestamp: true } );
	devtools = registerDevtools( { renderer, container } );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, 1.5 ) );
	renderer.setSize( width, height );
	renderer.toneMapping = THREE.AgXToneMapping;
	renderer.toneMappingExposure = 1.1;
	renderer.shadowMap.enabled = true;
	renderer.domElement.setAttribute( 'role', 'img' );
	renderer.domElement.setAttribute( 'aria-label', 'An animated dancer beside a second figure made from eight thousand live hiragana glyphs.' );
	container.appendChild( renderer.domElement );
	await renderer.init();
	if ( ! isCurrentMount( generation ) ) return;
	ktx2Loader = new KTX2Loader().setTranscoderPath( activeAssets.transcoderPath );
	ktx2Loader.detectSupport( renderer );

	controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true;
	controls.enablePan = false;
	controls.minDistance = 24;
	controls.maxDistance = 140;
	controls.target.set( 7.5, 15.5, 0 );
	controls.update();

	createStage();
	createCaption();
	await withAssetLoader( container, [ 'Dancer', 'MSDF atlas' ], manager => Promise.all( [
		manager.load( 'Dancer', onProgress => loadCharacterAndSampler( generation, onProgress ) ),
		manager.load( 'MSDF atlas', onProgress => loadFontAtlas( generation, onProgress ) ),
	] ) );
	if ( ! isCurrentMount( generation ) ) return;
	buildTextBatch();
	if ( ! isCurrentMount( generation ) ) return;

	markPoseDirty();
	await resampleTextOnSurface( generation );
	if ( ! isCurrentMount( generation ) ) return;

	await setupGui( generation );
	if ( ! isCurrentMount( generation ) ) return;

	setCaptionDetail( '8,000 MSDF glyphs · one deforming surface · zero CPU readback' );
	installGlyphCycle();
	if ( typeof ResizeObserver !== 'undefined' ) {

		resizeObserver = new ResizeObserver( onResize );
		resizeObserver.observe( container );

	}
	window.addEventListener( 'resize', onResize );
	onResize();
	timer = new THREE.Timer();
	renderer.setAnimationLoop( render );

}

function isCurrentMount( generation ) {

	return mounted && generation === lifecycleGeneration;

}

function getViewport() {

	return {
		width: Math.max( 1, container?.clientWidth || window.innerWidth ),
		height: Math.max( 1, container?.clientHeight || window.innerHeight ),
	};

}

function resetCamera() {

	if ( ! camera ) return;
	const halfVerticalFov = THREE.MathUtils.degToRad( camera.fov * 0.5 );
	const distanceForDiptych = 25 / ( Math.tan( halfVerticalFov ) * Math.max( camera.aspect, 0.35 ) );
	camera.position.set( 7.5, 19, Math.max( 43, distanceForDiptych ) );
	camera.lookAt( 7.5, 15.5, 0 );
	if ( controls ) {

		controls.target.set( 7.5, 15.5, 0 );
		controls.update();

	}

}

function createStage() {

	const hemisphere = new THREE.HemisphereLight( 0xeeeaff, 0x241b3f, 2.4 );
	scene.add( hemisphere );

	const keyLight = new THREE.DirectionalLight( 0xffd4b2, 4.2 );
	keyLight.position.set( - 18, 34, 24 );
	keyLight.castShadow = true;
	keyLight.shadow.mapSize.set( 1024, 1024 );
	keyLight.shadow.camera.left = - 30;
	keyLight.shadow.camera.right = 30;
	keyLight.shadow.camera.top = 42;
	keyLight.shadow.camera.bottom = - 4;
	scene.add( keyLight );

	const typeLight = new THREE.PointLight( 0xff6f76, 92, 62, 2 );
	typeLight.position.set( 20, 18, 12 );
	scene.add( typeLight );

	const platform = new THREE.Mesh(
		new THREE.CylinderGeometry( 18, 19, 0.72, 64 ),
		new THREE.MeshStandardMaterial( {
			color: 0x24213f,
			metalness: 0.08,
			roughness: 0.7,
		} )
	);
	platform.position.set( 7.5, - 0.5, 0 );
	platform.scale.x = 1.35;
	platform.receiveShadow = true;
	scene.add( platform );

}

function createCaption() {

	caption = createExampleCaption( {
		accent: '#f4ae0c',
		ariaLabel: 'Skin and script details',
		bottom: 'max(70px, 4vw)',
		label: 'Text details',
		content: `
			<span class="tb-example-caption__eyebrow">MSDF · Surface sampling</span>
			<strong class="tb-example-caption__title">Skin / Script</strong>
			<span class="tb-example-caption__note" data-detail></span>
		`,
	} );
	caption.setAttribute( 'aria-live', 'polite' );
	container.appendChild( caption );

}

function setCaptionDetail( text ) {

	const detail = caption?.querySelector( '[data-detail]' );
	if ( detail ) detail.textContent = text;

}

async function loadCharacterAndSampler( generation, onProgress ) {

	const loader = new GLTFLoader();
	const gltf = await loader.loadAsync( activeAssets.characterModel, onProgress );
	if ( ! isCurrentMount( generation ) ) {

		disposeObjectResources( gltf.scene );
		return;

	}

	characterRoot = gltf.scene;
	characterRoot.scale.setScalar( 20 );
	scene.add( characterRoot );
	characterRoot.updateMatrixWorld( true );
	skinnedMesh = findSkinnedMesh( characterRoot );
	if ( ! skinnedMesh?.isSkinnedMesh ) throw new Error( 'Michelle.glb does not contain a skinned mesh.' );

	disposeMaterialResources( skinnedMesh.material );
	skinnedMesh.material = new THREE.MeshPhysicalNodeMaterial( {
		color: 0x302a59,
		metalness: 0.08,
		roughness: 0.42,
		clearcoat: 0.7,
		clearcoatRoughness: 0.38,
	} );
	skinnedMesh.material.emissiveNode = color( 0x4b2b82 ).mul( fresnel( 2.2, 1.15 ).mul( 0.72 ) );
	skinnedMesh.frustumCulled = false;
	skinnedMesh.castShadow = true;

	if ( gltf.animations.length > 0 ) {

		mixer = new THREE.AnimationMixer( characterRoot );
		const clip = gltf.animations.find( candidate => candidate.name === 'SambaDance' ) ?? gltf.animations[ 0 ];
		action = mixer.clipAction( clip );
		clipDuration = clip.duration || 0;
		action.play();
		action.time = clipDuration * animationParams.scrubNormalized;
		action.paused = ! animationParams.motion;
		mixer.update( 0 );

	}

	sampler = new ComputeMeshSurfaceSampler( skinnedMesh, renderer, SAMPLE_COUNT, {
		seed: 17,
		useVertexNormals: true,
	} );
	shaderCache.container( 'skinned-surface/sampler', sampler );

}

async function loadFontAtlas( generation, onProgress ) {

	const [ json, map ] = await Promise.all( [
		fetch( activeAssets.fontJSON ).then( response => {

			if ( ! response.ok ) throw new Error( `Failed to load the MSDF font (${response.status}).` );
			return response.json();

		} ),
		ktx2Loader.loadAsync( activeAssets.fontAtlas, onProgress ),
	] );
	if ( ! isCurrentMount( generation ) ) {

		map.dispose();
		return;

	}
	msdfFont = parseMSDFFont( json );
	atlasMap = map;

}

function buildTextBatch() {

	const material = new THREE.MeshPhysicalNodeMaterial( {
		color: 0xff8f73,
		metalness: 0.02,
		roughness: 0.4,
		side: THREE.DoubleSide,
		transparent: true,
		depthWrite: false,
	} );
	const atlas = texture( atlasMap );
	const glyphUV = uv();
	const sample = atlas.sample( glyphUV );
	const signedDistance = max( min( sample.r, sample.g ), min( max( sample.r, sample.g ), sample.b ) );
	const unitRange = vec2( float( msdfFont.distanceRange ) ).div( vec2( textureSize( atlas ) ) );
	const screenTexelSize = vec2( 1 ).div( fwidth( glyphUV ) );
	const screenPxRange = max( dot( unitRange, screenTexelSize ).mul( 0.5 ), float( 1 ) );
	material.opacityNode = clamp( signedDistance.sub( 0.5 ).mul( screenPxRange ).add( 0.5 ), 0, 1 );
	material.emissiveNode = color( 0x6b2038 ).mul( 0.2 );
	material.alphaTest = 0.001;
	material.forceSinglePass = true;

	atlasMap.colorSpace = THREE.NoColorSpace;
	atlasMap.generateMipmaps = false;
	atlasMap.minFilter = THREE.LinearFilter;
	atlasMap.magFilter = THREE.LinearFilter;
	atlasMap.needsUpdate = true;

	const geometry = new THREE.BufferGeometry();
	geometry.setIndex( [ 0, 1, 2, 2, 1, 3 ] );
	geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array( 12 ), 3 ) );
	geometry.setAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( 8 ), 2 ) );

	parentText = new THREE.InstancedMesh( geometry, material, SAMPLE_COUNT );
	parentText.instanceMatrix = sampler.output;
	parentText.position.x = presentationParams.separation;
	parentText.frustumCulled = false;
	updateGlyphGeometry( HIRAGANA[ 0 ] );
	shaderCache.container( 'skinned-surface/text-batch', parentText );
	scene.add( parentText );

}

async function setupGui( generation ) {

	const nextGui = await createExampleGui( 'Skin / Script' );
	if ( ! isCurrentMount( generation ) ) {

		nextGui.destroy();
		return;

	}
	gui = nextGui;
	if ( container.clientWidth < 560 ) gui.close();
	gui.add( animationParams, 'motion' ).name( 'Dance' ).onChange( value => {

		if ( action ) action.paused = ! value;
		markPoseDirty();

	} );
	gui.add( animationParams, 'playbackSpeed', 0.08, 1.25, 0.01 ).name( 'Dance pace' );
	gui.add( glyphParams, 'mode', { Hiragana: 'hiragana', Digits: 'digits' } ).name( 'Script' ).onChange( resetGlyphSequence );
	gui.add( glyphParams, 'cycle' ).name( 'Cycle glyphs' );
	gui.add( presentationParams, 'separation', 0, 22, 0.25 ).name( 'Body / type gap' ).onChange( value => {

		if ( parentText ) parentText.position.x = value;

	} );
	gui.add( presentationParams, 'showSource' ).name( 'Source silhouette' ).onChange( value => {

		if ( skinnedMesh ) skinnedMesh.visible = value;

	} );
	gui.add( { resetCamera }, 'resetCamera' ).name( 'Reset view' );

	if ( debugMode ) {

		const engineering = gui.addFolder( 'Engineering' );
		engineering.add( animationParams, 'manualScrub' ).name( 'Manual pose' ).onChange( () => markPoseDirty() );
		engineering.add( animationParams, 'scrubNormalized', 0, 1, 0.001 ).name( 'Pose time' ).onChange( () => markPoseDirty() );
		engineering.add( engineeringParams, 'billboarding' ).name( 'Billboard glyphs' ).onChange( () => updateGlyphGeometry( currentGlyph ) );
		engineering.add( uBillboardFix, 'value', - Math.PI, Math.PI, 0.01 ).name( 'Billboard rotation' ).onChange( () => updateGlyphGeometry( currentGlyph ) );

	}

}

function installGlyphCycle() {

	clearInterval( glyphTimer );
	glyphTimer = window.setInterval( () => {

		if ( glyphParams.cycle ) updateGlyphSequence();

	}, 700 );

}

function resetGlyphSequence() {

	glyphSequenceIndex = 0;
	updateGlyphSequence();

}

function updateGlyphSequence() {

	if ( ! mounted || ! parentText ) return;
	const sequence = glyphParams.mode === 'digits' ? DIGITS : HIRAGANA;
	const character = sequence[ glyphSequenceIndex % sequence.length ];
	updateGlyphGeometry( character );
	glyphSequenceIndex = ( glyphSequenceIndex + 1 ) % sequence.length;

}

function updateGlyphGeometry( character ) {

	const glyph = msdfFont?.getGlyph( character.codePointAt( 0 ) );
	if ( ! glyph || ! parentText ) return;
	currentGlyph = character;

	const fontSize = 0.38;
	const [ left, bottom, right, top ] = glyph.planeBounds.map( value => value * fontSize );
	const corners = [
		[ left, bottom ],
		[ right, bottom ],
		[ left, top ],
		[ right, top ],
	];
	const positions = parentText.geometry.getAttribute( 'position' );
	for ( let index = 0; index < corners.length; index ++ ) {

		const [ x, y ] = corners[ index ];
		glyphVertex.set( x, y, 0 );
		if ( ! engineeringParams.billboarding ) glyphVertex.applyAxisAngle( glyphXAxis, - Math.PI * 0.5 );
		glyphVertex.applyAxisAngle( glyphZAxis, uBillboardFix.value );
		positions.setXYZ( index, glyphVertex.x, glyphVertex.y, glyphVertex.z );

	}
	positions.needsUpdate = true;

	const [ u0, v0, u1, v1 ] = glyph.uvRect;
	const glyphUV = parentText.geometry.getAttribute( 'uv' );
	glyphUV.setXY( 0, u0, v1 );
	glyphUV.setXY( 1, u1, v1 );
	glyphUV.setXY( 2, u0, v0 );
	glyphUV.setXY( 3, u1, v0 );
	glyphUV.needsUpdate = true;

}

function markPoseDirty() {

	poseVersion ++;

}

async function resampleTextOnSurface( generation ) {

	if ( ! sampler || ! parentText || sampledPoseVersion === poseVersion ) return;
	const version = poseVersion;
	characterRoot?.updateMatrixWorld( true );
	await sampler.compute();
	if ( isCurrentMount( generation ) ) sampledPoseVersion = version;

}

async function render() {

	if ( ! mounted || framePending ) return;
	framePending = true;
	const generation = lifecycleGeneration;
	try {

		timer.update();
		const delta = Math.min( 0.05, timer.getDelta() );
		if ( mixer && action ) {

			if ( animationParams.manualScrub ) {

				action.paused = true;
				action.time = animationParams.scrubNormalized * clipDuration;
				mixer.update( 0 );

			} else if ( animationParams.motion ) {

				action.paused = false;
				mixer.update( delta * animationParams.playbackSpeed );
				markPoseDirty();

			} else {

				action.paused = true;

			}

		}

		await resampleTextOnSurface( generation );
		if ( ! isCurrentMount( generation ) ) return;
		controls.update();
		renderer.render( scene, camera );

	} finally {

		framePending = false;

	}

}

function onResize() {

	if ( ! renderer || ! camera || ! container ) return;
	const { width, height } = getViewport();
	renderer.setSize( width, height );
	camera.aspect = width / height;
	camera.updateProjectionMatrix();

}

function findSkinnedMesh( root ) {

	let result = null;
	root.traverse( child => {

		if ( ! result && child.isSkinnedMesh ) result = child;

	} );
	return result;

}

function disposeMaterialResources( materialOrMaterials ) {

	const materials = Array.isArray( materialOrMaterials ) ? materialOrMaterials : [ materialOrMaterials ];
	for ( const material of materials ) {

		if ( ! material ) continue;
		for ( const value of Object.values( material ) ) {

			if ( value?.isTexture ) value.dispose();

		}
		material.dispose?.();

	}

}

function disposeObjectResources( root ) {

	const geometries = new Set();
	const materials = new Set();
	root?.traverse( object => {

		if ( object.geometry ) geometries.add( object.geometry );
		if ( Array.isArray( object.material ) ) object.material.forEach( material => materials.add( material ) );
		else if ( object.material ) materials.add( object.material );

	} );
	geometries.forEach( geometry => geometry.dispose?.() );
	materials.forEach( material => disposeMaterialResources( material ) );

}

function disposeTextBatch() {

	if ( parentText ) {

		parentText.removeFromParent();
		parentText.geometry.dispose();
		disposeMaterialResources( parentText.material );

	}
	parentText = null;
	atlasMap?.dispose();
	atlasMap = null;
	msdfFont = null;

}

export function unmount() {

	mounted = false;
	lifecycleGeneration ++;
	renderer?.setAnimationLoop( null );
	clearInterval( glyphTimer );
	glyphTimer = 0;
	resizeObserver?.disconnect();
	resizeObserver = null;
	window.removeEventListener( 'resize', onResize );
	framePending = false;
	if ( mixer ) {

		mixer.stopAllAction();
		if ( characterRoot ) mixer.uncacheRoot( characterRoot );

	}
	mixer = null;
	action = null;
	clipDuration = 0;
	disposeTextBatch();
	disposeObjectResources( scene );
	characterRoot = null;
	skinnedMesh = null;
	sampler?.dispose();
	sampler = null;
	ktx2Loader?.dispose();
	ktx2Loader = null;
	gui?.destroy();
	gui = null;
	controls?.dispose();
	controls = null;
	caption?.remove();
	caption = null;
	devtools?.dispose();
	devtools = null;
	if ( renderer ) {

		renderer.dispose();
		renderer.domElement.remove();
		renderer = null;

	}
	if ( container && containerStyleSnapshot ) {

		container.style.position = containerStyleSnapshot.position;
		container.style.touchAction = containerStyleSnapshot.touchAction;

	}
	containerStyleSnapshot = null;
	container = null;
	scene = null;
	camera = null;
	timer?.dispose?.();
	timer = null;
	glyphSequenceIndex = 0;
	currentGlyph = HIRAGANA[ 0 ];
	poseVersion = 0;
	sampledPoseVersion = - 1;
	uBillboardFix.value = 0;
	engineeringParams.billboarding = false;

}
