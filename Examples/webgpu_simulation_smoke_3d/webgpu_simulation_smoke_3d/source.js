import * as THREE from 'three/webgpu';
import { registerDevtools } from 'three-blocks/devtools';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { createExampleGui } from '../helpers/exampleGui.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LoftGeometry } from 'three/addons/geometries/LoftGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { uniform, Fn, float, vec3, vec4, If, Break, smoothstep, uv, color, mix, hash, luminance, normalWorldGeometry, positionLocal, positionWorld, mrt, output, pass, renderOutput, screenCoordinate, screenUV, shadow, texture, velocity } from 'three/tsl';

import { SmokeVolume, VolumeSmokeNodeMaterial } from 'three-blocks/smoke';
import { shaderCache } from 'three-blocks/shaders';
import { BatchedText, Text } from 'three-blocks/experimental/runtime-sdf-text';
import { BoxNoFaceGeometry } from '../helpers/exampleGeometries.js';
import { RaymarchingBox } from 'three-blocks/sdf-raymarching';
import { VolumeSmokeRenderCompositor, volumeSmokeShadow } from 'three-blocks/smoke';


let container;
let renderer;
let devtools;
let scene;
let camera;
let controls;
let gui;
let fluid;
let mesh;
let material;
let raycaster;
let mouse;
let uiState;
let meshGrid;
let floorGrid;
let volumeCompositor;
let renderPipeline;
let scenePass;
let sceneColorNode;
let sceneDepthNode;
let volumeSceneShadowNode;
let bloomPassNode;
let quickBar;
let volumeResolutionScale = 0.55;
let volumeDepthSigma = 96;
let moonLight;
let emberLight;
let sceneGeometryStats = { trees: 0, drawCalls: 0, triangles: 0 };

const tmpSplatVelocity = new THREE.Vector3();
const tmpEmitterPosition = new THREE.Vector3();
const tmpEmitterVelocity = new THREE.Vector3();
const tmpEmitterQuaternion = new THREE.Quaternion();
const tmpCameraLocal = new THREE.Vector3();
const tmpWindDirection = new THREE.Vector3();
const tmpDomainMatrix = new THREE.Matrix4();
const sceneTime = uniform( 0 );
const canopyWindDirection = uniform( new THREE.Vector3( 0, 0, 1 ), 'vec3' );
const canopySway = uniform( 0.035 );
const emberGlow = uniform( 1 );
const skyMoonDirection = uniform( new THREE.Vector3( - 0.898, 0.438, 0.031 ).normalize(), 'vec3' );
const skyMoonColor = uniform( new THREE.Color( 0x9fc5f2 ) );
const skyMoonIntensity = uniform( 3.1 );
const sharedFogColor = uniform( new THREE.Color( 0x0c1a24 ) );
const sharedFogDensity = uniform( 0.012 );
const postFrame = uniform( 0 );
const postStrength = uniform( 1 );
const postGain = uniform( new THREE.Color( 0.98, 1.01, 1.055 ) );
const postShadowTint = uniform( new THREE.Color( 0.015, 0.055, 0.063 ) );
const postHighlightTint = uniform( new THREE.Color( 0.055, 0.025, 0.008 ) );
const postVignetteStrength = uniform( 0.25 );
const postGrainStrength = uniform( 0 );
const smokeWorldToDomain = uniform( new THREE.Matrix4(), 'mat4' );
const smokeShadowLightDirLocal = uniform( new THREE.Vector3( 0, 1, 0 ), 'vec3' );
const smokeGroundShadowStrength = uniform( 0.72 );
const VOLUME_LAYER = 1;
const OPAQUE_SCENE_LAYERS = new THREE.Layers();
OPAQUE_SCENE_LAYERS.set( 0 );
const SHOWCASE_DOMAIN_SCALE = new THREE.Vector3( 16, 18, 16 );
const LOW_FOG_SOURCE_LOCAL_Y = - 0.455;
const SHOWCASE_EMITTERS = [
	{ x: - 0.30, z: - 0.18, phase: 0.1, lift: 0.92, density: 0.82, radius: 0.9 },
	{ x: 0.14, z: - 0.28, phase: 1.8, lift: 1.12, density: 1.0, radius: 1.08 },
	{ x: 0.32, z: 0.15, phase: 3.7, lift: 0.98, density: 0.9, radius: 0.96 },
	{ x: - 0.18, z: 0.30, phase: 5.4, lift: 1.06, density: 0.94, radius: 1.0 },
];
const AMBIENT_FOG_SOURCES = [
	{ x: - 0.29, z: - 0.22, phase: 0.2, density: 0.82, radius: 2.7 },
	{ x: - 0.08, z: - 0.31, phase: 1.1, density: 0.95, radius: 2.5 },
	{ x: 0.24, z: - 0.25, phase: 2.0, density: 0.76, radius: 2.8 },
	{ x: 0.32, z: 0.02, phase: 2.9, density: 0.88, radius: 2.6 },
	{ x: 0.19, z: 0.29, phase: 3.8, density: 0.7, radius: 2.8 },
	{ x: - 0.13, z: 0.32, phase: 4.7, density: 0.9, radius: 2.5 },
	{ x: - 0.33, z: 0.09, phase: 5.6, density: 0.74, radius: 2.7 },
];
let plumeTime = 0;
let fogEmissionFrame = 0;
let previousFrameTime;
let simulationAccumulator = 0;
let cameraIntroStartTime = null;

const CAMERA_FINAL_POSITION = new THREE.Vector3( 16, 3.4, - 6.5 );
const CAMERA_FINAL_TARGET = new THREE.Vector3( 0, 4.8, 0 );
const CAMERA_WIDE_POSITION = new THREE.Vector3( 21.5, 5.8, - 8.8 );
const CAMERA_WIDE_TARGET = new THREE.Vector3( 0, 5, 0 );

const SIMULATION_FIXED_DELTA = 1 / 60;
const MAX_SIMULATION_SUBSTEPS = 2;
const REDUCED_MOTION = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
const QUALITY_TIERS = {
	LOW: { simRes: 64, dyeRes: 112, volumeScale: 0.4, steps: 56, flowDetail: false, highFrequencyDetail: false, sceneShadows: false, temporal: false },
	MED: { simRes: 80, dyeRes: 128, volumeScale: 0.5, steps: 72, flowDetail: true, highFrequencyDetail: false, sceneShadows: true, temporal: false },
	HIGH: { simRes: 96, dyeRes: 160, volumeScale: 0.55, steps: 96, flowDetail: true, highFrequencyDetail: false, sceneShadows: true, temporal: false },
	// The temporal HDR resolve can produce non-finite history for the emissive presets.
	// Keep Ultra spatial until that resolve is safe; the tier still increases scale, steps,
	// density resolution, and high-frequency detail without sacrificing HDR fire radiance.
	ULTRA: { simRes: 96, dyeRes: 192, volumeScale: 0.65, steps: 128, flowDetail: true, highFrequencyDetail: true, sceneShadows: true, temporal: false },
};
const QUALITY_ORDER = [ 'LOW', 'MED', 'HIGH', 'ULTRA' ];
const SMOKE_PRESETS = {
	'Dying Fire': {
		moon: { color: 0x8fb3e6, intensity: 3.1, azimuth: - 88, elevation: 26 },
		fogDensity: 0.012,
		interactiveFogDensity: 0.035,
		emberIntensity: 72,
		wind: { strength: 3.5, heading: - 32 },
		smoke: { ambientLight: 0.56, lightStrength: 1.5, fireIntensity: 2.15, pointScatter: 0.024 },
		colors: { skyColor: 0x6f88a9, groundColor: 0x283037, lightColor: 0xe3edf4, pointLightColor: 0xff9345 },
		grade: { gain: [ 0.98, 1.01, 1.055 ], shadow: [ 0.015, 0.055, 0.063 ], highlight: [ 0.055, 0.025, 0.008 ], bloom: 0.46 },
	},
	'Blue Hour Mist': {
		moon: { color: 0xa9c9f4, intensity: 3.8, azimuth: - 42, elevation: 48 },
		fogDensity: 0.019,
		interactiveFogDensity: 0.07,
		emberIntensity: 44,
		wind: { strength: 2.2, heading: - 18 },
		smoke: { ambientLight: 0.68, lightStrength: 1.75, fireIntensity: 1.3, pointScatter: 0.014 },
		colors: { skyColor: 0x789bc8, groundColor: 0x24313b, lightColor: 0xd5e8ff, pointLightColor: 0xffa365 },
		grade: { gain: [ 0.94, 1.01, 1.08 ], shadow: [ 0.01, 0.065, 0.082 ], highlight: [ 0.032, 0.018, 0.008 ], bloom: 0.4 },
	},
	Storm: {
		moon: { color: 0x7895c2, intensity: 4.2, azimuth: - 70, elevation: 34 },
		fogDensity: 0.016,
		interactiveFogDensity: 0.045,
		emberIntensity: 86,
		wind: { strength: 6.4, heading: - 58 },
		smoke: { ambientLight: 0.42, lightStrength: 1.9, fireIntensity: 2.5, pointScatter: 0.026 },
		colors: { skyColor: 0x526a8f, groundColor: 0x1c242b, lightColor: 0xc3d5f0, pointLightColor: 0xff8738 },
		grade: { gain: [ 0.94, 0.99, 1.045 ], shadow: [ 0.008, 0.045, 0.055 ], highlight: [ 0.065, 0.02, 0.004 ], bloom: 0.5 },
	},
	'First Light': {
		moon: { color: 0xffc88e, intensity: 2.7, azimuth: - 76, elevation: 14 },
		fogDensity: 0.014,
		interactiveFogDensity: 0.05,
		emberIntensity: 38,
		wind: { strength: 2.8, heading: 24 },
		smoke: { ambientLight: 0.62, lightStrength: 1.25, fireIntensity: 1.05, pointScatter: 0.012 },
		colors: { skyColor: 0x8aa0ad, groundColor: 0x403b36, lightColor: 0xffd3a6, pointLightColor: 0xffa567 },
		grade: { gain: [ 1.035, 1.01, 0.97 ], shadow: [ 0.02, 0.045, 0.05 ], highlight: [ 0.06, 0.036, 0.012 ], bloom: 0.36 },
	},
};
let activeQualityTier = 'HIGH';
let activeQuality = QUALITY_TIERS[ activeQualityTier ];
let activePreset = 'Dying Fire';
let qualityProbeElapsed = 0;
let qualityProbeFrames = 0;
let qualityProbeCooldown = 2;
let requestedQualityTier;
let autoQualityEnabled = true;
let debugGui = false;
let autoStart = true;
let initializationSteps = 180;
let gridSettings;
const sharedVolumeFogNode = Fn( ( [ , cameraDistance ] ) => {

	const extinction = cameraDistance.mul( sharedFogDensity ).toVar( 'sharedFogExtinction' );
	const transmittance = extinction.mul( extinction ).negate().exp().toVar( 'sharedFogTransmittance' );
	return vec4( sharedFogColor.mul( transmittance.oneMinus() ), transmittance );

} );
function mulberry32( seed ) {

	return () => {

		let value = seed += 0x6D2B79F5;
		value = Math.imul( value ^ value >>> 15, value | 1 );
		value ^= value + Math.imul( value ^ value >>> 7, value | 61 );
		return ( ( value ^ value >>> 14 ) >>> 0 ) / 4294967296;

	};

}

function smootherstep( edge0, edge1, value ) {

	const t = THREE.MathUtils.clamp( ( value - edge0 ) / ( edge1 - edge0 ), 0, 1 );
	return t * t * t * ( t * ( t * 6 - 15 ) + 10 );

}

function beginCameraIntro() {

	if ( REDUCED_MOTION ) {

		camera.position.copy( CAMERA_FINAL_POSITION );
		controls.target.copy( CAMERA_FINAL_TARGET );
		controls.update();
		cameraIntroStartTime = null;
		return;

	}
	camera.position.copy( CAMERA_WIDE_POSITION );
	controls.target.copy( CAMERA_WIDE_TARGET );
	controls.update();
	cameraIntroStartTime = performance.now();

}

function updateCameraIntro( now ) {

	if ( cameraIntroStartTime === null ) return;
	const progress = Math.min( 1, ( now - cameraIntroStartTime ) / 4000 );
	const eased = smootherstep( 0, 1, progress );
	camera.position.lerpVectors( CAMERA_WIDE_POSITION, CAMERA_FINAL_POSITION, eased );
	controls.target.lerpVectors( CAMERA_WIDE_TARGET, CAMERA_FINAL_TARGET, eased );
	controls.update();
	volumeCompositor?.resetHistory();
	if ( progress >= 1 ) cameraIntroStartTime = null;

}

function terrainHeight( x, z ) {

	const radius = Math.hypot( x, z );
	const angle = Math.atan2( z, x );
	const clearing = smootherstep( 3.8, 9.5, radius );
	const bowl = Math.pow( Math.min( radius / 60, 1 ), 1.45 ) * 1.45;
	const rolling = Math.sin( radius * 0.22 + Math.sin( angle * 3 ) * 0.8 ) * 0.48
		+ Math.sin( x * 0.17 - z * 0.11 ) * 0.32
		+ Math.cos( x * 0.07 + z * 0.13 ) * 0.22;
	return ( bowl + rolling * ( 0.35 + Math.min( radius / 35, 1 ) * 0.65 ) ) * clearing - 0.04;

}

function ringAt( center, tangent, radius, pointCount, random, jitter = 0, phase = 0 ) {

	const direction = tangent.clone().normalize();
	const helper = Math.abs( direction.z ) < 0.92 ? new THREE.Vector3( 0, 0, 1 ) : new THREE.Vector3( 1, 0, 0 );
	const normal = new THREE.Vector3().crossVectors( direction, helper ).normalize();
	const binormal = new THREE.Vector3().crossVectors( normal, direction ).normalize();
	const points = [];
	for ( let index = 0; index < pointCount; index ++ ) {

		const angle = index / pointCount * Math.PI * 2 + phase;
		const localRadius = radius * ( 1 + ( random() - 0.5 ) * jitter );
		points.push( center.clone()
			.addScaledVector( normal, Math.sin( angle ) * localRadius )
			.addScaledVector( binormal, Math.cos( angle ) * localRadius ) );

	}
	return points;

}

function loftAlongPath( points, radii, { pointCount = 10, random = mulberry32( 1 ), jitter = 0, capStart = true, capEnd = true } = {} ) {

	const sections = points.map( ( point, index ) => {

		const previous = points[ Math.max( 0, index - 1 ) ];
		const next = points[ Math.min( points.length - 1, index + 1 ) ];
		const tangent = next.clone().sub( previous );
		return ringAt( point, tangent, radii[ index ], pointCount, random, jitter );

	} );
	return new LoftGeometry( sections, { capStart, capEnd } );

}

function transformGeometry( geometry, position, yaw = 0, scale = 1, quaternion = null ) {

	const rotation = quaternion || new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), yaw );
	const objectScale = scale?.isVector3 ? scale : new THREE.Vector3( scale, scale, scale );
	geometry.applyMatrix4( new THREE.Matrix4().compose( position, rotation, objectScale ) );
	return geometry;

}

function createTerrainGeometry() {

	const ringCount = 16;
	const pointCount = 48;
	const sections = [];
	for ( let ringIndex = 0; ringIndex < ringCount; ringIndex ++ ) {

		const t = ringIndex / ( ringCount - 1 );
		const radius = THREE.MathUtils.lerp( 0.9, 60, Math.pow( t, 1.7 ) );
		const section = [];
		for ( let pointIndex = 0; pointIndex < pointCount; pointIndex ++ ) {

			const angle = pointIndex / pointCount * Math.PI * 2;
			const angularWarp = 1 + Math.sin( angle * 5 + radius * 0.12 ) * 0.018;
			const x = Math.sin( angle ) * radius * angularWarp;
			const z = Math.cos( angle ) * radius * angularWarp;
			section.push( new THREE.Vector3( x, terrainHeight( x, z ), z ) );

		}
		sections.push( section );

	}
	return new LoftGeometry( sections, { capStart: true } );

}

function createFirGeometry( seed ) {

	const random = mulberry32( seed );
	const height = THREE.MathUtils.lerp( 11.5, 14.5, random() );
	const lean = new THREE.Vector3( ( random() - 0.5 ) * 0.5, 0, ( random() - 0.5 ) * 0.5 );
	const trunkPoints = [];
	const trunkRadii = [];
	for ( let index = 0; index < 6; index ++ ) {

		const t = index / 5;
		trunkPoints.push( new THREE.Vector3( lean.x * Math.pow( t, 1.45 ), height * t, lean.z * Math.pow( t, 1.45 ) ) );
		trunkRadii.push( THREE.MathUtils.lerp( 0.52, 0.12, Math.pow( t, 0.75 ) ) * ( index === 0 ? 1.25 : 1 ) );

	}
	const trunk = loftAlongPath( trunkPoints, trunkRadii, { pointCount: 10, random, jitter: 0.12 } );

	const canopyRadius = THREE.MathUtils.lerp( 2.45, 2.95, random() );
	const canopySections = [];
	const radialJitter = Array.from( { length: 12 }, () => ( random() - 0.5 ) * 0.15 );
	const baseY = height * 0.22;
	const tierCount = 5;
	const tierHeight = ( height - baseY - 0.25 ) / tierCount;
	for ( let tier = 0; tier < tierCount; tier ++ ) {

		const taper = 1 - tier / tierCount * 0.72;
		const skirtRadius = canopyRadius * taper;
		const centerOffset = lean.clone().multiplyScalar( ( baseY + tier * tierHeight ) / height );
		const skirt = [];
		const pulled = [];
		for ( let pointIndex = 0; pointIndex < 12; pointIndex ++ ) {

			const angle = pointIndex / 12 * Math.PI * 2;
			const radius = skirtRadius * ( 1 + radialJitter[ pointIndex ] );
			const droop = 0.12 + ( pointIndex % 2 ) * 0.08 + Math.abs( radialJitter[ pointIndex ] ) * 0.6;
			skirt.push( new THREE.Vector3(
				centerOffset.x + Math.sin( angle ) * radius,
				baseY + tier * tierHeight - droop,
				centerOffset.z + Math.cos( angle ) * radius
			) );
			pulled.push( new THREE.Vector3(
				centerOffset.x + Math.sin( angle ) * radius * 0.34,
				baseY + ( tier + 0.56 ) * tierHeight,
				centerOffset.z + Math.cos( angle ) * radius * 0.34
			) );

		}
		canopySections.push( skirt, pulled );

	}
	const tipCenter = lean.clone();
	tipCenter.y = height;
	canopySections.push( Array.from( { length: 12 }, ( _, pointIndex ) => {

		const angle = pointIndex / 12 * Math.PI * 2;
		return new THREE.Vector3( tipCenter.x + Math.sin( angle ) * 0.1, tipCenter.y, tipCenter.z + Math.cos( angle ) * 0.1 );

	} ) );
	const canopy = new LoftGeometry( canopySections, { capStart: true, capEnd: true } );
	return { trunk, canopy, canopyRadius, height };

}

