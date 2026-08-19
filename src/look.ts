import * as THREE from 'three/webgpu';

export const brand = {
	gold: 0xf4ae0c,
	red: 0xdd4c33,
	blue: 0x1e54c8,
} as const;

type BrandLook = Readonly<{ color: number; metalness: number; roughness: number }>;
export function createBrandTrio( sizes: readonly [ number, number, number ], look: BrandLook ) {
	const geometries = [ new THREE.TetrahedronGeometry( sizes[ 0 ] ), new THREE.SphereGeometry( sizes[ 1 ], 48, 32 ),
		new THREE.BoxGeometry( sizes[ 2 ], sizes[ 2 ], sizes[ 2 ] ) ];
	const { metalness, roughness } = look;
	return geometries.map( ( geometry, index ) => {
		const color = [ look.color, brand.red, brand.blue ][ index ] ?? look.color;
		const material = new THREE.MeshStandardMaterial( { color, metalness, roughness } );
		const mesh = new THREE.Mesh( geometry, material );
		mesh.castShadow = true;
		return mesh;
	} );
}

/** Shared three-light stage and soft shadow receiver; no runtime environment payload. */
export class BrandStage extends THREE.Group {

	readonly ground: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
	/** Shadow-casting key light; scenes register it as a shader container for stable addressing. */
	readonly keyLight: THREE.DirectionalLight;

	constructor() {
		super();
		this.ground = new THREE.Mesh(
			new THREE.PlaneGeometry( 200, 200 ),
			new THREE.MeshStandardMaterial( { color: 0x080b12, metalness: 0.02, roughness: 0.9 } )
		);
		this.ground.position.y = - 1.25;
		this.ground.rotation.x = - Math.PI / 2;
		this.ground.receiveShadow = true;
		const key = new THREE.DirectionalLight( 0xfff5df, 4.8 );
		key.position.set( 3.5, 5.5, 4 );
		key.castShadow = true;
		key.shadow.mapSize.set( 1_024, 1_024 );
		Object.assign( key.shadow.camera, { near: 0.1, far: 20, left: - 5, right: 5, top: 5, bottom: - 5 } );
		const fill = new THREE.DirectionalLight( 0x5684e6, 2.1 );
		fill.position.set( - 4, 1.5, 2 );
		const rim = new THREE.DirectionalLight( 0xdd4c33, 1.5 );
		rim.position.set( 2, 2, - 4 );
		this.keyLight = key;
		this.add( this.ground, key, fill, rim, new THREE.AmbientLight( 0xffffff, 0.35 ) );
	}

	dispose(): void {
		this.ground.geometry.dispose();
		this.ground.material.dispose();
	}

}
