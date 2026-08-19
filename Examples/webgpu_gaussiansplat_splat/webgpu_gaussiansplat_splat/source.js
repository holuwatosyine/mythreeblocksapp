import * as THREE from 'three/webgpu';
import { registerDevtools } from 'three-blocks/devtools';
import { Fn, color, cross, dot, instancedArray, mix, normalize, rotate, screenUV, smoothstep, uniform, uint, vec2, vec3, vec4 } from 'three/tsl';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createExampleCaption } from '../helpers/ExampleCaption.js';
import { createExampleGui } from '../helpers/exampleGui.js';
import { frameCameraForAspect } from '../helpers/mobile.js';
import { withAssetLoader } from '../helpers/LoadingManager.js';
import { shaderCache } from 'three-blocks/shaders';

import { SplatMesh } from 'three-blocks/gaussian-splats';

const MORPH_RECORD_STRIDE = 8;
const MAX_PIXEL_RATIO = 1.5;
const REDUCED_MOTION = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
const SHAPES = Object.freeze( [
	Object.freeze( { name: 'PRISM', asset: 'prism', color: '#ffd43b', path: 'splat/morph-prism.sog' } ),
	Object.freeze( { name: 'SPHERE', asset: 'sphere', color: '#f04444', path: 'splat/morph-sphere.sog' } ),
	Object.freeze( { name: 'BOX', asset: 'box', color: '#3f73f2', path: 'splat/morph-box.sog' } ),
] );
const SHAPE_COLORS = SHAPES.map( shape => new THREE.Color( shape.color ) );
// Alternating swirl per leg keeps three transits in one loop from reading as copies.
const SWIRL_LEGS = Object.freeze( [ 1, - 1.15, 0.85 ] );
// Transport schedule inside one transition: departures fill [0, DEPART_SPAN], each flight
// lasts up to FLIGHT_SPAN, and every splat has settled its landing bounce before phase 1.
// A long stagger with short flights keeps both endpoint shapes readable mid-transit and
// caps the airborne fraction, so the stream stays a delicate ribbon instead of a shell.
const DEPART_SPAN = 0.68;
const FLIGHT_SPAN = 0.24;
const BOUNCE_SPAN = 0.08;

const params = {
	loop: ! REDUCED_MOTION,
	speed: 1,
	swirl: 1,
	scatter: 1,
	streak: 1,
	impact: 1,
	glow: 0.9,
	phase: 0,
};

function shapeAssetUrl( shape ) {

	const direct = options.assets?.gaussianMorph?.[ shape.asset ];
	if ( typeof direct === 'string' && direct.length > 0 ) return direct;
	const root = options.assets?.media;
	if ( typeof root !== 'string' || root.length === 0 ) {

		throw new Error( `Gaussian morph requires assets.gaussianMorph.${shape.asset} or assets.media.` );

	}
	return `${root.replace( /\/$/u, '' )}/${shape.path}`;

}

const morphFrom = uniform( new THREE.Vector3( 1, 0, 0 ) );
const morphTo = uniform( new THREE.Vector3( 0, 1, 0 ) );
const morphProgress = uniform( 0 );
const morphSwirl = uniform( 1 );
const morphSwirlLeg = uniform( SWIRL_LEGS[ 0 ] );
const morphScatter = uniform( 1 );
const morphStreak = uniform( 1 );
const morphImpact = uniform( 1 );
const morphGlow = uniform( 0.9 );
const morphEnergy = uniform( 0 );
const morphLegTint = uniform( SHAPE_COLORS[ 0 ].clone().multiplyScalar( 0.16 ) );

let container;
let containerStyle;
let renderer;
let devtools;
let scene;
let camera;
let controls;
let gui;
let timer;
let splats = null;
let stage = null;
let captionElement = null;
let morphAttribute = null;
let morphSHAttribute = null;
let splatCount = 0;
let splatSHDegree = 0;
const morphShaderResources = {
	get splatBuffers() { return splats?.buffers; },
	get drawStructNode() { return splats?.drawStructNode; },
	get indirectDispatchNode() { return splats?._indirectDispatchNode; },
	get sorter() { return splats?._sorter; },
	get tileRenderer() { return splats?._tileRenderer; },
	get morphTargets() { return morphAttribute?.value; },
	get morphSH() { return morphSHAttribute?.value; },
	morphFrom,
	morphTo,
	morphProgress,
	morphSwirl,
	morphSwirlLeg,
	morphScatter,
	morphStreak,
	morphImpact,
	morphGlow,
	morphEnergy,
	morphLegTint,
};
let mounted = false;
let options;
let elapsed = 0;
let lastMorphPhase = NaN;
let lastMorphSwirl = NaN;
let lastMorphScatter = NaN;
let lastMorphStreak = NaN;
let lastMorphImpact = NaN;
let lastMorphGlow = NaN;

export async function mount( containerElement, mountOptions = {} ) {

	container = containerElement;
	options = {
		assets: mountOptions.assets ?? {},
		initialPhase: Number.isFinite( mountOptions.initialPhase ) ? mountOptions.initialPhase : 0,
		loop: mountOptions.loop ?? ! REDUCED_MOTION,
		quality: mountOptions.quality ?? 'quality',
	};
	params.loop = options.loop;
	params.phase = options.initialPhase;
	containerStyle = {
		position: container.style.position,
		overflow: container.style.overflow,
		touchAction: container.style.touchAction,
	};
	container.style.position = 'relative';
	container.style.overflow = 'hidden';
	container.style.touchAction = 'none';
	mounted = true;

	if ( WebGPU.isAvailable() === false ) {

		container.appendChild( WebGPU.getErrorMessage() );
		throw new Error( 'No WebGPU support' );

	}

	await init();
	return createHandle();

}

