# Hotel Room Class — Implementation Plan

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

> **Cross-reference:**
> - Population Plan: [development-implementation-plan-population_system.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/development-implementation-plan-population_system.md)
> - This Plan is a **prerequisite** for Population System Phase 10 (Hotel System / P17).
> - roomMetadata.json: [roomMetadata.json](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/entities/rooms/roomMetadata.json)

---

## Overview

This plan establishes the **Hotel** as a first-class room category in Villaggio Terrace — a hospitality class conceptually derived from residential anatomy (rooms, floors, occupancy) but architecturally distinct: **no permanent tenants**, transient-guest-only occupancy, and a service-capacity model where a `Hotel Reception Desk` providers a finite pool of service units consumed by individual `Hotel Rooms`.

**Design Intent (AmI · AlI · TlI):**
- **Axiomatic (AmI):** Hotel is a `roomMetadata.json` class. All game systems — placement, rendering, finance, population — must route through the class the same way they handle `Apartment`, `Office`, etc. No special-casing at the system level.
- **Axiological (AlI):** The Hotel class enables the transient population loop (Phase 10 → P17 of Population). It is the economic and spatial prerequisite for hotel guest lifecycles, overnight revenue, and hotel occupancy KPIs.
- **Teleological (TlI):** Create a playable, balanced hotel mechanic — build a Reception Desk, build Hotel Rooms, cap service capacity at 10 rooms per desk, see guests arrive, get revenue, upgrade to higher-tier rooms as you expand.

**Inspiration:**
- **SimTower:** Hotel guests arrive in the evening, stay overnight, and leave in the morning. Each hotel unit is a discrete occupied slot. Lobby congestion directly affects guest satisfaction.
- **Yoot Tower:** Hotel Desk staffing limits occupancy. Building too many rooms without desks degrades service quality. Adding desks scales capacity.
- **Project Highrise:** Hotel as a revenue-generating component with amenity satisfaction scores.

---

## 💾 Step 0 — Snapshot

> Invoke `briannas_snapshot_skill` before any code changes.

---

## User Review Required

> [!IMPORTANT]
> **No permanent tenants.** Hotel rooms must never be assigned to the `tenancyStore` in the permanent-resident sense. The `tenancyStore.occupyHotelSlot / vacateHotelSlot` API (Phase 10 of Population) handles transient binding. This plan creates the room data layer and simulation plumbing ONLY. The guest population loop lives in Population Phase 10.

> [!IMPORTANT]
> **Service capacity model.** The Reception Desk provides `hotel_reception_services.capacity = 10`. Each Hotel Room consumes 1. If a player places more rooms than desk capacity allows, the surplus rooms enter a `NO_RECEPTION` warning state (visually indicated). This is the SimTower-style "build desk first" mechanic.

> [!NOTE]
> **Texture parity.** Hotel rooms share the `residence` texture set by default (beige_wall_1, wood_floor_1). Luxury tier hotel rooms will get their own texture set in a future enrichment.

> [!NOTE]
> **Phase dependency.** This plan (Hotel Room class) must be COMPLETE before Population System Phase 10 (Hotel Guest Lifecycle) begins.

---

## Proposed Changes

### Phase H0 — roomMetadata.json Injection ✅ (COMPLETE)

> **Artifact Augmentation Section** (see header)

**Status: COMPLETE** — Executed via `inject_hotel_rooms.js` tool.

**Verified injections:**
1. `masterTraitSchema.services.Hotel` — 8-service list including `hotel_reception_services`
2. `classLibrary.Hotel` — description, masterTraitList, `serviceCapacityModel`
3. `rooms[]` — `hotel-reception-desk` (6×1, capacity 10 provider) + `hotel-room-basic` (4×1, capacity 1 consumer)

> **🔗 Artifact Binding — Phase H0 Completion Handshake**
> 1. Mark Phase H0 `[x]` in [development-tasks-hotel_room_class.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/development-tasks-hotel_room_class.md)
> 2. Mark Phase H0 `COMPLETE` in artifact plan Status Tracker (artifact: `implementation_plan_hotel.md`)
> 3. Verified: `node -e "..." ` confirms 2 Hotel rooms injected with correct service model.

---

### Phase H1 — Type System & Store Integration

> **Artifact Augmentation Section** (see header)

