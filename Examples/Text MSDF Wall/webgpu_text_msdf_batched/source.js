import * as THREE from 'three/webgpu';
import { registerDevtools } from 'three-blocks/devtools';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { createExampleCaption } from '../helpers/ExampleCaption.js';
import { createExampleGui } from '../helpers/exampleGui.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { withAssetLoader } from '../helpers/LoadingManager.js';

import { BatchedMSDFText } from 'three-blocks';
import { parseMSDFFont } from 'three-blocks/msdf-text';
import { shaderCache } from 'three-blocks/shaders';
import { smokeRTT } from 'three-blocks/smoke';
import {
	Fn,
	abs,
	attribute,
	color,
	float,
	max,
	mix,
	mx_noise_vec3,
	pass,
	positionGeometry,
	select,
	sin,
	smoothstep,
	uniform,
	uv,
	varyingProperty,
	vec2,
	vec3,
	vec4,
} from 'three/tsl';

// One bilingual vocabulary, repeated across two screen-space layers and one draw call.
const TERMS = [
	[ 'GLYPH', 'グリフ' ],
	[ 'SIGNAL', 'シグナル' ],
	[ 'RHYTHM', 'リズム' ],
	[ 'KERNING', 'カーニング' ],
	[ 'ATLAS', 'アトラス' ],
	[ 'VECTOR', 'ベクター' ],
	[ 'SHADER', 'シェーダー' ],
	[ 'FORM', 'フォーム' ],
	[ 'MOTION', 'モーション' ],
	[ 'TYPE', 'タイプ' ],
	[ 'BUFFER', 'バッファ' ],
	[ 'PIXEL', 'ピクセル' ],
	[ 'GRID', 'グリッド' ],
	[ 'WEIGHT', 'ウェイト' ],
	[ 'SPACE', 'スペース' ],
	[ 'FRAME', 'フレーム' ],
	[ 'WEBGPU', 'ウェブジーピーユー' ],
	[ 'TSL', 'ティーエスエル' ],
	[ 'BATCH', 'バッチ' ],
	[ 'QUAD', 'クアッド' ],
	[ 'SDF', 'エスディーエフ' ],
	[ 'CRISP', 'クリスプ' ],
	[ 'LAYOUT', 'レイアウト' ],
	[ 'STORAGE', 'ストレージ' ],
	[ 'RENDER', 'レンダー' ],
	[ 'LETTER', 'レター' ],
	[ 'BASELINE', 'ベースライン' ],
	[ 'ANCHOR', 'アンカー' ],
	[ 'INSTANCE', 'インスタンス' ],
	[ 'OFFSET', 'オフセット' ],
	[ 'MEDIAN', 'メディアン' ],
	[ 'FIELD', 'フィールド' ],
	[ 'COMPUTE', 'コンピュート' ],
	[ 'PARTICLE', 'パーティクル' ],
	[ 'VOLUME', 'ボリューム' ],
	[ 'CULLING', 'カリング' ],
	[ 'INDIRECT', 'インダイレクト' ],
	[ 'SPLAT', 'スプラット' ],
	[ 'VIDEO', 'ビデオ' ],
	[ 'TEXTURE', 'テクスチャ' ],
	[ 'MESH', 'メッシュ' ],
	[ 'VERTEX', 'バーテックス' ],
	[ 'RAYMARCH', 'レイマーチ' ],
	[ 'PHYSICS', 'フィジックス' ],
	[ 'OAV', 'オーエーブイ' ],
	[ 'VAV', 'ブイエーブイ' ],
	[ 'BAKED MOTION', 'ベイクドモーション' ],
	[ 'DEVTOOLS', 'デブツールズ' ],
	[ 'PRECOMPILE', 'プリコンパイル' ],
	[ 'WEBCODECS', 'ウェブコーデック' ],
	[ 'MORPH', 'モーフ' ],
	[ 'FLUID', 'フルイド' ],
	[ 'LIGHTING', 'ライティング' ],
	[ 'SURFACE', 'サーフェス' ],
	[ 'CACHE', 'キャッシュ' ],
	[ 'PIPELINE', 'パイプライン' ],
];

const PALETTE = {
	ink: 0x050504,
	blocks: 0xf4ae0c,
	back: 0x765813,
	glow: 0xffedac,
};

