// Baked Motion timeline — a temporary THE ODYSSEY trailer excerpt in a GT-class
// giant-screen theater. Seconds 1:36-1:51 play at native 2060×1440 24 fps on the gently
// curved 1.43:1 screen, with no crop or upscale, inside a stadium-raked auditorium with
// dual projection ports. A frame-accurate transport controls playback and seeking;
// switch seats with the view button and drag to look around.
//
// Temporary source: https://www.youtube.com/watch?v=sUtBLbDYdB4
// Big Buck Bunny remains the intended long-term footage.

import * as THREE from 'three/webgpu';
import { registerDevtools } from 'three-blocks/devtools';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LoftGeometry } from 'three/addons/geometries/LoftGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Fn, vec2 } from 'three/tsl';
import { BakedMotion, paramToFrame } from 'three-blocks/baked-motion';

import { createBakedMotionHost, observeBakedMotionVisibility } from '../helpers/BakedMotionHost.js';

const REDUCED_MOTION = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
const BASE_PLAYBACK_RATE = 1;
const PLAYBACK_RATES = [ 0.5, 1, 2, 3 ];

// GT-class screen: 30 m wide at the full-size 1.43:1 aspect, gently concave toward the seats.
const SCREEN_WIDTH = 30;
const SCREEN_ASPECT = 1.43;
const SCREEN_HEIGHT = SCREEN_WIDTH / SCREEN_ASPECT;
const SCREEN_CURVE_RADIUS = 45;
const SCREEN_BOTTOM = 2.2;
const CAMERA_FILM_GAUGE = 36;
const CAMERA_FOCAL_LENGTH = 20;
const LOOK_ANGLE_LIMIT = Math.PI / 4;
const LOOK_PIVOT_DISTANCE = 0.01;
const THEATER_ROWS = 16;
const SEATS_PER_ROW = 34;
const ROW_RISE = 0.82;
const ROW_DEPTH = 1.35;
const FIRST_ROW_Z = 9;
const SEAT_SPACING = 0.72;
const VIEW_SEAT_X = ( 12 - ( SEATS_PER_ROW - 1 ) / 2 ) * SEAT_SPACING;
const SEATED_EYE_HEIGHT = 1.18;
const MIDDLE_SEAT_ROW = 10;
const MIDDLE_SEAT_POSITION = [
	VIEW_SEAT_X,
	MIDDLE_SEAT_ROW * ROW_RISE + SEATED_EYE_HEIGHT,
	FIRST_ROW_Z + MIDDLE_SEAT_ROW * ROW_DEPTH - 0.2,
];
const FRONT_ROW_POSITION = [ VIEW_SEAT_X, SEATED_EYE_HEIGHT, FIRST_ROW_Z - 0.2 ];
const FRONT_ROW_TARGET_Y = 8;

let container;
let renderer;
let devtools;
let scene;
let camera;
let controls;
let motion;
let host;
let theater;
let screen;
let attribution;
let viewButton;
let player;
let playerStyle;
let playButton;
let speedButton;
let progress;
let timecode;
let frameReadout;
let resizeObserver;
let stopVisibilityObserver;
let playbackRate = BASE_PLAYBACK_RATE;
let previousTime = performance.now();
let options;
let sampleView = false;
let frontRowView = false;
let seeking = false;
let resumeAfterSeek = false;
let seekGeneration = 0;

export async function mount( element, mountOptions = {} ) {

	container = element;
	options = {
		assets: mountOptions.assets ?? {},
		autoPlay: mountOptions.autoPlay ?? ! REDUCED_MOTION,
		initialTime: mountOptions.initialTime,
		initialView: mountOptions.initialView ?? 'interactive',
		poster: mountOptions.poster ?? null,
		softwareDecoder: mountOptions.softwareDecoder ?? false,
	};
	sampleView = options.initialView === 'sample';
	host = createBakedMotionHost( container, {
		poster: options.poster,
		label: 'Static poster of the Baked Motion giant-screen theater example.',
	} );
	if ( REDUCED_MOTION ) {

		host.static( 'Static view · reduced motion' );
		return createHandle();

	}
	try {

		await mountInteractive();

	} catch ( error ) {

		host.fail( error, motion );
		disposeInteractive();

	}
	return createHandle();

}

