/**
 * SDF Body Tracking — Ball Pit
 *
 * Michelle's real skinned triangles are rebuilt into a signed-distance and
 * surface-velocity field on the GPU every frame by the SkinnedMeshSDF block
 * (three-blocks/sdf-raymarching). A bare MLS-MPM solver samples that live
 * field while 16k glossy impostor balls churn around her samba. MediaPipe's
 * worker/filter stack can take over the same skeleton without changing the
 * collider path — the skeleton is the block's provider seam.
 */

import * as THREE from 'three/webgpu';
import { registerDevtools } from 'three-blocks/devtools';

import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createExampleGui } from '../helpers/exampleGui.js';
import { TriangleGeometry } from '../helpers/exampleGeometries.js';
import { withAssetLoader } from '../helpers/LoadingManager.js';
import { shaderCache } from 'three-blocks/shaders';

import {
	Fn,
	If,
	abs,
	atomicAdd,
	atomicMax,
	atomicStore,
	clamp,
	color,
	cross,
	distance,
	dot,
	float,
	floatBitsToUint,
	floor,
	fract,
	hash,
	instanceIndex,
	instancedArray,
	max,
	min,
	mix,
	mrt,
	normalView,
	normalize,
	output,
	pass,
	select,
	sin,
	smoothstep,
	storage,
	texture3D,
	uint,
	uniform,
	screenUV,
	uv,
	varying,
	vec3,
	vec4,
} from 'three/tsl';

import { MPMFluidModel, MPMSolver } from 'three-blocks/mpm';
import { SkinnedMeshSDF } from 'three-blocks/sdf-raymarching';
import {
	sphereImpostorAlpha,
	sphereImpostorDepth,
	sphereImpostorNormal,
	sphereImpostorPosition,
} from 'three-blocks/sphere-impostors';

//
// Constants
//

const DEFAULT_ORBIT = Object.freeze( {
	position: Object.freeze( [ 3.25, 2.02, 4.25 ] ),
	target: Object.freeze( [ 0, 0.92, 0 ] ),
	swayPhase: 0,
} );
const SDF_DOMAIN_SIZE = new THREE.Vector3( 2.6, 2.4, 2.6 );
const SDF_FAR = 4;
const SDF_CENTER_RANGE = 0.22;
const PIT_SIZE = new THREE.Vector3( 3, 2.25, 3 );
const PIT_GRID = new THREE.Vector3( 48, 36, 48 );
const PIT_MARGIN = 2;
const CELL_WORLD = PIT_SIZE.x / PIT_GRID.x;
const BALL_RADIUS = 0.041;
const PIT_WALL_THICKNESS = BALL_RADIUS * 2 + 0.02;
const BALL_CAPACITY = 65_536;
const BALL_COUNTS = {
	'S — 16k': 16_384,
	'M — 32k': 32_768,
	'L — 65k': 65_536,
};
const QUALITY_TIERS = {
	LOW: { ballCount: 'S — 16k', sdfResolution: 48, sphereDepth: true },
	MED: { ballCount: 'S — 16k', sdfResolution: 64, sphereDepth: true },
	HIGH: { ballCount: 'M — 32k', sdfResolution: 96, sphereDepth: true },
};
const BALL_PALETTES = {
	Playground: [ 0xff5470, 0x4494ff, 0x3fdf82, 0xffd24a ],
	Sorbet: [ 0xff7096, 0x79bdff, 0x79e0a2, 0xffd36a ],
	Arcade: [ 0xff3265, 0x655cff, 0x19d6ad, 0xff9630 ],
};
const SAMBA_START_OFFSET = 5.65;
const CAMERA_SWAY_AMPLITUDE = THREE.MathUtils.degToRad( 18 );
const CAMERA_SWAY_PERIOD = 28;

// MediaPipe pose landmark indices
const LM = {
	NOSE: 0,
	LEFT_EAR: 7, RIGHT_EAR: 8,
	MOUTH_LEFT: 9, MOUTH_RIGHT: 10,
	LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
	LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
	LEFT_WRIST: 15, RIGHT_WRIST: 16,
	LEFT_INDEX: 19, RIGHT_INDEX: 20,
	LEFT_HIP: 23, RIGHT_HIP: 24,
	LEFT_KNEE: 25, RIGHT_KNEE: 26,
	LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
	LEFT_HEEL: 29, RIGHT_HEEL: 30,
	LEFT_FOOT: 31, RIGHT_FOOT: 32,
};

// Bones drawn on the webcam preview
const POSE_BONES = [
	[ 11, 12 ], [ 11, 13 ], [ 13, 15 ], [ 12, 14 ], [ 14, 16 ],
	[ 11, 23 ], [ 12, 24 ], [ 23, 24 ], [ 23, 25 ], [ 25, 27 ],
	[ 24, 26 ], [ 26, 28 ], [ 27, 31 ], [ 28, 32 ], [ 7, 8 ], [ 0, 7 ], [ 0, 8 ],
];

// Tracker packet layout (Float32Array indices)
const PKT_HAS_POSE = 0;
const PKT_HAS_LEFT = 1;
const PKT_HAS_RIGHT = 2;
const PKT_INFER_MS = 3;
const PKT_POSE_NORM = 8; // 33 * (x, y, z, visibility)
const PKT_POSE_WORLD = PKT_POSE_NORM + 33 * 4; // 33 * (x, y, z, visibility)
const PKT_LEFT_HAND = PKT_POSE_WORLD + 33 * 4; // 21 * (x, y, z) world
const PKT_RIGHT_HAND = PKT_LEFT_HAND + 21 * 3;
const PKT_SIZE = PKT_RIGHT_HAND + 21 * 3;

//
// Module Variables
//

let container, renderer, scene, camera, controls;
let devtools;
let scenePass, renderPipeline;
let gui;

let tracker = null;
let rig = null;
let actor = null;
let retargeter = null;
let sdfBuilder = null;
let solver = null;
let ballMesh = null;
let ballMirror = null;
let solverDiagnostics = null;
let sliceMesh = null;
let mixer = null;
let tPoseAction = null;
let sambaAction = null;
let actorMotionState = 'loading';
let actorReady = false;
let simulationReady = false;
let rebuilding = false;
let renderWidth = 1;
let renderHeight = 1;
let environmentTexture = null;
let qualityGovernor = null;
let activeAssets = null;
let renderPixelBudget = 2_200_000;
let maximumRenderSize = null;
let fixedTimeStep = null;
let controlsExpanded = true;
let initialPose = { mode: 'Dance', danceTime: SAMBA_START_OFFSET };
let initialOrbit = DEFAULT_ORBIT;
let autoStartAnimation = true;
let startTrackingOnMount = false;
let animationPaused = false;
let cameraSwayCenterAngle = 0;
let cameraSwayElapsed = 0;
let cameraSwayOffset = 0;
let cameraSwayInteracting = false;

let overlay = null;
let previousTime = 0;
let disposed = false;
let frameNumber = 0;
const frameTimes = [];
const shaderResources = {};
const cameraSwayVector = new THREE.Vector3();
const cameraSwayUp = new THREE.Vector3( 0, 1, 0 );

//
// Parameters
//

const params = {
	mode: 'Dance', // Dance | Your Body
	tracker: 'pose + hands', // parallel workers | 'holistic' single worker
	handDetail: true,
	smoothing: 0.5,
	mirror: true,
	showVideo: true,
	showSkeleton: true,
	ballCount: 'S — 16k',
	bounciness: 0.32,
	friction: 0.18,
	gravity: 4,
	palette: 'Playground',
	sdfResolution: 64,
	showSlice: true,
	showSurfaceVelocity: true,
	resolutionScale: 1.0,
	sphereDepth: true,
	tier: 'MED',
	autoQuality: true,
	autoOrbit: true,
};

//
// One-Euro filter bank
//
// One-Euro filtering adapts smoothing to speed: heavy at rest (kills jitter),
// light in motion (no perceptible lag). One bank filters N scalar channels.
//

class OneEuroBank {

	constructor( channels, minCutoff = 1.2, beta = 0.35, dCutoff = 1.0 ) {

		this.channels = channels;
		this.minCutoff = minCutoff;
		this.beta = beta;
		this.dCutoff = dCutoff;
		this.x = new Float32Array( channels );
		this.dx = new Float32Array( channels );
		this.initialized = new Uint8Array( channels );

	}

	static alpha( cutoff, dt ) {

		const tau = 1 / ( 2 * Math.PI * cutoff );
		return 1 / ( 1 + tau / dt );

	}

	// Filters `source` in place (only indices [begin, end))
	filter( source, dt, begin = 0, end = this.channels ) {

		if ( dt <= 0 ) return;

		const aD = OneEuroBank.alpha( this.dCutoff, dt );

		for ( let i = begin; i < end; i ++ ) {

			const value = source[ i ];

			if ( this.initialized[ i ] === 0 ) {

				this.initialized[ i ] = 1;
				this.x[ i ] = value;
				this.dx[ i ] = 0;
				continue;

			}

			const dxRaw = ( value - this.x[ i ] ) / dt;
			this.dx[ i ] += aD * ( dxRaw - this.dx[ i ] );

			const cutoff = this.minCutoff + this.beta * Math.abs( this.dx[ i ] );
			const a = OneEuroBank.alpha( cutoff, dt );
			this.x[ i ] += a * ( value - this.x[ i ] );

			source[ i ] = this.x[ i ];

		}

	}

	reset( begin = 0, end = this.channels ) {

		this.initialized.fill( 0, begin, end );

	}

}

//
// Filtered live rig
//
// This is the v1 packet/filter/grounding path with only its old procedural
// performer and capsule output removed. The display arrays now feed Retargeter.
//

const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _q0 = new THREE.Quaternion();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();

function setJoint( out, index, x, y, z ) {

	out[ index * 3 ] = x;
	out[ index * 3 + 1 ] = y;
	out[ index * 3 + 2 ] = z;

}

function getJoint( out, index, target ) {

	return target.set( out[ index * 3 ], out[ index * 3 + 1 ], out[ index * 3 + 2 ] );

}

function smoothstepJS( edge0, edge1, x ) {

	const t = Math.min( 1, Math.max( 0, ( x - edge0 ) / ( edge1 - edge0 ) ) );
	return t * t * ( 3 - 2 * t );

}

class BodyRig {

	constructor() {

		this.targetPose = new Float32Array( 33 * 3 );
		this.targetVis = new Float32Array( 33 );
		this.targetLeftHand = new Float32Array( 21 * 3 );
		this.targetRightHand = new Float32Array( 21 * 3 );
		this.displayPose = new Float32Array( 33 * 3 );
		this.displayVis = new Float32Array( 33 );
		this.displayLeftHand = new Float32Array( 21 * 3 );
		this.displayRightHand = new Float32Array( 21 * 3 );
		this.handTarget = new Float32Array( 2 );
		this.handAlpha = new Float32Array( 2 );
		this.poseFilter = new OneEuroBank( 33 * 3 );
		this.handFilter = new OneEuroBank( 2 * 21 * 3, 1.6, 0.5 );
		this.handFilterScratch = new Float32Array( 2 * 21 * 3 );
		this.anchorFilter = new OneEuroBank( 4, 0.6, 0.15 );
		this.anchorScratch = new Float32Array( 4 );
		this.liveWeight = 0;
		this.live = false;
		this.lastPacketTime = - 1e3;
		this.lastPacket = null;
		this.packetClock = 0;
		this.calibratedDistance = 0;
		this.groundOffset = 0;
		this.upperBodyOnlyWeight = 0;
		this.upperBodyOnly = false;
		this.initialized = false;

	}

	ingest( packet, videoAspect, deltaOverride = null ) {

		const now = performance.now() / 1000;
		const dt = deltaOverride ?? ( this.lastPacket ? Math.min( 0.25, now - this.packetClock ) : 1 / 30 );
		this.packetClock = now;

		if ( packet[ PKT_HAS_POSE ] < 0.5 ) {

			this.lastPacket = packet;
			return;

		}

		this.lastPacketTime = now;
		this.lastPacket = packet;
		const mirror = params.mirror ? - 1 : 1;
		const visibility = ( joint ) => packet[ PKT_POSE_NORM + joint * 4 + 3 ];
		const upperConfidence = Math.min(
			visibility( LM.LEFT_SHOULDER ),
			visibility( LM.RIGHT_SHOULDER ),
			Math.max( visibility( LM.LEFT_ELBOW ), visibility( LM.RIGHT_ELBOW ) )
		);
		const lowerConfidence = Math.max(
			Math.min( visibility( LM.LEFT_HIP ), visibility( LM.RIGHT_HIP ) ),
			Math.min( visibility( LM.LEFT_KNEE ), visibility( LM.RIGHT_KNEE ) ),
			Math.min( visibility( LM.LEFT_ANKLE ), visibility( LM.RIGHT_ANKLE ) )
		);
		const upperBodyOnlyTarget = smoothstepJS( 0.45, 0.75, upperConfidence )
			* ( 1 - smoothstepJS( 0.2, 0.5, lowerConfidence ) );
		this.upperBodyOnlyWeight += ( upperBodyOnlyTarget - this.upperBodyOnlyWeight ) * Math.min( 1, dt * 4 );
		this.upperBodyOnly = this.upperBodyOnlyWeight >= 0.5;

		const hx = ( packet[ PKT_POSE_NORM + LM.LEFT_HIP * 4 ] + packet[ PKT_POSE_NORM + LM.RIGHT_HIP * 4 ] ) * 0.5;
		const hy = ( packet[ PKT_POSE_NORM + LM.LEFT_HIP * 4 + 1 ] + packet[ PKT_POSE_NORM + LM.RIGHT_HIP * 4 + 1 ] ) * 0.5;
		const sx = ( packet[ PKT_POSE_NORM + LM.LEFT_SHOULDER * 4 ] + packet[ PKT_POSE_NORM + LM.RIGHT_SHOULDER * 4 ] ) * 0.5;
		const rawPelvisY = - (
			packet[ PKT_POSE_WORLD + LM.LEFT_HIP * 4 + 1 ]
			+ packet[ PKT_POSE_WORLD + LM.RIGHT_HIP * 4 + 1 ]
		) * 0.5;
		const sdx = ( packet[ PKT_POSE_NORM + LM.LEFT_SHOULDER * 4 ] - packet[ PKT_POSE_NORM + LM.RIGHT_SHOULDER * 4 ] ) * videoAspect;
		const sdy = packet[ PKT_POSE_NORM + LM.LEFT_SHOULDER * 4 + 1 ] - packet[ PKT_POSE_NORM + LM.RIGHT_SHOULDER * 4 + 1 ];
		const span2d = Math.max( 0.02, Math.hypot( sdx, sdy ) );
		const wsx = packet[ PKT_POSE_WORLD + LM.LEFT_SHOULDER * 4 ] - packet[ PKT_POSE_WORLD + LM.RIGHT_SHOULDER * 4 ];
		const wsy = packet[ PKT_POSE_WORLD + LM.LEFT_SHOULDER * 4 + 1 ] - packet[ PKT_POSE_WORLD + LM.RIGHT_SHOULDER * 4 + 1 ];
		const wsz = packet[ PKT_POSE_WORLD + LM.LEFT_SHOULDER * 4 + 2 ] - packet[ PKT_POSE_WORLD + LM.RIGHT_SHOULDER * 4 + 2 ];
		const distanceEstimate = Math.max( 0.05, Math.hypot( wsx, wsy, wsz ) ) * 1.1 / span2d;

		if ( this.calibratedDistance === 0 ) this.calibratedDistance = distanceEstimate;
		this.calibratedDistance += ( distanceEstimate - this.calibratedDistance ) * Math.min( 1, dt * 0.1 );

		const anchor = this.anchorScratch;
		const framingCenterX = THREE.MathUtils.lerp( hx, sx, this.upperBodyOnlyWeight );
		const fullBodyAnchorY = 0.95 + ( 0.55 - hy ) * 0.9;
		const upperBodyAnchorY = 0.46 - rawPelvisY;
		anchor[ 0 ] = ( 0.5 - framingCenterX ) * 1.7 * - mirror;
		anchor[ 1 ] = THREE.MathUtils.lerp( fullBodyAnchorY, upperBodyAnchorY, this.upperBodyOnlyWeight );
		anchor[ 2 ] = THREE.MathUtils.clamp( ( this.calibratedDistance - distanceEstimate ) * 0.9, - 1.05, 1.05 );
		anchor[ 3 ] = 0;
		this.anchorFilter.filter( anchor, dt );

		for ( let i = 0; i < 33; i ++ ) {

			const src = PKT_POSE_WORLD + i * 4;
			this.targetPose[ i * 3 ] = packet[ src ] * mirror;
			this.targetPose[ i * 3 + 1 ] = - packet[ src + 1 ];
			this.targetPose[ i * 3 + 2 ] = - packet[ src + 2 ];
			this.targetVis[ i ] = packet[ PKT_POSE_NORM + i * 4 + 3 ];

		}

		this.poseFilter.filter( this.targetPose, dt );

		let feetY = Infinity;
		for ( const joint of [ LM.LEFT_HEEL, LM.RIGHT_HEEL, LM.LEFT_ANKLE, LM.RIGHT_ANKLE ] ) {

			if ( this.targetVis[ joint ] > 0.5 ) feetY = Math.min( feetY, this.targetPose[ joint * 3 + 1 ] );

		}
		const soleLift = 0.042;
		const wantOffset = feetY === Infinity
			? this.groundOffset * ( 1 - this.upperBodyOnlyWeight )
			: soleLift - ( feetY + anchor[ 1 ] );
		this.groundOffset += ( wantOffset - this.groundOffset ) * Math.min( 1, dt * 2.5 );
		const ax = anchor[ 0 ];
		const ay = anchor[ 1 ] + this.groundOffset * ( 1 - this.upperBodyOnlyWeight );
		const az = anchor[ 2 ];

		for ( let i = 0; i < 33; i ++ ) {

			this.targetPose[ i * 3 ] += ax;
			this.targetPose[ i * 3 + 1 ] += ay;
			this.targetPose[ i * 3 + 2 ] += az;

		}

		this.handTarget[ 0 ] = Math.max( this.handTarget[ 0 ], packet[ PKT_HAS_LEFT ] );
		this.handTarget[ 1 ] = Math.max( this.handTarget[ 1 ], packet[ PKT_HAS_RIGHT ] );
		this.ingestHand( packet, PKT_LEFT_HAND, this.targetLeftHand, LM.LEFT_WRIST, 0, mirror, dt );
		this.ingestHand( packet, PKT_RIGHT_HAND, this.targetRightHand, LM.RIGHT_WRIST, 1, mirror, dt );

		if ( ! this.initialized ) {

			this.displayPose.set( this.targetPose );
			this.displayVis.set( this.targetVis );
			this.displayLeftHand.set( this.targetLeftHand );
			this.displayRightHand.set( this.targetRightHand );
			this.initialized = true;

		}

	}

