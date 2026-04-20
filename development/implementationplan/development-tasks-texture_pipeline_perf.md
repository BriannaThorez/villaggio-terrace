# Development Tasks — Texture Pipeline & Performance Settings

> **SOURCE OF TRUTH** — Paired with `development-implementation-plan-texture_pipeline_perf.md`
> Update this file as each task is started `[/]` and completed `[x]`.

---

## Phase 1 — Preload Self-Consistency & Deduplication

### 1.1 — Hardcoded Texture Extraction from Material Functions
- [ ] Audit `getLobbyMaterials()`, `getEmptyFloorMaterials()`, `getStructuralConcreteMaterials()` — list all textures they consume
- [ ] Refactor `preload.ts`: remove hardcoded base seed strings (lines ~34–39)
- [ ] After building `materialQueue`, extract texture names via `(mat as THREE.MeshPhysicalMaterial).map?.name`
- [ ] Add extracted names to `textureSet` (same dedup Set)
- [ ] Update log output: `[Program-Initialization Prewarmer] Derived X hardcoded textures from material functions`
- [ ] Verify: `tsc --noEmit` — zero new errors

### 1.2 — Simulation State Sweep
- [ ] Add `resolveTexturesForShape(shape, roomMetadata)` helper to `preload.ts` implementing three-level fallback
- [ ] Sweep `useSimulationStore.getState().shapes` after manifest sweep
- [ ] Filter shapes with `metadataId`, resolve textures, add to `textureSet`
- [ ] Add log: `[Program-Initialization Prewarmer] Simulation state sweep: Found X placed rooms, Y additional unique textures`
- [ ] Verify: `tsc --noEmit` — zero new errors

### 1.3 — Deduplication Gate
- [ ] Replace `Promise.all(TEXTURE_KEYS.map(key => getTextureBundle(key)))` with cache-checking filtered map
- [ ] Add log on skip: `[Program-Initialization Prewarmer] Cache hit (skip fetch): "X"`
- [ ] Verify skips occur on hot-reload

### 1.4 — Phase 1 QA Checkpoint
- [ ] Run `tsc --noEmit` — zero new errors
- [ ] Verify all three prewarmer log types appear correctly in DevTools console
- [ ] Verify lobby floor texture (`grey_cartago_tiles`) is still correctly derived (not hardcoded string)
- [ ] **⏸️ PAUSE — Await user approval before Phase 2**

---

## Phase 2 — Settings Store & Settings Panel UI

### 2.1 — `settingsStore.ts`
- [ ] Create `src/features/settings/store/settingsStore.ts`
- [ ] Define `TextureQuality = 'low' | 'medium' | 'high' | 'ultra'`
- [ ] Implement Zustand store with `textureQuality` defaulting to `'low'`
- [ ] Add `localStorage` persistence (`villaggio_settings`)
- [ ] Restore from `localStorage` on init
- [ ] Verify: `tsc --noEmit`

### 2.2 — `SettingsPanel.tsx`
- [ ] Create `src/features/settings/ui/SettingsPanel.tsx`
- [ ] Implement backdrop overlay (click-to-close)
- [ ] Implement centered glass panel matching existing toolbar aesthetic
- [ ] Implement tabbed category header: **Performance** | **Display** | **Audio**
- [ ] Display and Audio tabs show "Coming Soon" placeholder
- [ ] Performance tab: "Texture Quality" section with descriptor text
- [ ] Implement 4-node custom slider: `Low (512)`, `Medium (1K)`, `High (2K)`, `Ultra (4K)`
- [ ] Wire slider to `settingsStore.setTextureQuality()`
- [ ] Live indicator badge showing current selection
- [ ] "No restart required" badge
- [ ] Verify: `tsc --noEmit`

### 2.3 — Wire Settings into `MainToolbar.tsx`
- [ ] Add `showSettingsPanel` `useState` to `MainToolbar`
- [ ] Add `Settings` menu item to `showMainMenu` dropdown with separator
- [ ] Import and render `<SettingsPanel isOpen={showSettingsPanel} onClose={() => setShowSettingsPanel(false)} />`
- [ ] Verify: clicking Settings opens panel, clicking backdrop closes it

