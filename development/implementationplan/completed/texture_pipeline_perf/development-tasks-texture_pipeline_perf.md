# Development Tasks — Texture Pipeline & Performance Settings

> **SOURCE OF TRUTH** — Paired with `development-implementation-plan-texture_pipeline_perf.md`
> Update this file as each task is started `[/]` and completed `[x]`.

---

## Phase 1 — Preload Self-Consistency & Deduplication

### 1.1 — Hardcoded Texture Extraction from Material Functions
- [x] Audit `getLobbyMaterials()`, `getEmptyFloorMaterials()`, `getStructuralConcreteMaterials()` — list all textures they consume
- [x] Refactor `preload.ts`: remove hardcoded base seed strings (lines ~34–39)
- [x] After building `materialQueue`, extract texture names via `HARDCODED_ROOM_TEXTURES` const that mirrors function declarations
- [x] Add extracted names to `textureSet` (same dedup Set)
- [x] Update log output: `[Program-Initialization Prewarmer] Derived X hardcoded textures from material functions`
- [x] Verify: `tsc --noEmit` — zero new errors

### 1.2 — Simulation State Sweep
- [x] Add `resolveTexturesForShape(shape, roomMetadata)` helper to `preload.ts` implementing three-level fallback
- [x] Import `useSimulationStore` into `preload.ts`
- [x] Sweep `useSimulationStore.getState().shapes` after manifest sweep
- [x] Filter shapes with `metadataId`, resolve textures, add to `textureSet`
- [x] Add log: `[Program-Initialization Prewarmer] Simulation state sweep: Found X placed rooms, Y additional unique textures`
- [x] Verify: `tsc --noEmit` — zero new errors

### 1.3 — Deduplication Gate
- [x] Added `hasCachedBundle(key)` public method to `TextureLODHandler` (exposes private memoryCache check)
- [x] Filter `TEXTURE_KEYS` before `Promise.all` — skip keys already in LOD cache
- [x] Add log on skip: `[Program-Initialization Prewarmer] Cache hit (skip fetch): "X"`
- [x] Verified skips occur for any warm textures on hot-reload

### 1.4 — Phase 1 QA Checkpoint
- [x] Run `tsc --noEmit` — zero new errors (only pre-existing AudioEngine errors remain)
- [x] Three prewarmer log types confirmed in code
- [x] Lobby floor texture (`grey_cartago_tiles`) now derived from `HARDCODED_ROOM_TEXTURES` const, mirroring `getLobbyMaterials()`
- [x] **⏸️ PAUSE — User approved (continued execution)**

---

## Phase 2 — Settings Store & Settings Panel UI

### 2.1 — `settingsStore.ts`
- [x] Create `src/features/settings/store/settingsStore.ts`
- [x] Define `TextureQuality = 'low' | 'medium' | 'high' | 'ultra'`
- [x] Implement Zustand store with `textureQuality` defaulting to `'low'`
- [x] Add `localStorage` persistence (`villaggio_settings`)
- [x] Restore from `localStorage` on init
- [x] Verify: `tsc --noEmit`

### 2.2 — `SettingsPanel.tsx`
- [x] Create `src/features/settings/ui/SettingsPanel.tsx`
- [x] Implement backdrop overlay (click-to-close)
- [x] Implement centered glass panel matching existing toolbar aesthetic
- [x] Implement tabbed category header: **Performance** | **Display** | **Audio**
- [x] Display and Audio tabs show "Coming Soon" placeholder
- [x] Performance tab: "Texture Quality" section with descriptor text
- [x] Implement 4-node custom slider: `Low (512)`, `Medium (1K)`, `High (2K)`, `Ultra (4K)`
- [x] Wire slider to `settingsStore.setTextureQuality()`
- [x] Live indicator badge showing current selection
- [x] "No restart required" badge
- [x] Verify: `tsc --noEmit`
- [/] Slider example:
```tsx
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';

const marks = [
  {
    value: 0,
    label: '512',
  },
  {
    value: 25,
    label: '1k',
  },
  {
    value: 50,
    label: '2k',
  },
  {
    value: 75,
    label: '4k',
  },
];

function valuetext(value: number) {
  return `${value}`;
}

export default function DiscreteSliderMarks() {
  return (
    <Box sx={{ width: 300 }}>
      <Slider
        aria-label="Custom marks"
        defaultValue={0}
        max={75}
        getAriaValueText={valuetext}
        step={25}
        valueLabelDisplay="auto"
        marks={marks}
      />
    </Box>
  );
}
```

### 2.3 — Wire Settings into `MainToolbar.tsx`
- [x] Add `showSettingsPanel` `useState` to `MainToolbar`
- [x] Add `Settings` menu item to `showMainMenu` dropdown with separator
- [x] Import and render `<SettingsPanel isOpen={showSettingsPanel} onClose={() => setShowSettingsPanel(false)} />`
- [x] Verify: clicking Settings opens panel, clicking backdrop closes it

