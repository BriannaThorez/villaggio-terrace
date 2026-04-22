# Population System — Tenants & Guests

# Artifact augmentation section
Utilize Antigravity's internal implementation plan **artifact system** to exclusively read the following, where "name" is the actual name of our current source of truth document. This way the artifact system essentially only serves as a compass to the intended source of truth.
```
Utilize the source of truth directly to obtain all instructions, steps, completions and updates.
Source of truth: src/development/implementationplan/[development-implementation-plan-[name].md, development-tasks-[name].md]
Phase: [phase]
Steps: [step]-[step]
Sub-steps: [sub-step]-[sub-step]
Phase Lines: [line]-[line]
```

## Overview

This plan architects and implements a **full-fledged, SimTower-class population simulation** for Villaggio Terrace. Every person (tenant or guest) is a fully persistent entity from spawn to despawn, governed by a deterministic lifecycle state machine, a goal-driven scheduler, and a floor-graph pathing system. The system is feature-slice modular (all code lives in `src/features/population/` and `src/features/tenancy/`), re-enables and radically upgrades the disabled `simPeople` infrastructure, and is wired into the existing time engine, room occupancy, tenancy store, and selection panel.

**Inspiration:**
- **SimTower/Yoot Tower**: Time-of-day schedules (morning commute out, evening commute in), elevator congestion, guest visits to commercial floors during business hours, hotel overnight stays.
- **Project Highrise**: Named tenant companies, staff counts, needs matrix, stress/satisfaction system.
- **Combined target**: A living tower where every visible bar has a name, a home, a job, and a reason for being where it is.

---

## 💾 Step 0 — Snapshot

> Invoke `briannas_snapshot_skill` before any code changes to create a full project snapshot.

---

## User Review Required

> [!IMPORTANT]
> **Visual representation**: This plan uses simple **vertical bar meshes** (black = tenant, blue = guest) as specified. The existing `StylizedPerson`/`SimPerson` 3D model components will remain in place but are not re-enabled. The new `OccupantBar` component is a standalone, minimal Three.js component.

> [!IMPORTANT]
> **Re-enabling simPeople**: The plan uncomments the `SimPeopleManager`, `usePeopleSpawner`, and `useSimPeopleLoop` hooks in `SimulationCanvas.tsx`, but only after replacing them with the new population system hooks. The old stubs become fully functional modules.

> [!WARNING]
> **Pathing MVP scope**: Phase 3 implements a floor-graph path planner (horizontal segments + elevator nodes). Full A* multi-floor routing is the MVP. Advanced path search with obstacle avoidance is phase 5+.

> [!NOTE]
> **Selectability**: Clicking a person bar sets `selectedOccupantId` in `populationStore`. The existing `SelectionPanel` in `App.tsx` is extended with an `OccupantPanel` sibling — no breaking changes to the existing room selection panel.

---

## Proposed Changes

### Phase 1 — Core Entity Data Model & Store Architecture
*Establish the shared data types, stores, and entity registry that all subsequent phases depend on.*

> **Artifact Augmentation Section**
> Utilizing Antigravity's internal implementation plan and tasks **artifact system**, create artifact-implementation-plans and artifact-tasks, in parity of the current phase of its respective source of truth (development-implementation-plan.md and development-tasks.md). For the purpose of serving as an augmentation of the development sources of truth.
> Ensure that each artifact's completion/transitionary component has a binding/handshake component at each completion/transitionary component, which will serve as a reference to return/update/reference/and proceed in accordance with the development sources of truth.
> Ensure every development-source-of-truth phase and associated tasks includes this "Artifact Augmentation Section" verbatim as tooling inspiration and prompt.

---

#### [NEW] `src/features/population/types/occupant.ts`
Defines the canonical `OccupantEntity` union type (Tenant | Guest), lifecycle state machine, schedule entry, occupancy slot, and nav-path types. This is the single source of truth for all population data shapes.

```
OccupantEntity = TenantEntity | GuestEntity
TenantEntity.lifecycle: 'home' | 'commuting_out' | 'at_work' | 'commuting_in' | 'visiting_amenity' | 'sleeping'
GuestEntity.lifecycle: 'arriving' | 'in_transit' | 'visiting' | 'dwelling' | 'departing' | 'despawned'
```

#### [NEW] `src/features/population/store/populationStore.ts`
Zustand store for all occupant metadata. Keyed by `occupantId`. Maintains:
- `occupants: Record<string, OccupantEntity>`
- `selectedOccupantId: string | null`
- `addOccupant / removeOccupant / updateOccupantLifecycle / setSelectedOccupantId`

Parallels the existing `usePeopleStore` pattern but is fully typed with the new entity model. The old `usePeopleStore` is preserved but deprecated-in-place with a JSDoc notice.

#### [NEW] `src/features/population/store/occupantPositions.ts`
Mutable singleton (same pattern as `simPositions.ts`) for frame-rate position data. Holds `OccupantTransform`:
```ts
interface OccupantTransform {
  position: [number, number, number];
  targetPosition: [number, number, number] | null;
  speed: number;
  facing: 'left' | 'right';
  lifecycle: string;
}
```

#### [MODIFY] `src/features/tenancy/store/tenancyStore.ts`
Extend `TenantData` to carry `occupantId: string`. Add `roomCapacity: number` and `slotOccupants: string[]`. Add `assignOccupantToRoom` / `removeOccupantFromRoom` actions.

#### [NEW] `src/features/population/store/roomOccupancyIndex.ts`
Lightweight mutable Map: `roomId -> Set<occupantId>`. Updated synchronously in the position loop. Used by the path planner for congestion checks and by the render layer for occupancy numerics.

> **🔗 Artifact Binding — Phase 1 Completion Handshake**
> On Phase 1 QA checkpoint approval:
> 1. Mark Phase 1 `[x]` in [development-tasks-population_system.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/development-tasks-population_system.md)
> 2. Mark Phase 1 `[x]` in artifact task: `C:\Users\Administrator\.gemini\antigravity\brain\29d06573-813c-4d8b-9637-4f76e2979103\task.md`
> 3. Update artifact plan phase status to `COMPLETE` in: `C:\Users\Administrator\.gemini\antigravity\brain\29d06573-813c-4d8b-9637-4f76e2979103\implementation_plan.md`
> 4. Proceed to Phase 2 only after both are confirmed.

---

