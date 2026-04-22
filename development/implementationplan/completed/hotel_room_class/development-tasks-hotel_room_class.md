# Tasks — Hotel Room Class

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
> - Dev Plan: [development-implementation-plan-hotel_room_class.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/development-implementation-plan-hotel_room_class.md)
> - Population Plan: [development-implementation-plan-population_system.md](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/development/implementationplan/development-implementation-plan-population_system.md)
> - roomMetadata.json: [roomMetadata.json](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/entities/rooms/roomMetadata.json)
> - **Prerequisite for:** Population System Phase 10 (Hotel Guest Lifecycle / P17)

---

## 💾 Phase H-PRE — Snapshot

- [ ] Invoke `briannas_snapshot_skill`
- [ ] 🔗 Confirm snapshot → proceed to Phase H0

---

## Phase H0 — roomMetadata.json Injection ✅ COMPLETE

> **Artifact Augmentation Section** (see header)

- [x] Read `roomMetadata.json` to understand structure (2955 lines, 85 KB)
- [x] Create idempotent injection script `inject_hotel_rooms.js` (scratch dir)
- [x] **Patch 1** — `masterTraitSchema.services.Hotel` injected (8 services including `hotel_reception_services`)
- [x] **Patch 2** — `classLibrary.Hotel` injected with:
  - [x] `description` — transient hospitality, no permanent tenants
  - [x] `masterTraitList` — 8 hotel services
  - [x] `serviceCapacityModel` — provider/consumer capacity model docs
- [x] **Patch 3** — `rooms[]` entries injected:
  - [x] `hotel-reception-desk` (6×1, price: $280k, provides 10 units `hotel_reception_services`)
  - [x] `hotel-room-basic` (4×1, price: $120k, consumes 1 unit, nightly_rate: $180, check-in 15:00 / check-out 11:00)
- [x] Verified: `node` spot-check confirms 102 total rooms, 2 Hotel rooms, correct service model
- [x] JSON integrity: parse succeeds cleanly
- [ ] 🔗 **Phase H0 → Artifact Binding Handshake**
  - [ ] Mark Phase H0 `COMPLETE` in artifact plan Status Tracker
  - [ ] Commit: `feat(hotel): inject Hotel class into roomMetadata.json — reception desk + basic room`

---

## Phase H1 — Type System & Store Integration

> **Artifact Augmentation Section** (see header)

- [x] **H1.1** Locate and read room class union type file (likely `src/entities/rooms/roomTypes.ts` or similar)
- [x] **H1.2** Add `'Hotel'` to `RoomClass` union
- [x] **H1.3** Define `HotelRoomMetadata` interface:
  - [x] `permanent_tenants: false`
  - [x] `nightly_rate_base: number`
  - [x] `occupancy: HotelOccupancyConfig`
  - [x] `tags: string[]`
- [x] **H1.4** Define `HotelOccupancyConfig` interface:
  - [x] `type: 'transient'`
  - [x] `max_guests_per_room: number`
  - [x] `min_stay_hours / max_stay_hours`
  - [x] `check_in_hour / check_out_hour`
- [x] **H1.5** Create `src/features/hotel/hotelCapacityEngine.ts`:
  - [x] `HotelCapacityMap` type
  - [x] `buildHotelCapacityMap(shapes): HotelCapacityMap`
  - [x] Nearest-desk-first assignment strategy
  - [x] Singleton `hotelCapacityEngine`
- [x] **H1.6** Modify `simulationStore.ts`:
  - [x] Add `hotelReceptionCapacity: Record<roomId, number>`
  - [x] Add `hotelRoomServiceStatus: Record<roomId, 'SERVICED' | 'NO_RECEPTION'>`
  - [x] Add `recomputeHotelCapacity(): void` action
  - [x] Wire `recomputeHotelCapacity()` to shape add/remove events
- [x] **H1.7** `npx tsc --noEmit` — zero errors
- [x] **H1.8** `npx eslint src/features/hotel src/entities/rooms --ext .ts,.tsx`
- [x] ⏸️ Phase H1 QA Checkpoint — `RoomClass` includes `'Hotel'`; `hotelCapacityEngine.buildHotelCapacityMap()` returns correct structure
- [x] 🔗 **Phase H1 → Artifact Binding Handshake**
  - [x] Mark Phase H1 `COMPLETE` in artifact plan Status Tracker
  - [x] Mark Phase H1 `[x]` in this tasks file
  - [x] Proceed to Phase H2

---

## Phase H2 — Placement Validation & Visual Feedback

> **Artifact Augmentation Section** (see header)