async function init() {

	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	camera = new THREE.PerspectiveCamera( 34, width / height, 0.05, 60 );
	camera.position.set( 7.4, 2.25, 11.4 );

	scene = new THREE.Scene();
	scene.background = null;
	scene.fog = new THREE.Fog( 0x0b0d13, 13, 26 );

	const adapter = await navigator.gpu.requestAdapter();
	if ( ! adapter ) throw new Error( 'No WebGPU adapter available' );

	renderer = new THREE.WebGPURenderer( {
		antialias: false,
		requiredLimits: {
			maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
			maxBufferSize: adapter.limits.maxBufferSize,
		},
	} );
	devtools = registerDevtools( { renderer, container } );
	void devtools?.setStatsPanelMode( 'expanded' );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, MAX_PIXEL_RATIO ) );
	renderer.setSize( width, height );
	renderer.toneMapping = THREE.AgXToneMapping;
	renderer.toneMappingExposure = 0.98;
	container.appendChild( renderer.domElement );
	await renderer.init();

	controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true;
	controls.dampingFactor = 0.055;
	controls.enablePan = false;
	controls.minDistance = 7;
	controls.maxDistance = 19;
	controls.minPolarAngle = 0.55;
	controls.maxPolarAngle = 1.72;
	controls.target.set( 0, - 0.05, 0 );
	frameCameraForAspect( camera, controls.target, true );
	controls.update();

	createStage();
	const loaded = await withAssetLoader( container, SHAPES.map( shape => shape.name ), manager => (
		Promise.all( SHAPES.map( shape => manager.load( shape.name, onProgress => SplatMesh.load( shapeAssetUrl( shape ), {
			quality: options.quality,
			sh: 3,
			attributeMode: 'expanded',
			mortonOrdering: false,
			worker: false,
			maxBufferBytes: adapter.limits.maxStorageBufferBindingSize,
			performance: {
				maxStdDev: Math.sqrt( 8 ),
				radiusClip: 0,
				fragmentAlphaClip: 0.5 / 255,
				alphaClip: 0.5 / 255,
				minContribution: 1,
				opacityAwareRadius: true,
			},
			onProgress,
		} ) ) ) )
	) );

	if ( ! mounted ) {

		loaded.forEach( item => item.dispose() );
		return;

	}

	const data = loaded.map( ( item, index ) => requireExpandedData( item, SHAPES[ index ].name ) );
	const counts = loaded.map( item => item.count );
	if ( new Set( counts ).size !== 1 ) {

		loaded.forEach( item => item.dispose() );
		throw new Error( `Morph assets must have equal splat counts; received ${counts.map( count => count.toLocaleString() ).join( ', ' )}.` );

	}
	const shDegrees = data.map( item => item.shDegree );
	if ( new Set( shDegrees ).size !== 1 ) {

		loaded.forEach( item => item.dispose() );
		throw new Error( `Morph assets must have the same SH degree; received ${shDegrees.join( ', ' )}.` );

	}
	splatCount = counts[ 0 ];
	splatSHDegree = shDegrees[ 0 ];

	splats = loaded[ 0 ];
	configureMorphHooks( splats, data, adapter.limits.maxStorageBufferBindingSize );
	loaded.slice( 1 ).forEach( item => item.dispose() );

	splats.scale.setScalar( 1.38 );
	splats.position.y = 0.08;
	splats.rotation.y = - 0.42;
	splats.material.alphaBoost = 1.04;
	splats.material.applyPreset( 'VIBRANT' );
	splats.material.lightingMode = 'unlit';
	splats.rebuildMaterialHooks();
	scene.add( splats );

	captionElement = createCaptionElement();
	container.appendChild( captionElement );
	setupGui();

	timer = new THREE.Timer();
	timer.connect( document );
	lastMorphPhase = NaN;
	lastMorphSwirl = NaN;
	lastMorphScatter = NaN;
	lastMorphStreak = NaN;
	lastMorphImpact = NaN;
	lastMorphGlow = NaN;
	window.addEventListener( 'resize', onResize );
	renderer.setAnimationLoop( render );

}

function requireExpandedData( mesh, name ) {

	const data = mesh._data;
	if (
		! data ||
		! ( data.positions instanceof Float32Array ) ||
		! ( data.scales instanceof Float32Array ) ||
		! ( data.rotations instanceof Float32Array ) ||
		! ( data.colors instanceof Float32Array )
	) throw new Error( `${name} did not decode to expanded Gaussian attributes.` );
	const shDegree = Number.isInteger( data.shDegree ) ? data.shDegree : 0;
	const shCoefficientCount = ( shDegree + 1 ) ** 2 - 1;
	if (
		shCoefficientCount > 0 &&
		(
			! ( data.shCoefficients instanceof Float32Array ) ||
			data.shCoefficients.length < mesh.count * shCoefficientCount * 3
		)
	) throw new Error( `${name} declares SH degree ${shDegree} without complete coefficients.` );
	return data;

}

function boundsCenter( positions ) {

	const min = new THREE.Vector3( Infinity, Infinity, Infinity );
	const max = new THREE.Vector3( - Infinity, - Infinity, - Infinity );
	for ( let index = 0; index < splatCount; index ++ ) {

		const offset = index * 3;
		min.x = Math.min( min.x, positions[ offset ] );
		min.y = Math.min( min.y, positions[ offset + 1 ] );
		min.z = Math.min( min.z, positions[ offset + 2 ] );
		max.x = Math.max( max.x, positions[ offset ] );
		max.y = Math.max( max.y, positions[ offset + 1 ] );
		max.z = Math.max( max.z, positions[ offset + 2 ] );

	}
	return min.add( max ).multiplyScalar( 0.5 );

}