### 2.4 — Phase 2 QA Checkpoint
- [ ] `tsc --noEmit` — zero new errors
- [ ] Manual: Settings panel opens/closes correctly
- [ ] Manual: Slider snaps to all 4 nodes
- [ ] Manual: `textureQuality` value updates in Zustand devtools
- [ ] Manual: persists to localStorage on refresh
- [ ] Manual: Correct panel display at 1920×1080 and 1366×768
- [ ] **⏸️ PAUSE — Await user approval before Phase 3**

---

## Phase 3 — Multi-Resolution LOD & Runtime Quality Selection

### 3.1 — Build-Time Downsampling Script
- [ ] `npm install --save-dev sharp`
- [ ] Create `scripts/generate_texture_variants.mjs`
- [ ] Iterate `src/assets/textures/**/*_diff_4k.png` (and arm, nor, disp)
- [ ] Generate `_512`, `_1k`, `_2k` variants with content-hash caching (skip if unchanged)
- [ ] Add `prebuild` and `predev` hooks to `package.json`
- [ ] Run script — verify variant files generated correctly
- [ ] Confirm file sizes (512px variant should be ~40× smaller than 4K)

### 3.2 — Update `ASSET_REGISTRY` for Variants
- [ ] Extend `AssetPaths` interface in `materials.ts`: add `diff_512?`, `diff_1k?`, `diff_2k?`
- [ ] Update `buildRegistryFromGlob`: detect `_512`, `_1k`, `_2k` filename markers
- [ ] `diff` (4K) remains backward-compatible — no rename
- [ ] Verify: `tsc --noEmit`

### 3.3 — Quality-Aware `getTextureBundle`
- [ ] Add optional `quality?: TextureQuality` param to `getTextureBundle()`
- [ ] Internally select correct `diff_*` path based on quality
- [ ] Default: reads from `settingsStore.getState().textureQuality`
- [ ] arm/nor/disp always load at native resolution
- [ ] Verify: `tsc --noEmit`

### 3.4 — Quality-Keyed `TextureLODHandler` Cache
- [ ] Cache keys from `assetName` → `${assetName}:${quality}`
- [ ] `getBundleProgressiveSync()` reads `settingsStore` for quality
- [ ] `injectBundle()` accepts quality param and writes to quality-keyed slot
- [ ] Add `clearCache(quality?)` method — clears specific quality entries or all if no param
- [ ] Verify: `tsc --noEmit`

### 3.5 — Quality Change Hot-Reload
- [ ] In `settingsStore.setTextureQuality()`: call `textureLODHandler.clearCache(oldQuality)`
- [ ] Store renderer ref in module-level variable during `preloadAllAssets()` init
- [ ] After cache clear: trigger background `preloadAllAssets(storedRenderer)` with new quality
- [ ] Verify rooms update visually after quality change without page refresh
- [ ] Verify: `tsc --noEmit`

### 3.6 — Phase 3 QA Checkpoint
- [ ] Run build script — all variant files present at correct resolutions (512, 1K, 2K, 4K)
- [ ] `tsc --noEmit` — zero new errors
- [ ] Manual: Switch Low → Ultra in Settings — rooms visually upgrade
- [ ] Manual: Switch Ultra → Low — rooms visually downgrade
- [ ] Manual: Throttled GPU test (Chrome DevTools rendering) — Low loads measurably faster
- [ ] Audit console for any `WARN` or `ERR` on quality switch
- [ ] Update `texture-pipeline.md` and `texture_pipeline_audit.md` with Phase 3 architecture
- [ ] **⏸️ PAUSE — Await user approval before Phase 4**

---

## Phase 4 — GPU-Native Compression (KTX2) & Worker-Side Decode

