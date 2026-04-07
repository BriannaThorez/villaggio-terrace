# roomPlacement Feature Audit — Detailed Log

> **Scope**: `src/features/roomPlacement/**`  
> **Date**: 2026-04-06  
> **Methodology**: Exhaustive file-by-file static analysis + cross-reference grep mapping

---

## Discovery Methodology

Every file in `src/features/roomPlacement` was read in full. Every exported symbol was cross-referenced via `grep_search` across the entire `src/` tree. The following categories were applied:

- **DEAD**: Zero production consumers. Only exists in tests or self.
- **ORPHANED**: Created/allocated but never applied or rendered.
- **BOTTLENECK**: Algorithmic complexity exceeds O(N) on a hot path.
- **BRITTLE**: Relies on magic numbers or inconsistent constants.
- **DUPLICATE**: Same concept defined in multiple locations.

---

## File-by-File Analysis

### `constraints/structuralIntegrity.ts` (162 lines)

**Purpose**: Calculates cantilever overhang for structural placement validation.

**Findings**:
1. **[BOTTLENECK] O(N²) BFS + global filter** (lines 12-14, 26-39): `getCluster()` does `allShapes.filter()` filtering ALL simulation nodes, then performs BFS with `floorNodes.forEach()` inside a `while(queue)` loop. For a building with 100 rooms, this is ~10,000 comparisons per placement frame.
2. **[BRITTLE] Magic numbers** (lines 56, 58, 65): `y < 10` (ground threshold), `y - 40` (floor below offset), `< 10` (support proximity). These embed architectural assumptions directly in physics code.
3. **[BRITTLE] Inconsistent epsilon** (line 33): Uses `1.0` for adjacency tolerance — an entire cell width of slack. Compare to `0.1` used on line 76 for support detection. The 10x discrepancy means the cluster algorithm is extremely "generous" about what constitutes adjacency.
4. **[LOGIC] Dead parameters**: `targetType` parameter is accepted by both `getMaxCantilever` and `checkStructuralIntegrity` but **never used** in any logic branch.

### `constraints/placementRules.ts` (65 lines)

**Purpose**: Orchestrates collision + structural validation.

**Findings**:
1. **[BOTTLENECK] O(N) linear collision scan** (lines 42-61): Iterates every shape for AABB overlap on every drag frame. Should use spatial indexing.
2. **[LOGIC] Wasteful `isForce` path** (lines 57-59): When `isForce=true`, collisions are detected but the loop continues without returning. The collision detection work is wasted.
3. **[QUALITY] Missing `depth` parameter**: Collision check only tests X and Y axes. No Z-axis depth collision is validated. This is fine for 2D placement but could cause issues if rooms have different depths.

### `emptyFloor/EmptyFloorRoom.tsx` (120 lines)

**Purpose**: Renders vacant structural scaffolds with glass windows.

**Findings**:
1. **[QUALITY] Good**: Clean, modular. Uses `WindowGenerator` for cutout generation.
2. **[MINOR] `id` prop unused**: The `id` prop is accepted but never referenced in the component body.

### `residential/base/ResidentialRoom.tsx` (202 lines)

**Purpose**: Renders inhabited rooms with CSG shell + skin + diagnostic grid.

**Findings**:
1. **[ORPHANED] `sharedGeometries`** (lines 46-49): Two `THREE.BoxGeometry` objects created at module level. **Never referenced** in any render or effect.
2. **[ORPHANED] `roomGeometry`** (line 83): Assigned from `roomGeometryResult.shellGeometry`. Only referenced in cleanup effect (line 120). The actual render uses `RoomMeshCSG` which builds its own geometry internally. This is a legacy artifact from before CSG was introduced.
3. **[QUALITY] Diagnostic bed permanently rendered** (lines 166-197): A hardcoded orange "BED" mesh with pillow geometry runs in production on every residential room. Not gated behind any debug flag. The `computeSnappedWorldOffset` call on line 168 is executed on every render.
4. **[PERFORMANCE] `buildRoomShellGeometry` called but result partially unused** (line 80): The full shell geometry pipeline runs, but only the cleanup effect uses the result. The CSG path duplicates this work internally.

### `structural/skin/RoomSkin.tsx` (202 lines)

**Purpose**: Originally rendered drywall face panels. Now only renders cutout outline `<Line>` overlays.

**Findings**:
1. **[ORPHANED] `drywallPanelMaterial`** (lines 111-124): A `MeshStandardMaterial` is created from `parseMaterial()`, style configured, then disposed in cleanup. **Never applied to any `<mesh>`**.
2. **[ORPHANED] `frontFaceMaterial`** (lines 126-139): Same pattern — created, configured, disposed. **Never used**.
3. **[ORPHANED] `drywallTexture`** (lines 106-109): A reusable texture bundle is created and released. **Never applied** to either material's `.map` property. The `drywallTexture` variable sits in the `useMemo` dependency array of `drywallPanelMaterial` but is never actually spread or assigned.
4. **[DEAD] Face panel rendering removed** (line 178): Comment states "Redundant face planes removed in favor of unified CSG approach". The component now exists solely for `<Line>` cutout outlines (lines 179-198).
5. **[WASTE] Props accepted but unused**: `material` and `frontFaceVisibility` props drive material creation that is never rendered.

### `structural/skin/facePanels.ts` (115 lines)

**Purpose**: Builds cutout outline 3D points for `RoomSkin`.

**Findings**:
1. **[DEAD] `buildRoomFaceBounds`** (line 12): Exported but has **zero consumers** outside this file. Not even imported by `RoomSkin.tsx`.
2. **[SUSPICIOUS] `BACK_FACE_Z = 0`** (line 9): Named constant suggests offset, but value is `0`. Possibly a leftover from when back faces had a different Z-offset.