function spreadMortonBits( value ) {

	let result = value & 0xffff;
	result = ( result | result << 8 ) & 0x00ff00ff;
	result = ( result | result << 4 ) & 0x0f0f0f0f;
	result = ( result | result << 2 ) & 0x33333333;
	result = ( result | result << 1 ) & 0x55555555;
	return result >>> 0;

}

function octahedralMortonKey( x, y, z ) {

	const inverseLength = 1 / Math.max( Math.abs( x ) + Math.abs( y ) + Math.abs( z ), 1e-8 );
	let u = x * inverseLength;
	let v = y * inverseLength;
	if ( z < 0 ) {

		const previousU = u;
		u = ( 1 - Math.abs( v ) ) * Math.sign( previousU || 1 );
		v = ( 1 - Math.abs( previousU ) ) * Math.sign( v || 1 );

	}
	const quantizedU = Math.round( THREE.MathUtils.clamp( u * 0.5 + 0.5, 0, 1 ) * 65535 );
	const quantizedV = Math.round( THREE.MathUtils.clamp( v * 0.5 + 0.5, 0, 1 ) * 65535 );
	return ( spreadMortonBits( quantizedU ) | spreadMortonBits( quantizedV ) << 1 ) >>> 0;

}

function angularOrder( positions ) {

	const center = boundsCenter( positions );
	const keys = new Uint32Array( splatCount );
	const order = new Array( splatCount );
	for ( let index = 0; index < splatCount; index ++ ) {

		const offset = index * 3;
		keys[ index ] = octahedralMortonKey(
			positions[ offset ] - center.x,
			positions[ offset + 1 ] - center.y,
			positions[ offset + 2 ] - center.z
		);
		order[ index ] = index;

	}
	order.sort( ( a, b ) => keys[ a ] - keys[ b ] || a - b );
	return order;

}

function alignedQuaternion( baseRotations, targetRotations, baseIndex, targetIndex ) {

	const baseOffset = baseIndex * 4;
	const targetOffset = targetIndex * 4;
	let dot = 0;
	for ( let component = 0; component < 4; component ++ ) {

		dot += baseRotations[ baseOffset + component ] * targetRotations[ targetOffset + component ];

	}
	const sign = dot < 0 ? - 1 : 1;
	return [
		targetRotations[ targetOffset ] * sign,
		targetRotations[ targetOffset + 1 ] * sign,
		targetRotations[ targetOffset + 2 ] * sign,
		targetRotations[ targetOffset + 3 ] * sign,
	];

}

function hash01( value ) {

	let h = ( value ^ 0x9e3779b9 ) >>> 0;
	h = Math.imul( h ^ h >>> 16, 0x21f0aaad ) >>> 0;
	h = ( h ^ h >>> 15 ) >>> 0;
	h = Math.imul( h, 0x735a2d97 ) >>> 0;
	h = ( h ^ h >>> 15 ) >>> 0;
	return h / 4294967296;

}

