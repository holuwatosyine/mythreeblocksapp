import { defineConfig } from 'vite';
import { threeBlocks } from 'three-blocks/vite';
import { textConfig } from './three-blocks.text';

export default defineConfig( ( { mode } ) => ( {
	plugins: [ threeBlocks( {
		shaders: { strict: mode === 'strict' || mode === 'demo' },
		text: { configuration: textConfig },
		// `vite build --mode demo` produces a shareable showcase build: shaders
		// stay strict and the devtools overlay + stats meter ship with the page.
		...( mode === 'demo' ? { stats: { production: true }, overlay: { production: true } } : {} ),
	} ) ],
	server: { port: 4000 },
} ) );
