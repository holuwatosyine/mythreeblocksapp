// 4D Gaussian volumetric video — the OFFICIAL SpacetimeGaussians reference capture
// (Neural 3D Video, sear_steak) played through the three-blocks spacetime runtime.
// 108,317 Gaussians, each carrying a cubic motion polynomial, an angular velocity, and a
// temporal opacity window: 50 frames of a real kitchen in an 8.7 MB download — no video
// decoder, no per-frame fetch. The clip is packed at `--precision high`, which measures
// BIT-EXACT temporal reconstruction against the trained checkpoint; end-to-end PSNR through
// this exact runtime matches the full-float render of the same model to 0.02 dB.
//
// The material composites in DISPLAY space (the 3DGS training convention — trainers blend
// stored colors against sRGB images), with the renderer's output transform set to identity;
// linearize-then-blend visibly lifts translucent accumulation above the trained appearance.
//
// Interactions this page teaches: drag to orbit while the capture keeps playing (a viewpoint
// no camera recorded), and hold the drag — time eases to 5% so you circle a nearly frozen
// instant, bullet-time style. Neither is possible with flat video or a rigged, hand-animated
// mesh; both fall out of the capture being a temporal Gaussian field.
//
// Pack an STG-trained PLY (SpacetimeGaussians / splaTV lineage) yourself:
//   bun run splat:video -- point_cloud.ply --stg-duration <seconds> --fps 30 --precision high --out clip/
//
// The standard example GUI is deliberately closed by default so the reconstruction remains
// unobstructed. It exposes semantic playback controls and runtime diagnostics without covering
// the subject.

import * as THREE from 'three/webgpu';
import { registerDevtools } from 'three-blocks/devtools';
import { color, mix, sRGBTransferOETF, screenUV, smoothstep, vec2 } from 'three/tsl';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createExampleCaption } from '../helpers/ExampleCaption.js';
import { withAssetLoader } from '../helpers/LoadingManager.js';
import { frameCameraForAspect } from '../helpers/mobile.js';

import { SplatClip } from 'three-blocks/gaussian-splats';
import { createExampleGui } from '../helpers/exampleGui.js';

const AVAILABLE_CODECS = [ 'stg-hp' ];
const BAKE_HINT = 'bun run splat:video -- point_cloud.ply --stg-duration <seconds> --fps 30 --precision high --out clip/';
const PAGE_QUERY = new URLSearchParams( window.location.search );
const DEBUG_MODE = PAGE_QUERY.has( 'debug' );
const REDUCED_MOTION = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

// Bullet time: holding an orbit drag eases playback toward this fraction of the authored
// rate, so the viewer circles a nearly frozen instant. Rates are per-second exponential
// smoothing constants (higher = snappier).
const BULLET_TIME_SCALE = 0.05;
const BULLET_EASE_IN = 7;
const BULLET_EASE_OUT = 3.2;
const AUTO_ORBIT_RESUME_MS = 4000;

// Idle camera drift: instead of a flat turntable, the camera TRAVELS — dolly toward and away
// from the table, truck across the rig line, a slight crane — while the look-target sways on
// the subject. Motion through the room is what makes the volumetric depth legible: parallax
// between the chef, the counter, and the far wall. Amplitudes are in scene units around the
// seeded pose; frequencies are incommensurate so the figure never visibly repeats. Any drag
// takes over instantly; the drift re-seeds from wherever the viewer leaves the camera.
// Envelope bounded to the CAPTURE RIG side of the room: reconstruction quality lives on the
// training-camera manifold, and past z ≈ +0.3 the camera enters the counter's splats. The
// dolly bias in animate() keeps most of the cycle behind the seed while the sweep stays wide.
const IDLE_DRIFT_POSITION = new THREE.Vector3( 0.75, 0.18, 0.5 ); // truck, crane, dolly
const IDLE_DRIFT_TARGET = new THREE.Vector3( 0.3, 0.1, 0 );
const IDLE_RAMP_SECONDS = 2;

let container;
let containerStyle;
let renderer;
let devtools;
let scene;
let camera;
let controls;
let gui;
let resizeObserver;
let timer;
let timeController;
let captionElement = null;
let clip = null;
let manifest = null;
let manifests = new Map();
let available = [];
let mounted = false;
let viewFramed = false;
let loadGeneration = 0;
let speedScale = 1;
let speedScaleTarget = 1;
let orbitResumeTimeout = null;
let idleActive = false;
let idleTime = 0;
let idleSeedPosition = null;
let idleSeedTarget = null;
let decodeMarginText = '';
let cacheMetricSignature = '';
let options;

