import * as THREE from 'three/webgpu';
import { pass, uv } from 'three/tsl';
import type { PointerState, SceneContext } from 'three-blocks/app';
import { smokeRTT } from 'three-blocks/smoke';
import { defineText } from 'three-blocks/text';

export function createTextEffect(
	renderer: THREE.WebGPURenderer,
	scene: THREE.Scene,
	camera: THREE.PerspectiveCamera,
	shaders: SceneContext[ 'shaders' ]
) {

	const pointer = new THREE.Vector2();
	const fluid = smokeRTT( pointer, 64, 256, 2 ).setPointerScale( 8 );
	const scenePass = pass( scene, camera );
	const pipeline = new THREE.RenderPipeline( renderer );
	pipeline.outputNode = scenePass.getTextureNode().sample(
		uv().sub( fluid.getTextureNode().xy.mul( 0.00003 ) )
	);
	const registrations = [
		shaders.container( 'text/fluid', { fluid, scenePass } ),
		shaders.pipeline( 'text/fluid-output', pipeline ),
	];

	return {
		pointer: ( value: PointerState ) => pointer.set( value.x, value.y ),
		render: () => pipeline.render(),
		dispose: () => {

			registrations.forEach( registration => registration.dispose() );
			pipeline.dispose();
			scenePass.dispose();
			fluid.dispose();

		},
	};

}

export const textConfig = defineText( {
	content: [ 'index.html' ],
	fonts: {
		geist: {
			source: { builtin: 'geist-sans' },
			browser: '/fonts/geist.woff2',
			atlas: '/fonts/geist.msdf.ktx2',
			metrics: '/fonts/geist.msdf.json',
			// Bold headlines get a real 700 instance (exact strokes and advances) instead of
			// synthetic bolding. Other weights snap to the nearest baked atlas plus a small bias.
			weights: {
				700: {
					atlas: '/fonts/geist.w700.msdf.ktx2',
					metrics: '/fonts/geist.w700.msdf.json',
				},
			},
			families: [ 'Geist Sans' ],
			languages: [ 'en' ],
			default: true,
		},
		noto: {
			source: { builtin: 'noto-sans-jp' },
			browser: '/fonts/noto-jp.woff2',
			atlas: '/fonts/noto-jp.msdf.ktx2',
			metrics: '/fonts/noto-jp.msdf.json',
			families: [ 'Noto Sans JP' ],
			languages: [ 'ja' ],
		},
	},
	generation: {
		presets: [ 'latin', 'japanese-kana' ],
		size: 48,
		distanceRange: 8,
		padding: 2,
		maxTextureSize: 4096,
	},
} );