### `structural/graph/cellBeamGraph.ts` (999 lines, 30KB)

**Purpose**: Core structural graph engine — cell footprints, beam generation, adjacency.

**Findings**:
1. **[COMPLEXITY] Monolith file**: 999 lines, 44 outline items. Contains coordinate math, graph algorithms, beam generation, serialization, comparison functions, and adjacency accumulation all in one file.
2. **[QUALITY] Well-tested**: Companion test file exists with 10KB of coverage.
3. **[DUPLICATE] `FACE_ORDER`** (line 54): Same constant defined in `RoomSkin.tsx:25` and `geometry/index.ts:18`.
4. **[DUPLICATE] `canonicalFacePriority`** (line 459): Another face ordering array identical in content to `FACE_ORDER`.

### `structural/graph/helpers.ts` (14 lines)

**Purpose**: Convenience functions for querying beam IDs from room metadata.

**Findings**:
1. **[DEAD] `getCanonicalFaceBeamIds`**: Only consumed in test file. Zero production calls.
2. **[DEAD] `getNeighborSharedWallBeamIds`**: Only consumed in test file. Zero production calls.
3. **[DUPLICATE] `uniqueSortedIds`** (line 3): Private helper that duplicates `sortedUnique` in `cellBeamGraph.ts:94`.

### `structural/graph/contract.ts` (193 lines)

**Purpose**: Type definitions for the structural metadata system.

**Findings**:
1. **[DUPLICATE] `StructuralFace` type**: 6-value version (`front|back|left|right|ceiling|floor`). A 4-value version exists in `types/index.ts:5`. Both are exported and could be accidentally swapped by consumers.
2. **[QUALITY] Well-structured**: Clean interfaces with clear documentation.

### `structural/types/index.ts` (176 lines)

**Purpose**: Room face types, shell dimensions, opening definitions, validation interfaces.

**Findings**:
1. **[DUPLICATE] `StructuralFace`** (line 5): 4-value subset that conflicts with `contract.ts` version.
2. **[MINOR] `RoomFaceFrame`** (lines 80-86): References `THREE.Box2`. Only consumed by `geometry/index.ts`. Could be co-located.

### `structural/geometry/index.ts` (762 lines, 22KB)

**Purpose**: Shell geometry builder, validation, opening masks, placement zones.

**Findings**:
1. **[DEAD] `deriveRoomPlacementZones`** (line 684): Exported alias. Zero external consumers.
2. **[DEAD] `deriveRoomAnchors`** (line 686): Exported function. Zero external consumers.
3. **[DEAD] `deriveRoomValidationOverlay`** (line 749): Exported function. Zero external consumers.
4. **[DEAD] `buildRoomStructuralLayout`** (line 554): Exported function. Zero external consumers (only called internally by `deriveRoomValidationOverlay` which is also dead).
5. **[COMPLEXITY] Monolith**: 762 lines in a single file. Mixes geometry construction, validation, and layout concerns.

### `visuals/RoomMeshCSG.tsx` (103 lines)

**Purpose**: CSG boolean subtraction engine for room shells.

**Findings**:
1. **[PERFORMANCE] No `React.memo()` wrapper**: Re-renders triggered by any parent re-render.
2. **[QUALITY] Good**: Clean, well-structured. Proper `useMemo` on geometry. `cutouts` prop enables modular architectural voids.

### `visuals/WindowGenerator.ts` (60 lines)

**Purpose**: Standardized window cutout generation for CSG.

**Findings**:
1. **[QUALITY] Good**: Clean utility. Single-purpose. Well-typed.
2. **[MINOR] Unused import**: `import * as THREE from "three"` — THREE is not used in this file.

### `visuals/InternetConnectivity.tsx` (61 lines)

**Purpose**: Renders orange connectivity lines between lobby/floor nodes.

**Findings**:
1. **[LOGIC] Dead type filter** (line 10): Filters for `s.type === 'floor'` which no longer exists in the simulation. Was replaced by `'empty_floor'`.
2. **[PERFORMANCE] Subscribes to entire `shapes` array** (line 7): `useSimulationStore((state) => state.shapes)` triggers re-render on ANY shape change in the entire simulation.
3. **[QUALITY] Commented-out code** (line 55): `// blending={THREE.AdditiveBlending}` — dead experiment.

### Empty Directories

1. **`structural/components/`** — Empty. No purpose identified.
2. **`objects/`** — Empty. No purpose identified.

---

---

## Phase 0 Execution Summary (Purge Complete)

**Date**: 2026-04-06  
**Status**: ✅ COMPLETE  
**Impact**: ~850 lines removed. Zero production breakage.

### Actions Taken:
1. **[ResidentialRoom]**: Removed orphaned `sharedGeometries` and `roomGeometry` construction path. CSG is now the sole renderer.
2. **[RoomSkin]**: Stripped all dead material/texture allocations. Removed unused props. Component is now strictly a thin overlay.
3. **[Geometry/index.ts]**: Purged 600+ lines of dead exports and helpers related to legacy shell geometry.
4. **[Cleanup]**: Deleted empty `structural/components/` and `objects/` directories. Resolved unused imports in utilities.
5. **[Annotation]**: Marked test-only helpers as `@internal` to prevent accidental production use.

### Current State:
The `roomPlacement` feature slice is now "lean and mean". The hot path in `SimulationNodes` no longer allocates redundant hidden meshes or materials, reducing memory pressure during room dragging.

---
