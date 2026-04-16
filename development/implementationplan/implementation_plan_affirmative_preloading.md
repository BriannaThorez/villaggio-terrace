# Implementation Plan: Affirmative Asset Preloading & Worker Optimization

> **Source of Truth** — This document is the canonical, cumulative record of the Affirmative Preloading feature from inception to completion.
> **Circular Reference**: See [tasks_affirmative_preloading.md](tasks_affirmative_preloading.md) for the living task checklist.
> **Prompt Analysis**: See [prompt_affirmative_preloading.md](prompt_affirmative_preloading.md) for axiomatic intent.

---

## 💾 [SNAPSHOT_CREATION]
Before Phase 1 execution, run `briannas_snapshot_skill` to preserve the stable codebase state.

---

## Background & Findings

The audit of the existing pipeline confirmed three systemic gaps:

1. **False loading completion**: `AssetPreloader` marks itself done via a fake `setInterval` progress bar. The GPU is told to compile against 8px placeholder textures — causing visible "judder" on first room placement when 4K textures hot-swap in.
2. **Passive menu warming**: `useToolPreloader` reacts to `activeModuleId` *after* click. Sub-room hover time (~300–800ms average) is wasted.
3. **Idle worker roles**: The `routing` and `analysis` worker roles exist but hold zero tasks. The `CheckPlacement` synchronous path runs on the main thread during every `useFrame` call via `PlacementIndicator`, creating silent microtask pressure.

---

## Architecture Overview

Each feature is developed as a **fully self-contained Feature Slice** under `src/features/`. No cross-feature imports except through explicit `shared/` APIs.

```
src/features/
├── assetPreloader/           ← Feature Slice: GPU warming pipeline (MODIFY)
│   ├── api/
│   │   ├── preload.ts        ← MODIFY: Await-before-compile, real phase tracking
│   │   └── LoadingGate.ts    ← NEW: Centralized async loading state bus
│   ├── hooks/
│   │   ├── useHoverPreloader.ts  ← NEW: Cancellation-aware hover warming hook
│   │   └── useToolPreloader.ts   ← MODIFY: Promote already-warm cache entries
│   └── ui/
│       └── AssetPreloader.tsx    ← MODIFY: Wire to real phase completion events
src/worker/
├── workerTasks.ts            ← MODIFY: Register routing + analysis tasks
├── client.ts                 ← MODIFY: Expose priority-submit pathway
└── pool.ts                   ← REVIEW: Confirm SpatialHash sync ACK path
```

---

## Phase 1: Loading Gate & Truthful Progress Display [COMPLETED]

**Goal**: Replace the fake `setInterval` progress bar with a real phase-gated loading system. The overlay must not disappear until the GPU has compiled against real 4K textures.

**Guiding Principle**: Only add to `AssetPreloader.tsx` and `preload.ts`. Do not touch simulation, audio, or store logic.

### 1.1 — Create `LoadingGate.ts` (NEW)

**File**: `src/features/assetPreloader/api/LoadingGate.ts`

A lightweight, framework-agnostic event bus. Subscribers receive phase-change events; callers call `advance(phase)`. This decouples `preload.ts` from React state without lifting state into global stores.

```ts
// Pseudo-design (not to be copied verbatim — implement cleanly)
type LoadingPhase = 
  | 'idle' 
  | 'fetching_textures' 
  | 'compiling_shaders' 
  | 'warming_materials'
  | 'ready';

// Singleton event emitter with typed phase transitions
export const loadingGate = createLoadingGate();
// loadingGate.advance('fetching_textures')
// loadingGate.subscribe(phase => ...)
// loadingGate.isReady() → boolean
```

**Constraints**: No React imports. Zero circular dependencies.

### 1.2 — Modify `preload.ts`

**File**: `src/features/assetPreloader/api/preload.ts`

**Targeted Change**: Restructure `preloadAllAssets` to:
1. `loadingGate.advance('fetching_textures')` — await all `getTextureBundle(key)` Promises in parallel.
2. `loadingGate.advance('compiling_shaders')` — now call `renderer.compile()` with real high-res textures.
3. `loadingGate.advance('warming_materials')` — run material permutation warm-up loop.
4. `loadingGate.advance('ready')` — signal true completion.