const params = {
	playing: ! REDUCED_MOTION,
	time: 0,
	playbackSpeed: 1,
	loop: true,
	// Off by default: the capture should keep PLAYING while the viewer orbits — freezing
	// time on drag read as "the loop stopped". Opt back in from the GUI for the effect.
	bulletTime: false,
	autoOrbit: ! REDUCED_MOTION,
	codec: AVAILABLE_CODECS[ 0 ],
};

const captureInfo = {
	record: 'Loading capture…',
	runtime: 'Waiting for decoder…',
};

function manifestUrl( codec ) {

	return `${options.assetRoot.replace( /\/$/u, '' )}/${codec}/manifest.json`;

}

// The AV1 tier only qualifies when this browser can actually decode it (Safari, for one,
// exposes AV1 solely through hardware — absent silicon, isConfigSupported says no and the
// H.264 tier takes over). The probe mirrors the baked track: Main profile, level 5.x, 8-bit.
async function av1DecodeSupported() {

	if ( typeof VideoDecoder === 'undefined' ) return false;
	try {

		const support = await VideoDecoder.isConfigSupported( {
			codec: 'av01.0.12M.08',
			codedWidth: 2048,
			codedHeight: 2464,
		} );
		return support.supported === true;

	} catch {

		return false;

	}

}

async function probeAssets() {

	const codecs = [];
	for ( const codec of AVAILABLE_CODECS ) {

		try {

			if ( codec === 'av1' && ! ( await av1DecodeSupported() ) ) continue;
			const response = await fetch( manifestUrl( codec ) );
			if ( ! response.ok ) continue;
			const parsed = await response.json();
			if ( parsed.type !== 'utsubo-splat-video' ) continue;
			manifests.set( codec, parsed );
			codecs.push( codec );

		} catch { /* The missing-bake error below includes the command to produce it. */ }

	}
	return codecs;

}

function clipMegabytes( source ) {

	const video = source?.video;
	if ( video ) return ( ( video.geometry.byteLength || 0 ) + ( video.appearance.byteLength || 0 ) ) / 1024 / 1024;
	if ( source?.tracks ) {

		const windows = ( source.tracks.windows || [] ).reduce( ( sum, window ) => sum + ( window.byteLength || 0 ), 0 );
		return ( ( source.static?.byteLength || 0 ) + ( source.tracks.clip?.byteLength || 0 ) + windows ) / 1024 / 1024;

	}
	return 0;

}

function describeClip() {

	if ( ! manifest ) return '';
	const megabytes = clipMegabytes( manifest ).toFixed( 1 );
	if ( manifest.encoding === 'tracks' ) {

		// Analytic spacetime tracks: one static base + per-splat temporal records, every
		// frame evaluated on the GPU — bytes are per SPLAT, not per splat-frame.
		const bytesPerSplat = ( clipMegabytes( manifest ) * 1024 * 1024 ) / manifest.count;
		return `${manifest.count.toLocaleString()} splats (${manifest.dynamicCount.toLocaleString()} temporal) · ` +
			`${manifest.frameCount} frames @ ${manifest.frameRate} fps · ` +
			`${megabytes} MB · ${bytesPerSplat.toFixed( 0 )} B/splat for the WHOLE clip`;

	}
	const video = manifest.video;
	const demo = manifest.demo || {};
	const splatFrames = video.counts.reduce( ( sum, count ) => sum + count, 0 );
	const sourceCount = demo.sourceSplatCount || video.maxSplatCount;
	const retention = Number.isFinite( demo.projectedOpacityRetention )
		? ` · ${( demo.projectedOpacityRetention * 100 ).toFixed( 1 )}% opacity weight`
		: '';
	const totalBytes = clipMegabytes( manifest ) * 1024 * 1024;
	return `${video.maxSplatCount.toLocaleString()} / ${sourceCount.toLocaleString()} splats${retention} · ` +
		`${manifest.frameCount} frames @ ${manifest.frameRate} fps · ` +
		`${megabytes} MB · ` +
		`${( totalBytes / splatFrames ).toFixed( 2 )} B/splat/frame`;

}

