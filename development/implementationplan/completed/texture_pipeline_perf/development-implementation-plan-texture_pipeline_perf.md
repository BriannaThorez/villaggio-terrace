# Development Implementation Plan — Texture Pipeline & Performance Settings

> **SOURCE OF TRUTH** for goals defined in `development-prompt-texture_pipeline_perf.md`
> **Tasks File**: `development-tasks-texture_pipeline_perf.md` (circularly references this document)
> **Updated**: 2026-04-20

---

## Overview

Three coordinated improvements to the texture loading architecture:

1. **Preloading Self-Consistency** — Derive the warm set directly from the same functions the runtime uses (eliminating string-drift), and extend it to include rooms already in the simulation state.
2. **Deduplication Gate** — Skip texture fetches for assets already in `textureLODHandler.memoryCache`.
3. **Progressive LOD + Performance Settings** — Multi-resolution texture variants (512/1K/2K/4K), a global `textureQuality` store, and a full Settings Panel UI from the main menu.
4. **GPU-Native Compression + Worker Decode** — KTX2/Basis Universal for GPU-compressed textures (4–8× smaller, all GPU tiers covered), plus `createImageBitmap` decode offloaded to the existing idle `asset` worker slot — zero main-thread decode stall.

---

## User Review Required

> [!IMPORTANT]
> **Phase 3 requires a build-time downsampling pass.** This adds a build step (Node script via `vite-plugin-run` or a custom Vite plugin using `sharp`) that generates `*_diff_512.png`, `*_diff_1k.png` etc. from your existing 4K source files. The first build after this is added will be slower. Subsequent incremental builds will be fast (files are cached). Confirm this is acceptable before Phase 3 executes.

> [!IMPORTANT]
> **Default texture quality is "Low" (512px).** This means players on first load will see 512px textures. The game will look visually coherent but not pixel-sharp. This is intentional per the request. Confirm the specific 4 labels: `Low (512)`, `Medium (1K)`, `High (2K)`, `Ultra (4K)`.

> [!NOTE]
> **KTX2 is confirmed compatible.** Three.js ships `KTX2Loader` natively (since r129). The Basis Universal WASM transcoder is bundled — it selects BC7 (desktop), ASTC (mobile), ETC2 (WebGL 2 baseline), or RGBA fallback at runtime. All GPUs are covered. Phase 4 implements KTX2 as part of the build script already planned for Phase 3.

> [!NOTE]
> **P-OFFSCREEN is confirmed feasible.** The existing Worker Pool has verified idle `routing` and `analysis` slots (`workerTasks.ts` lines 171–176 — empty stubs). A new `"asset"` role will be added to absorb texture decode — no architecture changes needed to the pool itself.

---

## Phase 1 — Preload Self-Consistency & Deduplication
*Scope: `preload.ts`, `MaterialParser.ts`. No UI changes. Targeted edits only.*

### Phase 1.1 — Extract Hardcoded Textures from Material Functions (Not Strings)

**Problem**: `preload.ts` hardcodes `"grey_cartago_tiles"`, `"concrete_wall_1"` etc. as strings. If `getLobbyMaterials()` changes its textures, the preloader warms the wrong assets.

**Fix**: In `preload.ts`, after creating the material queues, extract texture names from the material objects themselves by reading their `map.name` (Three.js texture `.name` field is set at load time in `loadTextureArgs`). This guarantees the preloader warms exactly what the runtime requests — not a string copy of it.

**Targeted changes**:
#### [MODIFY] [preload.ts](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/assetPreloader/api/preload.ts)
- Remove the hardcoded base seed literal strings (lines ~34–39)
- After building `materialQueue` (which already calls `getLobbyMaterials()`, `getStructuralConcreteMaterials()`), iterate `materialQueue` and extract `(mat as THREE.MeshPhysicalMaterial).map?.name`, parsing the texture folder name from the `name` attribute
- Add extracted names to `textureSet` — same dedup Set mechanism already in place
- This creates a single source of truth: the warm set IS derived from the material function outputs

