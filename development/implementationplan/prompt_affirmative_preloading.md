# Prompt: Affirmative Asset Preloading & Worker Optimization

## User Prompt (Verbatim)

> Use instructions located in @[development/newplan_skill.md] to recreate and enhance your Analysis-Findings-based plan and tasks as new .md files(as directed within the skill), based on your recent analysis of the texture preloading system(the artifacts you created were cleared from brain)
>
> Use the implementation plan and associated tasks created by the skill as a source of truth. You may use your artifact system to enhance/augment the process but ensure that each artifact is injected into its respective .md source of truth document(plan,tasks, both) to ensure that ultimately the newplan_skill.md-generated implementation plan markdown file and associated tasks markdown file remain the source of truth and cumulative history document of the entirety of the development, from cradle to grave of the feature.
>
> Ensure each new feature is entirely modular and in compliance with feature slice design.
>
> Proposed "Affirmative Preloading" Strategy
> Drawer-Hover Warming (ensure this is non-blocking, smart, and will abort as appropriate, smartly in favor of more relevant loading, in the case a user hovers over multiple entries before selecting one or clicks multiple items/multiple times)
>
> Asynchronous Compilation Sync- expand your existing idea into potentials not addressed to improve performance anywhere possible especially when placing rooms or loading the game initially.
>
> Predictive Cache Promotion: I will ensure that if a user selects a tool that was already partially warmed by the startup preloader, we "promote" that load to high-priority instantly.
>
> When the game is first loading there is an 'initializing' something or other text that disappears long before textures and everything is loaded. Can we expand this feature to smartly display that the game is still loading?
>
> Determine if the worker is being fully utilized and is sufficiently advanced to ensure maximum performance without breaking any current logic. Predict potential improvements based current program needs.

---

## AI Analysis

### 🔎 Source Analysis

The prior audit of the preloading pipeline surfaced the following confirmed findings:

| Area | Status | Evidence |
|---|---|---|
| **Subsequent room placements** | ✅ OPTIMAL | `MaterialParser` caches+shares `THREE.Material` by cache-key. VRAM is shared across identical rooms. |
| **Startup preloading** | ⚠️ PARTIAL | `AssetPreloader` calls `renderer.compile()` synchronously before 4K texture promises resolve. GPU compiles with placeholder 8px data, requiring a hot-swap on first placement. |
| **Build menu effectiveness** | ❌ SUB-OPTIMAL | `useToolPreloader` only fires on `activeModuleId` change (i.e., after click). Hover has 0ms of predictive advantage. |
| **Loading screen accuracy** | ❌ LIE | Progress bar simulates 95% via `setInterval` and then jumps to 100%. The "Initializing" overlay vanishes regardless of actual GPU/texture readiness. |
| **Worker utilization** | ⚠️ UNDERUTILIZED | `routing` and `analysis` roles registered but have no tasks. `CheckPlacement` runs synchronously on the main thread during placement indicator updates; the async worker path is reserved for "authoritative" checks but never called. SpatialHash sync is fire-and-forget broadcast with no ACK. |

---

### 🧭 Axiomatic Intent (AmI)
The system must never block the render thread for I/O or GPU operations. Asset loading, texture promotion, and worker coordination must be provably non-blocking, cancellation-aware, and priority-driven.

### 📊 Axiological Intent (AlI)
The standard of value is **premium UX perf**: zero judder on first placement, truthful loading feedback, and a feel of instantaneous response. Every millisecond of preparation that moves from click-time to hover-time is a perceived performance win.

### 🎯 Teleological Intent (TlI)
The goal is to transform the current opportunistic preloading into a fully **affirmative, speculative preloading pipeline** with: hover-predictive warming, priority-promoted cache slots, a truthful GPU-gated loading screen, and a properly utilized async worker pool that offloads at least placement validation from the main thread.

---

## Update — User Prompt 2 (Verbatim)

