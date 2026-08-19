// Vertex Animation Video — a cloth-simulated laundry sheet baked in Blender streams as an
// exact UTSBM geometry track (16-bit positions + octahedral normals, meshopt-coded blocks) into a live
// MeshPhysicalNodeMaterial. Real deforming geometry: it casts shadows, takes lights, and
// stays orbitable while the runtime range-loads only the frames it needs.

import * as THREE from 'three/webgpu';
import { BRDF_Lambert, diffuseColor, normalView } from 'three/tsl';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

import { registerDevtools } from 'three-blocks/devtools';
import { VAVMesh } from 'three-blocks/experimental/vertex-animation-video';
import { createExampleGui } from '../helpers/exampleGui.js';
import { withAssetLoader } from '../helpers/LoadingManager.js';
import { frameCameraForAspect } from '../helpers/mobile.js';

const REDUCED_MOTION = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
const CLOTH_TERMINATOR_WIDTH = 0.18;

class ClothLightingModel extends THREE.PhysicalLightingModel {

	direct( lightData, builder ) {

		super.direct( lightData, builder );

		const { lightDirection, lightColor, reflectedLight } = lightData;
		const dotNL = normalView.dot( lightDirection );
		const wrappedDotNL = dotNL.add(
			dotNL.mul( dotNL ).add( CLOTH_TERMINATOR_WIDTH ** 2 ).sqrt()
		).mul( 0.5 ).clamp();
		const terminatorFill = wrappedDotNL.sub( dotNL.clamp() ).mul( lightColor );
		reflectedLight.directDiffuse.addAssign(
			terminatorFill.mul( BRDF_Lambert( { diffuseColor: diffuseColor.rgb } ) )
		);

	}

}

class ClothMaterial extends THREE.MeshPhysicalNodeMaterial {

	setupLightingModel() {

		return new ClothLightingModel(
			this.useClearcoat,
			this.useSheen,
			this.useIridescence,
			this.useAnisotropy,
			this.useTransmission,
			this.useDispersion,
		);

	}

}

let container;
let renderer;
let devtools;
let scene;
let camera;
let controls;
let gui;
let statusElement;
let resizeObserver;
let timer;
let stage;
let vav = null;
let material = null;
let mounted = false;
let frame = 0;
let streamFailed = false;
let previousContainerOverflow = '';
let previousContainerTouchAction = '';

const params = {
	playing: ! REDUCED_MOTION,
	time: 0,
	playbackSpeed: 1,
	loop: true,
	wireframe: false,
};

function setStatus( text ) {

	if ( statusElement?.firstElementChild ) statusElement.firstElementChild.textContent = text;

}

function requireAsset( assets, key ) {

	const asset = assets?.[ key ];
	if ( asset instanceof URL ) return asset.href;
	if ( typeof asset === 'string' && asset.length > 0 ) return asset;
	throw new Error( `VAV Laundry Sheet requires assets.${key}.` );

}

// A transient network drop kills a stream permanently (the geometry track is required),
// so give the clip one fresh start before surfacing the failure in the status pill.
async function loadStream( manifestUrl ) {

	for ( let attempt = 0; attempt < 2; attempt ++ ) {

		const mesh = await VAVMesh.load( manifestUrl, {
			material,
			loop: params.loop,
			meshoptDecoder: MeshoptDecoder,
		} );
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		mesh.playbackSpeed = params.playbackSpeed;
		if ( params.playing ) mesh.play();
		else mesh.pause();
		if ( await mesh.firstFrame !== null ) return mesh;
		mesh.dispose();

	}
	streamFailed = true;
	return null;

}

