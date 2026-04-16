# Implementation Plan: 2D Volumetric Vacancy Reconstruction

## 1. Bug Identification & Root Cause Analysis

**The Bug:** When a room spanning multiple floors or large widths is deleted, the `empty_floor` scaffolding fails to populate fully. It either leaves floors completely blank or spawns only a single 10-unit block in the center.

**The Cause:** The `deleteShape` logic in `store.ts` utilizes a fatally flawed "Structure-Anchored Sweep" algorithm with a 1D horizontal scope:
1. **Z/Y-Axis Blindness:** It filters impacted structures using `Math.abs(s.position[1] - centerY) < 1`. If a room spans 3 floors (e.g., height 120), its geometric center resides in the middle of a room, inherently avoiding the floor plates at the top or bottom! As a result, `impactedStructures` returns empty.
2. **Fallback Failure:** When `impactedStructures` fails, the `!addedEmptyFloorCell` fallback logic activates. Crucially, the fallback completely lacks a `for` loop. It simply calculates one single `clampedCx` center point and spawns exactly **one** 10-unit empty floor block, obliterating the remaining width of the room.

## 2. Executive Summary
We will deprecate the unstable struct-sweep and replace it with a **2D Volumetric Footprint Reconstruction**. 
By mathematically dividing the deleted shape's total `width` by 10 and its `height` by `GRID_SIZE_Y` (40), we will execute a nested loop (X and Y dimensions). This ensures that a room spanning 3 floors and 50 spaces width perfectly spawns 15 independent `empty_floor` tiles in a 5x3 matrix, exactly filling the void without grid-tearing or missing levels.

## 3. Implementation Phases

### Phase 1: Pure Geometric Matrix Generation
**Goal:** Rewrite the `deleteShape` replacement logic.
1. Determine absolute footprint matrices:
   - `deletedLeft` to `deletedRight`
   - `deletedBottom` to `deletedTop`
2. **Nested Loop Population:**
   - Outer loop iterates `cy += GRID_SIZE_Y`.
   - Inner loop iterates `cx += 10`.
   - Each cycle produces a precise `empty_floor` scaffold candidate.

### Phase 2: Parity and Collision Safety
**Goal:** Prevent overlapping geometry if neighboring rooms or user-drawn scaffolds already occupy those cells.
1. Within the nested loop, snapshot the current state with `get().shapes` dynamically.
2. Filter the spawned matrices using an `isOccupied` boolean by checking AABB (Axis-Aligned Bounding Box) logic against structural and spatial realities.
3. If the coordinate is legally empty, spawn the `empty_floor` scaffolding.

## 4. Proposed Tasks
- [ ] Refactor `deleteShape` structural vacancy loop in `src/shared/utils/store.ts`.
- [ ] Implement nested layout spanning `shapeToDelete.size[0]` and `shapeToDelete.size[1]`.
- [ ] Incorporate `GRID_SIZE_Y` iteration for vertical multi-floor mapping.
- [ ] Preserve synchronous frame integrity via `AABB` physics guard logic.

## 5. User Review Required
> [!IMPORTANT]
> The original logic attempted to infer where to place floors by querying the foundation underneath. The new logic mathematically forces reconstruction of exactly the mass that was lost. Due to the 2D matrix loop, deleting a massive 15x3 room will correctly spawn 45 individual 10x40 scaffolds. Does this true volumetric parsing align flawlessly with your architectural ruleset?