**Coding standard**: Preserve all existing comments. No full-file rewrite — only the seed block and a post-queue extraction step.

### Phase 1.2 — Simulation State Sweep (Save-State Warmup)

**Problem**: Preloader ignores rooms already placed in the Zustand store. Relevant for pre-built tower save-states.

**Fix**: In `preload.ts`, after the manifest sweep, add a second sweep over `useSimulationStore.getState().shapes`:
- Filter to shapes with a `metadataId` field
- For each `metadataId`, resolve textures via the same three-level fallback chain used in `ResidentialRoom.tsx`
- Add resolved texture names to `textureSet`

**Targeted changes**:
#### [MODIFY] [preload.ts](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/assetPreloader/api/preload.ts)
- Add import for `useSimulationStore` (already available)
- Add import for `roomMetadata` (already imported)
- Add a `resolveTexturesForShape(shape, roomMetadata)` helper that implements the three-level fallback
- Call after manifest sweep, before `getTextureBundle()` calls

**Log**: `[Program-Initialization Prewarmer] Simulation state sweep: Found X placed rooms, Y additional unique textures`

### Phase 1.3 — Deduplication Gate

**Problem**: `getTextureBundle()` is called for all keys in `textureSet` even if some are already in `memoryCache` from a prior run or hot-reload.

**Fix**: Before each `getTextureBundle()` call, check `textureLODHandler.memoryCache.has(key)`. If true, skip the fetch and use the cached bundle directly.

**Targeted changes**:
#### [MODIFY] [preload.ts](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/assetPreloader/api/preload.ts)
- Replace `Promise.all(TEXTURE_KEYS.map(key => getTextureBundle(key)))` with a filtered map that checks the cache first
- Log: `[Program-Initialization Prewarmer] Cache hit (skip fetch): "X"`

### Phase 1.4 — Verification & QA

- Run `tsc --noEmit` — confirm zero new errors
- Load the app and verify console output:
  - `[Program-Initialization Prewarmer]` logs show correct texture names sourced from materials
  - `Simulation state sweep` log shows correct count
  - `Cache hit (skip fetch)` logs appear on hot-reload
- **⏸️ PAUSE FOR USER REVIEW before Phase 2**

---

## Phase 2 — Performance Settings Store & Settings Panel UI
*Scope: New `settingsStore.ts`, new `SettingsPanel.tsx`, `MainToolbar.tsx` (additive change only). Targeted edits.*

### Phase 2.1 — `settingsStore.ts` (New File)

Create a Zustand store for global game settings. This is the authoritative source of truth for `textureQuality` and future settings.

#### [NEW] [settingsStore.ts](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/settings/store/settingsStore.ts)

```typescript
// Persisted via localStorage key "villaggio_settings"
type TextureQuality = 'low' | 'medium' | 'high' | 'ultra';
// Corresponding pixel sizes: 512 | 1024 | 2048 | 4096

interface SettingsState {
  textureQuality: TextureQuality;
  setTextureQuality: (q: TextureQuality) => void;
  // Future: shadowQuality, drawDistance, antiAliasing, etc.
}
```

- Default `textureQuality: 'low'`
- Persisted to `localStorage` on every set
- Restored from `localStorage` on init

### Phase 2.2 — `SettingsPanel.tsx` (New File)

A full center-screen modal dialog. **Not** a dropdown — a proper dialog with backdrop blur.

#### [NEW] [SettingsPanel.tsx](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/settings/ui/SettingsPanel.tsx)

