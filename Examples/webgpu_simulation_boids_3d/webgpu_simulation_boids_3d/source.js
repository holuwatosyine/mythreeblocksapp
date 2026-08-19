import * as THREE from 'three/webgpu';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { registerDevtools } from 'three-blocks/devtools';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import {
	color,
	Fn,
	hash,
	If,
	mix,
	normalLocal,
	positionGeometry,
	screenUV,
	sin,
	transformNormal,
	transformNormalToView,
	uniform,
	vertexIndex,
} from 'three/tsl';

import { Boids, ComputeBVHSampler, ComputeInstanceCulling } from 'three-blocks';
import { ComputeSDFGenerator, SDFVolumeConstraint } from 'three-blocks/sdf-raymarching';
import { BirdGeometry } from '../helpers/exampleGeometries.js';
import { instanceCullingIndex } from 'three-blocks/instance-culling';
import { computeBoundsTree } from 'three-mesh-bvh';
import { shaderCache } from 'three-blocks/shaders';
import { createExampleCaption } from '../helpers/ExampleCaption.js';
import { createExampleGui } from '../helpers/exampleGui.js';
import { withAssetLoader } from '../helpers/LoadingManager.js';
import { frameCameraForAspect } from '../helpers/mobile.js';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;

const BIRD_COUNT = 6144;
const DOMAIN = new THREE.Vector3( 60, 40, 30 );
const DOMAIN_AVERAGE = ( DOMAIN.x + DOMAIN.y + DOMAIN.z ) / 3;
const reducedMotionQuery = window.matchMedia( '(prefers-reduced-motion: reduce)' );
const wingClock = uniform( 0 ).setName( 'boidsWingClock' );
const wingLift = uniform( 0.34 ).setName( 'boidsWingLift' );

let container;
let renderer;
let devtools;
let scene;
let camera;
let controls;
let gui;
let boids;
let birdMesh;
let instanceCulling;
let sampler;
let sdfGenerator;
let sdfConstraint;
let bunnyGeometry;
let resizeObserver;
let caption;
let raycaster;
let pointer;
let mounted = false;
let lifecycleGeneration = 0;
let framePending = false;
let lastFrameTime = 0;
let motionTime = 0;
let containerStyleSnapshot;
let birdCount = BIRD_COUNT;

const murmurationShaderResources = {
	get sdfGenerator() { return sdfGenerator; },
	get bvhStorage() {

		const storage = sdfGenerator?._bvhData?.storage;
		return storage?.nodes?.proxyObject ?? storage;

	},
	get positions() { return boids?.buffers.positions; },
	get velocities() { return boids?.buffers.velocities; },
	get sdfConstraint() { return sdfConstraint; },
	get sampler() { return sampler; },
	get boids() { return boids; },
	get instanceCulling() { return instanceCulling; },
	get bunnyGeometry() { return bunnyGeometry; },
};

const params = {
	motion: ! reducedMotionQuery.matches,
	pace: 1,
	separation: 0.035,
	cohesion: 0.03,
	wingbeat: 1,
	pointerAvoidance: true,
};

function requireAsset( assets, key ) {

	const asset = assets?.[ key ];
	if ( asset instanceof URL ) return asset.href;
	if ( typeof asset === 'string' && asset.length > 0 ) return asset;
	throw new Error( `Murmuration requires assets.${key}.` );

}

export async function mount( containerElement, {
	assets = {},
	cohesion = 0.03,
	motion = ! reducedMotionQuery.matches,
	pace = 1,
	pointerAvoidance = true,
	reducedWorkload = false,
	separation = 0.035,
	wingbeat = 1,
} = {} ) {

	if ( renderer ) unmount();
	container = containerElement;
	birdCount = reducedWorkload ? 2_048 : BIRD_COUNT;
	const resolvedAssets = {
		volumeModel: requireAsset( assets, 'volumeModel' ),
	};
	Object.assign( params, {
		cohesion,
		motion,
		pace,
		pointerAvoidance,
		separation,
		wingbeat,
	} );
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

		await init( generation, resolvedAssets );

	} catch ( error ) {

		if ( generation === lifecycleGeneration ) unmount();
		throw error;

	}
	return { dispose: unmount };

}