export async function mount( containerElement, {
	assets = {},
	initialTime = 0,
	loop = true,
	playing = ! REDUCED_MOTION,
	playbackSpeed = 1,
	autoOrbit = true,
} = {} ) {

	const manifestUrl = requireAsset( assets, 'manifest' );
	const blenderSceneUrl = assets.blenderScene instanceof URL ? assets.blenderScene.href : assets.blenderScene;
	container = containerElement;
	mounted = true;
	frame = 0;
	streamFailed = false;
	params.playing = Boolean( playing );
	params.time = Number.isFinite( initialTime ) ? Math.max( 0, initialTime ) : 0;
	params.playbackSpeed = Number.isFinite( playbackSpeed ) ? playbackSpeed : 1;
	params.loop = Boolean( loop );
	params.wireframe = false;
	previousContainerOverflow = container.style.overflow;
	previousContainerTouchAction = container.style.touchAction;
	container.style.overflow = 'hidden';
	container.style.touchAction = 'none';

	if ( WebGPU.isAvailable() === false ) {

		container.appendChild( WebGPU.getErrorMessage() );
		throw new Error( 'No WebGPU support' );

	}

	renderer = new THREE.WebGPURenderer( { antialias: true, trackTimestamp: true } );
	devtools = registerDevtools( { renderer, container } );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, 2 ) );
	renderer.setSize( Math.max( 1, container.clientWidth ), Math.max( 1, container.clientHeight ) );
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 0.95;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	container.appendChild( renderer.domElement );

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xb4c6cf );
	scene.fog = new THREE.FogExp2( 0xb4c6cf, 0.03 );
	camera = new THREE.PerspectiveCamera( 42, 1, 0.05, 100 );
	camera.position.set( 0, 0.55, 8.2 );

	controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true;
	controls.enablePan = false;
	controls.minDistance = 5.5;
	controls.maxDistance = 13;
	controls.maxPolarAngle = Math.PI * 0.55;
	controls.target.set( 0, 0.15, - 0.65 );
	controls.autoRotate = Boolean( autoOrbit ) && ! REDUCED_MOTION;
	controls.autoRotateSpeed = - 0.4;
	controls.update();

	createLaundryStage();
	await renderer.init();

	// Sheen gives cotton its grazing-angle glow; the VAV track supplies position + normal.
	material = new ClothMaterial( {
		color: 0xf3ecdd,
		roughness: 0.82,
		metalness: 0,
		sheen: 0.4,
		sheenRoughness: 0.55,
		sheenColor: 0xfff4e0,
		side: THREE.DoubleSide,
	} );
	await withAssetLoader( container, [ 'VAV stream' ], async manager => {

		vav = await manager.load( 'VAV stream', () => loadStream( manifestUrl ) );
		if ( vav ) scene.add( vav );

	} );
	if ( ! mounted ) return;
	if ( vav && params.time > 0 ) vav.setTime( Math.min( params.time, vav.duration ) );

	statusElement = document.createElement( 'aside' );
	statusElement.setAttribute( 'aria-live', 'polite' );
	statusElement.setAttribute( 'aria-label', 'Vertex Animation Video stream status' );
	statusElement.style.cssText = 'position:absolute;z-index:5;right:clamp(14px,2.5vw,28px);bottom:clamp(14px,2.5vw,28px);box-sizing:border-box;max-width:min(520px,calc(100% - 28px));padding:10px 13px 9px;border:1px solid rgba(247,242,228,.28);border-right:3px solid #e6a96f;color:#f7f2e4;background:linear-gradient(135deg,rgba(30,45,52,.94),rgba(23,34,40,.9));box-shadow:0 16px 38px rgba(21,30,34,.24);font:700 9px/1.45 ui-monospace,"SFMono-Regular",Consolas,monospace;letter-spacing:.055em;text-align:right;text-transform:uppercase;pointer-events:none';
	statusElement.appendChild( document.createElement( 'span' ) );
	if ( typeof blenderSceneUrl === 'string' && blenderSceneUrl.length > 0 ) {

		const assetLink = document.createElement( 'a' );
		assetLink.href = blenderSceneUrl;
		assetLink.download = 'laundry-sheet.blend';
		assetLink.textContent = 'Blender test scene ↓';
		assetLink.style.cssText = 'display:inline-block;margin-top:4px;color:#e6a96f;text-decoration:underline;text-underline-offset:2px;pointer-events:auto';
		statusElement.append( document.createElement( 'br' ), assetLink );

	}
	container.appendChild( statusElement );
	setStatus( 'VAV · Laundry sheet' );

	gui = await createExampleGui( 'VAV · Laundry Sheet' );
	if ( window.innerWidth < 512 ) gui.close();
	gui.add( params, 'playing' ).name( 'Play cloth' ).onChange( value => ( value ? vav?.play() : vav?.pause() ) );
	gui.add( params, 'time', 0, vav?.duration ?? 1, 0.01 ).name( 'Timeline' ).listen().onChange( value => {

		if ( ! vav ) return;
		vav.pause();
		params.playing = false;
		vav.setTime( value );

	} );
	gui.add( params, 'playbackSpeed', 0.25, 2, 0.05 ).name( 'Playback speed' ).onChange( value => {

		if ( vav ) vav.playbackSpeed = value;

	} );
	gui.add( params, 'loop' ).name( 'Loop' ).onChange( value => {

		if ( vav ) vav.loop = value;

	} );
	gui.add( params, 'wireframe' ).name( 'Wireframe' )
		.info( 'The sheet is real deforming geometry, not a video billboard' )
		.onChange( value => ( material.wireframe = value ) );

	resizeObserver = new ResizeObserver( onResize );
	resizeObserver.observe( container );
	onResize();
	timer = new THREE.Timer();
	timer.connect( document );
	renderer.setAnimationLoop( animate );
	return {
		pause() {

			params.playing = false;
			vav?.pause();

		},
		seek( time ) {

			if ( ! vav || ! Number.isFinite( time ) ) return;
			const nextTime = THREE.MathUtils.clamp( time, 0, vav.duration );
			params.time = nextTime;
			params.playing = false;
			vav.pause();
			vav.setTime( nextTime );

		},
		dispose: unmount,
	};

}