const TOTAL_TEXT_COUNT = 640;
const LAYER_TEXT_COUNT = TOTAL_TEXT_COUNT / 2;
const INTRO_DURATION = 3.8;
const wallMotion = {
	time: uniform( 0 ).setName( 'msdfWallTime' ),
	reveal: uniform( 0 ).setName( 'msdfWallReveal' ),
	pulse: uniform( 1 ).setName( 'msdfWallPulse' ),
	amount: uniform( 1 ).setName( 'msdfWallMotionAmount' ),
};

let container;
let renderer;
let devtools;
let shaderRegistration;
let fluidShaderRegistration;
let scene;
let camera;
let renderPipeline;
let scenePass;
let fluid;
let gui;
let ktx2Loader;
let resizeObserver;
let pixelRatioQuery;
let hudElement;
let creditElement;
let styleElement;
let mounted = false;
let reducedMotion = false;
let atlasMap;
let assets;
let animationPaused = false;

let batch;
let members = [];
let lastRetype = 0;
let lastFrameTime = 0;
let animationTime = 0;
let motionTime = 0;
let loopDistance = 0;

const textShaderResources = {
	get batch() { return batch; },
	get atlas() { return atlasMap; },
	get fluid() { return fluid; },
	get scenePass() { return scenePass; },
	motion: wallMotion,
};

const matrix = new THREE.Matrix4();
const fluidPointer = new THREE.Vector2();

const params = {
	speed: 28,
	pulse: 1,
	weight: 0.04,
	motion: true,
	retype: true,
};

function resolveAssets( assetOptions = {} ) {

	const suppliedRoot = assetOptions.fontRoot
		?? ( assetOptions.fonts ? `${String( assetOptions.fonts ).replace( /\/$/u, '' )}/msdf` : null );
	const fontRoot = suppliedRoot ? String( suppliedRoot ).replace( /\/$/u, '' ) : null;
	const transcoderPath = assetOptions.transcoderPath ?? assetOptions.basis;
	const resolved = {
		fontJSON: assetOptions.fontJSON ?? ( fontRoot ? `${fontRoot}/noto-sans-jp.msdf.json` : null ),
		fontAtlas: assetOptions.fontAtlas ?? ( fontRoot ? `${fontRoot}/noto-sans-jp.msdf.ktx2` : null ),
		transcoderPath: transcoderPath ? `${String( transcoderPath ).replace( /\/$/u, '' )}/` : null,
	};
	const missing = Object.entries( resolved ).filter( ( [ , value ] ) => ! value ).map( ( [ key ] ) => key );
	if ( missing.length > 0 ) throw new Error( `Batched MSDF text requires assets: ${missing.join( ', ' )}.` );
	return resolved;

}

function configure( options = {} ) {

	for ( const name of [ 'speed', 'pulse', 'weight' ] ) {

		if ( Number.isFinite( Number( options[ name ] ) ) ) params[ name ] = Number( options[ name ] );

	}
	if ( options.motion !== undefined ) params.motion = Boolean( options.motion );
	if ( options.retype !== undefined ) params.retype = Boolean( options.retype );
	if ( Number.isFinite( Number( options.initialTime ) ) ) {

		animationTime = Math.max( 0, Number( options.initialTime ) );
		motionTime = animationTime;
		loopDistance = animationTime * params.speed;

	}
	if ( batch ) batch.weightBias = params.weight;
	gui?.controllersRecursive?.().forEach( controller => controller.updateDisplay() );

}

function pause() {

	animationPaused = true;
	renderer?.setAnimationLoop( null );

}

function resume() {

	if ( ! renderer || ! mounted ) return;
	animationPaused = false;
	lastFrameTime = 0;
	renderer.setAnimationLoop( render );

}

function reset() {

	animationTime = 0;
	motionTime = 0;
	loopDistance = 0;
	lastRetype = 0;
	lastFrameTime = 0;
	if ( batch ) render();
	return getDiagnostics();

}

function getDiagnostics() {

	return {
		ready: batch !== null,
		paused: animationPaused,
		reducedMotion,
		animationTime,
		loopDistance,
		memberCount: batch?.layoutInfo.memberCount ?? 0,
		glyphCount: batch?.layoutInfo.glyphCount ?? 0,
	};

}

function createController() {

	return {
		pause,
		resume,
		reset,
		configure,
		getDiagnostics,
		dispose: unmount,
	};

}

