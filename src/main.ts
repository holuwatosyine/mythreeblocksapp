import Lenis from 'lenis';
import {
	createInputForwarder,
	installSmokeBridge,
	StatusOverlay,
	WorkerHost,
} from 'three-blocks/app';
import { threeBlocksText } from 'three-blocks/vite/config';
import { createStarterShaderParityBridge } from './protocol';
import type { AppProtocol, PointerState } from './protocol';

// Visible development status belongs to the Vite devtool. This detached target
// keeps the starter compatible with runtimes that still require a status sink.
const status = new StatusOverlay( document.createElement( 'output' ) );
const shaderParity = createStarterShaderParityBridge();
const reportHostError = ( error: unknown ): void => {

	if ( typeof globalThis.reportError === 'function' ) globalThis.reportError( error );
	else console.error( error );

};
const host = new WorkerHost<AppProtocol>( {
	canvas: '#scene',
	create: () => new Worker( new URL( './render.worker.ts', import.meta.url ), { type: 'module' } ),
	status,
	onError: reportHostError,
	text: threeBlocksText.enabled,
	handlers: shaderParity.handlers,
	...( import.meta.hot === undefined ? {} : { hot: import.meta.hot } ),
	validateStructuredClone: import.meta.env.DEV,
} );
const removeSmokeBridge = installSmokeBridge( host );
const worker = shaderParity.connect( host.link );
const input = createInputForwarder( worker );
const mobilePerformance = window.matchMedia( '(pointer: coarse)' ).matches || window.innerWidth < 768;

// Size from the canvas box, not the window: a classic scrollbar (or any layout that does not
// give the canvas the full window) otherwise renders a wider image than the canvas displays,
// scaling everything drawn — including DOM-mirrored text — against the surrounding page.
const viewport = () => ( {
	...host.canvasRect(),
	dpr: threeBlocksText.enabled ? window.devicePixelRatio : Math.min( window.devicePixelRatio, mobilePerformance ? 1 : 2 ),
} );

shaderParity.sync( worker );
input.viewport( viewport() );
input.scroll( { progress: 0, position: 0, velocity: 0, direction: 0 } );
input.visibility( { visible: document.visibilityState === 'visible' } );

let resized = false;
let lastDpr = window.devicePixelRatio;
let pointer: PointerState | undefined;

window.addEventListener( 'resize', () => {

	resized = true;

} );
// The canvas box can change without a window resize — a scrollbar appearing as content grows
// is the common one, and it silently rescales everything the canvas draws.
new ResizeObserver( () => {

	resized = true;

} ).observe( host.canvasElement );
window.addEventListener( 'pointermove', ( event ) => {

	pointer = {
		x: event.clientX / Math.max( window.innerWidth, 1 ) * 2 - 1,
		y: 1 - event.clientY / Math.max( window.innerHeight, 1 ) * 2,
		buttons: event.buttons,
	};

}, { passive: true } );
document.addEventListener( 'visibilitychange', () => {

	input.visibility( { visible: document.visibilityState === 'visible' } );

} );

const lenis = new Lenis( { autoRaf: false } );
let frameHandle = requestAnimationFrame( frame );

function frame( time: number ): void {

	shaderParity.sync( worker );
	lenis.raf( time );
	// Screen moves change DPR without firing resize.
	if ( resized || window.devicePixelRatio !== lastDpr ) {

		resized = false;
		lastDpr = window.devicePixelRatio;
		input.viewport( viewport() );

	}
	if ( pointer !== undefined ) {

		input.pointer( pointer );
		pointer = undefined;

	}
	input.scroll( {
		progress: lenis.progress,
		position: lenis.scroll,
		velocity: lenis.velocity,
		direction: lenis.direction < 0 ? -1 : lenis.direction > 0 ? 1 : 0,
	} );
	frameHandle = requestAnimationFrame( frame );

}

import.meta.hot?.dispose( () => {

	cancelAnimationFrame( frameHandle );
	lenis.destroy();
	removeSmokeBridge();

} );