	ingestHand( packet, offset, target, wristJoint, slot, mirror, dt ) {

		if ( packet[ slot === 0 ? PKT_HAS_LEFT : PKT_HAS_RIGHT ] < 0.5 ) return;
		const wx = packet[ offset ] * mirror;
		const wy = - packet[ offset + 1 ];
		const wz = - packet[ offset + 2 ];
		const px = this.targetPose[ wristJoint * 3 ];
		const py = this.targetPose[ wristJoint * 3 + 1 ];
		const pz = this.targetPose[ wristJoint * 3 + 2 ];
		const bankOffset = slot * 63;

		for ( let i = 0; i < 21; i ++ ) {

			const src = offset + i * 3;
			target[ i * 3 ] = packet[ src ] * mirror - wx + px;
			target[ i * 3 + 1 ] = - packet[ src + 1 ] - wy + py;
			target[ i * 3 + 2 ] = - packet[ src + 2 ] - wz + pz;

		}
		this.handFilterScratch.set( target, bankOffset );
		this.handFilter.filter( this.handFilterScratch, dt, bankOffset, bankOffset + 63 );
		target.set( this.handFilterScratch.subarray( bankOffset, bankOffset + 63 ) );

	}

	update( dt ) {

		const now = performance.now() / 1000;
		const live = params.mode === 'Your Body' && now - this.lastPacketTime < 1.2;
		this.live = live;
		this.liveWeight += ( ( live ? 1 : 0 ) - this.liveWeight ) * Math.min( 1, dt * 2.2 );
		if ( ! this.initialized ) return;

		const smoothing = THREE.MathUtils.clamp( params.smoothing, 0, 1 );
		const kPose = 1 - Math.exp( - dt / THREE.MathUtils.lerp( 0.02, 0.09, smoothing ) );
		const kVis = 1 - Math.exp( - dt / 0.12 );

		for ( let i = 0; i < this.displayPose.length; i ++ ) {

			this.displayPose[ i ] += ( this.targetPose[ i ] - this.displayPose[ i ] ) * kPose;

		}
		for ( let i = 0; i < this.displayVis.length; i ++ ) {

			this.displayVis[ i ] += ( this.targetVis[ i ] - this.displayVis[ i ] ) * kVis;

		}
		for ( let slot = 0; slot < 2; slot ++ ) {

			const display = slot === 0 ? this.displayLeftHand : this.displayRightHand;
			const target = slot === 0 ? this.targetLeftHand : this.targetRightHand;
			this.handAlpha[ slot ] += ( this.handTarget[ slot ] - this.handAlpha[ slot ] ) * kVis;
			for ( let i = 0; i < display.length; i ++ ) display[ i ] += ( target[ i ] - display[ i ] ) * kPose;

		}

	}

	getPelvis( target = new THREE.Vector3() ) {

		getJoint( this.displayPose, LM.LEFT_HIP, _v0 );
		getJoint( this.displayPose, LM.RIGHT_HIP, _v1 );
		return target.addVectors( _v0, _v1 ).multiplyScalar( 0.5 );

	}

}

//
// BodyTracker
//
// Landmark inference, structured for latency. The default pipeline runs
// PoseLandmarker and HandLandmarker in two parallel Web Workers, each on its
// own zero-copy VideoFrame clone — no face model (we never use it), no
// serialized holistic chain. Holistic remains available as a single-worker
// fallback/pipeline option for comparison.
//
// Workers are classic (CommonJS shim + importScripts) because the tasks-vision
// wasm loader cannot run in module workers. Only one frame is ever in flight
// per lane; newer camera frames are dropped rather than queued, so results are
// always fresh and the render loop never blocks.
//

// Hands worker packet: [count, inferMs, pad, pad, 2 × (isRightLabel, wristNx, wristNy, pad, 21×3 world)]
const HANDS_PKT_COUNT = 0;
const HANDS_PKT_INFER_MS = 1;
const HANDS_PKT_HANDS = 4;
const HANDS_PKT_HAND_STRIDE = 4 + 21 * 3;
const HANDS_PKT_SIZE = HANDS_PKT_HANDS + 2 * HANDS_PKT_HAND_STRIDE;

const TRACKER_WORKER_SOURCE = `
'use strict';
var landmarker = null;
var taskKind = 'holistic';

function packPose( result ) {

	var packet = new Float32Array( ${PKT_SIZE} );
	var pose = result.landmarks && result.landmarks[ 0 ];
	var world = result.worldLandmarks && result.worldLandmarks[ 0 ];

	if ( pose && world ) {

		packet[ ${PKT_HAS_POSE} ] = 1;

		for ( var i = 0; i < 33; i ++ ) {

			packet[ ${PKT_POSE_NORM} + i * 4 ] = pose[ i ].x;
			packet[ ${PKT_POSE_NORM} + i * 4 + 1 ] = pose[ i ].y;
			packet[ ${PKT_POSE_NORM} + i * 4 + 2 ] = pose[ i ].z;
			packet[ ${PKT_POSE_NORM} + i * 4 + 3 ] = pose[ i ].visibility !== undefined ? pose[ i ].visibility : 1;

			packet[ ${PKT_POSE_WORLD} + i * 4 ] = world[ i ].x;
			packet[ ${PKT_POSE_WORLD} + i * 4 + 1 ] = world[ i ].y;
			packet[ ${PKT_POSE_WORLD} + i * 4 + 2 ] = world[ i ].z;
			packet[ ${PKT_POSE_WORLD} + i * 4 + 3 ] = world[ i ].visibility !== undefined ? world[ i ].visibility : 1;

		}

	}

	return packet;

}

function packHands( result ) {

	var packet = new Float32Array( ${HANDS_PKT_SIZE} );
	var count = Math.min( 2, ( result.landmarks || [] ).length );
	packet[ ${HANDS_PKT_COUNT} ] = count;

	for ( var h = 0; h < count; h ++ ) {

		var base = ${HANDS_PKT_HANDS} + h * ${HANDS_PKT_HAND_STRIDE};
		var category = result.handedness && result.handedness[ h ] && result.handedness[ h ][ 0 ];
		packet[ base ] = category && category.categoryName === 'Right' ? 1 : 0;
		packet[ base + 1 ] = result.landmarks[ h ][ 0 ].x;
		packet[ base + 2 ] = result.landmarks[ h ][ 0 ].y;

		var world = result.worldLandmarks[ h ];

		for ( var j = 0; j < 21; j ++ ) {

			packet[ base + 4 + j * 3 ] = world[ j ].x;
			packet[ base + 4 + j * 3 + 1 ] = world[ j ].y;
			packet[ base + 4 + j * 3 + 2 ] = world[ j ].z;

		}

	}

	return packet;

}

function packHolistic( result ) {

	var packet = new Float32Array( ${PKT_SIZE} );
	var pose = result.poseLandmarks && result.poseLandmarks[ 0 ];
	var world = result.poseWorldLandmarks && result.poseWorldLandmarks[ 0 ];
	var left = result.leftHandWorldLandmarks && result.leftHandWorldLandmarks[ 0 ];
	var right = result.rightHandWorldLandmarks && result.rightHandWorldLandmarks[ 0 ];

	if ( pose && world ) {

		packet[ ${PKT_HAS_POSE} ] = 1;

		for ( var i = 0; i < 33; i ++ ) {

			packet[ ${PKT_POSE_NORM} + i * 4 ] = pose[ i ].x;
			packet[ ${PKT_POSE_NORM} + i * 4 + 1 ] = pose[ i ].y;
			packet[ ${PKT_POSE_NORM} + i * 4 + 2 ] = pose[ i ].z;
			packet[ ${PKT_POSE_NORM} + i * 4 + 3 ] = pose[ i ].visibility !== undefined ? pose[ i ].visibility : 1;

			packet[ ${PKT_POSE_WORLD} + i * 4 ] = world[ i ].x;
			packet[ ${PKT_POSE_WORLD} + i * 4 + 1 ] = world[ i ].y;
			packet[ ${PKT_POSE_WORLD} + i * 4 + 2 ] = world[ i ].z;
			packet[ ${PKT_POSE_WORLD} + i * 4 + 3 ] = world[ i ].visibility !== undefined ? world[ i ].visibility : 1;

		}

	}

	if ( left ) {

		packet[ ${PKT_HAS_LEFT} ] = 1;

		for ( var j = 0; j < 21; j ++ ) {

			packet[ ${PKT_LEFT_HAND} + j * 3 ] = left[ j ].x;
			packet[ ${PKT_LEFT_HAND} + j * 3 + 1 ] = left[ j ].y;
			packet[ ${PKT_LEFT_HAND} + j * 3 + 2 ] = left[ j ].z;

		}

	}

	if ( right ) {

		packet[ ${PKT_HAS_RIGHT} ] = 1;

		for ( var k = 0; k < 21; k ++ ) {

			packet[ ${PKT_RIGHT_HAND} + k * 3 ] = right[ k ].x;
			packet[ ${PKT_RIGHT_HAND} + k * 3 + 1 ] = right[ k ].y;
			packet[ ${PKT_RIGHT_HAND} + k * 3 + 2 ] = right[ k ].z;

		}

	}

	return packet;

}

self.onmessage = function ( event ) {

	var msg = event.data;

	if ( msg.type === 'init' ) {

		taskKind = msg.task;

		Promise.resolve().then( function () {

			self.module = { exports: {} };
			self.exports = self.module.exports;
			importScripts( msg.cjsUrl );
			var vision = self.module.exports;

			return vision.FilesetResolver.forVisionTasks( msg.wasmBase ).then( function ( fileset ) {

				var Task = msg.task === 'pose' ? vision.PoseLandmarker
					: msg.task === 'hands' ? vision.HandLandmarker
						: vision.HolisticLandmarker;

				var options = {
					baseOptions: { modelAssetPath: msg.modelUrl, delegate: 'GPU' },
					runningMode: 'VIDEO',
					canvas: typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas( 1, 1 ) : undefined,
				};

				if ( msg.task === 'pose' ) {

					options.numPoses = 1;
					options.minPoseDetectionConfidence = 0.5;
					options.minPosePresenceConfidence = 0.5;
					options.minTrackingConfidence = 0.5;

				} else if ( msg.task === 'hands' ) {

					options.numHands = 2;
					options.minHandDetectionConfidence = 0.5;
					options.minHandPresenceConfidence = 0.5;
					options.minTrackingConfidence = 0.5;

				} else {

					options.minPoseDetectionConfidence = 0.55;
					options.minPosePresenceConfidence = 0.55;
					options.minHandLandmarksConfidence = 0.55;

				}

				return Task.createFromOptions( fileset, options ).then( function ( created ) {

					return { landmarker: created, delegate: 'GPU' };

				}, function () {

					options.baseOptions.delegate = 'CPU';
					options.canvas = undefined;

					return Task.createFromOptions( fileset, options ).then( function ( created ) {

						return { landmarker: created, delegate: 'CPU' };

					} );

				} );

			} );

		} ).then( function ( created ) {

			landmarker = created.landmarker;
			self.postMessage( { type: 'ready', delegate: created.delegate } );

		}, function ( error ) {

			self.postMessage( { type: 'error', fatal: true, message: String( error && error.message || error ) } );

		} );

	} else if ( msg.type === 'frame' ) {

		var frame = msg.frame;

		try {

			var started = performance.now();
			var result = landmarker.detectForVideo( frame, msg.timestamp );
			var inferMs = performance.now() - started;

			var packet = taskKind === 'pose' ? packPose( result )
				: taskKind === 'hands' ? packHands( result )
					: packHolistic( result );

			packet[ taskKind === 'hands' ? ${HANDS_PKT_INFER_MS} : ${PKT_INFER_MS} ] = inferMs;
			self.postMessage( { type: 'result', packet: packet }, [ packet.buffer ] );

		} catch ( error ) {

			self.postMessage( { type: 'frameError', message: String( error && error.message || error ) } );

		} finally {

			if ( frame && typeof frame.close === 'function' ) frame.close();

		}

	}

};
`;

class BodyTracker {

	constructor( { onPacket, onStatus } ) {

		this.onPacket = onPacket;
		this.onStatus = onStatus;

		this.video = document.createElement( 'video' );
		this.video.playsInline = true;
		this.video.muted = true;

		this.mode = 'split'; // 'split' (pose ∥ hands) | 'holistic'
		this.lanes = null; // { pose, hands } | { holistic }
		this.merged = new Float32Array( PKT_SIZE );

		this.stream = null;
		this.state = 'idle'; // idle | starting | tracking | denied | error | stopped
		this.delegate = null;
		this.runsOnMainThread = false;
		this.mainLandmarker = null;

		this.useVideoFrame = typeof VideoFrame !== 'undefined';
		this.pumpHandle = 0;
		this.frameCounter = 0;

		// Pose-lane aggregates, shown in the status pill
		this.inferMs = 0;
		this.detectionFps = 0;
		this.lastDetectAt = 0;

	}

	get videoAspect() {

		return this.video.videoWidth > 0 ? this.video.videoWidth / this.video.videoHeight : 16 / 9;

	}

	setStatus( state, detail = '' ) {

		this.state = state;
		this.onStatus?.( state, detail );

	}