export async function mount( containerElement, options = {} ) {

	container = containerElement;
	assets = resolveAssets( options.assets );
	mounted = true;
	animationPaused = false;
	reducedMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	configure( options );

	installInterface();

	if ( WebGPU.isAvailable() === false ) {

		container.appendChild( WebGPU.getErrorMessage() );
		throw new Error( 'No WebGPU support' );

	}

	await init();
	return createController();

}

async function init() {

	scene = new THREE.Scene();
	camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );

	renderer = new THREE.WebGPURenderer( { antialias: true, alpha: true } );
	devtools = registerDevtools( { renderer, container } );
	renderer.setClearColor( PALETTE.ink, 0 );
	// Full DPR: text quads are fill-cheap, and MSDF edges antialiased over one render pixel
	// go mushy whenever the browser has to upscale the canvas.
	renderer.setPixelRatio( window.devicePixelRatio || 1 );
	container.appendChild( renderer.domElement );
	await renderer.init();
	shaderRegistration = shaderCache.container( 'kinetic-type/batched-msdf', textShaderResources );

	ktx2Loader = new KTX2Loader().setTranscoderPath( assets.transcoderPath );
	await ktx2Loader.detectSupportAsync( renderer );

	const noto = await withAssetLoader( container, [ 'Bilingual MSDF atlas' ], manager => (
		manager.load( 'Bilingual MSDF atlas', onProgress => loadFontAtlas( 'noto-sans-jp', onProgress ) )
	) );

	if ( ! mounted ) {

		noto.map.dispose();
		return;

	}

	setupScene( noto );
	setupFluidInteraction();
	setupGui();
	installResize();
	resize();

	renderer.setAnimationLoop( render );
	renderer.domElement.style.touchAction = 'none';
	renderer.domElement.addEventListener( 'pointermove', onPointerMove );

}

function setupFluidInteraction() {

	fluid = smokeRTT( fluidPointer, 64, 256, 2 ).setPointerScale( 8 );
	scenePass = pass( scene, camera );
	renderPipeline = new THREE.RenderPipeline( renderer );
	renderPipeline.outputNode = scenePass.getTextureNode().sample(
		uv().sub( fluid.getTextureNode().xy.mul( 0.00003 ) )
	);
	fluidShaderRegistration = shaderCache.pipeline( 'kinetic-type/fluid-output', renderPipeline );

}

function onPointerMove( event ) {

	if ( event.isPrimary === false || reducedMotion ) return;
	const bounds = renderer.domElement.getBoundingClientRect();
	fluidPointer.set(
		( event.clientX - bounds.left ) / Math.max( 1, bounds.width ) * 2 - 1,
		1 - ( event.clientY - bounds.top ) / Math.max( 1, bounds.height ) * 2
	);

}

async function loadFontAtlas( name, onProgress ) {

	const [ json, map ] = await Promise.all( [
		fetch( assets.fontJSON ).then( response => {

			if ( ! response.ok ) throw new Error( `Failed to load ${name}.msdf.json (${response.status})` );
			return response.json();

		} ),
		ktx2Loader.loadAsync( assets.fontAtlas, onProgress ),
	] );

	return { font: parseMSDFFont( json ), map };

}

function setupScene( noto ) {

	atlasMap = noto.map;
	batch = new BatchedMSDFText( {
		font: noto.font,
		map: noto.map,
		screenSpace: true,
		// The wall scrolls continuously — whole-pixel snapping would read as jitter here.
		pixelSnap: false,
		maxTextCount: TOTAL_TEXT_COUNT,
		maxGlyphCount: 12000,
	} );
	batch.weightBias = params.weight;
	batch.renderOrder = 2;
	installWallWaveMaterial();
	scene.add( batch );

	buildWall();

}

function buildWall() {

	for ( const layer of [ 'back', 'front' ] ) {

		const layerOffset = layer === 'front' ? 1 : 0;

		for ( let i = 0; i < LAYER_TEXT_COUNT; i ++ ) {

			const termIndex = ( i * 17 + layerOffset * 11 ) % TERMS.length;
			const japanese = ( i + layerOffset ) % 2 === 1;
			const id = batch.addText( {
				text: TERMS[ termIndex ][ japanese ? 1 : 0 ],
				matrix,
				fontSize: 20,
				letterSpacing: 0.5,
				anchorX: 'center',
				anchorY: 'middle',
				color: layer === 'front' ? PALETTE.blocks : PALETTE.back,
				opacity: layer === 'front' ? 0.48 : 0.12,
			} );

			members.push( {
				id,
				layer,
				index: i,
				termIndex,
				japanese,
			} );

		}

	}

}

