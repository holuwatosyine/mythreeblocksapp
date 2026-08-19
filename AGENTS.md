# AGENTS.md — Three Blocks project

This is a WebGPU Three.js app rendered in an OffscreenCanvas worker, with shaders precompiled for the first frame. Keep that boundary intact.

## Commands

- `npm run dev` — Vite plus ambient worker/shader/text status.
- `npm run lint` — correctness and Three.js house style.
- `npm run typecheck` — strict TypeScript.
- `npm run build` — normal production build with live shader fallback.
- `npm run build:strict` — release gate requiring fresh shader receipts.
- `npm run browser:smoke` — browser proof for worker readiness, first frame, and stats control.
- `npm run status` — first recovery command for anything not ready.
- `npm run shaders:capture` — refresh shader receipts after shader work settles; also optimizes `public/` GLB and HDR assets to meshopt + KTX2.
- `npm run assets:status` — re-verify the optimized-asset receipt.

## Assets

- Drop models and environments under `public/` in any source format; `shaders:capture` compresses GLB and `.hdr` files to meshopt + KTX2 (BC6H-ready HDR) automatically and records exact download and VRAM numbers in `.three-blocks/assets/meta.json`.
- Prefer the optimized `.ktx2`/`.tb.glb` outputs in code; never hand-edit them — re-run capture when sources change.

## Ownership

- Edit `src/scene.ts` first for Three.js objects, materials, assets, and animation.
- `src/render.worker.ts` owns the renderer, scene, camera, GPU work, and frame loop.
- `src/main.ts` owns DOM input, Lenis, accessibility, and the worker host.
- Never import Three.js, renderer code, or GPU resources into main-thread modules.
- Values crossing the worker boundary must be structured-cloneable plain data.

## Scene contract

- Keep the exported `sceneKey`, `loadShaderManifest`, and `createScene` names; shader receipt discovery depends on them.
- Keep shader-producing objects registered through literal `context.shaders.material(...)` or `.container(...)` calls.
- `Experience` is a Three.js `Group`; add it directly to the scene and dispose owned GPU resources.
- Put continuous HMR state in the declared `readonly hot = { ... }` object. Matching fields transfer automatically.
- New code defines the hot-state shape; renamed, removed, or re-typed fields keep their new defaults.
- The optional library `captureHotState` / `restoreHotState` methods are only for asynchronous or non-declarative restoration.

## Shader editing

Edit TSL normally during `dev`. A changed scene hot-swaps transactionally, compiles before commit, and falls back to live TSL when receipts are stale. The overlay/terminal will say `shaders live`; this is expected while iterating. Run `npm run shaders:capture` when the shader is settled, then `npm run build:strict` before release. If state is unclear, run `npm run status`.

## Text template

The DOM remains the semantic and layout source of truth. Keep `data-canvas-text` copy in `index.html`, declare fonts in `three-blocks.text.ts`, and run `npm run text:generate` after changing glyph coverage.

## Capture policy

Never run `npm run shaders:capture`, shader parity, or a shader watcher as routine edit/test validation. Stale receipts are expected while iterating. Capture only when the user explicitly asks, from the development overlay, or once before an explicitly requested final `npm run build:strict` release check. Run browser tests, visual checks, and screenshots headlessly; never pass `--headed`.