// The asset is already the screen's 1.43:1 aspect, so the curved surface samples the full
// frame — plain 0..1 UVs, no crop window.
function createScreenGeometry() {

	const arc = SCREEN_WIDTH / SCREEN_CURVE_RADIUS;
	const columns = 48;
	const positions = [];
	const uvs = [];
	const indices = [];
	for ( let column = 0; column <= columns; column ++ ) {

		const step = column / columns;
		const theta = ( step - 0.5 ) * arc;
		const x = SCREEN_CURVE_RADIUS * Math.sin( theta );
		const z = SCREEN_CURVE_RADIUS * ( 1 - Math.cos( theta ) );
		positions.push( x, SCREEN_HEIGHT / 2, z, x, - SCREEN_HEIGHT / 2, z );
		uvs.push( step, 1, step, 0 );

	}
	for ( let column = 0; column < columns; column ++ ) {

		const a = column * 2;
		indices.push( a, a + 1, a + 2, a + 1, a + 3, a + 2 );

	}
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
	geometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );
	geometry.setIndex( indices );
	geometry.computeVertexNormals();
	return geometry;

}

function createTheaterSeatGeometry() {

	// A softly tapered, upholstered chair silhouette, extruded across the seat width.
	const profile = [
		[ 0.14, - 0.42 ],
		[ 0.37, - 0.42 ],
		[ 0.45, 0.12 ],
		[ 0.43, 0.18 ],
		[ 1.18, 0.36 ],
		[ 1.22, 0.55 ],
		[ 0.24, 0.43 ],
		[ 0.14, 0.2 ],
	];
	const sections = [
		[ - 0.28, 0.92 ],
		[ - 0.24, 1 ],
		[ 0.24, 1 ],
		[ 0.28, 0.92 ],
	].map( ( [ x, scale ] ) => profile.map( ( [ y, z ] ) => (
		new THREE.Vector3( x, 0.65 + ( y - 0.65 ) * scale, z * scale )
	) ) );
	const body = new LoftGeometry( sections, { capStart: true, capEnd: true } );
	const arms = [ - 0.32, 0.32 ].map( x => {

		const arm = new THREE.CapsuleGeometry( 0.07, 0.38, 4, 8 );
		arm.rotateX( Math.PI / 2 );
		arm.translate( x, 0.5, - 0.05 );
		return arm;

	} );
	const pedestal = new THREE.CylinderGeometry( 0.08, 0.1, 0.3, 8 );
	pedestal.translate( 0, 0.15, 0.22 );
	const parts = [ body, ...arms, pedestal ];
	const seat = mergeGeometries( parts );
	parts.forEach( part => part.dispose() );
	return seat;

}