function describeRuntime() {

	if ( ! clip ) return '';
	if ( clip.isSplatVideoClip ) {

		const cache = clip.stats.videoCache;
		const cacheText = cache
			? ` · cache ${cache.resident}/${cache.frameCount} · ${( cache.bytes / 1024 / 1024 ).toFixed( 0 )}/${( cache.budgetBytes / 1024 / 1024 ).toFixed( 0 )} MiB · work ${cache.decodeWork}`
			: '';
		return `${clip.framePacing} pacing · geometry inflate ×8 · appearance ${clip.decodePreference}` +
			decodeMarginText + cacheText;

	}
	return 'Native STG tracks · analytic spacetime eval on GPU · no video decoder';

}

function updateCacheMetrics() {

	const cache = clip?.isSplatVideoClip ? clip.stats.videoCache : null;
	if ( ! cache ) return;
	const signature = `${cache.state}:${cache.resident}:${cache.bytes}:${cache.budgetBytes}:${cache.decodeWork}`;
	if ( signature === cacheMetricSignature ) return;
	cacheMetricSignature = signature;
	devtools?.setMetric( 'splat-video-cache-resident', {
		label: `Cache ${cache.state}`,
		value: cache.resident,
		max: cache.frameCount,
		unit: `/${cache.frameCount}`,
		precision: 0,
	} );
	devtools?.setMetric( 'splat-video-cache-bytes', {
		label: 'Cache budget',
		value: cache.bytes / 1024 / 1024,
		max: cache.budgetBytes / 1024 / 1024,
		unit: ' MiB',
		precision: 0,
	} );
	devtools?.setMetric( 'splat-video-decode-work', {
		label: cache.decodeWork === 0 ? 'Decode work ✓' : 'Decode work',
		value: cache.decodeWork,
		max: 1,
		unit: '/frame',
		precision: 0,
	} );
	void refreshCaptureInfo();

}

function onDecodeMargin( event ) {

	const delivery = event.pairDeliveryFps.toFixed( 1 );
	const authored = event.frameRate.toFixed( 1 );
	const margin = event.margin.toFixed( 2 );
	decodeMarginText = ` · lap-1 ${delivery}/${authored} fps · ${margin}×${event.warning ? ' ⚠ low margin' : ''}`;
	devtools?.setMetric( 'splat-video-pair-delivery', {
		label: event.warning ? 'Pair delivery ⚠' : 'Pair delivery',
		value: event.pairDeliveryFps,
		max: event.frameRate,
		unit: ' fps',
		precision: 1,
	} );
	devtools?.setMetric( 'splat-video-decode-margin', {
		label: event.warning ? 'Decode margin ⚠' : 'Decode margin',
		value: event.margin,
		max: 1.1,
		unit: '×',
		precision: 2,
	} );
	void refreshCaptureInfo();

}

function configureCaptureView() {

	if ( viewFramed || ! manifest || ! controls ) return;
	const preferredView = manifest.demo?.preferredView;
	if ( preferredView?.position && preferredView?.target ) {

		camera.fov = preferredView.fov || 23;
		camera.up.fromArray( preferredView.up || [ 0, - 1, 0 ] );
		camera.position.fromArray( preferredView.position );
		controls.target.fromArray( preferredView.target );

	} else {

		const minimum = new THREE.Vector3().fromArray( manifest.bounds.min );
		const maximum = new THREE.Vector3().fromArray( manifest.bounds.max );
		const center = minimum.clone().add( maximum ).multiplyScalar( 0.5 );
		const radius = Math.max( maximum.distanceTo( minimum ) * 0.5, 0.25 );
		camera.fov = 35;
		camera.position.copy( center ).add( new THREE.Vector3( 0, 0, - radius * 2.8 ) );
		controls.target.copy( center );

	}

	frameCameraForAspect( camera, controls.target, true );
	const distance = Math.max( camera.position.distanceTo( controls.target ), 1 );
	camera.near = Math.max( distance / 100, 0.01 );
	camera.far = distance * 20;
	camera.updateProjectionMatrix();
	// Wide leash for room-scale content: dolly from inside the rig line out past the walls.
	controls.minDistance = distance * 0.12;
	controls.maxDistance = distance * 4;
	controls.update();
	viewFramed = true;

	// Seed the idle drift at the framed pose. The ramp inside animate() eases the motion in,
	// which doubles as the entrance — no separate intro lerp to fight the drift or the user.
	idleSeedPosition = camera.position.clone();
	idleSeedTarget = controls.target.clone();
	idleTime = 0;
	idleActive = params.autoOrbit && ! REDUCED_MOTION;

}

