# Prompt — Population System (Tenants & Guests)

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

## AI Analysis

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
6. **selectability**: Clicking on a person bar triggers `setSelectedId` in a new `populationStore`, which surfaces data to a dedicated population info panel.
