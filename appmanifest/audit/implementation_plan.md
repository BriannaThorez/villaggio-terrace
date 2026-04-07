# roomPlacement Feature Audit — Implementation Plan

> **Scope**: `src/features/roomPlacement/**` + external consumers  
> **Date**: 2026-04-06  
> **Status**: First Pass — Discovery Complete

---

## File Inventory (16 Files)

| # | File | Size | Role |
|---|------|------|------|
| 1 | `constraints/placementRules.ts` | 2.0 KB | Collision + structural validation orchestrator |
| 2 | `constraints/structuralIntegrity.ts` | 6.4 KB | Cantilever overhang physics |
| 3 | `emptyFloor/EmptyFloorRoom.tsx` | 3.8 KB | Visual component for vacant structural scaffolds |
| 4 | `residential/base/ResidentialRoom.tsx` | 6.9 KB | Visual component for inhabited rooms |
| 5 | `structural/graph/cellBeamGraph.ts` | 30 KB | Core structural graph engine |
| 6 | `structural/graph/cellBeamGraph.test.ts` | 10 KB | Unit tests for graph engine |
| 7 | `structural/graph/contract.ts` | 4.8 KB | Type contracts for structural metadata |
| 8 | `structural/graph/helpers.ts` | 0.5 KB | Beam ID query helpers |
| 9 | `structural/graph/index.ts` | 91 B | Barrel re-export |
| 10 | `structural/geometry/index.ts` | 22 KB | Shell geometry builder & validation |
| 11 | `structural/types/index.ts` | 4.3 KB | Room face types, opening definitions |
| 12 | `structural/skin/RoomSkin.tsx` | 5.7 KB | Drywall skin renderer |
| 13 | `structural/skin/facePanels.ts` | 2.7 KB | Cutout outline point builder |
| 14 | `structural/components/` | 0 B | **EMPTY DIRECTORY** |
| 15 | `visuals/RoomMeshCSG.tsx` | 3.6 KB | CSG boolean subtraction engine |
| 16 | `visuals/WindowGenerator.ts` | 1.5 KB | Modular window cutout generator |
| 17 | `visuals/InternetConnectivity.tsx` | 2.3 KB | Lobby connectivity line renderer |
| 18 | `objects/` | 0 B | **EMPTY DIRECTORY** |

---

## A) Orphaned / Legacy / Unused Code

### 🔴 Critical (Confirmed Dead Code)

| ID | Item | File | Evidence |
|----|------|------|----------|
| A1 | `sharedGeometries` object | `ResidentialRoom.tsx:46-49` | Declared but **never referenced** anywhere in the codebase. Two `THREE.BoxGeometry` allocations wasted on every module load. |
| A2 | `drywallPanelMaterial` | `RoomSkin.tsx:111-124` | Created, disposed in cleanup, but **never applied to any mesh**. The component only renders `<Line>` elements for cutout outlines — no `<mesh>` uses this material. |
| A3 | `frontFaceMaterial` | `RoomSkin.tsx:126-139` | Same as A2 — created, disposed, **never used**. The face-planes were removed (comment on line 178: "Redundant face planes removed"). |
| A4 | `drywallTexture` bundle | `RoomSkin.tsx:106-109` | Created via `createReusableDrywallTextureBundle` and released in cleanup, but the returned texture is **never applied** to any material map. `drywallPanelMaterial` is in the dependency array but never uses `drywallTexture.map`. |
| A5 | `structural/components/` dir | — | **Empty directory**. No files, no purpose. |
| A6 | `objects/` dir | — | **Empty directory**. No files, no purpose. |
| A7 | `deriveRoomPlacementZones` | `geometry/index.ts:684` | Exported alias of `buildPlacementZones`. **Zero consumers** outside the file. |
| A8 | `deriveRoomAnchors` | `geometry/index.ts:686` | Exported function. **Zero consumers** outside the file. |
| A9 | `deriveRoomValidationOverlay` | `geometry/index.ts:749` | Exported function. **Zero consumers** outside the file. |
| A10 | `buildRoomStructuralLayout` | `geometry/index.ts:554` | Exported function. **Zero consumers** outside the file. Only called internally but the internal caller itself is unused. |
| A11 | `buildRoomFaceBounds` | `facePanels.ts:12` | Exported function. **Zero consumers** — only `buildCutoutOutlinePoints` is imported from this file. |
| A12 | `getCanonicalFaceBeamIds` | `helpers.ts:5` | Only consumed in **test file** (`cellBeamGraph.test.ts`). Zero production consumers. |
| A13 | `getNeighborSharedWallBeamIds` | `helpers.ts:10` | Only consumed in **test file**. Zero production consumers. |

### 🟡 Suspicious (Investigate Further)

| ID | Item | File | Notes |
|----|------|------|-------|
| A14 | `StructuralFace` duplicate type | `types/index.ts:5` vs `contract.ts:6-12` | Two **different** `StructuralFace` types exist. `types/` version has 4 values; `contract.ts` version has 6 (includes ceiling/floor). Potential naming collision. |
| A15 | `FACE_ORDER` constant | Duplicated in `RoomSkin.tsx:25`, `cellBeamGraph.ts:54`, `geometry/index.ts:18` | Three separate declarations of the same constant. Should be centralized. |
| A16 | `BACK_FACE_Z = 0` | `facePanels.ts:9` | Name suggests a non-zero value. May be a legacy bug or placeholder. |

---

## B) Performance Bottlenecks

### 🔴 Critical