function createTheater() {

	theater = new THREE.Group();
	theater.name = 'GiantScreenTheater';

	const wall = new THREE.MeshStandardNodeMaterial( { color: 0x303038, roughness: 0.95, side: THREE.BackSide } );
	const floor = new THREE.MeshStandardNodeMaterial( { color: 0x292930, roughness: 1 } );
	const room = new THREE.Mesh( new THREE.BoxGeometry( 42, 34, 60 ), wall );
	room.position.set( 0, 15, 24 );
	theater.add( room );

	// Screen surround: the black masking frame and stage riser under the silver screen.
	const masking = new THREE.MeshStandardNodeMaterial( { color: 0x050506, roughness: 1 } );
	const frame = new THREE.Mesh( new THREE.BoxGeometry( SCREEN_WIDTH + 3.2, SCREEN_HEIGHT + 3.2, 0.5 ), masking );
	frame.position.set( 0, SCREEN_BOTTOM + SCREEN_HEIGHT / 2, - 0.6 );
	theater.add( frame );
	const stage = new THREE.Mesh( new THREE.BoxGeometry( 42, SCREEN_BOTTOM, 6 ), floor );
	stage.position.set( 0, SCREEN_BOTTOM / 2, 1.5 );
	theater.add( stage );

	// Stadium rake climbing away from the screen, split by a center aisle.
	const seatGeometry = createTheaterSeatGeometry();
	const seatMaterial = new THREE.MeshStandardNodeMaterial( { color: 0x571622, roughness: 0.85 } );
	const seatCount = THEATER_ROWS * SEATS_PER_ROW;
	const seats = new THREE.InstancedMesh( seatGeometry, seatMaterial, seatCount );
	const pose = new THREE.Matrix4();
	let placed = 0;
	for ( let row = 0; row < THEATER_ROWS; row ++ ) {

		for ( let column = 0; column < SEATS_PER_ROW; column ++ ) {

			const aisle = Math.abs( column - ( SEATS_PER_ROW - 1 ) / 2 );
			if ( aisle < 1.6 ) continue; // center aisle
			const x = ( column - ( SEATS_PER_ROW - 1 ) / 2 ) * SEAT_SPACING;
			const z = FIRST_ROW_Z + row * ROW_DEPTH;
			pose.makeRotationY( Math.atan2( x, z ) );
			pose.setPosition( x, row * ROW_RISE, z );
			seats.setMatrixAt( placed ++, pose );

		}

	}
	seats.count = placed;
	theater.add( seats );

	// Tier steps under the seats, and warm aisle step lights on every row.
	const stepLightMaterial = new THREE.MeshStandardNodeMaterial( { color: 0x120b06 } );
	stepLightMaterial.emissive = new THREE.Color( 0xff8a3c );
	stepLightMaterial.emissiveIntensity = 1.4;
	for ( let row = 0; row < THEATER_ROWS; row ++ ) {

		const tier = new THREE.Mesh( new THREE.BoxGeometry( 26, ROW_RISE, ROW_DEPTH ), floor );
		tier.position.set( 0, row * ROW_RISE - ROW_RISE / 2, FIRST_ROW_Z + row * ROW_DEPTH );
		theater.add( tier );
		for ( const side of [ - 1.35, 1.35 ] ) {

			const step = new THREE.Mesh( new THREE.BoxGeometry( 0.5, 0.05, 0.12 ), stepLightMaterial );
			step.position.set( side, row * ROW_RISE + 0.03, FIRST_ROW_Z + row * ROW_DEPTH - ROW_DEPTH / 2 );
			theater.add( step );

		}

	}

	// Dual GT laser projection ports glowing high on the back wall.
	const portMaterial = new THREE.MeshStandardNodeMaterial( { color: 0x0a0c14 } );
	portMaterial.emissive = new THREE.Color( 0x9fb8ff );
	portMaterial.emissiveIntensity = 2.2;
	for ( const side of [ - 1.4, 1.4 ] ) {

		const port = new THREE.Mesh( new THREE.BoxGeometry( 0.9, 0.55, 0.2 ), portMaterial );
		port.position.set( side, THEATER_ROWS * ROW_RISE + 5.4, FIRST_ROW_Z + THEATER_ROWS * ROW_DEPTH + 6.2 );
		theater.add( port );

	}

	theater.add( new THREE.HemisphereLight( 0x2a2f3f, 0x05050a, 0.32 ) );

	scene.add( theater );

}