### 4.1 — KTX2 Build Output
- [ ] `npm install --save-dev @gltf-transform/core @gltf-transform/extensions` (or verify `toktx` CLI in PATH)
- [ ] Extend `generate_texture_variants.mjs`: after PNG variants, produce `.ktx2` files per texture per resolution tier
- [ ] KTX2 output targets: `*_diff_512.ktx2`, `*_diff_1k.ktx2`, `*_diff_2k.ktx2`, `*_diff_4k.ktx2`
- [ ] Add content-hash caching for KTX2 outputs (skip if unchanged)
- [ ] Run script — verify `.ktx2` files generated for each texture
- [ ] Verify file sizes are meaningfully smaller than PNG equivalents

### 4.2 — `ASSET_REGISTRY` KTX2 Path Detection
- [ ] Extend `AssetPaths` interface in `materials.ts`: add `diff_512_ktx2?`, `diff_1k_ktx2?`, `diff_2k_ktx2?`, `diff_4k_ktx2?`
- [ ] Update `buildRegistryFromGlob` to detect `.ktx2` suffixes alongside PNG detection
- [ ] Verify: `tsc --noEmit`

### 4.3 — KTX2-Preferred `getTextureBundle`
- [ ] Init `KTX2Loader` once at module level in `materials.ts`
- [ ] Set WASM decoder path: `three/examples/jsm/libs/basis/` (bundled with Three.js)
- [ ] In `getTextureBundle()`: prefer `.ktx2` path for requested quality tier; fall back to PNG
- [ ] Add log: `[TextureLoader] KTX2 loaded: "<name>:<quality>"` or `[TextureLoader] PNG fallback: "<name>:<quality>"`
- [ ] Verify: `tsc --noEmit`

### 4.4 — `"asset"` Worker Role for PNG Decode (P-OFFSCREEN)
- [ ] Add `"asset"` to `WorkerRole` union type in `pool.ts` (line 18–23)
- [ ] Update `client.ts` roles array: `["layout", "layout", "asset", "analysis"]`
- [ ] Add `registerAssetTasks()` to `workerTasks.ts`
- [ ] Implement `"asset/decode-image"` task: `fetch(url)` → `blob()` → `createImageBitmap(blob)` → return transferable `ImageBitmap`
- [ ] Update `WorkerTaskPayloadMap` and `WorkerTaskResultMap` for `"asset/decode-image"`
- [ ] In `materials.ts` PNG fallback path of `getTextureBundle()`: submit `"asset/decode-image"` task to pool; receive `ImageBitmap`; wrap as `THREE.CanvasTexture`
- [ ] Call `registerAssetTasks()` at bottom of `workerTasks.ts` alongside existing registrations
- [ ] Verify: `tsc --noEmit`

### 4.5 — Phase 4 QA Checkpoint
- [ ] `tsc --noEmit` — zero new errors
- [ ] DevTools → Network: `.ktx2` files loading where available, `.png` for fallback
- [ ] DevTools → Performance: no large main-thread CPU spike during texture load phase
- [ ] DevTools → Memory: VRAM reading lower with KTX2 active vs PNG
- [ ] Test graceful RGBA fallback: run with `--disable-gpu-rasterization` Chrome flag
- [ ] Verify `workerPool.snapshot()` shows `asset` worker with `busyCount > 0` during load
- [ ] Update `texture-pipeline.md` §5 invariants with Phase 4 architecture notes
- [ ] **⏸️ PAUSE — Await user final sign-off**

---

## Artifact Augmentation Section

*This section must appear verbatim in every phase. It binds this file to the Antigravity artifact system.*

Upon completion of each phase, the executing agent must:
1. Mark completed tasks `[x]` in this file
2. Update the Antigravity `task.md` artifact in parity
3. Update `development-implementation-plan-texture_pipeline_perf.md` with any plan deviations
4. Create or update `walkthrough_texture_pipeline_perf.md` with implementation summary
5. At each `⏸️ PAUSE` checkpoint: halt, summarize outcome to user, await explicit approval before next phase