function configureMorphHooks( mesh, data, maxBufferBytes ) {

	const [ prism, sphere, box ] = data;
	const shCoefficientCount = ( splatSHDegree + 1 ) ** 2 - 1;
	const morphBytes = splatCount * MORPH_RECORD_STRIDE * 4 * Float32Array.BYTES_PER_ELEMENT;
	const morphSHBytes = splatCount * shCoefficientCount * 2 * 4 * Float32Array.BYTES_PER_ELEMENT;
	if ( morphBytes > maxBufferBytes || morphSHBytes > maxBufferBytes ) {

		throw new Error(
			`Morph buffers exceed this GPU's ${Math.floor( maxBufferBytes / 1048576 )} MB storage limit `
			+ `(targets ${Math.ceil( morphBytes / 1048576 )} MB, SH ${Math.ceil( morphSHBytes / 1048576 )} MB).`
		);

	}
	// Equal counts turn the shared octahedral direction rank into a one-to-one map.
	const [ prismOrder, sphereOrder, boxOrder ] = data.map( item => angularOrder( item.positions ) );
	const [ prismCenter, sphereCenter, boxCenter ] = data.map( item => boundsCenter( item.positions ) );
	const direction = new THREE.Vector3();
	const packed = new Float32Array( splatCount * MORPH_RECORD_STRIDE * 4 );
	const packedSH = shCoefficientCount > 0 ? new Float32Array( splatCount * shCoefficientCount * 2 * 4 ) : null;

	for ( let rank = 0; rank < splatCount; rank ++ ) {

		const prismIndex = prismOrder[ rank ];
		const sphereIndex = sphereOrder[ rank ];
		const boxIndex = boxOrder[ rank ];
		const base = prismIndex * MORPH_RECORD_STRIDE * 4;
		const sphereOffset = sphereIndex * 3;
		direction.set(
			sphere.positions[ sphereOffset ] - sphereCenter.x,
			sphere.positions[ sphereOffset + 1 ] - sphereCenter.y,
			sphere.positions[ sphereOffset + 2 ] - sphereCenter.z
		).normalize();
		const azimuth = Math.atan2( direction.z, direction.x );
		const flowPhase = azimuth + direction.y * 1.4;
		// A tilted, wrapped latitude schedules departures as one helical front that peels the
		// source from below while the same rank order rebuilds the target ground-up.
		const delay = THREE.MathUtils.clamp(
			0.5 + direction.y * 0.23 + direction.x * 0.07 +
			Math.sin( azimuth * 2 + direction.y * 2.5 ) * 0.055,
			0.14,
			0.86
		);
		packed.set( sphere.positions.subarray( sphereIndex * 3, sphereIndex * 3 + 3 ), base );
		packed[ base + 3 ] = ( delay - 0.14 ) / 0.72;
		packed.set( sphere.scales.subarray( sphereIndex * 3, sphereIndex * 3 + 3 ), base + 4 );
		packed[ base + 7 ] = flowPhase;
		packed.set( alignedQuaternion( prism.rotations, sphere.rotations, prismIndex, sphereIndex ), base + 8 );
		packed.set( sphere.colors.subarray( sphereIndex * 4, sphereIndex * 4 + 4 ), base + 12 );
		packed.set( box.positions.subarray( boxIndex * 3, boxIndex * 3 + 3 ), base + 16 );
		packed[ base + 19 ] = hash01( rank * 2 );
		packed.set( box.scales.subarray( boxIndex * 3, boxIndex * 3 + 3 ), base + 20 );
		packed[ base + 23 ] = hash01( rank * 2 + 1 );
		packed.set( alignedQuaternion( prism.rotations, box.rotations, prismIndex, boxIndex ), base + 24 );
		packed.set( box.colors.subarray( boxIndex * 4, boxIndex * 4 + 4 ), base + 28 );
		if ( packedSH ) {

			for ( let coefficient = 0; coefficient < shCoefficientCount; coefficient ++ ) {

				const targetBase = ( prismIndex * shCoefficientCount * 2 + coefficient * 2 ) * 4;
				const sphereBase = ( sphereIndex * shCoefficientCount + coefficient ) * 3;
				const boxBase = ( boxIndex * shCoefficientCount + coefficient ) * 3;
				packedSH.set( sphere.shCoefficients.subarray( sphereBase, sphereBase + 3 ), targetBase );
				packedSH.set( box.shCoefficients.subarray( boxBase, boxBase + 3 ), targetBase + 4 );

			}

		}

	}

	morphAttribute = instancedArray( packed, 'vec4' ).setPBO( true ).setName( 'gs_morphTargets' );
	morphSHAttribute = packedSH
		? instancedArray( packedSH, 'vec4' ).setPBO( true ).setName( 'gs_morphSH' )
		: null;
	shaderCache.container( 'gaussian-morph/targets', morphShaderResources );
	const morphData = morphAttribute;
	const morphSHData = morphSHAttribute;
	const record = ( index, offset ) => morphData.element(
		index.mul( uint( MORPH_RECORD_STRIDE ) ).add( uint( offset ) )
	);
	const sourceState = ( source, sphereTarget, boxTarget ) => source.mul( morphFrom.x )
		.add( sphereTarget.mul( morphFrom.y ) )
		.add( boxTarget.mul( morphFrom.z ) );
	const targetState = ( source, sphereTarget, boxTarget ) => source.mul( morphTo.x )
		.add( sphereTarget.mul( morphTo.y ) )
		.add( boxTarget.mul( morphTo.z ) );
	const prismCenterNode = vec3( prismCenter.x, prismCenter.y, prismCenter.z );
	const sphereCenterNode = vec3( sphereCenter.x, sphereCenter.y, sphereCenter.z );
	const boxCenterNode = vec3( boxCenter.x, boxCenter.y, boxCenter.z );
	const centerFrom = sourceState( prismCenterNode, sphereCenterNode, boxCenterNode );
	const centerTo = targetState( prismCenterNode, sphereCenterNode, boxCenterNode );
	const smootherstepNode = t => t.mul( t ).mul( t ).mul( t.mul( 6 ).sub( 15 ).mul( t ).add( 10 ) );

	// Per-splat transport schedule, a pure function of the linear phase. Every window is
	// structurally zero at phase 0 and 1 so holds show exact endpoint attributes.
	const schedule = ( delayN, jitterA ) => {

		const start = delayN.mul( DEPART_SPAN ).toVar();
		const duration = jitterA.mul( - 0.14 ).add( 1 ).mul( FLIGHT_SPAN ).toVar();
		const tau = morphProgress.sub( start ).div( duration ).clamp( 0, 1 ).toVar();
		const eased = smootherstepNode( tau ).toVar();
		// The bell holds until just before touchdown: covariance and glow return only once
		// the spark is visually at its landing site, so fronts materialize instead of smearing.
		const bell = smoothstep( 0.0, 0.12, tau ).mul( smoothstep( 1.0, 0.94, tau ) ).toVar();
		const bounce = morphProgress.sub( start.add( duration ) ).div( BOUNCE_SPAN ).clamp( 0, 1 ).toVar();
		const guard = smoothstep( 0.0, 0.012, morphProgress );
		const charge = smoothstep( start.sub( 0.12 ), start, morphProgress )
			.mul( smoothstep( 0.14, 0.0, tau ) )
			.mul( guard )
			.toVar();
		return { tau, eased, bell, bounce, charge };

	};

	// Damped landing oscillation, forced to zero at both bounce endpoints.
	const bounceWave = bounce => bounce.mul( Math.PI * 3 ).sin()
		.mul( bounce.negate().add( 1 ).pow( 2 ) );

	// Flight path: endpoint mix carried around the shared axis by a swirl that peaks
	// mid-flight, with radial bulge, per-splat lift, and sine turbulence. Exact at both ends.
	const flightPath = ( eased, anchorFrom, anchorTo, flowPhase, jitterA, jitterB ) => {

		const center = mix( centerFrom, centerTo, eased );
		const offset = mix( anchorFrom, anchorTo, eased ).sub( center ).toVar();
		const wave = eased.mul( Math.PI ).sin().toVar();
		// sin² has zero slope at both ends: radial motion ramps in gently, so departures peel
		// tangentially along the swirl instead of puffing outward as silhouette spikes.
		const waveSq = wave.mul( wave ).toVar();
		const shear = offset.y.mul( 0.55 ).clamp( - 0.85, 0.85 );
		const angle = wave.mul( morphSwirl ).mul( morphSwirlLeg )
			.mul( shear.mul( 0.30 ).add( jitterA.sub( 0.5 ).mul( 0.24 ) ).add( 1 ) )
			.mul( 2.6 );
		const swirled = rotate( offset.xz, angle ).toVar();
		const bulge = waveSq.mul( morphScatter ).mul( jitterB.mul( 0.9 ).add( 0.55 ) ).mul( 0.35 ).add( 1 );
		const lift = waveSq.mul( morphScatter )
			.mul( jitterA.sub( 0.5 ).mul( 0.75 ).add( 0.05 ) )
			.mul( 0.8 );
		const turbulence = vec3(
			eased.mul( 9.5 ).add( flowPhase.mul( 2.0 ) ).add( jitterB.mul( 6.28 ) ).sin(),
			eased.mul( 7.3 ).add( flowPhase.mul( 3.1 ) ).add( jitterB.mul( 12.57 ) ).sin(),
			eased.mul( 11.1 ).add( flowPhase.mul( 1.7 ) ).add( jitterA.mul( 9.4 ) ).sin()
		).mul( waveSq ).mul( morphScatter ).mul( 0.045 );
		return center.add( vec3( swirled.x.mul( bulge ), offset.y.add( lift ), swirled.y.mul( bulge ) ) )
			.add( turbulence );

	};

	// Finite-difference flight velocity per unit tau; collapses to zero right at touchdown.
	const flightVelocity = ( tau, anchorFrom, anchorTo, flowPhase, jitterA, jitterB ) => {

		const ahead = smootherstepNode( tau.add( 0.02 ).min( 1 ) );
		const here = flightPath( smootherstepNode( tau ), anchorFrom, anchorTo, flowPhase, jitterA, jitterB );
		return flightPath( ahead, anchorFrom, anchorTo, flowPhase, jitterA, jitterB )
			.sub( here )
			.mul( 50 );

	};

	const unpack = index => {

		const sphereRecord = record( index, 0 ).toVar();
		const sphereScaleRecord = record( index, 1 ).toVar();
		const boxRecord = record( index, 4 ).toVar();
		const boxScaleRecord = record( index, 5 ).toVar();
		return {
			spherePosition: sphereRecord.xyz,
			delay: sphereRecord.w,
			sphereScale: sphereScaleRecord.xyz,
			flowPhase: sphereScaleRecord.w,
			boxPosition: boxRecord.xyz,
			jitterA: boxRecord.w,
			boxScale: boxScaleRecord.xyz,
			jitterB: boxScaleRecord.w,
		};

	};

	if ( morphSHData ) {

		const shRecord = ( index, coefficientIndex, targetIndex ) => morphSHData.element(
			index.mul( uint( shCoefficientCount * 2 ) )
				.add( uint( coefficientIndex * 2 + targetIndex ) )
		).xyz;
		mesh.material.customSHCoefficientNode = ( sourceCoefficient, coefficientIndex, position, index ) => {

			void position;
			const splat = unpack( index );
			const timing = schedule( splat.delay, splat.jitterA );
			const sphereCoefficient = shRecord( index, coefficientIndex, 0 );
			const boxCoefficient = shRecord( index, coefficientIndex, 1 );
			return mix(
				sourceState( sourceCoefficient, sphereCoefficient, boxCoefficient ),
				targetState( sourceCoefficient, sphereCoefficient, boxCoefficient ),
				timing.eased
			);

		};

	} else {

		mesh.material.customSHCoefficientNode = null;

	}

	// Velocity of this splat's flight, rebuilt from the resident position each hook receives.
	const velocityFor = ( splat, timing, position ) => flightVelocity(
		timing.tau,
		sourceState( position, splat.spherePosition, splat.boxPosition ),
		targetState( position, splat.spherePosition, splat.boxPosition ),
		splat.flowPhase,
		splat.jitterA,
		splat.jitterB
	);

	const multiplyQuaternion = ( left, right ) => vec4(
		left.xyz.mul( right.w ).add( right.xyz.mul( left.w ) ).add( cross( left.xyz, right.xyz ) ),
		left.w.mul( right.w ).sub( dot( left.xyz, right.xyz ) )
	);
	const hotWhite = color( 0xfff2dd );
	// Superheat a splat's own albedo: push saturation past 1 and lift brightness, so the
	// energy palette is always the morphing shapes' identity rather than a foreign neon.
	const superheat = value => {

		const luma = dot( value, vec3( 0.2126, 0.7152, 0.0722 ) );
		return mix( vec3( luma ), value, 1.35 ).mul( 1.45 ).max( 0 );

	};

	mesh.material.customPositionNode = Fn( ( [ position, index ] ) => {

		const splat = unpack( index );
		const timing = schedule( splat.delay, splat.jitterA );
		const anchorFrom = sourceState( position, splat.spherePosition, splat.boxPosition ).toVar();
		const anchorTo = targetState( position, splat.spherePosition, splat.boxPosition ).toVar();
		const travelled = flightPath( timing.eased, anchorFrom, anchorTo, splat.flowPhase, splat.jitterA, splat.jitterB );
		const radialFrom = normalize( anchorFrom.sub( centerFrom ) );
		const radialTo = normalize( anchorTo.sub( centerTo ) );
		// Negative first lobe: the impact dents the surface inward, then rebounds — outward
		// first reads as goo hanging off downward-facing assembly fronts.
		const settle = radialTo.mul( bounceWave( timing.bounce ).mul( morphImpact ).mul( - 0.055 ) );
		const anticipation = radialFrom.mul( timing.charge ).mul( - 0.05 );
		return travelled.add( settle ).add( anticipation );

	} );

	mesh.material.customScaleNode = Fn( ( [ scale, position, index ] ) => {

		const splat = unpack( index );
		const timing = schedule( splat.delay, splat.jitterA );
		const blendedScale = mix(
			sourceState( scale, splat.sphereScale, splat.boxScale ),
			targetState( scale, splat.sphereScale, splat.boxScale ),
			timing.eased
		).toVar();
		const speed = velocityFor( splat, timing, position ).length().toVar();
		// Airborne splats collapse into sparks: shedding almost all covariance mid-flight is
		// what makes the surface read as dissolving into energy instead of shredded shell.
		// The heading axis then stretches hard with speed, so cruising sparks draw out into
		// flow lines while the thin minor axes keep them reading as light, not straw.
		const meanLog = blendedScale.x.add( blendedScale.y ).add( blendedScale.z ).div( 3 );
		const sparkLog = meanLog.sub( 1.15 );
		const glint = speed.mul( 0.45 ).mul( morphStreak ).clamp( 0, 2.7 );
		const sparkScale = vec3( sparkLog.add( glint ), sparkLog, sparkLog );
		const sparkGate = smoothstep( 0.5, 0.9, splat.jitterA ).mul( 0.8 ).add( 0.2 );
		const pop = bounceWave( timing.bounce ).mul( morphImpact ).mul( sparkGate ).mul( 0.15 );
		return mix( blendedScale, sparkScale, timing.bell.mul( 0.92 ) )
			.add( pop )
			.sub( timing.charge.mul( 0.30 ) );

	} );

	mesh.material.customRotationNode = Fn( ( [ rotation, position, index ] ) => {

		const splat = unpack( index );
		const timing = schedule( splat.delay, splat.jitterA );
		const sphereRotation = record( index, 2 ).toVar();
		const boxRotation = record( index, 6 ).toVar();
		const rotationFrom = sourceState( rotation, sphereRotation, boxRotation );
		const rotationTo = targetState( rotation, sphereRotation, boxRotation );
		const alignedRotationTo = dot( rotationFrom, rotationTo ).lessThan( 0 )
			.select( rotationTo.negate(), rotationTo );
		const baseRotation = normalize( mix( rotationFrom, alignedRotationTo, timing.eased ) ).toVar();
		const velocity = velocityFor( splat, timing, position ).toVar();
		const speed = velocity.length().toVar();
		const heading = velocity.div( speed.max( 1e-5 ) ).toVar();
		// Minimal quaternion carrying +X onto the flight heading = streaks follow their path.
		const headingRotation = normalize( vec4(
			1e-5,
			heading.z.negate(),
			heading.y,
			heading.x.add( 1 ).max( 1e-4 )
		) ).toVar();
		const alignedHeading = dot( baseRotation, headingRotation ).lessThan( 0 )
			.select( headingRotation.negate(), headingRotation );
		const streakWeight = timing.bell.mul( morphStreak )
			.mul( speed.mul( 0.55 ).clamp( 0, 1 ) );
		const blended = normalize( mix( baseRotation, alignedHeading, streakWeight ) );
		const anchorTo = targetState( position, splat.spherePosition, splat.boxPosition );
		const radialTo = normalize( anchorTo.sub( centerTo ) );
		const settleHalf = bounceWave( timing.bounce ).mul( morphImpact ).mul( 0.35 ).mul( 0.5 );
		const settleRoll = vec4( radialTo.mul( settleHalf.sin() ), settleHalf.cos() );
		return normalize( multiplyQuaternion( settleRoll, blended ) );

	} );

	mesh.material.customColorNode = Fn( ( [ sourceColor, position, index ] ) => {

		const splat = unpack( index );
		const timing = schedule( splat.delay, splat.jitterA );
		const sphereColor = record( index, 3 ).toVar();
		const boxColor = record( index, 7 ).toVar();
		const colorFrom = sourceState( sourceColor.xyz, sphereColor.xyz, boxColor.xyz );
		const colorTo = targetState( sourceColor.xyz, sphereColor.xyz, boxColor.xyz );
		const restingColor = mix( colorFrom, colorTo, timing.eased );
		// Speed proxy: analytic pace of the eased blend times travel distance, so the vertex
		// stage never re-evaluates the flight path.
		const travelSpan = targetState( position, splat.spherePosition, splat.boxPosition )
			.sub( sourceState( position, splat.spherePosition, splat.boxPosition ) )
			.length();
		const pace = timing.tau.mul( timing.tau.negate().add( 1 ) ).pow( 2 ).mul( 16 );
		const speedProxy = pace.mul( travelSpan.mul( 0.7 ).clamp( 0.35, 1.3 ) ).clamp( 0, 1.4 ).toVar();
		// Contrast carries the drama: airborne splats dim to embers, and superheated shape
		// color is added back on a sparse filament subset instead of tinting the stream pastel.
		const dimmed = restingColor.mul( timing.bell.mul( 0.75 ).negate().add( 1 ) );
		const filament = smoothstep( 0.7, 0.95, splat.jitterB ).toVar();
		const waveMix = splat.flowPhase.mul( 2.4 )
			.add( timing.eased.mul( 5.2 ) )
			.add( splat.jitterB.mul( 6.28 ) )
			.sin()
			.mul( 0.5 )
			.add( 0.5 );
		// The stream shimmers between the source and target identities while drifting toward
		// the target as the flight progresses, so each leg announces its own two colors.
		const shimmer = timing.eased.mul( 0.55 ).add( waveMix.mul( 0.45 ) );
		const plasma = mix( superheat( colorFrom ), superheat( colorTo ), shimmer );
		const core = mix( plasma, hotWhite.mul( 1.35 ), speedProxy.mul( filament ).mul( 0.7 ).clamp( 0, 1 ) );
		const glowAmount = timing.bell.mul( morphGlow )
			.mul( filament.mul( 0.92 ).add( 0.08 ) )
			.mul( speedProxy.mul( 0.7 ).add( 0.3 ) );
		const flying = dimmed.add( core.mul( glowAmount ).mul( 2.2 ) );
		const preheat = mix( flying, superheat( colorFrom ).mul( 1.25 ), timing.charge.mul( 0.6 ) );
		// Sparse landing sparks in the target's own color: only a jittered subset flashes, so
		// arrivals read as impacts on the assembly front rather than painting it white.
		const sparkGate = smoothstep( 0.5, 0.9, splat.jitterA );
		const flash = smoothstep( 0.0, 0.1, timing.bounce )
			.mul( smoothstep( 0.6, 0.1, timing.bounce ) )
			.mul( morphImpact )
			.mul( sparkGate )
			.mul( 0.85 )
			.clamp( 0, 0.9 );
		return mix( preheat, mix( superheat( colorTo ), hotWhite, 0.45 ).mul( 1.9 ), flash );

	} );

	mesh.material.customOpacityNode = Fn( ( [ opacity, , index ] ) => {

		const splat = unpack( index );
		const timing = schedule( splat.delay, splat.jitterA );
		const sphereColor = record( index, 3 ).toVar();
		const boxColor = record( index, 7 ).toVar();
		const baseOpacity = mix(
			sourceState( opacity, sphereColor.a, boxColor.a ),
			targetState( opacity, sphereColor.a, boxColor.a ),
			timing.eased
		);
		// Ember bodies thin out in flight while filament sparks keep their coverage,
		// leaving sparse bright trails over a dark haze instead of a solid fog.
		const filament = smoothstep( 0.7, 0.95, splat.jitterB );
		const thinning = filament.mul( 0.2 ).negate().add( 0.42 );
		return baseOpacity.mul( timing.bell.mul( thinning ).negate().add( 1 ) );

	} );

}