### Phase 2 — Lifecycle State Machines & Scheduler
*Deterministic per-entity behavior driven by the time engine.*

> **Artifact Augmentation Section**
> Utilizing Antigravity's internal implementation plan and tasks **artifact system**, create artifact-implementation-plans and artifact-tasks, in parity of the current phase of its respective source of truth (development-implementation-plan.md and development-tasks.md). For the purpose of serving as an augmentation of the development sources of truth.
> Ensure that each artifact's completion/transitionary component has a binding/handshake component at each completion/transitionary component, which will serve as a reference to return/update/reference/and proceed in accordance with the development sources of truth.
> Ensure every development-source-of-truth phase and associated tasks includes this "Artifact Augmentation Section" verbatim as tooling inspiration and prompt.

---

#### [NEW] `src/features/population/lifecycle/TenantLifecycle.ts`
State machine for `TenantEntity`:

| State | Entry Condition | Actions | Transition |
|---|---|---|---|
| `sleeping` | sunTime < 0.25 (before 6am) | Stay in home room | → `commuting_out` at 6am |
| `commuting_out` | sunTime >= 0.25 | Navigate to lobby/exit | → `at_work` when outside |
| `at_work` | Exited tower | Off-screen | → `commuting_in` at 17:00 (0.708) |
| `commuting_in` | sunTime >= 0.708 | Re-enter, navigate home | → `home` on arrival |
| `home` | Arrived in home room | Idle in room | → may → `visiting_amenity` randomly |
| `visiting_amenity` | Random interval, evening | Navigate to commercial room | → `home` after duration |

#### [NEW] `src/features/population/lifecycle/GuestLifecycle.ts`
State machine for `GuestEntity`:

| State | Entry Condition | Actions | Transition |
|---|---|---|---|
| `arriving` | Spawned at tower base | Walk from world edge | → `in_transit` on lobby entry |
| `in_transit` | In lobby/elevator | Navigate to target room | → `visiting` on arrival |
| `visiting` | In target room | Idle in slot | → `departing` after `dwellDuration` |
| `departing` | `dwellDuration` elapsed | Navigate back to lobby | → `despawned` on exit |

#### [NEW] `src/features/population/scheduler/OccupantScheduler.ts`
Called once per simulated hour. Iterates all tenants, evaluates lifecycle state, and either initiates state transitions or sets new nav goals. Also manages **guest wave generation**: At 9am, 12pm, 6pm, and 9pm, spawns guests proportional to commercial room count.

#### [NEW] `src/features/population/scheduler/GuestSpawnPolicy.ts`
Maps `(roomType, timeOfDay, dayOfWeek)` → `spawnCount`. Hotels attract guests on weekday nights; restaurants attract at lunch/dinner; retail on weekends; offices attract business visitors on weekdays.

> **🔗 Artifact Binding — Phase 2 Completion Handshake**
> On Phase 2 QA checkpoint approval:
> 1. Mark Phase 2 `[x]` in [development-tasks-population_system.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/development-tasks-population_system.md)
> 2. Mark Phase 2 `[x]` in artifact task: `C:\Users\Administrator\.gemini\antigravity\brain\29d06573-813c-4d8b-9637-4f76e2979103\task.md`
> 3. Update artifact plan phase status to `COMPLETE`.
> 4. Proceed to Phase 3 only after both are confirmed.

---

### Phase 3 — Pathing & Travel Framework
*The floor-graph pathfinder and travel execution engine.*

> **Artifact Augmentation Section**
> Utilizing Antigravity's internal implementation plan and tasks **artifact system**, create artifact-implementation-plans and artifact-tasks, in parity of the current phase of its respective source of truth (development-implementation-plan.md and development-tasks.md). For the purpose of serving as an augmentation of the development sources of truth.
> Ensure that each artifact's completion/transitionary component has a binding/handshake component at each completion/transitionary component, which will serve as a reference to return/update/reference/and proceed in accordance with the development sources of truth.
> Ensure every development-source-of-truth phase and associated tasks includes this "Artifact Augmentation Section" verbatim as tooling inspiration and prompt.

---

#### [NEW] `src/features/population/navigation/TowerGraph.ts`
Builds and maintains a navigation graph from the live shape set:
- **Floor nodes**: Each occupied floor as a horizontal traversal segment
- **Vertical connector nodes**: Each elevator/lobby as a floor connector
- **Edges**: Horizontal floor movement and vertical elevator movement

Rebuilt on shape changes (debounced 300ms). Exposed as singleton `towerGraph.getPath(fromFloor, toFloor, fromX, toX): NavPath`.

```ts
interface NavPath {
  waypoints: [number, number, number][];
  totalDistance: number;
  usesElevator: boolean;
  elevatorNodeIds: string[];
}
```

#### [NEW] `src/features/population/navigation/PathExecutor.ts`
Per-entity path execution. Advances entity world position by `speed * delta` each frame. On waypoint arrival, advances to next waypoint. On path completion, fires `onArrived` callback triggering the lifecycle state machine.

#### [NEW] `src/features/population/navigation/ElevatorQueue.ts`
Manages elevator call queues per elevator node:
- `entities: string[]` waiting
- `capacity: number` per car
- On `advanceTick()`: batches entities into car, transitions to `in_elevator`, releases at target floor after travel time.

This is the source of SimTower-style congestion — full elevator → entities wait → satisfaction drops.

#### [MODIFY] `src/features/simPeople/navigation/NavEngine.ts`
Refactor `calculatePath` stub to delegate to `TowerGraph.getPath()`. Old function becomes a compatibility shim.

> **🔗 Artifact Binding — Phase 3 Completion Handshake**
> On Phase 3 QA checkpoint approval:
> 1. Mark Phase 3 `[x]` in [development-tasks-population_system.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/development-tasks-population_system.md)
> 2. Mark Phase 3 `[x]` in artifact task.
> 3. Update artifact plan phase status to `COMPLETE`.
> 4. Proceed to Phase 4 only after both are confirmed.

---

### Phase 4 — Visual Representation (OccupantBar)
*Rendering all live entities as vertical bars — minimal, performant, selectable.*