function createScreenSpill() {

	const spill = new THREE.ProjectorLight( 0xffffff, 2200, 72, 1.25, 0.82, 2 );
	spill.name = 'ScreenColorSpill';
	spill.position.set( 0, SCREEN_BOTTOM + SCREEN_HEIGHT / 2, 0.8 );
	spill.target.position.set( 0, 3.5, 24 );
	spill.aspect = SCREEN_ASPECT;
	// VideoFrameTexture has no mipmaps, so four broad bilinear taps keep only the
	// film's low-frequency color before the native projector-light path hits the room.
	spill.colorNode = Fn( ( [ projectedUV ] ) => {

		const horizontal = vec2( 0.16, 0 );
		const vertical = vec2( 0, 0.11 );
		return motion.sample( projectedUV.xy.add( horizontal ) ).rgb
			.add( motion.sample( projectedUV.xy.sub( horizontal ) ).rgb )
			.add( motion.sample( projectedUV.xy.add( vertical ) ).rgb )
			.add( motion.sample( projectedUV.xy.sub( vertical ) ).rgb )
			.mul( 0.25 );

	} );
	theater.add( spill, spill.target );

}

async function mountInteractive() {

	playbackRate = BASE_PLAYBACK_RATE;
	frontRowView = false;
	seeking = false;
	resumeAfterSeek = false;
	if ( WebGPU.isAvailable() === false ) {

		throw new Error( 'No WebGPU support' );

	}
	if ( typeof VideoDecoder === 'undefined' ) throw new Error( 'WebCodecs VideoDecoder is required.' );

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x000000 );
	camera = new THREE.PerspectiveCamera( 60, 1, 0.1, 200 );
	camera.filmGauge = CAMERA_FILM_GAUGE;
	camera.position.fromArray( MIDDLE_SEAT_POSITION );

	renderer = new THREE.WebGPURenderer( { antialias: true, trackTimestamp: true } );
	devtools = registerDevtools( { renderer, container } );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, 2 ) );
	container.prepend( renderer.domElement );
	await renderer.init();

	createTheater();

	const manifestUrl = options.assets?.bakedMotion?.timelineManifest ?? options.assets?.timelineManifest;
	if ( typeof manifestUrl !== 'string' || manifestUrl.length === 0 ) {

		throw new Error( 'Baked Motion requires assets.timelineManifest.' );

	}
	motion = new BakedMotion( manifestUrl, {
		renderer,
		loop: true,
		playing: options.autoPlay && ! sampleView && ! REDUCED_MOTION,
		playbackRate: BASE_PLAYBACK_RATE,
		rendition: 'auto',
		maxRenditionWidth: 3840,
		// A 15 s 2K24 trailer clip is exactly what the opt-in is for: this gallery controls
		// its own server, and segment delivery starts playback without downloading the
		// whole film first. The runtime falls back to one verified whole-file request when
		// a server ignores Range.
		delivery: 'segments',
		cpuUpload: options.softwareDecoder,
		hardwareAcceleration: options.softwareDecoder ? 'prefer-software' : 'prefer-hardware',
	} );
	await motion.ready;
	createScreenSpill();
	// Baked Motion consumed as a map: its VideoFrameTexture-backed sample node drives our own
	// screen material — the runtime's internal mesh/material never enter the scene.
	const screenMaterial = new THREE.MeshBasicNodeMaterial();
	screenMaterial.colorNode = motion.node.rgb;
	screen = new THREE.Mesh( createScreenGeometry(), screenMaterial );
	screen.name = 'GiantScreen';
	screen.position.set( 0, SCREEN_BOTTOM + SCREEN_HEIGHT / 2, 0 );
	scene.add( screen );

	controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = false;
	controls.enablePan = false;
	controls.enableZoom = false;
	controls.rotateSpeed = 1.5;

	createPlayer();

	viewButton = document.createElement( 'button' );
	viewButton.type = 'button';
	viewButton.className = 'theater-view-button';
	viewButton.addEventListener( 'click', toggleTheaterView );
	container.appendChild( viewButton );
	setFrontRowView( false );

	attribution = document.createElement( 'aside' );
	attribution.className = 'film-attribution';
	attribution.setAttribute( 'aria-label', 'Film source' );
	attribution.textContent = 'THE ODYSSEY (2026) trailer · 1:36\u20131:51 · native 2060\u00d71440 · 1.43:1 temporary preview';
	container.appendChild( attribution );

	const axis = motion.manifest.axes[ 0 ];
	const duration = axis.max - axis.min;
	if ( sampleView || options.initialTime !== undefined ) {

		motion.setTime( options.initialTime ?? duration * 0.46 );
		await motion.frameReady;

	}
	updatePlayer();

	resizeObserver = new ResizeObserver( resize );
	resizeObserver.observe( container );
	resize();
	previousTime = performance.now();
	renderer.render( scene, camera );
	host.present( motion );
	stopVisibilityObserver = observeBakedMotionVisibility( container, {
		getActiveMotion: () => motion,
		onChange: candidate => {

			host.update( candidate );

		},
		onError: ( error, candidate ) => {

			host.fail( error, candidate );

		},
	} );
	renderer.setAnimationLoop( render );

}