- [x] **H2.1** Modify `PlacementValidator.ts`:
  - [x] Add `validateHotelPlacement(newShape, placedShapes): ValidationResult`
  - [x] Warning: `NO_RECEPTION_DESK` — no desk exists in tower
  - [x] Warning: `DESK_AT_CAPACITY` — nearest desk at 10/10
  - [x] Hotel room placements are always allowed (non-blocking) — warnings only
- [x] **H2.2** Create `src/features/hotel/components/HotelCapacityIndicator.tsx`:
  - [x] Renders above each `hotel-reception-desk` shape
  - [x] HUD badge: `X / 10 rooms`
  - [x] Color: green (<8), amber (≥8), red (10/10)
  - [x] `useFrame` reads `hotelCapacityMap` singleton — no React re-renders per frame
  - [x] `React.memo` wrapped
- [x] **H2.3** Modify/create `RoomWarningOverlay`:
  - [x] `NO_RECEPTION` — amber dashed border + tooltip
  - [x] `DESK_AT_CAPACITY` — amber dashed border + different tooltip
- [x] **H2.4** Wire `HotelCapacityIndicator` into `SimulationCanvas.tsx`
- [x] **H2.5** `npx tsc --noEmit` — zero errors
- [x] **H2.6** `npx eslint src/features/hotel src/widgets --ext .ts,.tsx`
- [x] ⏸️ Phase H2 QA Checkpoint:
  - [x] Place 1 desk → badge shows `0 / 10`
  - [x] Place 1 hotel room → badge shows `1 / 10`, room shows green (SERVICED)
  - [x] Place 10 hotel rooms → badge shows `10 / 10` (red), 11th room shows `DESK_AT_CAPACITY`
  - [x] Place hotel room with NO desk → `NO_RECEPTION_DESK` amber border
- [x] 🔗 **Phase H2 → Artifact Binding Handshake**
  - [x] Mark Phase H2 `COMPLETE` in artifact plan Status Tracker
  - [x] Mark Phase H2 `[x]` in this tasks file
  - [x] Commit: `feat(hotel): capacity engine, placement validation, capacity HUD badge`

---

## Phase H3 — Finance Integration

> **Artifact Augmentation Section** (see header)

- [x] **H3.1** Modify `src/features/finance/store/financeStore.ts`:
  - [x] Add `hotelNightlyRevenue: number` KPI accumulator
  - [x] Add `recordHotelCheckout(roomId, guestId, nightsStayed): void`
  - [x] `amount = nightsStayed * nightly_rate_base * occupancyModifier`
  - [x] Accumulate into `weeklyGuestRevenue` per existing pattern
  - [x] Add `getHotelOccupancyKPI(): { totalRooms, occupiedRooms, rate }`
- [x] **H3.2** Modify `SelectionPanel.tsx`:
  - [x] Hotel Room selected → show nightly rate, occupancy status, guest + checkout time
  - [x] Hotel Reception Desk selected → show capacity gauge (X/10), serviced room ID list
- [x] **H3.3** `npx tsc --noEmit` — zero errors
- [x] **H3.4** `npx eslint src/features/hotel src/features/finance src/features/ui --ext .ts,.tsx`
- [x] ⏸️ Phase H3 QA Checkpoint:
  - [x] Guest checkout → `financeStore.weeklyGuestRevenue` increments correctly
  - [x] `getHotelOccupancyKPI()` returns correct rate for placed hotel rooms
  - [x] SelectionPanel shows correct hotel room data
- [x] 🔗 **Phase H3 → Artifact Binding Handshake (Hotel Foundation Complete)**
  - [x] Mark Phase H3 `COMPLETE` in artifact plan Status Tracker
  - [x] Mark Phase H3 `[x]` in this tasks file
  - [x] Commit: `feat(hotel): finance integration — nightly revenue, occupancy KPI, selection panel`
  - [x] ⚡ **HANDSHAKE to Population System:** Phase H3 complete → Unblock Population System Phase 10 (Hotel Guest Lifecycle / P17). Update `development-implementation-plan-population_system.md` Phase 10 prerequisite status to `UNBLOCKED`.

---

## Phase H4 — Expansion Tiers (Planned / Not Started)

> **Artifact Augmentation Section** (see header)

- [ ] Design `inject_hotel_rooms_tier2.js` script
- [ ] Define `hotel-room-deluxe` (5×1, $280/night)
- [ ] Define `hotel-room-luxury` (6×1, $450/night)
- [ ] Define `hotel-suite` (8×1, $750/night, consumes 2 desk units)
- [ ] Define `hotel-penthouse-suite` (10×2, $1200/night, consumes 3 desk units)
- [ ] Define `hotel-reception-desk-deluxe` (8×1, capacity 20)
- [ ] 🔗 Create new plan amendment when scheduled
