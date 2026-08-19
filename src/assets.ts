import { defineAssets } from 'three-blocks/assets';

// Add GLTF, KTX2, HDR, image, JSON, binary, cube, audio, or font resources here.
// The environment is a GPU-compressed UASTC HDR equirect (BC6H on capable
// GPUs, RGBA16F elsewhere); `shaders:capture` regenerates it from any `.hdr`
// dropped under public/.
export const assetManifest = defineAssets( {
	environment: {
		type: 'ktx2',
		// BASE_URL-relative so deployments under a sub-path (like the website
		// demos) resolve the same file the dev server serves at /hdr/.
		url: `${import.meta.env.BASE_URL}hdr/ninomaru_teien_2k.ktx2`,
		bytes: 2_582_186,
		persistent: true,
	},
} );