**⚠️ Preservation Rule**: Keep all existing texture keys. Do not remove or reorder the material permutation loop. Only add `await` and `loadingGate.advance()` calls.

### 1.3 — Modify `AssetPreloader.tsx`

**File**: `src/features/assetPreloader/ui/AssetPreloader.tsx`

**Targeted Change**: Replace `setInterval` fake progress with a `loadingGate.subscribe()` listener. Map phases to progress percentages:

| Phase | Progress |
|---|---|
| `fetching_textures` | 15% |
| `compiling_shaders` | 55% |
| `warming_materials` | 85% |
| `ready` | 100% + hide after 400ms |

Update display text per-phase:
- `fetching_textures` → "Fetching Architectural Assets…"
- `compiling_shaders` → "Compiling GPU Shaders…"
- `warming_materials` → "Warming Material Pipeline…"
- `ready` → "Ready."

**⚠️ Preservation Rule**: All existing JSX layout, styling, and animation intact. Only replace the `setInterval`/`setProgress` block.

### 🛑 Phase 1 Pause — QA Checkpoint
- Open DevTools Network tab. Confirm 4K texture requests complete *before* overlay disappear.

---

## Phase 1.5: Correction & Performance Optimization [COMPLETED]

**Goal**: Resolve the Lobby placement regression, automate texture discovery, optimize shader compilation via deduplication, and restore visual smoothness.

---

### 🔍 Texture Pipeline Audit (Source of Truth)
**update this upon revision of texture pipeline** 
The full confirmed data-flow from disk to GPU:

```
//IMPORTANT DO NOT DELETE
//Texture pipeline data-flow from disk to GPU
assets/textures/<name>/            ← raw PNG files on disk (4K, ~65-86MB each)
       ↓ (Vite import.meta.glob at build time)
materials.ts :: ASSET_REGISTRY     ← AUTO-DISCOVERED map name → paths
       ↓ (called explicitly)
materials.ts :: getTextureBundle() ← loads PNGs via THREE.TextureLoader → TextureBundle
       ↓ (Phase 1.5.5: Injected into cache)
TextureLODHandler :: memoryCache   ← SHARED PERSISTENT RAM CACHE 
       ↓ (called on room placement/spawn)
TextureLODHandler :: getBundleProgressiveSync() ← Pulls from pre-warmed memoryCache (O(1) hit)
       ↓
MaterialParser :: createRoomSurfaceMaterial()  ← builds MeshPhysicalMaterial + Triplanar shader
       ↓ (caches by key)
MaterialParser :: parseRoomMaterial()  ← roomMaterialCache keyed on (albedo|wall|floor|ceil)
       ↓
getRoomMaterialsFromMetadata() ← reads {wall, floor, ceil} from roomMetadata
       ↓
preload.ts (CURRENT) ← iterates unique signatures (O(U) unique shaders)
```

**Confirmed Findings (Post Phase 1.5 Update)**:
| Layer | Reads metadata? | Reads assets/textures? | Own Cache? |
|---|---|---|---|
| `materials.ts` | ❌ No | ✅ Yes (Auto-Glob) | ✅ Path Registry |
| `TextureLODHandler` | ❌ No | Via `getTextureBundle` | ✅ `memoryCache` (Currently Isolated) |
| `MaterialParser` | ❌ No | Via `TextureLODHandler` | ✅ `roomMaterialCache` |
| **`preload.ts`** | ✅ Yes | Via `getTextureBundle` | ❌ Discards bundles after compile |

**Root Cause of "White/Grainy" Flash**:
`preload.ts` warms the GPU and buffers textures into RAM, but it **discards** the resulting Three.js Texture objects. When the simulation actually spawns rooms, `TextureLODHandler` has an empty cache and triggers a **redundant load**. Until that second load completes (`setTimeout` + disk/cache check), it displays a low-res solid color placeholder. This redundant load also triggers a main-thread GPU upload spike, causing a frame drop just as the "Engine Ready" state is reached.

---

