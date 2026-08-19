/// <reference types="vite/client" />

declare module 'vite/types/customEvent' {

	interface CustomEventMap {
		readonly 'three-blocks:worker-restart': { readonly path: string };
	}

}

export {};