function createDeciduousGeometry( seed ) {

	const random = mulberry32( seed );
	const height = THREE.MathUtils.lerp( 10.5, 13.5, random() );
	const lean = new THREE.Vector3( ( random() - 0.5 ) * 0.9, 0, ( random() - 0.5 ) * 0.9 );
	const trunkPoints = [];
	const trunkRadii = [];
	for ( let index = 0; index < 7; index ++ ) {

		const t = index / 6;
		trunkPoints.push( new THREE.Vector3(
			lean.x * Math.pow( t, 1.35 ) + Math.sin( t * Math.PI ) * 0.18,
			height * t,
			lean.z * Math.pow( t, 1.35 ) + Math.sin( t * Math.PI * 1.4 ) * 0.14
		) );
		trunkRadii.push( THREE.MathUtils.lerp( 0.58, 0.11, Math.pow( t, 0.82 ) ) * ( index === 0 ? 1.3 : 1 ) );

	}
	const geometries = [ loftAlongPath( trunkPoints, trunkRadii, { pointCount: 10, random, jitter: 0.14 } ) ];
	const branchCount = 5;
	for ( let branchIndex = 0; branchIndex < branchCount; branchIndex ++ ) {

		const startT = 0.43 + branchIndex * 0.085;
		const start = new THREE.Vector3( lean.x * startT, height * startT, lean.z * startT );
		const angle = branchIndex / branchCount * Math.PI * 2 + random() * 0.7;
		const reach = THREE.MathUtils.lerp( 2.2, 3.7, random() );
		const rise = THREE.MathUtils.lerp( 2.3, 4.2, random() );
		const end = start.clone().add( new THREE.Vector3( Math.sin( angle ) * reach, rise, Math.cos( angle ) * reach ) );
		const control = start.clone().lerp( end, 0.5 ).add( new THREE.Vector3( 0, 0.7 + random() * 0.8, 0 ) );
		const points = [];
		const radii = [];
		for ( let pointIndex = 0; pointIndex < 6; pointIndex ++ ) {

			const t = pointIndex / 5;
			const oneMinusT = 1 - t;
			points.push( start.clone().multiplyScalar( oneMinusT * oneMinusT )
				.addScaledVector( control, 2 * oneMinusT * t )
				.addScaledVector( end, t * t ) );
			radii.push( THREE.MathUtils.lerp( 0.2, 0.035, Math.pow( t, 0.72 ) ) );

		}
		geometries.push( loftAlongPath( points, radii, { pointCount: 8, random, jitter: 0.16, capStart: false, capEnd: true } ) );

	}
	return { trunk: mergeGeometries( geometries ), canopyRadius: 3.9, height };

}

function createRockGeometry( seed, radius = 0.7, height = 0.55 ) {

	const random = mulberry32( seed );
	const pointCount = 9;
	const radialJitter = Array.from( { length: pointCount }, () => THREE.MathUtils.lerp( 0.78, 1.15, random() ) );
	const sections = [ 0, 0.18, 0.68, 1 ].map( ( t, ringIndex ) => {

		const ringRadius = radius * [ 0.62, 1, 0.82, 0.35 ][ ringIndex ];
		return Array.from( { length: pointCount }, ( _, pointIndex ) => {

			const angle = pointIndex / pointCount * Math.PI * 2;
			const localRadius = ringRadius * radialJitter[ pointIndex ];
			return new THREE.Vector3( Math.sin( angle ) * localRadius, t * height, Math.cos( angle ) * localRadius );

		} );

	} );
	return new LoftGeometry( sections, { capStart: true, capEnd: true } );

}

function createLogGeometry( seed, length = 3.2, radius = 0.24 ) {

	const random = mulberry32( seed );
	const points = [];
	const radii = [];
	for ( let index = 0; index < 5; index ++ ) {

		const t = index / 4;
		points.push( new THREE.Vector3( 0, Math.sin( t * Math.PI ) * 0.12, ( t - 0.5 ) * length ) );
		radii.push( radius * ( 0.84 + Math.sin( t * Math.PI ) * 0.16 ) );

	}
	return loftAlongPath( points, radii, { pointCount: 9, random, jitter: 0.12 } );

}

function createStumpGeometry( seed, height = 1.3 ) {

	const random = mulberry32( seed );
	const lean = new THREE.Vector3( ( random() - 0.5 ) * 0.13, 0, ( random() - 0.5 ) * 0.13 );
	const points = [];
	const radii = [];
	for ( let index = 0; index < 4; index ++ ) {

		const t = index / 3;
		points.push( new THREE.Vector3( lean.x * t, height * t, lean.z * t ) );
		radii.push( THREE.MathUtils.lerp( 0.52, 0.35, t ) * ( index === 0 ? 1.2 : 1 ) );

	}
	return loftAlongPath( points, radii, { pointCount: 10, random, jitter: 0.13, capStart: true, capEnd: true } );

}

function addMergedSceneMesh( name, geometries, material, { castShadow = true, receiveShadow = true } = {} ) {

	const geometry = geometries.length === 1 ? geometries[ 0 ] : mergeGeometries( geometries );
	if ( ! geometry ) throw new Error( `Unable to merge ${name} geometry.` );
	const object = new THREE.Mesh( geometry, material );
	object.name = name;
	object.castShadow = castShadow;
	object.receiveShadow = receiveShadow;
	scene.add( object );
	sceneGeometryStats.drawCalls ++;
	sceneGeometryStats.triangles += geometry.index ? geometry.index.count / 3 : geometry.getAttribute( 'position' ).count / 3;
	return object;

}

function createForestScene() {

	sceneGeometryStats = { trees: 0, drawCalls: 0, triangles: 0 };
	const terrainMaterial = new THREE.MeshStandardNodeMaterial( { roughness: 0.98, metalness: 0 } );
	const slope = normalWorldGeometry.y.clamp();
	const clearing = smoothstep( 3.2, 10, positionWorld.xz.length() );
	const highGround = smoothstep( 0.1, 2.2, positionWorld.y );
	const dirt = color( 0x40342a );
	const moss = color( 0x34463a );
	const duff = color( 0x1a2425 );
	terrainMaterial.colorNode = mix( dirt, moss, slope.mul( clearing ).mul( 0.72 ) ).mix( duff, highGround.mul( 0.72 ) );
	addMergedSceneMesh( 'Clearing terrain', [ createTerrainGeometry() ], terrainMaterial, { castShadow: false } );

	const trunkMaterial = new THREE.MeshStandardNodeMaterial( { roughness: 0.94, metalness: 0 } );
	const barkVariation = hash( positionWorld.x.mul( 0.31 ).add( positionWorld.z.mul( 0.17 ) ).floor() );
	trunkMaterial.colorNode = mix( color( 0x241a17 ), color( 0x443229 ), barkVariation.mul( 0.55 ) );

	const canopyMaterial = new THREE.MeshStandardNodeMaterial( { roughness: 0.92, metalness: 0, flatShading: true } );
	const canopyVariation = hash( positionWorld.x.mul( 0.17 ).add( positionWorld.z.mul( 0.29 ) ).floor() );
	const canopyHeight = smoothstep( 2.2, 15, positionWorld.y );
	canopyMaterial.colorNode = mix( color( 0x152328 ), color( 0x30463e ), canopyVariation.mul( 0.45 ).add( canopyHeight.mul( 0.22 ) ) );
	const swayPhase = positionLocal.x.mul( 0.23 ).add( positionLocal.z.mul( 0.17 ) ).add( sceneTime.mul( 0.72 ) );
	const swayAmount = smoothstep( 2.5, 14, positionLocal.y ).mul( swayPhase.sin() ).mul( canopySway );
	canopyMaterial.positionNode = positionLocal.add( canopyWindDirection.mul( swayAmount ) );

	const rockMaterial = new THREE.MeshStandardNodeMaterial( { roughness: 0.93, metalness: 0, flatShading: true } );
	const rockVariation = hash( positionWorld.x.mul( 0.51 ).add( positionWorld.z.mul( 0.37 ) ).floor() );
	rockMaterial.colorNode = mix( color( 0x3c4048 ), color( 0x5a554c ), rockVariation.mul( 0.45 ) );

	const logMaterial = new THREE.MeshStandardNodeMaterial( { roughness: 0.9, metalness: 0, flatShading: true } );
	const logTip = uv().x.sub( 0.5 ).abs().mul( 2 ).smoothstep( 0.52, 0.98 );
	logMaterial.colorNode = mix( color( 0x291812 ), color( 0x090807 ), logTip );
	logMaterial.emissiveNode = color( 0xff5f19 ).mul( logTip.oneMinus().pow( 3 ) ).mul( emberGlow ).mul( 0.72 );

	const emberMaterial = new THREE.MeshStandardNodeMaterial( { roughness: 0.82, metalness: 0, flatShading: true } );
	emberMaterial.colorNode = mix( color( 0x33110a ), color( 0xff6a1c ), emberGlow.mul( 0.32 ).clamp() );
	emberMaterial.emissiveNode = mix( color( 0xff2b08 ), color( 0xffb45f ), emberGlow.mul( 0.55 ).clamp() ).mul( emberGlow ).mul( 1.8 );

	const trunkGeometries = [];
	const canopyGeometries = [];
	const rockGeometries = [];
	const fireLogGeometries = [];
	const emberGeometries = [];
	const random = mulberry32( 1337 );
	const placements = [];
	const cameraSideAngle = Math.atan2( CAMERA_FINAL_POSITION.x, CAMERA_FINAL_POSITION.z );
	const gapHalfAngle = 0.72;
	const ringTreeCount = 16;
	for ( let index = 0; index < ringTreeCount; index ++ ) {

		const angle = cameraSideAngle + gapHalfAngle + 0.18 + ( Math.PI * 2 - gapHalfAngle * 2 - 0.36 ) * index / ( ringTreeCount - 1 ) + ( random() - 0.5 ) * 0.22;
		const radius = THREE.MathUtils.lerp( 15.5, 20, random() );
		placements.push( { x: Math.sin( angle ) * radius, z: Math.cos( angle ) * radius, bare: [ 3, 9, 13 ].includes( index ) } );

	}
	placements.push(
		{ x: Math.sin( cameraSideAngle - 0.78 ) * 15, z: Math.cos( cameraSideAngle - 0.78 ) * 15, bare: false, framer: true },
		{ x: Math.sin( cameraSideAngle + 0.78 ) * 15, z: Math.cos( cameraSideAngle + 0.78 ) * 15, bare: false, framer: true }
	);
	let warnedAboutDomainOverlap = false;
	placements.forEach( ( placement, index ) => {

		const scale = ( placement.framer ? 1.12 : THREE.MathUtils.lerp( 0.82, 1.2, random() ) );
		const yaw = random() * Math.PI * 2;
		const position = new THREE.Vector3( placement.x, terrainHeight( placement.x, placement.z ), placement.z );
		const tree = placement.bare ? createDeciduousGeometry( 4100 + index * 97 ) : createFirGeometry( 2100 + index * 73 );
		transformGeometry( tree.trunk, position, yaw, scale );
		trunkGeometries.push( tree.trunk );
		if ( tree.canopy ) {

			transformGeometry( tree.canopy, position, yaw, scale );
			canopyGeometries.push( tree.canopy );

		}
		const canopyRadius = tree.canopyRadius * scale;
		const overlapsDomainXZ = Math.abs( placement.x ) - canopyRadius < SHOWCASE_DOMAIN_SCALE.x * 0.5
			&& Math.abs( placement.z ) - canopyRadius < SHOWCASE_DOMAIN_SCALE.z * 0.5;
		if ( overlapsDomainXZ && ! warnedAboutDomainOverlap ) {

			console.warn( 'Smoke forest tree canopy overlaps the simulation domain.', { placement, canopyRadius } );
			warnedAboutDomainOverlap = true;

		}
		sceneGeometryStats.trees ++;

	} );

	for ( let index = 0; index < 3; index ++ ) {

		const angle = [ 2.45, 3.72, 5.15 ][ index ];
		const radius = [ 9.8, 12.7, 10.6 ][ index ];
		const x = Math.sin( angle ) * radius;
		const z = Math.cos( angle ) * radius;
		const stump = createStumpGeometry( 6000 + index * 31, 1.25 + index * 0.18 );
		transformGeometry( stump, new THREE.Vector3( x, terrainHeight( x, z ), z ), random() * Math.PI * 2, 0.85 );
		trunkGeometries.push( stump );

	}
	const fallenLog = createLogGeometry( 7001, 5.8, 0.38 );
	const fallenQuaternion = new THREE.Quaternion().setFromEuler( new THREE.Euler( 0.1, - 0.85, Math.PI * 0.48 ) );
	transformGeometry( fallenLog, new THREE.Vector3( - 7.8, terrainHeight( - 7.8, - 7.2 ) + 0.42, - 7.2 ), 0, 1, fallenQuaternion );
	trunkGeometries.push( fallenLog );

	for ( let index = 0; index < 7; index ++ ) {

		const angle = index / 7 * Math.PI * 2 + 0.16;
		const radius = 1.35;
		const rock = createRockGeometry( 8000 + index * 19, 0.48 + random() * 0.11, 0.38 + random() * 0.16 );
		transformGeometry( rock, new THREE.Vector3( Math.sin( angle ) * radius, - 0.02, Math.cos( angle ) * radius ), angle, new THREE.Vector3( 1.15, 0.8, 0.9 ) );
		rockGeometries.push( rock );

	}
	for ( let index = 0; index < 6; index ++ ) {

		const angle = random() * Math.PI * 2;
		const radius = THREE.MathUtils.lerp( 5.5, 10.5, random() );
		const x = Math.sin( angle ) * radius;
		const z = Math.cos( angle ) * radius;
		const rock = createRockGeometry( 9000 + index * 23, 0.45 + random() * 0.55, 0.35 + random() * 0.7 );
		transformGeometry( rock, new THREE.Vector3( x, terrainHeight( x, z ) - 0.03, z ), random() * Math.PI * 2, new THREE.Vector3( 1, 0.72 + random() * 0.35, 0.82 + random() * 0.32 ) );
		rockGeometries.push( rock );

	}

	for ( let index = 0; index < 4; index ++ ) {

		const angle = index / 4 * Math.PI + 0.25;
		const log = createLogGeometry( 10000 + index * 29, 3.15, 0.22 );
		const quaternion = new THREE.Quaternion().setFromEuler( new THREE.Euler( Math.sin( angle ) * 0.45, angle, Math.cos( angle ) * 0.36 ) );
		transformGeometry( log, new THREE.Vector3( 0, 0.52, 0 ), 0, 1, quaternion );
		fireLogGeometries.push( log );

	}
	const emberBed = new LoftGeometry( [
		Array.from( { length: 16 }, ( _, index ) => new THREE.Vector3( Math.sin( index / 16 * Math.PI * 2 ) * 0.78, 0.08, Math.cos( index / 16 * Math.PI * 2 ) * 0.78 ) ),
		Array.from( { length: 16 }, ( _, index ) => new THREE.Vector3( Math.sin( index / 16 * Math.PI * 2 ) * 0.68, 0.18, Math.cos( index / 16 * Math.PI * 2 ) * 0.68 ) ),
	], { capStart: true, capEnd: true } );
	emberGeometries.push( emberBed );
	for ( let index = 0; index < 9; index ++ ) {

		const angle = random() * Math.PI * 2;
		const radius = random() * 0.65;
		const coal = createRockGeometry( 11000 + index * 17, 0.12 + random() * 0.11, 0.12 + random() * 0.1 );
		transformGeometry( coal, new THREE.Vector3( Math.sin( angle ) * radius, 0.13, Math.cos( angle ) * radius ), angle, new THREE.Vector3( 1.4, 0.65, 1 ) );
		emberGeometries.push( coal );

	}

	addMergedSceneMesh( 'Trees and deadwood', trunkGeometries, trunkMaterial );
	addMergedSceneMesh( 'Fir canopies', canopyGeometries, canopyMaterial );
	addMergedSceneMesh( 'Forest rocks and fire ring', rockGeometries, rockMaterial );
	addMergedSceneMesh( 'Charred firewood', fireLogGeometries, logMaterial );
	addMergedSceneMesh( 'Ember bed', emberGeometries, emberMaterial, { castShadow: false } );

	if ( sceneGeometryStats.drawCalls > 6 || sceneGeometryStats.triangles > 30000 ) {

		console.warn( 'Smoke forest geometry exceeded its presentation budget.', sceneGeometryStats );

	}
	return sceneGeometryStats;

}

