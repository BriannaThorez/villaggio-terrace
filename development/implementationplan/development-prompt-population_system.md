# Prompt — Population System (Tenants & Guests)

> **Artifact Augmentation Section**
> Utilizing Antigravity's internal implementation plan and tasks **artifact system**, create artifact-implementation-plans and artifact-tasks, in parity of the current phase of its respective source of truth (development-implementation-plan.md and development-tasks.md). For the purpose of serving as an augmentation of the development sources of truth.
> Ensure that each artifact's completion/transitionary component has a binding/handshake component at each completion/transitionary component, which will serve as a reference to return/update/reference/and proceed in accordance with the development sources of truth.
> Ensure every development-source-of-truth phase and associated tasks includes this "Artifact Augmentation Section" verbatim as tooling inspiration and prompt.

---

## Original User Prompt (Word-for-Word)

> Useing @[c:\AIDev\AiDev_LLM\villaggio-terrace\development\newplan_skill.md] create a modularized, and in accordance with feature slice design, population feature that consists of tenants and guests. Ensure linking of occupants within rooms to 'tenancy' status where guests are drawn to our tower from elsewhere each day for various reasons(stores etc)
> Draw heavy inspiration from sim tower, Yoot Tower, and project highrise to ensure a fully fledged robust feature.
> Predict feature enrichment sub-features and ideas.
> Ultimately we want at a minimum all of the same functionality of the population system in any of these tower simulators...
> definitely needs to include a pathing/travel framework etc.
>
> For now, represent population using simple black(tenant) and guest(blue) vertical bars.
>
> every population must be an entity that is fully persistent from spawn to despawn. Guests must come and go, tenants must come, live/dwell in various rooms as necessary, and leave for work/their dayjobs etc.
>
> Ensure there is logic in place to make them selectable and feature data fed into the information pane.

---

## AI Analysis — Core System (Phases 0–6)

### Axiomatic Intent (AmI)
The foundational requirement is: **every person in the simulation is a persistent, first-class entity** — not a particle or decorative element. Each person must have a full lifecycle (spawn → travel → dwell → despawn) driven by deterministic state machine logic. The system must be modular (feature-slice architecture) and extend the existing `simPeople` + `tenancy` slices rather than replacing them.

### Axiological Intent (AlI)
The value aim is to replicate the **depth-of-simulation** that made SimTower and Yoot Tower beloved: the sense that the tower is a living ecosystem. Tenants sleep, go to work, return home, visit amenities. Guests arrive from outside, have a purpose (shopping, dining, hotel), accomplish that purpose, and leave. Watching individual entities navigate with purpose creates the feeling of a real inhabited tower.

### Teleological Intent (TlI)
The ultimate goal is to lay the groundwork for the **full simulation loop**:
- Population density ↔ room desirability ↔ finance (rent/foot traffic revenue)
- Guest attraction ↔ commercial room types (stores, restaurants, hotel)
- Tenant satisfaction ↔ services available (elevator access, noise, crowding)
- Pathing pressure ↔ elevator/lobby congestion → motivates tower design decisions

This is the core game loop. Every other feature (finance, tenancy rent, room happiness) will eventually feed into and from this system.

### Key Design Decisions
1. **Dual-archetype model**: `Tenant` vs `Guest` share a common `OccupantEntity` base but diverge in lifecycle, schedule, and motivation.
2. **Visual representation**: Vertical bars (black = tenant, blue = guest) as placeholder — intentionally minimal for this phase.
3. **Separation of mutable frame-data from React state**: Continue the established `simPositions.ts` pattern (mutable singleton) for positions; use Zustand only for metadata and lifecycle state.
4. **Slot-based room occupancy**: Rooms have `capacity` slots. Each slot can be occupied by one entity at a time (tenant's unit, guest's seat, etc.).
5. **Tower graph as nav graph**: Lobbies and elevators are nodes; horizontal floor segments are edges. Path = sequence of nodes.
6. **Selectability**: Clicking on a person bar triggers `setSelectedId` in a new `populationStore`, which surfaces data to a dedicated population info panel.

---