*Wire the Hotel class into TypeScript type definitions and Zustand stores.*

#### [MODIFY] `src/entities/rooms/roomTypes.ts` (or equivalent room class union)
- Add `'Hotel'` to the `RoomClass` union type.
- Add `HotelRoomMetadata` interface extending base `RoomMetadata`:
  ```ts
  interface HotelRoomMetadata extends BaseRoomMetadata {
    permanent_tenants: false;
    nightly_rate_base: number;
    occupancy: HotelOccupancyConfig;
    tags: string[];
  }
  interface HotelOccupancyConfig {
    type: 'transient';
    max_guests_per_room: number;
    min_stay_hours: number;
    max_stay_hours: number;
    check_in_hour: number;
    check_out_hour: number;
  }
  ```

#### [MODIFY] `src/features/simulation/store/simulationStore.ts`
- Add `hotelReceptionCapacity: Record<roomId, number>` — live remaining capacity per desk.
- Add `hotelRoomServiceStatus: Record<roomId, 'SERVICED' | 'NO_RECEPTION'>` — computed from desk proximity & remaining capacity.
- Add `recomputeHotelCapacity(): void` — called on shape add/remove. O(N) scan of all placed Hotel rooms, resolves provider→consumer relationships.

#### [NEW] `src/features/hotel/hotelCapacityEngine.ts`
Central capacity resolver:
```ts
interface HotelCapacityMap {
  desks: Record<roomId, { totalCapacity: number; assignedRooms: string[] }>;
  rooms: Record<roomId, { deskId: string | null; status: 'SERVICED' | 'NO_RECEPTION' }>;
}
```
`buildHotelCapacityMap(placedShapes: Shape[]): HotelCapacityMap`
- Scans placed shapes for `class === 'Hotel'`
- Matches `hotel-reception-desk` providers to `hotel-room-basic` consumers
- Assignment strategy: nearest desk first, up to desk capacity (10)
- Returns computed map — consumed by `simulationStore.recomputeHotelCapacity()`

> **🔗 Artifact Binding — Phase H1 Completion Handshake**
> 1. Mark Phase H1 `[x]` in dev tasks + artifact task.
> 2. Mark Phase H1 `COMPLETE` in artifact plan Status Tracker.
> 3. Proceed to Phase H2 only after `npx tsc --noEmit` passes.

---

### Phase H2 — Placement Validation & Visual Feedback

> **Artifact Augmentation Section** (see header)

*Enforce the service-capacity model at placement time.*

#### [MODIFY] `src/features/simulation/placement/PlacementValidator.ts`
- Add `validateHotelPlacement(newShape, placedShapes): ValidationResult`
  - If `class === 'Hotel' && id === 'hotel-room-basic'`: check remaining desk capacity > 0
  - If no desk exists: return `{ valid: true, warnings: ['NO_RECEPTION_DESK'] }` (placement allowed but warned)
  - If desk at capacity: return `{ valid: true, warnings: ['DESK_AT_CAPACITY'] }` (placement allowed, room enters NO_RECEPTION state)

#### [NEW] `src/features/hotel/components/HotelCapacityIndicator.tsx`
- Renders above each `hotel-reception-desk` shape in the 3D scene
- Shows `X / 10` rooms serviced as a small HUD badge
- Color: green (capacity available), amber (≥8/10), red (10/10 full)
- Uses `useFrame` + `hotelCapacityMap` singleton — zero React re-renders per frame

#### [MODIFY] `src/features/simulation/components/RoomWarningOverlay.tsx` *(or create if absent)*
- Add `NO_RECEPTION` warning state: renders an amber dashed border on the Hotel Room + tooltip "No Reception Desk coverage"
- Add `DESK_AT_CAPACITY` warning: same amber border + tooltip "Reception Desk at full capacity. Add another desk."

> **🔗 Artifact Binding — Phase H2 Completion Handshake**
> 1. Mark Phase H2 `[x]` in dev tasks + artifact task.
> 2. Mark Phase H2 `COMPLETE` in artifact plan.
> 3. Commit: `feat(hotel): type system, capacity engine, placement validation, HUD indicators`

---

### Phase H3 — Finance Integration

> **Artifact Augmentation Section** (see header)

*Hotel rooms generate nightly revenue via the guest population loop.*