async function init( generation, assets ) {

	const { width, height } = getViewport();
	camera = new THREE.PerspectiveCamera( 44, width / height, 0.1, 500 );
	camera.position.set( 0, 11, 67 );

	scene = new THREE.Scene();
	scene.backgroundNode = screenUV.y.mix( color( 0xf2c7a2 ), color( 0x6688ad ) );
	scene.fog = new THREE.FogExp2( 0x92a1ad, 0.0065 );

	renderer = new THREE.WebGPURenderer( { antialias: true, trackTimestamp: true } );
	devtools = registerDevtools( { renderer, container } );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, 1.5 ) );
	renderer.setSize( width, height );
	renderer.toneMapping = THREE.AgXToneMapping;
	renderer.toneMappingExposure = 1.08;
	renderer.shadowMap.enabled = true;
	container.appendChild( renderer.domElement );
	await renderer.init();
	if ( ! mounted || generation !== lifecycleGeneration ) return;
	shaderCache.container( 'murmuration/sdf-and-flock', murmurationShaderResources );

	if ( ! mounted || generation !== lifecycleGeneration ) return;

	controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true;
	controls.enablePan = false;
	controls.minDistance = 34;
	controls.maxDistance = 105;
	controls.target.set( 0, 2.5, 0 );
	controls.update();

	createSkyStage();
	await createFlock( assets );
	if ( ! mounted || generation !== lifecycleGeneration ) return;
	createCaption( 'GPU flock · SDF-bound airspace · move through the murmuration' );
	await setupGui();
	if ( ! mounted || generation !== lifecycleGeneration ) return;
	installInteraction();

	resizeObserver = new ResizeObserver( onResize );
	resizeObserver.observe( container );
	onResize();
	lastFrameTime = performance.now();
	renderer.setAnimationLoop( render );

}

function getViewport() {

	return {
		width: Math.max( 1, container?.clientWidth || window.innerWidth ),
		height: Math.max( 1, container?.clientHeight || window.innerHeight ),
	};

}

function createSkyStage() {

	const hemisphere = new THREE.HemisphereLight( 0xc7dcf1, 0x44513c, 2.2 );
	scene.add( hemisphere );
	const sunLight = new THREE.DirectionalLight( 0xffe0b0, 3.4 );
	sunLight.position.set( - 18, 32, 20 );
	scene.add( sunLight );

	const sun = new THREE.Mesh(
		new THREE.CircleGeometry( 5.4, 48 ),
		new THREE.MeshBasicMaterial( { color: 0xffd39b, toneMapped: false } )
	);
	sun.position.set( - 33, 25, - 72 );
	scene.add( sun );

	const ground = new THREE.Mesh(
		new THREE.PlaneGeometry( 260, 220 ),
		new THREE.MeshStandardMaterial( { color: 0x536352, roughness: 0.98 } )
	);
	ground.rotation.x = - Math.PI / 2;
	ground.position.set( 0, - 20, - 20 );
	ground.receiveShadow = true;
	scene.add( ground );

	const mountainMaterial = new THREE.MeshStandardMaterial( {
		color: 0x536477,
		flatShading: true,
		roughness: 1,
	} );
	const ridge = [
		[ - 54, - 5, - 88, 24, 42 ],
		[ - 31, - 9, - 92, 19, 31 ],
		[ - 8, - 7, - 98, 28, 45 ],
		[ 22, - 10, - 91, 22, 34 ],
		[ 48, - 8, - 96, 30, 47 ],
	];
	for ( const [ x, y, z, radius, height ] of ridge ) {

		const peak = new THREE.Mesh( new THREE.ConeGeometry( radius, height, 5 ), mountainMaterial );
		peak.position.set( x, y, z );
		peak.rotation.y = x * 0.017;
		scene.add( peak );

	}

}

function createCaption( detail ) {

	caption = createExampleCaption( {
		accent: '#64a4ff',
		ariaLabel: 'Murmuration details',
		label: 'Flock details',
		content: `
			<span class="tb-example-caption__eyebrow">Murmuration</span>
			<strong class="tb-example-caption__title">${birdCount.toLocaleString()} birds</strong>
			<span class="tb-example-caption__note" data-detail>${detail}</span>
		`,
	} );
	caption.setAttribute( 'aria-live', 'polite' );
	container.appendChild( caption );

}