function createSparkField() {

	const count = 180;
	const random = mulberry32( 71237 );
	const seeds = new Float32Array( count * 3 );
	for ( let index = 0; index < count; index ++ ) {

		const offset = index * 3;
		seeds[ offset ] = random() * 2 - 1;
		seeds[ offset + 1 ] = random();
		seeds[ offset + 2 ] = random() * 2 - 1;

	}
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute( 'position', new THREE.BufferAttribute( seeds, 3 ) );
	const material = new THREE.PointsNodeMaterial( {
		transparent: true,
		depthWrite: false,
		depthTest: true,
		blending: THREE.AdditiveBlending,
		size: 1,
		vertexColors: false,
	} );
	const sparkSeed = hash( positionLocal.x.mul( 97 ).add( positionLocal.z.mul( 193 ) ) );
	const sparkAge = sceneTime.mul( 0.82 ).add( positionLocal.y ).add( sparkSeed.mul( 0.37 ) ).fract();
	const sparkCurl = vec3(
		sceneTime.mul( 4.1 ).add( sparkSeed.mul( 19 ) ).sin(),
		0,
		sceneTime.mul( 3.3 ).add( sparkSeed.mul( 31 ) ).cos()
	).mul( sparkAge.mul( sparkAge ).mul( 0.46 ) );
	material.positionNode = vec3(
		positionLocal.x.mul( 0.62 ),
		sparkAge.mul( 4.6 ).add( 0.2 ),
		positionLocal.z.mul( 0.62 )
	).add( sparkCurl );
	const sparkLife = smoothstep( 0.02, 0.12, sparkAge )
		.mul( smoothstep( 0.58, 1, sparkAge ).oneMinus() )
		.mul( smoothstep( 0.48, 0.82, emberGlow ) )
		.mul( smoothstep( 0.28, 0.72, sparkSeed ) );
	material.colorNode = mix( color( 0xff6b24 ), color( 0xfff0c5 ), sparkAge.oneMinus().pow( 3 ) );
	material.opacityNode = sparkLife;
	const points = new THREE.Points( geometry, material );
	points.name = 'GPU campfire sparks';
	points.frustumCulled = false;
	scene.add( points );

}

function setMoonDirection( direction ) {

	const normalized = direction.clone().normalize();
	skyMoonDirection.value.copy( normalized );
	if ( moonLight ) {

		moonLight.position.copy( normalized ).multiplyScalar( 28 );
		moonLight.target.position.set( 0, 3.5, 0 );
		moonLight.target.updateMatrixWorld();

	}
	if ( fluid ) fluid.setLightDirection( normalized );
	if ( mesh ) syncSmokeShadowTransform( normalized );
	if ( renderer?.shadowMap ) renderer.shadowMap.needsUpdate = true;

}

function syncSmokeShadowTransform( lightDirection = fluid?.lightDirection?.value ) {

	if ( ! mesh ) return;
	mesh.updateMatrixWorld( true );
	tmpDomainMatrix.copy( mesh.matrixWorld ).invert();
	smokeWorldToDomain.value.copy( tmpDomainMatrix );
	if ( lightDirection ) smokeShadowLightDirLocal.value.copy( lightDirection ).transformDirection( tmpDomainMatrix );

}

function setupSmokeSceneShadow() {

	if ( ! material.textures.lightOpticalDepth ) return;
	const smokeShadowNode = volumeSmokeShadow( {
		opticalDepthTexture: material.textures.lightOpticalDepth,
		worldToDomain: smokeWorldToDomain,
		lightDirLocal: smokeShadowLightDirLocal,
		strength: material.smokeUniforms.densityBoost
			.mul( material.smokeUniforms.absorption )
			.mul( material.smokeUniforms.shadowIntensity )
			.mul( smokeGroundShadowStrength ),
	} );
	scene.traverse( object => {

		const sceneMaterial = object.material;
		if ( sceneMaterial?.isMeshStandardNodeMaterial !== true ) return;
		sceneMaterial.receivedShadowNode = Fn( ( [ sceneShadow ] ) => sceneShadow.mul( smokeShadowNode( positionWorld ) ) );
		sceneMaterial.needsUpdate = true;

	} );

}

function moonDirectionFromAngles( azimuth, elevation, target = new THREE.Vector3() ) {

	const heading = THREE.MathUtils.degToRad( azimuth );
	const altitude = THREE.MathUtils.degToRad( elevation );
	return target.set(
		Math.sin( heading ) * Math.cos( altitude ),
		Math.sin( altitude ),
		Math.cos( heading ) * Math.cos( altitude )
	).normalize();

}

function updateWindDirection() {

	if ( ! uiState || ! fluid ) return;
	const heading = THREE.MathUtils.degToRad( uiState.windHeading );
	const tilt = THREE.MathUtils.degToRad( THREE.MathUtils.clamp( uiState.windStrength, 0, 7 ) );
	tmpWindDirection.set(
		Math.sin( heading ) * Math.sin( tilt ),
		Math.cos( tilt ),
		Math.cos( heading ) * Math.sin( tilt )
	).normalize();
	fluid.setBuoyancyDirection( tmpWindDirection );
	const horizontalLength = Math.hypot( tmpWindDirection.x, tmpWindDirection.z );
	if ( horizontalLength > 1e-5 ) canopyWindDirection.value.set( tmpWindDirection.x / horizontalLength, 0, tmpWindDirection.z / horizontalLength );
	canopySway.value = uiState.treeSway;
	uiState.buoyancyX = tmpWindDirection.x;
	uiState.buoyancyY = tmpWindDirection.y;
	uiState.buoyancyZ = tmpWindDirection.z;

}

function updateSceneAnimation() {

	sceneTime.value = plumeTime;
	if ( ! uiState || ! emberLight ) return;
	const flicker = 0.82 + Math.sin( plumeTime * 8.7 ) * 0.09 + Math.sin( plumeTime * 17.3 + 1.7 ) * 0.055;
	const flickerAmount = THREE.MathUtils.clamp( uiState.emberFlicker, 0, 1 );
	const intensityScale = THREE.MathUtils.lerp( 1, flicker, flickerAmount );
	emberLight.intensity = uiState.emberIntensity * intensityScale;
	emberLight.position.set(
		Math.sin( plumeTime * 13.1 ) * 0.035 * flickerAmount,
		0.62 + Math.sin( plumeTime * 9.3 ) * 0.025 * flickerAmount,
		Math.cos( plumeTime * 11.7 ) * 0.035 * flickerAmount
	);
	emberGlow.value = THREE.MathUtils.lerp( 0.78, 1.12, intensityScale );
	material.smokeUniforms.fireIntensity.value = uiState.fireIntensity * intensityScale;
	canopySway.value = uiState.treeSway * ( 0.82 + intensityScale * 0.24 );

}

function setupDuskScene() {

	const skyY = normalWorldGeometry.y.clamp( - 1, 1 );
	const skyGradient = smoothstep( - 0.2, 0.78, skyY );
	const horizonBand = smoothstep( - 0.12, 0.035, skyY ).mul( smoothstep( 0.31, 0.045, skyY ) );
	const horizon = color( 0x0c1a24 );
	const zenith = color( 0x020612 );
	const afterglow = color( 0x394346 );
	const skyDirection = normalWorldGeometry.normalize();
	const moonAlignment = skyDirection.dot( skyMoonDirection );
	const moonDisc = smoothstep( 0.9992, 0.99972, moonAlignment );
	const moonHalo = smoothstep( 0.972, 0.9994, moonAlignment ).mul( moonDisc.oneMinus() ).pow( 1.7 );
	scene.background = null;
	scene.backgroundNode = mix( mix( horizon, zenith, skyGradient ), afterglow, horizonBand.mul( 0.58 ) )
		.add( skyMoonColor.mul( moonHalo ).mul( skyMoonIntensity ).mul( 0.12 ) )
		.add( skyMoonColor.mul( moonDisc ).mul( skyMoonIntensity ).mul( 2.1 ) );
	scene.fog = new THREE.FogExp2( sharedFogColor.value, sharedFogDensity.value );

	moonLight = new THREE.DirectionalLight( 0x8fb3e6, 3.1 );
	moonLight.name = 'Moonlight';
	moonLight.castShadow = true;
	moonLight.shadow.mapSize.set( 2048, 2048 );
	moonLight.shadow.camera.left = - 24;
	moonLight.shadow.camera.right = 24;
	moonLight.shadow.camera.top = 24;
	moonLight.shadow.camera.bottom = - 24;
	moonLight.shadow.camera.near = 1;
	moonLight.shadow.camera.far = 70;
	moonLight.shadow.bias = - 0.00035;
	moonLight.shadow.normalBias = 0.035;
	// Keep the shared shadow node on forest geometry when the main camera temporarily
	// renders the volume-only layer.
	moonLight.shadow.camera.layers.set( 0 );
	moonLight.shadow.camera.layers.enable( 2 );
	scene.add( moonLight, moonLight.target );

	const hemisphere = new THREE.HemisphereLight( 0x294a75, 0x0e1013, 0.78 );
	hemisphere.name = 'Blue-hour fill';
	scene.add( hemisphere );

	emberLight = new THREE.PointLight( 0xff9345, 72, 13, 2 );
	emberLight.name = 'Dying fire';
	emberLight.position.set( 0, 0.62, 0 );
	emberLight.castShadow = false;
	scene.add( emberLight );

	setMoonDirection( moonDirectionFromAngles( - 88, 26 ) );
	createForestScene();
	createSparkField();

}

export async function mount( containerElement, {
	quality,
	autoQuality = true,
	autoStart: shouldAutoStart = true,
	initializationSteps: warmupSteps = 180,
	debug = false,
	grid = {},
} = {} ) {

	container = containerElement;
	requestedQualityTier = typeof quality === 'string' ? quality.toUpperCase() : undefined;
	autoQualityEnabled = autoQuality !== false;
	debugGui = debug === true;
	autoStart = shouldAutoStart !== false;
	initializationSteps = THREE.MathUtils.clamp( Math.round( Number( warmupSteps ) || 0 ), 0, 180 );
	const automaticTier = window.matchMedia( '(pointer: coarse)' ).matches || window.innerWidth < 720 ? 'LOW' : 'HIGH';
	activeQualityTier = Object.hasOwn( QUALITY_TIERS, requestedQualityTier ) ? requestedQualityTier : automaticTier;
	activeQuality = QUALITY_TIERS[ activeQualityTier ];
	activePreset = 'Dying Fire';
	qualityProbeElapsed = 0;
	qualityProbeFrames = 0;
	qualityProbeCooldown = 2;
	plumeTime = 0;
	fogEmissionFrame = 0;
	simulationAccumulator = 0;
	volumeResolutionScale = activeQuality.volumeScale;
	const finiteGridOption = ( name, fallback, min, max ) => {

		const value = Number( grid[ name ] );
		return Number.isFinite( value ) ? THREE.MathUtils.clamp( value, min, max ) : fallback;

	};
	gridSettings = {
		simRes: Math.round( finiteGridOption( 'simRes', activeQuality.simRes, 8, 256 ) ),
		dyeRes: Math.round( finiteGridOption( 'dyeRes', activeQuality.dyeRes, 8, 256 ) ),
		turbulenceResolutionScale: finiteGridOption( 'turbulenceResolutionScale', 0.5, 0.125, 1 ),
		occupancyBlockSize: Math.round( finiteGridOption( 'occupancyBlockSize', 4, 1, 16 ) ),
		lightRes: Math.round( finiteGridOption( 'lightRes', 64, 4, 128 ) ),
		maxSplatSources: Math.round( finiteGridOption( 'maxSplatSources', 64, 1, 256 ) ),
		subcellSolidFractions: grid.subcellSolidFractions === true,
	};

	if ( WebGPU.isAvailable() === false ) {

		container.appendChild( WebGPU.getErrorMessage() );
		throw new Error( 'No WebGPU support' );

	}

	const handle = await init();
	return { ...handle, dispose: unmount };

}

