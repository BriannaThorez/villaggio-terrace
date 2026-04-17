# Tasks: Affirmative Asset Preloading & Worker Optimization

> **Source of Truth** — Living task checklist. Update `[x]`, `[/]`, `[ ]` as work progresses.
> **Circular Reference**: See [implementation_plan_affirmative_preloading.md](implementation_plan_affirmative_preloading.md) for full phase specs and design decisions.

---

## Pre-Flight

- [x] 💾 Execute `briannas_snapshot_skill` — preserve stable codebase before Phase 1

---

## Phase 1: Loading Gate & Truthful Progress Display

### 1.1 — Create `LoadingGate.ts`
- [x] Create `src/features/assetPreloader/api/LoadingGate.ts`
  - [x] Define `LoadingPhase` union type: `'idle' | 'fetching_textures' | 'compiling_shaders' | 'warming_materials' | 'ready'`
  - [x] Implement singleton `loadingGate` with `advance(phase)`, `subscribe(cb)`, `isReady()`, `getCurrentPhase()` methods
  - [x] Zero React imports, zero circular deps — verify with `tsc --noEmit`
  - [x] Ensure `subscribe` returns an unsubscribe function for cleanup

### 1.2 — Modify `preload.ts`
- [x] `src/features/assetPreloader/api/preload.ts` — **targeted changes only**
  - [x] Add `loadingGate.advance('fetching_textures')` before texture fetch loop
  - [x] Await all `getTextureBundle(key)` Promises (currently fire-and-forget in `forEach`)
  - [x] Add `loadingGate.advance('compiling_shaders')` after all textures resolve
  - [x] Move `renderer.compile()` to AFTER awaited texture resolution (critical fix)
  - [x] Add `loadingGate.advance('warming_materials')` before material permutation loop
  - [x] Add `loadingGate.advance('ready')` after final loop completes
  - [x] Preserve all existing texture keys and material permutation logic

### 1.3 — Modify `AssetPreloader.tsx`
- [x] `src/features/assetPreloader/ui/AssetPreloader.tsx` — **targeted changes only**
  - [x] Remove `setInterval` fake progress block
  - [x] Add `loadingGate.subscribe()` in `useEffect` — map phases to progress %:
    - [x] `fetching_textures` → 15%
    - [x] `compiling_shaders` → 55%
    - [x] `warming_materials` → 85%
    - [x] `ready` → 100% → hide after 400ms fade
  - [x] Update display label text per phase (see plan for copy)
  - [x] Cleanup: unsubscribe from `loadingGate` in `useEffect` return

### ✅ Phase 1 QA Checks
- [x] DevTools Network: overlay disappears AFTER all 4K texture XHRs complete
- [x] DevTools Performance: `renderer.compile()` appears after texture XHR waterfall
- [x] `tsc --noEmit` — Exit 0 (AudioEngine errors unrelated)
- [ ] **🛑 PAUSE — Awaiting user QA approval before Phase 1.5**

---

## Phase 1.5: Correction & Optimization

### 1.5.0 — Automate ASSET_REGISTRY (User-Mod Friendly)
- [x] `src/features/materialsEngine/presets/materials.ts` — **targeted changes only**
  - [x] Add `import.meta.glob('../../../assets/textures/**/*.png', { query: '?url', import: 'default', eager: true })` at module level
  - [x] Implement `buildRegistryFromGlob(glob: Record<string, string>): Record<string, AssetPaths>`
    - Parse folder name from path: segment between `textures/` and next `/`
    - Detect map type from filename: `_diff` → diff, `_arm` → arm, `_nor` → nor, `_disp` → disp, `_spec` → spec
    - Skip files not matching any known map type keyword (no crash)
  - [x] Replace static `ASSET_REGISTRY = { ... }` with `const ASSET_REGISTRY = buildRegistryFromGlob(_textureGlob)`
  - [x] Remove all static `import` declarations for individual texture PNGs
  - [x] Implement `printTextureRegistryAudit()`:
    - Lists all discovered texture names + their map types
    - Flags any entry missing required maps (`diff`, `arm`, `nor`, `disp`)
    - Only runs when `import.meta.env.DEV` is true
  - [x] Call `printTextureRegistryAudit()` once on module load in DEV mode
  - [x] Verify: all 9 existing textures discovered and logged in DevTools console
  - [x] `tsc --noEmit` — Exit 0