**Structure**:
- Backdrop overlay with `pointer-events: all` + click-to-close
- Centered panel with `backdrop-blur-2xl` glass treatment, matching existing toolbar aesthetic
- Header: "Settings" with X close button
- Tabbed categories (horizontal pill tabs): **Performance** | **Display** | **Audio** *(Display and Audio are stubs for now — visible but show "Coming Soon")*
- **Performance tab content**:
  - Section heading: "Texture Quality"
  - Descriptive subtext: "Controls the maximum resolution of building textures. Lower settings significantly improve performance on slower hardware."
  - 4-node slider (custom component, not HTML range) with labeled nodes:
    - `Low — 512px` (default, selected)
    - `Medium — 1024px`
    - `High — 2048px`
    - `Ultra — 4096px`
  - Live indicator showing current value
  - Restart-not-required badge (textures reload immediately on change)

**Design**: Match the existing `bg-background/90 backdrop-blur-2xl border border-primary/10` glass aesthetic. Premium slider with glowing active node and smooth snap animation. No TailwindCSS arbitrary values where avoidable.

### Phase 2.3 — Wire Settings Button into `MainToolbar.tsx`

**Additive change only** — do not rewrite `MainToolbar.tsx`.

#### [MODIFY] [MainToolbar.tsx](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/ui/toolbars/MainToolbar.tsx)
- Add `Settings` button item to the `showMainMenu` dropdown (lines ~180–256), after the existing HUD items
- Add a `---` separator before it
- Clicking "Settings" sets `showSettingsPanel: true` (local state) and closes the dropdown
- Render `<SettingsPanel />` at root of `MainToolbar` component with `isOpen` prop

### Phase 2.4 — Verification & QA

- `tsc --noEmit` — zero new errors
- Open Settings panel, verify:
  - Backdrop closes panel on click
  - 4-node slider snaps to each position
  - `settingsStore.textureQuality` updates correctly
  - `localStorage` value persists on refresh
  - Panel is centered and styled correctly on 1920×1080 and 1366×768
- **⏸️ PAUSE FOR USER REVIEW before Phase 3**

---

### Phase 3: Multi-Resolution LOD & Runtime Selection [COMPLETED 2026-04-22]
*Scope: Build pipeline script, `materials.ts`, `TextureLODHandler.ts`, `getTextureBundle`, `settingsStore` integration. Careful targeted edits.*

### Phase 3.1 — Build-Time Downsampling Script

#### [NEW] [scripts/generate_texture_variants.mjs](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/scripts/generate_texture_variants.mjs)

Uses `sharp` (Node image library) to generate downsampled variants from each 4K source PNG:
- Input: `src/assets/textures/<name>/*_diff_4k.png` (and arm, nor, disp)
- Output variants per map: `*_diff_512.png`, `*_diff_1k.png`, `*_diff_2k.png`
- Skip if output already exists and source is unchanged (content-hash cache)
- Run as: `node scripts/generate_texture_variants.mjs`