### 1.5.0 — Automate ASSET_REGISTRY via `import.meta.glob` [USER-MOD FRIENDLY]

> **Goal**: Eliminate the manual `import` + registry entry requirement entirely. After this phase, the only step for adding a new texture is dropping files in `assets/textures/<name>/` and referencing the name in `roomMetadata`.

**File**: `src/features/materialsEngine/presets/materials.ts` — **targeted changes only**

**Architecture**:

Vite's `import.meta.glob` scans the project directory at **build time** and generates a static map of all matching files. With `{ query: '?url', import: 'default', eager: true }`, each match resolves instantly to a URL string — equal to the current static `import` approach but without any per-file boilerplate.

```ts
// BEFORE (one block per texture — manual, error-prone):
import woodFloorDiff from "...assets/textures/wood_floor_1/wood_floor_diff_4k.png";
import woodFloorArm from "...assets/textures/wood_floor_1/wood_floor_arm_4k.png";
// ... 24+ more lines

const ASSET_REGISTRY = {
  "wood_floor_1": { diff: woodFloorDiff, arm: woodFloorArm, ... },
  // ... one entry per texture
};

// AFTER — zero per-texture boilerplate:
const _textureGlob = import.meta.glob(
  '../../../assets/textures/**/*.png',
  { query: '?url', import: 'default', eager: true }
) as Record<string, string>;

const ASSET_REGISTRY = buildRegistryFromGlob(_textureGlob);
```

**Map-Type Detection Convention**:
The `buildRegistryFromGlob` function reads the filename and auto-classifies map types using substring detection. All current textures already follow this convention:

| Filename contains | Maps to |
|---|---|
| `_diff` | `diff` (albedo/color map) |
| `_arm` | `arm` (AO + Roughness + Metalness packed) |
| `_nor` or `_nor_gl` | `nor` (normal map) |
| `_disp` | `disp` (displacement map) |
| `_spec` | `spec` (specular, optional) |

> ✅ **Future textures** MUST follow the `<folder_name>/<any_prefix>_{diff|arm|nor_gl|disp|spec}_<suffix>.png` naming convention for auto-detection to work. This constraint replaces the old requirement to manually edit `materials.ts`.

**⚠️ Preservation Rules**:
- `getTextureBundle(assetName)` API signature is unchanged — all callers are unaffected.
- The `TextureBundle` interface is unchanged.
- `configureTexture`, `loadTextureArgs`, and all Three.js texture configuration logic are preserved exactly.
- If a texture folder does not match any of the map type keywords, it is silently skipped (no crash).
- Validate: after the change, all 9 existing texture names must still be discoverable.

**Addition Required**: After implementing, emit a `console.debug` list of all auto-discovered registry entries on init.

---

### 1.5.1 — Fix Lobby Placement Regression

**File**: `src/features/roomPlacement/constraints/placementRules.ts` — **targeted changes only**

**Targeted Change**: Remove `"lobby"` from `isS1Structural` and `isS2Structural` boolean expressions. Lobby should resolve as a blocking room using the standard AABB collision path, identical to Apartments and Offices.

**⚠️ Preservation Rule**: Do NOT modify the `isS1Structural`/`isS2Structural` logic for `"structure"` or  `"empty_floor"` — those remain scaffold types and must retain the bypass logic.

---

### 1.5.2 — Deduplicate Shader Compilation via Visual Signature Set

**Files**:
- `src/features/assetPreloader/api/preload.ts` — **targeted changes**

**Architecture**:
1. Derive a **Visual Signature** per room: `"${wallTex}|${floorTex}|${ceilingTex}"` (pipe-delimited string key).
2. Collect signatures in a `Set<string>`. This deduplicates all rooms sharing the same wall/floor/ceiling combination.
3. Convert the Set to an array of unique `{ wallTexture, floorTexture, ceilingTexture }` objects.
4. Build `materialQueue` only from unique signatures — not from every room entry.
5. Build `textureSet` **dynamically** from signature components (replace static seed list).