function installWallWaveMaterial() {

	const material = batch.material;
	const baseVertex = material.vertexNode;
	const baseColor = material.colorNode;
	const waveAlpha = varyingProperty( 'float', 'vMsdfWallAlpha' );
	const waveGlow = varyingProperty( 'float', 'vMsdfWallGlow' );

	material.vertexNode = Fn( () => {

		const clip = vec4( baseVertex ).toVar();
		const rect = attribute( 'msdfRect', 'vec4' );
		const memberIndex = attribute( 'msdfMember', 'float' ).toVar();
		const glyphCenter = clip.xy.add(
			vec2( 0.5 ).sub( positionGeometry.xy )
				.mul( rect.zw )
				.div( material.viewportUniform )
				.mul( 2 )
		).toVar();
		const radial = glyphCenter.length().div( Math.SQRT2 ).saturate().toVar();
		const frontLayer = memberIndex.greaterThan( LAYER_TEXT_COUNT - 0.5 );
		const layerPhase = select( frontLayer, float( 0 ), float( Math.PI * 0.8 ) ).toVar();
		const layerStrength = select( frontLayer, float( 1 ), float( 0.62 ) ).toVar();
		const layerDirection = select( frontLayer, float( 1 ), float( - 1 ) ).toVar();
		const reveal = wallMotion.reveal.toVar();
		const xNorm = glyphCenter.x.mul( 0.5 ).add( 0.5 ).toVar();
		const edgeFade = smoothstep( 0, 0.15, xNorm )
			.mul( smoothstep( 0, 0.15, xNorm.oneMinus() ) )
			.toVar();
		const waveWarp = mx_noise_vec3(
			vec3(
				glyphCenter.x.mul( 0.85 ).add( layerPhase.mul( 0.17 ) ),
				glyphCenter.y.mul( 0.95 ).sub( layerPhase.mul( 0.11 ) ),
				wallMotion.time.mul( 0.12 ).add( layerPhase )
			),
			0.5,
			3
		).xy.mul( select( frontLayer, float( 0.32 ), float( 0.24 ) ) ).toVar();
		const pulseRadius = glyphCenter
			.length()
			.div( Math.SQRT2 )
			.saturate()
			.toVar();
		const pulseDirection = glyphCenter.div( max( glyphCenter.length(), 0.001 ) ).toVar();
		const revealRadius = reveal.mul( 1.1 ).toVar();
		const revealMask = smoothstep(
			revealRadius.sub( 0.16 ),
			revealRadius.add( 0.16 ),
			pulseRadius
		)
			.oneMinus()
			.mul( smoothstep( 0, 0.12, reveal ) )
			.toVar();

		const pulseBand = smoothstep( 0, 0.12, abs( pulseRadius.sub( revealRadius ) ) )
			.oneMinus()
			.mul( select( frontLayer, float( 1.75 ), float( 1.05 ) ) )
			.mul( smoothstep( 0.68, 1, reveal ).oneMinus() )
			.mul( wallMotion.pulse )
			.mul( wallMotion.amount )
			.toVar();

		const wavePosition = glyphCenter.add( waveWarp ).toVar();
		const diagonalWave = sin(
			wavePosition.x.mul( 4.6 )
				.add( wavePosition.y.mul( 3.2 ) )
				.sub( wallMotion.time.mul( 0.72 ) )
				.add( layerPhase )
		).toVar();
		const radialWave = sin(
			wavePosition.length().mul( 13.5 )
				.sub( wallMotion.time.mul( 0.9 ) )
				.sub( layerPhase.mul( 1.1 ) )
				.add( waveWarp.x.mul( 3 ) )
		).toVar();
		const crossWave = sin(
			wavePosition.x.mul( - 2.6 )
				.add( wavePosition.y.mul( 6.7 ) )
				.add( wallMotion.time.mul( 0.54 ) )
				.add( layerPhase.mul( 1.7 ) )
				.add( waveWarp.y.mul( 3.5 ) )
		).toVar();
		const screenWave = diagonalWave.mul( 0.38 )
			.add( radialWave.mul( 0.34 ) )
			.add( crossWave.mul( 0.28 ) )
			.mul( wallMotion.amount )
			.mul( layerStrength )
			.toVar();
		const screenAngle = screenWave.mul( 0.032 ).toVar();
		const screenScale = abs( screenWave ).mul( 0.035 )
			.add( pulseBand.mul( 0.045 ) )
			.add( 1 )
			.toVar();
		const local = clip.xy.sub( glyphCenter ).mul( screenScale ).toVar();
		const rotated = vec2(
			local.x.mul( screenAngle.cos() ).sub( local.y.mul( screenAngle.sin() ) ),
			local.x.mul( screenAngle.sin() ).add( local.y.mul( screenAngle.cos() ) )
		).toVar();
		const screenFlow = vec2(
			diagonalWave.add( radialWave ).mul( 0.006 ),
			crossWave.sub( radialWave ).mul( 0.008 )
		)
			.mul( wallMotion.amount )
			.mul( layerStrength )
			.mul( layerDirection )
			.toVar();
		const lightWaves = smoothstep( 0.48, 0.84, diagonalWave.mul( 0.5 ).add( 0.5 ) ).mul( 0.78 )
			.add( smoothstep( 0.52, 0.88, radialWave.mul( 0.5 ).add( 0.5 ) ).mul( 0.68 ) )
			.add( smoothstep( 0.56, 0.9, crossWave.mul( 0.5 ).add( 0.5 ) ).mul( 0.58 ) )
			.mul( wallMotion.amount )
			.mul( layerStrength )
			.toVar();
		const lightLift = pulseBand.mul( 0.95 )
			.add( lightWaves.mul( select( frontLayer, float( 1.15 ), float( 1.85 ) ) ) )
			.add( 1 )
			.toVar();
		const pulseFlow = pulseDirection
			.mul( pulseBand )
			.mul( select( frontLayer, float( 0.026 ), float( 0.015 ) ) )
			.toVar();
		const deformed = glyphCenter
			.add( rotated )
			.add( pulseFlow )
			.add( screenFlow )
			.add( waveWarp.mul( 0.006 ).mul( wallMotion.amount ).mul( layerStrength ) )
			.toVar();

		waveAlpha.assign( edgeFade.mul( revealMask ).mul( lightLift ) );
		waveGlow.assign(
			pulseBand
				.add( lightWaves.mul( 1.35 ) )
				.saturate()
		);

		return vec4( deformed, clip.z, clip.w );

	} )();
	material.colorNode = Fn( () => {

		const base = vec4( baseColor ).toVar();
		return vec4(
			mix( base.rgb, color( PALETTE.glow ), waveGlow ),
			base.a.mul( waveAlpha ).saturate()
		);

	} )();
	material.needsUpdate = true;

}