> **Artifact Augmentation Section**
> Utilizing Antigravity's internal implementation plan and tasks **artifact system**, create artifact-implementation-plans and artifact-tasks, in parity of the current phase of its respective source of truth (development-implementation-plan.md and development-tasks.md). For the purpose of serving as an augmentation of the development sources of truth.
> Ensure that each artifact's completion/transitionary component has a binding/handshake component at each completion/transitionary component, which will serve as a reference to return/update/reference/and proceed in accordance with the development sources of truth.
> Ensure every development-source-of-truth phase and associated tasks includes this "Artifact Augmentation Section" verbatim as tooling inspiration and prompt.

---

#### [NEW] `src/features/population/components/OccupantBar.tsx`
A Three.js mesh rendered as a thin vertical box:
- Width: `0.5` world units, Height: `3.0` world units, Depth: `0.3` world units
- Color: `#111111` for tenants, `#0066ff` for guests
- Hover: slight emissive glow
- Click: calls `populationStore.setSelectedOccupantId(id)` + clears room selection

Position read from `occupantPositions` singleton in `useFrame`. Zero React re-renders per frame.

#### [NEW] `src/features/population/components/OccupantLayer.tsx`
Renders all active occupant bars. Subscribes only to `occupantIds` (stable list). Maps each ID to `<OccupantBar id={id} />`. Uses `React.memo` on `OccupantBar`.

#### [NEW] `src/features/population/components/OccupantSelectionRing.tsx`
When `selectedOccupantId` is set, renders a thin pulsing ring at the selected entity's position via `useFrame`.

#### [MODIFY] `src/widgets/SimulationCanvas.tsx`
Add `<OccupantLayer />`, `<OccupantSelectionRing />`, and `usePopulationLoop()` call inside `CanvasScene`. Remove old commented SimPeopleManager block.

> **🔗 Artifact Binding — Phase 4 Completion Handshake**
> On Phase 4 QA checkpoint approval:
> 1. Mark Phase 4 `[x]` in [development-tasks-population_system.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/development-tasks-population_system.md)
> 2. Mark Phase 4 `[x]` in artifact task.
> 3. Update artifact plan phase status to `COMPLETE`.
> 4. Proceed to Phase 5 only after both are confirmed.

---

### Phase 5 — Population Info Pane Integration
*Selectability: clicking an occupant surfaces full entity data in the UI.*

> **Artifact Augmentation Section**
> Utilizing Antigravity's internal implementation plan and tasks **artifact system**, create artifact-implementation-plans and artifact-tasks, in parity of the current phase of its respective source of truth (development-implementation-plan.md and development-tasks.md). For the purpose of serving as an augmentation of the development sources of truth.
> Ensure that each artifact's completion/transitionary component has a binding/handshake component at each completion/transitionary component, which will serve as a reference to return/update/reference/and proceed in accordance with the development sources of truth.
> Ensure every development-source-of-truth phase and associated tasks includes this "Artifact Augmentation Section" verbatim as tooling inspiration and prompt.

---

#### [NEW] `src/features/population/components/OccupantInfoPanel.tsx`
Sibling to `SelectionPanel`. Shown when `selectedOccupantId !== null`. Displays:

**Tenant Panel:** Name, age, occupation, home room, workplace, lifecycle state (human-readable), satisfaction meter (0–100%), monthly rent, "Evict" button.

**Guest Panel:** Name, visitor type, origin label, target room + purpose, time remaining in tower, spending estimate.

Styled with `framer-motion` slide-in, using existing design system CSS variables.

#### [MODIFY] `src/App.tsx`
Add `{selectedOccupantId && <OccupantInfoPanel />}` alongside existing `SelectionPanel`.

#### [MODIFY] `src/features/ui/panels/SelectionPanel.tsx`
Add a "Room Occupancy" section showing current occupants from `roomOccupancyIndex` and live guest count. Replaces stub "Assign Occupant" button with real data + a proper assignment modal trigger.

> **🔗 Artifact Binding — Phase 5 Completion Handshake**
> On Phase 5 QA checkpoint approval:
> 1. Mark Phase 5 `[x]` in [development-tasks-population_system.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/development-tasks-population_system.md)
> 2. Mark Phase 5 `[x]` in artifact task.
> 3. Update artifact plan phase status to `COMPLETE`.
> 4. Proceed to Phase 6 only after both are confirmed.

---

### Phase 6 — Spawning Engine, Initialization & Wiring
*Bootstrap the system within the existing app lifecycle.*

> **Artifact Augmentation Section**
> Utilizing Antigravity's internal implementation plan and tasks **artifact system**, create artifact-implementation-plans and artifact-tasks, in parity of the current phase of its respective source of truth (development-implementation-plan.md and development-tasks.md). For the purpose of serving as an augmentation of the development sources of truth.
> Ensure that each artifact's completion/transitionary component has a binding/handshake component at each completion/transitionary component, which will serve as a reference to return/update/reference/and proceed in accordance with the development sources of truth.
> Ensure every development-source-of-truth phase and associated tasks includes this "Artifact Augmentation Section" verbatim as tooling inspiration and prompt.

---

#### [NEW] `src/features/population/hooks/usePopulationLoop.ts`
Master hook called once in `CanvasScene`. Integrates:
1. `useSchedulerTick()` — checks sunTime each frame, fires hour-boundary callbacks
2. `usePathExecutionLoop()` — advances all entity positions per frame via `PathExecutor`
3. `useElevatorTick()` — advances elevator queue state

All logic reads from singletons. Zero React deps in frame path.

#### [NEW] `src/features/population/hooks/useTenantSpawner.ts`
On mount: reads placed rooms from `useSimulationStore`. For each residential room with a `tenancyStore` occupant record, spawns a `TenantEntity` in `populationStore` at the room's world-space center. Subscribes to `tenancyStore` changes reactively.

#### [NEW] `src/features/population/hooks/useGuestSpawner.ts`
On wave trigger: spawns N guest entities at `x = ±(worldEdge + 20)`, `y = 0`. Each gets a randomly selected commercial room as target (filtered by room type and operating hours).

#### [NEW] `src/features/population/hooks/usePopulationInitializer.ts`
Top-level initializer. Builds `TowerGraph`, subscribes to shape changes for rebuilding, calls `useTenantSpawner` and `useGuestSpawner`.

#### [NEW] `src/features/population/hooks/useTenancyAssignment.ts`
When user clicks "Assign Occupant" in SelectionPanel: auto-generates a tenant with randomized name/occupation, assigns to room in `tenancyStore`, and spawns a corresponding `TenantEntity` in `populationStore`. Closes the loop between manual room assignment and live simulation entity creation.

