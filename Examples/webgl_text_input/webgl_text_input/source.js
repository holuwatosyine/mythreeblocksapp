import * as THREE from 'three/webgpu';
import { registerDevtools } from 'three-blocks/devtools';
import {
	Fn,
	getDistanceAttenuation,
	lightPosition,
	lightTargetPosition,
	screenUV,
	smoothstep,
	uniform,
	vec3,
	vec4,
} from 'three/tsl';

import { shaderCache } from 'three-blocks/shaders';
import { defineText } from 'three-blocks/text';
import { createTextSync } from 'three-blocks/text/main';
import { createTextRenderer } from 'three-blocks/text/worker';

const COLORS = {
	void: 0x020405,
	ink: 0x08151c,
	paper: 0xe4f4f9,
	key: 0xdff6ff,
	blue: 0x049ef4,
	cyan: 0x9bdef9,
	slate: 0x8ea3ad,
};

const SPOT_ANGLE = 0.54;
const SPOT_HEIGHT = 360;
const SPOT_INTENSITY = 1800000;
const TEXT_UNLIT_VISIBILITY = 0.1;
const NEGATIVE_Y_AXIS = new THREE.Vector3( 0, - 1, 0 );
const clock = new THREE.Clock();
const pointerWorld = new THREE.Vector3();
const lightWorld = new THREE.Vector3();
const autoWorld = new THREE.Vector3();
const lampWorld = new THREE.Vector3();
const lampAimDirection = new THREE.Vector3();

let container;
let renderer;
let devtools;
let scene;
let camera;
let stageElement;
let chromeElement;
let contentElement;
let styleElement;
let fontPreloadElement;
let progressElement;
let chapterElement;
let syncElement;
let cursorElement;
let backgroundMesh;
let spotLight;
let spotTarget;
let textLightNodes;
let textLightResponseNode;
let textViewportNode;
let fixtureBounceLight;
let lampGroup;
let cableLine;
let wallTexture;
let wallBumpTexture;
let textSync;
let textRenderer;
let resizeObserver;
let reducedMotionQuery;
let pixelRatioQuery;
let viewportWidth = 1;
let viewportHeight = 1;
let scrollProgress = 0;
let pointerActive = false;
let mounted = false;
let reducedMotion = false;
let canvasTextReady = false;
let activeChapter = 0;
let focusBounds = { x: 0, y: 0, width: 1, height: 1 };
let options;
let fontUrl;
let textAssets;

const textShaderRegistrations = [];
const actionDisposers = [];

export async function mount( containerElement, mountOptions = {} ) {

	container = containerElement;
	mounted = true;
	reducedMotionQuery = window.matchMedia( '(prefers-reduced-motion: reduce)' );
	reducedMotion = reducedMotionQuery.matches;
	options = {
		animateText: mountOptions.animateText ?? ! reducedMotion,
		initialPhase: Number.isFinite( mountOptions.initialPhase ) ? mountOptions.initialPhase : 0.35,
		pointerSway: mountOptions.pointerSway ?? ! reducedMotion,
		snapLight: mountOptions.snapLight ?? reducedMotion,
	};
	textAssets = resolveTextAssets( mountOptions.assets ?? {} );
	fontUrl = textAssets.font;
	clock.start();

	installStyles();
	installSite();
	await initRenderer();
	createScene();
	installInteraction();
	resize();
	renderer.setAnimationLoop( render );
	await startTextSynchronization();

	return {
		pause,
		resume,
		setProgress,
		getDiagnostics,
		dispose: unmount,
	};

}

function resolveTextAssets( assets ) {

	const font = assets.font;
	const fontRoot = assets.fontRoot
		?? ( assets.fonts ? `${String( assets.fonts ).replace( /\/$/u, '' )}/msdf` : null );
	const transcoderPath = assets.transcoderPath ?? assets.basis;
	const resolved = {
		font: font ? ( font instanceof URL ? font.href : font ) : null,
		atlas: assets.fontAtlas ?? ( fontRoot ? `${fontRoot}/geist-sans.msdf.ktx2` : null ),
		metrics: assets.fontJSON ?? ( fontRoot ? `${fontRoot}/geist-sans.msdf.json` : null ),
		transcoderPath: transcoderPath ? `${String( transcoderPath ).replace( /\/$/u, '' )}/` : null,
	};
	const missing = Object.entries( resolved )
		.filter( ( [ , value ] ) => ! value )
		.map( ( [ key ] ) => key );
	if ( missing.length > 0 ) throw new Error( `Spotlight MSDF text requires assets: ${missing.join( ', ' )}.` );
	return resolved;

}