	async start() {

		if ( this.state === 'starting' || this.state === 'tracking' ) return;

		this.mode = params.tracker === 'holistic' ? 'holistic' : 'split';
		this.setStatus( 'starting', 'requesting camera' );

		try {

			// MediaPipe resizes to ≤256² model inputs internally — capturing
			// beyond 640×360 only makes the per-lane texture uploads slower.
			this.stream = await navigator.mediaDevices.getUserMedia( {
				video: { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: 'user', frameRate: { ideal: 30 } },
				audio: false,
			} );

		} catch ( error ) {

			this.setStatus( error && error.name === 'NotAllowedError' ? 'denied' : 'error', String( error && error.message || error ) );
			return;

		}

		this.video.srcObject = this.stream;
		await this.video.play();

		this.setStatus( 'starting', 'loading models' );

		// The CommonJS bundle carries a .js suffix so it serves as
		// text/javascript — importScripts refuses application/octet-stream.
		const origin = window.location.origin;
		const mediaPipeRoot = new URL( activeAssets.mediaPipeRoot, origin ).href.replace( /\/$/u, '' );
		const modelRoot = new URL( activeAssets.modelRoot, origin ).href.replace( /\/$/u, '' );
		const base = {
			type: 'init',
			cjsUrl: `${mediaPipeRoot}/vision_bundle.cjs.js`,
			mjsUrl: `${mediaPipeRoot}/vision_bundle.mjs`,
			wasmBase: `${mediaPipeRoot}/wasm`,
		};

		if ( this.mode === 'split' ) {

			const [ pose, hands ] = await Promise.all( [
				this.spawnLane( { ...base, task: 'pose', modelUrl: `${modelRoot}/pose_landmarker_full.task` }, ( packet ) => this.onPoseResult( packet ) ),
				this.spawnLane( { ...base, task: 'hands', modelUrl: `${modelRoot}/hand_landmarker.task` }, ( packet ) => this.onHandsResult( packet ) ),
			] );

			if ( pose !== null ) {

				this.lanes = { pose, hands };
				this.delegate = pose.delegate;

				if ( hands === null ) console.warn( 'SDF body tracking: hand lane failed — pose-only mittens' );

			} else {

				hands?.worker.terminate();
				this.mode = 'holistic';
				console.warn( 'SDF body tracking: pose lane failed — falling back to holistic' );

			}

		}

		if ( this.lanes === null && this.mode === 'holistic' ) {

			const holistic = await this.spawnLane( { ...base, task: 'holistic', modelUrl: `${modelRoot}/holistic_landmarker.task` }, ( packet ) => this.onHolisticResult( packet ) );

			if ( holistic !== null ) {

				this.lanes = { holistic };
				this.delegate = holistic.delegate;

			} else if ( (await this.startMainThread( base )) === false ) {

				this.stopStream();
				this.setStatus( 'error', 'landmark models failed to initialize' );
				return;

			}

		}

		this.setStatus( 'tracking', this.describeBackend() );
		this.pump();

	}

	describeBackend() {

		if ( this.runsOnMainThread ) return `${this.delegate} · main thread · holistic`;

		if ( this.lanes?.holistic ) return `${this.delegate} · worker · holistic`;

		if ( this.lanes?.pose ) {

			const hands = this.lanes.hands;
			const handsPart = hands ? `hands ${hands.ms.toFixed( 0 )}ms` : 'mittens';
			return `${this.delegate} ∥ pose ${this.lanes.pose.ms.toFixed( 0 )}ms · ${handsPart}`;

		}

		return `${this.delegate ?? '?'}`;

	}

	// Spawns one landmarker worker; resolves null on any init failure.
	spawnLane( initPayload, onResult ) {

		return new Promise( ( resolve ) => {

			let blobUrl = null;
			let worker = null;

			try {

				const blob = new Blob( [ TRACKER_WORKER_SOURCE ], { type: 'text/javascript' } );
				blobUrl = URL.createObjectURL( blob );
				worker = new Worker( blobUrl );

			} catch {

				resolve( null );
				return;

			}

			const lane = { worker, task: initPayload.task, delegate: null, inFlight: false, ms: 0, hz: 0, lastAt: 0 };

			const timeout = setTimeout( () => {

				worker.terminate();
				resolve( null );

			}, 30000 );

			worker.onerror = ( event ) => {

				console.warn( `SDF body tracking: ${initPayload.task} worker failed —`, event.message ?? event );
				clearTimeout( timeout );
				worker.terminate();
				resolve( null );

			};

			worker.onmessage = ( event ) => {

				const msg = event.data;

				if ( msg.type === 'ready' ) {

					clearTimeout( timeout );
					URL.revokeObjectURL( blobUrl );
					lane.delegate = msg.delegate;

					worker.onmessage = ( resultEvent ) => {

						const resultMsg = resultEvent.data;

						if ( resultMsg.type === 'result' ) {

							lane.inFlight = false;
							this.trackLaneTiming( lane, resultMsg.packet[ lane.task === 'hands' ? HANDS_PKT_INFER_MS : PKT_INFER_MS ] );
							onResult( resultMsg.packet );

						} else if ( resultMsg.type === 'frameError' ) {

							lane.inFlight = false;

							// VideoFrame upload unsupported? Use ImageBitmap transport.
							if ( this.useVideoFrame ) this.useVideoFrame = false;

						}

					};

					resolve( lane );

				} else if ( msg.type === 'error' ) {

					console.warn( `SDF body tracking: ${initPayload.task} init failed —`, msg.message );
					clearTimeout( timeout );
					worker.terminate();
					resolve( null );

				}

			};

			worker.postMessage( initPayload );

		} );

	}

	trackLaneTiming( lane, inferMs ) {

		lane.ms += ( inferMs - lane.ms ) * 0.15;

		const now = performance.now();

		if ( lane.lastAt > 0 ) {

			const hz = 1000 / Math.max( 1, now - lane.lastAt );
			lane.hz += ( hz - lane.hz ) * 0.15;

		}

		lane.lastAt = now;

		if ( lane.task !== 'hands' ) {

			this.inferMs = lane.ms;
			this.detectionFps = lane.hz;

		}

	}

	// --- result merging (split mode) ---

	onPoseResult( packet ) {

		this.merged[ PKT_HAS_POSE ] = packet[ PKT_HAS_POSE ];
		this.merged[ PKT_INFER_MS ] = packet[ PKT_INFER_MS ];
		this.merged.set( packet.subarray( PKT_POSE_NORM, PKT_LEFT_HAND ), PKT_POSE_NORM );

		this.onPacket?.( this.merged );

	}

	onHandsResult( handsPacket ) {

		const count = handsPacket[ HANDS_PKT_COUNT ];

		// Missing detections never clear a hand. Each side retains its last
		// confident articulation and is replaced independently on reacquisition.
		if ( count < 1 ) return;

		// Assign detected hands to body sides by proximity to the pose wrists
		// (labels alone flip easily on mirrored feeds).
		const posePresent = this.merged[ PKT_HAS_POSE ] > 0.5;
		const wristL = [ this.merged[ PKT_POSE_NORM + LM.LEFT_WRIST * 4 ], this.merged[ PKT_POSE_NORM + LM.LEFT_WRIST * 4 + 1 ] ];
		const wristR = [ this.merged[ PKT_POSE_NORM + LM.RIGHT_WRIST * 4 ], this.merged[ PKT_POSE_NORM + LM.RIGHT_WRIST * 4 + 1 ] ];
		const taken = [ false, false ];

		for ( let h = 0; h < count; h ++ ) {

			const base = HANDS_PKT_HANDS + h * HANDS_PKT_HAND_STRIDE;
			const wx = handsPacket[ base + 1 ];
			const wy = handsPacket[ base + 2 ];

			let slot;

			if ( posePresent ) {

				const dL = Math.hypot( wx - wristL[ 0 ], wy - wristL[ 1 ] );
				const dR = Math.hypot( wx - wristR[ 0 ], wy - wristR[ 1 ] );
				slot = dL <= dR ? 0 : 1;

			} else {

				slot = handsPacket[ base ] > 0.5 ? 1 : 0;

			}

			if ( taken[ slot ] ) slot = 1 - slot;
			if ( taken[ slot ] ) continue;
			taken[ slot ] = true;

			const dst = slot === 0 ? PKT_LEFT_HAND : PKT_RIGHT_HAND;

			for ( let j = 0; j < 63; j ++ ) this.merged[ dst + j ] = handsPacket[ base + 4 + j ];

			this.merged[ slot === 0 ? PKT_HAS_LEFT : PKT_HAS_RIGHT ] = 1;

		}

	}

	onHolisticResult( packet ) {

		this.merged[ PKT_HAS_POSE ] = packet[ PKT_HAS_POSE ];
		this.merged[ PKT_INFER_MS ] = packet[ PKT_INFER_MS ];
		this.merged.set( packet.subarray( PKT_POSE_NORM, PKT_LEFT_HAND ), PKT_POSE_NORM );

		// Holistic emits zero presence for a momentarily occluded hand. Merge
		// positive updates only so the last good hand survives those gaps.
		if ( packet[ PKT_HAS_LEFT ] > 0.5 ) {

			this.merged[ PKT_HAS_LEFT ] = 1;
			this.merged.set( packet.subarray( PKT_LEFT_HAND, PKT_RIGHT_HAND ), PKT_LEFT_HAND );

		}

		if ( packet[ PKT_HAS_RIGHT ] > 0.5 ) {

			this.merged[ PKT_HAS_RIGHT ] = 1;
			this.merged.set( packet.subarray( PKT_RIGHT_HAND, PKT_SIZE ), PKT_RIGHT_HAND );

		}

		this.onPacket?.( this.merged );

	}

	// --- frame pump ---

	pump() {

		const schedule = () => {

			if ( this.state !== 'tracking' ) return;

			if ( typeof this.video.requestVideoFrameCallback === 'function' ) {

				this.pumpHandle = this.video.requestVideoFrameCallback( onFrame );

			} else {

				this.pumpHandle = requestAnimationFrame( onFrame );

			}

		};

		const onFrame = () => {

			if ( this.state !== 'tracking' ) return;

			this.frameCounter ++;

			if ( this.video.readyState >= 2 ) {

				const timestamp = performance.now();

				if ( this.runsOnMainThread ) {

					try {

						const started = performance.now();
						const result = this.mainLandmarker.detectForVideo( this.video, timestamp );
						this.inferMs += ( performance.now() - started - this.inferMs ) * 0.15;
						this.onHolisticResult( this.packMainThread( result ) );

					} catch {

						// Skip this frame; transient decode states can throw.

					}

				} else {

					this.dispatchFrames( timestamp );

				}

			}

			schedule();

		};

		schedule();

	}

	shouldSendHands() {

		if ( ! params.handDetail ) return false;

		if ( this.merged[ PKT_HAS_POSE ] > 0.5 ) {

			const wristVisible = this.merged[ PKT_POSE_NORM + LM.LEFT_WRIST * 4 + 3 ] > 0.4
				|| this.merged[ PKT_POSE_NORM + LM.RIGHT_WRIST * 4 + 3 ] > 0.4;

			if ( wristVisible ) return true;

		}

		// Keep probing at a lower rate through wrist/pose occlusion so a held
		// hand is replaced promptly when the detector can see it again.
		return this.frameCounter % 3 === 0;

	}

	dispatchFrames( timestamp ) {

		const primary = this.lanes.pose ?? this.lanes.holistic;
		const hands = this.lanes.hands ?? null;

		const sendPrimary = primary && primary.inFlight === false;
		const sendHands = hands !== null && hands.inFlight === false && this.shouldSendHands();

		if ( ! sendPrimary && ! sendHands ) return;

		if ( this.useVideoFrame ) {

			try {

				const frame = new VideoFrame( this.video );
				const handsFrame = sendPrimary && sendHands ? frame.clone() : frame;

				if ( sendPrimary ) this.sendFrame( primary, frame, timestamp );
				if ( sendHands ) this.sendFrame( hands, sendPrimary ? handsFrame : frame, timestamp );

				return;

			} catch {

				this.useVideoFrame = false;

			}

		}

		// ImageBitmap fallback: one decode per lane (rare path)
		for ( const [ lane, wanted ] of [ [ primary, sendPrimary ], [ hands, sendHands ] ] ) {

			if ( ! wanted ) continue;

			lane.inFlight = true;
			createImageBitmap( this.video ).then( ( bitmap ) => {

				if ( this.state !== 'tracking' ) {

					bitmap.close();
					lane.inFlight = false;
					return;

				}

				lane.worker.postMessage( { type: 'frame', frame: bitmap, timestamp }, [ bitmap ] );

			}, () => {

				lane.inFlight = false;

			} );

		}

	}

	sendFrame( lane, frame, timestamp ) {

		lane.inFlight = true;
		lane.worker.postMessage( { type: 'frame', frame, timestamp }, [ frame ] );

	}

	// --- main-thread holistic fallback ---

	async startMainThread( base ) {

		try {

			const vision = await import( /* @vite-ignore */ `${base.mjsUrl}` );
			const fileset = await vision.FilesetResolver.forVisionTasks( base.wasmBase );
			const modelRoot = new URL( activeAssets.modelRoot, window.location.origin ).href.replace( /\/$/u, '' );

			const options = {
				baseOptions: { modelAssetPath: `${modelRoot}/holistic_landmarker.task`, delegate: 'GPU' },
				runningMode: 'VIDEO',
				minPoseDetectionConfidence: 0.55,
				minPosePresenceConfidence: 0.55,
				minHandLandmarksConfidence: 0.55,
			};

			try {

				this.mainLandmarker = await vision.HolisticLandmarker.createFromOptions( fileset, options );
				this.delegate = 'GPU';

			} catch {

				options.baseOptions.delegate = 'CPU';
				this.mainLandmarker = await vision.HolisticLandmarker.createFromOptions( fileset, options );
				this.delegate = 'CPU';

			}

			this.runsOnMainThread = true;
			return true;

		} catch {

			return false;

		}

	}

	packMainThread( result ) {

		const packet = new Float32Array( PKT_SIZE );
		const pose = result.poseLandmarks?.[ 0 ];
		const world = result.poseWorldLandmarks?.[ 0 ];
		const left = result.leftHandWorldLandmarks?.[ 0 ];
		const right = result.rightHandWorldLandmarks?.[ 0 ];

		if ( pose && world ) {

			packet[ PKT_HAS_POSE ] = 1;

			for ( let i = 0; i < 33; i ++ ) {

				packet.set( [ pose[ i ].x, pose[ i ].y, pose[ i ].z, pose[ i ].visibility ?? 1 ], PKT_POSE_NORM + i * 4 );
				packet.set( [ world[ i ].x, world[ i ].y, world[ i ].z, world[ i ].visibility ?? 1 ], PKT_POSE_WORLD + i * 4 );

			}

		}

		if ( left ) {

			packet[ PKT_HAS_LEFT ] = 1;
			for ( let i = 0; i < 21; i ++ ) packet.set( [ left[ i ].x, left[ i ].y, left[ i ].z ], PKT_LEFT_HAND + i * 3 );

		}

		if ( right ) {

			packet[ PKT_HAS_RIGHT ] = 1;
			for ( let i = 0; i < 21; i ++ ) packet.set( [ right[ i ].x, right[ i ].y, right[ i ].z ], PKT_RIGHT_HAND + i * 3 );

		}

		packet[ PKT_INFER_MS ] = this.inferMs;
		return packet;

	}

	stopStream() {

		this.stream?.getTracks().forEach( ( track ) => track.stop() );
		this.stream = null;
		this.video.srcObject = null;

	}

	stop() {

		this.setStatus( 'stopped' );

		if ( typeof this.video.cancelVideoFrameCallback === 'function' && this.pumpHandle ) {

			this.video.cancelVideoFrameCallback( this.pumpHandle );

		} else if ( this.pumpHandle ) {

			cancelAnimationFrame( this.pumpHandle );

		}

		if ( this.lanes !== null ) {

			for ( const lane of Object.values( this.lanes ) ) lane?.worker.terminate();

			this.lanes = null;

		}

		this.mainLandmarker?.close();
		this.mainLandmarker = null;
		this.runsOnMainThread = false;
		this.merged.fill( 0 );
		this.stopStream();

	}

}

//
// TSL — uniforms
//


//
// Michelle retargeting
//

const MIXAMO = 'mixamorig:';
const MIXAMO_RUNTIME_PREFIX = /^mixamorig[:_]?/;
const CORE_BONE_NAMES = [
	'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
	'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
	'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
	'LeftUpLeg', 'LeftLeg', 'LeftFoot',
	'RightUpLeg', 'RightLeg', 'RightFoot',
];

function midpoint( pose, a, b, target ) {

	getJoint( pose, a, target );
	getJoint( pose, b, _v3 );
	return target.add( _v3 ).multiplyScalar( 0.5 );

}

function poseDirection( pose, a, b, target ) {

	getJoint( pose, a, target );
	getJoint( pose, b, _v3 );
	return target.subVectors( _v3, target ).normalize();

}