async function init() {

	container.style.position = 'relative';
	container.style.overflow = 'hidden';
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 1000 );
	camera.position.copy( CAMERA_FINAL_POSITION );

	renderer = new THREE.WebGPURenderer( { antialias: true } );
	devtools = registerDevtools( { renderer, container } );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
	renderer.setSize( window.innerWidth, window.innerHeight );
	// The scene pass, volume target, bloom, and grade remain linear HDR. ACES runs once,
	// at the end of the render pipeline, after smoke has been composited with the scene.
	renderer.toneMapping = THREE.NoToneMapping;
	renderer.toneMappingExposure = 1.12;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.autoUpdate = false;
	renderer.shadowMap.needsUpdate = true;
	container.appendChild( renderer.domElement );
	await renderer.init();
	setupDuskScene();
	scenePass = pass( scene, camera );
	scenePass.setLayers( OPAQUE_SCENE_LAYERS );
	scenePass.setMRT( mrt( { output, velocity } ) );
	// Scene depth keeps the PassNode dependency on the volume material. Sample the
	// completed color attachment as a plain texture in the final graph so the pass is
	// not scheduled a second time from inside the smoke reconstruction/composite flow.
	sceneColorNode = texture( scenePass.getTexture( 'output' ) );
	sceneDepthNode = scenePass.getTextureNode( 'depth' );
	const moonShadowNode = shadow( moonLight );
	moonLight.shadow.shadowNode = moonShadowNode;
	volumeSceneShadowNode = Fn( ( [ worldPosition ] ) => moonShadowNode.context( { shadowPositionWorld: worldPosition } ).r );




	controls = new OrbitControls( camera, renderer.domElement );
	controls.target.copy( CAMERA_FINAL_TARGET );
	controls.enableDamping = true;
	controls.dampingFactor = 0.06;
	controls.autoRotate = false;
	controls.autoRotateSpeed = 0.35;
	controls.enablePan = false;
	controls.minDistance = 10;
	controls.maxDistance = 55;
	controls.maxPolarAngle = Math.PI * 0.58;
	controls.update();
	controls.enabled = true;
	raycaster = new THREE.Raycaster();
	mouse = new THREE.Vector2();
	const previousPointer = new THREE.Vector2();
	const localPointerRay = new THREE.Ray();
	const localPointerOrigin = new THREE.Vector3();
	const localPointerDirection = new THREE.Vector3();
	const localPointerPoint = new THREE.Vector3();
	const cameraRight = new THREE.Vector3();
	const cameraUp = new THREE.Vector3();
	let previousPointerReady = false;
	const rayBoxSegment = ( ray ) => {

		let near = - Infinity;
		let far = Infinity;
		for ( const axis of [ 'x', 'y', 'z' ] ) {

			const origin = ray.origin[ axis ];
			const direction = ray.direction[ axis ];
			if ( Math.abs( direction ) < 1e-6 ) {

				if ( origin < - 0.5 || origin > 0.5 ) return null;
				continue;

			}
			let first = ( - 0.5 - origin ) / direction;
			let second = ( 0.5 - origin ) / direction;
			if ( first > second ) [ first, second ] = [ second, first ];
			near = Math.max( near, first );
			far = Math.min( far, second );
			if ( far < near ) return null;

		}
		return far >= Math.max( near, 0 ) ? [ Math.max( near, 0 ), far ] : null;

	};

	// Prevent scrolling on mobile
	container.style.touchAction = 'none';

	const onPointerMove = ( e ) => {

		if ( e.isPrimary === false ) return;

		const rect = renderer.domElement.getBoundingClientRect();
		mouse.x = ( ( e.clientX - rect.left ) / rect.width ) * 2 - 1;
		mouse.y = - ( ( e.clientY - rect.top ) / rect.height ) * 2 + 1;

		if ( ! previousPointerReady ) {

			previousPointer.set( e.clientX, e.clientY );
			previousPointerReady = true;
			return;

		}
		const deltaX = ( e.clientX - previousPointer.x ) / Math.max( rect.width, 1 );
		const deltaY = ( e.clientY - previousPointer.y ) / Math.max( rect.height, 1 );
		previousPointer.set( e.clientX, e.clientY );
		// Touch has no hover state, so let its drag stir while pressed mouse
		// movement remains reserved for OrbitControls.
		if ( ( e.pointerType !== 'touch' && e.buttons !== 0 ) || ! mesh || ! fluid ) return;
		raycaster.setFromCamera( mouse, camera );
		mesh.updateMatrixWorld();
		localPointerOrigin.copy( raycaster.ray.origin );
		mesh.worldToLocal( localPointerOrigin );
		localPointerDirection.copy( raycaster.ray.direction ).transformDirection( tmpDomainMatrix );
		localPointerRay.set( localPointerOrigin, localPointerDirection );
		const segment = rayBoxSegment( localPointerRay );
		if ( ! segment || Math.abs( deltaX ) + Math.abs( deltaY ) < 0.0001 ) return;

		cameraRight.setFromMatrixColumn( camera.matrixWorld, 0 );
		cameraUp.setFromMatrixColumn( camera.matrixWorld, 1 );
		tmpSplatVelocity.copy( cameraRight ).multiplyScalar( deltaX )
			.addScaledVector( cameraUp, - deltaY )
			.normalize()
			.multiplyScalar( ui.splatStrength );
		const sampleCount = 4;
		for ( let index = 0; index < sampleCount; index ++ ) {

			const distance = THREE.MathUtils.lerp( segment[ 0 ], segment[ 1 ], ( index + 0.5 ) / sampleCount );
			localPointerRay.at( distance, localPointerPoint );
			mesh.localToWorld( localPointerPoint );
			fluid.addWorldSplat( localPointerPoint, tmpSplatVelocity, ui.pointerDensityRate / sampleCount, {
				temperatureAmount: ui.pointerTemperatureRate / sampleCount,
				velocityMode: ui.pointerVelocityMode,
				velocityBlend: ui.pointerVelocityBlend,
				densityMode: ui.pointerDensityMode,
				densityBlend: ui.pointerDensityBlend,
				radius: fluid.radius.value * 1.35,
			} );

		}

	};

	renderer.domElement.addEventListener( 'pointermove', onPointerMove );
	renderer.domElement.addEventListener( 'pointerdown', ( e ) => {

		previousPointer.set( e.clientX, e.clientY );
		previousPointerReady = true;

	} );
	renderer.domElement.addEventListener( 'pointerup', ( e ) => previousPointer.set( e.clientX, e.clientY ) );
	const resetPointer = () => previousPointerReady = false;
	renderer.domElement.addEventListener( 'pointerleave', resetPointer );
	renderer.domElement.addEventListener( 'pointercancel', resetPointer );
	fluid = new SmokeVolume( {
		...gridSettings,
		iterations: 12,
		pressureSolver: 'sor',
		densityDissipation: 0.997,
		temperatureDissipation: 0.991,
		densityDiffusion: 0.008,
		densityAdvectionCorrection: 0.18,
		velocityDissipation: 0.985,
		pressureDissipation: 0,
		curlStrength: 5.5,
		turbulenceStrength: 1.4,
		turbulenceFrequency: 1.15,
		turbulenceSpeed: 0.12,
		turbulenceOctaves: 2,
		turbulenceDensityScale: 0.45,
		turbulenceThermalBoost: 0.35,
		turbulenceUpdateInterval: 3,
		pressureFactor: 1 / 6,
		radius: 0.095,
		useBoundaries: true,
		boundaryFade: 0.05,
		neighborStride: 1,
		speedFactor: 1,
		buoyancyStrength: 1.65,
		densityWeight: 0.025,
		lightSteps: 32,
		enableOccupancyCache: true,
		enableLightOpticalDepthCache: true,
	} );
	shaderCache.container( 'smoke/volume', fluid );
	fluid.initialize( renderer );
	setMoonDirection( moonDirectionFromAngles( - 48, 42 ) );

	const dyeTexelSize = uniform( new THREE.Vector3( 1 / fluid.dyeRes, 1 / fluid.dyeRes, 1 / fluid.dyeRes ), 'vec3' );
	// Unified raymarching helper - mode is determined at JavaScript level
	function createRaymarchingNode( mode, params ) {

		const { texture, range = float( 0.08 ), threshold = float( 0.08 ), opacity = float( 0.18 ), steps = float( 100 ) } = params;

		return Fn( () => {

			const finalColor = vec4( 0 ).toVar();

			RaymarchingBox( steps, ( { positionRay } ) => {

				const coord = positionRay.add( 0.5 );

				if ( mode === 'uvw' ) {

					finalColor.rgb.addAssign( finalColor.a.oneMinus().mul( coord ) );
					finalColor.a.addAssign( finalColor.a.oneMinus().mul( 0.2 ) );

				} else if ( mode === 'vec3RGB' ) {

					const v = texture.sample( coord ).xyz;
					const rgb = v.mul( 0.5 ).add( 0.5 );
					finalColor.rgb.addAssign( finalColor.a.oneMinus().mul( rgb ) );
					finalColor.a.addAssign( finalColor.a.oneMinus().mul( 0.2 ) );

				} else if ( mode === 'vec3Magnitude' ) {

					const vecVal = texture.sample( coord ).xyz.length();
					const mv = smoothstep( threshold.sub( range ), threshold.add( range ), vecVal ).mul( opacity );
					finalColor.rgb.addAssign( finalColor.a.oneMinus().mul( mv ) );
					finalColor.a.addAssign( finalColor.a.oneMinus().mul( mv ) );

					If( finalColor.a.greaterThanEqual( 0.95 ), () => {

						Break();

					} );

				} else { // 'scalar' mode

					const mapValue = float( texture.sample( coord ).r );
					const mv = smoothstep( threshold.sub( range ), threshold.add( range ), mapValue ).mul( opacity );
					const shading = texture.sample( coord.add( vec3( - 0.01 ) ) ).r.sub( texture.sample( coord.add( vec3( 0.01 ) ) ).r );
					const col = shading.mul( 4.0 ).add( positionRay.x.add( positionRay.y ).mul( 0.5 ) ).add( 0.3 );

					finalColor.rgb.addAssign( finalColor.a.oneMinus().mul( mv ).mul( col ) );
					finalColor.a.addAssign( finalColor.a.oneMinus().mul( mv ) );

					If( finalColor.a.greaterThanEqual( 0.95 ), () => {

						Break();

					} );

				}

			} );

			return finalColor;

		} )();

	}

	const baseColor = uniform( new THREE.Color( 0x798aa0 ) );
	const range = uniform( 0.07 );
	const threshold = uniform( 0.1 );
	const opacity = uniform( 0.12 );
	const steps = uniform( 120 );

	material = new VolumeSmokeNodeMaterial( {
		densityTexture: fluid.getDensityTexture3D(),
		velocityTexture: fluid.getVelocityTexture3D(),
		curlTexture: fluid.getCurlTexture3D(),
		pressureTexture: fluid.getPressureTexture3D(),
		divergenceTexture: fluid.getDivergenceTexture3D(),
		occupancyTexture: fluid.getOccupancyTexture3D(),
		occupancyGridSize: fluid.getOccupancyGridSize(),
		lightOpticalDepthTexture: fluid.getLightOpticalDepthTexture3D(),
		sceneDepthNode,
		fogNode: sharedVolumeFogNode,
			sceneShadowNode: activeQuality.sceneShadows ? volumeSceneShadowNode : null,
			useFlowDetail: activeQuality.flowDetail,
			useHighFrequencyDetail: activeQuality.highFrequencyDetail,
		useMacrocellSkipping: true,
		outputMode: 'unclamped-hdr',
		dyeTexelSize,
		lightDir: fluid.lightDirection,
			steps: activeQuality.steps,
			temporalJitter: activeQuality.temporal ? 1 : 0,
		baseColor: new THREE.Color( 0x65717c ),
		skyColor: new THREE.Color( 0x6f88a9 ),
		groundColor: new THREE.Color( 0x283037 ),
		highlightColor: new THREE.Color( 0x9aa8b4 ),
		lightColor: new THREE.Color( 0xe3edf4 ),
		ambientLight: 0.56,
		lightStrength: 1.5,
		rimStrength: 0.12,
		densityBoost: 3.2,
		absorption: 1.9,
		brightness: 1.25,
		anisotropy: 0.4,
		phaseBack: - 0.18,
		phaseForwardWeight: 0.75,
		scatteringAlbedo: 0.82,
		shadowIntensity: 0.38,
		rayJitterStrength: 0.85,
		curlInfluence: 0.45,
		detailWarpStrength: 2.4,
		detailWarpMix: 0.5,
		detailNoiseScale: 3.2,
		detailNoiseStrength: 0.08,
		detailNoiseSpeed: 0.012,
		adaptiveStepThreshold: 0.0015,
		densitySmoothing: 0.4,
		gradientLighting: 0.12,
		surfaceLighting: 0.02,
		multipleScattering: 0.55,
		multipleScatteringOctaves: 3,
		multipleScatteringAttenuation: 0.32,
		multipleScatteringContribution: 0.48,
		multipleScatteringAnisotropy: 0.72,
		powderStrength: 0.35,
		ambientGradient: 0.55,
		ambientOcclusion: 0.6,
		fireColor: new THREE.Color( 0xff6a26 ),
		fireColorHot: new THREE.Color( 0xffc98f ),
		fireIntensity: 2.15,
		firePower: 2.8,
		fireTemperatureScale: 0.7,
		fireBlackbody: 1,
		pointLightColor: new THREE.Color( 0xff9345 ),
		pointLightRadius: 1.4,
	} );
	// The depth prepass must compare opaque depth against the volume entry surface.
	// RaymarchingBox derives its own entry/exit bounds, so front-face rasterization
	// preserves the march while avoiding false rejection by opaque objects behind it.
	material.side = THREE.FrontSide;
	const {
		densityBoost: smokeDensityBoost,
		absorption: smokeAbsorption,
		ambientLight: smokeAmbient,
		lightStrength: smokeLightStrength,
		rimStrength: smokeRimStrength,
		curlInfluence: smokeCurlInfluence,
		velocityInfluence: smokeVelocityInfluence,
		pressureInfluence: smokePressureInfluence,
		divergenceInfluence: smokeDivergenceInfluence,
		brightness: smokeBrightness,
		steps: smokeRaySteps,
		shadowIntensity: smokeShadowIntensity,
		shadowSteps: smokeShadowSteps,
		adaptiveStepThreshold: smokeAdaptiveStepThreshold,
		rayJitterStrength: smokeRayJitterStrength,
		occupancyThreshold: smokeOccupancyThreshold,
		detailWarpStrength: smokeDetailWarpStrength,
		detailWarpMix: smokeDetailWarpMix,
		detailNoiseScale: smokeDetailNoiseScale,
		detailNoiseStrength: smokeDetailNoiseStrength,
		detailNoiseSpeed: smokeDetailNoiseSpeed,
		detailTime: smokeDetailTime,
		densitySmoothing: smokeDensitySmoothing,
		gradientLighting: smokeGradientLighting,
		surfaceLighting: smokeSurfaceLighting,
		anisotropy: smokeAnisotropy,
		phaseBack: smokePhaseBack,
		phaseForwardWeight: smokePhaseForwardWeight,
		scatteringAlbedo: smokeScatteringAlbedo,
		multipleScattering: smokeMultipleScattering,
		powderStrength: smokePowderStrength,
		ambientGradient: smokeAmbientGradient,
		ambientOcclusion: smokeAmbientOcclusion,
		fireIntensity: smokeFireIntensity,
		firePower: smokeFirePower,
		fireTemperatureScale: smokeFireTemperatureScale,
	} = material.smokeUniforms;

	let currentView = 'Smoke';
	function buildRaymarchNode() {

		if ( currentView === 'Smoke' ) return material.getSmokeNode();

		const params = { range, threshold, opacity, steps };

		switch ( currentView ) {

			case 'Density':
				return createRaymarchingNode( 'scalar', { ...params, texture: material.textures.density } );
			case 'Pressure':
				return createRaymarchingNode( 'scalar', { ...params, texture: material.textures.pressure } );
			case 'Divergence':
				return createRaymarchingNode( 'scalar', { ...params, texture: material.textures.divergence } );
			case 'VelocityMag':
				return createRaymarchingNode( 'vec3Magnitude', { ...params, texture: material.textures.velocity } );
			case 'CurlMag':
				return createRaymarchingNode( 'vec3Magnitude', { ...params, texture: material.textures.curl } );
			case 'VelocityRGB':
				return createRaymarchingNode( 'vec3RGB', { ...params, texture: material.textures.velocity } );
			case 'CurlRGB':
				return createRaymarchingNode( 'vec3RGB', { ...params, texture: material.textures.curl } );
			case 'Occupancy':
				return createRaymarchingNode( 'scalar', { ...params, texture: material.textures.occupancy } );
			case 'Light Optical Depth':
				return material.textures.lightOpticalDepth ? createRaymarchingNode( 'scalar', { ...params, texture: material.textures.lightOpticalDepth } ) : vec4( 0 );
			case 'UVW':
				return createRaymarchingNode( 'uvw', { steps } );
			default:
				return createRaymarchingNode( 'scalar', { ...params, texture: material.textures.density } );

		}

	}

	function setMaterialOutput( node ) {

		if ( currentView === 'Smoke' ) {

			material.useSmokeOutput();

		} else {

			material.outputNode = node.setRGB( node.rgb.add( baseColor ) );
			material.needsUpdate = true;

		}

	}

	setMaterialOutput( buildRaymarchNode() );

	mesh = new THREE.Mesh( new THREE.BoxGeometry( 1, 1, 1 ), material );
	mesh.scale.copy( SHOWCASE_DOMAIN_SCALE );
	mesh.position.y = 8.6;
	mesh.frustumCulled = false;
	mesh.layers.set( VOLUME_LAYER );
	scene.add( mesh );
	syncSmokeShadowTransform();
	setupSmokeSceneShadow();
	fluid.setDomainFromObject( mesh );
	setupVolumeCompositor();
	setupRenderPipeline();

	meshGrid = new THREE.LineSegments(
		new BoxNoFaceGeometry( 1, 1, 1 ),
		new THREE.LineBasicMaterial( { color: 0x8fa8c4, transparent: true, opacity: 0.28 } )
	);
	meshGrid.position.copy( mesh.position );
	meshGrid.scale.copy( mesh.scale );
	meshGrid.visible = false;
	scene.add( meshGrid );

	function rebuildRaymarch() {

		const node = buildRaymarchNode();
		setMaterialOutput( node );

	}

	// Multi-slice visualization (all passes at once)
	const sliceVByField = {};
	const sliceLayer = uniform( 0, 'uint' );
	const maxSliceLayers = {

		Density: fluid.dyeRes,
		Pressure: fluid.simRes,
		Divergence: fluid.simRes,
		VelocityMag: fluid.simRes,
		CurlMag: fluid.simRes,
		VelocityRGB: fluid.simRes,
		CurlRGB: fluid.simRes,
		Occupancy: fluid.occupancyRes,
		'Light Optical Depth': fluid.lightRes,
		UVW: fluid.simRes,

	};
	function buildSliceNodeFor( field ) {

		const maxLayerCount = Math.max( 1, ( maxSliceLayers[ field ] || 1 ) - 1 );
		const clampedLayer = Math.max( 0, Math.min( sliceLayer.value, maxLayerCount ) );
		const sliceV = sliceVByField[ field ] || ( sliceVByField[ field ] = uniform( 0.5 ) );
		sliceV.value = clampedLayer / maxLayerCount;

		const tDen = material.textures.density;
		const tPr = material.textures.pressure;
		const tDiv = material.textures.divergence;
		const tVel = material.textures.velocity;
		const tCurl = material.textures.curl;
		const tOccupancy = material.textures.occupancy;
		const tLightOpticalDepth = material.textures.lightOpticalDepth;
		const uv2 = uv();
		const coord = vec3( uv2.x, uv2.y, sliceV );

		if ( field === 'Density' ) {

			return tDen.sample( coord );

		}

		if ( field === 'Pressure' ) {

			return vec4( tPr.sample( coord ).xyz, 1.0 );

		}

		if ( field === 'Divergence' ) {

			return vec4( tDiv.sample( coord ).xyz, 1.0 );

		}

		if ( field === 'VelocityMag' ) {

			const vel = tVel.sample( coord ).xyz;
			const mag = vel.length().mul( 2.0 ).saturate();
			return vec4( mag, mag, mag, 1.0 );

		}

		if ( field === 'CurlMag' ) {

			const curl = tCurl.sample( coord ).xyz;
			const mag = curl.length().mul( 0.5 ).saturate();
			return vec4( mag, mag, mag, 1.0 );

		}

		if ( field === 'VelocityRGB' ) {

			const vel = tVel.sample( coord ).xyz;
			const rgb = vel.mul( 0.5 ).add( 0.5 );
			return vec4( rgb, 1.0 );

		}

		if ( field === 'CurlRGB' ) {

			const curl = tCurl.sample( coord ).xyz;
			const rgb = curl.mul( 0.5 ).add( 0.5 );
			return vec4( rgb, 1.0 );

		}

		if ( field === 'Occupancy' ) {

			return tOccupancy.sample( coord );

		}

		if ( field === 'Light Optical Depth' ) {

			return tLightOpticalDepth ? tLightOpticalDepth.sample( coord ) : vec4( 0 );

		}

		if ( field === 'UVW' ) {

			return vec4( coord, 1.0 );

		}

		return tDen.sample( coord );

	}

	const sliceGroup = new THREE.Group();
	sliceGroup.visible = false;
	scene.add( sliceGroup );

	const fields = [ 'Density', 'Pressure', 'Divergence', 'VelocityMag', 'CurlMag', 'VelocityRGB', 'CurlRGB', 'Occupancy', 'Light Optical Depth', 'UVW' ];
	const slicePlanes = {};
	const sliceLabels = new BatchedText( fields.length * 10, fields.length * 100 );
	sliceLabels.perObjectFrustumCulled = false;
	sliceLabels.textAlign = 'center';
	sliceLabels.setCullingOptions( {
		useFrustum: true,
		maxDistance: 350,
		lodNear: 280,
		lodDensity: 0.7,
		frustumPadXY: 0.25,
		frustumPadZNear: 0.0,
		frustumPadZFar: 0.02,
	} );

	sliceLabels.staticMode = false;
	sliceGroup.add( sliceLabels );
	const planeGeo = new THREE.PlaneGeometry( 10, 10 );
	for ( const f of fields ) {

		const mat = new THREE.NodeMaterial();
		mat.colorNode = buildSliceNodeFor( f );
		const m = new THREE.Mesh( planeGeo, mat );
		sliceGroup.add( m );

		const label = new Text();
		label.text = f;
		label.fontSize = 1.0;
		label.textAlign = 'center';
		label.anchorX = 0.5;
		label.anchorY = 0.5;
		label.color = new THREE.Color( 0xffffff );
		sliceLabels.addText( label );

		slicePlanes[ f ] = { mesh: m, material: mat, label };

	}

	function rebuildSliceNodes() {

		for ( const f of fields ) {

			const target = slicePlanes[ f ];
			target.material.colorNode = buildSliceNodeFor( f );
			target.material.needsUpdate = true;

		}

	}

	// GUI
	gui = createExampleGui( 'Smoke 3D' );
	const isMobile = window.innerWidth < 512;
	if ( isMobile ) gui.close();
	let gridRestartTimer = null;
	const applyGridSettings = () => {

		if ( gridRestartTimer !== null ) window.clearTimeout( gridRestartTimer );
		gridRestartTimer = null;
		const nextParams = new URLSearchParams( window.location.search );
		for ( const [ key, value ] of Object.entries( gridSettings ) ) nextParams.set( key, typeof value === 'boolean' ? ( value ? '1' : '0' ) : String( value ) );
		window.location.search = nextParams.toString();

	};
	const scheduleGridRestart = () => {

		if ( gridRestartTimer !== null ) window.clearTimeout( gridRestartTimer );
		gridRestartTimer = window.setTimeout( applyGridSettings, 700 );

	};

	const ui = {
		view: 'Smoke',
		preset: activePreset,
		qualityTier: activeQualityTier,
		debug: false,
		slicePos: - 1,
		sliceLayer: 0,
		autoStep: false,
		autoEmitter: true,
		emitterCount: 4,
		emitterSpread: 0.05,
		emitterDensityRate: 0.2,
		emitterTemperatureRate: 2.2,
		emitterDensityMode: 'inflow',
		emitterDensityBlend: 0.35,
		emitterLiftRate: 6.2,
		emitterSway: 0.045,
		emitterVelocityMode: 'inflow',
		emitterVelocityBlend: 0.3,
		pointerDensityRate: 0.04,
		pointerTemperatureRate: 0,
		pointerDensityMode: 'add',
		pointerDensityBlend: 1,
		pointerVelocityMode: 'add',
		pointerVelocityBlend: 1,
		showGrid: false,
		gridSize: 64,
		gridDivisions: 64,
		gridHeight: 0,
		moonIntensity: moonLight.intensity,
		moonAzimuth: - 88,
		moonElevation: 26,
		emberIntensity: emberLight.intensity,
		emberFlicker: 0.72,
		emberSmokeScatter: 0.024,
		fireIntensity: smokeFireIntensity.value,
		windStrength: 3.5,
		windHeading: - 32,
		fogDensity: scene.fog.density,
		groundShadowStrength: smokeGroundShadowStrength.value,
		interactiveFogDensity: 0.035,
		treeSway: canopySway.value,
		domainPositionX: mesh.position.x,
		domainPositionY: mesh.position.y,
		domainPositionZ: mesh.position.z,
		domainRotationX: THREE.MathUtils.radToDeg( mesh.rotation.x ),
		domainRotationY: THREE.MathUtils.radToDeg( mesh.rotation.y ),
		domainRotationZ: THREE.MathUtils.radToDeg( mesh.rotation.z ),
		domainScaleX: mesh.scale.x,
		domainScaleY: mesh.scale.y,
		domainScaleZ: mesh.scale.z,
		volumeResolutionScale,
		volumeDepthSigma,
		volumeRenderTarget: '',
		splatStrength: 18.0,
		neighborStride: fluid.neighborStride.value,
		pressureSolver: fluid.pressureSolver,
		multigridPreset: fluid.multigridPreset,
		multigridCycles: fluid.multigridCycles,
		multigridPreSmooth: fluid.multigridPreSmooth,
		multigridPostSmooth: fluid.multigridPostSmooth,
		multigridCoarseIterations: fluid.multigridCoarseIterations,
		multigridMinResolution: fluid.multigridMinResolution,
		multigridMaxLevels: fluid.multigridMaxLevels,
		multigridAutoTune: fluid.multigridAutoTune,
		multigridCorrectionScale: fluid.multigridCorrectionScale.value,
		multigridRecursiveCorrectionScale: fluid.multigridRecursiveCorrectionScale.value,
		useBoundaries: fluid.useBoundaries,
		turbulenceMode: fluid.turbulenceMode,
		splatMode: fluid.splatMode,
		occupancyCache: fluid.renderCaches.occupancy,
		lightOpticalDepthCache: fluid.renderCaches.lightOpticalDepth,
		buoyancyX: fluid.buoyancyDirection.value.x,
		buoyancyY: fluid.buoyancyDirection.value.y,
		buoyancyZ: fluid.buoyancyDirection.value.z,
		lightX: fluid.lightDirection.value.x,
		lightY: fluid.lightDirection.value.y,
		lightZ: fluid.lightDirection.value.z,
		applyGridSettings,
		stepOnce: () => {

			fluid.step( renderer, SIMULATION_FIXED_DELTA );
			syncVolumeTextures();

		},
		clearPressure: () => {

			fluid.clearPressure( renderer );

		},
		runCurl: true,
		runVorticity: true,
		runTurbulence: true,
		runDivergence: true,
		runPressureClear: true,
		runPressureJacobi: true,
		runProjection: true,
		runAdvectVelocity: true,
		runAdvectDensity: true,
		runBuoyancy: true,
	};

	uiState = ui;

	fluid.neighborStride.value = ui.neighborStride;
	updateWindDirection();
	resizeVolumeCompositor();

	function updateDebugPasses() {

		fluid.setDebugPasses( {
			runCurl: ui.runCurl,
			runVorticity: ui.runVorticity,
			runTurbulence: ui.runTurbulence,
			runDivergence: ui.runDivergence,
			runPressureClear: ui.runPressureClear,
			runPressureJacobi: ui.runPressureJacobi,
			runProjection: ui.runProjection,
			runAdvectVelocity: ui.runAdvectVelocity,
			runAdvectDensity: ui.runAdvectDensity,
			runBuoyancy: ui.runBuoyancy,
		} );

	}

	function updateBuoyancyDirection() {

		const direction = new THREE.Vector3( ui.buoyancyX, ui.buoyancyY, ui.buoyancyZ ).normalize();
		fluid.setBuoyancyDirection( direction );
		ui.windStrength = THREE.MathUtils.clamp( THREE.MathUtils.radToDeg( Math.acos( THREE.MathUtils.clamp( direction.y, - 1, 1 ) ) ), 0, 7 );
		ui.windHeading = THREE.MathUtils.radToDeg( Math.atan2( direction.x, direction.z ) );
		const horizontalLength = Math.hypot( direction.x, direction.z );
		if ( horizontalLength > 1e-5 ) canopyWindDirection.value.set( direction.x / horizontalLength, 0, direction.z / horizontalLength );

	}

	function updateLightDirection() {

		const direction = new THREE.Vector3( ui.lightX, ui.lightY, ui.lightZ ).normalize();
		setMoonDirection( direction );
		ui.moonAzimuth = THREE.MathUtils.radToDeg( Math.atan2( direction.x, direction.z ) );
		ui.moonElevation = THREE.MathUtils.radToDeg( Math.asin( THREE.MathUtils.clamp( direction.y, - 1, 1 ) ) );

	}

	function updateMoonFromSceneControls() {

		moonLight.intensity = ui.moonIntensity;
		skyMoonIntensity.value = ui.moonIntensity;
		const direction = moonDirectionFromAngles( ui.moonAzimuth, ui.moonElevation );
		setMoonDirection( direction );
		ui.lightX = direction.x;
		ui.lightY = direction.y;
		ui.lightZ = direction.z;

	}

	function updatePressureSolver() {

		fluid.setPressureSolver( ui.pressureSolver, {
			preset: ui.multigridPreset,
			cycles: ui.multigridCycles,
			preSmooth: ui.multigridPreSmooth,
			postSmooth: ui.multigridPostSmooth,
			coarseIterations: ui.multigridCoarseIterations,
			minResolution: ui.multigridMinResolution,
			maxLevels: ui.multigridMaxLevels,
			autoTune: ui.multigridAutoTune,
			correctionScale: ui.multigridCorrectionScale,
			recursiveCorrectionScale: ui.multigridRecursiveCorrectionScale,
		} );

	}

	function updateRenderCaches() {

		fluid.setRenderCacheOptions( { occupancy: ui.occupancyCache, lightOpticalDepth: ui.lightOpticalDepthCache } );
		material.setVolumeTextures( { lightOpticalDepthTexture: ui.lightOpticalDepthCache ? fluid.getLightOpticalDepthTexture3D() : null } );

	}

	function rebuildFloorGrid() {

		if ( floorGrid ) {

			scene.remove( floorGrid );
			floorGrid.geometry.dispose();
			floorGrid.material.dispose();

		}
		floorGrid = new THREE.GridHelper( ui.gridSize, ui.gridDivisions, 0x60758c, 0x17202c );
		floorGrid.position.set( mesh.position.x, mesh.position.y - mesh.scale.y * 0.5 + ui.gridHeight, mesh.position.z );
		floorGrid.visible = ui.showGrid;
		scene.add( floorGrid );

	}

	function updateDomainTransform() {

		mesh.position.set( ui.domainPositionX, ui.domainPositionY, ui.domainPositionZ );
		mesh.rotation.set(
			THREE.MathUtils.degToRad( ui.domainRotationX ),
			THREE.MathUtils.degToRad( ui.domainRotationY ),
			THREE.MathUtils.degToRad( ui.domainRotationZ )
		);
		mesh.scale.set( ui.domainScaleX, ui.domainScaleY, ui.domainScaleZ );
		meshGrid.position.copy( mesh.position );
		meshGrid.rotation.copy( mesh.rotation );
		meshGrid.scale.copy( mesh.scale );
		if ( floorGrid ) floorGrid.position.set( mesh.position.x, mesh.position.y - mesh.scale.y * 0.5 + ui.gridHeight, mesh.position.z );
		fluid.syncDomainTransform( true );
		syncSmokeShadowTransform();

	}

	updateDebugPasses();
	updateRenderCaches();

	const fScene = gui.addFolder( 'Scene' );
	fScene.add( controls, 'enabled' ).name( 'Orbit Camera' );
	fScene.add( controls, 'autoRotate' ).name( 'Auto Rotate' );
	fScene.add( ui, 'preset', Object.keys( SMOKE_PRESETS ) ).name( 'Preset' ).onChange( setPreset );
	fScene.add( ui, 'qualityTier', Object.keys( QUALITY_TIERS ) ).name( 'Quality Tier' ).onChange( setQualityTier );
	fScene.add( ui, 'moonIntensity', 0, 5, 0.05 ).name( 'Moonlight' ).onChange( updateMoonFromSceneControls );
	fScene.add( ui, 'moonAzimuth', - 180, 180, 1 ).name( 'Moon Azimuth' ).onChange( updateMoonFromSceneControls );
	fScene.add( ui, 'moonElevation', 5, 80, 1 ).name( 'Moon Elevation' ).onChange( updateMoonFromSceneControls );
	fScene.add( ui, 'emberIntensity', 0, 120, 1 ).name( 'Ember Glow' );
	fScene.add( ui, 'emberFlicker', 0, 1, 0.01 ).name( 'Ember Flicker' );
	fScene.add( ui, 'windStrength', 0, 7, 0.1 ).name( 'Wind Strength' ).onChange( updateWindDirection );
	fScene.add( ui, 'windHeading', - 180, 180, 1 ).name( 'Wind Heading' ).onChange( updateWindDirection );
	fScene.add( ui, 'fogDensity', 0, 0.035, 0.001 ).name( 'Fog Density' ).onChange( ( value ) => {

		scene.fog.density = value;
		sharedFogDensity.value = value;

	} );
	fScene.add( ui, 'interactiveFogDensity', 0, 0.12, 0.005 ).name( 'Interactive Fog' );
	fScene.add( ui, 'groundShadowStrength', 0, 1.5, 0.01 ).name( 'Smoke Ground Shadow' ).onChange( value => smokeGroundShadowStrength.value = value );
	fScene.add( ui, 'treeSway', 0, 0.12, 0.001 ).name( 'Tree Sway' ).onChange( ( value ) => canopySway.value = value );

	const fGrid = gui.addFolder( 'Grid System' );
	const bindRestartingGridSetting = ( property, min, max, step, name ) => fGrid.add( gridSettings, property, min, max, step )
		.name( name )
		.onChange( scheduleGridRestart )
		.info( 'Rebuilds the GPU simulation after the control settles.' );
	bindRestartingGridSetting( 'simRes', 8, 256, 8, 'Velocity Grid (Restart)' );
	bindRestartingGridSetting( 'dyeRes', 8, 256, 8, 'Density Grid (Restart)' );
	bindRestartingGridSetting( 'turbulenceResolutionScale', 0.125, 1, 0.125, 'Turbulence Grid (Restart)' );
	bindRestartingGridSetting( 'occupancyBlockSize', 1, 16, 1, 'Occupancy Block (Restart)' );
	bindRestartingGridSetting( 'lightRes', 4, 128, 4, 'Light Cache Grid (Restart)' );
	bindRestartingGridSetting( 'maxSplatSources', 1, 256, 1, 'Source Capacity (Restart)' );
	fGrid.add( gridSettings, 'subcellSolidFractions' ).name( 'Subcell Solids (Restart)' ).onChange( scheduleGridRestart ).info( 'Rebuilds the GPU simulation after the control settles.' );
	fGrid.add( ui, 'applyGridSettings' ).name( 'Restart Grid Now' );
	fGrid.add( ui, 'domainPositionX', - 50, 50, 0.1 ).name( 'Domain Position X' ).onChange( updateDomainTransform );
	fGrid.add( ui, 'domainPositionY', - 50, 50, 0.1 ).name( 'Domain Position Y' ).onChange( updateDomainTransform );
	fGrid.add( ui, 'domainPositionZ', - 50, 50, 0.1 ).name( 'Domain Position Z' ).onChange( updateDomainTransform );
	fGrid.add( ui, 'domainRotationX', - 180, 180, 1 ).name( 'Domain Rotation X' ).onChange( updateDomainTransform );
	fGrid.add( ui, 'domainRotationY', - 180, 180, 1 ).name( 'Domain Rotation Y' ).onChange( updateDomainTransform );
	fGrid.add( ui, 'domainRotationZ', - 180, 180, 1 ).name( 'Domain Rotation Z' ).onChange( updateDomainTransform );
	fGrid.add( ui, 'domainScaleX', 1, 100, 0.1 ).name( 'Domain Scale X' ).onChange( updateDomainTransform );
	fGrid.add( ui, 'domainScaleY', 1, 100, 0.1 ).name( 'Domain Scale Y' ).onChange( updateDomainTransform );
	fGrid.add( ui, 'domainScaleZ', 1, 100, 0.1 ).name( 'Domain Scale Z' ).onChange( updateDomainTransform );
	fGrid.add( ui, 'showGrid' ).name( 'Show Domain + Floor Grid' ).onChange( ( value ) => {

		meshGrid.visible = value;
		if ( floorGrid ) floorGrid.visible = value;

	} );
	fGrid.add( ui, 'gridSize', 10, 240, 2 ).name( 'Floor Grid Size' ).onChange( rebuildFloorGrid );
	fGrid.add( ui, 'gridDivisions', 2, 240, 1 ).name( 'Floor Grid Divisions' ).onChange( rebuildFloorGrid );
	fGrid.add( ui, 'gridHeight', - 10, 10, 0.1 ).name( 'Floor Grid Offset' ).onChange( rebuildFloorGrid );

	const fView = gui.addFolder( 'View' );
	const smokeViewControls = [];
	const debugVolumeControls = [];
	const debugSliceControls = [];
	let fSmoke = null;
	const updateViewControlVisibility = () => {

		const smokeVisible = ui.view === 'Smoke';
		for ( const control of smokeViewControls ) control[ smokeVisible ? 'show' : 'hide' ]();
		for ( const control of debugVolumeControls ) control[ smokeVisible ? 'hide' : 'show' ]();
		for ( const control of debugSliceControls ) control[ ui.debug ? 'show' : 'hide' ]();
		if ( fSmoke ) fSmoke[ smokeVisible ? 'show' : 'hide' ]();

	};
	fView.add( ui, 'view', [ 'Smoke', 'Density', 'Pressure', 'Divergence', 'VelocityMag', 'CurlMag', 'VelocityRGB', 'CurlRGB', 'Occupancy', 'Light Optical Depth', 'UVW' ] ).name( 'Field' ).onChange( () => {

		currentView = ui.view;
		rebuildRaymarch();
		rebuildSliceNodes();
		updateViewControlVisibility();

	} );
	fView.add( ui, 'debug' ).name( 'Debug Slices' ).onChange( ( on ) => {

		mesh.visible = true;
		sliceGroup.visible = on;
		if ( on ) {

			rebuildSliceNodes();
			updateSliceTransform();

		}
		updateViewControlVisibility();

	} );
	const volumeScaleControl = fView.add( ui, 'volumeResolutionScale', 0.25, 1, 0.05 ).name( 'Smoke Render Scale (Live)' ).onChange( ( value ) => {

		volumeResolutionScale = Number( value );
		resizeVolumeCompositor();

	} ).info( 'Immediately resizes the smoke render target; it does not restart the simulation.' );
	const volumeTargetControl = fView.add( ui, 'volumeRenderTarget' ).name( 'Active Render Target' ).listen();
	volumeTargetControl.disable();
	const volumeDepthControl = fView.add( ui, 'volumeDepthSigma', 0, 256, 1 ).name( 'Depth Edge Sigma' ).onChange( ( value ) => {

		setVolumeDepthSigma( value );

	} );
	smokeViewControls.push( volumeScaleControl, volumeTargetControl, volumeDepthControl );
	const slicePositionControl = fView.add( ui, 'slicePos', 0, 1, 0.001 ).name( 'Slice Position' ).onChange( () => {

		rebuildSliceNodes();
		updateSliceTransform();

	} );
	const maxSliceLayerCount = Math.max( ...Object.values( maxSliceLayers ) );
	const defaultSliceLayer = 0;
	ui.sliceLayer = defaultSliceLayer;
	sliceLayer.value = defaultSliceLayer;
	const sliceLayerControl = fView.add( ui, 'sliceLayer', 0, maxSliceLayerCount - 1, 1 ).name( 'Slice Layer' ).onChange( () => {

		sliceLayer.value = ui.sliceLayer;
		rebuildSliceNodes();
		updateSliceTransform();

	} );
	debugSliceControls.push( slicePositionControl, sliceLayerControl );
	debugVolumeControls.push(
		fView.add( threshold, 'value', 0, 1, 0.01 ).name( 'Debug Threshold' ).onChange( rebuildRaymarch ),
		fView.add( opacity, 'value', 0, 1, 0.01 ).name( 'Debug Opacity' ).onChange( rebuildRaymarch ),
		fView.add( range, 'value', 0, 1, 0.01 ).name( 'Debug Range' ).onChange( rebuildRaymarch ),
		fView.add( steps, 'value', 10, 300, 1 ).name( 'Debug Steps' ).onChange( rebuildRaymarch )
	);

	const smokeSettings = {
		useFlowDetail: material.useFlowDetail,
		useHighFrequencyDetail: material.useHighFrequencyDetail,
		useDiagnosticLighting: material.useDiagnosticLighting,
		useMacrocellSkipping: material.useMacrocellSkipping,
		outputMode: material.outputMode,
		baseColor: `#${material.smokeUniforms.baseColor.value.getHexString()}`,
		highlightColor: `#${material.smokeUniforms.highlightColor.value.getHexString()}`,
		lightColor: `#${material.smokeUniforms.lightColor.value.getHexString()}`,
		densityBoost: smokeDensityBoost.value,
		absorption: smokeAbsorption.value,
		ambient: smokeAmbient.value,
		lightStrength: smokeLightStrength.value,
		rimStrength: smokeRimStrength.value,
		curl: smokeCurlInfluence.value,
		velocity: smokeVelocityInfluence.value,
		pressure: smokePressureInfluence.value,
		divergence: smokeDivergenceInfluence.value,
		brightness: smokeBrightness.value,
		raymarchSteps: smokeRaySteps.value,
		shadowIntensity: smokeShadowIntensity.value,
		shadowSteps: smokeShadowSteps.value,
		adaptiveStepThreshold: smokeAdaptiveStepThreshold.value,
		rayJitterStrength: smokeRayJitterStrength.value,
		occupancyThreshold: smokeOccupancyThreshold.value,
		detailWarpStrength: smokeDetailWarpStrength.value,
		detailWarpMix: smokeDetailWarpMix.value,
		detailNoiseScale: smokeDetailNoiseScale.value,
		detailNoiseStrength: smokeDetailNoiseStrength.value,
		detailNoiseSpeed: smokeDetailNoiseSpeed.value,
		densitySmoothing: smokeDensitySmoothing.value,
		gradientLighting: smokeGradientLighting.value,
		surfaceLighting: smokeSurfaceLighting.value,
		anisotropy: smokeAnisotropy.value,
		phaseBack: smokePhaseBack.value,
		phaseForwardWeight: smokePhaseForwardWeight.value,
		scatteringAlbedo: smokeScatteringAlbedo.value,
		multipleScattering: smokeMultipleScattering.value,
		powderStrength: smokePowderStrength.value,
		ambientGradient: smokeAmbientGradient.value,
		ambientOcclusion: smokeAmbientOcclusion.value,
		fireIntensity: smokeFireIntensity.value,
		firePower: smokeFirePower.value,
		fireTemperatureScale: smokeFireTemperatureScale.value,
		fireColor: `#${material.smokeUniforms.fireColor.value.getHexString()}`,
		fireColorHot: `#${material.smokeUniforms.fireColorHot.value.getHexString()}`,
	};

	fSmoke = gui.addFolder( 'Smoke' );
	fSmoke.add( smokeSettings, 'useFlowDetail' ).name( 'Flow Detail Shader' ).onChange( ( value ) => material.setShaderVariants( { useFlowDetail: value } ) );
	fSmoke.add( smokeSettings, 'useHighFrequencyDetail' ).name( 'Premium Detail Shader' ).onChange( ( value ) => material.setShaderVariants( { useHighFrequencyDetail: value } ) );
	fSmoke.add( smokeSettings, 'useDiagnosticLighting' ).name( 'Diagnostic Lighting' ).onChange( ( value ) => material.setShaderVariants( { useDiagnosticLighting: value } ) );
	fSmoke.add( smokeSettings, 'useMacrocellSkipping' ).name( 'Macrocell Empty Skip' ).onChange( ( value ) => {

		if ( value ) {

			ui.occupancyCache = true;
			updateRenderCaches();

		}
		material.setMacrocellSkipping( value, fluid.getOccupancyGridSize() );

	} );
	fSmoke.add( smokeSettings, 'outputMode', [ 'safe-premultiplied', 'unclamped-hdr' ] ).name( 'Output Mode' ).onChange( ( value ) => material.setOutputMode( value ) );
	fSmoke.addColor( smokeSettings, 'baseColor' ).name( 'Base Color' ).onChange( ( value ) => material.smokeUniforms.baseColor.value.set( value ) );
	fSmoke.addColor( smokeSettings, 'highlightColor' ).name( 'Highlight Color' ).onChange( ( value ) => material.smokeUniforms.highlightColor.value.set( value ) );
	fSmoke.addColor( smokeSettings, 'lightColor' ).name( 'Light Color' ).onChange( ( value ) => material.smokeUniforms.lightColor.value.set( value ) );
	const bindSmokeUniform = ( property, min, max, step, name, target ) => fSmoke.add( smokeSettings, property, min, max, step ).name( name ).onChange( ( value ) => {

			target.value = value;
			if ( property === 'fireIntensity' ) ui.fireIntensity = value;

		} );
	bindSmokeUniform( 'densityBoost', 0.2, 8, 0.05, 'Density Boost', smokeDensityBoost );
	bindSmokeUniform( 'absorption', 0.1, 8, 0.05, 'Optical Absorption', smokeAbsorption );
	bindSmokeUniform( 'ambient', 0.0, 1.0, 0.01, 'Ambient', smokeAmbient );
	bindSmokeUniform( 'lightStrength', 0.0, 3.0, 0.05, 'Light', smokeLightStrength );
	bindSmokeUniform( 'rimStrength', 0.0, 2.0, 0.05, 'Rim', smokeRimStrength );
	bindSmokeUniform( 'curl', 0.0, 2.0, 0.05, 'Curl Influence', smokeCurlInfluence );
	bindSmokeUniform( 'velocity', 0.0, 1.0, 0.01, 'Velocity Influence', smokeVelocityInfluence );
	bindSmokeUniform( 'pressure', 0.0, 1.0, 0.01, 'Pressure Influence', smokePressureInfluence );
	bindSmokeUniform( 'divergence', 0.0, 1.0, 0.01, 'Divergence Influence', smokeDivergenceInfluence );
	bindSmokeUniform( 'brightness', 0.4, 2.0, 0.01, 'Brightness', smokeBrightness );
	bindSmokeUniform( 'raymarchSteps', 48, 192, 1, 'Raymarch Steps', smokeRaySteps );
	bindSmokeUniform( 'shadowIntensity', 0.0, 1.0, 0.01, 'Shadow Intensity', smokeShadowIntensity );
	bindSmokeUniform( 'shadowSteps', 1, 32, 1, 'Fallback Shadow Steps', smokeShadowSteps );
	bindSmokeUniform( 'adaptiveStepThreshold', 0.0, 0.1, 0.0005, 'Empty Density Threshold', smokeAdaptiveStepThreshold );
	bindSmokeUniform( 'rayJitterStrength', 0.0, 1.0, 0.01, 'Raymarch Jitter', smokeRayJitterStrength );
	bindSmokeUniform( 'occupancyThreshold', 0.0, 0.1, 0.0005, 'Macrocell Threshold', smokeOccupancyThreshold );
	bindSmokeUniform( 'detailWarpStrength', 0.0, 2.0, 0.05, 'Warp Strength', smokeDetailWarpStrength );
	bindSmokeUniform( 'detailWarpMix', 0.0, 1.0, 0.01, 'Warp Mix', smokeDetailWarpMix );
	bindSmokeUniform( 'detailNoiseScale', 0.5, 8.0, 0.1, 'Erosion Scale', smokeDetailNoiseScale );
	bindSmokeUniform( 'detailNoiseStrength', 0.0, 0.5, 0.005, 'Procedural Erosion', smokeDetailNoiseStrength );
	bindSmokeUniform( 'detailNoiseSpeed', 0.0, 0.5, 0.01, 'Detail Rise', smokeDetailNoiseSpeed );
	bindSmokeUniform( 'densitySmoothing', 0.0, 1.0, 0.01, 'Density Smoothing', smokeDensitySmoothing );
	bindSmokeUniform( 'gradientLighting', 0.0, 1.0, 0.01, 'Shape Lighting', smokeGradientLighting );
	bindSmokeUniform( 'surfaceLighting', 0.0, 1.0, 0.01, 'Surface Lighting', smokeSurfaceLighting );
	bindSmokeUniform( 'scatteringAlbedo', 0.0, 1.0, 0.01, 'Scattering Albedo', smokeScatteringAlbedo );
	bindSmokeUniform( 'anisotropy', - 0.9, 0.9, 0.01, 'Forward Anisotropy', smokeAnisotropy );
	bindSmokeUniform( 'phaseBack', - 0.9, 0.0, 0.01, 'Backscatter Anisotropy', smokePhaseBack );
	bindSmokeUniform( 'phaseForwardWeight', 0.0, 1.0, 0.01, 'Forward Scatter Weight', smokePhaseForwardWeight );
	bindSmokeUniform( 'multipleScattering', 0.0, 1.0, 0.01, 'Multiple Scattering', smokeMultipleScattering );
	bindSmokeUniform( 'powderStrength', 0.0, 1.0, 0.01, 'Powder Strength', smokePowderStrength );
	bindSmokeUniform( 'ambientGradient', 0.0, 1.0, 0.01, 'Ambient Height Shade', smokeAmbientGradient );
	bindSmokeUniform( 'ambientOcclusion', 0.0, 2.0, 0.01, 'Ambient Occlusion', smokeAmbientOcclusion );
	bindSmokeUniform( 'fireIntensity', 0.0, 8.0, 0.05, 'Fire Glow', smokeFireIntensity );
	bindSmokeUniform( 'firePower', 0.5, 4.0, 0.05, 'Fire Falloff', smokeFirePower );
	bindSmokeUniform( 'fireTemperatureScale', 0.0, 2.0, 0.01, 'Fire Heat Scale', smokeFireTemperatureScale );
	fSmoke.addColor( smokeSettings, 'fireColor' ).name( 'Fire Color' ).onChange( ( value ) => material.smokeUniforms.fireColor.value.set( value ) );
	fSmoke.addColor( smokeSettings, 'fireColorHot' ).name( 'Fire Color Hot' ).onChange( ( value ) => material.smokeUniforms.fireColorHot.value.set( value ) );
	fSmoke.add( ui, 'emberSmokeScatter', 0, 0.2, 0.001 ).name( 'Ember Scatter' );

	const bindFluidUniform = ( folder, property, min, max, step, name ) => folder.add( fluid[ property ], 'value', min, max, step ).name( name ).onChange( ( value ) => {

		fluid[ property ].value = Number( value );

	} );

	const fSim = gui.addFolder( 'Simulation' );
	fSim.add( ui, 'autoStep' ).name( 'Auto Step' );
	fSim.add( ui, 'stepOnce' ).name( 'Step Once' );
	fSim.add( ui, 'clearPressure' ).name( 'Clear Pressure' );
	bindFluidUniform( fSim, 'densityDissipation', 0.8, 1, 0.001, 'Density Dissipation' );
	bindFluidUniform( fSim, 'temperatureDissipation', 0.8, 1, 0.001, 'Temperature Dissipation' );
	bindFluidUniform( fSim, 'densityDiffusion', 0, 0.3, 0.001, 'Density Diffusion' );
	bindFluidUniform( fSim, 'densityAdvectionCorrection', 0, 1, 0.01, 'Advection Correction' );
	bindFluidUniform( fSim, 'velocityDissipation', 0.8, 1, 0.001, 'Velocity Dissipation' );
	bindFluidUniform( fSim, 'pressureDissipation', 0, 1, 0.001, 'Pressure History' );

	const fSolver = gui.addFolder( 'Pressure Solver' );
	fSolver.add( ui, 'pressureSolver', [ 'sor', 'multigrid' ] ).name( 'Solver' ).onChange( updatePressureSolver );
	fSolver.add( ui, 'multigridPreset', [ 'quality', 'balanced' ] ).name( 'Multigrid Preset' ).onChange( updatePressureSolver );
	fSolver.add( ui, 'useBoundaries' ).name( 'Domain Boundaries' ).onChange( ( value ) => fluid.setUseBoundaries( value ) );
	fSolver.add( fluid, 'iterations', 1, 64, 1 ).name( 'SOR Iterations' ).onChange( ( value ) => fluid.setPressureIterations( value ) );
	fSolver.add( ui, 'neighborStride', 0.5, 4, 0.5 ).name( 'Neighbor Stride' ).onChange( ( value ) => fluid.neighborStride.value = value );
	bindFluidUniform( fSolver, 'pressureFactor', 0.01, 1, 0.01, 'Pressure Factor' );
	fSolver.add( ui, 'multigridCycles', 1, 8, 1 ).name( 'V-Cycles' ).onChange( updatePressureSolver );
	fSolver.add( ui, 'multigridPreSmooth', 0, 8, 1 ).name( 'Pre Smooth' ).onChange( updatePressureSolver );
	fSolver.add( ui, 'multigridPostSmooth', 0, 8, 1 ).name( 'Post Smooth' ).onChange( updatePressureSolver );
	fSolver.add( ui, 'multigridCoarseIterations', 1, 32, 1 ).name( 'Coarse Iterations' ).onChange( updatePressureSolver );
	fSolver.add( ui, 'multigridMinResolution', 2, 32, 1 ).name( 'Minimum Grid' ).onChange( updatePressureSolver );
	fSolver.add( ui, 'multigridMaxLevels', 2, 6, 1 ).name( 'Maximum Levels' ).onChange( updatePressureSolver );
	fSolver.add( ui, 'multigridAutoTune' ).name( 'Auto Tune' ).onChange( updatePressureSolver );
	fSolver.add( ui, 'multigridCorrectionScale', 0, 1, 0.01 ).name( 'Correction Scale' ).onChange( updatePressureSolver );
	fSolver.add( ui, 'multigridRecursiveCorrectionScale', 0, 1, 0.01 ).name( 'Recursive Scale' ).onChange( updatePressureSolver );

	const fSources = gui.addFolder( 'Sources' );
	fSources.add( ui, 'autoEmitter' ).name( 'Auto Emitter' );
	fSources.add( ui, 'emitterCount', 1, SHOWCASE_EMITTERS.length, 1 ).name( 'Emitter Count' );
	fSources.add( ui, 'emitterSpread', 0, 1.35, 0.01 ).name( 'Emitter Field Spread' );
	fSources.add( ui, 'emitterDensityRate', 0, 4, 0.05 ).name( 'Emitter Density' );
	fSources.add( ui, 'emitterTemperatureRate', 0, 4, 0.05 ).name( 'Emitter Temperature' );
	fSources.add( ui, 'emitterDensityMode', [ 'add', 'inflow' ] ).name( 'Emitter Scalar Mode' );
	fSources.add( ui, 'emitterDensityBlend', 0, 1, 0.01 ).name( 'Density Blend' );
	fSources.add( ui, 'emitterLiftRate', 0, 12, 0.1 ).name( 'Lift / s' );
	fSources.add( ui, 'emitterSway', 0, 1.5, 0.01 ).name( 'Sway' );
	fSources.add( ui, 'emitterVelocityMode', [ 'add', 'inflow' ] ).name( 'Emitter Velocity Mode' );
	fSources.add( ui, 'emitterVelocityBlend', 0, 1, 0.01 ).name( 'Velocity Blend' );
	fSources.add( ui, 'splatStrength', 0, 1000, 0.1 ).name( 'Pointer Strength' );
	fSources.add( ui, 'pointerDensityRate', 0, 4, 0.05 ).name( 'Pointer Density' );
	fSources.add( ui, 'pointerTemperatureRate', 0, 4, 0.05 ).name( 'Pointer Temperature' );
	fSources.add( ui, 'pointerDensityMode', [ 'add', 'inflow' ] ).name( 'Pointer Scalar Mode' );
	fSources.add( ui, 'pointerDensityBlend', 0, 1, 0.01 ).name( 'Pointer Density Blend' );
	fSources.add( ui, 'pointerVelocityMode', [ 'add', 'inflow' ] ).name( 'Pointer Velocity Mode' );
	fSources.add( ui, 'pointerVelocityBlend', 0, 1, 0.01 ).name( 'Pointer Velocity Blend' );
	bindFluidUniform( fSources, 'radius', 0.01, 0.8, 0.01, 'Source Radius' );
	fSources.add( ui, 'splatMode', [ 'auto', 'batched', 'sparse', 'sequential' ] ).name( 'Execution Mode' ).onChange( ( value ) => fluid.setSplatMode( value ) );
	fSources.add( fluid, 'sparseSplatSourceThreshold', 1, fluid.maxSplatSources, 1 ).name( 'Sparse Source Limit' );
	fSources.add( fluid, 'sparseSplatTouchedRatioThreshold', 0, 1, 0.01 ).name( 'Sparse Touched Ratio' );
	fSources.add( fluid, 'sparseSplatMinimumResolution', 1, 256, 1 ).name( 'Sparse Minimum Grid' );
	fSources.add( fluid, 'sparseSplatCutoff', 0.000001, 0.01, 0.000001 ).name( 'Sparse Cutoff' );

	const fForces = gui.addFolder( 'Forces' );
	bindFluidUniform( fForces, 'curlStrength', 0, 30, 0.25, 'Vorticity Confinement' );
	bindFluidUniform( fForces, 'turbulenceStrength', 0, 12, 0.05, 'Turbulence Strength' );
	bindFluidUniform( fForces, 'turbulenceFrequency', 0.25, 4, 0.05, 'Turbulence Scale' );
	bindFluidUniform( fForces, 'turbulenceSpeed', 0, 0.75, 0.01, 'Turbulence Speed' );
	bindFluidUniform( fForces, 'turbulenceOctaves', 1, 4, 1, 'Turbulence Octaves' );
	bindFluidUniform( fForces, 'turbulenceDensityScale', 0, 4, 0.05, 'Turbulence Mask' );
	bindFluidUniform( fForces, 'turbulenceThermalBoost', 0, 3, 0.05, 'Thermal Churn Boost' );
	bindFluidUniform( fForces, 'turbulenceDensityThreshold', 0, 0.1, 0.0005, 'Empty Density Skip' );
	bindFluidUniform( fForces, 'boundaryFade', 0, 0.25, 0.005, 'Boundary Fade' );
	fForces.add( ui, 'turbulenceMode', [ 'low-resolution', 'full-resolution' ] ).name( 'Turbulence Grid' ).onChange( ( value ) => fluid.setTurbulenceMode( value ) );
	fForces.add( fluid, 'turbulenceUpdateInterval', 1, 12, 1 ).name( 'Field Update Interval' );
	bindFluidUniform( fForces, 'buoyancyStrength', 0, 12, 0.05, 'Thermal Buoyancy' );
	bindFluidUniform( fForces, 'densityWeight', 0, 2, 0.01, 'Density Weight' );
	fForces.add( ui, 'buoyancyX', - 1, 1, 0.01 ).name( 'Buoyancy Direction X' ).onChange( updateBuoyancyDirection );
	fForces.add( ui, 'buoyancyY', - 1, 1, 0.01 ).name( 'Buoyancy Direction Y' ).onChange( updateBuoyancyDirection );
	fForces.add( ui, 'buoyancyZ', - 1, 1, 0.01 ).name( 'Buoyancy Direction Z' ).onChange( updateBuoyancyDirection );

	const fCaches = gui.addFolder( 'Caches + Lighting' );
	fCaches.add( ui, 'occupancyCache' ).name( 'Refresh Occupancy Cache' ).onChange( ( value ) => {

		if ( ! value && smokeSettings.useMacrocellSkipping ) {

			smokeSettings.useMacrocellSkipping = false;
			material.setMacrocellSkipping( false );

		}
		updateRenderCaches();

	} );
	fCaches.add( ui, 'lightOpticalDepthCache' ).name( 'Refresh Light Cache' ).onChange( updateRenderCaches );
	bindFluidUniform( fCaches, 'lightSteps', 1, 64, 1, 'Light Cache Steps' );
	fCaches.add( ui, 'lightX', - 1, 1, 0.01 ).name( 'Light Direction X' ).onChange( updateLightDirection );
	fCaches.add( ui, 'lightY', - 1, 1, 0.01 ).name( 'Light Direction Y' ).onChange( updateLightDirection );
	fCaches.add( ui, 'lightZ', - 1, 1, 0.01 ).name( 'Light Direction Z' ).onChange( updateLightDirection );


	const fPass = gui.addFolder( 'Passes' );
	fPass.add( ui, 'runCurl' ).onChange( updateDebugPasses );
	fPass.add( ui, 'runVorticity' ).onChange( updateDebugPasses );
	fPass.add( ui, 'runTurbulence' ).onChange( updateDebugPasses );
	fPass.add( ui, 'runDivergence' ).onChange( updateDebugPasses );
	fPass.add( ui, 'runPressureClear' ).onChange( updateDebugPasses );
	fPass.add( ui, 'runPressureJacobi' ).onChange( updateDebugPasses );
	fPass.add( ui, 'runProjection' ).onChange( updateDebugPasses );
	fPass.add( ui, 'runAdvectVelocity' ).onChange( updateDebugPasses );
	fPass.add( ui, 'runAdvectDensity' ).onChange( updateDebugPasses );
	fPass.add( ui, 'runBuoyancy' ).onChange( updateDebugPasses );

	updateViewControlVisibility();
	const engineeringFolders = [ fGrid, fView, fSmoke, fSim, fSolver, fSources, fForces, fCaches, fPass ];
	for ( const folder of engineeringFolders ) {

		folder.close?.();
		if ( ! debugGui ) folder.hide?.();

	}
	fScene.open?.();
	createQuickBar();

	window.addEventListener( 'resize', onResize );
	rebuildFloorGrid();
	await initializeSimulation();
	if ( autoStart ) beginCameraIntro();

	// The overlay only lifts after the simulation and the complete HDR graph have rendered.
	previousFrameTime = performance.now();
	renderer.setAnimationLoop( animate );

	function updateSliceTransform() {

		const p = ( ui.slicePos - 0.5 ) * 10;
		sliceGroup.rotation.set( 0, 0, 0 );
		sliceGroup.position.set( 0, - p, p );

		// Arrange planes in a padded grid in the plane's local coordinates
		const columns = 4;
		const spacing = 12;
		const rows = Math.ceil( fields.length / columns );
		fields.forEach( ( f, index ) => {

			const col = index % columns;
			const row = Math.floor( index / columns );
			const x = ( col - ( columns - 1 ) / 2 ) * spacing;
			const y = ( ( rows - 1 ) / 2 - row ) * spacing;
			const plane = slicePlanes[ f ];
			plane.mesh.position.set( x, y, 0 );
			plane.label.position.set( x - 1.5, y + 7 - p, 0.02 + p );
			plane.label.updateMatrixWorld();

		} );

		sliceLabels.updateMatrixWorld( true );

	}

	if ( ui.debug ) {

		sliceGroup.visible = true;
		rebuildSliceNodes();
		updateSliceTransform();

	}

	return createSmokeControls( {
		ui,
		fields,
		sliceGroup,
		sliceLayer,
		changeView: ( view ) => {

			currentView = view;
			rebuildRaymarch();
			rebuildSliceNodes();
			updateViewControlVisibility();

		},
		rebuildSliceNodes,
		updateSliceTransform,
	} );



}