function createBackdrop() {

	// Warm kitchen umber deepens toward the floor so the capture's window light reads as the
	// bright side. The renderer's output transform is identity (display compositing), so the
	// gradient is OETF-encoded here — the framebuffer holds finished display bytes.
	const cove = smoothstep( 0.02, 0.98, screenUV.y ).pow( 0.9 );
	const glowDistance = screenUV.sub( vec2( 0.5, 0.46 ) ).mul( vec2( 1.0, 1.18 ) ).length();
	const glow = smoothstep( 0.6, 0.08, glowDistance ).pow( 1.5 );
	scene.backgroundNode = sRGBTransferOETF(
		mix( color( 0x2b2320 ), color( 0x4a3f38 ), cove )
			.add( color( 0xd6c4a8 ).mul( glow ).mul( 0.18 ) )
	);

}

function createCaptionElement() {

	return createExampleCaption( {
		accent: '#64a4ff',
		ariaLabel: '4D Gaussian capture details',
		label: 'Capture details',
		content: `
			<span class="tb-example-caption__eyebrow">4D Gaussian capture</span>
			<span class="tb-example-caption__meta" data-capture-stats></span>
			<span class="tb-example-caption__note" data-capture-hint></span>
		`,
	} );

}

function updateCaption() {

	if ( ! captionElement || ! manifest ) return;
	const demo = manifest.demo || {};
	const splatCount = manifest.video?.maxSplatCount ?? manifest.count ?? 0;
	const stats = captionElement.querySelector( '[data-capture-stats]' );
	stats.textContent =
		`${splatCount.toLocaleString()} splats · ` +
		`${manifest.frameCount} frames @ ${manifest.frameRate} fps · ` +
		`${demo.source || 'multi-view studio capture'}`;
	const hint = captionElement.querySelector( '[data-capture-hint]' );
	hint.textContent = REDUCED_MOTION
		? 'Drag to orbit — every viewpoint is reconstructed, none was filmed'
		: 'Drag to orbit while it plays · hold to bend time · every angle is real';

}

async function refreshCaptureInfo() {

	captureInfo.record = describeClip();
	for ( const controller of gui?.controllers || [] ) controller.updateDisplay();
	const runtime = await describeRuntime();
	if ( ! mounted || ! clip ) return;
	captureInfo.runtime = runtime;
	for ( const controller of gui?.controllers || [] ) controller.updateDisplay();

}

async function buildClip() {

	const generation = ++ loadGeneration;
	const url = manifestUrl( params.codec );
	captureInfo.runtime = `Loading ${params.codec.toUpperCase()} visual tracks…`;

	const loaded = await SplatClip.load( url, {
		autoplay: false,
		framePacing: 'sequential',
		// Training-faithful compositing: blend the stored display-encoded colors (the 3DGS
		// forward-model convention). Pairs with the identity output transform set at mount.
		splats: { compositing: 'display' },
	} );
	if ( ! mounted || generation !== loadGeneration ) return void loaded.dispose();

	manifest = manifests.get( params.codec ) || null;
	clip = loaded;
	clip.addEventListener( 'decodemargin', onDecodeMargin );
	clip.loop = params.loop;
	clip.playbackSpeed = params.playbackSpeed;
	scene.add( clip );
	configureCaptureView();

	if ( Number.isFinite( options.initialFrame ) ) {

		const frame = Math.min( Math.max( Math.floor( options.initialFrame ), 0 ), clip.frameCount - 1 );
		params.playing = false;
		await clip.prepareFrame( frame, { renderer, scene, camera } );
		if ( ! mounted || generation !== loadGeneration ) return;
		params.time = clip.time;

	} else {

		clip.seekSeconds( Math.min( params.time, clip.duration ) );
		if ( params.playing ) clip.play();

	}

	timeController?.max( clip.duration );
	updateCaption();
	void refreshCaptureInfo();

}