function posePlaneNormal( pose, a, b, c, target ) {

	getJoint( pose, a, target );
	getJoint( pose, b, _v2 );
	getJoint( pose, c, _v3 );
	_v2.sub( target );
	_v3.sub( target );
	target.crossVectors( _v2, _v3 );
	return target.lengthSq() > 1e-8 ? target.normalize() : target.set( 0, 0, 1 );

}

const RETARGET_DEFINITIONS = [
	{
		name: 'Hips', child: 'Spine', confidence: [ LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER ],
		calibratedAim: true,
		aim: ( pose, out ) => out.subVectors(
			midpoint( pose, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, _v1 ),
			midpoint( pose, LM.LEFT_HIP, LM.RIGHT_HIP, _v0 )
		).normalize(),
		hint: ( pose, out ) => poseDirection( pose, LM.LEFT_HIP, LM.RIGHT_HIP, out ),
	},
	... [ 'Spine', 'Spine1', 'Spine2' ].map( ( name ) => ( {
		name, child: name === 'Spine' ? 'Spine1' : name === 'Spine1' ? 'Spine2' : 'Neck',
		calibratedAim: true,
		confidence: [ LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER ],
		aim: ( pose, out ) => out.subVectors(
			midpoint( pose, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, _v1 ),
			midpoint( pose, LM.LEFT_HIP, LM.RIGHT_HIP, _v0 )
		).normalize(),
		hint: ( pose, out ) => poseDirection( pose, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, out ),
	} ) ),
	{
		name: 'Neck', child: 'Head', confidence: [ LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_EAR, LM.RIGHT_EAR ],
		calibratedAim: true,
		aim: ( pose, out ) => out.subVectors(
			midpoint( pose, LM.LEFT_EAR, LM.RIGHT_EAR, _v1 ),
			midpoint( pose, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, _v0 )
		).normalize(),
		hint: ( pose, out ) => poseDirection( pose, LM.LEFT_EAR, LM.RIGHT_EAR, out ),
	},
	{
		name: 'Head', child: 'HeadTop_End', confidence: [ LM.LEFT_EAR, LM.RIGHT_EAR, LM.NOSE ],
		calibratedAim: true,
		preserveHintHemisphere: true,
		aim: ( pose, out ) => {

			const ears = poseDirection( pose, LM.LEFT_EAR, LM.RIGHT_EAR, _v1 );
			const center = midpoint( pose, LM.LEFT_EAR, LM.RIGHT_EAR, _v0 );
			const torsoUp = center.clone().sub(
				midpoint( pose, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, new THREE.Vector3() )
			).normalize();
			getJoint( pose, LM.NOSE, out ).sub( center ).normalize();
			out.cross( ears ).normalize();
			if ( out.dot( torsoUp ) < 0 ) out.negate();
			return out;

		},
		hint: ( pose, out ) => {

			const center = midpoint( pose, LM.LEFT_EAR, LM.RIGHT_EAR, _v0 );
			return getJoint( pose, LM.NOSE, out ).sub( center ).normalize();

		},
	},
	... [
		[ 'LeftShoulder', 'LeftArm', LM.LEFT_SHOULDER, LM.LEFT_ELBOW, [ LM.LEFT_SHOULDER, LM.LEFT_ELBOW ] ],
		[ 'RightShoulder', 'RightArm', LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, [ LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW ] ],
	].map( ( [ name, child, shoulder, elbow, confidence ] ) => ( {
		name, child, confidence, calibratedAim: true,
		aim: ( pose, out ) => {

			const center = midpoint( pose, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, _v0 );
			getJoint( pose, shoulder, out ).sub( center );
			getJoint( pose, elbow, _v1 ).sub( getJoint( pose, shoulder, _v2 ) );
			return out.addScaledVector( _v1, 0.12 ).normalize();

		},
		hint: ( pose, out ) => posePlaneNormal( pose, shoulder, elbow, name.startsWith( 'Left' ) ? LM.LEFT_WRIST : LM.RIGHT_WRIST, out ),
	} ) ),
	... [
		[ 'LeftArm', 'LeftForeArm', LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST ],
		[ 'LeftForeArm', 'LeftHand', LM.LEFT_ELBOW, LM.LEFT_WRIST, LM.LEFT_INDEX ],
		[ 'RightArm', 'RightForeArm', LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST ],
		[ 'RightForeArm', 'RightHand', LM.RIGHT_ELBOW, LM.RIGHT_WRIST, LM.RIGHT_INDEX ],
	].map( ( [ name, child, a, b, c ] ) => ( {
		name, child, confidence: [ a, b ],
		aim: ( pose, out ) => poseDirection( pose, a, b, out ),
		hint: ( pose, out ) => posePlaneNormal( pose, a, b, c, out ),
		twistDamping: name.includes( 'ForeArm' ) ? 0.15 : 0.08,
	} ) ),
	... [
		[ 'LeftUpLeg', 'LeftLeg', LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE ],
		[ 'LeftLeg', 'LeftFoot', LM.LEFT_KNEE, LM.LEFT_ANKLE, LM.LEFT_FOOT ],
		[ 'LeftFoot', 'LeftToeBase', LM.LEFT_ANKLE, LM.LEFT_FOOT, LM.LEFT_KNEE ],
		[ 'RightUpLeg', 'RightLeg', LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE ],
		[ 'RightLeg', 'RightFoot', LM.RIGHT_KNEE, LM.RIGHT_ANKLE, LM.RIGHT_FOOT ],
		[ 'RightFoot', 'RightToeBase', LM.RIGHT_ANKLE, LM.RIGHT_FOOT, LM.RIGHT_KNEE ],
	].map( ( [ name, child, a, b, c ] ) => ( {
		name, child, confidence: [ a, b ],
		aim: ( pose, out ) => poseDirection( pose, a, b, out ),
		hint: ( pose, out ) => posePlaneNormal( pose, a, b, c, out ),
	} ) ),
];

class Retargeter {

	constructor( root, skinnedMesh ) {

		this.root = root;
		this.skinnedMesh = skinnedMesh;
		this.bones = new Map();
		root.traverse( ( object ) => {

			// GLTFLoader sanitizes ':' to '_' for animation-track-safe node
			// names, while other loaders preserve Mixamo's original prefix.
			if ( object.isBone ) this.bones.set( object.name.replace( MIXAMO_RUNTIME_PREFIX, '' ), object );

		} );
		for ( const name of CORE_BONE_NAMES ) {

			if ( ! this.bones.has( name ) ) throw new Error( `SDF body tracking: Michelle is missing ${MIXAMO}${name}.` );

		}
		this.actorXFromStageX = this._actorXFromStageX();
		this.restPose = new Float32Array( 33 * 3 );
		this.restVis = new Float32Array( 33 ).fill( 1 );
		this.restLeftHand = new Float32Array( 21 * 3 );
		this.restRightHand = new Float32Array( 21 * 3 );
		this.entries = [];
		this._buildRestStagePose();
		this._calibrateEntries();

	}

	_actorXFromStageX() {

		this.root.updateMatrixWorld( true );
		const left = this.bones.get( 'LeftArm' ).getWorldPosition( _v0 );
		const right = this.bones.get( 'RightArm' ).getWorldPosition( _v1 );
		const actorLeftSign = Math.sign( left.x - right.x ) || - 1;
		return actorLeftSign / - 1;

	}

	actorToStage( point, target = point.clone() ) {

		target.copy( point );
		target.x /= this.actorXFromStageX;
		return target;

	}

	stageToActor( point, target = point.clone() ) {

		target.copy( point );
		target.x *= this.actorXFromStageX;
		return target;

	}

	stageVectorToActor( vector, target = vector.clone() ) {

		target.copy( vector );
		target.x *= this.actorXFromStageX;
		return target.normalize();

	}

	_bonePoint( name, target ) {

		return this.actorToStage( this.bones.get( name ).getWorldPosition( target ), target );

	}

	_buildRestStagePose() {

		const pose = this.restPose;
		const setFromBone = ( joint, bone ) => {

			this._bonePoint( bone, _v0 );
			setJoint( pose, joint, _v0.x, _v0.y, _v0.z );

		};
		setFromBone( LM.LEFT_HIP, 'LeftUpLeg' );
		setFromBone( LM.RIGHT_HIP, 'RightUpLeg' );
		setFromBone( LM.LEFT_KNEE, 'LeftLeg' );
		setFromBone( LM.RIGHT_KNEE, 'RightLeg' );
		setFromBone( LM.LEFT_ANKLE, 'LeftFoot' );
		setFromBone( LM.RIGHT_ANKLE, 'RightFoot' );
		setFromBone( LM.LEFT_HEEL, 'LeftFoot' );
		setFromBone( LM.RIGHT_HEEL, 'RightFoot' );
		setFromBone( LM.LEFT_FOOT, 'LeftToeBase' );
		setFromBone( LM.RIGHT_FOOT, 'RightToeBase' );
		setFromBone( LM.LEFT_SHOULDER, 'LeftArm' );
		setFromBone( LM.RIGHT_SHOULDER, 'RightArm' );
		setFromBone( LM.LEFT_ELBOW, 'LeftForeArm' );
		setFromBone( LM.RIGHT_ELBOW, 'RightForeArm' );
		setFromBone( LM.LEFT_WRIST, 'LeftHand' );
		setFromBone( LM.RIGHT_WRIST, 'RightHand' );
		setFromBone( LM.LEFT_INDEX, 'LeftHandIndex1' );
		setFromBone( LM.RIGHT_INDEX, 'RightHandIndex1' );

		this._bonePoint( 'Head', _v0 );
		this._bonePoint( 'HeadTop_End', _v1 );
		const headUp = _v1.sub( _v0 ).normalize();
		const side = new THREE.Vector3( 1 / this.actorXFromStageX, 0, 0 ).normalize();
		const forward = new THREE.Vector3().crossVectors( side, headUp ).normalize();
		setJoint( pose, LM.LEFT_EAR, _v0.x - side.x * 0.07, _v0.y - side.y * 0.07, _v0.z - side.z * 0.07 );
		setJoint( pose, LM.RIGHT_EAR, _v0.x + side.x * 0.07, _v0.y + side.y * 0.07, _v0.z + side.z * 0.07 );
		setJoint( pose, LM.NOSE, _v0.x + forward.x * 0.1, _v0.y + forward.y * 0.1, _v0.z + forward.z * 0.1 );
		setJoint( pose, LM.MOUTH_LEFT, _v0.x - side.x * 0.025 + forward.x * 0.08, _v0.y - 0.045, _v0.z - side.z * 0.025 + forward.z * 0.08 );
		setJoint( pose, LM.MOUTH_RIGHT, _v0.x + side.x * 0.025 + forward.x * 0.08, _v0.y - 0.045, _v0.z + side.z * 0.025 + forward.z * 0.08 );

	}

	_calibrateEntries() {

		this.root.updateMatrixWorld( true );
		for ( const definition of RETARGET_DEFINITIONS ) {

			const bone = this.bones.get( definition.name );
			const child = this.bones.get( definition.child );
			if ( ! bone || ! child ) continue;
			const restWorldQuaternion = bone.getWorldQuaternion( new THREE.Quaternion() );
			const restWorldPosition = bone.getWorldPosition( new THREE.Vector3() );
			const restDirection = child.getWorldPosition( new THREE.Vector3() ).sub( restWorldPosition ).normalize();
			const restInputDirection = this.stageVectorToActor( definition.aim( this.restPose, new THREE.Vector3() ) );
			const stageHint = definition.hint( this.restPose, new THREE.Vector3() );
			const restHint = this.stageVectorToActor( stageHint );
			restHint.addScaledVector( restDirection, - restHint.dot( restDirection ) );
			if ( restHint.lengthSq() < 1e-8 ) restHint.set( 0, 0, 1 ).applyQuaternion( restWorldQuaternion );
			restHint.normalize();
			this.entries.push( {
				...definition,
				bone,
				child,
				restLocalQuaternion: bone.quaternion.clone(),
				restWorldQuaternion,
				restWorldPosition,
				restDirection,
				restInputDirection,
				restHint,
				filteredTwist: 0,
			} );

		}
		this.restHipsPosition = this.bones.get( 'Hips' ).getWorldPosition( new THREE.Vector3() );

	}

	_confidence( entry, vis ) {

		let confidence = 1;
		for ( const joint of entry.confidence ) confidence = Math.min( confidence, vis[ joint ] ?? 0 );
		return smoothstepJS( 0.3, 0.65, confidence );

	}

	apply( bodyRig, dt, forceWeight = null ) {

		const weight = forceWeight ?? bodyRig.liveWeight;
		if ( weight <= 0.0001 || ! bodyRig.initialized ) return;
		const pose = bodyRig.displayPose;
		const vis = bodyRig.displayVis;

		for ( const entry of this.entries ) {

			const mixerQuaternion = entry.bone.quaternion.clone();
			const inputDirection = this.stageVectorToActor( entry.aim( pose, new THREE.Vector3() ) );
			const targetDirection = entry.calibratedAim
				? entry.restDirection.clone().applyQuaternion(
					new THREE.Quaternion().setFromUnitVectors( entry.restInputDirection, inputDirection )
				).normalize()
				: inputDirection;
			if ( targetDirection.lengthSq() < 1e-8 ) continue;
			const swing = new THREE.Quaternion().setFromUnitVectors( entry.restDirection, targetDirection );
			const swungHint = entry.restHint.clone().applyQuaternion( swing );
			swungHint.addScaledVector( targetDirection, - swungHint.dot( targetDirection ) ).normalize();
			const targetHint = this.stageVectorToActor( entry.hint( pose, new THREE.Vector3() ) );
			targetHint.addScaledVector( targetDirection, - targetHint.dot( targetDirection ) );
			if ( targetHint.lengthSq() < 1e-8 ) targetHint.copy( swungHint );
			targetHint.normalize();
			if ( entry.preserveHintHemisphere && targetHint.dot( swungHint ) < 0 ) targetHint.negate();
			const sine = targetDirection.dot( new THREE.Vector3().crossVectors( swungHint, targetHint ) );
			const cosine = THREE.MathUtils.clamp( swungHint.dot( targetHint ), - 1, 1 );
			const rawTwist = Math.atan2( sine, cosine );
			const twistRate = forceWeight !== null ? 1 : 1 - Math.exp( - dt / ( entry.twistDamping ?? 0.07 ) );
			let deltaTwist = rawTwist - entry.filteredTwist;
			deltaTwist = Math.atan2( Math.sin( deltaTwist ), Math.cos( deltaTwist ) );
			entry.filteredTwist += deltaTwist * twistRate;
			const twist = new THREE.Quaternion().setFromAxisAngle( targetDirection, entry.filteredTwist );
			const targetWorld = twist.multiply( swing ).multiply( entry.restWorldQuaternion );
			const parentWorld = entry.bone.parent.getWorldQuaternion( new THREE.Quaternion() );
			const targetLocal = parentWorld.invert().multiply( targetWorld );
			const boneWeight = weight * this._confidence( entry, vis );
			entry.bone.quaternion.copy( mixerQuaternion ).slerp( targetLocal, boneWeight );
			entry.bone.updateMatrixWorld( true );

		}

		const hips = this.bones.get( 'Hips' );
		const mixerPosition = hips.position.clone();
		const stagePelvis = bodyRig.getPelvis( new THREE.Vector3() );
		stagePelvis.x = THREE.MathUtils.clamp( stagePelvis.x, - 1.05, 1.05 );
		stagePelvis.z = THREE.MathUtils.clamp( stagePelvis.z, - 1.05, 1.05 );
		stagePelvis.y = THREE.MathUtils.clamp( stagePelvis.y, 0.45, 1.35 );
		const targetWorldPosition = this.stageToActor( stagePelvis );
		const targetLocalPosition = hips.parent.worldToLocal( targetWorldPosition.clone() );
		const lowerBodyPositionConfidence = this._confidence( {
			confidence: [ LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_ANKLE, LM.RIGHT_ANKLE ],
		}, vis );
		const upperBodyPositionConfidence = this._confidence( {
			confidence: [ LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER ],
		}, vis );
		const positionConfidence = THREE.MathUtils.lerp(
			lowerBodyPositionConfidence,
			upperBodyPositionConfidence,
			bodyRig.upperBodyOnlyWeight
		);
		hips.position.copy( mixerPosition ).lerp( targetLocalPosition, weight * positionConfidence );
		this.root.updateMatrixWorld( true );

	}