> **🔗 Artifact Binding — Phase 6 Completion Handshake (Core System Complete)**
> On Phase 6 QA checkpoint approval:
> 1. Mark Phase 6 `[x]` in [development-tasks-population_system.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/development-tasks-population_system.md)
> 2. Mark Phase 6 `[x]` in artifact task.
> 3. Update artifact plan — core system marked `COMPLETE`.
> 4. **Core system smoke test must pass** before initiating Phase 7.
> 5. Commit: `feat: population system core — phases 1–6 complete`

---

### Phase 7 — Needs Matrix & Happiness Engine (P11) + Social Graph (P12)
*Simulate tenant well-being and community ties within the tower.*

> **Artifact Augmentation Section**
> Utilizing Antigravity's internal implementation plan and tasks **artifact system**, create artifact-implementation-plans and artifact-tasks, in parity of the current phase of its respective source of truth (development-implementation-plan.md and development-tasks.md). For the purpose of serving as an augmentation of the development sources of truth.
> Ensure that each artifact's completion/transitionary component has a binding/handshake component at each completion/transitionary component, which will serve as a reference to return/update/reference/and proceed in accordance with the development sources of truth.
> Ensure every development-source-of-truth phase and associated tasks includes this "Artifact Augmentation Section" verbatim as tooling inspiration and prompt.

---

#### [NEW] `src/features/population/needs/needsConfig.ts`
Defines the needs dimension registry: `food_access`, `noise_tolerance`, `elevator_wait_tolerance`, `amenity_proximity`, `natural_light`. Each dimension has a `weight` (float 0–1) and `decayRate` (units/hour).

#### [NEW] `src/features/population/needs/NeedsMatrix.ts`
Per-entity needs state. `NeedsVector = Record<NeedDimension, number>` (0–100 scale). Methods: `satisfy(dimension, amount)`, `degrade(dimension, dt)`, `getScore(): number`.

#### [NEW] `src/features/population/needs/HappinessEngine.ts`
`computeHappiness(needs: NeedsVector, weights: NeedsWeights): number` — dot product of need scores × weights, normalized 0–100. Singleton `happinessEngine.evaluate(occupantId): number`. Integrates with `populationStore.updateOccupantHappiness()`.

#### [NEW] `src/features/population/social/SocialGraph.ts`
`AcquaintanceEdge = { entityA: string, entityB: string, strength: number, lastEncounterTick: number }`. Graph is an adjacency list. `SocialGraph.recordEncounter(idA, idB)` strengthens or creates an edge. Edges decay if not reinforced within 7 sim days.

#### [NEW] `src/features/population/social/CommunityScore.ts`
`computeCommunityScore(floorIndex: number): number` — average node degree for entities on that floor. Exposed via `communityScore.getFloorScore(floor)`.

> **🔗 Artifact Binding — Phase 7 Completion Handshake**
> On Phase 7 QA checkpoint approval:
> 1. Mark Phase 7 `[x]` in [development-tasks-population_system.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/development-tasks-population_system.md)
> 2. Mark Phase 7 `[x]` in artifact task.
> 3. Update artifact plan — Phase 7 `COMPLETE`.
> 4. Commit: `feat: population — needs matrix, happiness engine, social graph`
> 5. Proceed to Phase 8 only after both dev and artifact are confirmed.

---

### Phase 8 — Commute Memory & Churn (P13) + Guest Revenue Attribution (P14, E7)
*Tenant retention economics and commercial revenue loop.*

> **Artifact Augmentation Section**
> Utilizing Antigravity's internal implementation plan and tasks **artifact system**, create artifact-implementation-plans and artifact-tasks, in parity of the current phase of its respective source of truth (development-implementation-plan.md and development-tasks.md). For the purpose of serving as an augmentation of the development sources of truth.
> Ensure that each artifact's completion/transitionary component has a binding/handshake component at each completion/transitionary component, which will serve as a reference to return/update/reference/and proceed in accordance with the development sources of truth.
> Ensure every development-source-of-truth phase and associated tasks includes this "Artifact Augmentation Section" verbatim as tooling inspiration and prompt.

---

#### [NEW] `src/features/population/churn/CommuteMemory.ts`
`CommuteMemory` = circular buffer of the last 7 commute wait-time samples per entity. `record(waitTime: number)`, `getAverage(): number`. Stored in `populationStore` per-occupant metadata.

#### [NEW] `src/features/population/churn/ChurnEngine.ts`
`evaluateChurnRisk(occupantId): void` — called on every scheduler tick. If `commuteMemory.getAverage() > MAX_WAIT_THRESHOLD` (configurable), decrease `needs.elevator_wait_tolerance`. If happiness falls below `EVICTION_THRESHOLD`, call `tenancyStore.evictTenant(roomId)` and `populationStore.removeOccupant(id)`.

#### [NEW] `src/features/population/churn/churnThresholds.ts`
Config constants: `MAX_WAIT_THRESHOLD`, `EVICTION_THRESHOLD`, `CHURN_RECOVERY_RATE`. Exported for tuning without touching business logic.

#### [MODIFY] `src/features/population/lifecycle/GuestLifecycle.ts`
On `despawned` state transition, call `financeStore.recordGuestRevenue(guestId, spendingRate * dwellDuration)`.

#### [MODIFY] `src/features/finance/store/financeStore.ts`
Add `recordGuestRevenue(guestId: string, amount: number): void`. Accumulates into `weeklyGuestRevenue` buffer, processed in `processWeeklyFinances()`.

> **🔗 Artifact Binding — Phase 8 Completion Handshake**
> On Phase 8 QA checkpoint approval:
> 1. Mark Phase 8 `[x]` in [development-tasks-population_system.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/development-tasks-population_system.md)
> 2. Mark Phase 8 `[x]` in artifact task.
> 3. Update artifact plan — Phase 8 `COMPLETE`.
> 4. Commit: `feat: population — churn engine, commute memory, guest revenue`
> 5. Proceed to Phase 9 only after both are confirmed.

---

### Phase 9 — HeatMap Overlay (P15) + Lobby Bottleneck (P18) + Live Occupant Panel (E8) + TrajectoryGhost (E9)
*Visual feedback layer and advanced crowd rendering.*

