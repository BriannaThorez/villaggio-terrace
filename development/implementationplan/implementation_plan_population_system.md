# Population System — Tenants & Guests

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