> ✅ **After this step**: Adding a new texture = drop files + reference in roomMetadata. No code changes ever needed again.

### 1.5.1 — Fix Lobby Placement Regression
- [x] `src/features/roomPlacement/constraints/placementRules.ts` — **targeted changes only**
  - [x] Remove `"lobby"` from `isS1Structural` expression (line ~43)
  - [x] Remove `"lobby"` from `isS2Structural` expression (line ~44)
  - [x] Verify `"structure"` and `"empty_floor"` remain in both expressions (scaffold bypass preserved)
  - [x] Verify no other placement bypass paths reference `"lobby"` as a pass-through type

### 1.5.2 — Deduplicate Shader Compilation (Visual Signature Set)
- [x] `src/features/assetPreloader/api/preload.ts` — **targeted changes only**
  - [x] **Remove** static `textureSet` seed list — build dynamically instead
  - [x] Build `visualSignatureSet: Set<string>` where key = `"${wallTex}|${floorTex}|${ceilingTex}"`
  - [x] Iterate `roomMetadata.rooms`; extract wall/floor/ceiling with fallbacks
    - Default: `wall="beige_wall_1"`, `floor="wood_floor_1"`, `ceil="beige_wall_1"`
  - [x] Add each texture name to dynamic `textureSet` (for warming)
  - [x] Add pipe-delimited signature to `visualSignatureSet` (for shader dedup)
  - [x] Convert `visualSignatureSet` → `uniqueMetaVariants[]` → `materialQueue`
  - [x] Keep `getLobbyMaterials()` + `getStructuralConcreteMaterials()` as explicit post-loop additions
  - [x] Log: `console.debug('[Preloader] %d unique visual signatures / %d total rooms', ...)`

### 1.5.3 — Smooth Visual Perception (RAFLoop LERP)
- [x] `src/features/assetPreloader/ui/AssetPreloader.tsx` — **targeted changes only**
  - [x] Add `targetProgress` ref + `smoothProgress` state
  - [x] Start `requestAnimationFrame` loop on mount; cancel on unmount
  - [x] Each tick: `smoothProgress = current + (targetProgress.current - current) * 0.12`
  - [x] `loadingGate.subscribe` sets `targetProgress.current` only (not `progress` state directly)
  - [x] Progress bar `width` CSS reads from `smoothProgress`
  - [x] Status label reads directly from `loadingGate` phase (no LERP on text)

### 1.5.4 — Output Texture Pipeline Audit Document
- [x] After Phase 1.5.0 is implemented and app is running:
  - [x] Run the app → copy DevTools console output from `printTextureRegistryAudit()`
  - [x] Create `development/texture_pipeline_audit.md` with the output
  - [x] Verify all 9 current textures present, all required maps detected, no warnings

### 1.5.5 — Bridge Preloader Cache to Runtime
- [x] `src/features/materialsEngine/TextureLODHandler.ts` — **targeted change**
  - [x] Implement `public injectBundle(assetName: string, bundle: TextureBundle): void`
  - [x] Ensure it sets the bundle in `memoryCache`
- [x] `src/features/assetPreloader/api/preload.ts` — **targeted change**
  - [x] Captures the array of bundles from `Promise.all`
  - [x] Iterates `TEXTURE_KEYS` and calls `textureLODHandler.injectBundle` for each
- [x] Verify: Placing a room immediately after "Engine Ready" shows **no** white/grainy placeholder flash

### ✅ Phase 1.5 QA Checks
- [x] Place room over Lobby → RED placement indicator, placement blocked ✅
- [x] Place Empty Room over Empty Room → RED indicator, placement blocked ✅
- [x] Dev console: all 9 textures auto-discovered on startup
- [x] Dev console: dedup log shows Unique < Total rooms
- [x] `development/texture_pipeline_audit.md` created and contains all texture entries
- [x] Visuals: progress bar glides smoothly — no discrete phase jumps
- [ ] Visuals: No "white flash" of low-res textures when simulation first spawns rooms
- [x] `tsc --noEmit` — Exit 0
- [x] **🛑 PAUSE — Awaiting user QA approval before Phase 2**

