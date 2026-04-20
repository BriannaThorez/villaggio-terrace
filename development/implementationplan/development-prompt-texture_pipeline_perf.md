# Development Prompt — Texture Pipeline & Performance Settings

**Source of Truth Binding**: See `development-implementation-plan-texture_pipeline_perf.md` and `development-tasks-texture_pipeline_perf.md`

---

## User Prompt (Verbatim)

> I think textures that are explicitly prewarmed on game load should be based on:
> - Hardcoded rooms as you've already mentioned but ensure that the preload reference is the same as the actual room reference, in the case that the texture for lobby is changed we wouldn't want to preload the wrong textures.
> - Rooms currently in the simulation — in the case that in the future players have pre-built towers loading. Rather than just chosen hard-coded in the preload.ts
> Is this valid based on what we currently have?
>
> Can we add a section to the dynamic/category B initialization prewarmer to skip any overlapped/already loaded textures dynamically?
>
> How do we complete/fix Progressive Texture Loading?
> I don't like the placeholder swap idea but I do like the:
> - Mid-resolution mipmaps (e.g., 512px → 1K → 4K streaming)
> - A loadingManager with onProgress callbacks for texture streaming
> - Any texture compression (KTX2 / Basis) for faster first-byte delivery
> - Web Workers for off-thread texture decode
>
> We need this to run effectively on a low end machine. Ultimately I'd like to be able to set textures to something like 1k via visual settings in the game menu and have it use 512 or 1k textures even though the files are 4k (regardless of file texture quality).
> In the main dropdown menu add a settings button which opens to an actual center-screen settings dialogue panel. Let it contain multiple categories one of which is performance. Add a four node slider for performance and set it "low" by default which will make textures 512 rather than 4k.

---

## AI Analysis

### Axiomatic Intent (AmI)
The axiomatic foundation is **correctness and data-integrity of the prewarming pipeline**. The user identifies two self-consistency violations: (1) the preloader hardcodes texture strings that may diverge from `MaterialParser.ts`'s actual requests; (2) the preloader ignores any rooms already in the simulation state (relevant for save-state loading).

### Axiological Intent (AlI)
The axiomatic values are **performance, user experience parity across hardware tiers, and forward-looking architecture**. The user explicitly rejects the full-resolution placeholder approach. They want a real streaming multi-resolution LOD system where the GPU is never stalled waiting for huge 4K decodes on load, and where players on low-end machines can enjoy the game at a visually coherent (if not pixel-perfect) fidelity without manually managing settings complexity.

### Teleological Intent (TlI)
The end state is a **tiered texture resolution system** that:
1. Self-referentially derives the preload list from the same data sources the runtime uses (eliminating drift)
2. Streams in progressively from compressed/downsampled → full fidelity
3. Exposes a first-class **Settings Panel** UI from the main menu with a 4-node Performance slider that controls a global texture resolution budget (512px / 1K / 2K / 4K)
4. Is seamless on low-end hardware and imperceptible on high-end hardware

---

## Technical Pre-Analysis

### Q: Is the current hardcoded warming valid?
**Partially.** The current base seed in `preload.ts` strings (`"grey_cartago_tiles"`, `"concrete_wall_1"` etc.) are duplicated from `MaterialParser.ts` function bodies. If someone changes the lobby floor texture in `getLobbyMaterials()` from `grey_cartago_tiles` to `wood_worn_1`, the preloader will still warm the wrong asset. **The fix is to call `getLobbyMaterials()` / `getEmptyFloorMaterials()` etc. inside the preloader itself and extract texture names from the material objects, rather than re-specifying them as strings.**

### Q: Rooms currently in simulation — valid?
**Yes and important.** The current preloader only reads from the static `roomMetadata.json` manifest, not from the live Zustand store. If a save-state is loaded with 40 rooms already placed, none of their specific material instances will be batch-compiled on load — they'll all hit cold path individually. **Adding a `getState().shapes` sweep to extract `metadataId` values and resolve their textures is the correct fix.**

### Q: Deduplication of already-loaded textures?
**Trivially achievable.** `textureLODHandler.memoryCache.has(key)` already provides the check. The preloader's `textureSet` Set already deduplicates keys. We just need to add a conditional `!textureLODHandler.memoryCache.has(key)` gate inside the fetch loop so we skip `getTextureBundle()` calls for assets already in RAM.