> update the plan/tasks/prompt:
> For the checkplacement portion of this plan/tasks - and appended to the end of the verbatim user prompt,
>
> please ensure that the intent of the room placement indicator, the function of the indicator, and any related logic remains fully functional. The logic is extremely important and quite delicate. The indicator color should be based on the underlying validity checks with no delays and the indicator its self should always accurately reflect where the room will place. The underlying placement logic and associated nearby empty room/wall handling is absolutey imperative. Nearby cells and rooms on the same floor, and above/below must be checked as they currently are. (if the entire tower is being checked please warn me of this because it should not be so broad)
> Thus we must ensure that with each step there is a review/diagnostic/QA and potentially a user-level functional check.

---

## AI Analysis — Addendum: Placement Indicator Safety

### 🔍 Current Placement Architecture Audit

| Component | Scope | Status |
|---|---|---|
| `FloorBucketIndex` | O(1) — only same-floor bucket | **SAFE** — does NOT scan full tower |
| `validatePlacement` in `placementRules.ts` | Uses `FloorBucketIndex.getFloorNodes(y)` | **SAFE** — scoped to current floor |
| `checkStructuralIntegrity` | Uses `getStructuralFloorNodes(y)` + `getSupportNodes(y)` (floor below only) | **SAFE** — checks same floor + one floor below |
| `PlacementIndicator` useFrame | Calls `checkPlacement()` synchronously on every frame at cursor position | **AT RISK** — moving to async must preserve color immediacy |

> ✅ **CONFIRMED**: The current implementation does NOT scan the entire tower. `FloorBucketIndex` is partitioned by floor-Y bucket (`Math.round(y / 40)`). Collision checks are restricted to the same floor bucket; structural support checks look one bucket below. This architecture must be preserved exactly.

### 🧭 Updated Axiomatic Intent for Phase 4.4

- The placement indicator **color** (green/red) must have **zero perceptible delay**. It is a primary affordance — users depend on it to decide where to click.
- If the async worker path introduces any latency that makes the indicator lag behind the cursor, **the synchronous main-thread path must be retained as the primary path**, with the worker as an optional ACK-confirmation layer only.
- The indicator snapping position logic (lerp, snap grid) must not be touched.
- The floor-level scope of `FloorBucketIndex` must not be widened. Any proposed worker-side implementation must mirror the same bucket-scoped logic exactly.
- Every sub-step of Phase 4.4 requires a **user-level functional check**: the user must personally verify the indicator remains pixel-accurate and instantly responsive before any commit.

### 📊 Revised Teleological Intent for Phase 4.4

The worker offload for `PlacementIndicator` is **lower priority than correctness and UX parity**. If the async path cannot match the synchronous path's perceived immediacy, we will **retain the synchronous path** and use the worker exclusively for the post-click authoritative confirmation (which already exists via `checkPlacementAuthoritative`). The primary value of Phase 4 remains registering routing/analysis tasks and enabling the `ResolveOverlaps` worker path — not modifying the indicator.

---

## TURN 4: Texture Pipeline Audit & Future-Proof Deduplication

### Verbatim User Prompt
> I like the idea of a set of unique combinations and Shader Redundancy Optimization, lets make sure its future proof and complys with our current logic. Right now our materialsEngine loads textures from assets>textures (if i recall). assets>textures is the source of all our textures however it WILL be expanded. Can we make our tuple accommodate an ever-expanding set based on what textures we have in textures->assets? please also verify and report if our materialsEngine does currently read roommetadata or textures. Please follow our textures through their pipeline and ensure that our Shader Redundancy Optimization is future proof for adding more textures to more rooms. There will never be as many textures as rooms and many/most will be reused.

### 🔍 Confirmed Texture Pipeline (End-to-End)