function setFrontRowView( enabled ) {

	frontRowView = enabled;
	const targetY = frontRowView ? FRONT_ROW_TARGET_Y : SCREEN_BOTTOM + SCREEN_HEIGHT / 2;
	camera.position.fromArray( frontRowView ? FRONT_ROW_POSITION : MIDDLE_SEAT_POSITION );
	controls.minAzimuthAngle = - Infinity;
	controls.maxAzimuthAngle = Infinity;
	controls.minPolarAngle = 0;
	controls.maxPolarAngle = Math.PI;
	const lookDirection = new THREE.Vector3( 0, targetY, 0 ).sub( camera.position ).normalize();
	controls.target.copy( camera.position ).addScaledVector( lookDirection, LOOK_PIVOT_DISTANCE );
	controls.update();
	const azimuth = controls.getAzimuthalAngle();
	const polar = controls.getPolarAngle();
	controls.minAzimuthAngle = azimuth - LOOK_ANGLE_LIMIT;
	controls.maxAzimuthAngle = azimuth + LOOK_ANGLE_LIMIT;
	controls.minPolarAngle = Math.max( 0.01, polar - LOOK_ANGLE_LIMIT );
	controls.maxPolarAngle = Math.min( Math.PI - 0.01, polar + LOOK_ANGLE_LIMIT );
	const nextView = frontRowView ? 'middle seats' : 'front row';
	viewButton.textContent = nextView;
	viewButton.setAttribute( 'aria-label', `Switch to ${nextView}` );

}

function toggleTheaterView() {

	setFrontRowView( ! frontRowView );

}

