# Tasks — Population System (Tenants & Guests)

> Cross-reference: [implementation_plan_population_system.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/implementation_plan_population_system.md)

---

## 💾 Phase 0 — Snapshot

- [ ] Invoke `briannas_snapshot_skill` to create pre-implementation snapshot

---

## Phase 1 — Core Entity Data Model & Store Architecture

- [ ] **1.1** Create `src/features/population/` feature slice directory structure:
  - `types/`, `store/`, `lifecycle/`, `scheduler/`, `navigation/`, `components/`, `hooks/`
- [ ] **1.2** Create `src/features/population/types/occupant.ts`
  - [ ] Define `TenantLifecycleState` union
  - [ ] Define `GuestLifecycleState` union
  - [ ] Define `TenantEntity` interface
  - [ ] Define `GuestEntity` interface
  - [ ] Define `OccupantEntity` discriminated union
  - [ ] Define `NavWaypoint` and `NavPath` types
- [ ] **1.3** Create `src/features/population/store/populationStore.ts`
  - [ ] `occupants: Record<string, OccupantEntity>`
  - [ ] `selectedOccupantId: string | null`
  - [ ] `addOccupant`, `removeOccupant`, `updateOccupantLifecycle`, `setSelectedOccupantId` actions
- [ ] **1.4** Create `src/features/population/store/occupantPositions.ts`
  - [ ] Define `OccupantTransform` interface
  - [ ] Create `OccupantPositionStore` class (mirrors `SimPositionStore` pattern)
  - [ ] Export singleton `occupantPositions`
- [ ] **1.5** Create `src/features/population/store/roomOccupancyIndex.ts`
  - [ ] Mutable `Map<roomId, Set<occupantId>>`
  - [ ] `addOccupantToRoom`, `removeOccupantFromRoom`, `getOccupantsForRoom`, `clear` API
- [ ] **1.6** Modify `src/features/tenancy/store/tenancyStore.ts`
  - [ ] Add `occupantId?: string` to `TenantData`
  - [ ] Add `roomCapacity?: number` and `slotOccupants: string[]` to `TenantData`
  - [ ] Add `assignOccupantToRoom(roomId, occupantId)` action
  - [ ] Add `removeOccupantFromRoom(roomId, occupantId)` action
- [ ] **1.7** Run `npx tsc --noEmit` — confirm zero new errors
- [ ] **1.8** Run `npx eslint src/features/population src/features/tenancy --ext .ts,.tsx`
- [ ] ⏸️ **Phase 1 QA Checkpoint** — Pause for user review before proceeding to Phase 2

---

## Phase 2 — Lifecycle State Machines & Scheduler

- [ ] **2.1** Create `src/features/population/lifecycle/TenantLifecycle.ts`
  - [ ] `getTenantNextState(tenant, sunTime, dayOfWeek): TenantLifecycleState`
  - [ ] `getTenantNavGoal(tenant, state, shapes): [number, number] | null`
- [ ] **2.2** Create `src/features/population/lifecycle/GuestLifecycle.ts`
  - [ ] `getGuestNextState(guest, elapsedMs): GuestLifecycleState`
  - [ ] `shouldDespawn(guest): boolean`
- [ ] **2.3** Create `src/features/population/scheduler/GuestSpawnPolicy.ts`
  - [ ] `getSpawnCount(roomType, sunTime, dayOfWeek): number`
  - [ ] Map of `roomType → hourlyPattern`
- [ ] **2.4** Create `src/features/population/scheduler/OccupantScheduler.ts`
  - [ ] `advanceHour(sunTime, dayOfWeek, shapes, occupants): void`
  - [ ] Tenant state machine evaluation loop
  - [ ] Guest wave trigger logic
  - [ ] Export singleton `occupantScheduler`
- [ ] **2.5** Run `npx tsc --noEmit` — confirm zero new errors
- [ ] **2.6** Run `npx eslint src/features/population --ext .ts,.tsx`
- [ ] ⏸️ **Phase 2 QA Checkpoint** — Pause for user review. Verify scheduler fires on hour boundary in console logs