function random01( index, salt ) {

	const value = Math.sin( ( index + 1 ) * 12.9898 + salt * 78.233 ) * 43758.5453;
	return value - Math.floor( value );

}

function layoutWall( width, height ) {

	const frontFontSize = THREE.MathUtils.clamp( height / 60, 8, 15 );
	const configurations = {
		front: createLayerLayout( width, height, frontFontSize, 1.34, 8.6 ),
		back: createLayerLayout( width, height, frontFontSize * 0.72, 1.42, 9.4 ),
	};

	batch.setViewport( width, height );
	batch.setScreenOffset( 0, height );

	for ( const member of members ) {

		const layout = configurations[ member.layer ];
		const lane = member.index % layout.lanes;
		const column = Math.floor( member.index / layout.lanes );
		const laneMembers = Math.ceil( ( LAYER_TEXT_COUNT - lane ) / layout.lanes );
		const layerOffset = member.layer === 'front' ? 1 : 0;
		const positionIndex = column * 131 + lane * 17;
		const wrapGutter = layout.fontSize * 6;
		const laneCellWidth = Math.max(
			layout.cellWidth,
			( width + wrapGutter * 2 ) / laneMembers,
		);
		const xNoise = ( random01( positionIndex, layerOffset + 11 ) - 0.5 ) * laneCellWidth * 0.3;
		const yNoise = ( random01( positionIndex, layerOffset + 17 ) - 0.5 ) * layout.rowHeight * 0.28;

		member.wrapStart = - wrapGutter;
		member.span = laneMembers * laneCellWidth;
		member.velocity = ( member.layer === 'front' ? 1 : 0.58 )
			* ( 0.68 + random01( lane, layerOffset + 1 ) * 0.64 );
		member.x = member.wrapStart
			+ ( column + 0.5 + ( member.layer === 'back' ? 0.5 : 0 ) ) * laneCellWidth
			+ xNoise;
		member.y = THREE.MathUtils.euclideanModulo(
			( lane + 0.5 + ( member.layer === 'back' ? 0.5 : 0 ) ) * layout.rowHeight + yNoise,
			height,
		);

		batch.setLayoutAt( member.id, {
			fontSize: layout.fontSize,
			letterSpacing: layout.fontSize * 0.035,
		} );

	}

	batch.update();

}

