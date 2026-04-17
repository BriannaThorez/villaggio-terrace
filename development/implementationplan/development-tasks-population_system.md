# Tasks — Population System (Tenants & Guests)

> **Artifact Augmentation Section**
> Utilizing Antigravity's internal implementation plan and tasks **artifact system**, create artifact-implementation-plans and artifact-tasks, in parity of the current phase of its respective source of truth (development-implementation-plan.md and development-tasks.md). For the purpose of serving as an augmentation of the development sources of truth.
> Ensure that each artifact's completion/transitionary component has a binding/handshake component at each completion/transitionary component, which will serve as a reference to return/update/reference/and proceed in accordance with the development sources of truth.
> Ensure every development-source-of-truth phase and associated tasks includes this "Artifact Augmentation Section" verbatim as tooling inspiration and prompt.

---

> **Cross-reference:**
> - Dev Plan: [development-implementation-plan-population_system.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/development-implementation-plan-population_system.md)
> - Dev Prompt: [development-prompt-population_system.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/development-prompt-population_system.md)
> - Artifact Plan: `C:\Users\Administrator\.gemini\antigravity\brain\29d06573-813c-4d8b-9637-4f76e2979103\implementation_plan.md`
> - Artifact Tasks: `C:\Users\Administrator\.gemini\antigravity\brain\29d06573-813c-4d8b-9637-4f76e2979103\task.md`

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
- [ ] ⏸️ **Phase 6 QA Checkpoint** — Final user review. Core population system smoke test complete.
- [ ] 🔗 **Phase 6 → Artifact Binding Handshake**
  - [ ] Mark Phase 6 `[x]` in dev plan
  - [ ] Mark Phase 6 `[x]` in artifact task (`brain/.../task.md`)
  - [ ] Update artifact plan Phase 6 → `COMPLETE`
  - [ ] Commit: `feat: population system core — phases 1–6 complete`

---

## Phase 7 — Needs Matrix & Happiness Engine (P11) + Social Graph (P12)

> **Artifact Augmentation Section**
> Utilizing Antigravity's internal implementation plan and tasks **artifact system**, create artifact-implementation-plans and artifact-tasks, in parity of the current phase of its respective source of truth (development-implementation-plan.md and development-tasks.md). For the purpose of serving as an augmentation of the development sources of truth.
> Ensure that each artifact's completion/transitionary component has a binding/handshake component at each completion/transitionary component, which will serve as a reference to return/update/reference/and proceed in accordance with the development sources of truth.
> Ensure every development-source-of-truth phase and associated tasks includes this "Artifact Augmentation Section" verbatim as tooling inspiration and prompt.

- [ ] **7.1** Create `src/features/population/needs/needsConfig.ts`
  - [ ] Define `NeedDimension` union: `food_access | noise_tolerance | elevator_wait_tolerance | amenity_proximity | natural_light`
  - [ ] Define `NeedsWeights` record with default equal weights (0.2)
  - [ ] Export `NeedsDecayRates` config object (units/hour per dimension)
- [ ] **7.2** Create `src/features/population/needs/NeedsMatrix.ts`
  - [ ] `NeedsVector = Record<NeedDimension, number>` (0–100)
  - [ ] `satisfy(dimension, amount): void`
  - [ ] `degrade(dimension, dt: number): void`
  - [ ] `getScore(): number` (0–100 mean)
- [ ] **7.3** Create `src/features/population/needs/HappinessEngine.ts`
  - [ ] `computeHappiness(needs: NeedsVector, weights: NeedsWeights): number` — weighted dot product
  - [ ] Singleton `happinessEngine`
  - [ ] Integrate with `populationStore.updateOccupantHappiness(id, score)`
- [ ] **7.4** Create `src/features/population/social/SocialGraph.ts`
  - [ ] `AcquaintanceEdge` type: `{ entityA, entityB, strength, lastEncounterTick }`
  - [ ] `recordEncounter(idA, idB): void` — creates/strengthens edge
  - [ ] Decay edges older than 7 sim days on scheduler tick
  - [ ] Export singleton `socialGraph`
- [ ] **7.5** Create `src/features/population/social/CommunityScore.ts`
  - [ ] `computeCommunityScore(floorIndex: number): number` (avg node degree)
  - [ ] Expose via `communityScore.getFloorScore(floor)`