async function createFlock( assets ) {

	const fbx = await withAssetLoader( container, [ 'Flock volume' ], manager => (
		manager.load( 'Flock volume', onProgress => new FBXLoader().loadAsync( assets.volumeModel, onProgress ) )
	) );
	fbx.traverse( child => {

		if ( child.isMesh && ! bunnyGeometry ) bunnyGeometry = child.geometry.clone();

	} );
	fbx.traverse( child => {

		if ( child.isMesh ) {

			child.geometry?.dispose?.();
			if ( Array.isArray( child.material ) ) child.material.forEach( material => material.dispose?.() );
			else child.material?.dispose?.();

		}

	} );
	if ( ! bunnyGeometry ) throw new Error( 'Failed to load the flock volume.' );
	bunnyGeometry.computeBoundingBox();
	const center = bunnyGeometry.boundingBox.getCenter( new THREE.Vector3() );
	bunnyGeometry.translate( - center.x, - center.y, - center.z );
	bunnyGeometry.scale( 0.085, 0.085, 0.085 );
	bunnyGeometry.computeBoundsTree();

	sdfGenerator = new ComputeSDFGenerator( { resolution: 32 } );
	await sdfGenerator.generate( bunnyGeometry, bunnyGeometry.boundsTree, renderer );
	sdfConstraint = new SDFVolumeConstraint( sdfGenerator, {
		stiffness: 5000,
		damping: 0.3,
		threshold: - 0.05,
	} );
	sampler = new ComputeBVHSampler( sdfGenerator, renderer, birdCount );
	sampler.compute();

	boids = new Boids( {
		count: birdCount,
		is3D: true,
		domainDimensions: DOMAIN,
		separation: params.separation,
		alignment: 0.04,
		cohesion: params.cohesion,
		speedLimit: 0.3,
		useRelativeParameters: true,
		useDirection: true,
		useMatrices: true,
		useSpatialGrid: true,
		sdfVolumeConstraint: sdfConstraint,
		initialPositions: sampler.positionsBuffer,
		fixedTimeStep: 1 / 120,
		timeScale: params.pace,
		randomSeed: [ 0.314159, 0.271828 ],
	} );
	boids.ubos.pointerRadius.value = 7.5;
	boids.ubos.pointerStrength.value = 72;

	const geometry = new BirdGeometry();
	geometry.scale( 0.018, 0.018, 0.018 );
	geometry.computeBoundingSphere();
	const material = new THREE.MeshStandardNodeMaterial( {
		roughness: 0.76,
		metalness: 0,
		side: THREE.DoubleSide,
	} );
	birdMesh = new THREE.InstancedMesh( geometry, material, birdCount );
	birdMesh.frustumCulled = false;
	birdMesh.instanceMatrix = boids.buffers.instanceMatrices.value;
	scene.add( birdMesh );

	instanceCulling = new ComputeInstanceCulling( birdMesh, renderer );
	const culledIndex = instanceCullingIndex( instanceCulling );
	material.positionNode = Fn( () => {

		const transformed = positionGeometry.toVar();
		If( vertexIndex.equal( 4 ).or( vertexIndex.equal( 7 ) ), () => {

			const phase = wingClock.mul( 15 ).add( hash( culledIndex ).mul( Math.PI * 2 ) );
			transformed.y.addAssign( sin( phase ).mul( wingLift ) );

		} );
		return transformed;

	} )();
	material.normalNode = transformNormalToView(
		transformNormal( normalLocal, boids.buffers.instanceMatrices.element( culledIndex ) )
	).toVarying( 'v_normalViewGeometry' ).normalize();
	const plumage = hash( culledIndex ).mul( 0.82 );
	material.colorNode = mix( color( 0x243c55 ), color( 0xd27f5f ), plumage );
}