async function reloadClip() {

	if ( clip ) {

		params.time = clip.time;
		clip.removeEventListener( 'decodemargin', onDecodeMargin );
		scene.remove( clip );
		clip.dispose();
		clip = null;

	}
	decodeMarginText = '';
	cacheMetricSignature = '';
	devtools?.removeMetric( 'splat-video-pair-delivery' );
	devtools?.removeMetric( 'splat-video-decode-margin' );
	devtools?.removeMetric( 'splat-video-cache-resident' );
	devtools?.removeMetric( 'splat-video-cache-bytes' );
	devtools?.removeMetric( 'splat-video-decode-work' );
	await withAssetLoader( container, [ '4D Gaussian capture' ], manager => (
		manager.load( '4D Gaussian capture', () => buildClip() )
	) );

}

function setupGui() {

	gui = createExampleGui( '4D Gaussian capture', { container, width: 290 } );
	gui.add( params, 'playing' ).name( 'Play' ).onChange( value => {

		if ( ! clip ) return;
		if ( value ) clip.play();
		else clip.pause();

	} );
	timeController = gui.add( params, 'time', 0, 2, 1 / 24 ).name( 'Frame' ).listen().onChange( value => {

		if ( ! clip ) return;
		clip.pause();
		params.playing = false;
		clip.seekSeconds( value );

	} );
	gui.add( params, 'playbackSpeed', 0.1, 2, 0.05 ).name( 'Speed' );
	gui.add( params, 'loop' ).name( 'Loop' ).onChange( value => clip && ( clip.loop = value ) );
	gui.add( params, 'bulletTime' ).name( 'Bullet-time drag' )
		.info( 'Holding an orbit drag eases playback to 5% so you circle a nearly frozen instant.' );
	gui.add( params, 'autoOrbit' ).name( 'Camera drift' ).onChange( value => {

		if ( ! value ) return void ( idleActive = false );
		if ( ! camera || ! controls || REDUCED_MOTION ) return;
		idleSeedPosition = camera.position.clone();
		idleSeedTarget = controls.target.clone();
		idleTime = 0;
		idleActive = true;

	} ).info( 'A slow dolly/truck/crane path through the room — parallax is what makes the volume readable.' );
	if ( available.length > 1 ) gui.add( params, 'codec', available ).name( 'Codec' ).onChange( reloadClip );
	gui.add( captureInfo, 'record' ).name( 'Capture' ).disable();
	gui.add( captureInfo, 'runtime' ).name( 'Runtime' ).disable();
	if ( DEBUG_MODE || options.showControls ) gui.open();
	else gui.close();

}

function onOrbitStart() {

	idleActive = false; // the viewer took the camera — the drift yields immediately
	if ( orbitResumeTimeout !== null ) {

		clearTimeout( orbitResumeTimeout );
		orbitResumeTimeout = null;

	}

}

function onOrbitEnd() {

	if ( orbitResumeTimeout !== null ) clearTimeout( orbitResumeTimeout );
	orbitResumeTimeout = setTimeout( () => {

		orbitResumeTimeout = null;
		if ( ! mounted || ! controls || ! params.autoOrbit || REDUCED_MOTION ) return;
		// Resume the drift from wherever the viewer left the camera, easing back in.
		idleSeedPosition = camera.position.clone();
		idleSeedTarget = controls.target.clone();
		idleTime = 0;
		idleActive = true;

	}, AUTO_ORBIT_RESUME_MS );

}

function onPointerDown() {

	if ( params.bulletTime && params.playing ) speedScaleTarget = BULLET_TIME_SCALE;

}

function onPointerUp() {

	speedScaleTarget = 1;

}