- [ ] **7.6** Run `npx tsc --noEmit` — confirm zero new errors
- [ ] **7.7** Run `npx eslint src/features/population --ext .ts,.tsx`
- [ ] ⏸️ **Phase 7 QA Checkpoint** — Happiness score visible in OccupantInfoPanel; Social graph edges logged after entities share a floor
- [ ] 🔗 **Phase 7 → Artifact Binding Handshake**
  - [ ] Mark Phase 7 `[x]` in dev plan & artifact task
  - [ ] Update artifact plan Phase 7 → `COMPLETE`
  - [ ] Commit: `feat: population — needs matrix, happiness engine, social graph`

---

## Phase 8 — Commute Memory & Churn (P13) + Guest Revenue Attribution (P14, E7)

> **Artifact Augmentation Section**
> Utilizing Antigravity's internal implementation plan and tasks **artifact system**, create artifact-implementation-plans and artifact-tasks, in parity of the current phase of its respective source of truth (development-implementation-plan.md and development-tasks.md). For the purpose of serving as an augmentation of the development sources of truth.
> Ensure that each artifact's completion/transitionary component has a binding/handshake component at each completion/transitionary component, which will serve as a reference to return/update/reference/and proceed in accordance with the development sources of truth.
> Ensure every development-source-of-truth phase and associated tasks includes this "Artifact Augmentation Section" verbatim as tooling inspiration and prompt.

- [ ] **8.1** Create `src/features/population/churn/CommuteMemory.ts`
  - [ ] Circular buffer (last 7 samples)
  - [ ] `record(waitTime: number): void`
  - [ ] `getAverage(): number`
  - [ ] Store per-entity in `populationStore` occupant metadata
- [ ] **8.2** Create `src/features/population/churn/churnThresholds.ts`
  - [ ] `MAX_WAIT_THRESHOLD`, `EVICTION_THRESHOLD`, `CHURN_RECOVERY_RATE` constants
- [ ] **8.3** Create `src/features/population/churn/ChurnEngine.ts`
  - [ ] `evaluateChurnRisk(occupantId): void`
  - [ ] If avg wait > `MAX_WAIT_THRESHOLD`: degrade `elevator_wait_tolerance`
  - [ ] If happiness < `EVICTION_THRESHOLD`: call `tenancyStore.evictTenant` + `populationStore.removeOccupant`
  - [ ] Export singleton `churnEngine`
- [ ] **8.4** Modify `src/features/population/lifecycle/GuestLifecycle.ts`
  - [ ] On `despawned` transition: call `financeStore.recordGuestRevenue(guestId, spendingRate * dwellDuration)`
- [ ] **8.5** Modify `src/features/finance/store/financeStore.ts`
  - [ ] Add `recordGuestRevenue(guestId, amount): void`
  - [ ] Accumulate into `weeklyGuestRevenue` buffer
  - [ ] Process in `processWeeklyFinances()`
- [ ] **8.6** Run `npx tsc --noEmit` — confirm zero new errors
- [ ] **8.7** Run `npx eslint src/features/population src/features/finance --ext .ts,.tsx`
- [ ] ⏸️ **Phase 8 QA Checkpoint** — Tenant evicts after sustained wait; guest revenue credited on despawn
- [ ] 🔗 **Phase 8 → Artifact Binding Handshake**
  - [ ] Mark Phase 8 `[x]` in dev plan & artifact task
  - [ ] Update artifact plan Phase 8 → `COMPLETE`
  - [ ] Commit: `feat: population — churn engine, commute memory, guest revenue`

---

## Phase 9 — HeatMap Overlay (P15) + Lobby Bottleneck (P18) + Live Panel (E8) + TrajectoryGhost (E9)

> **Artifact Augmentation Section**
> Utilizing Antigravity's internal implementation plan and tasks **artifact system**, create artifact-implementation-plans and artifact-tasks, in parity of the current phase of its respective source of truth (development-implementation-plan.md and development-tasks.md). For the purpose of serving as an augmentation of the development sources of truth.
> Ensure that each artifact's completion/transitionary component has a binding/handshake component at each completion/transitionary component, which will serve as a reference to return/update/reference/and proceed in accordance with the development sources of truth.
> Ensure every development-source-of-truth phase and associated tasks includes this "Artifact Augmentation Section" verbatim as tooling inspiration and prompt.

- [ ] **9.1** Create `src/features/population/heatmap/heatmapStore.ts`
  - [ ] `heatmapVisible: boolean` toggle
  - [ ] `floorDensities: Record<number, number>` (0–100 per floor)
  - [ ] Update from `roomOccupancyIndex` on scheduler tick