function createPlayer() {

	const frameCount = motion.manifest.frameCount;
	const lastFrame = frameCount - 1;
	const duration = frameCount / motion.manifest.fps;
	container.classList.add( 'utsbv-stage' );
	playerStyle = document.createElement( 'style' );
	playerStyle.textContent = `
		.utsbv-stage { position:relative; overflow:hidden; touch-action:none; background:#08090b; }
		.utsbv-stage canvas { display:block; }
		.baked-player { --player-accent:#ff754f; --player-progress:0%; position:absolute; z-index:6; left:50%; bottom:clamp(14px,2.5vw,28px); width:min(760px,calc(100% - 28px)); box-sizing:border-box; padding:12px 14px 11px; transform:translateX(-50%); border:1px solid rgba(244,239,230,.2); border-radius:4px; color:#f4efe4; background:rgba(8,9,11,.92); box-shadow:0 18px 48px rgba(0,0,0,.42),inset 0 1px rgba(255,255,255,.04); pointer-events:auto; }
		.baked-player::before { content:""; position:absolute; inset:-1px 24px auto; height:2px; background:var(--player-accent); box-shadow:0 0 18px rgba(255,117,79,.42); }
		.baked-player__head,.baked-player__controls { display:flex; align-items:center; gap:12px; }
		.baked-player__head { justify-content:space-between; }
		.baked-player__eyebrow { color:#b8b2a8; font:650 9px/1 ui-sans-serif,system-ui,sans-serif; letter-spacing:.13em; text-transform:uppercase; }
		.baked-player__frame,.baked-player__time { color:#f4efe4; font:700 10px/1 ui-monospace,"SFMono-Regular",Consolas,monospace; font-variant-numeric:tabular-nums; letter-spacing:.04em; text-transform:uppercase; white-space:nowrap; }
		.baked-player__seek { display:block; width:100%; height:20px; margin:7px 0; padding:0; appearance:none; border:0; border-radius:0; outline:0; cursor:pointer; background:linear-gradient(90deg,var(--player-accent) 0 var(--player-progress),transparent var(--player-progress)),repeating-linear-gradient(90deg,transparent 0 7px,rgba(244,239,230,.3) 7px 8px),#30343d; background-position:center; background-repeat:no-repeat; background-size:100% 4px; }
		.baked-player__seek::-webkit-slider-thumb { width:14px; height:14px; appearance:none; border:3px solid #08090b; border-radius:50%; background:#f4efe4; box-shadow:0 0 0 1px var(--player-accent); }
		.baked-player__seek::-moz-range-thumb { width:10px; height:10px; border:3px solid #08090b; border-radius:50%; background:#f4efe4; box-shadow:0 0 0 1px var(--player-accent); }
		.baked-player__seek:focus-visible { outline:2px solid #f4efe4; outline-offset:2px; }
		.baked-player__controls { display:grid; grid-template-columns:auto auto 1fr auto; }
		.baked-player__button { min-width:72px; min-height:44px; padding:0 13px; border:1px solid rgba(244,239,230,.24); border-radius:3px; color:#f4efe4; background:#171a20; font:750 10px/1 ui-sans-serif,system-ui,sans-serif; letter-spacing:.08em; text-transform:uppercase; cursor:pointer; }
		.baked-player__button:hover { color:#08090b; background:#f4efe4; }
		.baked-player__button:focus-visible,.theater-view-button:focus-visible { outline:2px solid #f4efe4; outline-offset:3px; }
		.baked-player__time { min-width:94px; color:#c8c1b6; }
		.baked-player__advantage { justify-self:center; color:#ffb099; font:650 8px/1 ui-monospace,"SFMono-Regular",Consolas,monospace; letter-spacing:.1em; text-align:center; text-transform:uppercase; }
		.theater-view-button { position:absolute; z-index:6; top:clamp(64px,8vh,86px); right:clamp(14px,2.5vw,28px); min-height:44px; padding:0 14px; border:1px solid rgba(244,239,230,.28); border-right:3px solid #ff754f; border-radius:3px; color:#f4efe4; background:rgba(8,9,11,.88); font:750 10px/1 ui-sans-serif,system-ui,sans-serif; letter-spacing:.08em; text-transform:uppercase; cursor:pointer; }
		.film-attribution { position:absolute; z-index:5; left:clamp(14px,2.5vw,28px); top:clamp(64px,8vh,86px); max-width:min(560px,calc(100% - 190px)); padding:9px 12px; border:1px solid rgba(244,239,230,.18); border-left:3px solid #ff754f; border-radius:3px; color:#d2cbc0; background:rgba(8,9,11,.78); font:650 8px/1.5 ui-monospace,"SFMono-Regular",Consolas,monospace; letter-spacing:.05em; text-transform:uppercase; pointer-events:none; }
		@media (max-width:620px) { .baked-player { bottom:10px; width:calc(100% - 20px); padding-inline:11px; } .baked-player__controls { grid-template-columns:auto 1fr auto; } .baked-player__advantage { display:none; } .film-attribution { left:10px; max-width:calc(100% - 168px); } .theater-view-button { right:10px; } }
	`;
	player = document.createElement( 'section' );
	player.className = 'baked-player';
	player.setAttribute( 'aria-label', 'Baked Motion media player' );
	player.innerHTML = `
		<div class="baked-player__head">
			<span class="baked-player__eyebrow">Baked Motion · random-access transport</span>
			<output class="baked-player__frame" data-player-frame>Frame 000 / ${String( lastFrame ).padStart( 3, '0' )}</output>
		</div>
		<input class="baked-player__seek" data-player-progress type="range" min="0" max="${lastFrame}" step="1" value="0" aria-label="Seek authored frame">
		<div class="baked-player__controls">
			<button class="baked-player__button" data-player-play type="button">Pause</button>
			<output class="baked-player__time" data-player-time>00:00 / ${formatTime( duration )}</output>
			<span class="baked-player__advantage">${frameCount} authored frames · direct seek</span>
			<button class="baked-player__button" data-player-speed type="button">1×</button>
		</div>`;
	playButton = player.querySelector( '[data-player-play]' );
	speedButton = player.querySelector( '[data-player-speed]' );
	progress = player.querySelector( '[data-player-progress]' );
	timecode = player.querySelector( '[data-player-time]' );
	frameReadout = player.querySelector( '[data-player-frame]' );
	playButton.addEventListener( 'click', togglePlayback );
	speedButton.addEventListener( 'click', cyclePlaybackRate );
	progress.addEventListener( 'input', seekPlayer );
	progress.addEventListener( 'change', finishSeek );
	progress.addEventListener( 'pointercancel', finishSeek );
	container.append( playerStyle, player );
	updatePlayer();

}