	getBoneRest( name ) {

		const shortName = name.replace( MIXAMO_RUNTIME_PREFIX, '' );
		const entry = this.entries.find( ( candidate ) => candidate.name === shortName );
		if ( ! entry ) return null;
		return {
			name: `${MIXAMO}${shortName}`,
			localQuaternion: entry.restLocalQuaternion.toArray(),
			worldQuaternion: entry.restWorldQuaternion.toArray(),
			direction: entry.restDirection.toArray(),
			position: entry.restWorldPosition.toArray(),
		};

	}

}

//
// Live skinned-mesh SDF — the SkinnedMeshSDF block (three-blocks/sdf-raymarching)
// skins every vertex, splats exact triangle distances into an atomic band,
// propagates them across the grid, and resolves a pseudonormal sign — writing
// the rgba16float (surface velocity, signed distance) collider texture that
// the ball pit samples below.
//

//
// Ball pit simulation + rendering
//

const pitVolumeToWorld = new THREE.Matrix4()
	.makeScale( PIT_SIZE.x, PIT_SIZE.y, PIT_SIZE.z )
	.setPosition( - PIT_SIZE.x * 0.5, 0, - PIT_SIZE.z * 0.5 );
const uPitVolumeToWorld = uniform( pitVolumeToWorld.clone(), 'mat4' ).setName( 'sdfBody_volumeToWorld' );
const uCellWorld = uniform( CELL_WORLD ).setName( 'sdfBody_cellWorld' );
const uBallRadius = uniform( BALL_RADIUS ).setName( 'sdfBody_ballRadius' );
const uColliderFriction = uniform( params.friction ).setName( 'sdfBody_colliderFriction' );
const uColliderRestitution = uniform( params.bounciness ).setName( 'sdfBody_colliderRestitution' );
const uColliderPushRate = uniform( 96 ).setName( 'sdfBody_colliderPushRate' );
const uColliderMaxSeparationSpeed = uniform( 12 ).setName( 'sdfBody_colliderMaxSeparationSpeed' );

function createStage() {

	const stage = new THREE.Group();
	stage.name = 'BallPitStage';
	const pitMinX = - PIT_SIZE.x * 0.5 + PIT_MARGIN * CELL_WORLD;
	const pitMaxX = PIT_SIZE.x * 0.5 - PIT_MARGIN * CELL_WORLD;
	const pitMinZ = - PIT_SIZE.z * 0.5 + PIT_MARGIN * CELL_WORLD;
	const pitMaxZ = PIT_SIZE.z * 0.5 - PIT_MARGIN * CELL_WORLD;
	const floorTop = PIT_MARGIN * CELL_WORLD - BALL_RADIUS;
	const innerWidth = pitMaxX - pitMinX;
	const innerDepth = pitMaxZ - pitMinZ;

	const addBox = ( name, size, position, material, radius = 0.035 ) => {

		const geometry = new RoundedBoxGeometry( size.x, size.y, size.z, 3, radius );
		const mesh = new THREE.Mesh( geometry, material );
		mesh.name = name;
		mesh.position.copy( position );
		stage.add( mesh );
		return mesh;

	};
	const floorMaterial = new THREE.MeshStandardMaterial( { color: 0x7fcdbc, roughness: 0.92 } );
	addBox( 'SoftStageFloor', new THREE.Vector3( 5.8, 0.12, 5.4 ), new THREE.Vector3( 0, - 0.06, 0 ), floorMaterial, 0.05 );
	const pitFloorMaterial = new THREE.MeshStandardMaterial( { color: 0x453a8a, roughness: 0.9 } );
	addBox(
		'PitInteriorFloor',
		new THREE.Vector3( innerWidth, 0.12, innerDepth ),
		new THREE.Vector3( 0, floorTop - 0.06, 0 ),
		pitFloorMaterial,
		0.02
	);

	const wallMaterial = new THREE.MeshStandardMaterial( { color: 0x5349a0, roughness: 0.82 } );
	// The solver constrains particle centers at the wall centerline. Keep the
	// opaque shell thicker than a ball diameter so sphere-depth rendering can
	// never reveal the few millimeters of surface beyond that centerline.
	const wallThickness = PIT_WALL_THICKNESS;
	const wallHeight = 0.6;
	addBox( 'PitWallBack', new THREE.Vector3( innerWidth + wallThickness * 2, wallHeight, wallThickness ), new THREE.Vector3( 0, wallHeight * 0.5, pitMinZ ), wallMaterial, 0.025 );
	addBox( 'PitWallLeft', new THREE.Vector3( wallThickness, wallHeight, innerDepth ), new THREE.Vector3( pitMinX, wallHeight * 0.5, 0 ), wallMaterial, 0.025 );
	addBox( 'PitWallRight', new THREE.Vector3( wallThickness, wallHeight, innerDepth ), new THREE.Vector3( pitMaxX, wallHeight * 0.5, 0 ), wallMaterial, 0.025 );
	addBox( 'PitWallFront', new THREE.Vector3( innerWidth + wallThickness * 2, 0.28, wallThickness ), new THREE.Vector3( 0, 0.14, pitMaxZ ), wallMaterial, 0.025 );

	const foamColors = [ 0xb493ff, 0xff8a70, 0x3fe0d0, 0xffd23f ];
	const railY = 0.69;
	const rail = 0.17;
	const foamMaterials = foamColors.map( ( value ) => new THREE.MeshPhysicalMaterial( {
		color: value,
		roughness: 0.66,
		clearcoat: 0.16,
		clearcoatRoughness: 0.7,
	} ) );
	addBox( 'FoamRailBack', new THREE.Vector3( innerWidth + rail * 2, rail, rail ), new THREE.Vector3( 0, railY, pitMinZ ), foamMaterials[ 0 ], 0.075 );
	addBox( 'FoamRailRight', new THREE.Vector3( rail, rail, innerDepth ), new THREE.Vector3( pitMaxX, railY, 0 ), foamMaterials[ 1 ], 0.075 );
	addBox( 'FoamRailFront', new THREE.Vector3( innerWidth + rail * 2, rail, rail ), new THREE.Vector3( 0, 0.38, pitMaxZ ), foamMaterials[ 2 ], 0.075 );
	addBox( 'FoamRailLeft', new THREE.Vector3( rail, rail, innerDepth ), new THREE.Vector3( pitMinX, railY, 0 ), foamMaterials[ 3 ], 0.075 );

	const postY = 0.54;
	for ( const [ index, [ x, z ] ] of [
		[ pitMinX, pitMinZ ], [ pitMaxX, pitMinZ ], [ pitMaxX, pitMaxZ ], [ pitMinX, pitMaxZ ],
	].entries() ) {

		addBox( `FoamCornerPost${index}`, new THREE.Vector3( 0.23, 0.92, 0.23 ), new THREE.Vector3( x, postY, z ), foamMaterials[ index ], 0.095 );

	}

	const backPadMaterial = new THREE.MeshStandardMaterial( { color: 0xff9fc7, roughness: 0.9 } );
	for ( let i = - 2; i <= 2; i ++ ) {

		addBox( `BackWallPad${i + 2}`, new THREE.Vector3( 0.78, 1.1, 0.12 ), new THREE.Vector3( i * 0.78, 1.12, - 2.15 ), backPadMaterial, 0.06 );

	}
	scene.add( stage );

	const key = new THREE.DirectionalLight( 0xfff5df, 4.6 );
	key.name = 'BallPitKey';
	key.position.set( 3.3, 5.5, 3.5 );
	scene.add( key );
	scene.add( key.target );
	const fill = new THREE.HemisphereLight( 0xcfe4ff, 0xb69ad6, 1.15 );
	fill.name = 'BallPitFill';
	scene.add( fill );
	stage.userData = { pitMinX, pitMaxX, pitMinZ, pitMaxZ, floorTop };
	return stage;

}

function createBallMaterial() {

	const material = new THREE.MeshPhysicalNodeMaterial( {
		color: 0xffffff,
		roughness: 0.3,
		metalness: 0.02,
		clearcoat: 0.62,
		clearcoatRoughness: 0.2,
		side: THREE.DoubleSide,
	} );
	const particle = ballMirror.element( instanceIndex ).toVar( 'sdfBodyBallParticle' );
	const paletteIndex = floor( hash( float( instanceIndex ).mul( 1.618033989 ).add( 0.27 ) ).mul( 4 ) );
	const [ red, blue, green, yellow ] = BALL_PALETTES[ params.palette ].map( ( value ) => color( value ) );
	const paletteColor = select(
		paletteIndex.lessThan( 1 ),
		red,
		select( paletteIndex.lessThan( 2 ), blue, select( paletteIndex.lessThan( 3 ), green, yellow ) )
	);
	const paletteLuminance = paletteColor.dot( vec3( 0.2126, 0.7152, 0.0722 ) );
	const saturatedPalette = clamp( mix( vec3( paletteLuminance ), paletteColor, 1.08 ), 0, 1 );
	const valueJitter = hash( float( instanceIndex ).mul( 7.13 ).add( 2.1 ) ).sub( 0.5 ).mul( 0.08 ).add( 1 );
	const densityAO = clamp( particle.w.sub( 1.5 ).mul( 0.1 ), 0, 0.06 );
	const ballColor = varying( saturatedPalette.mul( valueJitter ).mul( densityAO.oneMinus() ) );
	material.positionNode = sphereImpostorPosition( { position: particle.xyz, radius: uBallRadius } );
	material.normalNode = sphereImpostorNormal();
	material.mrtNode = mrt( { normal: material.normalNode } );
	material.opacityNode = sphereImpostorAlpha();
	material.alphaTest = 0.5;
	material.alphaToCoverage = true;
	material.depthNode = params.sphereDepth ? sphereImpostorDepth() : null;
	material.colorNode = ballColor;
	return material;

}

function createSliceLabel() {

	const canvas = document.createElement( 'canvas' );
	canvas.width = 512;
	canvas.height = 72;
	const context = canvas.getContext( '2d' );
	context.clearRect( 0, 0, canvas.width, canvas.height );
	context.fillStyle = '#ff557f';
	context.beginPath();
	context.arc( 25, 36, 9, 0, Math.PI * 2 );
	context.fill();
	context.fillStyle = '#332d4e';
	context.font = '700 29px ui-monospace, SFMono-Regular, Menlo, monospace';
	context.textBaseline = 'middle';
	context.fillText( 'LIVE SDF · MID-Z', 49, 37 );

	const texture = new THREE.CanvasTexture( canvas );
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.generateMipmaps = false;
	texture.minFilter = THREE.LinearFilter;
	const material = new THREE.MeshBasicMaterial( {
		map: texture,
		transparent: true,
		depthWrite: false,
		toneMapped: false,
	} );
	const label = new THREE.Mesh( new THREE.PlaneGeometry( 1.03, 0.145 ), material );
	label.name = 'LiveSDFSliceLabel';
	label.renderOrder = 9;
	return label;

}

function createSliceMesh() {

	const material = new THREE.MeshBasicNodeMaterial( {
		transparent: true,
		opacity: 0.94,
		depthWrite: false,
		side: THREE.DoubleSide,
	} );
	const velocityVisible = uniform( params.showSurfaceVelocity ? 1 : 0 ).setName( 'sdfBody_sliceVelocityVisible' );
	const sample = texture3D( sdfBuilder.texture ).sample( vec3( uv(), 0.5 ) ).toVar( 'sdfBodySliceSample' );
	const inside = sample.w.lessThan( 0 );
	const signColor = select( inside, color( 0xff557f ), color( 0x4ae0ff ) );
	const linePhase = fract( abs( sample.w ).div( sdfBuilder.voxelStep ) );
	const isoline = smoothstep( 0.07, 0.14, min( linePhase, linePhase.oneMinus() ) );
	const velocityGlow = sample.xyz.length().mul( 0.15 ).mul( velocityVisible ).clamp( 0, 0.65 );
	const streak = sin( uv().x.mul( 90 ).add( uv().y.mul( 37 ) ).add( sample.x.mul( 2.5 ) ) ).mul( 0.5 ).add( 0.5 );
	material.colorNode = signColor.mul( mix( 1.45, 0.34, isoline ) ).add( vec3( velocityGlow.mul( streak ) ) );
	material.opacityNode = smoothstep( sdfBuilder.voxelStep * 9, 0, abs( sample.w ) ).mul( 0.86 ).add( 0.12 );

	const screenWidth = 1.12;
	const screenHeight = screenWidth * SDF_DOMAIN_SIZE.y / SDF_DOMAIN_SIZE.x;
	const display = new THREE.Group();
	display.name = 'LiveSDFSliceDisplay';
	display.position.set( - 1.55, 1.38, - 2.06 );
	display.visible = params.showSlice;
	display.userData.velocityVisible = velocityVisible;

	const housing = new THREE.Mesh(
		new RoundedBoxGeometry( screenWidth + 0.16, screenHeight + 0.3, 0.08, 3, 0.065 ),
		new THREE.MeshStandardMaterial( { color: 0xf6f1ff, roughness: 0.78 } )
	);
	housing.name = 'LiveSDFSliceHousing';

	const screenY = - 0.06;
	const screen = new THREE.Mesh(
		new THREE.PlaneGeometry( screenWidth + 0.025, screenHeight + 0.025 ),
		new THREE.MeshBasicMaterial( { color: 0x211d36, toneMapped: false } )
	);
	screen.name = 'LiveSDFSliceScreen';
	screen.position.set( 0, screenY, 0.043 );
	screen.renderOrder = 7;

	const slice = new THREE.Mesh( new THREE.PlaneGeometry( screenWidth, screenHeight ), material );
	slice.name = 'LiveSDFSliceSurface';
	slice.position.set( 0, screenY, 0.047 );
	slice.renderOrder = 8;

	const label = createSliceLabel();
	label.position.set( 0, screenHeight * 0.5 + 0.06, 0.048 );
	display.add( housing, screen, slice, label );
	scene.add( display );
	return display;

}

function disposeBallSimulation() {

	solver?.dispose();
	solver = null;
	if ( ballMesh ) {

		scene.remove( ballMesh );
		ballMesh.geometry.dispose();
		ballMesh.material.dispose();
		ballMesh = null;

	}
	if ( sliceMesh ) {

		scene.remove( sliceMesh );
		sliceMesh.traverse( ( object ) => {

			object.geometry?.dispose();
			const materials = Array.isArray( object.material ) ? object.material : [ object.material ];
			for ( const material of materials ) {

				material?.map?.dispose();
				material?.dispose();

			}

		} );
		sliceMesh = null;

	}
	sdfBuilder?.dispose();
	sdfBuilder = null;
	ballMirror = null;
	solverDiagnostics = null;
	simulationReady = false;

}