> **🔗 Artifact Binding — Phase 0–6 Handshake**
> At the completion of each Phase 0–6, synchronize progress with the artifact counterpart:
> - Artifact Plan: `C:\Users\Administrator\.gemini\antigravity\brain\29d06573-813c-4d8b-9637-4f76e2979103\implementation_plan.md`
> - Artifact Tasks: `C:\Users\Administrator\.gemini\antigravity\brain\29d06573-813c-4d8b-9637-4f76e2979103\task.md`
> Confirm phase checkbox parity before proceeding to the next phase.

---

## AI Analysis — Extended Features (Phases 7–11: P11–P20 + E7–E11)

*Added 2026-04-17. These predictions have been promoted to implementation phases.*

---

### P11 — Needs Matrix & Tensor Happiness Engine

**AmI (Axiomatic):** The system must track satisfaction as a mathematical vector, not a flag. Each entity carries a needs vector and rooms satisfy/degrade specific dimensions. This is the invariant that prevents the simulation from becoming a static decoration.

**AlI (Axiological):** The value is **emergent consequence**: a tenant near a noisy elevator who can't get food has lower happiness → lower rent → eventual eviction. Players feel the tower is real because their design decisions have consequences for individual lives.

**TlI (Teleological):** Enables the full SimTower feedback loop — tower design decisions affect individual well-being, which aggregates to floor prestige, which affects room desirability, which affects rent income, which funds further construction.

**Feature Slice:** `src/features/population/needs/` — `NeedsMatrix.ts`, `HappinessEngine.ts`, `needsConfig.ts`

---

### P12 — Interpersonal Social Graph

**AmI:** Every entity must be potentially connected to every other entity it physically passes. Social graph edges are persistent objects, not one-time events.

**AlI:** Community creates the sense of a neighborhood within the tower — not just units. A floor with zero social ties feels lonely; a floor with dense ties feels like a home.

**TlI:** Social graph data becomes a floor-level "Community Score" KPI that affects prestige and desirability. Ultimately feeds into a "neighborhood quality" metric that influences new tenant attraction rates.

**Feature Slice:** `src/features/population/social/` — `SocialGraph.ts`, `AcquaintanceEdge.ts`, `CommunityScore.ts`

---

### P13 — Commute Memory & Population Churn

**AmI:** Commute experience must be recorded per-entity as a rolling buffer, not discarded after each trip. Memory persists across sim days.

**AlI:** Churn is the economic consequence of infrastructure failure. When an elevator is perpetually full, tenants leave — the player must build another elevator. This is the "motivation engine" that drives gameplay decisions.

**TlI:** Churn feeds vacancy rates into `financeStore`, reducing rent roll. Churn + vacancy + new-tenant attraction creates the natural population equilibrium that SimTower built its entire economy around.

**Feature Slice:** `src/features/population/churn/` — `CommuteMemory.ts`, `ChurnEngine.ts`, `churnThresholds.ts`

---

### P14 — Guest Revenue Attribution

**AmI:** Revenue generation must be event-driven (`dwellDuration` expiry), not time-based polling. Commercial rooms earn only when guests are physically present.

**AlI:** Makes commercial room placement meaningful. An empty restaurant earns nothing. A busy restaurant on a well-connected floor earns maximum. Players feel the benefit of good tower design in their bank account.

**TlI:** Closes the commercial simulation loop: commercial rooms → attract guests → earn revenue → fund expansion → attract more guests. Integrates with `financeStore.recordGuestRevenue()`.

**Feature Slice:** Enrichment to `src/features/population/lifecycle/GuestLifecycle.ts` + new `src/features/finance/guestRevenue/` slice.

---

### P15 — Population Density HeatMap Overlay

**AmI:** The heatmap must reflect true occupancy density, not approximations. Source of truth is `roomOccupancyIndex`, read deterministically each frame.

**AlI:** Visual feedback that instantly communicates tower health. Players see which floors are thriving and which are dead weight. Motivates targeted intervention.

**TlI:** The heatmap is the visual interface for the simulation's aggregate state — a dashboard that requires zero UI chrome. It is the map from SimTower translated into an immersive 3D overlay.