function togglePlayback() {

	if ( seeking ) resumeAfterSeek = ! resumeAfterSeek;
	else if ( motion.playing ) motion.pause();
	else motion.play();
	updatePlayer();

}

function cyclePlaybackRate() {

	const index = PLAYBACK_RATES.indexOf( playbackRate );
	playbackRate = PLAYBACK_RATES[ ( index + 1 ) % PLAYBACK_RATES.length ];
	motion.playbackRate = playbackRate;
	updatePlayer();

}

function seekPlayer() {

	beginSeek();
	seekGeneration ++;
	const lastFrame = motion.manifest.frameCount - 1;
	// Avoid wrapping the loop's exact end stop back to frame zero.
	const targetFrame = Math.min( Number( progress.value ), Math.max( 0, lastFrame - 0.001 ) );
	motion.setTime( targetFrame / motion.manifest.fps );
	updatePlayer();

}

function beginSeek() {

	if ( seeking ) return;
	seeking = true;
	resumeAfterSeek = motion.playing;
	motion.pause();

}

async function finishSeek() {

	if ( ! seeking ) return;
	const generation = seekGeneration;
	try {

		await motion.frameReady;

	} catch ( _ ) {

		if ( generation === seekGeneration && motion ) {

			seeking = false;
			resumeAfterSeek = false;
			updatePlayer();

		}
		return;

	}
	if ( generation !== seekGeneration || ! motion ) return;
	seeking = false;
	if ( resumeAfterSeek ) motion.play();
	resumeAfterSeek = false;
	updatePlayer();

}