---

## Phase 3 — Pathing & Travel Framework

- [ ] **3.1** Create `src/features/population/navigation/TowerGraph.ts`
  - [ ] `FloorNode` and `ConnectorNode` types
  - [ ] `buildGraph(shapes: SimulationNode[]): TowerGraphData`
  - [ ] `getPath(fromFloor, toFloor, fromX, toX): NavPath`
  - [ ] `subscribeToShapeChanges()` — rebuilds on store changes (debounced 300ms)
  - [ ] Export singleton `towerGraph`
- [ ] **3.2** Create `src/features/population/navigation/PathExecutor.ts`
  - [ ] `executeStep(transform: OccupantTransform, path: NavPath, delta: number): boolean` (returns `true` if arrived)
  - [ ] Advances position along waypoints
  - [ ] Calls `onArrived` callback and clears path on completion
- [ ] **3.3** Create `src/features/population/navigation/ElevatorQueue.ts`
  - [ ] `ElevatorQueueEntry` type
  - [ ] `callElevator(occupantId, targetFloor)` — adds to queue
  - [ ] `advanceTick(delta)` — processes queue, transitions entities
  - [ ] Export singleton `elevatorQueue`
- [ ] **3.4** Modify `src/features/simPeople/navigation/NavEngine.ts`
  - [ ] Refactor `calculatePath` to delegate to `towerGraph.getPath()`
  - [ ] Preserve old signature as compatibility shim
- [ ] **3.5** Run `npx tsc --noEmit` — confirm zero new errors
- [ ] **3.6** Run `npx eslint src/features/population src/features/simPeople --ext .ts,.tsx`
- [ ] ⏸️ **Phase 3 QA Checkpoint** — Pause for user review. Verify `towerGraph.getPath()` returns valid paths in devtools console

---

## Phase 4 — Visual Representation

- [ ] **4.1** Create `src/features/population/components/OccupantBar.tsx`
  - [ ] `boxGeometry` with dimensions `[0.5, 3.0, 0.3]`
  - [ ] Color: `#111111` tenant, `#0066ff` guest (read from `populationStore`)
  - [ ] `useFrame` reads position from `occupantPositions` singleton
  - [ ] `onClick` → `populationStore.setSelectedOccupantId(id)` + clear room selection
  - [ ] Hover emissive glow effect
  - [ ] Wrap in `React.memo`
- [ ] **4.2** Create `src/features/population/components/OccupantLayer.tsx`
  - [ ] Subscribe only to `occupantIds` (stable array from `populationStore`)
  - [ ] Render `<OccupantBar id={id} />` per occupant
- [ ] **4.3** Create `src/features/population/components/OccupantSelectionRing.tsx`
  - [ ] Subscribe to `selectedOccupantId`
  - [ ] `useFrame` positions ring at selected entity's location
  - [ ] Pulsing scale animation via `Math.sin`
- [ ] **4.4** Modify `src/widgets/SimulationCanvas.tsx`
  - [ ] Import `OccupantLayer`, `OccupantSelectionRing`
  - [ ] Add `<OccupantLayer />` inside `CanvasScene` JSX
  - [ ] Add `<OccupantSelectionRing />` inside `CanvasScene` JSX
  - [ ] Remove old commented-out `SimPeopleManager` / `usePeopleSpawner` lines
- [ ] **4.5** Run `npx tsc --noEmit` — confirm zero new errors
- [ ] **4.6** Run `npx eslint src/features/population src/widgets --ext .ts,.tsx`
- [ ] ⏸️ **Phase 4 QA Checkpoint** — Pause for user review. Verify bars render in canvas, black/blue correct, click sets selectedOccupantId

---

## Phase 5 — Population Info Pane Integration