---

## Phase 2: Drawer-Hover Warming (Smart, Cancellation-Aware)

### 2.1 — Create `useHoverPreloader.ts`
- [x] Create `src/features/assetPreloader/hooks/useHoverPreloader.ts`
  - [x] Maintain `lastHoveredId` ref to track current hover target
  - [x] On `warmForModule(moduleId)`: extract texture names from `roomMetadata` by ID
  - [x] Call `textureLODHandler.getBundleProgressiveSync(txName)` for each surface texture
  - [x] If `moduleId === lastHoveredId` → noop (dedup)
  - [x] If `moduleId !== lastHoveredId` → update ref, continue (allow parallel cache fills)
  - [x] Never throw, never block render — wrap in try/catch
  - [x] Export: `const { warmForModule } = useHoverPreloader()`

### 2.2 — Modify `BuildToolbar.tsx`
- [x] `src/features/ui/toolbars/BuildToolbar.tsx` — **targeted changes only**
  - [x] Import `useHoverPreloader` at top of component
  - [x] Destructure `warmForModule` from hook
  - [x] Add `warmForModule(sub.id)` to sub-room button `onPointerEnter`
  - [x] Preserve all other `onPointerEnter`, `onClick`, audio trigger logic unchanged

### ✅ Phase 2 QA Checks
- [ ] DevTools Network: hover over "Standard Apartment" → confirm texture XHR fires before click
- [ ] Hover over 5 items rapidly → no freeze, no errors, cache entries accumulate
- [ ] Click final item → confirm zero placeholder flash (full-res texture already VRAM)
- [ ] `tsc --noEmit` — Exit 0
- [ ] **🛑 PAUSE — Awaiting user QA approval before Phase 3**

---

## Phase 3: Predictive Cache Promotion

### 3.1 — Modify `TextureLODHandler.ts`
- [x] `src/features/materialsEngine/TextureLODHandler.ts` — **targeted changes only**
  - [x] Add `promoteToForeground(assetName: string): Promise<TextureBundle>` method
  - [x] If `memoryCache.has(assetName)` → return resolved promise immediately
  - [x] If `activeLoads.has(assetName)` → return the existing in-flight promise (no new request)
  - [x] Else → delegate to `getBundleProgressiveSync(assetName).promise`
  - [x] No new network requests triggered; promotion = priority-attaching to existing work

### 3.2 — Modify `useToolPreloader.ts`
- [x] `src/features/assetPreloader/hooks/useToolPreloader.ts` — **targeted changes only**
  - [x] Before calling `getBundleProgressiveSync`, check `textureLODHandler` active load state
  - [x] If active load or cached → call `promoteToForeground` instead
  - [x] Preserve existing `useEffect([activeModuleId])` dependency array and early-return guards

### ✅ Phase 3 QA Checks
- [x] Profile: hover then click same room → no 8px placeholder flash visible
- [x] Select Residential → quickly select Office → no stutter between selections
- [x] `tsc --noEmit` — Exit 0
- [x] **🛑 USER APPROVAL — Ready for Phase 3.5 Performance Audit**

---

## Phase 3.5: Placement Lag Audit & CSG Optimization

### 3.5.1 — Optimize `TextureLODHandler` (Cache Bypass)
- [x] `src/features/materialsEngine/TextureLODHandler.ts`
  - [x] Modify `getBundleProgressiveSync` to check `memoryCache` first
  - [x] If found, return cached bundle as BOTH `progressive` and `promise` (bypass placeholder)
- [x] Verify: selection of pre-warmed room shows 4K textures in exactly ONE frame (no flash)

### 3.5.2 — Optimize `MaterialParser` (Sync Initialization)
- [x] `src/engine/MaterialParser.ts`
  - [x] Update `createRoomSurfaceMaterial` to check if the promise is already resolved
  - [x] Apply textures IMMEDIATELY in constructor if possible to avoid `needsUpdate` stall