async function initializeSimulation() {

	for ( let index = 0; index < initializationSteps; index ++ ) {

		queueAutoEmitter( SIMULATION_FIXED_DELTA );
		fluid.step( renderer, SIMULATION_FIXED_DELTA, {
			refreshRenderCaches: index === initializationSteps - 1,
		} );

	}

	syncVolumeTextures();
	renderFrame();
	await renderer.backend?.device?.queue?.onSubmittedWorkDone?.();
	previousFrameTime = performance.now();
	uiState.autoStep = autoStart;

}

function createSmokeControls( { ui, fields, sliceGroup, sliceLayer, changeView, rebuildSliceNodes, updateSliceTransform } ) {

	const smokeUniforms = material.smokeUniforms;
	const duskBackgroundNode = scene.backgroundNode;
	const setView = ( view ) => {

		if ( view !== 'Smoke' && fields.includes( view ) === false ) throw new Error( `Unknown smoke view: ${view}` );
		ui.view = view;
		changeView( view );
		return view;

	};
	const setDebugSlices = ( enabled ) => {

		ui.debug = enabled === true;
		sliceGroup.visible = ui.debug;
		if ( ui.debug ) {

			rebuildSliceNodes();
			updateSliceTransform();

		}
		return ui.debug;

	};
	const step = ( steps = 1, { emit = ui.autoEmitter } = {} ) => {

		ui.autoStep = false;
		for ( let index = 0; index < steps; index ++ ) {

			if ( emit ) queueAutoEmitter( SIMULATION_FIXED_DELTA );
			fluid.step( renderer, SIMULATION_FIXED_DELTA, { refreshRenderCaches: index === steps - 1 } );

		}
		syncVolumeTextures();
		renderFrame();
		return getDiagnostics();

	};
	const getDiagnostics = () => ( {
		fixedDelta: SIMULATION_FIXED_DELTA,
		plumeTime,
		preset: activePreset,
		view: ui.view,
		debugSlices: ui.debug,
		camera: {
			position: camera.position.toArray(),
			quaternion: camera.quaternion.toArray(),
		},
		controls: {
			enabled: controls.enabled,
			autoRotate: controls.autoRotate,
		},
		mesh: {
			visible: mesh.visible,
			scale: mesh.scale.toArray(),
			position: mesh.position.toArray(),
		},
		scene: { ...sceneGeometryStats },
		sceneChildren: scene.children.length,
		volumeSceneChildren: scene.children.filter( child => child.layers.isEnabled( VOLUME_LAYER ) ).length,
		shaderVariants: {
			useFlowDetail: material.useFlowDetail,
			useHighFrequencyDetail: material.useHighFrequencyDetail,
			useDiagnosticLighting: material.useDiagnosticLighting,
		},
		quality: {
			tier: activeQualityTier,
			resolutionScale: volumeResolutionScale,
			activeRenderTarget: [ volumeCompositor.width, volumeCompositor.height ],
			depthSigma: volumeDepthSigma,
			raymarchSteps: smokeUniforms.steps.value,
			temporal: volumeCompositor.temporal,
			temporalJitter: smokeUniforms.temporalJitter.value,
			volumeSide: material.side,
			volumeDepthTest: material.depthTest,
			postProcessing: postStrength.value > 0.5,
		},
		grid: {
			simRes: fluid.simRes,
			dyeRes: fluid.dyeRes,
			turbulenceRes: fluid.turbulenceRes,
			occupancyRes: fluid.occupancyRes,
			lightRes: fluid.lightRes,
		},
		appearance: {
			densityBoost: smokeUniforms.densityBoost.value,
			absorption: smokeUniforms.absorption.value,
			detailNoiseStrength: smokeUniforms.detailNoiseStrength.value,
			densitySmoothing: smokeUniforms.densitySmoothing.value,
			flowDetail: material.useFlowDetail,
		},
		solver: {
			iterations: fluid.iterations,
			lastStep: fluid.getLastStepStats(),
		},
	} );

	return {
		renderer,
		pause: () => ui.autoStep = false,
		resume: () => {

			simulationAccumulator = 0;
			previousFrameTime = performance.now();
			ui.autoStep = true;

		},
		start: () => {

			simulationAccumulator = 0;
			previousFrameTime = performance.now();
			ui.autoStep = true;
			beginCameraIntro();

		},
		step,
		prewarmPipelineVariants: ( options = {} ) => {

			ui.autoStep = false;
			fluid.prewarmBatchedSplatVariants( renderer );
			fluid.prewarmRenderCacheVariants( renderer, options );
			syncVolumeTextures();
			renderFrame();
			return getDiagnostics();

		},
		stir: stirPlume,
		getDiagnostics,
		setOrbitEnabled: ( enabled ) => controls.enabled = enabled === true,
		setDebugSlices,
		setEmitter: ( settings = {} ) => Object.assign( ui, settings ),
		setWind: ( { strength = ui.windStrength, heading = ui.windHeading } = {} ) => {

			ui.windStrength = strength;
			ui.windHeading = heading;
			updateWindDirection();
			return { strength: ui.windStrength, heading: ui.windHeading };

		},
		setGrid: ( enabled ) => {

			ui.showGrid = enabled === true;
			meshGrid.visible = ui.showGrid;
			if ( floorGrid ) floorGrid.visible = ui.showGrid;

		},
		setBackground: ( value = 0x000000 ) => {

			scene.backgroundNode = null;
			scene.background = new THREE.Color( value );

		},
		setEnvironmentBackground: ( enabled ) => {

			scene.background = enabled === true ? null : new THREE.Color( 0x000000 );
			scene.backgroundNode = enabled === true ? duskBackgroundNode : null;

		},
		setVolumeQuality: ( { resolutionScale, depthSigma, steps } = {} ) => {

			if ( resolutionScale !== undefined ) {

				volumeResolutionScale = Number( resolutionScale );
				ui.volumeResolutionScale = volumeResolutionScale;
				resizeVolumeCompositor();

			}
			if ( depthSigma !== undefined ) {

				setVolumeDepthSigma( depthSigma );
				ui.volumeDepthSigma = volumeDepthSigma;

			}
			if ( steps !== undefined ) smokeUniforms.steps.value = steps;
			return getDiagnostics().quality;

		},
		setQuality: setQualityTier,
		setPreset,
		setPostProcessing: ( enabled ) => {

			postStrength.value = enabled === false ? 0 : 1;
			return postStrength.value === 1;

		},
		setSmokeGroundShadow: ( strength = 1 ) => {

			smokeGroundShadowStrength.value = Math.max( 0, Number( strength ) || 0 );
			ui.groundShadowStrength = smokeGroundShadowStrength.value;
			return smokeGroundShadowStrength.value;

		},
		setShaderVariants: ( variants = {} ) => material.setShaderVariants( variants ),
		setSolverSettings: ( { iterations, solver, ...solverOptions } = {} ) => {

			if ( iterations !== undefined ) fluid.setPressureIterations( iterations );
			if ( solver !== undefined ) fluid.setPressureSolver( solver, solverOptions );

		},
		render: renderFrame,
		setSimulationUniforms: ( settings = {} ) => {

			for ( const [ key, value ] of Object.entries( settings ) ) {

				if ( fluid[ key ]?.value !== undefined ) fluid[ key ].value = value;

			}

		},
		setSimulationOptions: ( { useBoundaries, turbulenceMode, splatMode, debugPasses } = {} ) => {

			if ( useBoundaries !== undefined ) fluid.setUseBoundaries( useBoundaries );
			if ( turbulenceMode !== undefined ) fluid.setTurbulenceMode( turbulenceMode );
			if ( splatMode !== undefined ) fluid.setSplatMode( splatMode );
			if ( debugPasses !== undefined ) fluid.setDebugPasses( debugPasses );

		},
		setSmokeUniforms: ( settings = {} ) => {

			for ( const [ key, value ] of Object.entries( settings ) ) {

				if ( smokeUniforms[ key ]?.value !== undefined ) smokeUniforms[ key ].value = value;

			}
			return getDiagnostics().appearance;

		},
		setSmokeColors: ( settings = {} ) => {

			for ( const [ key, value ] of Object.entries( settings ) ) {

				if ( smokeUniforms[ key ]?.value?.isColor === true ) smokeUniforms[ key ].value.set( value );

			}

		},
		setView,
		setSliceLayer: ( layer ) => {

			ui.sliceLayer = layer;
			sliceLayer.value = layer;
			rebuildSliceNodes();
			updateSliceTransform();

		},
		setCamera: ( { position = [ 0, 3, 15 ], target = [ 0, 0, 0 ], fov = 55 } = {} ) => {

			camera.position.fromArray( position );
			camera.fov = fov;
			camera.updateProjectionMatrix();
			controls.target.fromArray( target );
			controls.update();
			volumeCompositor.resetHistory();

		},
	};

}

