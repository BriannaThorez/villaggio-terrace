# Source of Truth: Modular Room Volumes & Dynamic Object Placement Tasks

*Circular Reference:* `development-implementation-plan-modular_room_volumes.md`

## Phase 1: Establish Universal Volumetric Shell
- [ ] **Step 1.1:** Create `ModularRoomVolume.tsx` in `src/entities/rooms/visuals/`.
  - [ ] **Sub-step 1.1.1:** Extract the `RoomMeshCSG` and `PlacementHologram` rendering logic from `ResidentialUnit.tsx`.
  - [ ] **Sub-step 1.1.2:** Define props to handle `width`, `height`, `depth`, `color`, `placementGrid`, textures, and wall toggles.
  - [ ] **Sub-step 1.1.3:** Ensure the hardcoded "BED" mesh is completely removed from this base volume component.
- [ ] **Step 1.2:** Refactor `ResidentialRoom.tsx` into `ModularRoom.tsx`.
  - [ ] **Sub-step 1.2.1:** Create `src/features/roomPlacement/modular/ModularRoom.tsx`.
  - [ ] **Sub-step 1.2.2:** Migrate thickness calculations, texture resolution, and interior subgrid mapping from `ResidentialRoom`.
  - [ ] **Sub-step 1.2.3:** Implement `ModularRoomVolume` as the core visual return of `ModularRoom`.
- [ ] **Step 1.3:** QA / Lint / Build Verification
  - [ ] Run `tsc --noEmit` and review component typing.
  - [ ] **PAUSE FOR USER FEEDBACK:** Confirm abstraction is correct before wiring it up.

## Phase 2: Implement Dynamic Snap Point Grid Architecture
- [ ] **Step 2.1:** Create Interior Grid Engine Hook.
  - [ ] **Sub-step 2.1.1:** Build `useInteriorSnapGrid.ts` (or expand `useInteriorSubgrid.ts`) to calculate absolute local cell divisions based on room `width`.
  - [ ] **Sub-step 2.1.2:** Generate an array of valid `SnapPoint` coordinates (e.g., `[x, y, z]`, `capacity`, `type`) for object placement.
- [ ] **Step 2.2:** Establish Object Container Component.
  - [ ] **Sub-step 2.2.1:** Create an `InteriorPropRenderer` within `ModularRoom.tsx` that consumes the `SnapPoint` array and iterates over any placed objects.
- [ ] **Step 2.3:** QA / Lint / Build Verification
  - [ ] Ensure the snap point array calculates correctly for a 2-cell, 3-cell, and 4-cell wide room.
  - [ ] **PAUSE FOR USER FEEDBACK:** Verify grid mathematics and visual markers.

## Phase 3: Engine Integration & Retrofitting
- [ ] **Step 3.1:** Update `SimulationNodes.tsx`.
  - [ ] **Sub-step 3.1.1:** Replace the `ResidentialRoom` fallback (which renders residential, office, commercial, utility, etc.) with the new `ModularRoom`.
- [ ] **Step 3.2:** Update `ResidentialUnit.tsx` (Legacy Cleanup).
  - [ ] **Sub-step 3.2.1:** If maintaining class-specific interiors in the short term, update `ResidentialUnit` to utilize `ModularRoomVolume` and render the bed dynamically via the new snap point system.
- [ ] **Step 3.3:** Final QA Integration Testing.
  - [ ] Verify placing an Office renders a clean volume without a bed.
  - [ ] **PAUSE FOR USER FEEDBACK:** End of feature implementation.