function loopPhase( time ) {

	const hold = 1.3;
	const transition = 2.7;
	const segmentDuration = hold + transition;
	const segment = Math.floor( time / segmentDuration ) % SHAPES.length;
	const localTime = time % segmentDuration;
	const blend = localTime <= hold ? 0 : THREE.MathUtils.clamp( ( localTime - hold ) / transition, 0, 1 );
	return segment + blend;

}

function setMorphPhase( phase ) {

	const wrapped = THREE.MathUtils.euclideanModulo( phase, SHAPES.length );
	const from = Math.floor( wrapped );
	const to = ( from + 1 ) % SHAPES.length;
	// Per-splat scheduling owns the easing, so the global phase stays linear.
	const blend = wrapped - from;
	morphFrom.value.set( 0, 0, 0 ).setComponent( from, 1 );
	morphTo.value.set( 0, 0, 0 ).setComponent( to, 1 );
	morphProgress.value = blend;
	morphSwirlLeg.value = SWIRL_LEGS[ from ];
	// Airborne fraction of the fleet under the uniform departure schedule.
	const departed = THREE.MathUtils.clamp( blend / DEPART_SPAN, 0, 1 );
	const landed = THREE.MathUtils.clamp( ( blend - FLIGHT_SPAN ) / DEPART_SPAN, 0, 1 );
	morphEnergy.value = departed - landed;
	morphLegTint.value.copy( SHAPE_COLORS[ from ] )
		.lerp( SHAPE_COLORS[ to ], blend )
		.multiplyScalar( 0.06 );
	updateCaption( from, to, blend );

}