**Future-Proof by Design (post Phase 1.5.0)**:
After `1.5.0`, adding a new texture requires **zero code changes** anywhere:
1. Drop files in `assets/textures/<name>/` (follow `_diff/_arm/_nor/_disp` naming).
2. Reference the name in `roomMetadata` via `floorTexture: "marble_floor_1"`.
3. `preload.ts` auto-discovers it via signatures. `materials.ts` auto-discovers it via glob. Done.

**⚠️ Preservation Rules**:
- Do NOT change how `getRoomMaterialsFromMetadata` is called — only reduce how many times it's called.
- Keep `getLobbyMaterials()` and `getStructuralConcreteMaterials()` as explicit additions after the signature loop.

---

### 1.5.3 — Smooth Visual Perception (LERP Interpolation)

**File**: `src/features/assetPreloader/ui/AssetPreloader.tsx` — **targeted changes only**

**Architecture**:
1. Maintain a `targetProgress` ref (updated by `loadingGate.subscribe`) and a `smoothProgress` state.
2. On each `requestAnimationFrame` tick, lerp `smoothProgress` toward `targetProgress` by `(target - current) * 0.12`.
3. The bar always approaches, never overshoots, never halts.

**⚠️ Preservation Rule**: Do NOT use a fake `setInterval`. The lerp simply closes the gap smoothly. The bar can only reach 100% after `loadingGate` fires `'ready'`.

---

### 1.5.4 — Output Texture Pipeline Audit Document

**Goal**: Generate a saved, human-readable audit snapshot of the texture pipeline as it exists post-Phase 1.5 implementation, including: all auto-discovered texture names, their detected map types, and the unique Visual Signatures compiled.

**Output**: Save to `development/texture_pipeline_audit.md`. Regenerate this file whenever the pipeline is extended.

**Mechanism**: Add a dev-time utility function `printTextureRegistryAudit()` to `materials.ts` that:
- Lists all entries in `ASSET_REGISTRY` (name + detected map types)
- Flags any entry missing required maps (`diff`, `arm`, `nor`, `disp`)
- This function is called once on app init in development mode only (`import.meta.env.DEV`)

---

### 🛑 Phase 1.5 Pause — QA Checkpoint
- **Manual Check**: Place room over Lobby → RED indicator. Cannot place. ✅
- **Manual Check**: Place Empty Room over Empty Room → RED indicator. Cannot place. ✅
- **Registry Check**: DevTools console shows list of auto-discovered textures on startup — all 9 current textures present.
- **Performance**: DevTools console dedup log shows Unique signatures < Total rooms.
- **Visuals**: Progress bar glides smoothly without discrete phase jumps.
- **Audit**: `development/texture_pipeline_audit.md` written and contains all texture entries.
- `tsc --noEmit` — Exit 0.


---

## Phase 2: Drawer-Hover Warming (Smart, Non-Blocking, Cancellation-Aware) [COMPLETED]

**Goal**: Begin loading the textures for a sub-room *the moment* the cursor enters its button, not after the click. Abort in-flight loads when cursor leaves or a different item is hovered.

**Guiding Principle**: The warming hook must be fire-and-forget. It must never block render or throw. It must queue one pending load at a time per hover target and discard stale requests.

### 2.1 — Create `useHoverPreloader.ts` (NEW)

**File**: `src/features/assetPreloader/hooks/useHoverPreloader.ts`

```ts
// Design contract (implement cleanly, not verbatim):
export const useHoverPreloader = () => {
  // Tracks the currently in-flight preload promise + its target moduleId
  // On new hover: if same moduleId → noop (already in flight)
  //               if different moduleId → discard old, start new
  // Uses AbortController pattern exposed in TextureLODHandler
  const warmForModule = (moduleId: string) => { ... };
  return { warmForModule };
};
```

**Abort Strategy**:
- `TextureLODHandler.getBundleProgressiveSync` already deduplicates via `activeLoads`. The hook tracks only the *last hovered* `moduleId`. If it changes before the load completes, the reference is replaced. The active load in `TextureLODHandler` continues (it will warm the cache), but UI no longer waits for it.
- If user hovers 5 items rapidly: only the last item's load is "tracked". All 5 may warm cache entries — this is desirable behavior (speculative warming).

### 2.2 — Modify `BuildToolbar.tsx`