- [ ] **9.2** Create `src/features/population/heatmap/DensityHeatMap.tsx`
  - [ ] Instanced plane mesh (one per floor)
  - [ ] Per-instance color: cool blue (density 0) → warm orange (density 100)
  - [ ] Hidden when `!heatmapVisible`
- [ ] **9.3** Create `src/features/population/components/LobbyStackRenderer.tsx`
  - [ ] When `roomOccupancyIndex[lobbyId].size > N`: stack entities at `y + 0.4 * stackIndex`
  - [ ] Flag stacked entities in `occupantPositions` as `state = 'queued'`
  - [ ] Degrade `elevator_wait_tolerance` need per tick for queued entities
- [ ] **9.4** Create `src/features/population/components/OccupantBadge.tsx`
  - [ ] Lifecycle → emoji: 🛏️ Sleeping, 🚶 Commuting, 🏠 Home, 🍽️ Visiting, 🛗 In Elevator
  - [ ] Used in SelectionPanel occupant list
- [ ] **9.5** Modify `src/features/ui/panels/SelectionPanel.tsx` (E8)
  - [ ] Subscribe to `roomOccupancyIndex` for selected room
  - [ ] Render live `<OccupantBadge />` for each linked entity
- [ ] **9.6** Create `src/features/population/components/TrajectoryGhost.tsx` (E9)
  - [ ] Read `NavPath.waypoints` from `occupantPositions` singleton (selected entity only)
  - [ ] Render small sphere per waypoint + `<Line>` segments between waypoints
  - [ ] Opacity: 0.3
  - [ ] Visible only when entity is selected
- [ ] **9.7** Run `npx tsc --noEmit` — confirm zero new errors
- [ ] **9.8** Run `npx eslint src/features/population src/features/ui --ext .ts,.tsx`
- [ ] ⏸️ **Phase 9 QA Checkpoint** — HeatMap reactive; lobby stack visible at rush hour; TrajectoryGhost renders on entity selection
- [ ] 🔗 **Phase 9 → Artifact Binding Handshake**
  - [ ] Mark Phase 9 `[x]` in dev plan & artifact task
  - [ ] Update artifact plan Phase 9 → `COMPLETE`
  - [ ] Commit: `feat: population — heatmap, bottleneck model, trajectory ghost, live panel`

---

## Phase 10 — Hotel System (P17) + Worker Scheduler (P16) + Peak Hour (E10) + Stair Nodes (E11)

> **Artifact Augmentation Section**
> Utilizing Antigravity's internal implementation plan and tasks **artifact system**, create artifact-implementation-plans and artifact-tasks, in parity of the current phase of its respective source of truth (development-implementation-plan.md and development-tasks.md). For the purpose of serving as an augmentation of the development sources of truth.
> Ensure that each artifact's completion/transitionary component has a binding/handshake component at each completion/transitionary component, which will serve as a reference to return/update/reference/and proceed in accordance with the development sources of truth.
> Ensure every development-source-of-truth phase and associated tasks includes this "Artifact Augmentation Section" verbatim as tooling inspiration and prompt.

- [ ] **10.1** Create `src/features/population/hotel/hotelSpawnPolicy.ts`
  - [ ] Spawn hotel guests on weekday evenings (after 20:00)
  - [ ] Rate: `roomBaseRate * (1 + amenityBonus)`
- [ ] **10.2** Create `src/features/population/hotel/HotelGuestLifecycle.ts`
  - [ ] Sub-type of `GuestLifecycle`; `dwellDuration = overnight`
  - [ ] On `visiting` entry: `tenancyStore.occupyHotelSlot(roomId, guestId)`
  - [ ] On `departing`: `tenancyStore.vacateHotelSlot(roomId, guestId)`
- [ ] **10.3** Create `src/features/population/hotel/HotelOccupancyTracker.ts`
  - [ ] `getOccupancyRate(hotelRoomId): number`
  - [ ] Expose to `financeStore` for KPI reporting
- [ ] **10.4** Modify `src/worker/` — Worker Scheduler Task
  - [ ] Add `SIMULATION_TASK_TYPE.SchedulerTick`
  - [ ] Define payload: `{ occupants, sunTime, dayOfWeek, shapes }`
  - [ ] Define result: `{ transitions: { id, newState, newGoal }[] }`
  - [ ] Main thread applies transitions to `populationStore`
- [ ] **10.5** Modify `src/features/time/store/timeStore.ts` (E10)
  - [ ] Add `isPeakHour: boolean`
  - [ ] Set to `true` when `commutingCount / totalTenants >= 0.30` in scheduler