**Feature Slice:** `src/features/population/heatmap/` — `DensityHeatMap.tsx`, `heatmapStore.ts`, `HeatMapOverlay.tsx`

---

### P16 — Worker-Side Scheduler (Offloaded Tick)

**AmI:** The scheduler's computational scope (iterating all entities per hour boundary) must not block the main thread. This is an architectural invariant for scalability beyond 100 sims.

**AlI:** Invisible performance improvement. The player never sees a frame drop during a morning commute rush because 200 tenants simultaneously change state. The tower feels alive without the simulation choking.

**TlI:** Establishes the pattern for offloading all future simulation systems (social graph computation, needs evaluation) to the existing worker pool. Follows the established `SIMULATION_TASK_TYPE` protocol.

**Feature Slice:** Enrichment to `src/worker/` — new `SIMULATION_TASK_TYPE.SchedulerTick` task + payload types.

---

### P17 — Hotel & Overnight Guest System

**AmI:** Hotel guests are a distinct sub-type with an overnight `dwellDuration`. They must occupy a hotel room slot from `tenancyStore` — the slot is their room for the night.

**AlI:** Hotel occupancy is emotionally satisfying — watching guests arrive, check in, sleep, and check out mirrors real hotel life. It deepens the "living tower" feeling and mirrors Yoot Tower's hotel system directly.

**TlI:** Hotel occupancy rate becomes a KPI. High occupancy → revenue. Low occupancy → incentive to add amenities (restaurant, gym) to attract more hotel guests. Full hotel simulation loop.

**Feature Slice:** `src/features/population/hotel/` — `HotelGuestLifecycle.ts`, `HotelOccupancyTracker.ts`, `hotelSpawnPolicy.ts`

---

### P18 — Crowd Simulation: Lobby Bottleneck Model

**AmI:** When N+ entities occupy the same lobby position, their visual representation must reflect crowding via vertical stacking. The stack is a deterministic function of `roomOccupancyIndex` at the lobby node.

**AlI:** One of the most iconic visual signatures of SimTower — the morning rush lobby pile-up. Communicates system stress to the player instantly and viscerally.

**TlI:** Crowding triggers need degradation (`elevator_wait` need), which flows into happiness → churn. The bottleneck model is the visual manifestation of the player's infrastructure decisions.

**Feature Slice:** Enrichment to `src/features/population/navigation/ElevatorQueue.ts` + `src/features/population/components/LobbyStackRenderer.tsx`

---

### P19 — Population Export API

**AmI:** `populationStore` must expose a complete, serializable snapshot of all entity state. No partial snapshots. All fields, including frame-rate positions from `occupantPositions`.

**AlI:** The export API is the prerequisite for save/load — the feature players will demand. It also enables the statistics screen, which makes the tower's history visible and the simulation feel consequential over time.

**TlI:** Foundational for persistent game sessions. Without this, the simulation resets to zero on every page load. With it, a player's tower is a living artifact that grows over weeks of play.

**Feature Slice:** Enrichment to `src/features/population/store/populationStore.ts` + new `src/features/population/persistence/` — `PopulationSnapshot.ts`, `snapshotSerializer.ts`

---

### P20 — VIP / Landmark Guest Events

**AmI:** VIP events are scripted `GuestEntity` sub-types with deterministic trigger conditions. They are not random. `CEO Site Visit` requires ≥3 occupied office floors — this constraint is checked against live `simulationStore` state.

**AlI:** Rare, rewarding events that celebrate the player's achievement. "You've built enough offices to attract a CEO visit" — this is recognition, not randomness.

**TlI:** VIP events create emergent goals: build more offices, build a restaurant, achieve a certain satisfaction rating. They are the "achievement system" of the simulation loop, motivating structured growth.

**Feature Slice:** `src/features/population/events/` — `VIPEvent.ts`, `EventTriggerEngine.ts`, `vipEventRegistry.ts`, `VIPInfoPanel.tsx`

---

### E7 — Guest Revenue Attribution (Finance Store Integration)

