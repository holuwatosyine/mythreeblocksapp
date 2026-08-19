import type {
	AppPageEvents,
	AppPageRequests,
	AppPageState,
	AppWorkerEvents,
	AppWorkerRequests,
	AppWorkerState,
	WorkerLink,
} from 'three-blocks/app';
import type { WorkerClient, WorkerServerHandlers } from 'three-blocks/worker';

export type {
	AppProtocol,
	AppScene,
	AppPageEvents,
	AppPageRequests,
	AppWorkerEvents,
	AppWorkerRequests,
	PointerState,
	SceneContext,
	ScrollState,
} from 'three-blocks/app';

/** Page-to-worker frame gate used only by the shader live/precompiled verifier. */
export interface StarterShaderParityControl {
	readonly controlled: boolean;
	readonly targetFrame: number;
}

/** Worker-to-page acknowledgement after a deterministic frame has completed. */
export interface StarterShaderParityProgress {
	readonly completedFrame: number;
}

export type StarterWorkerState = AppWorkerState & {
	readonly shaderParity: StarterShaderParityControl;
};

export type StarterPageState = AppPageState & {
	readonly shaderParity: StarterShaderParityProgress;
};

export interface StarterShaderParityBridge {
	readonly handlers: WorkerServerHandlers<AppPageState, AppPageEvents, AppPageRequests>;
	connect( link: WorkerLink ): WorkerClient<StarterWorkerState, AppWorkerEvents, AppWorkerRequests>;
	sync( worker: WorkerClient<StarterWorkerState, AppWorkerEvents, AppWorkerRequests> ): void;
}

/** Connect the public browser verifier's frame target to the render worker. */
export function createStarterShaderParityBridge(): StarterShaderParityBridge {

	const mode = new URLSearchParams( location.search ).get( 'threeBlocksShaderMode' );
	const controlled = mode === 'live' || mode === 'precompiled';
	const root = globalThis as typeof globalThis & {
		__threeBlocksParityUsesAnimationLoop?: boolean;
		__threeBlocksParityFrame?: number;
		__threeBlocksParityCompletedFrame?: number;
		__threeBlocksParityTargetFrame?: number;
	};
	if ( controlled ) {

		root.__threeBlocksParityUsesAnimationLoop = true;
		root.__threeBlocksParityFrame = 0;
		root.__threeBlocksParityCompletedFrame = 0;
		root.__threeBlocksParityTargetFrame = 1;

	}
	const extendedStateHandlers = {
		// This shared key keeps the base handler type structurally visible; WorkerHost
		// still owns and runs its lifecycle handler before this no-op extension.
		lifecycle: () => undefined,
		shaderParity: ( value: StarterShaderParityProgress ) => {

			if ( ! controlled ) return;
			root.__threeBlocksParityFrame = value.completedFrame;
			root.__threeBlocksParityCompletedFrame = value.completedFrame;

		},
	};
	const handlers: WorkerServerHandlers<AppPageState, AppPageEvents, AppPageRequests> = {
		state: extendedStateHandlers,
	};
	let lastTarget: number | undefined;
	return {
		handlers,
		connect: ( link ) => link as WorkerClient<StarterWorkerState, AppWorkerEvents, AppWorkerRequests>,
		sync: ( worker ) => {

			const requested = Number( root.__threeBlocksParityTargetFrame );
			const targetFrame = controlled && Number.isSafeInteger( requested ) && requested >= 0
				? requested
				: controlled ? 1 : 0;
			if ( targetFrame === lastTarget ) return;
			lastTarget = targetFrame;
			worker.state.set( 'shaderParity', { controlled, targetFrame } );

		},
	};

}
