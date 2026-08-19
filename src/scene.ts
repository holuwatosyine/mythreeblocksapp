import * as THREE from 'three/webgpu';
import { assetManifest } from './assets';
import { BrandStage } from './look';
import type { SceneContext, ScrollState } from './protocol';

export const sceneKey = 'text';
const shaderManifests = import.meta.glob( '../.three-blocks/shaders/text.*.ts' );
export const loadShaderManifest = ( _scene: string, backend: 'webgpu' | 'webgl' ) =>
	shaderManifests[ `../.three-blocks/shaders/text.${backend}.ts` ]?.();

export class Experience extends THREE.Group {

	readonly hot = { spin: new THREE.Euler() };

	private readonly assets: SceneContext[ 'assets' ];
	private readonly stage = new BrandStage();
	private readonly accent: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshStandardMaterial>;
	private readonly shaders: ReturnType<SceneContext[ 'shaders' ][ 'material' ]>[];

	constructor( context: SceneContext ) {

		super();
		this.assets = context.assets;
		const material = new THREE.MeshStandardMaterial( { color: 0xdd4c33, metalness: 0.18, roughness: 0.25 } );
		this.accent = new THREE.Mesh( new THREE.IcosahedronGeometry( 0.5, 2 ), material );
		this.accent.position.set( 2.05, - 0.62, - 0.35 );
		this.accent.castShadow = true;
		this.shaders = [
			context.shaders.material( 'text/accent', material ),
			context.shaders.material( 'text/ground', this.stage.ground.material ),
			// Anchor the shadow light's value addresses to a stable name. Without this, captures
			// fall back to traversal-indexed @sceneObject addresses that shift when the DOM-synced
			// text batches join the scene, so hydration then depends on font/atlas timing.
			context.shaders.container( 'text/key-light', this.stage.keyLight ),
		];
		this.add( this.accent, this.stage );

	}

	update( delta: number, scroll: ScrollState ): void {

		this.hot.spin.x += delta * 0.16;
		this.hot.spin.y += delta * 0.24;
		this.accent.rotation.copy( this.hot.spin );
		this.accent.position.x = 2.05 - scroll.progress * 4.1;
		this.accent.position.y = - 0.62 + Math.sin( scroll.progress * Math.PI ) * 0.7;

	}

	dispose(): void {

		this.shaders.forEach( shader => shader.dispose() );
		this.assets.dispose();
		this.stage.dispose();
		this.accent.geometry.dispose();
		this.accent.material.dispose();

	}

}

export async function createScene( context: SceneContext ): Promise<Experience> {

	await context.assets.load( assetManifest );
	return new Experience( context );

}