function updateQuickBar() {

	if ( ! quickBar ) return;
	for ( const button of quickBar.querySelectorAll( '[data-smoke-preset]' ) ) {

		const selected = button.dataset.smokePreset === activePreset;
		button.classList.toggle( 'is-active', selected );
		button.setAttribute( 'aria-pressed', String( selected ) );

	}
	const qualityButton = quickBar.querySelector( '[data-smoke-quality]' );
	qualityButton.dataset.smokeQuality = activeQualityTier;
	qualityButton.querySelector( 'span' ).textContent = activeQualityTier;
	qualityButton.setAttribute( 'aria-label', `Quality: ${activeQualityTier}. Select the next quality tier.` );

}

function createQuickBar() {

	const style = document.createElement( 'style' );
	style.textContent = `
		.smoke-quickbar{position:absolute;z-index:4;left:50%;bottom:clamp(14px,3vh,28px);display:grid;grid-template-columns:auto 1fr auto;align-items:stretch;min-height:44px;max-width:min(94vw,860px);transform:translateX(-50%);color:#d8d2c7;background:linear-gradient(102deg,rgba(7,17,22,.94),rgba(12,26,34,.92));box-shadow:0 14px 38px rgba(0,0,0,.28),inset 0 0 0 1px rgba(156,183,212,.18);clip-path:polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px);font-family:"Avenir Next Condensed","Arial Narrow",sans-serif;letter-spacing:.04em;user-select:none}
		.smoke-quickbar::before{content:"";position:absolute;inset:0 0 auto;height:1px;background:linear-gradient(90deg,#e26c32 0 18%,#596f7f 52%,#9cb7d4 100%);box-shadow:0 0 13px rgba(126,161,194,.22)}
		.smoke-quickbar__study{display:flex;flex-direction:column;justify-content:center;min-width:112px;padding:7px 16px 6px 18px;border-right:1px solid rgba(156,183,212,.13)}
		.smoke-quickbar__study strong{font:italic 500 13px/1.05 Georgia,"Times New Roman",serif;letter-spacing:.025em;color:#eee8dc}
		.smoke-quickbar__study span{margin-top:3px;color:#718b99;font-size:8px;line-height:1;text-transform:uppercase;letter-spacing:.17em}
		.smoke-quickbar__presets{display:flex;align-items:stretch;overflow-x:auto;scrollbar-width:none}
		.smoke-quickbar__presets::-webkit-scrollbar{display:none}
		.smoke-quickbar button{position:relative;border:0;border-radius:0;margin:0;padding:0 13px;color:#8296a0;background:transparent;font:650 9px/1 "Avenir Next Condensed","Arial Narrow",sans-serif;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;cursor:pointer;transition:color .2s ease,background-color .2s ease}
		.smoke-quickbar button:hover{color:#d8d2c7;background:rgba(156,183,212,.055)}
		.smoke-quickbar button:focus-visible{outline:1px solid #9cb7d4;outline-offset:-4px;color:#fff}
		.smoke-quickbar button.is-active{color:#eee8dc;background:linear-gradient(180deg,rgba(226,108,50,.07),transparent 70%)}
		.smoke-quickbar button.is-active::after{content:"";position:absolute;left:13px;right:13px;bottom:7px;height:1px;background:#e26c32;box-shadow:0 0 8px rgba(226,108,50,.5)}
		.smoke-quickbar__quality{display:grid!important;grid-template-columns:auto 18px;gap:7px;align-items:center;min-width:77px;border-left:1px solid rgba(156,183,212,.13)!important;color:#9cb7d4!important}
		.smoke-quickbar__quality i{display:grid;grid-template-columns:repeat(4,2px);align-items:end;gap:2px;height:10px}
		.smoke-quickbar__quality i::before{content:"";width:14px;height:10px;background:linear-gradient(90deg,#516978 0 24%,transparent 24% 32%,#6e8798 32% 49%,transparent 49% 57%,#8da9bc 57% 74%,transparent 74% 82%,#e26c32 82%);clip-path:polygon(0 70%,20% 70%,20% 48%,46% 48%,46% 25%,72% 25%,72% 0,100% 0,100% 100%,0 100%)}
		.smoke-stir-hint{position:absolute;z-index:3;left:50%;top:24%;transform:translate(-50%,8px);color:rgba(216,210,199,.76);font:600 9px/1 "Avenir Next Condensed","Arial Narrow",sans-serif;letter-spacing:.18em;text-transform:uppercase;text-shadow:0 2px 9px #071116;pointer-events:none;opacity:0;transition:opacity .8s ease,transform 1.2s ease}
		.smoke-stir-hint.is-visible{opacity:1;transform:translate(-50%,0)}
		@media(max-width:720px){.smoke-quickbar{left:10px;right:10px;bottom:10px;max-width:none;transform:none;grid-template-columns:1fr auto}.smoke-quickbar__study{display:none}.smoke-quickbar button{padding:0 10px;font-size:8px;letter-spacing:.09em}.smoke-quickbar button.is-active::after{left:10px;right:10px}.smoke-quickbar__quality{min-width:70px}.smoke-stir-hint{top:20%}}
		@media(prefers-reduced-motion:reduce){.smoke-quickbar button,.smoke-stir-hint{transition:none}}
	`;
	document.head.appendChild( style );

	quickBar = document.createElement( 'div' );
	quickBar.className = 'smoke-quickbar';
	quickBar.setAttribute( 'aria-label', 'Smoke scene controls' );
	quickBar.innerHTML = `
		<div class="smoke-quickbar__study"><strong>Smoke study</strong><span>move to stir · drag to orbit</span></div>
		<div class="smoke-quickbar__presets" role="group" aria-label="Scene preset">
			${Object.keys( SMOKE_PRESETS ).map( preset => `<button type="button" data-smoke-preset="${preset}" aria-pressed="false">${preset}</button>` ).join( '' )}
		</div>
		<button class="smoke-quickbar__quality" type="button" data-smoke-quality><span></span><i aria-hidden="true"></i></button>
	`;
	container.appendChild( quickBar );
	for ( const button of quickBar.querySelectorAll( '[data-smoke-preset]' ) ) {

		button.addEventListener( 'click', () => setPreset( button.dataset.smokePreset ) );

	}
	quickBar.querySelector( '[data-smoke-quality]' ).addEventListener( 'click', () => {

		const nextIndex = ( QUALITY_ORDER.indexOf( activeQualityTier ) + 1 ) % QUALITY_ORDER.length;
		setQualityTier( QUALITY_ORDER[ nextIndex ] );
		updateQuickBar();

	} );

	const hint = document.createElement( 'div' );
	hint.className = 'smoke-stir-hint';
	hint.textContent = 'Move through the plume · drag to orbit';
	container.appendChild( hint );
	requestAnimationFrame( () => hint.classList.add( 'is-visible' ) );
	window.setTimeout( () => hint.classList.remove( 'is-visible' ), 6200 );
	renderer.domElement.addEventListener( 'pointermove', () => hint.classList.remove( 'is-visible' ), { once: true } );
	updateQuickBar();

}