function createStage() {

	stage = new THREE.Group();
	stage.name = 'RadialMorphStage';

	const coveGradient = smoothstep( 0.06, 0.96, screenUV.y ).pow( 0.82 );
	const glowDistance = screenUV.sub( vec2( 0.52, 0.34 ) ).mul( vec2( 1.02, 1.05 ) ).length();
	const subjectGlow = smoothstep( 0.58, 0.07, glowDistance ).pow( 1.55 );
	scene.backgroundNode = mix( color( 0x05060a ), color( 0x10131c ), coveGradient )
		.add( color( 0x1a1b26 ).mul( subjectGlow ).mul( morphEnergy.mul( 0.55 ).add( 0.52 ) ) )
		.add( morphLegTint.mul( subjectGlow ).mul( morphEnergy ) );

	scene.add( stage );

}

function createCaptionElement() {

	return createExampleCaption( {
		accent: '#64a4ff',
		ariaLabel: 'Gaussian splat morph details',
		label: 'Morph details',
		content: `
			<span class="tb-example-caption__eyebrow">Gaussian morph</span>
			<strong class="tb-example-caption__title" data-morph-title>PRISM <span>→</span> SPHERE</strong>
			<div class="tb-example-caption__track" data-morph-track>${SHAPES.map( ( shape, index ) => `
			<span data-shape="${index}"><i style="background:${shape.color}"></i>${shape.name}</span>
			` ).join( '' )}</div>
			<span class="tb-example-caption__meta">${splatCount.toLocaleString()} splats · SH${splatSHDegree} · helical transport stream · velocity-aligned streaks</span>
		`,
	} );

}