function installStyles() {

	styleElement = document.createElement( 'style' );
	styleElement.textContent = `
		/* block, not swap: with the preload below the font is ready before first paint, so the
		   now-visible DOM text appears once, already in its final metrics. */
		@font-face {
			font-family: "Three Geist";
			src: url("${fontUrl}") format("truetype");
			font-weight: 100 900;
			font-style: normal;
			font-display: block;
		}
		/* Metric-compatible stand-ins for the slow-network tail (width ratios measured against
		   Geist 1.600): fallback text occupies the same boxes, so the swap moves no layout. */
		@font-face {
			font-family: "Three Geist Fallback";
			src: local("Arial");
			font-weight: 100 500;
			size-adjust: 99.62%;
			ascent-override: 100.88%;
			descent-override: 29.61%;
			line-gap-override: 0%;
		}
		@font-face {
			font-family: "Three Geist Fallback";
			src: local("Arial Bold"), local("Arial-BoldMT"), local("Arial");
			font-weight: 501 900;
			size-adjust: 102.24%;
			ascent-override: 98.30%;
			descent-override: 28.85%;
			line-gap-override: 0%;
		}
		.spotlight-site {
			--spot-blue: #049ef4;
			--spot-cyan: #9bdef9;
			--spot-paper: #e4f4f9;
			--spot-slate: #8ea3ad;
			--spot-line: rgba(174, 222, 244, 0.17);
			position: relative;
			display: grid;
			isolation: isolate;
			overflow-x: hidden;
			overflow-y: auto;
			overscroll-behavior: contain;
			scrollbar-width: none;
			background: #020405;
			color: var(--spot-paper);
			font-family: "Three Geist", "Three Geist Fallback", "Helvetica Neue", Arial, sans-serif;
			font-synthesis: none;
			-webkit-font-smoothing: antialiased;
		}
		.spotlight-site::-webkit-scrollbar { width: 0; height: 0; }
		.spotlight-site:focus-visible { outline: 1px solid var(--spot-blue); outline-offset: -1px; }
		.spot-stage,
		.spot-chrome {
			position: sticky;
			grid-area: 1 / 1;
			align-self: start;
			inset: 0 auto auto 0;
			width: 100%;
			height: var(--spot-viewport, 100vh);
		}
		.spot-stage {
			z-index: 1;
			pointer-events: none;
		}
		.spot-stage canvas {
			position: absolute;
			inset: 0;
			display: block;
			width: 100%;
			height: 100%;
		}
		.spot-chrome {
			z-index: 5;
			pointer-events: none;
			color: rgba(234, 246, 251, 0.72);
		}
		.spot-header {
			position: absolute;
			left: clamp(20px, 3vw, 46px);
			right: clamp(20px, 3vw, 46px);
			top: clamp(20px, 3vw, 38px);
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 24px;
			font: 620 10px/1 "SFMono-Regular", Consolas, monospace;
			letter-spacing: 0.13em;
			text-transform: uppercase;
		}
		.spot-brand,
		.spot-engine {
			display: flex;
			align-items: center;
			gap: 12px;
		}
		.spot-mark {
			position: relative;
			width: 20px;
			height: 18px;
			border: 1px solid var(--spot-paper);
			clip-path: polygon(50% 0, 100% 100%, 0 100%);
		}
		.spot-mark::after {
			content: "";
			position: absolute;
			inset: 5px 4px 3px;
			border: 1px solid var(--spot-blue);
			clip-path: polygon(50% 0, 100% 100%, 0 100%);
		}
		.spot-engine-dot {
			width: 6px;
			height: 6px;
			border-radius: 50%;
			background: var(--spot-blue);
			box-shadow: 0 0 18px rgba(4, 158, 244, 0.75);
		}
		.spot-rail {
			position: absolute;
			right: clamp(20px, 3vw, 46px);
			top: 50%;
			display: grid;
			justify-items: end;
			gap: 10px;
			transform: translateY(-50%);
			font: 620 9px/1 "SFMono-Regular", Consolas, monospace;
			letter-spacing: 0.12em;
			text-transform: uppercase;
		}
		.spot-rail-track {
			position: relative;
			width: 1px;
			height: 116px;
			margin-right: 4px;
			background: var(--spot-line);
			overflow: hidden;
		}
		.spot-rail-progress {
			position: absolute;
			inset: 0;
			transform: scaleY(0);
			transform-origin: 50% 0;
			background: var(--spot-blue);
			box-shadow: 0 0 12px rgba(4, 158, 244, 0.9);
		}
		.spot-sync {
			color: rgba(130, 147, 157, 0.72);
			font-size: 8px;
		}
		.spot-footer-note {
			position: absolute;
			right: clamp(20px, 3vw, 46px);
			bottom: clamp(18px, 2.5vw, 34px);
			display: flex;
			flex-direction: row-reverse;
			align-items: center;
			gap: 11px;
			font: 620 9px/1 "SFMono-Regular", Consolas, monospace;
			letter-spacing: 0.13em;
			text-transform: uppercase;
			color: rgba(130, 147, 157, 0.82);
		}
		.spot-footer-note::before {
			content: "";
			width: 24px;
			height: 1px;
			background: var(--spot-blue);
			box-shadow: 0 0 10px rgba(4, 158, 244, 0.7);
		}
		.spot-cursor {
			position: absolute;
			left: 0;
			top: 0;
			width: 22px;
			height: 22px;
			border: 1px solid rgba(120, 216, 255, 0.5);
			border-radius: 50%;
			opacity: 0;
			transform: translate3d(-100px, -100px, 0);
			transition: opacity 180ms ease;
		}
		.spot-cursor::before,
		.spot-cursor::after {
			content: "";
			position: absolute;
			left: 50%;
			top: 50%;
			background: rgba(120, 216, 255, 0.75);
			transform: translate(-50%, -50%);
		}
		.spot-cursor::before { width: 5px; height: 1px; }
		.spot-cursor::after { width: 1px; height: 5px; }
		.spotlight-site.is-pointer-active .spot-cursor { opacity: 1; }
		.spot-content {
			position: relative;
			grid-area: 1 / 1;
			z-index: 2;
		}
		.spot-section {
			position: relative;
			min-height: var(--spot-viewport, 100vh);
			display: grid;
			align-items: center;
			padding: clamp(116px, 14vh, 170px) clamp(28px, 9vw, 150px) clamp(104px, 13vh, 150px);
			border-top: 1px solid rgba(174, 222, 244, 0.055);
		}
		.spot-section:first-child { border-top: 0; }
		.spot-copy {
			width: min(820px, 78vw);
		}
		.spot-section--right .spot-copy { margin-left: auto; width: min(720px, 70vw); }
		.spot-section--center .spot-copy { margin-inline: auto; text-align: center; width: min(860px, 82vw); }
		.spot-section::after {
			content: attr(data-section);
			position: absolute;
			left: clamp(28px, 9vw, 150px);
			top: 50%;
			transform: translate(-52px, -50%) rotate(-90deg);
			font: 560 8px/1 "SFMono-Regular", Consolas, monospace;
			letter-spacing: 0.15em;
			color: rgba(130, 147, 157, 0.42);
			text-transform: uppercase;
		}
		.spot-section--right::after { left: auto; right: clamp(28px, 9vw, 150px); transform: translate(52px, -50%) rotate(90deg); }
		.spot-kicker {
			margin: 0 0 clamp(18px, 3vh, 30px);
			font: 650 clamp(9px, 0.8vw, 11px)/1.2 "SFMono-Regular", Consolas, monospace;
			letter-spacing: 0.16em;
			text-transform: uppercase;
			color: var(--spot-blue);
		}
		.spot-title {
			margin: 0;
			font-size: clamp(58px, 9vw, 142px);
			font-weight: 510;
			line-height: 0.86;
			letter-spacing: -0.066em;
			text-wrap: balance;
		}
		.spot-title-line { display: block; width: fit-content; }
		.spot-section--center .spot-title-line { margin-inline: auto; }
		.spot-title-accent { color: var(--spot-cyan); }
		.spot-heading {
			margin: 0;
			font-size: clamp(48px, 7.2vw, 112px);
			font-weight: 500;
			line-height: 0.91;
			letter-spacing: -0.055em;
			text-wrap: balance;
		}
		.spot-heading-line { display: block; width: fit-content; }
		.spot-section--right .spot-heading-line { margin-left: auto; }
		.spot-section--center .spot-heading-line { margin-inline: auto; }
		.spot-body {
			max-width: 590px;
			margin: clamp(26px, 4vh, 44px) 0 0;
			font-size: clamp(16px, 1.45vw, 22px);
			font-weight: 420;
			line-height: 1.55;
			letter-spacing: -0.018em;
			color: #93a9b4;
		}
		.spot-section--right .spot-body { margin-left: auto; }
		.spot-section--center .spot-body { margin-inline: auto; }
		.spot-actions {
			display: flex;
			align-items: center;
			gap: 10px;
			margin-top: clamp(28px, 4vh, 42px);
		}
		.spot-section--center .spot-actions { justify-content: center; }
		.spot-action {
			min-height: 44px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 12px;
			padding: 0 18px;
			border: 1px solid rgba(234, 246, 251, 0.24);
			border-radius: 999px;
			background: #061016;
			color: var(--spot-paper);
			font: 620 10px/1 "SFMono-Regular", Consolas, monospace;
			letter-spacing: 0.1em;
			text-transform: uppercase;
			cursor: pointer;
			transition: border-color 160ms ease, color 160ms ease, background 160ms ease;
		}
		.spot-action:hover { border-color: var(--spot-blue); color: var(--spot-cyan); background: #071722; }
		.spot-action:focus-visible { outline: 2px solid var(--spot-blue); outline-offset: 3px; }
		.spot-action--primary { border-color: var(--spot-blue); background: var(--spot-blue); color: #001018; }
		.spot-action--primary:hover { background: var(--spot-cyan); color: #001018; }
		[data-canvas-text] {
			user-select: text;
		}
		/* DOM text stays readable until the canvas mirror is actually painting it. Hiding it up
		   front leaves the page blank while the atlas loads, and permanently blank if the atlas
		   or webfont never arrives. */
		[data-canvas-text][data-three-blocks-text-state='ready'] {
			-webkit-text-fill-color: rgba(0, 0, 0, 0) !important;
		}
		[data-canvas-text][data-three-blocks-text-state='ready']::selection {
			background: rgba(4, 158, 244, 0.42);
			-webkit-text-fill-color: rgba(0, 0, 0, 0);
		}
		.spot-sr-only {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
			border: 0;
		}
		@media (max-width: 760px) {
			.spot-header { font-size: 8px; }
			.spot-engine { display: none; }
			.spot-rail { right: 16px; }
			.spot-footer-note { right: 20px; font-size: 8px; }
			.spot-section { padding: 110px 30px 100px; }
			.spot-section::after { display: none; }
			.spot-copy,
			.spot-section--right .spot-copy,
			.spot-section--center .spot-copy { width: min(100%, 610px); margin-inline: 0; text-align: left; }
			.spot-section--right .spot-heading-line,
			.spot-section--center .spot-heading-line,
			.spot-section--center .spot-title-line { margin-inline: 0; }
			.spot-section--right .spot-body,
			.spot-section--center .spot-body { margin-left: 0; margin-right: 0; }
			.spot-section--center .spot-actions { justify-content: flex-start; }
			.spot-title { font-size: clamp(54px, 17vw, 92px); }
			.spot-heading { font-size: clamp(46px, 14vw, 78px); }
			.spot-body { max-width: calc(100vw - 74px); font-size: 16px; }
		}
		@media (prefers-reduced-motion: reduce) {
			.spot-cursor,
			.spot-action { transition: none; }
		}
	`;
	document.head.appendChild( styleElement );
	// Start the webfont immediately instead of waiting for the first styled layout: the DOM text
	// is visible until the canvas takes over, so it should appear in its final typeface at once.
	fontPreloadElement = document.createElement( 'link' );
	fontPreloadElement.rel = 'preload';
	fontPreloadElement.as = 'font';
	fontPreloadElement.type = 'font/ttf';
	fontPreloadElement.crossOrigin = 'anonymous';
	fontPreloadElement.href = fontUrl;
	document.head.appendChild( fontPreloadElement );
	container.classList.add( 'spotlight-site' );
	container.tabIndex = 0;
	container.setAttribute( 'aria-label', 'A scrollable Three.js spotlight and canvas text demonstration' );

}