```
assets/textures/<name>/              ← SOURCE OF TRUTH. All 4K PNGs.
       ↓ (static Vite import)
materials.ts :: ASSET_REGISTRY       ← CHOKEPOINT: import + entry required for every new texture.
       ↓
materials.ts :: getTextureBundle()   ← Loads PNGs → THREE.Texture → TextureBundle
       ↓
TextureLODHandler :: getBundleProgressiveSync()  ← Caches via memoryCache/activeLoads
       ↓
MaterialParser :: parseRoomMaterial()  ← MeshPhysicalMaterial + Triplanar shader, cached by config key
       ↓
getRoomMaterialsFromMetadata()       ← Reads {wallTexture, floorTexture, ceilingTexture} from roomMetadata
       ↓ (currently O(N) per room)
preload.ts                           ← ⚠️ No dedup. 600+ dummy meshes to compiler.
```

### ✅ Confirmed Answers
- **Does materialsEngine read roomMetadata?** → **No** — it only reads texture name strings passed to it.
- **Does materialsEngine read assets/textures directly?** → **Indirectly** via `ASSET_REGISTRY` static imports in `materials.ts`.
- **Where does everything lead?** → `assets/textures/` → `ASSET_REGISTRY` → `getTextureBundle` → `TextureLODHandler` → `MaterialParser`.

### 📐 Future-Proof Strategy
The Visual Signature Set is inherently self-expanding:
- `preload.ts` reads texture names from `roomMetadata` → builds `Set<string>` of pipe-delimited keys.
- Any new texture referenced in `roomMetadata` automatically appears in the warming and dedup sets.
- **Only required for new texture**: (1) add files to `assets/textures/`, (2) register in `materials.ts::ASSET_REGISTRY`. `preload.ts` needs no changes.

| File | Needs Change for New Texture? |
|---|---|
| `assets/textures/` | ✅ Add directory + PNGs |
| `materials.ts::ASSET_REGISTRY` | ✅ Add import + entry |
| `roomMetadata.json` | ✅ Reference name in room metadata |
| `preload.ts` | ❌ Auto-detected from metadata |
| `TextureLODHandler` | ❌ No |
| `MaterialParser` | ❌ No |

---

## TURN 5: ASSET_REGISTRY Automation (User-Mod Friendly)

### Verbatim User Prompt
> is it possible to automate the add one entry to materials.ts::ASSET_REGISTRY so that in the future all I have to do is drop files in the assets/textures/<name> and reference the new name in roomMetadata.json? We need this user-mod friendly and easily expandable. Also add a task to output a new texture pipeline audit like the one you just did so i can see/save it.

### ✅ Yes — Fully Automatable via `import.meta.glob`

Vite's `import.meta.glob` is a build-time mechanism that scans the filesystem by pattern and generates a static map. It is **exactly equivalent** to the current approach of manual `import` statements, but requires zero per-file boilerplate.

**Implementation**: Replace all 24+ static `import` lines and the manual `ASSET_REGISTRY` object in `materials.ts` with:
```ts
const _glob = import.meta.glob('../../../assets/textures/**/*.png', { query: '?url', import: 'default', eager: true });
const ASSET_REGISTRY = buildRegistryFromGlob(_glob);
```

### 📐 Naming Convention (The Only Constraint)
Future textures must follow the existing naming pattern for map-type auto-detection:
- `_diff` in filename → albedo/color
- `_arm` in filename → AO/Roughness/Metalness
- `_nor` or `_nor_gl` in filename → normal
- `_disp` in filename → displacement  
- `_spec` in filename → specular (optional)

All 9 current textures already conform. This replaces the old manual `ASSET_REGISTRY` entry.

### ✅ Post-1.5.0 Workflow for New Textures
1. Drop files in `assets/textures/<name>/` (follow naming convention above)
2. Reference `<name>` in `roomMetadata.json` on a room entry
3. Done. Zero code changes required.

### 📋 Texture Pipeline Audit Task
Added Phase 1.5.4: A `printTextureRegistryAudit()` dev utility function in `materials.ts` that outputs all discovered textures + map type coverage to the console. Output is saved to `development/texture_pipeline_audit.md`.