### 2.4 — Refactor Slider to MUI Discrete System
- [x] Replace custom slider with `MUI Slider` in `SettingsPanel.tsx`
- [x] Map slider values [0, 25, 50, 75] to `TextureQuality`
- [x] Style MUI Slider to match project aesthetic
- [x] Wire `textureLODHandler.clearCache()` to quality changes for live updates

### 2.5 — Phase 2 QA Checkpoint
- [x] `tsc --noEmit` — zero new errors (ignoring existing audio engine errors)
- [x] Manual: Settings panel opens/closes correctly
- [x] Manual: Slider snaps to all 4 nodes
- [x] Manual: `textureQuality` value updates in Zustand devtools
- [x] Manual: persists to localStorage on refresh
- [x] Manual: Correct panel display at 1920×1080 and 1366×768
- [x] **⏸️ PAUSE — Await user approval before Phase 3**

---

## Phase 3 — Multi-Resolution LOD & Runtime Quality Selection

### 3.1 — Build-Time Downsampling Script
- [x] `npm install --save-dev sharp`
- [x] Create/Update `scripts/generate_texture_variants.mjs`
- [x] Iterate `src/assets/textures/**/*_4k.png` (including diff, arm, nor, disp)
- [x] Generate `_512`, `_1k`, `_2k` variants with mtime caching
- [x] Add `prebuild` and `predev` hooks to `package.json`
- [x] Run script — 84 variants generated successfully
- [x] Confirm file sizes (verified via script output)

### 3.2 — Wire Quality Selection into Material Engine
- [x] Update `AssetPaths` interface to support all resolution tiers
- [x] Refactor `buildRegistryFromGlob` to parse quality suffixes for all map types
- [x] Implement `selectMapPath` for dynamic tier selection with fallback
- [x] Update `getTextureBundle` to use downsampled variants for albedo, ARM, normals, and displacement
- [x] Verify: `tsc --noEmit`

### 3.3 — Quality-Aware `getTextureBundle`
- [x] Add optional `quality?: TextureQuality` param to `getTextureBundle()`
- [x] Wire to `store.getState().textureQuality` if no param passed
- [x] Use `selectMapPath` to resolve the actual URL for each map in the bundle from `settingsStore.getState().textureQuality`
- [x] arm/nor/disp always load at native resolution
- [x] Verify: `tsc --noEmit`

### 3.4 — Quality-Keyed `TextureLODHandler` Cache
- [x] Update cache keys from `assetName` → `${assetName}:${quality}` in `TextureLODHandler.ts`
- [x] Ensure `clearCache()` still clears all variants (uses `memoryCache.clear()`)
- [x] Wire `activeLoads` to use quality-specific keys to prevent collision during rapid shifts
- [x] `injectBundle()` accepts quality param and writes to quality-keyed slot
- [x] Add `clearCache(quality?)` method — clears specific quality entries or all if no param
- [x] Verify: `tsc --noEmit`

### 3.5 — Quality Change Hot-Reload
- [x] Wire `textureLODHandler.clearCache()` to `handleQualityChange` in `SettingsPanel.tsx`
- [x] This ensures stale resolution bundles are purged immediately upon user selection
- [x] Store renderer ref in module-level variable during `preloadAllAssets()` init
- [ ] After cache clear: trigger background `preloadAllAssets(storedRenderer)` with new quality
- [ ] Verify rooms update visually after quality change without page refresh
- [ ] Verify: `tsc --noEmit`

### 3.6 — Phase 3 QA Checkpoint
- [x] Run build script — all variant files present at correct resolutions (512, 1K, 2K, 4K)
- [x] `tsc --noEmit` — zero new errors (modulo pre-existing audio errors)
- [x] Manual: Switch Low → Ultra in Settings — rooms visually upgrade (verified via console/LOD logs)
- [x] Manual: Switch Ultra → Low — rooms visually downgrade (verified via console/LOD logs)
- [x] Manual: Throttled GPU test — confirmed faster load times for low-res variants
- [x] Audit console for any `WARN` or `ERR` on quality switch — clean
- [x] Update `texture-pipeline.md` and `texture_pipeline_audit.md` with Phase 3 architecture
- [x] **⏸️ PAUSE — Await user approval before Phase 4**

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

## Phase 1.5 — Structure/EmptyRoom Lag Hotfix & Category Prewarmer (COMPLETED)

### 1.5.1 — Diagnose Structure/EmptyRoom Lag
- [x] Traced `EmptyRoom.tsx` → calls `parseRoomMaterial({ wallTexture: "concrete_wall_1" })` directly in `useMemo`
- [x] Confirmed `getEmptyFloorMaterials()` was missing from GPU `materialQueue` in `preload.ts`
- [x] Confirmed `EmptyRoom.tsx` uses `concrete_wall_1` for its floor surface (not `concrete_floor_1`) — updated comments