function installSite() {

	stageElement = document.createElement( 'div' );
	stageElement.className = 'spot-stage';
	stageElement.setAttribute( 'aria-hidden', 'true' );

	chromeElement = document.createElement( 'div' );
	chromeElement.className = 'spot-chrome';
	chromeElement.setAttribute( 'aria-hidden', 'true' );
	chromeElement.innerHTML = `
		<header class="spot-header">
			<div class="spot-brand"><span class="spot-mark"></span><span>three.js / light study</span></div>
			<div class="spot-engine"><span class="spot-engine-dot"></span><span>WebGL · pre-generated MSDF</span></div>
		</header>
		<div class="spot-rail">
			<span data-chapter>01 / 04</span>
			<div class="spot-rail-track"><span class="spot-rail-progress"></span></div>
			<span class="spot-sync" data-sync>measuring type</span>
		</div>
		<div class="spot-footer-note">Move the light · scroll to read</div>
		<span class="spot-cursor"></span>
	`;

	contentElement = document.createElement( 'main' );
	contentElement.className = 'spot-content';
	contentElement.innerHTML = `
		<section class="spot-section" id="light" data-section="Light / material">
			<div class="spot-copy">
				<p class="spot-kicker">THREE.JS · THE WEB HAS A NEW MATERIAL</p>
				<h1 class="spot-title" data-light-focus aria-label="The web, under a new light.">
					<span class="spot-title-line" data-canvas-text data-canvas-font="geist">The web,</span>
					<span class="spot-title-line spot-title-accent" data-canvas-text data-canvas-font="geist">under a new</span>
					<span class="spot-title-line" data-canvas-text data-canvas-font="geist">light.</span>
				</h1>
				<p class="spot-body" data-canvas-text data-canvas-font="geist">The browser lays out every line. Three.js turns those same glyphs into a surface that light can find.</p>
				<div class="spot-actions">
					<button class="spot-action spot-action--primary" type="button" data-scroll-to="1">Follow the light <span aria-hidden="true">↓</span></button>
					<button class="spot-action" type="button" data-scroll-to="2">See the sync <span aria-hidden="true">↘</span></button>
				</div>
			</div>
		</section>
		<section class="spot-section spot-section--right" id="scroll" data-section="Scroll / timeline">
			<div class="spot-copy">
				<p class="spot-kicker">01 · THE BROWSER KEEPS THE RHYTHM</p>
				<h2 class="spot-heading" data-light-focus aria-label="Scroll is the timeline.">
					<span class="spot-heading-line" data-canvas-text data-canvas-font="geist">Scroll is</span>
					<span class="spot-heading-line spot-title-accent" data-canvas-text data-canvas-font="geist">the timeline.</span>
				</h2>
				<p class="spot-body" data-canvas-text data-canvas-font="geist">Semantic sections move normally in the DOM. Their measured positions stream into the canvas, keeping type locked to the page at every scroll offset.</p>
			</div>
		</section>
		<section class="spot-section" id="material" data-section="Type / light">
			<div class="spot-copy">
				<p class="spot-kicker">02 · LETTERS ARE GEOMETRY NOW</p>
				<h2 class="spot-heading" data-light-focus aria-label="Type becomes material.">
					<span class="spot-heading-line" data-canvas-text data-canvas-font="geist">Type becomes</span>
					<span class="spot-heading-line spot-title-accent" data-canvas-text data-canvas-font="geist">material.</span>
				</h2>
				<p class="spot-body" data-canvas-text data-canvas-font="geist">A real SpotLight shades pre-generated MSDF text. Penumbra, angle and distance decide which sentence emerges from the dark.</p>
			</div>
		</section>
		<section class="spot-section spot-section--center" id="build" data-section="Three.js / next">
			<div class="spot-copy">
				<p class="spot-kicker">03 · KEEP THE WEB. ADD A DIMENSION.</p>
				<h2 class="spot-heading" data-light-focus aria-label="Build what light can reveal.">
					<span class="spot-heading-line" data-canvas-text data-canvas-font="geist">Build what</span>
					<span class="spot-heading-line spot-title-accent" data-canvas-text data-canvas-font="geist">light can reveal.</span>
				</h2>
				<p class="spot-body" data-canvas-text data-canvas-font="geist">Accessible HTML remains underneath the effect—selectable, responsive and ready for the next Three.js story.</p>
				<div class="spot-actions">
					<button class="spot-action spot-action--primary" type="button" data-scroll-to="0">Return to the light <span aria-hidden="true">↑</span></button>
				</div>
			</div>
		</section>
		<p class="spot-sr-only" role="status" aria-live="polite" data-text-status>Preparing canvas text.</p>
	`;

	container.append( stageElement, contentElement, chromeElement );
	progressElement = chromeElement.querySelector( '.spot-rail-progress' );
	chapterElement = chromeElement.querySelector( '[data-chapter]' );
	syncElement = chromeElement.querySelector( '[data-sync]' );
	cursorElement = chromeElement.querySelector( '.spot-cursor' );

	contentElement.querySelectorAll( '[data-scroll-to]' ).forEach( button => {

		const onClick = () => {

			const index = Number( button.dataset.scrollTo );
			const section = contentElement.querySelectorAll( '.spot-section' )[ index ];
			section?.scrollIntoView( { behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' } );

		};
		button.addEventListener( 'click', onClick );
		actionDisposers.push( () => button.removeEventListener( 'click', onClick ) );

	} );

}

async function initRenderer() {

	scene = new THREE.Scene();
	camera = new THREE.OrthographicCamera( - 0.5, 0.5, 0.5, - 0.5, 0.1, 2000 );
	camera.position.set( 0, 0, 1000 );

	renderer = new THREE.WebGPURenderer( {
		antialias: true,
		alpha: false,
	} );
	devtools = registerDevtools( { renderer, container } );
	renderer.setClearColor( COLORS.void, 1 );
	// Full DPR: canvas text sits next to real DOM text, so any browser upscale is visible.
	renderer.setPixelRatio( window.devicePixelRatio || 1 );
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.12;
	stageElement.appendChild( renderer.domElement );
	await renderer.init();

}

function createScene() {

	const wallMaps = createWallMaps();
	wallTexture = wallMaps.color;
	wallBumpTexture = wallMaps.bump;
	backgroundMesh = new THREE.Mesh(
		new THREE.PlaneGeometry( 1, 1 ),
		new THREE.MeshStandardNodeMaterial( {
			color: 0xffffff,
			map: wallTexture,
			bumpMap: wallBumpTexture,
			bumpScale: 0.75,
			roughness: 0.91,
			metalness: 0,
		} )
	);
	backgroundMesh.position.z = - 8;
	backgroundMesh.receiveShadow = true;
	scene.add( backgroundMesh );

	const bounce = new THREE.HemisphereLight( 0x607681, COLORS.void, 0.21 );
	scene.add( bounce );

	spotTarget = new THREE.Object3D();
	spotLight = new THREE.SpotLight(
		0xffffff,
		SPOT_INTENSITY,
		1500,
		SPOT_ANGLE,
		0.94,
		2
	);
	spotLight.target = spotTarget;
	scene.add( spotLight, spotTarget );
	textLightNodes = {
		color: uniform( spotLight.color.clone() ),
		intensity: uniform( spotLight.intensity ),
		coneCos: uniform( Math.cos( spotLight.angle ) ),
		penumbraCos: uniform( Math.cos( spotLight.angle * ( 1 - spotLight.penumbra ) ) ),
		cutoffDistance: uniform( spotLight.distance ),
		decayExponent: uniform( spotLight.decay ),
	};
	textViewportNode = uniform( new THREE.Vector2( 1, 1 ) );
	textLightResponseNode = createTextLightResponseNode();
	fixtureBounceLight = new THREE.PointLight( 0xc8efff, 12000, 190, 2 );
	scene.add( fixtureBounceLight );

	lampGroup = new THREE.Group();
	const shadeGeometry = new THREE.ConeGeometry( 34, 24, 3, 1, true );
	const fixture = new THREE.Mesh(
		shadeGeometry,
		new THREE.MeshPhysicalNodeMaterial( {
			color: 0x45545b,
			metalness: 0.64,
			roughness: 0.34,
			clearcoat: 0.42,
			clearcoatRoughness: 0.32,
			side: THREE.DoubleSide,
		} )
	);
	const cap = new THREE.Mesh(
		new THREE.CylinderGeometry( 3, 4.5, 9, 12 ),
		new THREE.MeshPhysicalNodeMaterial( {
			color: 0x526168,
			metalness: 0.68,
			roughness: 0.3,
			clearcoat: 0.34,
		} )
	);
	cap.position.y = 15;

	const emitter = new THREE.Mesh(
		new THREE.CircleGeometry( 9.5, 32 ),
		new THREE.MeshStandardNodeMaterial( {
			color: 0xf5fdff,
			emissive: COLORS.key,
			emissiveIntensity: 12,
			roughness: 0.2,
			metalness: 0,
			side: THREE.DoubleSide,
		} )
	);
	emitter.position.y = - 12.5;
	emitter.rotation.x = Math.PI * 0.5;
	lampGroup.add( fixture, cap, emitter );
	scene.add( lampGroup );

	const cableGeometry = new THREE.BufferGeometry();
	cableGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0, 0, 1, 0 ], 3 ) );
	cableLine = new THREE.Line(
		cableGeometry,
		new THREE.LineBasicMaterial( {
			color: COLORS.slate,
			transparent: true,
			opacity: 0.28,
		} )
	);
	scene.add( cableLine );

}