**AmI:** `GuestEntity.despawn()` must call `financeStore.recordGuestRevenue()` synchronously. Revenue attribution is a side effect of despawn, not a separate polling process.

**AlI:** Makes every guest visit financially meaningful. Players watch their cash balance tick up as guests leave — feedback that reinforces good commercial layout decisions.

**TlI:** Connects the population system to the economy. Without this, commercial rooms are cosmetic. With it, they are the primary revenue engine for mid-game growth.

**Feature Slice:** Enrichment to `src/features/population/lifecycle/GuestLifecycle.ts` (call `financeStore` on despawn) + `src/features/finance/store/financeStore.ts` (add `recordGuestRevenue`).

---

### E8 — Tenancy Panel → Live Occupant Viewer

**AmI:** The SelectionPanel must subscribe to `roomOccupancyIndex` for the selected room and render live state badges. No polling — reactive subscription.

**AlI:** Transforms the room info panel from a static form into a live simulation readout. Players feel the room is alive when they see its tenants' badges change in real time.

**TlI:** Makes the Selection Panel the primary window into per-room simulation state. As more needs and satisfaction data is added, the panel becomes richer without requiring UI redesign.

**Feature Slice:** Enrichment to `src/features/ui/panels/SelectionPanel.tsx` + `src/features/population/components/OccupantBadge.tsx`

---

### E9 — OccupantBar → TrajectoryGhost

**AmI:** The trajectory ghost must read from the entity's live `NavPath` (next N waypoints). It must update every frame, not on lifecycle state changes.

**AlI:** Makes entity intent visible — the player understands why a person is moving where they are. Creates the "SimTower floor map moment" where watching a single tenant navigate across the tower becomes interesting.

**TlI:** TrajectoryGhost is the foundation for a future "Follow Mode" camera that tracks individual entities. It also doubles as a debugging tool for pathfinding correctness.

**Feature Slice:** Enrichment to `src/features/population/components/OccupantBar.tsx` + new `src/features/population/components/TrajectoryGhost.tsx`

---

### E10 — Time Engine → Peak Hour Detection

**AmI:** `isPeakHour` is a derived boolean: `commutingCount / totalTenants >= 0.30`. Recomputed on every scheduler tick. Pure function of state — no side effects in the detection itself.

**AlI:** Peak hour is felt throughout the tower — elevators fill up, the lobby pounds with black bars, audio intensifies. The player knows when rush hour hits because the tower communicates it, not a UI label.

**TlI:** Peak hour signal becomes a cross-system event bus tap. Audio engine raises ambient crowd noise. Lighting system shifts to warmer hues. Elevator queue pressure rises. All systems react to one shared signal.

**Feature Slice:** Enrichment to `src/features/time/store/timeStore.ts` (add `isPeakHour`) + `src/features/population/scheduler/OccupantScheduler.ts` (emit peak signal).

---

### E11 — TowerGraph → Stair Nodes

**AmI:** Stair nodes are structurally identical to elevator nodes in `TowerGraph` but with different `travelTime` and `capacity` attributes. The pathfinder must prefer stairs for ≤2-floor deltas and elevators otherwise.

**AlI:** Stairs reduce elevator crowding naturally. The player who places stairs near residential floors gets rewarded with less elevator pressure without being told to do so — emergent good design.

**TlI:** Stair nodes extend the navigation graph's realism, making multi-floor path selection non-trivial and floor-height optimization a genuine tower design consideration.

**Feature Slice:** Enrichment to `src/features/population/navigation/TowerGraph.ts` + new `src/features/population/navigation/StairNode.ts`

---

> **🔗 Artifact Binding — Extended Features (Phases 7–11) Handshake**
> At the completion of each Phase 7–11 planning or implementation checkpoint, synchronize with:
> - Artifact Plan: `C:\Users\Administrator\.gemini\antigravity\brain\29d06573-813c-4d8b-9637-4f76e2979103\implementation_plan.md`
> - Artifact Tasks: `C:\Users\Administrator\.gemini\antigravity\brain\29d06573-813c-4d8b-9637-4f76e2979103\task.md`
> Mark corresponding phase [x] complete in both artifact and development-tasks before proceeding.