function buildBallSimulation() {

	if ( ! actor?.skinnedMesh ) return;
	disposeBallSimulation();
	sdfBuilder = new SkinnedMeshSDF( actor.skinnedMesh, {
		resolution: Number( params.sdfResolution ),
		domain: SDF_DOMAIN_SIZE,
		far: SDF_FAR,
	} );
	ballMirror = instancedArray( BALL_CAPACITY, 'vec4' ).setName( 'sdfBody_ballMirror' );
	solverDiagnostics = instancedArray( 3, 'uint' ).toAtomic().setName( 'sdfBody_solverDiagnostics' );
	// The complete body-collision response — sample, contact normal, friction/
	// restitution against the surface's own velocity, push-out — is the block's
	// collide() helper. The solver works in normalized grid units, so positions
	// and velocities convert to world space at the seam; a solver that already
	// runs in meters would skip both conversions.
	const particleForce = ( { position, velocity } ) => {

		const worldPosition = uPitVolumeToWorld.mul( vec4( position, 1 ) ).xyz;
		const bodyDistance = sdfBuilder.distance( worldPosition );
		If( bodyDistance.lessThan( uBallRadius.mul( - 0.2 ) ), () => {

			atomicAdd( solverDiagnostics.element( 0 ), uint( 1 ) );

		} );
		velocity.assign(
			sdfBuilder.collide( {
				position: worldPosition,
				velocity: velocity.mul( uCellWorld ),
				radius: uBallRadius,
				friction: uColliderFriction,
				restitution: uColliderRestitution,
				pushOutRate: uColliderPushRate,
				maxPushOutSpeed: uColliderMaxSeparationSpeed,
			} ).div( uCellWorld )
		);

	};
	const onParticleUpdate = ( { index, position, velocity, density } ) => {

		const worldPosition = uPitVolumeToWorld.mul( vec4( position, 1 ) ).xyz;
		const worldVelocity = velocity.mul( uCellWorld );
		ballMirror.element( index ).assign( vec4( worldPosition, density ) );
		If( worldVelocity.length().greaterThan( 2 ), () => {

			atomicAdd( solverDiagnostics.element( 1 ), uint( 1 ) );

		} );
		atomicMax( solverDiagnostics.element( 2 ), floatBitsToUint( worldVelocity.dot( worldVelocity ) ) );

	};

	solver = new MPMSolver( {
		capacity: BALL_CAPACITY,
		gridSize: PIT_GRID,
		material: new MPMFluidModel( { stiffness: 8_500, restDensity: 2, viscosity: 0.08 } ),
		gravity: new THREE.Vector3( 0, - params.gravity / CELL_WORLD, 0 ),
		maxVelocity: 80,
		substeps: 2,
		cfl: { target: 0.45, maxSubsteps: 4 },
		p2gMode: 'auto',
		densityPrediction: true,
		boundary: { margin: PIT_MARGIN, floorFriction: 0.82, wallPushback: 0.72, velocityDamping: 0.9985 },
		particleForce,
		onParticleUpdate,
	} );
	// The solver seeds immediately below, before the first rendered frame. Publish
	// every solver-owned storage and mutable uniform before that dispatch so
	// development tooling can inspect initialization and steady-state pipelines.
	Object.assign( shaderResources, {
		sdfCollider: sdfBuilder.texture,
		sdfPositions: sdfBuilder.positionBuffer,
		sdfVelocities: sdfBuilder.velocityBuffer,
		sdfStorage: {
			index: sdfBuilder.indexAttribute,
			sourcePositions: sdfBuilder.positionAttribute,
			skinIndices: sdfBuilder.skinIndexAttribute,
			skinWeights: sdfBuilder.skinWeightAttribute,
			boneMatrices: sdfBuilder.boneMatrixAttribute,
			positions: sdfBuilder.positionBuffer,
			previousPositions: sdfBuilder.previousPositionBuffer,
			velocities: sdfBuilder.velocityBuffer,
			seedPack: sdfBuilder.seedPack,
			fieldA: sdfBuilder.fieldA,
			fieldB: sdfBuilder.fieldB,
			resolvedField: sdfBuilder.resolvedField,
		},
		ballMirror,
		solverDiagnostics,
		solverStorage: {
			particles: solver.particleBuffer,
			particlePong: solver.particlePongBuffer,
			gridAtomic: solver.gridAtomicBuffer,
			gridMirror: solver.gridMirrorBuffer,
			diagnostics: solver.diagnosticsBuffer,
		},
		uniforms: {
			pitVolumeToWorld: uPitVolumeToWorld,
			cellWorld: uCellWorld,
			ballRadius: uBallRadius,
			colliderFriction: uColliderFriction,
			colliderRestitution: uColliderRestitution,
			colliderPushRate: uColliderPushRate,
			colliderMaxSeparationSpeed: uColliderMaxSeparationSpeed,
			sdf: sdfBuilder.uniforms,
			solver: solver.uniforms,
		},
	} );
	shaderCache.container( 'ballpit/simulation-resources', shaderResources );
	solver.particleCount = BALL_CAPACITY;
	const latticeX = 44;
	const latticeZ = 44;
	const layerSize = latticeX * latticeZ;
	const marginX = ( PIT_MARGIN + 1 ) / PIT_GRID.x;
	const marginY = ( PIT_MARGIN + 1 ) / PIT_GRID.y;
	const marginZ = ( PIT_MARGIN + 1 ) / PIT_GRID.z;
	solver.seed( renderer, ( { index } ) => {

		const ix = float( index.mod( uint( latticeX ) ) );
		const iz = float( index.div( uint( latticeX ) ).mod( uint( latticeZ ) ) );
		const iy = float( index.div( uint( layerSize ) ) );
		const jitterX = hash( float( index ).mul( 1.37 ).add( 0.11 ) ).sub( 0.5 ).mul( 0.006 );
		const jitterY = hash( float( index ).mul( 2.17 ).add( 1.91 ) ).sub( 0.5 ).mul( 0.004 );
		const jitterZ = hash( float( index ).mul( 3.71 ).add( 4.07 ) ).sub( 0.5 ).mul( 0.006 );
		return {
			position: vec3(
				float( marginX ).add( ix.add( 0.5 ).div( latticeX ).mul( 1 - marginX * 2 ) ).add( jitterX ),
				float( marginY ).add( iy.add( 0.5 ).div( 34 ).mul( 0.5 ) ).add( jitterY ),
				float( marginZ ).add( iz.add( 0.5 ).div( latticeZ ).mul( 1 - marginZ * 2 ) ).add( jitterZ )
			),
			velocity: vec3( 0 ),
		};

	} );
	solver.particleCount = BALL_COUNTS[ params.ballCount ];

	const diagnosticClear = Fn( () => {

		If( instanceIndex.lessThan( uint( 3 ) ), () => {

			atomicStore( solverDiagnostics.element( instanceIndex ), uint( 0 ) );

		} );

	} )().compute( 64, [ 64 ] ).setName( 'sdfBody_diagnosticsClear' );
	solverDiagnostics.clearPass = diagnosticClear;

	const geometry = new TriangleGeometry();
	const material = createBallMaterial();
	ballMesh = new THREE.Mesh( geometry, material );
	ballMesh.name = 'BallPitImpostors';
	ballMesh.count = solver.particleCount;
	ballMesh.frustumCulled = false;
	ballMesh.raycast = () => {};
	scene.add( ballMesh );
	sliceMesh = createSliceMesh();
	simulationReady = true;

}

function updateBallCount() {

	if ( ! solver || ! ballMesh ) return;
	solver.particleCount = BALL_COUNTS[ params.ballCount ];
	ballMesh.count = solver.particleCount;

}

function rebuildBallMaterial() {

	if ( ! ballMesh ) return;
	const previous = ballMesh.material;
	ballMesh.material = createBallMaterial();
	previous.dispose();

}

function rebuildSimulation() {

	if ( rebuilding || ! actorReady ) return;
	rebuilding = true;
	try {

		buildBallSimulation();

	} finally {

		rebuilding = false;

	}

}

class QualityGovernor {

	constructor() {

		this.samples = [];
		this.cooldown = 0;
		this.calmWindows = 0;

	}

	push( milliseconds ) {

		if ( ! params.autoQuality || rebuilding ) return;
		this.samples.push( milliseconds );
		if ( this.samples.length > 32 ) this.samples.shift();
		if ( this.samples.length < 32 ) return;
		if ( this.cooldown > 0 ) {

			this.cooldown --;
			return;

		}
		const median = [ ...this.samples ].sort( ( a, b ) => a - b )[ 16 ];
		const tiers = [ 'LOW', 'MED', 'HIGH' ];
		const tierIndex = tiers.indexOf( params.tier );
		if ( median > 22 && tierIndex > 0 ) {

			setQualityTier( tiers[ tierIndex - 1 ], true );
			this.cooldown = 180;
			this.calmWindows = 0;

		} else if ( median < 14.5 && tierIndex < tiers.length - 1 ) {

			this.calmWindows ++;
			if ( this.calmWindows > 10 ) {

				setQualityTier( tiers[ tierIndex + 1 ], true );
				this.cooldown = 300;
				this.calmWindows = 0;

			}

		} else {

			this.calmWindows = 0;

		}

	}

}

function setQualityTier( tier, fromGovernor = false ) {

	const preset = QUALITY_TIERS[ tier ];
	if ( ! preset ) return;
	const resolutionChanged = params.sdfResolution !== preset.sdfResolution;
	const sphereDepthChanged = params.sphereDepth !== preset.sphereDepth;
	params.tier = tier;
	params.ballCount = preset.ballCount;
	params.sdfResolution = preset.sdfResolution;
	params.sphereDepth = preset.sphereDepth;
	updateBallCount();
	if ( resolutionChanged ) rebuildSimulation();
	else if ( sphereDepthChanged ) rebuildBallMaterial();
	if ( fromGovernor ) updateOverlay();

}

//
// Actor loading and app lifecycle
//

async function loadMichelle( onProgress ) {

	const gltf = await new GLTFLoader().loadAsync( activeAssets.actor, onProgress );
	const root = gltf.scene;
	root.name = 'Michelle';
	root.position.y = scene.getObjectByName( 'BallPitStage' ).userData.floorTop;
	let skinnedMesh = null;
	const gradedMaterials = new Set();
	root.traverse( ( object ) => {

		if ( object.isSkinnedMesh ) {

			skinnedMesh = object;
			object.frustumCulled = false;

		}
		if ( object.isMesh && object.material && ! gradedMaterials.has( object.material ) ) {

			gradedMaterials.add( object.material );
			object.material.envMapIntensity = 1.45;
			// The Michelle albedo textures are tuned for a dim warm grade; lift them
			// so she matches the high-key candy set (color scales the sampled map).
			object.material.color.multiplyScalar( 1.18 );
			object.material.needsUpdate = true;

		}

	} );
	if ( ! skinnedMesh ) throw new Error( 'SDF body tracking: Michelle.glb contains no SkinnedMesh.' );
	if ( skinnedMesh.geometry.getAttribute( 'position' ).count !== 16_340 ) {

		throw new Error( `SDF body tracking: expected 16,340 Michelle vertices, received ${skinnedMesh.geometry.getAttribute( 'position' ).count}.` );

	}
	if ( skinnedMesh.geometry.index.count / 3 !== 28_106 ) {

		throw new Error( `SDF body tracking: expected 28,106 Michelle triangles, received ${skinnedMesh.geometry.index.count / 3}.` );

	}
	scene.add( root );
	mixer = new THREE.AnimationMixer( root );
	const tPoseClip = gltf.animations.find( ( clip ) => clip.name === 'TPose' );
	const sambaClip = gltf.animations.find( ( clip ) => clip.name === 'SambaDance' ) ?? gltf.animations[ 0 ];
	if ( ! tPoseClip || ! sambaClip ) throw new Error( 'SDF body tracking: Michelle requires TPose and SambaDance clips.' );
	tPoseAction = mixer.clipAction( tPoseClip );
	tPoseAction.setLoop( THREE.LoopOnce, 1 );
	tPoseAction.clampWhenFinished = true;
	tPoseAction.play();
	mixer.setTime( tPoseClip.duration * 0.5 );
	root.updateMatrixWorld( true );
	skinnedMesh.skeleton.update();
	retargeter = new Retargeter( root, skinnedMesh );
	tPoseAction.stop();
	mixer.stopAllAction();
	sambaAction = mixer.clipAction( sambaClip );
	sambaAction.setLoop( THREE.LoopRepeat, Infinity );
	root.updateMatrixWorld( true );
	skinnedMesh.skeleton.update();
	root.skinnedMesh = skinnedMesh;
	root.animations = { sambaClip, tPoseClip };
	actor = root;
	actorMotionState = 'loading';
	setActorMotionState( 'dance' );
	actorReady = true;

}

function setActorMotionState( state ) {

	if ( ! mixer || ! tPoseAction || ! sambaAction || state === actorMotionState ) return;
	mixer.stopAllAction();

	if ( state === 'tracking' ) {

		// Tracking is solved from Michelle's calibrated rest pose. Holding the
		// TPose clip here prevents SambaDance from leaking into low-confidence
		// joints while the live pose fades in.
		tPoseAction.reset();
		tPoseAction.play();
		tPoseAction.time = tPoseAction.getClip().duration * 0.5;
		tPoseAction.paused = true;

	} else {

		tPoseAction.paused = false;
		sambaAction.reset();
		sambaAction.setLoop( THREE.LoopRepeat, Infinity );
		sambaAction.play();
		sambaAction.time = SAMBA_START_OFFSET % sambaAction.getClip().duration;

	}

	actorMotionState = state;
	mixer.update( 0 );

}

function normalizeQuality( quality ) {

	const name = String( quality ?? 'medium' ).toUpperCase();
	if ( name === 'LOW' ) return 'LOW';
	if ( name === 'HIGH' ) return 'HIGH';
	return 'MED';

}

function normalizePose( pose ) {

	if ( typeof pose === 'string' ) return { mode: /^your body$/iu.test( pose ) ? 'Your Body' : 'Dance' };
	const mode = /^your body$/iu.test( pose?.mode ?? '' ) ? 'Your Body' : 'Dance';
	const danceTime = Number.isFinite( Number( pose?.danceTime ) ) ? Number( pose.danceTime ) : SAMBA_START_OFFSET;
	return { mode, danceTime };

}

function normalizeOrbit( orbit ) {

	const position = Array.isArray( orbit?.position ) && orbit.position.length >= 3
		? orbit.position.slice( 0, 3 ).map( Number )
		: [ ...DEFAULT_ORBIT.position ];
	const target = Array.isArray( orbit?.target ) && orbit.target.length >= 3
		? orbit.target.slice( 0, 3 ).map( Number )
		: [ ...DEFAULT_ORBIT.target ];
	return {
		position: position.every( Number.isFinite ) ? position : [ ...DEFAULT_ORBIT.position ],
		target: target.every( Number.isFinite ) ? target : [ ...DEFAULT_ORBIT.target ],
		swayPhase: Number.isFinite( Number( orbit?.swayPhase ) ) ? Number( orbit.swayPhase ) : 0,
	};

}

function configureMountOptions( options = {} ) {

	const assetOptions = options.assets?.bodyTracking ?? options.assets ?? {};
	const requiredAssets = [ 'actor', 'mediaPipeRoot', 'modelRoot' ];
	const missingAssets = requiredAssets.filter( ( key ) => ! assetOptions[ key ] );
	if ( missingAssets.length > 0 ) {

		throw new Error( `SDF body tracking requires assets: ${missingAssets.join( ', ' )}.` );

	}
	activeAssets = { ...assetOptions };
	renderPixelBudget = Number.isFinite( Number( options.renderPixelBudget ) )
		? Math.max( 1, Number( options.renderPixelBudget ) )
		: 2_200_000;
	maximumRenderSize = Array.isArray( options.maximumRenderSize ) && options.maximumRenderSize.length >= 2
		? options.maximumRenderSize.slice( 0, 2 ).map( Number )
		: null;
	if ( maximumRenderSize?.some( ( value ) => ! Number.isFinite( value ) || value <= 0 ) ) maximumRenderSize = null;
	fixedTimeStep = Number.isFinite( Number( options.fixedTimeStep ) ) && Number( options.fixedTimeStep ) > 0
		? Number( options.fixedTimeStep )
		: null;
	controlsExpanded = options.controlsExpanded ?? window.innerWidth >= 560;
	initialPose = normalizePose( options.initialPose );
	initialOrbit = normalizeOrbit( options.initialOrbit );
	autoStartAnimation = options.autoStart !== false;
	startTrackingOnMount = options.startTracking === true;

	const tier = normalizeQuality( options.quality );
	const preset = QUALITY_TIERS[ tier ];
	Object.assign( params, {
		mode: initialPose.mode,
		tracker: options.tracker === 'holistic' ? 'holistic' : 'pose + hands',
		handDetail: options.handDetail ?? true,
		smoothing: Number.isFinite( Number( options.smoothing ) ) ? Number( options.smoothing ) : 0.5,
		mirror: options.mirror ?? true,
		showVideo: options.showVideo ?? true,
		showSkeleton: options.showSkeleton ?? true,
		ballCount: options.ballCount && BALL_COUNTS[ options.ballCount ] ? options.ballCount : preset.ballCount,
		bounciness: Number.isFinite( Number( options.bounciness ) ) ? Number( options.bounciness ) : 0.32,
		friction: Number.isFinite( Number( options.friction ) ) ? Number( options.friction ) : 0.18,
		gravity: Number.isFinite( Number( options.gravity ) ) ? Number( options.gravity ) : 4,
		palette: options.palette && BALL_PALETTES[ options.palette ] ? options.palette : 'Playground',
		sdfResolution: Number.isFinite( Number( options.sdfResolution ) ) ? Number( options.sdfResolution ) : preset.sdfResolution,
		showSlice: options.showSlice ?? true,
		showSurfaceVelocity: options.showSurfaceVelocity ?? true,
		resolutionScale: Number.isFinite( Number( options.resolutionScale ) ) ? Number( options.resolutionScale ) : 1,
		sphereDepth: options.sphereDepth ?? preset.sphereDepth,
		tier,
		autoQuality: options.autoQuality ?? true,
		autoOrbit: options.autoOrbit ?? true,
	} );

}