**File**: `src/features/ui/toolbars/BuildToolbar.tsx`

**Targeted Change** — Add to the sub-room button's `onPointerEnter`:
```tsx
// BEFORE:
onPointerEnter={() => audioEngine.triggerMenuExpand()}

// AFTER:
onPointerEnter={() => {
  audioEngine.triggerMenuExpand();
  warmForModule(sub.id);    // ← only this line added
}}
```

**⚠️ Preservation Rule**: Touch only `onPointerEnter` on sub-room buttons. Do not modify category-level hover logic, drawer animation, or any click handlers.

### 🛑 Phase 2 Pause — QA Checkpoint
- Open DevTools Network. Hover over a sub-room. Confirm texture XHR requests begin *before* click.
- Hover rapidly over 5 items. Confirm no frozen/error state. Confirm the final clicked room shows no judder.
- Verify `tsc --noEmit` exits clean.

---

## Phase 3: Predictive Cache Promotion

**Goal**: When a user clicks a tool that was already partially warming (due to Startup Preloader or Hover Warming), immediately promote that load to priority resolution and return the best available texture instantly.

**Guiding Principle**: Promotion is a read-path operation in `TextureLODHandler`. Do not modify write paths.

### 3.1 — Modify `TextureLODHandler.ts`

**File**: `src/features/materialsEngine/TextureLODHandler.ts`

**Targeted Change** — Add `promoteToForeground(assetName)` method:

```ts
// If a load is in activeLoads, immediately re-resolve the promise with 
// the highest-fidelity bundle currently available (cached > in-flight > placeholder).
// For in-flight loads, chain a .then() that updates the material map in the caller.
public promoteToForeground(assetName: string): Promise<TextureBundle> { ... }
```

### 3.2 — Modify `useToolPreloader.ts`

**File**: `src/features/assetPreloader/hooks/useToolPreloader.ts`

**Targeted Change** — On `activeModuleId` change, call `promoteToForeground` instead of `getBundleProgressiveSync` when cache already has a partial entry:

```ts
// If memoryCache.has(txName) → instant return (already warm)
// If activeLoads.has(txName) → promoteToForeground (priority chain)
// Else → getBundleProgressiveSync (normal path, unchanged)
```

**⚠️ Preservation Rule**: All existing `useEffect` logic preserved. Only add the `activeLoads` check before the existing `getBundleProgressiveSync` call.

### 🛑 Phase 3 Pause — QA Checkpoint
- Profile: Select Residential, then quickly select Office. No shader recompile stutter.
- Verify: hover → click on same item shows instant full-res texture (no 8px placeholder flash).
- `tsc --noEmit` — Exit 0.

---

## Phase 4.0: FloorBucketIndex — Add Above-Floor Query (Pre-requisite for Phase 4)

**Goal**: Extend `FloorBucketIndex` to expose a `getAboveNodes(y)` method that mirrors `getSupportNodes(y)` but looks one bucket upward. This gives placement logic a complete **3-bucket spatial window**: one floor above / same floor / one floor below.

**Why this matters**: Rooms placed adjacent to multi-floor structures or overhanging units need to check whether the floor above has conflicting geometry (wall adjacency masks, structural overhang). Without an above query, those cells are invisible to the validator.

**Guiding Principle**: Additive-only. Zero change to existing methods or their callers.

### 4.0.1 — Add `getAboveNodes()` to `FloorBucketIndex`

**File**: `src/features/roomPlacement/constraints/spatialIndex.ts` — **targeted change only**

**Targeted Change** — Add one method directly below `getSupportNodes`:
```ts
/** Returns nodes on the floor directly ABOVE the given Y. */
getAboveNodes(y: number): SimulationNode[] {
  const aboveY = y + STRUCTURAL_CONSTANTS.FLOOR_HEIGHT;
  return this.buckets.get(floorBucketKey(aboveY)) ?? [];
}
```

**⚠️ Preservation Rules**:
- Do NOT modify `getSupportNodes`, `getFloorNodes`, or `getStructuralFloorNodes`.
- Do NOT change `floorBucketKey`, bucket construction, or `STRUCTURAL_CONSTANTS`.
- New method is purely additive — no existing callers are touched.