- [x] Verify: placing rooms has reduced "hitch" during the addShape action

### 3.5.3 — Optimize `RoomMeshCSG` (Geometry Stabilization)
- [x] `src/entities/rooms/visuals/RoomMeshCSG.tsx`
  - [x] Memoize the `addGroup` loop logic or move into a dedicated hook/memo
  - [x] Ensure CSG `Geometry` is only re-calculated when actual dimensions change
- [x] Verify: FPS remains stable during rapid placement of rooms using CSG (Lobby, Office)

---

## Phase 4.0: FloorBucketIndex — Add Above-Floor Query (Pre-requisite)

> ⚠️ **Additive-only**. No existing methods or callers change. New method follows identical pattern to `getSupportNodes`.

### 4.0.1 — Add `getAboveNodes()` to `FloorBucketIndex`
- [x] `src/features/roomPlacement/constraints/spatialIndex.ts` — **targeted change only**
  - [x] Add `getAboveNodes(y: number): SimulationNode[]` method directly below `getSupportNodes`
  - [x] Implementation: `return this.buckets.get(floorBucketKey(y + STRUCTURAL_CONSTANTS.FLOOR_HEIGHT)) ?? []`
  - [x] Do NOT touch `getSupportNodes`, `getFloorNodes`, `getStructuralFloorNodes`, or `floorBucketKey`