- [ ] **5.1** Create `src/features/population/components/OccupantInfoPanel.tsx`
  - [ ] Animated slide-in panel with `framer-motion` (matches SelectionPanel style)
  - [ ] Tenant sub-panel: name, age, occupation, home room, workplace, lifecycle state, satisfaction meter (static 75%), rent, "Evict" button
  - [ ] Guest sub-panel: name, visitor type, origin label, target room + purpose, time remaining, spending estimate
  - [ ] Draggable (same `drag` + `dragMomentum={false}` pattern as SelectionPanel)
  - [ ] Uses `uiPositions["occupant-panel"]` from simulationStore for position persistence
- [ ] **5.2** Modify `src/App.tsx`
  - [ ] Import `OccupantInfoPanel` and `usePopulationStore`
  - [ ] Add `{selectedOccupantId && <OccupantInfoPanel />}` to JSX
- [ ] **5.3** Modify `src/features/ui/panels/SelectionPanel.tsx`
  - [ ] Add "Room Occupancy" section (occupant count from `roomOccupancyIndex`, live guest count)
  - [ ] Replace stub "Assign Occupant" button with `useTenancyAssignment()` hook trigger
- [ ] **5.4** Run `npx tsc --noEmit` — confirm zero new errors
- [ ] **5.5** Run `npx eslint src/features/population src/features/ui src --ext .ts,.tsx`
- [ ] ⏸️ **Phase 5 QA Checkpoint** — Pause for user review. Verify panel shows correct data for selected tenant/guest

---

## Phase 6 — Spawning Engine, Initialization & Wiring

- [ ] **6.1** Create `src/features/population/hooks/usePopulationLoop.ts`
  - [ ] Integrate `useSchedulerTick()` — sunTime hour-boundary delta detection
  - [ ] Integrate `usePathExecutionLoop()` — advance all entity positions per frame
  - [ ] Integrate `useElevatorTick()` — advance elevator queue
  - [ ] All reads from singletons (zero React re-renders in frame path)
- [ ] **6.2** Create `src/features/population/hooks/useTenantSpawner.ts`
  - [ ] On mount: for each residential room with a `tenancyStore` occupant, spawn `TenantEntity` in `populationStore`
  - [ ] Subscribe to `tenancyStore` for reactive spawn/despawn
- [ ] **6.3** Create `src/features/population/hooks/useGuestSpawner.ts`
  - [ ] On wave trigger from scheduler: spawn N guests at world edge
  - [ ] Each guest gets random commercial room target filtered by `GuestSpawnPolicy`
- [ ] **6.4** Create `src/features/population/hooks/usePopulationInitializer.ts`
  - [ ] Build `TowerGraph` on mount
  - [ ] Subscribe to shape changes for rebuild
  - [ ] Call `useTenantSpawner` and `useGuestSpawner`
- [ ] **6.5** Create `src/features/population/hooks/useTenancyAssignment.ts`
  - [ ] Auto-generate tenant profile (name, age, occupation from curated list)
  - [ ] Call `tenancyStore.assignTenant` + `populationStore.addOccupant`
  - [ ] Return `assign(roomId)` function for use in SelectionPanel
- [ ] **6.6** Modify `src/widgets/SimulationCanvas.tsx`
  - [ ] Import and call `usePopulationLoop()` inside `CanvasScene`
  - [ ] Import and call `usePopulationInitializer()` inside `CanvasScene`
- [ ] **6.7** Run `npx tsc --noEmit` — confirm zero new errors
- [ ] **6.8** Run `npx eslint src/features/population src/widgets --ext .ts,.tsx`
- [ ] **6.9** Full integration smoke test:
  - [ ] Place 2 residential rooms, assign tenants → 2 black bars appear
  - [ ] Advance time to 9am → guest blue bars appear at world edge
  - [ ] Guests walk toward commercial room (if placed)
  - [ ] Click a bar → OccupantInfoPanel opens with correct data
  - [ ] Tenant leaves tower at 6am sim time, returns at 5pm sim time
- [ ] ⏸️ **Phase 6 QA Checkpoint** — Final user review. Full population system smoke test complete.
