# Time Simulation & Services Restructure Plan

This plan introduces an active Time Engine with a functional Day/Night simulation and Work-Week tracking, fully restructuring how services are manifested and how the financial cycle calculates and updates.

## Goal Description
*(Original Phases 1-4 COMPLETED)*

## Phase 5: GUI Elevation & Component Modularity (Appended)

### 1. SmartTooltip Modularity (FSD Compliance)
#### [MODIFY] `src/shared/components/SmartTooltip.tsx`
- Decouple `SmartTooltip.tsx` from the monolithic `SimulationStore.ts`.
- **Implementation**: Spin off `activeTooltipId` into an ultra-lightweight, isolated `tooltipStore.ts` inside `src/shared/components/` (or utilize a localized React Context) to ensure Shared components abide strictly by bounded context rules without contaminating the unified Simulation state.

### 2. Selection Panel Tenancy Stripping
#### [MODIFY] `src/features/ui/panels/SelectionPanel.tsx`
- Ensure purely supportive classes (e.g. `Lobby`, `Structure`, `FootTraffic`, `Services`) do not awkwardly populate an empty occupant/tenancy slot interface. Render the "Occupant" section conditionally, restricted exclusively to Residential, Commercial, Restaurant, and Office classes.

### 3. Build Menu Tooltips (Data Deep Dive)
#### [MODIFY] `src/features/ui/toolbars/BuildToolbar.tsx`
- Expand the `RoomInfoTooltip` to automatically source and render `price` formatted smartly (e.g. `$140k`).
- Display estimated income or upkeep requirements sourced directly from the truth payload `metadata.average_rent` / `metadata.upkeep_cost`.
- Force `class: "Services"` modules to individually enumerate their precisely provided `masterTraitSchema` services in the active tooltips.

### 4. Build Menu Button Overhaul
#### [MODIFY] `src/features/ui/toolbars/BuildToolbar.tsx`
- Integrate numeric price visual integration directly on the UI card inside the `BuildToolbar`.
- **Layout**: `[Module Variant Name] - $140K [Quality Stars]`

## Verification Plan
1. Ensure SmartTooltip retains its robust auto-flipping edge logic while severed from global state.
2. Verify non-rentable utilities (Elevators, Lobbies) no longer display the Assign Tenant box.
3. Visually cross-examine tooltips in the `BuildToolbar` vs the master `roomMetadata.json`.
4. Run integration tests to prove `npm run lint` handles structural changes natively.