| ID | Issue | File | Impact | Resolution |
|----|-------|------|--------|------------|
| B1 | **O(N²) global scan on every placement** | `structuralIntegrity.ts:12-14` | `getCluster()` does `allShapes.filter()` on the entire simulation state, then BFS with `floorNodes.forEach()` inside a `while` loop. This is O(N²) for N rooms on the same floor. | **Spatial hash grid**: Bucket rooms by `floorY` (integer division by 40). Query only the bucket for the target floor. Reduces to O(K) where K is rooms on the same level. |
| B2 | **O(N) linear scan for collision** | `placementRules.ts:42-61` | `validatePlacement` iterates all shapes for AABB overlap. Called on every drag frame. | **Axis-aligned interval tree** or same spatial hash as B1. Share the index between collision and structural checks. |
| B3 | **Unmemoized CSG recomputation** | `RoomMeshCSG.tsx` entire component | The `<Geometry>` component from `@react-three/csg` recomputes all boolean subtractions on any prop change. No `React.memo()` wrapper. | Wrap in `React.memo()` with custom comparator. Cache the resulting `BufferGeometry` when the room is finalized (not being dragged). |
| B4 | **Unused materials created every render cycle** | `RoomSkin.tsx:111-139` | Two `MeshStandardMaterial` instances + a texture bundle are created, never used, then disposed. Pure waste. | Remove dead material code (see A2-A4). |
| B5 | **`roomGeometry` not used in JSX** | `ResidentialRoom.tsx:83` | `roomGeometry` is assigned from `roomGeometryResult.shellGeometry` but is **only** referenced in the cleanup `useEffect` comparison (line 120). The actual rendering uses `RoomMeshCSG` instead. Dead allocation. | Remove the `roomGeometry` assignment and the cleanup effect. The CSG component manages its own geometry lifecycle. |

### 🟡 Moderate

| ID | Issue | File | Impact | Resolution |
|----|-------|------|--------|------------|
| B6 | **`geometry/index.ts` is 762 lines / 22KB** | — | Large file = slow IDE parsing, hard to tree-shake. | Split into `validation.ts`, `shell.ts`, `layout.ts`, `anchors.ts`. |
| B7 | **Diagnostic "BED" mesh in production** | `ResidentialRoom.tsx:166-197` | A hardcoded debug bed mesh with `computeSnappedWorldOffset()` call runs on **every** residential room. | Gate behind `isGridVisible` or remove entirely. |

---

## C) Logic Quality & Accuracy

### 🔴 Critical

| ID | Issue | File | Impact | Resolution |
|----|-------|------|--------|------------|
| C1 | **Hardcoded floor height magic numbers** | `structuralIntegrity.ts:56,58,65` | `y < 10`, `y - 40`, `< 10` — these assume fixed 40-unit floors and 10-unit ground height. If room height changes, the physics breaks silently. | Extract `FLOOR_HEIGHT`, `GROUND_THRESHOLD` constants into a shared config. |
| C2 | **Inconsistent epsilon values** | `structuralIntegrity.ts:33` (1.0) vs `:76` (0.1) vs `placementRules.ts:54` (0.1) | Three different "closeness" thresholds for the same adjacency concept. The 1.0 epsilon on line 33 means rooms up to **1 full unit apart** are considered "touching" — this is an entire cell boundary of slack. | Standardize on a single `ADJACENCY_EPSILON` constant. |
| C3 | **`InternetConnectivity` filters for dead room type** | `InternetConnectivity.tsx:10` | Filters for `s.type === 'floor'` — this type does not appear in the current `SimulationNodeType` enum. The `'floor'` type was replaced by `'empty_floor'` but this filter was never updated. | Update to `'empty_floor'` or investigate if this entire component still serves a purpose. |
| C4 | **`RoomSkin` renders zero visual content** | `RoomSkin.tsx:165-199` | After the comment "Redundant face planes removed" (line 178), the component only renders `<Line>` cutout outlines — dashed guide lines. All material creation and texture allocation is wasted. The component exists solely for a decorative dashed-line overlay. | Either fully integrate the drywall face rendering back (if intended) or strip the dead material logic and rename to `CutoutOutlineOverlay`. |

### 🟡 Moderate

| ID | Issue | File | Impact | Resolution |
|----|-------|------|--------|------------|
| C5 | **`sharedTrimMaterial` module-level singleton** | `ResidentialRoom.tsx:40-44` | Module-level `new THREE.LineBasicMaterial()` — never disposed. Minor memory leak on HMR. | Move into a `useMemo` or a shared singleton with explicit lifecycle. |
| C6 | **No early-exit in `validatePlacement` collision loop** | `placementRules.ts:42` | Uses `for...of` but structural check runs first regardless of whether it's needed. For `isForce=true`, collisions are detected but never cause rejection — yet the loop still runs. | Short-circuit: if `isForce`, skip collision entirely. |
| C7 | **`StructuralFace` type collision** | `types/index.ts:5` vs `contract.ts:6` | Two incompatible types with the same name exported through different paths. Consumer code could import the wrong one silently. | Rename `types/index.ts` version to `RoomWallFace` or merge into a single source of truth. |

---

## Corrective Execution Order

1. **Phase 0 — Dead Code Purge** (A1-A13, A16): Remove all confirmed dead code. Zero-risk, immediate savings.
2. **Phase 1 — Performance Hot Path** (B1-B5): Implement spatial hashing, `React.memo()` CSG, and remove dead material allocations.
3. **Phase 2 — Logic Hardening** (C1-C4): Standardize constants, fix dead type filter, strip RoomSkin dead weight.
4. **Phase 3 — Structural Refactoring** (B6-B7, C5-C7, A14-A15): Split monolith files, centralize constants, resolve type collisions.

See [audit_tasks.yaml](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/appmanifest/audit/audit_tasks.yaml) for granular tracking.