> **Artifact Augmentation Section**
> Utilizing Antigravity's internal implementation plan and tasks **artifact system**, create artifact-implementation-plans and artifact-tasks, in parity of the current phase of its respective source of truth (development-implementation-plan.md and development-tasks.md). For the purpose of serving as an augmentation of the development sources of truth.
> Ensure that each artifact's completion/transitionary component has a binding/handshake component at each completion/transitionary component, which will serve as a reference to return/update/reference/and proceed in accordance with the development sources of truth.
> Ensure every development-source-of-truth phase and associated tasks includes this "Artifact Augmentation Section" verbatim as tooling inspiration and prompt.

---

#### [NEW] `src/features/population/heatmap/heatmapStore.ts`
Zustand store: `heatmapVisible: boolean`, `floorDensities: Record<number, number>` (0–100 per floor). Updated from `roomOccupancyIndex` on scheduler tick.

#### [NEW] `src/features/population/heatmap/DensityHeatMap.tsx`
Toggle-able Three.js overlay. Instanced plane mesh, one instance per floor. Per-instance color driven by `floorDensities` (cool blue → warm orange via lerp). Invisible when `!heatmapVisible`.

#### [NEW] `src/features/population/components/LobbyStackRenderer.tsx`
When `roomOccupancyIndex[lobbyId].size > N`, stacks OccupantBar entities vertically in the lobby with a `y + 0.4 * stackIndex` offset. Each stacked entity gets `state = 'queued'` flagged in `occupantPositions`. Entities in queue degrade `elevator_wait_tolerance` need per tick.

#### [NEW] `src/features/population/components/OccupantBadge.tsx`
Tiny lifecycle state indicator badge for use in `SelectionPanel`. Maps lifecycle state → emoji + label (🛏️ Sleeping, 🚶 Commuting, 🏠 Home, 🍽️ Visiting, 🛗 In Elevator).

#### [MODIFY] `src/features/ui/panels/SelectionPanel.tsx` (E8)
Add live list of all `TenantEntity`s linked to `slotOccupants[]` with `<OccupantBadge />` per entity.

#### [NEW] `src/features/population/components/TrajectoryGhost.tsx` (E9)
Rendered inside `OccupantBar` when entity is selected. Reads `NavPath.waypoints` from `occupantPositions` singleton. Renders small spheres at each waypoint + `<Line>` segments between them. Faint opacity (0.3).

> **🔗 Artifact Binding — Phase 9 Completion Handshake**
> On Phase 9 QA checkpoint approval:
> 1. Mark Phase 9 `[x]` in [development-tasks-population_system.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/development-tasks-population_system.md)
> 2. Mark Phase 9 `[x]` in artifact task.
> 3. Update artifact plan — Phase 9 `COMPLETE`.
> 4. Commit: `feat: population — heatmap, bottleneck model, trajectory ghost, live panel`
> 5. Proceed to Phase 10 only after both are confirmed.

---

### Phase 10 — Hotel System (P17) + Worker Scheduler (P16) + Peak Hour + Stairs (E10, E11)
*Hotel occupancy loop, performance offloading, and advanced navigation.*

> **Artifact Augmentation Section**
> Utilizing Antigravity's internal implementation plan and tasks **artifact system**, create artifact-implementation-plans and artifact-tasks, in parity of the current phase of its respective source of truth (development-implementation-plan.md and development-tasks.md). For the purpose of serving as an augmentation of the development sources of truth.
> Ensure that each artifact's completion/transitionary component has a binding/handshake component at each completion/transitionary component, which will serve as a reference to return/update/reference/and proceed in accordance with the development sources of truth.
> Ensure every development-source-of-truth phase and associated tasks includes this "Artifact Augmentation Section" verbatim as tooling inspiration and prompt.

---

#### [NEW] `src/features/population/hotel/HotelGuestLifecycle.ts`
Sub-type of `GuestLifecycle`. `dwellDuration = overnight`. On `visiting` state entry, calls `tenancyStore.occupyHotelSlot(roomId, guestId)`. On `departing`, calls `tenancyStore.vacateHotelSlot(roomId, guestId)`.

#### [NEW] `src/features/population/hotel/HotelOccupancyTracker.ts`
`getOccupancyRate(hotelRoomId): number` — current occupants / capacity. Exposed to `financeStore` for KPI reporting.

#### [NEW] `src/features/population/hotel/hotelSpawnPolicy.ts`
Spawns hotel guests on weekday evenings (after 20:00) in proportion to hotel room count. Overnight rate: `roomBaseRate * (1 + amenityBonus)`.

#### [MODIFY] `src/worker/` — Worker Scheduler Task
Add `SIMULATION_TASK_TYPE.SchedulerTick`. Payload: `{ occupants, sunTime, dayOfWeek, shapes }`. Result: `{ transitions: { id: string, newState: string, newGoal: [number, number] | null }[] }`. Main thread applies transitions to `populationStore`.

#### [MODIFY] `src/features/time/store/timeStore.ts` (E10)
Add `isPeakHour: boolean`. Set by `OccupantScheduler` when `commutingCount / totalTenants >= 0.30`.

#### [NEW] `src/features/population/navigation/StairNode.ts` (E11)
`StairNode: ConnectorNode` sub-type with `travelTime = 3.0` (vs elevator `0.8`) and `capacity = Infinity`. `TowerGraph.buildGraph()` includes stair nodes from `structure`-type shapes. Pathfinder prefers stairs when `|fromFloor - toFloor| <= 2`.

> **🔗 Artifact Binding — Phase 10 Completion Handshake**
> On Phase 10 QA checkpoint approval:
> 1. Mark Phase 10 `[x]` in [development-tasks-population_system.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/development-tasks-population_system.md)
> 2. Mark Phase 10 `[x]` in artifact task.
> 3. Update artifact plan — Phase 10 `COMPLETE`.
> 4. Commit: `feat: population — hotel system, worker scheduler, peak hour, stair nodes`
> 5. Proceed to Phase 11 only after both are confirmed.

---

### Phase 11 — VIP Events (P20) + Population Export API (P19)
*Scripted events and full simulation serialization.*

> **Artifact Augmentation Section**
> Utilizing Antigravity's internal implementation plan and tasks **artifact system**, create artifact-implementation-plans and artifact-tasks, in parity of the current phase of its respective source of truth (development-implementation-plan.md and development-tasks.md). For the purpose of serving as an augmentation of the development sources of truth.
> Ensure that each artifact's completion/transitionary component has a binding/handshake component at each completion/transitionary component, which will serve as a reference to return/update/reference/and proceed in accordance with the development sources of truth.
> Ensure every development-source-of-truth phase and associated tasks includes this "Artifact Augmentation Section" verbatim as tooling inspiration and prompt.