### 4.0.2 — Wire `getAboveNodes()` into `checkStructuralIntegrity`

**File**: `src/features/roomPlacement/constraints/structuralIntegrity.ts` — **targeted change only**

**Targeted Change** — Query the above-floor nodes alongside the existing below-floor nodes:
```ts
// EXISTING (preserve):
const supportsBelow = index ? index.getSupportNodes(y) : allShapes.filter(
  s => Math.abs(s.position[1] - (y - FLOOR_HEIGHT)) < 10
);

// ADD alongside (do not replace):
const nodesAbove = index ? index.getAboveNodes(y) : allShapes.filter(
  s => Math.abs(s.position[1] - (y + FLOOR_HEIGHT)) < 10
);
// Pass nodesAbove into getMaxCantileverLogic as the adjacency-above argument.
// ⚠️ Verify getMaxCantileverLogic signature before adding argument — prefer additive optional param.
```

**⚠️ Preservation Rules**:
- Verify `getMaxCantileverLogic` signature accepts optional above-nodes before modifying call site.
- If it does not, add a separate adjacency guard at the `checkStructuralIntegrity` level only.
- Do NOT change the `maxOverhang` constant or the return shape of `checkStructuralIntegrity`.

### 4.0.3 — Update Architecture Overview (Scope Declaration)

All existing "Scope Confirmed" notes stating "same floor + one below" are superseded by:

> ✅ **Scope Confirmed**: `FloorBucketIndex` checks a **3-bucket window**: `getAboveNodes(y)` (one floor up), `getFloorNodes(y)` (same floor), `getSupportNodes(y)` (one floor below). Does NOT scan the full tower.

### 🛑 Phase 4.0 Pause — QA Checkpoint
- `tsc --noEmit` — Exit 0 before and after the change.
- Add a temporary `console.debug('[FBI-above] count=%d', index.getAboveNodes(y).length)` inside `checkStructuralIntegrity` and verify it returns non-zero when rooms exist above.
- Remove debug log.
- **User functional check**: Place a room adjacent to a unit one floor above — verify indicator color is still correct and immediate.

---

## Phase 4: Worker Pool Expansion (Routing + Analysis Tasks)

**Goal**: Register real tasks for the idle `routing` and `analysis` worker roles. Offload the synchronous `PlacementIndicator` validation (which runs on every `useFrame`) to the worker pool using the existing async `checkPlacementAuthoritative` path.

**Worker Audit Summary**:

| Role | Count | Current Load | Gap |
|---|---|---|---|
| `layout` | 2 | `CheckPlacement`, `SyncSpatialHash` | Placement indicator updates still call sync main-thread path |
| `routing` | 1 | **EMPTY** | Zero registered tasks |
| `analysis` | 1 | **EMPTY** | Zero registered tasks |

### 4.1 — Register Analysis Task: `simulation/validate-structural-integrity`

**File**: `src/worker/workerTasks.ts`

**Targeted Change** — Add to `registerAnalysisTasks()`:
```ts
registerWorkerTask<StructuralIntegrityPayload, StructuralIntegrityResult>(
  SIMULATION_TASK_TYPE.ValidateStructuralIntegrity,
  (payload) => {
    // Mirrors checkStructuralIntegrity() from placementRules.ts
    // Runs entirely off-thread
  }
);
```

Add protocol types to `src/shared/worker/protocol.ts`:
```ts
ValidateStructuralIntegrity: 'simulation/validate-structural-integrity'
```

### 4.2 — Register Routing Task: `simulation/resolve-overlaps`

**File**: `src/worker/workerTasks.ts`

**Targeted Change** — Implement `registerRoutingTasks()` (currently placeholder):
```ts
registerWorkerTask<ResolveOverlapsPayload, ResolveOverlapsResult>(
  SIMULATION_TASK_TYPE.ResolveOverlaps,
  (payload) => {
    // Existing ResolveOverlapsPayload/Result types already defined in protocol.ts
    // Implement the actual AABB de-overlap resolution here
  }
);
```

### 4.3 — PlacementIndicator: Correctness-First Approach