#### [MODIFY] `src/features/finance/store/financeStore.ts`
- Add `hotelNightlyRevenue: number` KPI accumulator.
- Add `recordHotelCheckout(roomId: string, guestId: string, nightsStayed: number): void`
  - `amount = nightsStayed * room.metadata.nightly_rate_base * occupancyModifier`
  - Accumulates into `weeklyGuestRevenue` per existing pattern.
- Add `getHotelOccupancyKPI(): { totalRooms: number; occupiedRooms: number; rate: number }`

#### [MODIFY] `src/features/ui/panels/SelectionPanel.tsx`
- For selected Hotel Room: show `nightly_rate_base`, `occupancy.status`, guest name + checkout time (if occupied).
- For selected Hotel Reception Desk: show capacity gauge (X/10) + list of serviced room IDs.

> **🔗 Artifact Binding — Phase H3 Completion Handshake**
> 1. Mark Phase H3 `[x]` in dev tasks + artifact task.
> 2. Mark Phase H3 `COMPLETE` in artifact plan.
> 3. Commit: `feat(hotel): finance integration — nightly revenue, occupancy KPI, selection panel`
> 4. **⚡ This is the population handshake boundary.** Phase H3 complete → Population System Phase 10 (Hotel Guest Lifecycle) may begin.

---

### Phase H4 — Hotel Room Expansion Tiers (Future Enrichment)

> **Artifact Augmentation Section** (see header)

*Planned for future development. Defined here as an architectural reservation.*

Rooms to inject in a future iteration via a new script `inject_hotel_rooms_tier2.js`:
- `hotel-room-deluxe` — 5×1, nightly_rate_base: 280, consumes 1 desk unit
- `hotel-room-luxury` — 6×1, nightly_rate_base: 450, consumes 1 desk unit
- `hotel-suite` — 8×1, nightly_rate_base: 750, consumes 2 desk units
- `hotel-penthouse-suite` — 10×2, nightly_rate_base: 1200, consumes 3 desk units
- `hotel-reception-desk-deluxe` — 8×1, capacity: 20, provides hotel_reception_services

> **🔗 Artifact Binding — Phase H4 (Planned)**
> Not yet started. Create a new plan amendment when this tier is scheduled.

---

## Verification Plan

### Automated
```powershell
# Verify JSON integrity
node -e "JSON.parse(require('fs').readFileSync('src/entities/rooms/roomMetadata.json','utf8')); console.log('JSON valid');"

# TypeScript check
npx tsc --noEmit

# ESLint
npx eslint src/features/hotel src/entities/rooms --ext .ts,.tsx
```

### Manual QA Checkpoints
- **H0**: `roomMetadata.json` has `classLibrary.Hotel`, `masterTraitSchema.services.Hotel`, 2 Hotel room entries.
- **H1**: `RoomClass` type includes `'Hotel'`. `simulationStore` exposes `hotelRoomServiceStatus`.
- **H2**: Placing a Hotel Room without a desk → amber NO_RECEPTION border. Placing 11 rooms with one desk → 11th room gets `DESK_AT_CAPACITY` warning. Capacity indicator updates on shape add/remove.
- **H3**: Checkout event fires → `financeStore.weeklyGuestRevenue` increases. SelectionPanel shows nightly rate and occupancy on selected hotel room.

---

## Feature Enrichment Predictions

| ID | Feature | Description |
|---|---|---|
| HE1 | Hotel Star Rating | Computed from room tier mix + amenity score. Higher = premium nightly rate multiplier |
| HE2 | Guest Reviews | Each departing guest generates a review seed (satisfaction score → comment). Displayed in SelectionPanel |
| HE3 | Seasonal Demand | Weekend + holiday multipliers on nightly rates. Configurable in `hotelSpawnPolicy` |
| HE4 | Minibar / Room Service Revenue | Optional add-ons per hotel room generating micro-revenue events during stay |
| HE5 | Hotel Floor Clustering Bonus | All hotel rooms on same floor → community bonus, reduced noise complaints |
| HE6 | Concierge Upgrade | Dedicated concierge room (2×1) boosts guest satisfaction across all hotel rooms in tower |
| HE7 | Hotel Branding | Player-named hotel with custom sign (cosmetic) |
| HE8 | Corporate Block Bookings | Office tenants' visiting VIP guests automatically routed to hotel rooms |