---

#### [NEW] `src/features/population/events/VIPEvent.ts`
`VIPEvent` interface: `id`, `name`, `triggerCondition(shapes, occupants): boolean`, `spawnVIPGuest(): GuestEntity`, `rewardEffect(): void`.

#### [NEW] `src/features/population/events/vipEventRegistry.ts`
Registry of all VIP events: CEO Site Visit, Restaurant Critic, Architecture Magazine Feature. Each entry maps trigger conditions to spawned guest sub-type and reward effect.

#### [NEW] `src/features/population/events/EventTriggerEngine.ts`
Singleton. Evaluated once per scheduler hour. Iterates `vipEventRegistry`, checks conditions against live state, spawns VIP guest via `populationStore.addOccupant`. Prevents duplicate active events.

#### [NEW] `src/features/population/events/VIPInfoPanel.tsx`
Extended `OccupantInfoPanel` variant for VIP guests. Shows event name, trigger achievement ("You attracted a CEO by building 3+ office floors!"), reward description, time remaining.

#### [NEW] `src/features/population/persistence/PopulationSnapshot.ts`
`PopulationSnapshot` type: `{ version: string, timestamp: number, occupants: OccupantEntity[], positions: OccupantTransformRecord, roomOccupancy: Record<string, string[]> }`.

#### [MODIFY] `src/features/population/store/populationStore.ts`
Add `exportSnapshot(): PopulationSnapshot` — serializes all Zustand state + `occupantPositions` singleton into `PopulationSnapshot`. Add `importSnapshot(snapshot: PopulationSnapshot): void` — hydrates store from snapshot.

> **🔗 Artifact Binding — Phase 11 Completion Handshake (Full System Complete)**
> On Phase 11 QA checkpoint approval:
> 1. Mark Phase 11 `[x]` in [development-tasks-population_system.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/development-tasks-population_system.md)
> 2. Mark Phase 11 `[x]` in artifact task.
> 3. Update artifact plan — ALL PHASES `COMPLETE`.
> 4. Commit: `feat: population — VIP events, export API, full system complete`
> 5. **Run full integration test suite.**
> 6. Archive this plan into `development/implementationplan/completed/population_system/`.

---

## Verification Plan

### Automated Checks
```powershell
# TypeScript compilation check
npx tsc --noEmit

# ESLint
npx eslint src/features/population --ext .ts,.tsx
npx eslint src/features/tenancy --ext .ts,.tsx
npx eslint src/features/finance --ext .ts,.tsx
```

### Manual QA Checkpoints (per phase)
1. **P1**: `populationStore` accessible via React DevTools; `tenancyStore` shows `occupantId` on tenant records; no TypeScript errors.
2. **P2**: Console logs confirm scheduler firing on hour boundary; lifecycle transitions logged with entity ID and new state.
3. **P3**: `TowerGraph.getPath()` returns valid waypoint arrays for same-floor and multi-floor routes; elevator queue logs batching.
4. **P4**: Black and blue bars visible in canvas; clicking a bar sets `selectedOccupantId`; no crashes.
5. **P5**: `OccupantInfoPanel` renders correct name, lifecycle state, and room data for selected entity.
6. **P6**: On page load with 2 residential rooms assigned tenants, 2 black bars appear; at 9am guest blue bars appear at edges and walk toward commercial rooms.
7. **P7**: Happiness score visible in OccupantInfoPanel; Social Graph populates after 2 entities share a floor.
8. **P8**: Tenant evicts after sustained elevator wait; guest revenue credited to financeStore on despawn.
9. **P9**: HeatMap visible and reactive; stacked entities visible in lobby at rush hour; TrajectoryGhost visible when entity selected.
10. **P10**: Hotel guests check in/out; scheduler tick moves to worker; `isPeakHour` true at 8am; stair routing used for 1-floor moves.
11. **P11**: VIP event triggers when condition met; `exportSnapshot()` serializes all state; `importSnapshot()` restores it.

---

## Cross-Reference
- Dev Tasks: [development-tasks-population_system.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/development-tasks-population_system.md)
- Dev Prompt: [development-prompt-population_system.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/development-prompt-population_system.md)
- Artifact Plan: `C:\Users\Administrator\.gemini\antigravity\brain\29d06573-813c-4d8b-9637-4f76e2979103\implementation_plan.md`
- Artifact Tasks: `C:\Users\Administrator\.gemini\antigravity\brain\29d06573-813c-4d8b-9637-4f76e2979103\task.md`

---

## Open Questions

> [!IMPORTANT]
> **Tenant name/persona generation**: Procedural generation (e.g., "Marco Bianchi, Accountant") vs. user-named? Current plan uses procedural.

> [!NOTE]
> **Elevator car animation**: Entities will pause briefly in `in_elevator` state and teleport vertically at the elevator node. Visual elevator car animation is a future enrichment.

> [!NOTE]
> **Needs weights**: Initial weights are equal (0.2 each). Future plan allows per-tenant-archetype weight customization (e.g., office workers care more about elevator speed than food proximity).


This plan architects and implements a **full-fledged, SimTower-class population simulation** for Villaggio Terrace. Every person (tenant or guest) is a fully persistent entity from spawn to despawn, governed by a deterministic lifecycle state machine, a goal-driven scheduler, and a floor-graph pathing system. The system is feature-slice modular (all code lives in `src/features/population/` and `src/features/tenancy/`), re-enables and radically upgrades the disabled `simPeople` infrastructure, and is wired into the existing time engine, room occupancy, tenancy store, and selection panel.

**Inspiration:**
- **SimTower/Yoot Tower**: Time-of-day schedules (morning commute out, evening commute in), elevator congestion, guest visits to commercial floors during business hours, hotel overnight stays.
- **Project Highrise**: Named tenant companies, staff counts, needs matrix, stress/satisfaction system.
- **Combined target**: A living tower where every visible bar has a name, a home, a job, and a reason for being where it is.

---

## 💾 Step 0 — Snapshot

> Invoke `briannas_snapshot_skill` before any code changes to create a full project snapshot.

---

## User Review Required