> ⚠️ **CRITICAL SAFETY CONSTRAINT — read fully before any code changes in this section.**

**Architecture Invariants (do not violate under any circumstances)**:
- The placement indicator **color (green/red) must have zero perceptible delay**. It drives user placement decisions in real-time at 60fps and is the primary placement affordance.
- After Phase 4.0, `FloorBucketIndex` uses a **3-bucket window**: one floor above, same floor, one floor below. This scoping must be mathematically preserved in any worker-side equivalent.
- The indicator position lerp, snap-grid, ghost mesh, and pulse animation logic must remain entirely untouched.
- Nearby cell/empty-room/wall mask adjacency checks (inside `validatePlacement` → `checkStructuralIntegrity`) must run on every frame evaluation, identical to current behavior.

> ✅ **Scope Confirmed (3-bucket, post Phase 4.0)**: `FloorBucketIndex` queries `getAboveNodes(y)` (one floor up), `getFloorNodes(y)` (same floor), `getSupportNodes(y)` (one floor below). Does NOT scan the full tower.


**Phase 4.4a — Baseline Diagnostic (no code change)**:
1. Add a temporary `console.debug('[PI] valid=%s pos=%s', isValid, snappedX+','+snappedY)` inside `useFrame`.
2. Verify in DevTools Console: logs fire at 60fps; valid/invalid matches visual color accurately.
3. ⛔ **If logs contain positions outside the current floor's bucket — STOP immediately and report to user before continuing.**
4. Capture a DevTools Performance snapshot as baseline.
5. Remove the debug log.
6. 🛑 **User functional check**: verify indicator color is pixel-instant, snap is correct, no false positives/negatives. User explicitly approves before 4.4b.

**Phase 4.4b — Worker Mirror (async as secondary only, if 4.4a approved)**:
- Register a worker-side `CheckPlacement` task mirroring identical `FloorBucketIndex` scoping.
- Worker result is used **only as a telemetry/ACK log** — it does **NOT drive indicator color**.
- Indicator color continues to use the synchronous main-thread path unchanged.
- 🛑 **User functional check**: indicator behavior must be bitwise identical to 4.4a baseline.

**Phase 4.4c — Optional Hybrid Color Update (only if user explicitly requests)**:
- Only propose swapping the sync call for a worker-deferred result if worker round-trip latency is confirmed ≤1 frame (≤16ms) on a real profile.
- If any visible lag or missed color flash is reported: abort and revert to sync path.
- 🛑 **User functional check**: place rooms rapidly across multiple floors; confirm no missed red/green flashes, no ghost placements.

**⚠️ Final Preservation Rules**:
- Do NOT modify `FloorBucketIndex` scoping or bucket logic.
- Do NOT modify the lerp, ghost mesh, snap, or pulse animation.
- Do NOT change `validatePlacement` or `checkStructuralIntegrity` call signatures.
- `SyncSpatialHash` worker broadcast remains fire-and-forget (existing behavior, no change).

### 🛑 Phase 4 Pause — QA Checkpoint
- Phase 4.1–4.3: Verify `routing` and `analysis` worker roles appear in health-check logs.
- Phase 4.4: **User functional check is mandatory at every sub-step before proceeding.**
- Place 20+ rooms rapidly across multiple floors. Zero correctness regressions.
- `tsc --noEmit` — Exit 0.
- `npm run build` — no circular dependency warnings.


---

## Verification & QA

- Run `tsc --noEmit` at end of each phase.
- Run `npm run build` before Phase 4 to confirm no bundle circular deps.
- Manual: Open DevTools Network. Measure time from tab-open to first texture XHR complete vs. overlay disappear.
- Manual: Profile with DevTools Performance. Confirm frame times remain under 16ms during rapid placement.

---

| 2026-04-16 | Phase 1 | COMPLETED: Truthful progress gated by real XHR/GPU compilation. |
| 2026-04-16 | Phase 1.5 | COMPLETED: Automated registry via glob, deduplicated shaders, fixed lobbies, and bridged cache. |
| 2026-04-16 | Phase 2 | COMPLETED: Implemented speculative hover-warming via BuildToolbar integration. |