function createTextLightResponseNode() {

	const textWorldPosition = vec3(
		screenUV.x.sub( 0.5 ).mul( textViewportNode.x ),
		screenUV.y.oneMinus().sub( 0.5 ).mul( textViewportNode.y ),
		0
	);
	const sourcePosition = lightPosition( spotLight );
	const targetPosition = lightTargetPosition( spotLight );
	const lightVector = sourcePosition.sub( textWorldPosition );
	const lightDirection = lightVector.normalize();
	const targetDirection = sourcePosition.sub( targetPosition ).normalize();
	const spotAttenuation = smoothstep(
		textLightNodes.coneCos,
		textLightNodes.penumbraCos,
		lightDirection.dot( targetDirection )
	);
	const distanceAttenuation = getDistanceAttenuation( {
		lightDistance: lightVector.length(),
		cutoffDistance: textLightNodes.cutoffDistance,
		decayExponent: textLightNodes.decayExponent,
	} );
	const diffuseIncidence = lightDirection.dot( vec3( 0, 0, 1 ) ).clamp();
	const directResponse = textLightNodes.color
		.mul( textLightNodes.intensity )
		.mul( spotAttenuation )
		.mul( distanceAttenuation )
		.mul( diffuseIncidence )
		.mul( 1 / Math.PI );

	// Keep unlit copy at 10% of its authored color while preserving the lit response.
	return directResponse.max( TEXT_UNLIT_VISIBILITY );

}