function createLayerLayout( width, height, fontSize, rowRatio, cellRatio ) {

	const lanes = Math.max( 1, Math.floor( height / ( fontSize * rowRatio ) ) );
	const columns = Math.ceil( LAYER_TEXT_COUNT / lanes );
	return {
		fontSize,
		lanes,
		rowHeight: height / lanes,
		cellWidth: Math.max( fontSize * cellRatio, width / columns ),
	};

}

function makeMatrix( target, x, y ) {

	target.identity();
	target.setPosition( x, y, 0 );
	return target;

}

function setupGui() {

	gui = createExampleGui( 'Text MSDF Wall' );
	gui.add( params, 'speed', 0, 64, 1 ).name( 'Scroll Speed' );
	gui.add( params, 'pulse', 0, 1.5, 0.01 ).name( 'Reveal Pulse' );
	gui.add( params, 'weight', - 0.04, 0.1, 0.001 )
		.name( 'Type Weight' )
		.onChange( () => {

			if ( batch ) batch.weightBias = params.weight;

		} );
	gui.add( params, 'motion' ).name( 'Motion' );
	gui.add( params, 'retype' ).name( 'Live Retype' );
	gui.close();

}

function render( now = performance.now() ) {

	const time = now * 0.001;
	const delta = lastFrameTime === 0 ? 0 : Math.min( time - lastFrameTime, 0.05 );
	const active = params.motion && ! reducedMotion;
	lastFrameTime = time;
	animationTime += delta;

	if ( active ) {

		motionTime += delta;
		loopDistance += delta * params.speed;

	}

	updateWall();

	if (
		params.retype
		&& active
		&& animationTime - Math.max( lastRetype, INTRO_DURATION ) > 1.4
	) {

		lastRetype = animationTime;
		const member = members[ Math.floor( motionTime * 29.3 ) % members.length ];
		member.termIndex = ( member.termIndex + 13 ) % TERMS.length;
		batch.setTextAt( member.id, TERMS[ member.termIndex ][ member.japanese ? 1 : 0 ] );

	}

	renderPipeline.render();

}

function updateWall() {

	const revealT = reducedMotion ? 1 : THREE.MathUtils.clamp( animationTime / INTRO_DURATION, 0, 1 );
	wallMotion.time.value = motionTime;
	wallMotion.reveal.value = THREE.MathUtils.smootherstep( revealT, 0, 1 );
	wallMotion.pulse.value = params.pulse;
	wallMotion.amount.value = reducedMotion || ! params.motion ? 0 : 1;

	for ( const member of members ) {

		const x = member.wrapStart + THREE.MathUtils.euclideanModulo(
			member.x - member.wrapStart + loopDistance * member.velocity,
			member.span,
		);
		batch.setMatrixAt( member.id, makeMatrix( matrix, x, member.y ) );

	}

}

function installResize() {

	resizeObserver = new ResizeObserver( resize );
	resizeObserver.observe( container );
	watchPixelRatio();

}

// Dragging the window to a screen with a different DPR fires no resize (the CSS size is
// unchanged), so watch the resolution media query — re-armed per DPR, as the query string
// embeds the value it watches.
function watchPixelRatio() {

	pixelRatioQuery?.removeEventListener?.( 'change', onPixelRatioChange );
	pixelRatioQuery = window.matchMedia( `(resolution: ${window.devicePixelRatio || 1}dppx)` );
	pixelRatioQuery.addEventListener?.( 'change', onPixelRatioChange );

}

function onPixelRatioChange() {

	resize();
	watchPixelRatio();

}

function getContainerSize() {

	const rect = container.getBoundingClientRect();
	return {
		width: Math.max( 1, Math.floor( rect.width ) ),
		height: Math.max( 1, Math.floor( rect.height ) ),
	};

}

function resize() {

	if ( ! renderer || ! batch ) return;

	const { width, height } = getContainerSize();
	renderer.setPixelRatio( window.devicePixelRatio || 1 );
	renderer.setSize( width, height );
	layoutWall( width, height );
	hudElement?.classList.toggle( 'is-portrait', width / height < 0.78 );

}