function stirPlume() {

	tmpEmitterPosition.set( 0, - 0.18, 0 );
	mesh.localToWorld( tmpEmitterPosition );
	tmpEmitterVelocity.set( 2.8, 0.35, - 1.4 );
	fluid.addWorldSplat( tmpEmitterPosition, tmpEmitterVelocity, 0, {
		temperatureAmount: 0,
		velocityMode: 'add',
		velocityBlend: 1,
		densityMode: 'add',
		densityBlend: 1,
		radius: fluid.radius.value * 2.2,
	} );

}

function onResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	resizeVolumeCompositor();

}

function setupVolumeCompositor() {

	const compositorOptions = {
		scale: volumeResolutionScale,
		upsampling: 'bilateral',
		outputMode: 'unclamped-hdr',
		depthSigma: volumeDepthSigma,
		depthTexture: scenePass.getTexture( 'depth' ),
	};
	if ( activeQuality.temporal ) {

		compositorOptions.temporal = true;
		compositorOptions.motionTexture = scenePass.getTexture( 'velocity' );
		compositorOptions.historyWeight = 0.86;
		compositorOptions.historyRejection = 0.18;

	}
	volumeCompositor = new VolumeSmokeRenderCompositor( renderer, compositorOptions );

}

function setupRenderPipeline() {

	const smokeColor = volumeCompositor.getTextureNode();
	const linearComposite = Fn( () => {

		// The bilateral reconstruction contains loops and local variables. Materialize it
		// once before reading RGB and alpha so both swizzles share the same resolved sample.
		const resolvedSmoke = vec4( smokeColor ).toVar( 'showcaseResolvedSmoke' );
		const resolvedScene = vec4( sceneColorNode ).toVar( 'showcaseResolvedScene' );
		// Preserve environmental context even when the low fog bed reaches high optical
		// depth. Smoke radiance is untouched; only its scene-occlusion term is capped.
		const smokeOcclusion = resolvedSmoke.a.min( 0.72 ).toVar( 'showcaseSmokeOcclusion' );
		return vec4(
			resolvedSmoke.rgb.add( resolvedScene.rgb.mul( smokeOcclusion.oneMinus() ) ),
			1
		);

	} )();
	bloomPassNode = bloom( linearComposite, 0.46, 0.38, 1.0 );
	shaderCache.container( 'smoke/bloom', bloomPassNode );
	const bloomed = linearComposite.add( bloomPassNode );
	const luma = luminance( bloomed.rgb );
	const shadowWeight = smoothstep( 0.04, 0.58, luma ).oneMinus();
	const highlightWeight = smoothstep( 0.72, 2.8, luma );
	const graded = bloomed.rgb
		.mul( postGain )
		.add( postShadowTint.mul( shadowWeight ) )
		.add( postHighlightTint.mul( highlightWeight ) );
	const vignetteDistance = screenUV.sub( 0.5 ).length();
	const vignette = float( 1 ).sub( smoothstep( 0.34, 0.72, vignetteDistance ).mul( postVignetteStrength ) );
	const grain = hash(
		screenCoordinate.x
			.add( screenCoordinate.y.mul( 4093 ) )
			.add( postFrame.mul( 131.7 ) )
	).sub( 0.5 ).mul( postGrainStrength );
	const finishedFrame = graded.mul( vignette ).add( grain.mul( shadowWeight.mul( 0.65 ).add( 0.35 ) ) );
	const postSelectedFrame = mix( linearComposite.rgb, finishedFrame, postStrength );

	renderPipeline = new THREE.RenderPipeline( renderer );
	renderPipeline.outputColorTransform = false;
	renderPipeline.outputNode = renderOutput( vec4( postSelectedFrame, 1 ), THREE.ACESFilmicToneMapping );

}