function createWallMaps() {

	const canvas = document.createElement( 'canvas' );
	const bumpCanvas = document.createElement( 'canvas' );
	canvas.width = bumpCanvas.width = 256;
	canvas.height = bumpCanvas.height = 256;
	const context = canvas.getContext( '2d' );
	const bumpContext = bumpCanvas.getContext( '2d' );
	const colorImage = context.createImageData( canvas.width, canvas.height );
	const bumpImage = bumpContext.createImageData( canvas.width, canvas.height );
	const tau = Math.PI * 2;

	for ( let y = 0; y < canvas.height; y ++ ) {

		for ( let x = 0; x < canvas.width; x ++ ) {

			const broad = Math.sin( tau * ( x * 2 + y ) / canvas.width ) * 0.5;
			const medium = Math.sin( tau * ( x * 7 - y * 5 ) / canvas.width ) * 0.28;
			const fine = Math.sin( tau * ( x * 23 + y * 17 ) / canvas.width ) * 0.12;
			const grain = Math.sin( x * 91.7 + y * 47.3 ) * 0.1;
			const surface = broad + medium + fine + grain;
			const offset = ( y * canvas.width + x ) * 4;
			colorImage.data[ offset ] = 11 + surface * 1.4;
			colorImage.data[ offset + 1 ] = 22 + surface * 1.9;
			colorImage.data[ offset + 2 ] = 27 + surface * 2.1;
			colorImage.data[ offset + 3 ] = 255;
			const height = 128 + surface * 13;
			bumpImage.data[ offset ] = height;
			bumpImage.data[ offset + 1 ] = height;
			bumpImage.data[ offset + 2 ] = height;
			bumpImage.data[ offset + 3 ] = 255;

		}

	}

	context.putImageData( colorImage, 0, 0 );
	bumpContext.putImageData( bumpImage, 0, 0 );

	const color = new THREE.CanvasTexture( canvas );
	color.colorSpace = THREE.SRGBColorSpace;
	color.wrapS = color.wrapT = THREE.RepeatWrapping;
	color.minFilter = THREE.LinearMipmapLinearFilter;
	color.magFilter = THREE.LinearFilter;

	const bump = new THREE.CanvasTexture( bumpCanvas );
	bump.colorSpace = THREE.NoColorSpace;
	bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
	bump.minFilter = THREE.LinearMipmapLinearFilter;
	bump.magFilter = THREE.LinearFilter;
	return { color, bump };

}