### Q: Worker Pool Architecture?
**Verified multi-worker pool.** `client.ts` line 15 uses `Math.max(navigator.hardwareConcurrency || 4, 4)` — minimum 4 workers, scales to the machine's CPU core count. Workers are assigned roles round-robin from `["layout", "layout", "routing", "analysis"]`. On a 4-core machine: 2 layout workers (active — handle CheckPlacement and SyncSpatialHash), 1 routing worker **(idle/stub)**, 1 analysis worker **(idle/stub)**. The routing and analysis roles have registered task types in `workerTasks.ts` but empty implementations. These idle slots are exactly what P-OFFSCREEN targets.

### Q: Progressive loading status?
Real mipmap streaming requires the texture files to exist at multiple resolutions. Since the source files are 4K PNGs, we need a **build-time downsampling step** to generate 512px and 1K variants. At runtime, the loader selects the appropriate file based on the global `textureQuality` setting before any load occurs — no runtime downsampling. KTX2/Basis compression provides ~4–8× file size reduction with GPU-native decode, eliminating most load-time stall.


---

## Feature Integration Analysis

### P-KTX2 — KTX2/Basis Universal Texture Compression

**Architectural Compatibility**: ✅ Excellent fit.
- Three.js ships `KTX2Loader` natively (available since Three.js r129). The existing `getTextureBundle()` pipeline in `materials.ts` is the single injection point — updating it to return `KTX2Loader.load()` promises instead of `THREE.TextureLoader.load()` requires a targeted change to one function.
- The Basis Universal WASM transcoder provides a software decode path for all browsers regardless of GPU hardware, so **no player is excluded**. On hardware that supports compressed formats (all modern GPUs do), the transcoder selects the optimal format: BC7 (DirectX/desktop), ASTC (Apple Silicon/mobile), ETC2 (WebGL 2 baseline). On very old hardware with no compressed format support, it falls back to uncompressed RGBA — zero crashes, just no VRAM savings.
- The build-time conversion step (PNG → KTX2) fits naturally alongside the `generate_texture_variants.mjs` script already planned for Phase 3. Tools: `toktx` CLI or `@gltf-transform/core` with the `textureCompress` extension.

**GPU Compatibility**: ✅ Universal. Basis Universal was explicitly designed for this. The transcoder targets the best available format per device at runtime.

**Integration point**: Extends Phase 3 — the `generate_texture_variants.mjs` script outputs KTX2 alongside the PNG LOD variants. `getTextureBundle()` prefers `.ktx2` when `KTX2Loader` is available; falls back to PNG otherwise.

---

### P-OFFSCREEN — Worker-Side Texture Decode via `createImageBitmap`

**Architectural Compatibility**: ✅ Excellent fit — idle slots are available by design.
- The existing `WorkerPoolCoordinator` (verified: `pool.ts`, `client.ts`) runs `Math.max(navigator.hardwareConcurrency || 4, 4)` workers minimum. The `routing` and `analysis` roles are **currently empty stubs** (`workerTasks.ts` lines 171–176). This means at least 2 of the 4+ workers are idle 100% of the time — a direct allocation target for texture decode tasks.
- `createImageBitmap(blob)` is available in Web Workers (no `OffscreenCanvas` required). The returned `ImageBitmap` is transferable — it can be `postMessage`d back to the main thread with zero copy via the transfer list. The main thread creates a `THREE.CanvasTexture` from it and uploads to GPU. This is the canonical documented pattern for Three.js worker texture loading.
- A new `WorkerRole` of `"asset"` would be added alongside (or replacing) `routing` to handle texture decode tasks. The existing worker protocol's `submit` / task envelope system handles the async coordination automatically.

**GPU Compatibility**: ✅ Universal. `createImageBitmap` is supported in all browsers that support Web Workers (baseline 2022). The GPU upload still happens on the main thread — no GPU API is called from the worker.

**User Impact**: Main thread stays at 60fps during the initialization prewarmer, producing a measurably smoother loading experience on low-end CPUs where PNG decode is the bottleneck.

**Integration point**: New `WorkerRole = "asset"` registered in `pool.ts` types. New `registerAssetTasks()` in `workerTasks.ts`. `getTextureBundle()` uses the pool to decode → returns `ImageBitmap` → main thread wraps in `CanvasTexture`.

---

## Updated Teleological Intent (Post-Feature Analysis)

The end state now includes:
5. **GPU-native compressed textures** delivered via KTX2 — 4–8× smaller files, zero CPU decode stall, full GPU hardware coverage via Basis Universal transcoder
6. **Worker-decoded PNG fallback** — for cases where KTX2 is unsupported or disabled, PNG decode runs in the idle `asset` worker slot, keeping the main thread free at all times