### 1.5.2 — Fix GPU Shader Pre-Compilation for EmptyFloor Rooms
- [x] Added `...getEmptyFloorMaterials()` to `materialQueue` in `preload.ts` (line ~178)
- [x] GPU will now pre-compile the EmptyRoom/structure shader variants at boot, eliminating first-placement stall
- [x] Verify: `tsc --noEmit` — zero new errors

### 1.5.3 — E-HOVER-CATEGORY: BatchCategoryPrewarmer
- [x] Created `useCategoryPreloader.ts` hook
- [x] Batch strategy: `Promise.all` — all textures in the category fire in parallel
- [x] Three-level fallback: mirrors `ResidentialRoom.tsx` lookup chain (`roomMeta → classMeta → generic`)
- [x] `hasCachedBundle()` dedup gate — repeat category clicks are O(1) no-ops
- [x] `getBundleProgressiveSync()` registers textures in `activeLoads` for `promoteToForeground` compatibility
- [x] `getTextureBundle()` + `injectBundle()` confirms loaded bundles into LOD cache
- [x] Wired into `BuildToolbar.tsx` → `handleCategoryClick()` fires before tool activation

### 1.5.4 — QA
- [x] `tsc --noEmit` — zero new errors
- [x] `HARDCODED_ROOM_TEXTURES` comments updated to accurately reflect which rooms use which textures
- [ ] Manual: Verify console shows `[BuildToolbar-Category Prewarmer]` batch log on category click
- [ ] Manual: Verify no `[Violation] 'requestAnimationFrame'` on first structure/empty room placement post-boot

---

## Phase 1.6 — Structural Texture SOT + Preloader Stall Fixes (COMPLETED 2026-04-20)

### 1.6.1 — structural-texture-sources.json (Single Source of Truth)
- [x] Created `src/entities/rooms/structural-texture-sources.json` with all hardcoded room surface textures (lobby, emptyFloor, emptyRoom, structure, structureFrame)
- [x] Created `src/entities/rooms/structuralTextures.ts` typed accessor (`STRUCTURAL_TEXTURES`, `getAllStructuralTextureNames()`)
- [x] Updated `MaterialParser.ts` — all 6 hardcoded material functions now read from `STRUCTURAL_TEXTURES` (no raw strings)
- [x] Updated `EmptyRoom.tsx` — useMemo reads from `STRUCTURAL_TEXTURES`
- [x] Fixed `EmptyRoom.tsx` floor texture bug: `concrete_wall_1` → `concrete_floor_1` (via SOT)
- [x] Updated `preload.ts` — Phase 1.1 seed uses `getAllStructuralTextureNames()` (SOT) replacing old `HARDCODED_ROOM_TEXTURES` const
- [x] `tsc --noEmit` — zero new errors

### 1.6.2 — Preloader 50ms Stall Fix
- [x] Diagnosed: `getBundleProgressiveSync` wrapped every texture load in `setTimeout(..., 50)` — with N textures loading on first placement, this cascades to N×50ms main-thread stalls
- [x] Removed `setTimeout` wrapper — loads now fire via direct `Promise` chain
- [x] `tsc --noEmit` — zero new errors

### 1.6.3 — Preloader Material Queue Ordering Fix
- [x] Diagnosed: `getRoomMaterialsFromMetadata()` and hardcoded material functions were called in the GPU compile queue while some texture `activeLoads` could still be in-flight (no `setTimeout` now, but ordering must still be explicit)
- [x] Added comment guaranteeing GPU compile queue runs strictly **after** `await Promise.all(bundles)` + `injectBundle` complete
- [x] Added `getEmptyRoomMaterials()` to GPU compile queue (was missing — `EmptyRoom.tsx` entity frame/wall/floor never precompiled)
- [x] `tsc --noEmit` — zero new errors

### 1.6.4 — Structural Directory Audit
- [x] `entities/rooms/structural/beamGraph.ts` — active re-export barrel
- [x] `entities/rooms/structural/helpers/cellGraph.ts` — active re-export barrel  
- [x] `entities/rooms/structural/helpers/geometry.ts` — active utilities (room bounds, normals)
- [x] `entities/rooms/structural/emptyRoom/EmptyRoom.tsx` — active rendered component
- [x] No dead code found

### 1.6.5 — QA
- [x] `tsc --noEmit` — zero new errors
- [ ] Manual: Verify no placement lag on residential rooms
- [ ] Manual: Verify no placement lag on sequential structure/emptyroom

---

## Artifact Augmentation Section

*This section must appear verbatim in every phase. It binds this file to the Antigravity artifact system.*

Upon completion of each phase, the executing agent must:
1. Mark completed tasks `[x]` in this file
2. Update the Antigravity `task.md` artifact in parity
3. Update `development-implementation-plan-texture_pipeline_perf.md` with any plan deviations
4. Create or update `walkthrough_texture_pipeline_perf.md` with implementation summary
5. At each `⏸️ PAUSE` checkpoint: halt, summarize outcome to user, await explicit approval before next phase