export async function mount( containerElement, mountOptions = {} ) {

	container = containerElement;
	const assetRoot = mountOptions.assetRoot
		?? mountOptions.assets?.gaussianVideo
		?? mountOptions.assets?.media;
	if ( typeof assetRoot !== 'string' || assetRoot.length === 0 ) {

		throw new Error( '4D Gaussian video requires an assetRoot mount option.' );

	}
	options = {
		assetRoot: assetRoot.endsWith( '/splat/usv-video-demo' )
			? assetRoot
			: `${assetRoot.replace( /\/$/u, '' )}/splat/usv-video-demo`,
		autoOrbit: mountOptions.autoOrbit ?? ! REDUCED_MOTION,
		autoPlay: mountOptions.autoPlay ?? ! REDUCED_MOTION,
		initialFrame: mountOptions.initialFrame,
		intro: mountOptions.intro ?? mountOptions.initialFrame === undefined,
		showControls: mountOptions.showControls ?? false,
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
	viewFramed = false;
	params.playing = options.autoPlay && ! REDUCED_MOTION;
	params.autoOrbit = options.autoOrbit && ! REDUCED_MOTION;
	params.time = 0;
	speedScale = 1;
	speedScaleTarget = 1;
	idleActive = false;
	idleTime = 0;
	decodeMarginText = '';
	captureInfo.record = 'Loading capture…';
	captureInfo.runtime = 'Waiting for decoder…';

	if ( WebGPU.isAvailable() === false ) {

		container.appendChild( WebGPU.getErrorMessage() );
		throw new Error( 'No WebGPU support' );

	}

	renderer = new THREE.WebGPURenderer( { antialias: false, trackTimestamp: true } );
	devtools = registerDevtools( { renderer, container } );
	void devtools?.setStatsPanelMode( 'expanded' );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, 2 ) );
	renderer.setSize( Math.max( 1, container.clientWidth ), Math.max( 1, container.clientHeight ) );
	renderer.toneMapping = THREE.NoToneMapping;
	// Identity output transform: the splat material composites display-encoded values (the
	// 3DGS training convention), so the final blit must not re-encode them.
	renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
	container.appendChild( renderer.domElement );

	scene = new THREE.Scene();
	createBackdrop();
	camera = new THREE.PerspectiveCamera( 55, Math.max( container.clientWidth, 1 ) / Math.max( container.clientHeight, 1 ), 0.03, 80 );
	camera.up.set( 0, - 1, 0 );
	camera.position.set( 0.0332449, - 1.3261324, - 0.2554713 );

	controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true;
	controls.dampingFactor = 0.065;
	// Room-scale capture: free movement is the point — orbit, right-drag pan, and a wide
	// dolly range instead of the tight object-scale leash the garment demo used.
	controls.enablePan = true;
	controls.target.set( 0.033, - 1.29, 2.1 );
	controls.update();
	controls.addEventListener( 'start', onOrbitStart );
	controls.addEventListener( 'end', onOrbitEnd );
	renderer.domElement.addEventListener( 'pointerdown', onPointerDown );
	window.addEventListener( 'pointerup', onPointerUp );
	window.addEventListener( 'pointercancel', onPointerUp );

	resizeObserver = new ResizeObserver( onResize );
	resizeObserver.observe( container );
	await renderer.init();

	await withAssetLoader( container, [ 'Capture manifest', '4D Gaussian capture' ], async manager => {

		available = await manager.load( 'Capture manifest', () => probeAssets() );
		if ( ! mounted ) return;
		if ( available.length === 0 ) throw new Error( `No demo capture found under ${options.assetRoot}. ${BAKE_HINT}` );

		params.codec = available.includes( PAGE_QUERY.get( 'codec' ) ) ? PAGE_QUERY.get( 'codec' ) : available[ 0 ];
		setupGui();

		// The animation loop starts before the tracks arrive so the backdrop breathes during the
		// download.
		timer = new THREE.Timer();
		timer.connect( document );
		renderer.setAnimationLoop( animate );

		await manager.load( '4D Gaussian capture', () => buildClip() );

	} );
	if ( ! mounted ) return;

	captionElement = createCaptionElement();
	container.appendChild( captionElement );
	updateCaption();
	return createHandle();

}

function onResize() {

	if ( ! container || ! camera || ! renderer ) return;
	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	renderer.setSize( width, height );

}

function smootherstep( value ) {

	const t = THREE.MathUtils.clamp( value, 0, 1 );
	return t * t * t * ( t * ( t * 6 - 15 ) + 10 );

}