function updateCaption( from, to, blend ) {

	if ( ! captionElement ) return;
	const title = captionElement.querySelector( '[data-morph-title]' );
	title.innerHTML = `${SHAPES[ from ].name} <span>→</span> ${SHAPES[ to ].name}`;
	captionElement.querySelectorAll( '[data-shape]' ).forEach( ( item, index ) => {

		const active = index === from ? 1 - blend : index === to ? blend : 0;
		item.style.color = `color-mix(in srgb, #727d94 ${Math.round( ( 1 - active ) * 100 )}%, #eef2fb)`;

	} );

}

function setupGui() {

	gui?.destroy();
	gui = createExampleGui( `${splatCount.toLocaleString()} splat morph` );
	gui.close();
	gui.add( params, 'loop' ).name( 'Loop' );
	gui.add( params, 'speed', 0.35, 1.8, 0.05 ).name( 'Speed' );
	gui.add( params, 'swirl', 0, 2, 0.01 ).name( 'Swirl' );
	gui.add( params, 'scatter', 0, 2, 0.01 ).name( 'Scatter' );
	gui.add( params, 'streak', 0, 2, 0.01 ).name( 'Streak' );
	gui.add( params, 'impact', 0, 2, 0.01 ).name( 'Impact' );
	gui.add( params, 'glow', 0, 1.25, 0.01 ).name( 'Glow' );
	gui.add( params, 'phase', 0, 2.999, 0.001 )
		.name( 'Morph' )
		.onChange( () => {

			params.loop = false;

		} );

}