> [!IMPORTANT]
> **Visual representation**: This plan uses simple **vertical bar meshes** (black = tenant, blue = guest) as specified. The existing `StylizedPerson`/`SimPerson` 3D model components will remain in place but are not re-enabled. The new `OccupantBar` component is a standalone, minimal Three.js component.

> [!IMPORTANT]
> **Re-enabling simPeople**: The plan uncomments the `SimPeopleManager`, `usePeopleSpawner`, and `useSimPeopleLoop` hooks in `SimulationCanvas.tsx`, but only after replacing them with the new population system hooks. The old stubs become fully functional modules.

> [!WARNING]
> **Pathing MVP scope**: Phase 3 implements a floor-graph path planner (horizontal segments + elevator nodes). Full A* multi-floor routing is the MVP. Advanced path search with obstacle avoidance is phase 5+.

> [!NOTE]
> **Selectability**: Clicking a person bar sets `selectedOccupantId` in `populationStore`. The existing `SelectionPanel` in `App.tsx` is extended with an `OccupantPanel` sibling — no breaking changes to the existing room selection panel.

---

## Proposed Changes

### Phase 1 — Core Entity Data Model & Store Architecture
*Establish the shared data types, stores, and entity registry that all subsequent phases depend on.*

---

#### [NEW] `src/features/population/types/occupant.ts`
Defines the canonical `OccupantEntity` union type (Tenant | Guest), lifecycle state machine, schedule entry, occupancy slot, and nav-path types. This is the single source of truth for all population data shapes.

```
OccupantEntity = TenantEntity | GuestEntity
TenantEntity.lifecycle: 'home' | 'commuting_out' | 'at_work' | 'commuting_in' | 'visiting_amenity' | 'sleeping'
GuestEntity.lifecycle: 'arriving' | 'in_transit' | 'visiting' | 'dwelling' | 'departing' | 'despawned'
```

#### [NEW] `src/features/population/store/populationStore.ts`
Zustand store for all occupant metadata. Keyed by `occupantId`. Maintains:
- `occupants: Record<string, OccupantEntity>`
- `selectedOccupantId: string | null`
- `addOccupant / removeOccupant / updateOccupantLifecycle / setSelectedOccupantId`

Parallels the existing `usePeopleStore` pattern but is fully typed with the new entity model. The old `usePeopleStore` is preserved but deprecated-in-place with a JSDoc notice.

#### [NEW] `src/features/population/store/occupantPositions.ts`
Mutable singleton (same pattern as `simPositions.ts`) for frame-rate position data. Holds `OccupantTransform`:
```ts
interface OccupantTransform {
  position: [number, number, number];
  targetPosition: [number, number, number] | null;
  speed: number;
  facing: 'left' | 'right';
  lifecycle: string;
}
```

#### [MODIFY] `src/features/tenancy/store/tenancyStore.ts`
Extend `TenantData` to carry `occupantId: string`. Add `roomCapacity: number` and `slotOccupants: string[]`. Add `assignOccupantToRoom` / `removeOccupantFromRoom` actions.

#### [NEW] `src/features/population/store/roomOccupancyIndex.ts`
Lightweight mutable Map: `roomId -> Set<occupantId>`. Updated synchronously in the position loop. Used by the path planner for congestion checks and by the render layer for occupancy numerics.

---

### Phase 2 — Lifecycle State Machines & Scheduler
*Deterministic per-entity behavior driven by the time engine.*

---

#### [NEW] `src/features/population/lifecycle/TenantLifecycle.ts`
State machine for `TenantEntity`:

| State | Entry Condition | Actions | Transition |
|---|---|---|---|
| `sleeping` | sunTime < 0.25 (before 6am) | Stay in home room | → `commuting_out` at 6am |
| `commuting_out` | sunTime >= 0.25 | Navigate to lobby/exit | → `at_work` when outside |
| `at_work` | Exited tower | Off-screen | → `commuting_in` at 17:00 (0.708) |
| `commuting_in` | sunTime >= 0.708 | Re-enter, navigate home | → `home` on arrival |
| `home` | Arrived in home room | Idle in room | → may → `visiting_amenity` randomly |
| `visiting_amenity` | Random interval, evening | Navigate to commercial room | → `home` after duration |

#### [NEW] `src/features/population/lifecycle/GuestLifecycle.ts`
State machine for `GuestEntity`:

| State | Entry Condition | Actions | Transition |
|---|---|---|---|
| `arriving` | Spawned at tower base | Walk from world edge | → `in_transit` on lobby entry |
| `in_transit` | In lobby/elevator | Navigate to target room | → `visiting` on arrival |
| `visiting` | In target room | Idle in slot | → `departing` after `dwellDuration` |
| `departing` | `dwellDuration` elapsed | Navigate back to lobby | → `despawned` on exit |

#### [NEW] `src/features/population/scheduler/OccupantScheduler.ts`
Called once per simulated hour. Iterates all tenants, evaluates lifecycle state, and either initiates state transitions or sets new nav goals. Also manages **guest wave generation**: At 9am, 12pm, 6pm, and 9pm, spawns guests proportional to commercial room count.

#### [NEW] `src/features/population/scheduler/GuestSpawnPolicy.ts`
Maps `(roomType, timeOfDay, dayOfWeek)` → `spawnCount`. Hotels attract guests on weekday nights; restaurants attract at lunch/dinner; retail on weekends; offices attract business visitors on weekdays.

---

### Phase 3 — Pathing & Travel Framework
*The floor-graph pathfinder and travel execution engine.*

---

#### [NEW] `src/features/population/navigation/TowerGraph.ts`
Builds and maintains a navigation graph from the live shape set:
- **Floor nodes**: Each occupied floor as a horizontal traversal segment
- **Vertical connector nodes**: Each elevator/lobby as a floor connector
- **Edges**: Horizontal floor movement and vertical elevator movement

Rebuilt on shape changes (debounced 300ms). Exposed as singleton `towerGraph.getPath(fromFloor, toFloor, fromX, toX): NavPath`.

```ts
interface NavPath {
  waypoints: [number, number, number][];
  totalDistance: number;
  usesElevator: boolean;
  elevatorNodeIds: string[];
}
```

#### [NEW] `src/features/population/navigation/PathExecutor.ts`
Per-entity path execution. Advances entity world position by `speed * delta` each frame. On waypoint arrival, advances to next waypoint. On path completion, fires `onArrived` callback triggering the lifecycle state machine.