function installInterface() {

	container.classList.add( 'msdf-batched-scene' );

	styleElement = document.createElement( 'style' );
	styleElement.textContent = `
		.msdf-batched-scene {
			position: relative;
			overflow: hidden;
			isolation: isolate;
			background: #050504;
		}
		.msdf-batched-scene > canvas {
			position: absolute;
			inset: 0;
			display: block;
			filter: drop-shadow(0 0 9px rgba(244, 174, 12, 0.16));
		}
		.msdf-batched-hud {
			position: absolute;
			inset: 0;
			z-index: 20;
			pointer-events: none;
			color: #f4ae0c;
			font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
			font-size: 10px;
			letter-spacing: 0.14em;
			text-transform: uppercase;
		}
		.msdf-batched-hud::before {
			position: absolute;
			inset: 0;
			background: radial-gradient(circle at 50% 50%, rgba(244, 174, 12, 0.055), transparent 42%);
			box-shadow: inset 0 0 150px rgba(0, 0, 0, 0.78);
			content: '';
		}
		.msdf-batched-label {
			position: absolute;
			top: 25px;
			left: 27px;
			display: grid;
			gap: 6px;
			padding-left: 11px;
			border-left: 2px solid #f4ae0c;
		}
		.msdf-batched-label span:last-child {
			color: rgba(255, 237, 172, 0.42);
			font-size: 9px;
		}
		.msdf-batched-hud.is-portrait .msdf-batched-label {
			top: 18px;
			left: 18px;
		}
		@media (prefers-reduced-motion: reduce) {
			.msdf-batched-scene > canvas { filter: none; }
		}
	`;
	container.appendChild( styleElement );

	hudElement = document.createElement( 'div' );
	hudElement.className = 'msdf-batched-hud';
	hudElement.setAttribute( 'aria-hidden', 'true' );
	hudElement.innerHTML = `
		<div class="msdf-batched-label"><span>Technical field</span><span>English / Japanese</span></div>
	`;
	container.appendChild( hudElement );

	creditElement = createExampleCaption( {
		accent: '#f4ae0c',
		ariaLabel: 'Installation inspiration and links',
		label: 'Project credits',
		content: `
			<span class="tb-example-caption__eyebrow">Expo 2025 Osaka, Kansai</span>
			<h2 class="tb-example-caption__title">1,800 messages in motion</h2>
			<p class="tb-example-caption__note">This example is inspired by Utsubo’s official work.</p>
			<nav class="tb-example-caption__links" aria-label="Official project links">
			<a href="https://www.youtube.com/watch?v=oHh_iYVLttU" target="_blank" rel="noopener noreferrer">Watch the official film ↗</a>
			<a href="https://www.utsubo.com/?utm_source=threejs-blocks.com&utm_medium=referral&utm_campaign=three-blocks" target="_blank" rel="noopener noreferrer">Visit Utsubo ↗</a>
			</nav>
		`,
	} );
	container.appendChild( creditElement );

}

export function unmount() {

	mounted = false;
	animationPaused = true;
	resizeObserver?.disconnect();
	resizeObserver = null;
	pixelRatioQuery?.removeEventListener?.( 'change', onPixelRatioChange );
	pixelRatioQuery = null;

	if ( renderer ) renderer.setAnimationLoop( null );
	renderer?.domElement?.removeEventListener( 'pointermove', onPointerMove );
	gui?.destroy();
	hudElement?.remove();
	creditElement?.remove();
	styleElement?.remove();

	if ( batch ) {

		scene?.remove( batch );
		batch.dispose();

	}

	atlasMap?.dispose();
	ktx2Loader?.dispose?.();
	fluidShaderRegistration?.dispose();
	shaderRegistration?.dispose();
	fluidShaderRegistration = null;
	shaderRegistration = null;
	devtools?.dispose();
	devtools = null;
	renderPipeline?.dispose();
	scenePass?.dispose?.();
	fluid?.dispose();
	renderer?.dispose();
	renderer?.domElement?.remove();
	container?.classList.remove( 'msdf-batched-scene' );

	container = null;
	renderer = null;
	scene = null;
	camera = null;
	renderPipeline = null;
	scenePass = null;
	fluid = null;
	gui = null;
	ktx2Loader = null;
	hudElement = null;
	creditElement = null;
	styleElement = null;
	atlasMap = null;
	assets = null;
	batch = null;
	members = [];

}