function render() {

	timer?.update();
	const delta = Math.min( timer?.getDelta() ?? 0, 0.05 );
	elapsed += delta * params.speed;
	if ( params.loop ) params.phase = loopPhase( elapsed );
	const morphStateChanged = params.phase !== lastMorphPhase ||
		params.swirl !== lastMorphSwirl ||
		params.scatter !== lastMorphScatter ||
		params.streak !== lastMorphStreak ||
		params.impact !== lastMorphImpact ||
		params.glow !== lastMorphGlow;
	if ( morphStateChanged ) {

		morphSwirl.value = params.swirl;
		morphScatter.value = params.scatter;
		morphStreak.value = params.streak;
		morphImpact.value = params.impact;
		morphGlow.value = params.glow;
		setMorphPhase( params.phase );
		splats?.invalidate();
		lastMorphPhase = params.phase;
		lastMorphSwirl = params.swirl;
		lastMorphScatter = params.scatter;
		lastMorphStreak = params.streak;
		lastMorphImpact = params.impact;
		lastMorphGlow = params.glow;

	}

	controls.update();
	renderer.render( scene, camera );

}

function onResize() {

	if ( ! container || ! renderer || ! camera ) return;
	const width = Math.max( 1, container.clientWidth );
	const height = Math.max( 1, container.clientHeight );
	renderer.setSize( width, height );
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	frameCameraForAspect( camera, controls.target );

}

function disposeStage() {

	if ( ! stage ) return;
	stage.traverse( object => {

		object.geometry?.dispose?.();
		if ( Array.isArray( object.material ) ) object.material.forEach( material => material.dispose() );
		else object.material?.dispose?.();

	} );
	scene?.remove( stage );
	if ( scene ) scene.backgroundNode = null;
	stage = null;

}

export function unmount() {

	mounted = false;
	renderer?.setAnimationLoop( null );
	window.removeEventListener( 'resize', onResize );

	captionElement?.remove();
	captionElement = null;

	if ( splats ) {

		scene?.remove( splats );
		splats.dispose();
		splats = null;

	}

	morphAttribute?.dispose?.();
	morphAttribute = null;
	morphSHAttribute?.dispose?.();
	morphSHAttribute = null;
	splatCount = 0;
	splatSHDegree = 0;
	disposeStage();
	controls?.dispose();
	controls = null;

	gui?.destroy();
	gui = null;

	if ( renderer ) {

		devtools?.dispose();
		devtools = null;
		renderer.dispose();
		renderer.domElement.remove();
		renderer = null;

	}

	if ( container && containerStyle ) Object.assign( container.style, containerStyle );
	containerStyle = null;
	scene = null;
	camera = null;
	timer?.dispose();
	timer = null;
	container = null;
	options = null;
	elapsed = 0;
	morphFrom.value.set( 1, 0, 0 );
	morphTo.value.set( 0, 1, 0 );
	morphProgress.value = 0;
	morphSwirlLeg.value = SWIRL_LEGS[ 0 ];
	morphSwirl.value = 1;
	morphScatter.value = 1;
	morphStreak.value = 1;
	morphImpact.value = 1;
	morphGlow.value = 0.9;
	morphEnergy.value = 0;
	morphLegTint.value.copy( SHAPE_COLORS[ 0 ] ).multiplyScalar( 0.16 );

}

function createHandle() {

	return {
		pause() {

			params.loop = false;

		},
		seek( phase ) {

			params.loop = false;
			params.phase = THREE.MathUtils.euclideanModulo( phase, 3 );

		},
		reset() {

			elapsed = 0;
			params.phase = options?.initialPhase ?? 0;
			params.loop = options?.loop ?? false;

		},
		getDiagnostics() {

			return {
				loop: params.loop,
				phase: params.phase,
				splatCount,
				shDegree: splatSHDegree,
			};

		},
		dispose: unmount,
	};

}