function installInteraction() {

	resizeObserver = new ResizeObserver( resize );
	resizeObserver.observe( container );
	container.addEventListener( 'scroll', onScroll, { passive: true } );
	container.addEventListener( 'pointermove', onPointerMove, { passive: true } );
	container.addEventListener( 'pointerleave', onPointerLeave );
	reducedMotionQuery.addEventListener?.( 'change', onMotionPreferenceChange );
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

async function startTextSynchronization() {

	const configuration = defineText( {
		content: [ 'webgl_text_input/source.js' ],
		fonts: {
			geist: {
				source: { path: fontUrl },
				browser: fontUrl,
				atlas: textAssets.atlas,
				metrics: textAssets.metrics,
				families: [ 'Three Geist', 'Geist Sans', 'Geist' ],
				default: true,
			},
		},
	} );
	textRenderer = createTextRenderer( {
		configuration,
		renderer,
		scene,
		transcoderPath: textAssets.transcoderPath,
		registerMaterial: ( key, material ) => {

			const msdfColor = material.colorNode;
			material.colorNode = vec4( msdfColor.rgb.mul( textLightResponseNode ), msdfColor.a );
			textShaderRegistrations.push( shaderCache.material( `spotlight/${key}`, material ) );

		},
		onFallback: signal => textSync?.applyFallbackSignal( signal ),
		onDiagnostic: diagnostic => console.warn( '[text]', diagnostic.command, diagnostic.codePoints ),
	} );
	textShaderRegistrations.push( shaderCache.container( 'spotlight/domtext', textRenderer.resources ) );
	textRenderer.setViewport( viewportWidth, viewportHeight );
	textSync = createTextSync( {
		publish: delivery => textRenderer?.applyDelivery( delivery ),
		root: contentElement,
		getCanvasRect: () => ( { width: viewportWidth, height: viewportHeight } ),
	} );
	await textSync.start();
	textSync.replay();
	await textRenderer.whenReady();
	canvasTextReady = true;
	container.classList.add( 'is-canvas-text-ready' );
	syncElement.textContent = `${String( textRenderer.size ).padStart( 2, '0' )} MSDF blocks`;
	const status = contentElement.querySelector( '[data-text-status]' );
	if ( status ) status.textContent = 'Pre-generated MSDF text is synchronized and ready.';

}

function onScroll() {

	updateScrollState();
	textSync?.notifyScroll();

}

function onPointerMove( event ) {

	if ( event.pointerType === 'touch' && event.buttons === 0 ) return;
	const rect = container.getBoundingClientRect();
	const x = THREE.MathUtils.clamp( event.clientX - rect.left, 0, viewportWidth );
	const y = THREE.MathUtils.clamp( event.clientY - rect.top, 0, viewportHeight );
	pointerWorld.set( x - viewportWidth * 0.5, viewportHeight * 0.5 - y, 0 );
	pointerActive = true;
	container.classList.add( 'is-pointer-active' );
	cursorElement.style.transform = `translate3d(${x - 11}px, ${y - 11}px, 0)`;

}

function onPointerLeave() {

	pointerActive = false;
	container.classList.remove( 'is-pointer-active' );

}

function onMotionPreferenceChange( event ) {

	reducedMotion = event.matches;

}

function resize() {

	if ( ! renderer || ! container ) return;
	viewportWidth = Math.max( 1, container.clientWidth || window.innerWidth );
	viewportHeight = Math.max( 1, container.clientHeight || window.innerHeight );
	container.style.setProperty( '--spot-viewport', `${viewportHeight}px` );

	renderer.setPixelRatio( window.devicePixelRatio || 1 );
	renderer.setSize( viewportWidth, viewportHeight );
	camera.left = - viewportWidth * 0.5;
	camera.right = viewportWidth * 0.5;
	camera.top = viewportHeight * 0.5;
	camera.bottom = - viewportHeight * 0.5;
	camera.updateProjectionMatrix();

	backgroundMesh.scale.set( viewportWidth + 32, viewportHeight + 32, 1 );
	const wallRepeatX = Math.max( 1, viewportWidth / 560 );
	const wallRepeatY = Math.max( 1, viewportHeight / 560 );
	wallTexture?.repeat.set( wallRepeatX, wallRepeatY );
	wallBumpTexture?.repeat.set( wallRepeatX, wallRepeatY );
	textViewportNode?.value.set( viewportWidth, viewportHeight );
	textRenderer?.setViewport( viewportWidth, viewportHeight );
	updateLampCable();
	updateScrollState();
	textSync?.refreshAll();

}

function updateLampCable() {

	if ( ! cableLine ) return;
	const lampY = viewportHeight * 0.5 - ( viewportWidth < 700 ? 84 : 72 );
	lampWorld.set( 0, lampY, SPOT_HEIGHT );
	const positions = cableLine.geometry.getAttribute( 'position' );
	positions.setXYZ( 0, 0, viewportHeight * 0.5 + 20, SPOT_HEIGHT );
	positions.setXYZ( 1, 0, lampY + 22, SPOT_HEIGHT );
	positions.needsUpdate = true;

}

function updateScrollState() {

	const maxScroll = Math.max( 1, container.scrollHeight - container.clientHeight );
	scrollProgress = THREE.MathUtils.clamp( container.scrollTop / maxScroll, 0, 1 );
	progressElement.style.transform = `scaleY(${scrollProgress})`;

	const sections = [ ...contentElement.querySelectorAll( '.spot-section' ) ];
	const rootRect = container.getBoundingClientRect();
	const viewportCenter = rootRect.top + viewportHeight * 0.5;
	let nearestDistance = Infinity;
	let nearestIndex = 0;
	for ( let index = 0; index < sections.length; index ++ ) {

		const rect = sections[ index ].getBoundingClientRect();
		const distance = Math.abs( rect.top + rect.height * 0.5 - viewportCenter );
		if ( distance < nearestDistance ) {

			nearestDistance = distance;
			nearestIndex = index;

		}

	}
	activeChapter = nearestIndex;
	chapterElement.textContent = `${String( activeChapter + 1 ).padStart( 2, '0' )} / ${String( sections.length ).padStart( 2, '0' )}`;
	const focus = sections[ activeChapter ]?.querySelector( '[data-light-focus]' );
	if ( focus ) {

		const rect = focus.getBoundingClientRect();
		focusBounds = {
			x: rect.left - rootRect.left,
			y: rect.top - rootRect.top,
			width: Math.max( rect.width, 1 ),
			height: Math.max( rect.height, 1 ),
		};

	}

}

function updateAutomaticTarget( elapsed ) {

	const phase = options.initialPhase + ( options.animateText ? elapsed * 0.42 : 0 );
	const x = focusBounds.x + focusBounds.width * ( 0.48 + Math.sin( phase ) * 0.24 );
	const y = focusBounds.y + focusBounds.height * ( 0.48 + Math.cos( phase * 0.82 ) * 0.2 );
	autoWorld.set( x - viewportWidth * 0.5, viewportHeight * 0.5 - y, 0 );

}

function updateLightRig( delta, elapsed ) {

	updateAutomaticTarget( elapsed );
	const desiredTarget = pointerActive ? pointerWorld : autoWorld;
	const easing = options.snapLight || reducedMotion ? 1 : 1 - Math.exp( - delta * ( pointerActive ? 9 : 3.5 ) );
	lightWorld.lerp( desiredTarget, easing );

	const sway = options.pointerSway ? Math.sin( elapsed * 0.34 ) * 10 : 0;
	lampGroup.position.set( lampWorld.x + sway, lampWorld.y, lampWorld.z );
	spotTarget.position.copy( lightWorld );
	lampAimDirection.subVectors( lightWorld, lampGroup.position ).normalize();
	lampGroup.quaternion.setFromUnitVectors( NEGATIVE_Y_AXIS, lampAimDirection );
	spotLight.position.copy( lampGroup.position ).addScaledVector( lampAimDirection, 13 );
	textLightNodes.color.value.copy( spotLight.color );
	textLightNodes.intensity.value = spotLight.intensity;
	textLightNodes.coneCos.value = Math.cos( spotLight.angle );
	textLightNodes.penumbraCos.value = Math.cos( spotLight.angle * ( 1 - spotLight.penumbra ) );
	textLightNodes.cutoffDistance.value = spotLight.distance;
	textLightNodes.decayExponent.value = spotLight.decay;
	fixtureBounceLight.position.set(
		lampGroup.position.x + 42,
		lampGroup.position.y + 28,
		lampGroup.position.z + 96
	);

}

function render() {

	if ( ! mounted ) return;
	const delta = Math.min( clock.getDelta(), 0.1 );
	const elapsed = clock.elapsedTime;
	updateLightRig( delta, elapsed );
	renderer.render( scene, camera );

}

function pause() {

	options.animateText = false;
	options.pointerSway = false;

}

function resume() {

	options.animateText = ! reducedMotion;
	options.pointerSway = ! reducedMotion;

}

function setProgress( value ) {

	if ( ! container ) return;
	const progress = THREE.MathUtils.clamp( Number( value ) || 0, 0, 1 );
	container.scrollTop = progress * Math.max( 0, container.scrollHeight - container.clientHeight );
	onScroll();

}

function getDiagnostics() {

	return {
		chapter: activeChapter,
		progress: scrollProgress,
		textReady: canvasTextReady,
		textBlocks: textRenderer?.size ?? 0,
	};

}

function disposeStaticScene() {

	backgroundMesh?.geometry?.dispose();
	backgroundMesh?.material?.dispose();
	wallTexture?.dispose();
	wallBumpTexture?.dispose();
	cableLine?.geometry?.dispose();
	cableLine?.material?.dispose();
	lampGroup?.traverse( object => {

		object.geometry?.dispose?.();
		object.material?.dispose?.();

	} );

}

export async function unmount() {

	mounted = false;
	pointerActive = false;
	resizeObserver?.disconnect();
	container?.removeEventListener( 'scroll', onScroll );
	container?.removeEventListener( 'pointermove', onPointerMove );
	container?.removeEventListener( 'pointerleave', onPointerLeave );
	reducedMotionQuery?.removeEventListener?.( 'change', onMotionPreferenceChange );
	pixelRatioQuery?.removeEventListener?.( 'change', onPixelRatioChange );
	pixelRatioQuery = null;
	for ( const dispose of actionDisposers.splice( 0 ) ) dispose();
	textSync?.dispose();
	textSync = null;
	for ( const registration of textShaderRegistrations.splice( 0 ) ) registration.dispose();
	await textRenderer?.dispose();
	textRenderer = null;
	renderer?.setAnimationLoop( null );
	disposeStaticScene();
	devtools?.dispose();
	devtools = null;
	renderer?.dispose();
	renderer?.domElement?.remove();
	stageElement?.remove();
	contentElement?.remove();
	chromeElement?.remove();
	styleElement?.remove();
	fontPreloadElement?.remove();
	container?.classList.remove( 'spotlight-site', 'is-pointer-active', 'is-canvas-text-ready' );
	container?.style.removeProperty( '--spot-viewport' );
	container?.removeAttribute( 'aria-label' );
	container?.removeAttribute( 'tabindex' );

	container = null;
	renderer = null;
	scene = null;
	camera = null;
	stageElement = null;
	chromeElement = null;
	contentElement = null;
	styleElement = null;
	fontPreloadElement = null;
	backgroundMesh = null;
	spotLight = null;
	spotTarget = null;
	textLightNodes = null;
	textLightResponseNode = null;
	textViewportNode = null;
	fixtureBounceLight = null;
	lampGroup = null;
	cableLine = null;
	wallTexture = null;
	wallBumpTexture = null;
	canvasTextReady = false;
	activeChapter = 0;
	fontUrl = null;
	textAssets = null;
	options = null;
	clock.stop();

}