function resizeVolumeCompositor() {

	if ( ! volumeCompositor ) return;
	volumeCompositor.setScale( volumeResolutionScale );
	if ( uiState ) uiState.volumeRenderTarget = `${volumeCompositor.width} × ${volumeCompositor.height}`;

}

function setQualityTier( tier ) {

	const normalizedTier = String( tier ).toUpperCase();
	if ( ! Object.hasOwn( QUALITY_TIERS, normalizedTier ) ) throw new Error( `Unknown smoke quality tier: ${tier}` );
	const previousTemporal = activeQuality.temporal;
	activeQualityTier = normalizedTier;
	activeQuality = QUALITY_TIERS[ activeQualityTier ];
	volumeResolutionScale = activeQuality.volumeScale;
	material.smokeUniforms.steps.value = activeQuality.steps;
	material.smokeUniforms.temporalJitter.value = activeQuality.temporal ? 1 : 0;
	material.setShaderVariants( {
		useFlowDetail: activeQuality.flowDetail,
		useHighFrequencyDetail: activeQuality.highFrequencyDetail,
	} );
	material.setSceneShadowNode( activeQuality.sceneShadows ? volumeSceneShadowNode : null );

	if ( previousTemporal !== activeQuality.temporal ) {

		renderPipeline?.dispose();
		volumeCompositor?.dispose();
		setupVolumeCompositor();
		setupRenderPipeline();

	} else {

		resizeVolumeCompositor();
		volumeCompositor.resetHistory();

	}
	if ( uiState ) {

		uiState.qualityTier = activeQualityTier;
		uiState.volumeResolutionScale = volumeResolutionScale;

	}
	updateQuickBar();
	return {
		tier: activeQualityTier,
		...activeQuality,
		gridMatchesTier: fluid.simRes === activeQuality.simRes && fluid.dyeRes === activeQuality.dyeRes,
	};

}

function setPreset( presetName ) {

	if ( ! Object.hasOwn( SMOKE_PRESETS, presetName ) ) throw new Error( `Unknown smoke preset: ${presetName}` );
	const preset = SMOKE_PRESETS[ presetName ];
	activePreset = presetName;
	moonLight.color.set( preset.moon.color );
	moonLight.intensity = preset.moon.intensity;
	skyMoonColor.value.copy( moonLight.color );
	skyMoonIntensity.value = preset.moon.intensity;
	const moonDirection = moonDirectionFromAngles( preset.moon.azimuth, preset.moon.elevation );
	setMoonDirection( moonDirection );
	emberLight.intensity = preset.emberIntensity;
	emberLight.color.set( preset.colors.pointLightColor );
	scene.fog.density = preset.fogDensity;
	sharedFogDensity.value = preset.fogDensity;
	uiState.fogDensity = preset.fogDensity;
	uiState.interactiveFogDensity = preset.interactiveFogDensity;
	uiState.emberIntensity = preset.emberIntensity;
	uiState.emberSmokeScatter = preset.smoke.pointScatter;
	uiState.fireIntensity = preset.smoke.fireIntensity;
	uiState.moonIntensity = preset.moon.intensity;
	uiState.moonAzimuth = preset.moon.azimuth;
	uiState.moonElevation = preset.moon.elevation;
	uiState.windStrength = preset.wind.strength;
	uiState.windHeading = preset.wind.heading;
	uiState.preset = presetName;
	updateWindDirection();

	for ( const [ key, value ] of Object.entries( preset.smoke ) ) {

		if ( key === 'pointScatter' ) continue;
		material.smokeUniforms[ key ].value = value;

	}
	for ( const [ key, value ] of Object.entries( preset.colors ) ) {

		if ( key === 'pointLightColor' ) continue;
		material.smokeUniforms[ key ].value.set( value );

	}
	postGain.value.setRGB( ...preset.grade.gain );
	postShadowTint.value.setRGB( ...preset.grade.shadow );
	postHighlightTint.value.setRGB( ...preset.grade.highlight );
	if ( bloomPassNode ) bloomPassNode.strength.value = preset.grade.bloom;
	volumeCompositor?.resetHistory();
	updateQuickBar();
	return { name: activePreset, quality: activeQualityTier };

}

function updateAdaptiveQuality( frameDelta ) {

	if ( requestedQualityTier || ! autoQualityEnabled ) return;
	qualityProbeCooldown -= frameDelta;
	if ( qualityProbeCooldown > 0 ) return;
	qualityProbeElapsed += frameDelta;
	qualityProbeFrames ++;
	if ( qualityProbeElapsed < 2 ) return;
	const averageFrameTime = qualityProbeElapsed / Math.max( qualityProbeFrames, 1 );
	const tierIndex = QUALITY_ORDER.indexOf( activeQualityTier );
	if ( averageFrameTime > 0.02 && tierIndex > 0 ) setQualityTier( QUALITY_ORDER[ tierIndex - 1 ] );
	qualityProbeElapsed = 0;
	qualityProbeFrames = 0;
	qualityProbeCooldown = 8;

}

function setVolumeDepthSigma( value ) {

	volumeDepthSigma = Math.max( 0, Number( value ) || 0 );
	volumeCompositor?.setDepthSigma( volumeDepthSigma );

}

function updateVolumeRasterState() {

	tmpCameraLocal.copy( camera.position );
	mesh.worldToLocal( tmpCameraLocal );
	const cameraInside = Math.abs( tmpCameraLocal.x ) < 0.5 && Math.abs( tmpCameraLocal.y ) < 0.5 && Math.abs( tmpCameraLocal.z ) < 0.5;
	const nextSide = cameraInside ? THREE.BackSide : THREE.FrontSide;
	const nextDepthTest = ! cameraInside;
	if ( material.side === nextSide && material.depthTest === nextDepthTest ) return;
	material.side = nextSide;
	material.depthTest = nextDepthTest;
	material.needsUpdate = true;

}

function renderVolumeLayer( activeRenderer ) {

	const previousLayerMask = camera.layers.mask;
	camera.layers.set( VOLUME_LAYER );
	try {

		activeRenderer.render( scene, camera );

	} finally {

		camera.layers.mask = previousLayerMask;

	}

}

function renderVolumeBeauty() {

	// The material's scene-depth pass dependency renders the opaque scene first in this
	// renderer frame. The volume then stops at that depth and the final pipeline consumes
	// both targets without a second scene traversal or a display-space layer blend.
	volumeCompositor.render(
		( { renderer: scaledRenderer } ) => renderVolumeLayer( scaledRenderer ),
		{ depthTexture: scenePass.getTexture( 'depth' ), composite: false }
	);
	renderPipeline.render();

}

function renderVolumeDebug() {

	renderer.render( scene, camera );
	renderer.autoClear = false;
	renderVolumeLayer( renderer );
	renderer.autoClear = true;

}

function syncVolumeTextures() {

	material.syncVolumeTextures( {
		densityTexture: fluid.getDensityTexture3D(),
		velocityTexture: fluid.getVelocityTexture3D(),
		curlTexture: fluid.getCurlTexture3D(),
		pressureTexture: fluid.getPressureTexture3D(),
		divergenceTexture: fluid.getDivergenceTexture3D(),
		occupancyTexture: fluid.getOccupancyTexture3D(),
		lightOpticalDepthTexture: fluid.getLightOpticalDepthTexture3D(),
	} );

}

function queueAutoEmitter( frameDelta ) {

	plumeTime += frameDelta;
	const breath = 0.72
		+ ( Math.sin( plumeTime * 1.07 - 0.8 ) * 0.5 + 0.5 ) * 0.23
		+ ( Math.sin( plumeTime * 0.43 + 1.4 ) * 0.5 + 0.5 ) * 0.15;
	mesh.getWorldQuaternion( tmpEmitterQuaternion );
	const windHeading = THREE.MathUtils.degToRad( uiState.windHeading );
	const windLean = Math.tan( THREE.MathUtils.degToRad( THREE.MathUtils.clamp( uiState.windStrength, 0, 7 ) ) );
	const windX = Math.sin( windHeading );
	const windZ = Math.cos( windHeading );
	fogEmissionFrame ++;
	const queueFogFrame = uiState.interactiveFogDensity > 0 && fogEmissionFrame % 20 === 0;
	const emitterCount = Math.min( SHOWCASE_EMITTERS.length, Math.max( 1, Math.round( uiState.emitterCount ) ) );
	if ( ! queueFogFrame ) {

		for ( let index = 0; index < emitterCount; index ++ ) {

			const emitter = SHOWCASE_EMITTERS[ index ];
			const phaseTime = plumeTime + emitter.phase;
			tmpEmitterPosition.set(
				emitter.x * uiState.emitterSpread + ( Math.sin( phaseTime * 1.7 ) + windX * Math.sin( phaseTime * 0.72 ) ) * uiState.emitterSway / mesh.scale.x,
				- 0.47 + Math.sin( phaseTime * 0.65 ) * 0.012,
				emitter.z * uiState.emitterSpread + ( Math.cos( phaseTime * 1.3 ) + windZ * Math.sin( phaseTime * 0.72 ) ) * uiState.emitterSway / mesh.scale.z
			);
			mesh.localToWorld( tmpEmitterPosition );
				tmpEmitterVelocity.set(
					Math.sin( phaseTime * 2.1 ) * uiState.emitterSway + windX * uiState.emitterLiftRate * windLean,
					uiState.emitterLiftRate * emitter.lift * breath,
					Math.cos( phaseTime * 1.9 ) * uiState.emitterSway + windZ * uiState.emitterLiftRate * windLean
				).applyQuaternion( tmpEmitterQuaternion );
				fluid.addWorldSplat( tmpEmitterPosition, tmpEmitterVelocity, uiState.emitterDensityRate * emitter.density * breath, {
					temperatureAmount: uiState.emitterTemperatureRate * emitter.density * ( 0.78 + breath * 0.34 ),
				velocityMode: uiState.emitterVelocityMode,
				velocityBlend: uiState.emitterVelocityBlend,
				densityMode: uiState.emitterDensityMode,
				densityBlend: uiState.emitterDensityBlend,
				radius: fluid.radius.value * emitter.radius,
			} );

		}

	}

	if ( ! queueFogFrame ) return;
	const fogBatch = Math.floor( fogEmissionFrame / 20 ) % 2;
	const fogBatchStart = fogBatch === 0 ? 0 : 4;
	const fogBatchEnd = fogBatch === 0 ? 4 : AMBIENT_FOG_SOURCES.length;
	for ( let index = fogBatchStart; index < fogBatchEnd; index ++ ) {

		const fogSource = AMBIENT_FOG_SOURCES[ index ];
		const phaseTime = plumeTime * 0.32 + fogSource.phase;
		tmpEmitterPosition.set(
			fogSource.x + Math.sin( phaseTime ) * 0.018,
			LOW_FOG_SOURCE_LOCAL_Y + Math.sin( phaseTime * 0.7 ) * 0.003,
			fogSource.z + Math.cos( phaseTime * 0.83 ) * 0.018
		);
		mesh.localToWorld( tmpEmitterPosition );
		tmpEmitterVelocity.set(
			windX * 0.12 + Math.sin( phaseTime * 1.3 ) * 0.035,
			0,
			windZ * 0.12 + Math.cos( phaseTime * 1.1 ) * 0.035
		).applyQuaternion( tmpEmitterQuaternion );
		fluid.addWorldSplat( tmpEmitterPosition, tmpEmitterVelocity, uiState.interactiveFogDensity * fogSource.density, {
			temperatureAmount: 0,
			velocityMode: 'inflow',
			velocityBlend: 0.08,
			densityMode: 'inflow',
			densityBlend: 0.12,
			radius: fluid.radius.value * fogSource.radius,
		} );

	}

}


function animate() {

	const currentFrameTime = performance.now();
	const frameDelta = Math.min( ( currentFrameTime - previousFrameTime ) / 1000, 0.05 );
	previousFrameTime = currentFrameTime;
	controls.update();
	updateCameraIntro( currentFrameTime );
	updateAdaptiveQuality( frameDelta );
	if ( ! uiState || uiState.autoStep === true ) {

		simulationAccumulator = Math.min( simulationAccumulator + frameDelta, SIMULATION_FIXED_DELTA * MAX_SIMULATION_SUBSTEPS );
		const substeps = Math.min( Math.floor( simulationAccumulator / SIMULATION_FIXED_DELTA ), MAX_SIMULATION_SUBSTEPS );
		for ( let index = 0; index < substeps; index ++ ) {

			if ( uiState?.autoEmitter === true ) queueAutoEmitter( SIMULATION_FIXED_DELTA );
			fluid.step( renderer, SIMULATION_FIXED_DELTA, { refreshRenderCaches: index === substeps - 1 } );
			simulationAccumulator -= SIMULATION_FIXED_DELTA;

		}

		if ( substeps > 0 ) {

			syncVolumeTextures();

		}

	}


	renderFrame();

}

function renderFrame() {

	postFrame.value ++;
	if ( material && fluid ) {

		material.smokeUniforms.detailTime.value = fluid.turbulenceTime.value;
		material.smokeUniforms.temporalFrame.value = postFrame.value;

	}
	updateSceneAnimation();
	if ( material && emberLight ) {

		// The dying fire scatters into the plume: reuse the flickering ember light as the
		// volume's point light so both stay in sync.
		emberLight.getWorldPosition( material.smokeUniforms.pointLightPosition.value );
		material.smokeUniforms.pointLightColor.value.copy( emberLight.color );
		material.smokeUniforms.pointLightIntensity.value = emberLight.intensity * ( uiState?.emberSmokeScatter ?? 0 );

	}
	updateVolumeRasterState();
	if ( uiState?.view === 'Smoke' ) {

		renderVolumeBeauty();

	} else {

		renderVolumeDebug();

	}

}

export function unmount() {

	window.removeEventListener( 'resize', onResize );
	renderer?.setAnimationLoop( null );
	controls?.dispose();
	gui?.destroy();
	renderPipeline?.dispose();
	volumeCompositor?.dispose();
	devtools?.dispose();
	devtools = null;
	renderer?.dispose();
	renderer?.domElement?.remove();
	quickBar?.remove();
	quickBar = null;
	renderer = null;
	container = null;

}
