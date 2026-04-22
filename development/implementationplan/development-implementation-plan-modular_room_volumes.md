# Source of Truth: Modular Room Volumes & Dynamic Object Placement Implementation Plan

*Circular Reference:* `development-tasks-modular_room_volumes.md`

## Architecture Overview
The current simulation relies on a `ResidentialUnit` component as a catch-all physical volume for various room classes (Office, Commercial, etc.). This inherently limits the simulation because `ResidentialUnit` is hardcoded with a physical bed mesh. 

This plan abstracts the physical volumetric rendering into a pure, generic `ModularRoomVolume`, while transforming the interior space into a mathematically rigorous grid of snap points based on the cell width of the room. This lays the foundation for an industry-leading dynamic object placement pipeline.

## Phases

### Phase 1: Establish Universal Volumetric Shell
**Goal:** Decouple physical room geometry from class-specific interior data.
- **Target Files:**
  - `src/entities/rooms/visuals/ModularRoomVolume.tsx` [NEW]
  - `src/features/roomPlacement/modular/ModularRoom.tsx` [NEW]
- **Details:** 
  - `ModularRoomVolume` takes in raw dimensions, textures, and CSG properties to render the walls and floors.
  - `ModularRoom` acts as the data-connector, calculating wall thickness, requesting textures from the metadata store, and wrapping the `ModularRoomVolume`.
  - Ensure targeted, careful changes. No rewrites of preexisting math unless shifting files.

### Phase 2: Implement Dynamic Snap Point Grid Architecture
**Goal:** Divide the new clean room volume into distinct snap nodes where objects can be hosted.
- **Target Files:**
  - `src/features/interiorPlacement/hooks/useInteriorSubgrid.ts` [MODIFY/EXTEND]
- **Details:**
  - Based on the room's width in cells (1 cell = 10 units), calculate distinct, centered nodes along the floor XZ plane.
  - Create a generic prop rendering component that listens to these snap points to place meshes (e.g., beds, desks) logically rather than via hardcoded absolute coordinates.

### Phase 3: Engine Integration & Retrofitting
**Goal:** Route all non-specialized rooms in the game through the new pipeline.
- **Target Files:**
  - `src/entities/SimulationNodes.tsx` [MODIFY]
  - `src/entities/rooms/residential/Residence/ResidentialUnit.tsx` [MODIFY/DELETE]
- **Details:**
  - In `SimulationNodes.tsx`, swap the `ResidentialRoom` fallback logic to use `ModularRoom`.
  - Refactor `ResidentialUnit` to become a consumer of the new snap grid (placing a bed on Snap Point 1), or retire it entirely in favor of data-driven prop placement.

## Coding Practices & Guardrails
- **Minimal Mutation:** Only touch code directly relating to the abstraction of the room volume.
- **TypeScript Strictness:** Enforce interface contracts between the `ModularRoom` and `ModularRoomVolume`.
- **Validation Checkpoints:** After each major phase, standard `tsc --noEmit` checks must be run, followed by a hard stop for User QA.