function createLaundryStage() {

	stage = new THREE.Group();
	stage.name = 'LaundryStage';

	const key = new THREE.DirectionalLight( 0xffe7c2, 3.4 );
	key.position.set( - 4.5, 6.5, 5.5 );
	key.castShadow = true;
	key.shadow.mapSize.set( 2048, 2048 );
	key.shadow.camera.left = - 5;
	key.shadow.camera.right = 5;
	key.shadow.camera.top = 4;
	key.shadow.camera.bottom = - 4;
	key.shadow.bias = - 0.0002;
	key.shadow.normalBias = 0.035;
	key.shadow.radius = 5;
	stage.add( key, new THREE.HemisphereLight( 0xcfe4f2, 0x77694f, 1.25 ) );

	const wood = new THREE.MeshStandardNodeMaterial( { color: 0x8d674e, roughness: 0.88 } );
	const metal = new THREE.MeshStandardNodeMaterial( { color: 0x46575e, roughness: 0.42, metalness: 0.5 } );
	const pinMaterial = new THREE.MeshStandardNodeMaterial( { color: 0xe6a96f, roughness: 0.65 } );
	const line = new THREE.Mesh( new THREE.CylinderGeometry( 0.018, 0.018, 8.3, 10 ).rotateZ( Math.PI / 2 ), metal );
	line.position.set( 0, 1.28, - 0.72 );
	line.castShadow = true;
	stage.add( line );
	for ( const x of [ - 3.85, 3.85 ] ) {

		const pole = new THREE.Mesh( new THREE.CylinderGeometry( 0.075, 0.1, 5.2, 14 ), wood );
		pole.position.set( x, - 1.2, - 0.76 );
		pole.castShadow = true;
		stage.add( pole );

	}
	for ( const x of [ - 2.42, 2.42 ] ) {

		const pin = new THREE.Mesh( new THREE.BoxGeometry( 0.14, 0.33, 0.12 ), pinMaterial );
		pin.position.set( x, 1.18, - 0.7 );
		pin.rotation.z = x < 0 ? 0.08 : - 0.08;
		pin.castShadow = true;
		stage.add( pin );

	}
	const floor = new THREE.Mesh(
		new THREE.CircleGeometry( 7.2, 64 ).rotateX( - Math.PI / 2 ),
		new THREE.MeshStandardNodeMaterial( { color: 0x8a9c99, roughness: 0.95 } ),
	);
	floor.position.set( 0, - 1.28, - 0.6 );
	floor.receiveShadow = true;
	stage.add( floor );
	scene.add( stage );

}

function onResize() {

	if ( ! container ) return;
	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	frameCameraForAspect( camera, controls.target );
	renderer.setSize( width, height );

}

function animate() {

	if ( ! mounted ) return;
	timer.update();
	const delta = Math.min( timer.getDelta(), 0.1 );
	controls.update( delta );

	if ( vav ) {

		vav.update( delta );
		if ( vav.playing ) params.time = vav.time;
		if ( frame % 15 === 0 ) {

			const manifest = vav.manifest;
			const megabytes = Object.values( manifest.tracks ).reduce( ( sum, track ) => sum + ( track.wireByteLength ?? track.byteLength ), 0 ) / 1024 / 1024;
			setStatus(
				`VAV · Laundry sheet · ${manifest.vertexCount.toLocaleString()} vertices × ${manifest.frameCount} frames @ ${manifest.frameRate} fps · ` +
				`${megabytes.toFixed( 1 )} MB exact geometry stream · ` +
				`${vav.time.toFixed( 1 )} / ${vav.duration.toFixed( 1 )} s` +
				( vav.playing && vav.isBuffering ? ' · buffering' : '' )
			);

		}

	} else if ( streamFailed && frame % 60 === 0 ) {

		setStatus( 'VAV · Laundry sheet · stream failed — reload to retry' );

	}

	renderer.render( scene, camera );
	frame ++;

}

export function unmount() {

	mounted = false;
	renderer?.setAnimationLoop( null );
	resizeObserver?.disconnect();
	statusElement?.remove();
	statusElement = null;
	timer?.dispose?.();
	timer = null;
	if ( vav ) {

		scene?.remove( vav );
		vav.dispose();
		vav = null;

	}
	controls?.dispose();
	controls = null;
	gui?.destroy();
	gui = null;
	if ( stage ) {

		scene?.remove( stage );
		stage.traverse( object => {

			object.geometry?.dispose?.();
			object.material?.dispose?.();

		} );
		stage = null;

	}
	material?.dispose();
	material = null;
	devtools?.dispose();
	devtools = null;
	renderer?.dispose();
	renderer?.domElement?.remove();
	renderer = null;
	scene = null;
	camera = null;
	if ( container ) {

		container.style.overflow = previousContainerOverflow;
		container.style.touchAction = previousContainerTouchAction;

	}
	previousContainerOverflow = '';
	previousContainerTouchAction = '';
	container = null;

}