function applyOrbit( orbit = initialOrbit ) {

	if ( ! camera || ! controls ) return;
	camera.position.fromArray( orbit.position );
	controls.target.fromArray( orbit.target );
	controls.update();
	resetCameraSway();
	cameraSwayElapsed = Math.max( 0, orbit.swayPhase ) * CAMERA_SWAY_PERIOD;
	updateCameraSway( 0 );

}

function configure( state = {} ) {

	if ( state.mode !== undefined ) params.mode = /^your body$/iu.test( state.mode ) ? 'Your Body' : 'Dance';
	if ( state.danceTime !== undefined && sambaAction ) sambaAction.time = Number( state.danceTime );
	if ( state.showSlice !== undefined ) {

		params.showSlice = Boolean( state.showSlice );
		if ( sliceMesh ) sliceMesh.visible = params.showSlice;

	}
	if ( state.showSurfaceVelocity !== undefined ) {

		params.showSurfaceVelocity = Boolean( state.showSurfaceVelocity );
		if ( sliceMesh ) sliceMesh.userData.velocityVisible.value = params.showSurfaceVelocity ? 1 : 0;

	}
	if ( state.ballCount !== undefined && BALL_COUNTS[ state.ballCount ] ) {

		params.ballCount = state.ballCount;
		updateBallCount();

	}
	if ( state.palette !== undefined && BALL_PALETTES[ state.palette ] ) {

		params.palette = state.palette;
		rebuildBallMaterial();

	}
	if ( state.quality !== undefined || state.tier !== undefined ) setQualityTier( normalizeQuality( state.quality ?? state.tier ) );
	if ( state.autoQuality !== undefined ) params.autoQuality = Boolean( state.autoQuality );
	if ( state.autoOrbit !== undefined ) {

		params.autoOrbit = Boolean( state.autoOrbit );
		if ( params.autoOrbit ) resetCameraSway();

	}
	if ( state.cameraSwayElapsed !== undefined && params.autoOrbit ) {

		cameraSwayElapsed = Math.max( 0, Number( state.cameraSwayElapsed ) );
		updateCameraSway( 0 );

	}
	if ( state.orbit !== undefined ) applyOrbit( normalizeOrbit( state.orbit ) );
	if ( state.startTracking === true ) void tracker?.start();
	if ( state.stopTracking === true ) tracker?.stop();
	updateOverlay();

}

function getDiagnostics() {

	return {
		ready: actorReady && simulationReady,
		paused: animationPaused,
		tracking: tracker?.state ?? 'idle',
		delegate: tracker?.delegate ?? null,
		mode: params.mode,
		liveWeight: rig?.liveWeight ?? 0,
		upperBodyOnly: rig?.upperBodyOnly ?? false,
		upperBodyOnlyWeight: rig?.upperBodyOnlyWeight ?? 0,
		actorMotion: actorMotionState,
		actor: actor ? {
			vertices: actor.skinnedMesh.geometry.getAttribute( 'position' ).count,
			triangles: actor.skinnedMesh.geometry.index.count / 3,
			bones: actor.skinnedMesh.skeleton.bones.length,
			clip: actorMotionState === 'tracking' ? tPoseAction?.getClip().name : sambaAction?.getClip().name,
			clipTime: actorMotionState === 'tracking' ? tPoseAction?.time : sambaAction?.time,
		} : null,
		sdf: sdfBuilder ? {
			resolution: sdfBuilder.resolution,
			format: 'rgba16float',
			filter: 'linear',
			wrap: 'clamp-to-edge',
			passes: sdfBuilder.getPassNames(),
		} : null,
		balls: solver ? {
			count: solver.particleCount,
			capacity: solver.capacity,
			drawCalls: 1,
			passes: solver.getLastStepStats().passes,
		} : null,
		pit: {
			ballRadius: BALL_RADIUS,
			wallThickness: PIT_WALL_THICKNESS,
			centerBounds: [
				- PIT_SIZE.x * 0.5 + PIT_MARGIN * CELL_WORLD,
				PIT_SIZE.x * 0.5 - PIT_MARGIN * CELL_WORLD,
				- PIT_SIZE.z * 0.5 + PIT_MARGIN * CELL_WORLD,
				PIT_SIZE.z * 0.5 - PIT_MARGIN * CELL_WORLD,
			],
		},
		cameraSway: {
			enabled: params.autoOrbit,
			amplitudeDegrees: THREE.MathUtils.radToDeg( CAMERA_SWAY_AMPLITUDE ),
			periodSeconds: CAMERA_SWAY_PERIOD,
			offsetDegrees: THREE.MathUtils.radToDeg( cameraSwayOffset ),
			azimuthDegrees: camera && controls ? THREE.MathUtils.radToDeg( getCameraAzimuth() ) : null,
		},
		quality: params.tier,
		renderSize: [ renderWidth, renderHeight ],
		frame: frameNumber,
	};

}

function getPerformance() {

	const samples = frameTimes.filter( Number.isFinite ).slice( - 64 );
	const sorted = [ ...samples ].sort( ( a, b ) => a - b );
	const median = sorted.length > 0 ? sorted[ Math.floor( sorted.length / 2 ) ] : null;
	return {
		samples,
		medianMs: median,
		fps: median > 0 ? 1_000 / median : null,
		pixelCount: renderWidth * renderHeight,
	};

}

function getTrackingPose() {

	return {
		pose: Array.from( rig?.displayPose ?? [] ),
		visibility: Array.from( rig?.displayVis ?? [] ),
		leftHand: Array.from( rig?.displayLeftHand ?? [] ),
		rightHand: Array.from( rig?.displayRightHand ?? [] ),
	};

}

function getBonePose( name ) {

	const bone = retargeter?.bones.get( String( name ).replace( MIXAMO_RUNTIME_PREFIX, '' ) );
	if ( ! bone ) return null;
	return {
		position: bone.getWorldPosition( new THREE.Vector3() ).toArray(),
		quaternion: bone.getWorldQuaternion( new THREE.Quaternion() ).toArray(),
	};

}

function pause() {

	animationPaused = true;
	renderer?.setAnimationLoop( null );

}

function resume() {

	if ( disposed || ! renderer ) return;
	animationPaused = false;
	previousTime = 0;
	renderer.setAnimationLoop( animate );

}

async function step( frames = 1, delta = fixedTimeStep ?? 1 / 60 ) {

	pause();
	const frameCount = Math.max( 0, Math.floor( Number( frames ) ) );
	const timeStep = Number.isFinite( Number( delta ) ) && Number( delta ) > 0 ? Number( delta ) : 1 / 60;
	for ( let index = 0; index < frameCount; index ++ ) advanceFrame( timeStep, timeStep );
	await renderer?.backend?.device?.queue?.onSubmittedWorkDone?.();
	return getDiagnostics();

}

function render() {

	if ( disposed || ! renderPipeline ) return;
	controls?.update();
	renderPipeline.render();

}

async function reset( state = {} ) {

	const wasPaused = animationPaused;
	pause();
	previousTime = 0;
	frameNumber = 0;
	frameTimes.length = 0;
	rig = new BodyRig();
	configure( { ...initialPose, ...state } );
	applyOrbit();
	setActorMotionState( 'dance' );
	if ( sambaAction ) sambaAction.time = Number( state.danceTime ?? initialPose.danceTime ) % sambaAction.getClip().duration;
	buildBallSimulation();
	render();
	await renderer?.backend?.device?.queue?.onSubmittedWorkDone?.();
	if ( ! wasPaused ) resume();
	return getDiagnostics();

}

function inspectSimulation() {

	return {
		classes: { BodyRig, SkinnedMeshSDF },
		constants: {
			BALL_RADIUS,
			SDF_DOMAIN_SIZE,
			SDF_FAR,
			LM,
			packetLayout: {
				PKT_SIZE, PKT_HAS_POSE, PKT_HAS_LEFT, PKT_HAS_RIGHT,
				PKT_POSE_NORM, PKT_POSE_WORLD, PKT_LEFT_HAND, PKT_RIGHT_HAND,
			},
		},
		params,
		get renderer() { return renderer; },
		get controls() { return controls; },
		get renderPipeline() { return renderPipeline; },
		get rig() { return rig; },
		get retargeter() { return retargeter; },
		get actor() { return actor; },
		get mixer() { return mixer; },
		get sdfBuilder() { return sdfBuilder; },
		get solver() { return solver; },
		get ballMirror() { return ballMirror; },
		get solverDiagnostics() { return solverDiagnostics; },
	};

}

function createController() {

	const controller = {
		pause,
		resume,
		reset,
		step,
		render,
		configure,
		getDiagnostics,
		getPerformance,
		getTrackingPose,
		getBonePose,
		getBoneRest: ( name ) => retargeter?.getBoneRest( name ) ?? null,
		ingestTrackingPacket: ( packet, videoAspect = 4 / 3, delta ) => (
			rig?.ingest( Float32Array.from( packet ), videoAspect, delta )
		),
		startTracking: () => tracker?.start(),
		stopTracking: () => tracker?.stop(),
		dispose: unmount,
	};
	Object.defineProperty( controller, 'inspect', { value: inspectSimulation } );
	return controller;

}

function getCameraAzimuth() {

	cameraSwayVector.copy( camera.position ).sub( controls.target );
	return Math.atan2( cameraSwayVector.x, cameraSwayVector.z );

}

function resetCameraSway() {

	if ( ! camera || ! controls ) return;
	cameraSwayElapsed = 0;
	cameraSwayOffset = 0;
	cameraSwayCenterAngle = getCameraAzimuth();

}

function updateCameraSway( delta ) {

	if ( ! params.autoOrbit || cameraSwayInteracting ) return;
	cameraSwayElapsed += delta;
	const nextOffset = CAMERA_SWAY_AMPLITUDE * Math.sin( cameraSwayElapsed / CAMERA_SWAY_PERIOD * Math.PI * 2 );
	const desiredAzimuth = cameraSwayCenterAngle + nextOffset;
	const currentAzimuth = getCameraAzimuth();
	const angleDelta = Math.atan2(
		Math.sin( desiredAzimuth - currentAzimuth ),
		Math.cos( desiredAzimuth - currentAzimuth )
	);
	cameraSwayVector.copy( camera.position ).sub( controls.target ).applyAxisAngle( cameraSwayUp, angleDelta );
	camera.position.copy( controls.target ).add( cameraSwayVector );
	cameraSwayOffset = nextOffset;

}

export async function mount( containerElement, options = {} ) {

	container = containerElement;
	configureMountOptions( options );
	if ( WebGPU.isAvailable() === false ) {

		container.appendChild( WebGPU.getErrorMessage() );
		throw new Error( 'No WebGPU support' );

	}
	await init();
	return createController();

}

async function init() {

	disposed = false;
	previousTime = 0;
	frameNumber = 0;
	frameTimes.length = 0;
	animationPaused = ! autoStartAnimation;
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x79b4ff );
	scene.backgroundNode = mix( color( 0x79b4ff ), color( 0xffd9f0 ), screenUV.y.smoothstep( 0.05, 0.95 ) );
	camera = new THREE.PerspectiveCamera( 38, window.innerWidth / window.innerHeight, 0.05, 80 );
	camera.position.fromArray( initialOrbit.position );
	renderer = new THREE.WebGPURenderer( { antialias: true } );
	devtools = registerDevtools( { renderer, container } );
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.NeutralToneMapping;
	renderer.toneMappingExposure = 0.8;
	applyRendererSize();
	container.appendChild( renderer.domElement );
	await renderer.init();
	// GPU-compressed UASTC HDR environment: BC6H where the hardware supports
	// it, RGBA16F elsewhere. Three prefilters it on first environment use.
	const environmentUrl = activeAssets.environment;
	const environmentTranscoder = activeAssets.transcoderPath ?? activeAssets.basis;
	if ( typeof environmentUrl !== 'string' || environmentUrl.length === 0 ) throw new Error( 'SDF body tracking requires assets.environment.' );
	if ( ! environmentTranscoder ) throw new Error( 'KTX2 environments require assets.transcoderPath.' );
	const environmentLoader = new KTX2Loader()
		.setTranscoderPath( `${String( environmentTranscoder ).replace( /\/$/u, '' )}/` )
		.detectSupport( renderer );
	try {

		environmentTexture = await environmentLoader.loadAsync( environmentUrl );

	} finally {

		environmentLoader.dispose();

	}
	environmentTexture.mapping = THREE.EquirectangularReflectionMapping;
	scene.environment = environmentTexture;
	// Photographic HDR reads stronger than the old neutral studio; keep it subtle.
	scene.environmentIntensity = 0.55;
	scenePass = pass( scene, camera );
	scenePass.setMRT( mrt( {
		output,
		normal: normalView,
	} ) );
	renderPipeline = new THREE.RenderPipeline( renderer );
	renderPipeline.outputNode = scenePass.getTextureNode( 'output' );
	renderPipeline.needsUpdate = true;

	controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true;
	controls.enablePan = false;
	controls.minDistance = 2.8;
	controls.maxDistance = 7;
	controls.minPolarAngle = 0.58;
	controls.maxPolarAngle = 1.42;
	controls.target.fromArray( initialOrbit.target );
	controls.autoRotate = false;
	controls.update();
	resetCameraSway();
	cameraSwayElapsed = Math.max( 0, initialOrbit.swayPhase ) * CAMERA_SWAY_PERIOD;
	updateCameraSway( 0 );
	controls.addEventListener( 'start', () => {

		cameraSwayInteracting = true;

	} );
	controls.addEventListener( 'end', () => {

		cameraSwayInteracting = false;
		cameraSwayCenterAngle = getCameraAzimuth() - cameraSwayOffset;

	} );

	createStage();
	rig = new BodyRig();
	tracker = new BodyTracker( {
		onPacket: ( packet ) => rig.ingest( packet, tracker.videoAspect ),
		onStatus: () => updateOverlay(),
	} );
	setupGui();
	await withAssetLoader( container, [ 'Michelle' ], manager => (
		manager.load( 'Michelle', onProgress => loadMichelle( onProgress ) )
	) );
	if ( sambaAction ) sambaAction.time = initialPose.danceTime % sambaAction.getClip().duration;
	buildBallSimulation();
	buildOverlay();
	qualityGovernor = new QualityGovernor();
	updateOverlay();
	if ( autoStartAnimation ) renderer.setAnimationLoop( animate );
	window.addEventListener( 'resize', onWindowResize );
	window.addEventListener( 'pagehide', unmount, { once: true } );
	if ( startTrackingOnMount ) void tracker.start();

}