#### [NEW] `src/features/population/navigation/ElevatorQueue.ts`
Manages elevator call queues per elevator node:
- `entities: string[]` waiting
- `capacity: number` per car
- On `advanceTick()`: batches entities into car, transitions to `in_elevator`, releases at target floor after travel time.

This is the source of SimTower-style congestion — full elevator → entities wait → satisfaction drops.

#### [MODIFY] `src/features/simPeople/navigation/NavEngine.ts`
Refactor `calculatePath` stub to delegate to `TowerGraph.getPath()`. Old function becomes a compatibility shim.

---

### Phase 4 — Visual Representation (OccupantBar)
*Rendering all live entities as vertical bars — minimal, performant, selectable.*

---

#### [NEW] `src/features/population/components/OccupantBar.tsx`
A Three.js mesh rendered as a thin vertical box:
- Width: `0.5` world units, Height: `3.0` world units, Depth: `0.3` world units
- Color: `#111111` for tenants, `#0066ff` for guests
- Hover: slight emissive glow
- Click: calls `populationStore.setSelectedOccupantId(id)` + clears room selection

Position read from `occupantPositions` singleton in `useFrame`. Zero React re-renders per frame.

#### [NEW] `src/features/population/components/OccupantLayer.tsx`
Renders all active occupant bars. Subscribes only to `occupantIds` (stable list). Maps each ID to `<OccupantBar id={id} />`. Uses `React.memo` on `OccupantBar`.

#### [NEW] `src/features/population/components/OccupantSelectionRing.tsx`
When `selectedOccupantId` is set, renders a thin pulsing ring at the selected entity's position via `useFrame`.

#### [MODIFY] `src/widgets/SimulationCanvas.tsx`
Add `<OccupantLayer />`, `<OccupantSelectionRing />`, and `usePopulationLoop()` call inside `CanvasScene`. Remove old commented SimPeopleManager block.

---

### Phase 5 — Population Info Pane Integration
*Selectability: clicking an occupant surfaces full entity data in the UI.*

---

#### [NEW] `src/features/population/components/OccupantInfoPanel.tsx`
Sibling to `SelectionPanel`. Shown when `selectedOccupantId !== null`. Displays:

**Tenant Panel:** Name, age, occupation, home room, workplace, lifecycle state (human-readable), satisfaction meter (0–100%), monthly rent, "Evict" button.

**Guest Panel:** Name, visitor type, origin label, target room + purpose, time remaining in tower, spending estimate.

Styled with `framer-motion` slide-in, using existing design system CSS variables.

#### [MODIFY] `src/App.tsx`
Add `{selectedOccupantId && <OccupantInfoPanel />}` alongside existing `SelectionPanel`.

#### [MODIFY] `src/features/ui/panels/SelectionPanel.tsx`
Add a "Room Occupancy" section showing current occupants from `roomOccupancyIndex` and live guest count. Replaces stub "Assign Occupant" button with real data + a proper assignment modal trigger.

---

### Phase 6 — Spawning Engine, Initialization & Wiring
*Bootstrap the system within the existing app lifecycle.*

---

#### [NEW] `src/features/population/hooks/usePopulationLoop.ts`
Master hook called once in `CanvasScene`. Integrates:
1. `useSchedulerTick()` — checks sunTime each frame, fires hour-boundary callbacks
2. `usePathExecutionLoop()` — advances all entity positions per frame via `PathExecutor`
3. `useElevatorTick()` — advances elevator queue state

All logic reads from singletons. Zero React deps in frame path.

#### [NEW] `src/features/population/hooks/useTenantSpawner.ts`
On mount: reads placed rooms from `useSimulationStore`. For each residential room with a `tenancyStore` occupant record, spawns a `TenantEntity` in `populationStore` at the room's world-space center. Subscribes to `tenancyStore` changes reactively.

#### [NEW] `src/features/population/hooks/useGuestSpawner.ts`
On wave trigger: spawns N guest entities at `x = ±(worldEdge + 20)`, `y = 0`. Each gets a randomly selected commercial room as target (filtered by room type and operating hours).

#### [NEW] `src/features/population/hooks/usePopulationInitializer.ts`
Top-level initializer. Builds `TowerGraph`, subscribes to shape changes for rebuilding, calls `useTenantSpawner` and `useGuestSpawner`.

#### [NEW] `src/features/population/hooks/useTenancyAssignment.ts`
When user clicks "Assign Occupant" in SelectionPanel: auto-generates a tenant with randomized name/occupation, assigns to room in `tenancyStore`, and spawns a corresponding `TenantEntity` in `populationStore`. Closes the loop between manual room assignment and live simulation entity creation.

---

## Verification Plan

### Automated Checks
```powershell
# TypeScript compilation check
npx tsc --noEmit

# ESLint
npx eslint src/features/population --ext .ts,.tsx
npx eslint src/features/tenancy --ext .ts,.tsx
```

### Manual QA Checkpoints (per phase)
1. **P1**: `populationStore` accessible via React DevTools; `tenancyStore` shows `occupantId` on tenant records; no TypeScript errors.
2. **P2**: Console logs confirm scheduler firing on hour boundary; lifecycle transitions logged with entity ID and new state.
3. **P3**: `TowerGraph.getPath()` returns valid waypoint arrays for same-floor and multi-floor routes; elevator queue logs batching.
4. **P4**: Black and blue bars visible in canvas; clicking a bar sets `selectedOccupantId`; no crashes.
5. **P5**: `OccupantInfoPanel` renders correct name, lifecycle state, and room data for selected entity.
6. **P6**: On page load with 2 residential rooms assigned tenants, 2 black bars appear; at 9am guest blue bars appear at edges and walk toward commercial rooms.

---

## Cross-Reference
See [tasks_population_system.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/tasks_population_system.md) for granular task-level tracking.

---

## Open Questions

> [!IMPORTANT]
> **Tenant name/persona generation**: Procedural generation (e.g., "Marco Bianchi, Accountant") vs. user-named? Current plan uses procedural.

> [!NOTE]
> **Elevator car animation**: Entities will pause briefly in `in_elevator` state and teleport vertically at the elevator node. Visual elevator car animation is a future enrichment.

> [!NOTE]
> **Satisfaction/needs system**: Tenant info panel will show a static 75% satisfaction meter this phase. Full satisfaction simulation is a predicted enrichment (see feature-predictions.md).