Add this as a `prebuild` and `predev` npm script hook so it runs automatically. Variants are committed to the repo (or gitignored and regenerated on CI — user's choice).

**Install**: `npm install --save-dev sharp`

### Phase 3.2 — Update `ASSET_REGISTRY` to Track All Resolution Variants

#### [MODIFY] [materials.ts](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/materialsEngine/presets/materials.ts)
- Update `buildRegistryFromGlob` to also detect `_512`, `_1k`, `_2k` filename suffixes
- Update `AssetPaths` interface to include optional: `diff_512?`, `diff_1k?`, `diff_2k?`, `arm_512?` etc.
- The `4k` path remains the existing `diff` field (backward-compatible)

### Phase 3.3 — Quality-Aware `getTextureBundle`

#### [MODIFY] [materials.ts](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/materialsEngine/presets/materials.ts)
- `getTextureBundle(assetName, quality?: TextureQuality)` — add optional quality param
- Internally selects `paths.diff_512 || paths.diff` based on quality
- Default: reads from `settingsStore.getState().textureQuality` if no param provided
- Albedo/diff is downsampled; arm/nor/disp always load at native (they are small and affect PBR quality significantly)

### Phase 3.4 — `TextureLODHandler` Quality-Keyed Cache

#### [MODIFY] [TextureLODHandler.ts](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/materialsEngine/TextureLODHandler.ts)
- Cache keys become `${assetName}:${quality}` (e.g. `"beige_wall_1:low"`)
- `getBundleProgressiveSync(assetName)` reads `settingsStore` to determine quality level
- `injectBundle(assetName, bundle, quality)` writes to the quality-keyed slot
- On `setTextureQuality()` change: clear the cache and re-trigger a background warm pass (so rooms already visible update without requiring a reload)

### Phase 3.5 — Quality Change Hot-Reload

#### [MODIFY] [settingsStore.ts](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/settings/store/settingsStore.ts)
- On `setTextureQuality()`: after persisting, call `textureLODHandler.clearCache()` + `triggerQualityReload()` (fires a re-warm of all currently-visible textures)
- `textureLODHandler.clearCache()` — new method: clears `memoryCache` entries for the old quality level only, leaving other quality entries intact
- After clear: `preloadAllAssets(renderer)` is called again in the background — renderer reference stored in a module-level ref set during init

### Phase 3.6 — Verification & QA (Phase 3)

- Run the build script — verify variant files are generated at all 4 resolutions
- Run `tsc --noEmit` — zero new errors
- In-game: switch texture quality Low → Ultra — verify rooms upgrade visually
- Verify cache entries are keyed by quality and old entries are cleared on switch
- Test on a throttled GPU via Chrome DevTools — verify 512px loads significantly faster
- **⏸️ PAUSE FOR USER REVIEW before Phase 4**

---

## Phase 4 — GPU-Native Compression (KTX2) & Worker-Side Decode
*Scope: `generate_texture_variants.mjs`, `materials.ts`, `pool.ts` (types), `workerTasks.ts`, `worker.ts` (role config), `TextureLODHandler.ts`. All targeted edits — no rewrites.*

### Phase 4.1 — KTX2 Build Output in Generate Script

#### [MODIFY] [scripts/generate_texture_variants.mjs](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/scripts/generate_texture_variants.mjs)
- After generating PNG LOD variants, also produce a `.ktx2` file per texture per resolution tier using the `@gltf-transform/core` with `textureCompress()` or the `toktx` CLI tool
- KTX2 output: `*_diff_512.ktx2`, `*_diff_1k.ktx2`, `*_diff_2k.ktx2`, `*_diff_4k.ktx2`
- Content-hash cache — skip if source unchanged
- **Install**: `npm install --save-dev @gltf-transform/core @gltf-transform/extensions` (or `toktx` CLI via PATH)

**GPU format selection** (handled by Basis Universal WASM transcoder at runtime):
- BC7 — desktop DirectX (Windows/Linux)
- ASTC — Apple Silicon, mobile GPUs
- ETC2 — WebGL 2 baseline (all modern browsers)
- RGBA — software fallback (zero crashes on any hardware)

### Phase 4.2 — `ASSET_REGISTRY` KTX2 Path Detection

#### [MODIFY] [materials.ts](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/materialsEngine/presets/materials.ts)
- Extend `AssetPaths` interface with optional `diff_512_ktx2?`, `diff_1k_ktx2?`, `diff_2k_ktx2?`, `diff_4k_ktx2?`
- `buildRegistryFromGlob` detects `.ktx2` suffixes alongside existing PNG detection
- Backward-compatible: falls back to PNG if KTX2 not found

### Phase 4.3 — KTX2-Preferred `getTextureBundle`

#### [MODIFY] [materials.ts](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/materialsEngine/presets/materials.ts)
- Init `KTX2Loader` once at module level, referencing the Basis Universal WASM decoder path (bundled with Three.js: `three/examples/jsm/libs/basis/`)
- In `getTextureBundle(assetName, quality)`: prefer the KTX2 path for the requested quality tier — fall back to PNG if KTX2 absent
- Log: `[TextureLoader] KTX2 loaded: "<name>:<quality>"` vs `[TextureLoader] PNG fallback: "<name>:<quality>"`

### Phase 4.4 — `"asset"` Worker Role for PNG Decode (P-OFFSCREEN)

For PNG fallback path (when KTX2 is unavailable), offload `createImageBitmap` to the worker pool instead of decoding on the main thread.

#### [MODIFY] [pool.ts](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/worker/pool.ts)
- Add `"asset"` to `WorkerRole` union type (line 18–23)

#### [MODIFY] [client.ts](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/worker/client.ts)
- Add `"asset"` to the roles array, replacing one idle slot: `["layout", "layout", "asset", "analysis"]`
- The `analysis` slot remains as a stub for future use

#### [MODIFY] [workerTasks.ts](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/worker/workerTasks.ts)
- Add `registerAssetTasks()` implementing a `"asset/decode-image"` task
- Task payload: `{ url: string }` — the preloader passes the PNG asset URL
- Inside the worker: `fetch(url)` → `response.blob()` → `createImageBitmap(blob)` → return transferable `ImageBitmap`
- Result transferred with zero-copy via the `transfer` list in `postMessage`
- Main thread receives `ImageBitmap` → `new THREE.CanvasTexture(imageBitmap)`

#### [MODIFY] [materials.ts](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/materialsEngine/presets/materials.ts)
- In `getTextureBundle()` PNG fallback path: submit a `"asset/decode-image"` task to the worker pool instead of `THREE.TextureLoader.load()`
- Return a `Promise<TextureBundle>` that resolves when the worker returns the `ImageBitmap`
- **Coding standard**: Only the PNG fallback path changes — KTX2 path continues to use `KTX2Loader` directly on main thread (GPU transcoding is not CPU-bound)

### Phase 4.5 — Verification & QA (Phase 4)

- `tsc --noEmit` — zero new errors
- DevTools → Network: verify `.ktx2` files loading where available, `.png` files for fallback
- DevTools → Performance: verify main thread CPU during texture load shows no large decode spikes
- DevTools → Application → Storage: verify VRAM reduction in Memory panel when KTX2 is active
- Test on low-end GPU (throttle via Chrome `--disable-gpu-rasterization`): verify graceful RGBA fallback
- Verify worker pool `snapshot()` shows the `asset` worker handling decode tasks
- **⏸️ PAUSE FOR USER REVIEW — Final sign-off**

---

## Verification Plan Summary

| Phase | Test | Tool |
|---|---|---|
| 1.4 | Preloader derives warm set from material functions, not strings | Console logs + DevTools |
| 1.4 | Simulation state sweep detects rooms & adds their textures | Console logs |
| 1.4 | Deduplication gate skips already-cached textures | Console logs on hot-reload |
| 2.4 | Settings panel opens from menu, 4-node slider works | Manual UI test |
| 2.4 | `textureQuality` persists to localStorage | Browser DevTools → Application |
| 3.6 | Variant files exist at correct resolutions | File system check |
| 3.6 | Quality switch visually updates all room textures | Manual visual test |
| 3.6 | Low setting loads noticeably faster on throttled GPU | Chrome DevTools → Rendering |
| 4.5 | KTX2 files load in Network panel where available | DevTools → Network |
| 4.5 | No main-thread CPU spike during texture decode (worker handles it) | DevTools → Performance |
| 4.5 | Graceful RGBA fallback on unsupported GPU | Chrome flag test |
| 4.5 | `asset` worker pool slot active during load | `workerPool.snapshot()` |

---

## Artifact Augmentation Section

*This section must appear verbatim in every phase. It binds this document to the Antigravity artifact system.*

Upon completion of each phase, the executing agent must:
1. Update `development-tasks-texture_pipeline_perf.md` marking completed tasks `[x]`
2. Update the Antigravity `task.md` artifact in parity
3. Create or update the `walkthrough_texture_pipeline_perf.md` artifact with what was implemented
4. Reference this implementation plan file in all artifact headers
5. At each `⏸️ PAUSE` checkpoint: halt execution, summarize outcome to user, and await explicit approval before proceeding to the next phase