function applyRendererSize() {

	if ( ! renderer ) return;
	const area = Math.max( 1, window.innerWidth * window.innerHeight );
	let pixelRatio = Math.min(
		window.devicePixelRatio || 1,
		Math.sqrt( renderPixelBudget / area ) * params.resolutionScale
	);
	if ( maximumRenderSize ) {

		pixelRatio = Math.min(
			pixelRatio,
			maximumRenderSize[ 0 ] / Math.max( 1, window.innerWidth ),
			maximumRenderSize[ 1 ] / Math.max( 1, window.innerHeight )
		);

	}
	pixelRatio = Math.max( 0.35, pixelRatio );
	renderer.setPixelRatio( pixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	const size = renderer.getDrawingBufferSize( new THREE.Vector2() );
	renderWidth = size.x;
	renderHeight = size.y;

}

//
// Overlay + controls
//

function buildOverlay() {

	overlay = document.createElement( 'div' );
	overlay.className = 'sdf-ballpit-ui';
	overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:10;';
	const style = document.createElement( 'style' );
	style.textContent = `
		.sdf-ballpit-ui {
			--ink: #2a243b;
			--paper: rgba(255, 247, 224, .93);
			--pink: #eb4f79;
			--aqua: #49c8cb;
			font-family: "Trebuchet MS", "Avenir Next", system-ui, sans-serif;
			color: var(--ink);
		}
		.sdf-ballpit-receipt {
			position: absolute;
			top: max(14px, env(safe-area-inset-top));
			left: 16px;
			display: grid;
			grid-template-columns: 10px auto;
			gap: 9px;
			align-items: center;
			max-width: min(420px, calc(100vw - 32px));
			padding: 9px 13px 9px 10px;
			border: 1px solid rgba(42, 36, 59, .16);
			border-radius: 8px 18px 18px 8px;
			background: var(--paper);
			font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
			font-size: 10px;
			font-weight: 650;
			letter-spacing: .035em;
			line-height: 1.35;
			pointer-events: auto;
		}
		.sdf-ballpit-receipt::before {
			content: "";
			width: 10px;
			height: 28px;
			border-radius: 999px;
			background: repeating-linear-gradient(to bottom, #eb4f79 0 5px, #ffd23f 5px 10px, #49c8cb 10px 15px);
		}
		.sdf-ballpit-camera {
			position: absolute;
			bottom: max(18px, env(safe-area-inset-bottom));
			left: 50%;
			transform: translateX(-50%);
			display: grid;
			grid-template-columns: 38px auto;
			grid-template-rows: auto auto;
			column-gap: 11px;
			align-items: center;
			min-width: 250px;
			min-height: 62px;
			padding: 9px 18px 9px 10px;
			border: 2px solid rgba(255, 255, 255, .78);
			border-radius: 18px;
			background: linear-gradient(145deg, #f05c84, #d93669);
			color: #fff;
			font: inherit;
			text-align: left;
			cursor: pointer;
			pointer-events: auto;
			transition: transform 150ms ease;
		}
		.sdf-ballpit-camera:hover:not(:disabled) {
			transform: translate(-50%, -3px);
		}
		.sdf-ballpit-camera:active:not(:disabled) {
			transform: translate(-50%, 7px);
		}
		.sdf-ballpit-camera:focus-visible { outline: 4px solid #2e86ff; outline-offset: 4px; }
		.sdf-ballpit-camera:disabled { cursor: wait; filter: saturate(.65); }
		.sdf-ballpit-camera__icon {
			grid-row: 1 / span 2;
			display: grid;
			width: 38px;
			height: 38px;
			place-items: center;
			border-radius: 13px;
			background: rgba(255, 255, 255, .2);
			font-size: 21px;
		}
		.sdf-ballpit-camera__label {
			align-self: end;
			font-family: "Arial Rounded MT Bold", "Trebuchet MS", sans-serif;
			font-size: 16px;
			font-weight: 800;
			letter-spacing: .01em;
			line-height: 1.1;
		}
		.sdf-ballpit-camera__hint {
			align-self: start;
			margin-top: 3px;
			color: rgba(255, 255, 255, .9);
			font-size: 11px;
			line-height: 1.15;
		}
		.sdf-ballpit-camera[data-state="tracking"] {
			grid-template-columns: 14px auto;
			grid-template-rows: auto;
			column-gap: 8px;
			min-width: 0;
			min-height: 0;
			padding: 9px 14px;
			border-width: 1px;
			border-radius: 999px;
			background: rgba(42, 36, 59, .92);
		}
		.sdf-ballpit-camera[data-state="tracking"] .sdf-ballpit-camera__icon {
			grid-row: auto;
			width: 12px;
			height: 12px;
			border-radius: 3px;
			background: #ff668c;
			font-size: 0;
		}
		.sdf-ballpit-camera[data-state="tracking"] .sdf-ballpit-camera__label { align-self: center; font-size: 12px; }
		.sdf-ballpit-camera[data-state="tracking"] .sdf-ballpit-camera__hint { display: none; }
		.sdf-ballpit-preview {
			position: absolute;
			right: 14px;
			bottom: 14px;
			width: 200px;
			overflow: hidden;
			border: 3px solid rgba(255, 247, 224, .9);
			border-radius: 16px;
			background: #171322;
			pointer-events: auto;
		}
		.sdf-ballpit-preview video { display:block;width:100%;height:auto;transform:scaleX(-1); }
		.sdf-ballpit-preview canvas { position:absolute;inset:0;width:100%;height:100%; }
		@media (prefers-reduced-motion: reduce) {
			.sdf-ballpit-camera { transition: none; }
		}
		@media (max-width: 560px) {
			.sdf-ballpit-receipt { left: 10px; max-width: calc(100vw - 20px); }
			.sdf-ballpit-camera { bottom: max(12px, env(safe-area-inset-bottom)); min-width: min(250px, calc(100vw - 30px)); }
			.sdf-ballpit-preview { right: 10px; bottom: 90px; width: 136px; }
		}
	`;
	overlay.appendChild( style );
	const receipt = document.createElement( 'div' );
	receipt.className = 'sdf-ballpit-receipt';
	receipt.setAttribute( 'role', 'status' );
	receipt.textContent = '';
	const button = document.createElement( 'button' );
	button.type = 'button';
	button.className = 'sdf-ballpit-camera';
	button.dataset.state = 'idle';
	button.setAttribute( 'aria-label', 'Use your body' );
	const icon = document.createElement( 'span' );
	icon.className = 'sdf-ballpit-camera__icon';
	icon.textContent = '✦';
	icon.setAttribute( 'aria-hidden', 'true' );
	const label = document.createElement( 'span' );
	label.className = 'sdf-ballpit-camera__label';
	label.textContent = 'Use your body';
	const hint = document.createElement( 'span' );
	hint.className = 'sdf-ballpit-camera__hint';
	hint.textContent = 'Step into Michelle’s samba';
	button.append( icon, label, hint );
	button.addEventListener( 'click', async () => {

		if ( tracker.state === 'tracking' ) {

			tracker.stop();
			params.mode = 'Dance';

		} else {

			params.mode = 'Your Body';
			await tracker.start();

		}
		updateOverlay();

	} );
	const preview = document.createElement( 'div' );
	preview.className = 'sdf-ballpit-preview';
	preview.style.display = 'none';
	const video = tracker.video;
	const skeletonCanvas = document.createElement( 'canvas' );
	preview.append( video, skeletonCanvas );
	overlay.append( receipt, button, preview );
	overlay.userData = { receipt, button, label, hint, preview, skeletonCanvas };
	container.style.position = 'relative';
	container.appendChild( overlay );

}

function updateOverlay() {

	if ( ! overlay || ! tracker || ! rig ) return;
	const { receipt, button, label, hint, preview } = overlay.userData;
	const state = tracker.state;
	button.dataset.state = state;
	button.disabled = state === 'starting';
	button.setAttribute( 'aria-busy', state === 'starting' ? 'true' : 'false' );
	const computeReceipt = simulationReady
		? `${sdfBuilder.resolution}³ live SDF · ${( solver.particleCount / 1024 ).toFixed( 0 )}k balls · ${params.tier}`
		: 'Loading Michelle and the ball pit…';

	if ( state === 'tracking' ) {

		const trackingCopy = rig.liveWeight > 0.5
			? rig.upperBodyOnly ? 'upper body · arms in the pit' : 'you are Michelle'
			: 'step into frame';
		const detection = tracker.detectionFps > 0 ? ` · ${tracker.detectionFps.toFixed( 0 )} Hz` : '';
		receipt.textContent = `${trackingCopy} · ${computeReceipt}${detection}`;
		label.textContent = 'Back to dance';
		hint.textContent = '';
		button.setAttribute( 'aria-label', 'Stop using camera and return to dance' );

	} else {

		const stateCopy = {
			starting: 'Starting camera…',
			denied: 'Camera denied · Michelle keeps dancing',
			error: 'Camera unavailable · Michelle keeps dancing',
		}[ state ];
		receipt.textContent = stateCopy ?? computeReceipt;
		label.textContent = state === 'starting' ? 'Starting camera…' : 'Use your body';
		hint.textContent = state === 'denied' ? 'Camera access was denied' : state === 'error' ? 'Try camera again' : 'Step into Michelle’s samba';
		button.setAttribute( 'aria-label', label.textContent );

	}
	preview.style.display = state === 'tracking' && params.showVideo ? 'block' : 'none';

}

function drawSkeletonOverlay() {

	if ( ! overlay || tracker.state !== 'tracking' || ! params.showVideo ) return;
	const { skeletonCanvas, preview } = overlay.userData;
	if ( preview.style.display === 'none' ) return;
	const packet = rig.lastPacket;
	const context = skeletonCanvas.getContext( '2d' );
	const width = skeletonCanvas.width = Math.max( 1, skeletonCanvas.clientWidth * 2 );
	const height = skeletonCanvas.height = Math.max( 1, skeletonCanvas.clientHeight * 2 );
	context.clearRect( 0, 0, width, height );
	if ( ! packet || packet[ PKT_HAS_POSE ] < 0.5 || ! params.showSkeleton ) return;
	const x = ( index ) => ( 1 - packet[ PKT_POSE_NORM + index * 4 ] ) * width;
	const y = ( index ) => packet[ PKT_POSE_NORM + index * 4 + 1 ] * height;
	context.strokeStyle = 'rgba(73, 224, 229, .9)';
	context.lineWidth = 3;
	for ( const [ a, b ] of POSE_BONES ) {

		if ( packet[ PKT_POSE_NORM + a * 4 + 3 ] < 0.4 || packet[ PKT_POSE_NORM + b * 4 + 3 ] < 0.4 ) continue;
		context.beginPath();
		context.moveTo( x( a ), y( a ) );
		context.lineTo( x( b ), y( b ) );
		context.stroke();

	}
	context.fillStyle = 'rgba(255, 86, 128, .95)';
	for ( let i = 0; i < 33; i ++ ) {

		if ( packet[ PKT_POSE_NORM + i * 4 + 3 ] < 0.4 ) continue;
		context.beginPath();
		context.arc( x( i ), y( i ), 3.2, 0, Math.PI * 2 );
		context.fill();

	}

}

function setupGui() {

	gui = createExampleGui( 'SDF Body Tracking — Ball Pit' );
	if ( ! controlsExpanded ) gui.close();
	gui.add( params, 'mode', [ 'Dance', 'Your Body' ] ).name( 'Mode' ).onChange( async ( mode ) => {

		if ( mode === 'Your Body' && tracker.state !== 'tracking' ) await tracker.start();
		if ( mode === 'Dance' && tracker.state === 'tracking' ) tracker.stop();
		updateOverlay();

	} );
	const tracking = gui.addFolder( 'Tracking' );
	tracking.add( { camera: () => tracker.state === 'tracking' ? tracker.stop() : tracker.start() }, 'camera' ).name( 'Toggle Camera' );
	tracking.add( params, 'tracker', [ 'pose + hands', 'holistic' ] ).name( 'Pipeline' ).onChange( async () => {

		if ( tracker.state === 'tracking' || tracker.state === 'starting' ) {

			tracker.stop();
			await tracker.start();

		}

	} );
	tracking.add( params, 'mirror' ).name( 'Mirror' );
	tracking.add( params, 'smoothing', 0, 1 ).name( 'Smoothing' );
	tracking.add( params, 'handDetail' ).name( 'Track Hands' );
	tracking.add( params, 'showVideo' ).name( 'Show Camera Feed' ).onChange( updateOverlay );
	tracking.add( params, 'showSkeleton' ).name( 'Show Landmarks' );

	const pit = gui.addFolder( 'Ball Pit' );
	pit.add( params, 'ballCount', Object.keys( BALL_COUNTS ) ).name( 'Count' ).onChange( updateBallCount );
	pit.add( params, 'bounciness', 0, 0.9, 0.01 ).name( 'Bounciness' ).onChange( ( value ) => {

		uColliderRestitution.value = value;

	} );
	pit.add( params, 'friction', 0, 0.85, 0.01 ).name( 'Friction' ).onChange( ( value ) => {

		uColliderFriction.value = value;

	} );
	pit.add( params, 'gravity', 0, 18, 0.1 ).name( 'Gravity' ).onChange( ( value ) => {

		if ( solver ) solver.uniforms.gravity.value.set( 0, - value / CELL_WORLD, 0 );

	} );
	pit.add( params, 'palette', Object.keys( BALL_PALETTES ) ).name( 'Palette' ).onChange( rebuildBallMaterial );

	const sdf = gui.addFolder( 'SDF' );
	sdf.add( params, 'sdfResolution', [ 48, 64, 96 ] ).name( 'Resolution' ).onChange( rebuildSimulation );
	sdf.add( params, 'showSlice' ).name( 'Slice Monitor' ).onChange( ( visible ) => {

		if ( sliceMesh ) sliceMesh.visible = visible;

	} );
	sdf.add( params, 'showSurfaceVelocity' ).name( 'Surface Velocity' ).onChange( ( visible ) => {

		if ( sliceMesh ) sliceMesh.userData.velocityVisible.value = visible ? 1 : 0;

	} );

	const quality = gui.addFolder( 'Quality' );
	quality.add( params, 'tier', Object.keys( QUALITY_TIERS ) ).name( 'Tier Override' ).onChange( setQualityTier );
	quality.add( params, 'autoQuality' ).name( 'Auto Governor' );
	quality.add( params, 'resolutionScale', 0.45, 1, 0.05 ).name( 'Resolution Scale' ).onChange( applyRendererSize );
	quality.add( params, 'sphereDepth' ).name( 'Sphere Depth' ).onChange( rebuildBallMaterial );
	quality.add( params, 'autoOrbit' ).name( 'Camera Sway' ).onChange( ( value ) => {

		if ( value ) resetCameraSway();

	} );

}

//
// Frame loop
//

function animate( now ) {

	if ( disposed || ! actorReady || ! simulationReady || rebuilding ) return;
	const time = now * 0.001;
	const measuredDelta = previousTime > 0 ? time - previousTime : 1 / 60;
	const delta = fixedTimeStep ?? Math.min( 0.05, Math.max( 1 / 240, measuredDelta ) );
	previousTime = time;
	advanceFrame( delta, measuredDelta );

}

function advanceFrame( delta, measuredDelta = delta ) {

	if ( disposed || ! actorReady || ! simulationReady || rebuilding ) return false;
	frameNumber ++;
	rig.update( delta );
	const useTrackedPose = params.mode === 'Your Body' && ( rig.live || rig.liveWeight > 0.01 );
	setActorMotionState( useTrackedPose ? 'tracking' : 'dance' );
	mixer.update( delta );
	retargeter.apply( rig, delta, useTrackedPose ? rig.liveWeight : 0 );
	actor.updateMatrixWorld( true );
	actor.skinnedMesh.skeleton.update();
	const hipsWorld = retargeter.bones.get( 'Hips' ).getWorldPosition( _v0 );
	// Keep the floor-seated field domain inside the pit interior margin.
	hipsWorld.set(
		THREE.MathUtils.clamp( hipsWorld.x, - SDF_CENTER_RANGE, SDF_CENTER_RANGE ),
		SDF_DOMAIN_SIZE.y * 0.5,
		THREE.MathUtils.clamp( hipsWorld.z, - SDF_CENTER_RANGE, SDF_CENTER_RANGE )
	);
	sdfBuilder.update( delta, hipsWorld );
	renderer.compute( solverDiagnostics.clearPass );
	sdfBuilder.dispatch( renderer );
	solver.step( renderer, Math.min( 1 / 30, delta ) );
	updateCameraSway( delta );
	controls.update( delta );
	renderPipeline.render();
	drawSkeletonOverlay();
	frameTimes.push( measuredDelta * 1000 );
	if ( frameTimes.length > 64 ) frameTimes.shift();
	qualityGovernor.push( measuredDelta * 1000 );
	if ( frameNumber % 20 === 0 ) updateOverlay();
	return true;

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	applyRendererSize();

}

export function unmount() {

	if ( disposed ) return;
	disposed = true;
	animationPaused = true;
	renderer?.setAnimationLoop( null );
	window.removeEventListener( 'resize', onWindowResize );
	window.removeEventListener( 'pagehide', unmount );
	tracker?.stop();
	gui?.destroy();
	gui = null;
	overlay?.remove();
	overlay = null;
	disposeBallSimulation();
	environmentTexture?.dispose();
	environmentTexture = null;
	scenePass?.dispose?.();
	scenePass = null;
	renderPipeline?.dispose();
	renderPipeline = null;
	controls?.dispose();
	controls = null;
	scene?.traverse( ( object ) => {

		object.geometry?.dispose?.();
		if ( Array.isArray( object.material ) ) object.material.forEach( ( material ) => material.dispose() );
		else object.material?.dispose?.();

	} );
	devtools?.dispose();
	devtools = null;
	renderer?.dispose();
	renderer = null;
	scene = null;
	actor = null;
	retargeter = null;
	mixer = null;
	tPoseAction = null;
	sambaAction = null;
	actorMotionState = 'loading';
	actorReady = false;
	cameraSwayElapsed = 0;
	cameraSwayOffset = 0;
	cameraSwayInteracting = false;
	tracker = null;
	rig = null;
	activeAssets = null;

}