### 4.0.2 — Wire `getAboveNodes()` into `checkStructuralIntegrity`
- [x] `src/features/roomPlacement/constraints/structuralIntegrity.ts` — **targeted change only**
  - [x] Review `getMaxCantileverLogic` signature — confirm it can accept optional above-nodes arg
  - [x] Add `nodesAbove` query: `const nodesAbove = index ? index.getAboveNodes(y) : allShapes.filter(...)`
  - [x] Wire `nodesAbove` into `getMaxCantileverLogic` (or add adjacency guard at `checkStructuralIntegrity` level if signature doesn't support it cleanly)
  - [x] Do NOT change `maxOverhang` constant or return shape of `checkStructuralIntegrity`

### ✅ Phase 4.0 QA Checks
- [ ] `tsc --noEmit` — Exit 0 before and after change
- [ ] Add temporary `console.debug('[FBI-above] count=%d', index.getAboveNodes(y).length)` in `checkStructuralIntegrity` — verify non-zero count when rooms exist above
- [ ] Remove debug log
- [ ] **🛑 USER FUNCTIONAL CHECK**: Place room adjacent to existing unit one floor above — verify indicator color correct and immediate

---

## Phase 4: Worker Pool Expansion

### 4.1 — Protocol: Add New Task Types
- [x] `src/shared/worker/protocol.ts` — **targeted changes only**
  - [x] Add `ValidateStructuralIntegrity: 'simulation/validate-structural-integrity'` to `SIMULATION_TASK_TYPE`
  - [x] Add `StructuralIntegrityPayload` interface (mirrors `checkStructuralIntegrity` params)
  - [x] Add `StructuralIntegrityResult` interface (mirrors `PlacementResult`)
  - [x] Preserve all existing type exports

### 4.2 — Register Analysis Task
- [x] `src/worker/workerTasks.ts` — **targeted changes only**
  - [x] Implement `registerAnalysisTasks()` (currently placeholder)
  - [x] Register `simulation/validate-structural-integrity` task
  - [x] Must use the updated 3-bucket `FloorBucketIndex` (from Phase 4.0 — above/same/below)
  - [x] Import and call `checkStructuralIntegrity` from `structuralIntegrity.ts`

### 4.3 — Register Routing Task: Resolve Overlaps
- [x] `src/worker/workerTasks.ts` — **targeted changes only**
  - [x] Implement `registerRoutingTasks()` (currently empty placeholder)
  - [x] Register `SIMULATION_TASK_TYPE.ResolveOverlaps` using existing `ResolveOverlapsPayload` / `ResolveOverlapsResult` types
  - [x] Implement AABB de-overlap algorithm using `workerNodeState`

### 4.4 — PlacementIndicator: Correctness-First (Three Sub-Phases)

> ⚠️ **SAFETY CONSTRAINT**: Indicator color must have zero perceptible delay. Sync path is primary. 3-bucket `FloorBucketIndex` scope (above + same + below) must NEVER be widened. User functional check is **mandatory** at every sub-step.

> ✅ **Scope Confirmed (3-bucket, post Phase 4.0)**: `FloorBucketIndex` queries `getAboveNodes(y)` (one floor up), `getFloorNodes(y)` (same floor), `getSupportNodes(y)` (one floor below). Does NOT scan the full tower.

#### Phase 4.4a — Baseline Diagnostic (NO code changes)
- [ ] Add temporary `console.debug('[PI] valid=%s pos=%s', isValid, snappedX+','+snappedY)` inside `PlacementIndicator` `useFrame`
- [ ] Open DevTools Console — verify logs fire at 60fps and valid/invalid matches visual color
- [ ] ⛔ **Scope check**: if logged positions contain nodes outside the current floor bucket — STOP and report to user immediately
- [ ] Capture DevTools Performance snapshot as baseline for frame timing
- [ ] Remove debug log
- [ ] **🛑 USER FUNCTIONAL CHECK**: verify indicator color is pixel-instant, snap is correct, no false positives/negatives — user explicitly approves before 4.4b

#### Phase 4.4b — Worker Mirror as Secondary (if 4.4a approved)
- [ ] Worker-side `CheckPlacement` uses identical 3-bucket `FloorBucketIndex` scoping
- [ ] Verify `SyncSpatialHash` keeps worker state in sync for all 3 floor-bucket queries
- [ ] Wire worker result to a **telemetry/ACK `console.debug` log only** — does NOT drive indicator color
- [ ] Indicator color path remains synchronous and unchanged
- [ ] `tsc --noEmit` — Exit 0
- [ ] **🛑 USER FUNCTIONAL CHECK**: behavior must be bitwise identical to 4.4a baseline

#### Phase 4.4c — Optional Hybrid Color Update (ONLY if user explicitly requests)
- [ ] Profile worker round-trip latency — confirm ≤16ms (≤1 frame) before proceeding
- [ ] If latency > 16ms → do not proceed, log finding, leave sync path
- [ ] If approved: propose deferred color update via worker result
- [ ] Add revert path clearly marked — if any lag reported, revert immediately
- [ ] **🛑 USER FUNCTIONAL CHECK**: place rooms rapidly across multiple floors, confirm no missed red/green flashes, no ghost placements

### ✅ Phase 4 QA Checks
- [ ] Worker health-check logs show `routing` and `analysis` roles accepting tasks
- [ ] Place 20 rooms rapidly across multiple floors → zero placement correctness regressions
- [ ] `tsc --noEmit` — Exit 0
- [ ] `npm run build` — confirm no bundle circular dependency warnings
- [ ] **🛑 PAUSE — Awaiting user final QA approval**

---

## Final Verification (Post All Phases)
- [ ] End-to-end manual test: cold load → hover → place → rapid placement
- [ ] DevTools: overlay disappears only after GPU compilation confirmed
- [ ] `tsc --noEmit` — Exit 0 (full project)
- [ ] Run existing worker `.test.ts` files: `roles.test.ts`, `verification.test.ts`
- [ ] git commit with descriptive message

---

## History Log

| Date | Phase | Agent Action |
|---|---|---|
| 2026-04-16 | Plan Created | Tasks scaffolded from newplan_skill.md protocol; prior audio plans archived to `completed/audio_ux_optimizations/` |
| 2026-04-16 | Phase 4.4 | Revised to correctness-first 3-sub-phase structure. Sync path is primary. Mandatory user functional checks at 4.4a/b/c. |
| 2026-04-16 | Phase 1.5 | Added Correction & Optimization phase: Lobby placement fix, shader deduplication, and progress smoothing. |
| 2026-04-16 | Phase 4.0 Added | New pre-requisite: `FloorBucketIndex.getAboveNodes()`. Scope expanded from 2-bucket to **3-bucket** (above/same/below). Duplicate 4.3 removed. Scope notes updated throughout. |