async function setupGui() {

	gui = await createExampleGui( 'Murmuration' );
	if ( container.clientWidth < 560 ) gui.close();
	gui.add( params, 'motion' ).name( 'Fly' );
	gui.add( params, 'pace', 0.25, 1.8, 0.05 ).name( 'Flock pace' ).onChange( value => {

		boids.ubos.timeScale.value = value;

	} );
	gui.add( params, 'separation', 0.02, 0.065, 0.0025 ).name( 'Personal space' ).onChange( value => {

		boids.ubos.separation.value = value * DOMAIN_AVERAGE;
		updateZoneRadius();

	} );
	gui.add( params, 'cohesion', 0.015, 0.07, 0.0025 ).name( 'Gathering' ).onChange( value => {

		boids.ubos.cohesion.value = value * DOMAIN_AVERAGE;
		updateZoneRadius();

	} );
	gui.add( params, 'wingbeat', 0.35, 1.8, 0.05 ).name( 'Wingbeat' );
	gui.add( params, 'pointerAvoidance' ).name( 'Pointer wake' );

}

function updateZoneRadius() {

	boids.ubos.zoneRadius.value = boids.ubos.separation.value + boids.ubos.alignment.value + boids.ubos.cohesion.value;
	boids.syncSpatialGrid();

}

function installInteraction() {

	raycaster = new THREE.Raycaster();
	pointer = new THREE.Vector2();
	renderer.domElement.addEventListener( 'pointermove', onPointerMove );
	renderer.domElement.addEventListener( 'pointerleave', clearPointer );

}

function onPointerMove( event ) {

	if ( ! params.pointerAvoidance || ! boids ) return clearPointer();
	const rect = renderer.domElement.getBoundingClientRect();
	pointer.set(
		( ( event.clientX - rect.left ) / rect.width ) * 2 - 1,
		- ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1
	);
	raycaster.setFromCamera( pointer, camera );
	boids.ubos.rayOrigin.value.copy( raycaster.ray.origin );
	boids.ubos.rayDirection.value.copy( raycaster.ray.direction );

}

function clearPointer() {

	boids?.ubos.rayOrigin.value.set( - 9999, - 9999, - 9999 );
	boids?.ubos.rayDirection.value.set( 0, 0, - 1 );

}

function removeInteraction() {

	renderer?.domElement.removeEventListener( 'pointermove', onPointerMove );
	renderer?.domElement.removeEventListener( 'pointerleave', clearPointer );
	raycaster = null;
	pointer = null;

}

async function render( now = performance.now() ) {

	if ( ! mounted || framePending ) return;
	framePending = true;
	const generation = lifecycleGeneration;
	try {

		const delta = Math.min( 0.05, Math.max( 0, ( now - lastFrameTime ) / 1000 ) );
		lastFrameTime = now;
		if ( params.motion ) {

			motionTime += delta * params.wingbeat;
			wingClock.value = motionTime;
			await boids.step( renderer );

		}
		if ( ! mounted || generation !== lifecycleGeneration ) return;
		controls.update();
		renderer.render( scene, camera );

	} finally {

		framePending = false;

	}

}

function onResize() {

	if ( ! renderer || ! camera || ! container ) return;
	const { width, height } = getViewport();
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	frameCameraForAspect( camera, controls.target );
	renderer.setSize( width, height );

}

function disposeScene() {

	const geometries = new Set();
	const materials = new Set();
	scene?.traverse( object => {

		if ( object.geometry ) geometries.add( object.geometry );
		if ( Array.isArray( object.material ) ) object.material.forEach( material => materials.add( material ) );
		else if ( object.material ) materials.add( object.material );

	} );
	geometries.forEach( geometry => geometry.dispose?.() );
	materials.forEach( material => material.dispose?.() );

}

export function unmount() {

	mounted = false;
	lifecycleGeneration ++;
	renderer?.setAnimationLoop( null );
	removeInteraction();
	resizeObserver?.disconnect();
	resizeObserver = null;
	instanceCulling?.dispose();
	instanceCulling = null;
	boids?.detachSpatialGrid();
	sdfConstraint?.dispose();
	sdfConstraint = null;
	sampler?.dispose?.();
	sampler = null;
	sdfGenerator?.dispose();
	sdfGenerator = null;
	bunnyGeometry?.dispose();
	bunnyGeometry = null;
	disposeScene();
	birdMesh = null;
	boids = null;
	gui?.destroy();
	gui = null;
	controls?.dispose();
	controls = null;
	caption?.remove();
	caption = null;
	if ( renderer ) {

		devtools?.dispose();
		devtools = null;
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
	framePending = false;
	lastFrameTime = 0;
	motionTime = 0;

}