- [ ] **10.6** Create `src/features/population/navigation/StairNode.ts` (E11)
  - [ ] `StairNode` as `ConnectorNode` sub-type: `travelTime = 3.0`, `capacity = Infinity`
  - [ ] Modify `TowerGraph.buildGraph()` to include stair nodes from structure shapes
  - [ ] Pathfinder: prefer stairs when `|fromFloor - toFloor| <= 2`
- [ ] **10.7** Run `npx tsc --noEmit` — confirm zero new errors
- [ ] **10.8** Run `npx eslint src/features/population src/worker src/features/time --ext .ts,.tsx`
- [ ] ⏸️ **Phase 10 QA Checkpoint** — Hotel guests check in/out; scheduler on worker; isPeakHour true at 8am; stair routing verified for 1-floor hops
- [ ] 🔗 **Phase 10 → Artifact Binding Handshake**
  - [ ] Mark Phase 10 `[x]` in dev plan & artifact task
  - [ ] Update artifact plan Phase 10 → `COMPLETE`
  - [ ] Commit: `feat: population — hotel system, worker scheduler, peak hour, stair nodes`

---

## Phase 11 — VIP Events (P20) + Population Export API (P19)

> **Artifact Augmentation Section**
> Utilizing Antigravity's internal implementation plan and tasks **artifact system**, create artifact-implementation-plans and artifact-tasks, in parity of the current phase of its respective source of truth (development-implementation-plan.md and development-tasks.md). For the purpose of serving as an augmentation of the development sources of truth.
> Ensure that each artifact's completion/transitionary component has a binding/handshake component at each completion/transitionary component, which will serve as a reference to return/update/reference/and proceed in accordance with the development sources of truth.
> Ensure every development-source-of-truth phase and associated tasks includes this "Artifact Augmentation Section" verbatim as tooling inspiration and prompt.

- [ ] **11.1** Create `src/features/population/events/VIPEvent.ts`
  - [ ] `VIPEvent` interface: `id, name, triggerCondition, spawnVIPGuest, rewardEffect`
- [ ] **11.2** Create `src/features/population/events/vipEventRegistry.ts`
  - [ ] CEO Site Visit: requires ≥3 occupied office floors
  - [ ] Restaurant Critic: requires ≥1 restaurant + satisfaction > 80% → ×3 revenue
  - [ ] Architecture Magazine Feature: unlocks cosmetic award badge
- [ ] **11.3** Create `src/features/population/events/EventTriggerEngine.ts`
  - [ ] Evaluate `vipEventRegistry` once per scheduler hour
  - [ ] Check conditions against live `simulationStore` + `populationStore`
  - [ ] Spawn VIP via `populationStore.addOccupant`
  - [ ] Prevent duplicate active events
  - [ ] Export singleton `eventTriggerEngine`
- [ ] **11.4** Create `src/features/population/events/VIPInfoPanel.tsx`
  - [ ] Variant of `OccupantInfoPanel` for VIP guests
  - [ ] Show event name, achievement text, reward description, time remaining
- [ ] **11.5** Create `src/features/population/persistence/PopulationSnapshot.ts`
  - [ ] Define `PopulationSnapshot` type: `{ version, timestamp, occupants, positions, roomOccupancy }`
- [ ] **11.6** Modify `src/features/population/store/populationStore.ts`
  - [ ] Add `exportSnapshot(): PopulationSnapshot`
  - [ ] Add `importSnapshot(snapshot: PopulationSnapshot): void`
- [ ] **11.7** Run `npx tsc --noEmit` — confirm zero new errors
- [ ] **11.8** Run `npx eslint src/features/population --ext .ts,.tsx`
- [ ] **11.9** Full integration test suite:
  - [ ] CEO Site Visit triggers after 3 office floors occupied
  - [ ] Restaurant Critic ×3 revenue fires and credits correctly
  - [ ] `exportSnapshot()` → JSON with all entities, positions, room data
  - [ ] `importSnapshot()` restores simulation to exported state
- [ ] ⏸️ **Phase 11 QA Checkpoint** — Full population system complete. All 11 phases verified.
- [ ] 🔗 **Phase 11 → Artifact Binding Handshake (SYSTEM COMPLETE)**
  - [ ] Mark Phase 11 `[x]` in dev plan & artifact task
  - [ ] Update artifact plan — ALL PHASES → `COMPLETE`
  - [ ] Commit: `feat: population — VIP events, export API, full system complete`
  - [ ] Archive this plan → `development/implementationplan/completed/population_system/`