function updatePlayer() {

	const sample = paramToFrame( motion.manifest, motion.parameters );
	const frameCount = motion.manifest.frameCount;
	const lastFrame = frameCount - 1;
	const frame = Math.max( 0, Math.min( sample.frame, lastFrame ) );
	const roundedFrame = Math.round( frame );
	const nextRate = PLAYBACK_RATES[ ( PLAYBACK_RATES.indexOf( playbackRate ) + 1 ) % PLAYBACK_RATES.length ];
	progress.value = String( roundedFrame );
	player.style.setProperty( '--player-progress', `${lastFrame > 0 ? frame / lastFrame * 100 : 0}%` );
	progress.setAttribute( 'aria-valuetext', `Frame ${roundedFrame} of ${lastFrame}` );
	frameReadout.textContent = `Frame ${String( roundedFrame ).padStart( 3, '0' )} / ${String( lastFrame ).padStart( 3, '0' )}`;
	timecode.textContent = `${formatTime( frame / motion.manifest.fps )} / ${formatTime( frameCount / motion.manifest.fps )}`;
	const playing = seeking ? resumeAfterSeek : motion.playing;
	player.setAttribute( 'aria-busy', String( seeking || motion.buffering ) );
	playButton.textContent = playing ? 'Pause' : 'Play';
	playButton.setAttribute( 'aria-label', playing ? 'Pause playback' : 'Play playback' );
	speedButton.textContent = `${playbackRate}×`;
	speedButton.setAttribute( 'aria-label', `Playback speed ${playbackRate} times; switch to ${nextRate} times` );

}

function formatTime( seconds ) {

	const whole = Math.max( 0, Math.floor( seconds ) );
	return `${String( Math.floor( whole / 60 ) ).padStart( 2, '0' )}:${String( whole % 60 ).padStart( 2, '0' )}`;

}

function render( now ) {

	const delta = Math.min( ( now - previousTime ) / 1000 || 0, 0.1 );
	previousTime = now;
	if ( motion.state === 'suspended' ) return;
	controls.update( delta );
	if ( ! sampleView ) motion.update( delta );
	updatePlayer();

	renderer.render( scene, camera );
	renderer.resolveTimestampsAsync( THREE.TimestampQuery.RENDER );

}

function resize() {

	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	renderer.setSize( width, height );
	camera.aspect = width / height;
	// Keep a real 20 mm full-frame lens as the viewport changes instead of treating
	// the constructor's vertical FOV as a different lens at every aspect ratio.
	camera.setFocalLength( CAMERA_FOCAL_LENGTH );

}

function disposeInteractive() {

	renderer?.setAnimationLoop( null );
	stopVisibilityObserver?.();
	resizeObserver?.disconnect();
	controls?.dispose();
	controls = null;
	motion?.dispose();
	if ( screen ) {

		scene?.remove( screen );
		screen.geometry.dispose();
		screen.material.dispose();
		screen = null;

	}
	if ( theater ) {

		scene?.remove( theater );
		theater.traverse( object => {

			object.geometry?.dispose?.();
			object.material?.dispose?.();

		} );
		theater = null;

	}
	attribution?.remove();
	attribution = null;
	viewButton?.remove();
	viewButton = null;
	player?.remove();
	playerStyle?.remove();
	container?.classList.remove( 'utsbv-stage' );
	player = null;
	playerStyle = null;
	playButton = null;
	speedButton = null;
	progress = null;
	timecode = null;
	frameReadout = null;
	frontRowView = false;
	seekGeneration ++;
	seeking = false;
	resumeAfterSeek = false;
	devtools?.dispose();
	devtools = null;
	renderer?.dispose();
	renderer?.domElement?.remove();
	motion = null;
	renderer = null;
	stopVisibilityObserver = null;

}

export function unmount() {

	disposeInteractive();
	host?.dispose();
	host = null;
	container = null;
	options = null;

}

function createHandle() {

	return {
		pause() {

			motion?.pause();

		},
		play() {

			motion?.play();

		},
		async seek( time ) {

			motion?.setTime( time );
			await motion?.frameReady;

		},
		reset() {

			playbackRate = BASE_PLAYBACK_RATE;
			if ( motion ) motion.playbackRate = playbackRate;
			motion?.setTime( options?.initialTime ?? 0 );

		},
		getDiagnostics() {

			return {
				motion: motion?.getDiagnostics() ?? null,
				playbackRate,
				time: motion?.parameters?.time ?? null,
			};

		},
		dispose: unmount,
	};

}