function animate() {

	if ( ! mounted ) return;
	timer.update();
	const delta = Math.min( timer.getDelta(), 0.1 );

	// Bullet time eases in fast (the freeze should answer the gesture) and out slower
	// (time resumes like a held breath releasing).
	const easeRate = speedScaleTarget < speedScale ? BULLET_EASE_IN : BULLET_EASE_OUT;
	speedScale += ( speedScaleTarget - speedScale ) * Math.min( 1, easeRate * delta );

	if ( idleActive && idleSeedPosition && idleSeedTarget ) {

		// Spatial drift: the camera is DRIVEN here, so OrbitControls.update() must not run
		// (it would recompute the position from its own spherical state). Controls resume
		// seamlessly on the next drag — they read the live camera pose at gesture start.
		idleTime += delta;
		const ramp = smootherstep( idleTime / IDLE_RAMP_SECONDS );
		const t = idleTime;
		// Dolly biased BACKWARD from the seed (sin−0.35 spends most of the cycle behind it),
		// so pushing in never crosses into the splats while pulling out reveals the room.
		camera.position.set(
			idleSeedPosition.x + IDLE_DRIFT_POSITION.x * Math.sin( t * 0.42 ) * Math.cos( t * 0.1 ) * ramp,
			idleSeedPosition.y + IDLE_DRIFT_POSITION.y * Math.sin( t * 0.26 + 1.3 ) * ramp,
			idleSeedPosition.z + IDLE_DRIFT_POSITION.z * ( Math.sin( t * 0.16 + 0.5 ) - 0.45 ) * ramp,
		);
		controls.target.set(
			idleSeedTarget.x + IDLE_DRIFT_TARGET.x * Math.sin( t * 0.21 + 0.8 ) * ramp,
			idleSeedTarget.y + IDLE_DRIFT_TARGET.y * Math.sin( t * 0.28 + 2.1 ) * ramp,
			idleSeedTarget.z,
		);
		camera.lookAt( controls.target );

	} else {

		controls.update();

	}
	if ( clip ) {

		clip.playbackSpeed = params.playbackSpeed * speedScale;
		clip.update( delta );
		params.time = clip.time;

	}
	renderer.render( scene, camera );
	updateCacheMetrics();

}

export function unmount() {

	mounted = false;
	loadGeneration ++;
	renderer?.setAnimationLoop( null );
	resizeObserver?.disconnect();
	resizeObserver = null;
	if ( orbitResumeTimeout !== null ) {

		clearTimeout( orbitResumeTimeout );
		orbitResumeTimeout = null;

	}
	window.removeEventListener( 'pointerup', onPointerUp );
	window.removeEventListener( 'pointercancel', onPointerUp );
	renderer?.domElement?.removeEventListener( 'pointerdown', onPointerDown );
	controls?.removeEventListener( 'start', onOrbitStart );
	controls?.removeEventListener( 'end', onOrbitEnd );
	captionElement?.remove();
	captionElement = null;
	if ( clip ) {

		clip.removeEventListener( 'decodemargin', onDecodeMargin );
		scene?.remove( clip );
		clip.dispose();
		clip = null;

	}
	manifest = null;
	manifests = new Map();
	available = [];
	timeController = null;
	controls?.dispose();
	controls = null;
	gui?.destroy();
	gui = null;
	if ( scene ) scene.backgroundNode = null;
	timer?.dispose();
	timer = null;
	devtools?.removeMetric( 'splat-video-pair-delivery' );
	devtools?.removeMetric( 'splat-video-decode-margin' );
	devtools?.removeMetric( 'splat-video-cache-resident' );
	devtools?.removeMetric( 'splat-video-cache-bytes' );
	devtools?.removeMetric( 'splat-video-decode-work' );
	devtools?.dispose();
	devtools = null;
	renderer?.dispose();
	renderer?.domElement?.remove();
	renderer = null;
	scene = null;
	camera = null;
	idleActive = false;
	idleSeedPosition = null;
	idleSeedTarget = null;
	idleTime = 0;
	decodeMarginText = '';
	speedScale = 1;
	speedScaleTarget = 1;
	if ( container && containerStyle ) Object.assign( container.style, containerStyle );
	containerStyle = null;
	container = null;
	options = null;

}

function createHandle() {

	return {
		pause() {

			params.playing = false;
			clip?.pause();

		},
		play() {

			params.playing = true;
			clip?.play();

		},
		async seek( time ) {

			if ( ! clip ) return;
			clip.pause();
			params.playing = false;
			clip.seekSeconds( THREE.MathUtils.clamp( time, 0, clip.duration ) );
			await clip.frameReady;
			params.time = clip.time;

		},
		reset() {

			if ( ! clip ) return;
			clip.seekSeconds( 0 );
			params.time = 0;

		},
		getDiagnostics() {

			return {
				codec: params.codec,
				duration: clip?.duration ?? null,
				frameCount: clip?.frameCount ?? null,
				playing: params.playing,
				time: clip?.time ?? null,
			};

		},
		dispose: unmount,
	};

}
