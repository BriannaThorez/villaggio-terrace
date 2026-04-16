# Tenancy and Finance Systems Implementation Plan

[Goal Description]
Develop a modular Tenancy feature slice that adds an interactive "Choose Occupant" context to the Room Information Panel and integrates a Silhouette quick-menu into the Selection Overlay (RadialMenu schema). Concurrently install a robust Finance system parsing specific utility demands (e.g. internet, water, power) and construction costs from `roomMetadata.json`, automatically syncing aggregate capacities to the Main Toolbar with O(1) continuous resolution.

## User Review Required

> [!IMPORTANT]
> The Finance slice will directly hook into `useSimulationStore`. Adding a room will immediately subtract its `price` from `spendableMoney`. Empty rooms will generate base costs, and filled rooms (via Tenancy system) will generate `average_rent`. Please confirm the exact baseline economy rules for empty rooms (should empty rooms just generate 0 income, or incur maintenance costs?). 

> [!IMPORTANT]
> A person silhouette (User Icon) will replace the Rotation handle (⟳) in `SelectionIndicator.tsx`. Do you prefer a Lucide-React `User` icon, or `Users` to represent occupancy?

## Proposed Changes

💾 [STEP 0]: Invoke `briannas_snapshot_skill` to create a repository snapshot before proceeding.

---

### UI Panels & Overlays

#### [MODIFY] SelectionPanel.tsx (file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/ui/panels/SelectionPanel.tsx)
- Integrate `<TenancyDialogTrigger />` when a Residential/Commercial/Office node is selected.
- Add "Assign Occupant" button mapping to the Tenancy slice.

#### [MODIFY] SelectionIndicator.tsx (file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/ui/world_ui/SelectionIndicator.tsx)
- Replace `ROTATE_BUTTON_SCALE` with `TENANCY_MENU_SCALE`.
- Replace the Rotation "⟳" icon handle with a Person Silhouette icon `<User size={...} />`.
- Mount `<TenancyRadialMenu shapeId={shape.id} />` in place of the rotation trigger. 

#### [MODIFY] TenancyRadialMenu.tsx (file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/ui/world_ui/TenancyRadialMenu.tsx)
- [NEW] Clone the behavior of `RadialMenu.tsx` but populate it with occupancy configurations (e.g., "Find Resident", "Evict", "View Tenant").

---

### Tenancy Feature Slice (Modular)

#### [NEW] tenancyStore.ts (file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/tenancy/store/tenancyStore.ts)
- Define `TenancyState` mapping `shapeId` -> `{ tenantId, name, moveInDate, monthlyRent }`.
- Provide `assignTenant(roomId: string, tenantData...)` and `evictTenant(roomId: string)`.

---

### Finance & Resources Feature Slice (Modular)

#### [NEW] financeStore.ts (file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/finance/store/financeStore.ts)
- Maintain `updateGlobalResources()` based on total `roomMetadata` parsing (aggregating all placed components).
- Integrate simulation clock (ticks) to deposit `average_rent` for occupied rooms and deduct baseline requirements.

#### [MODIFY] MainToolbar.tsx (file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/ui/toolbars/MainToolbar.tsx)
- Disconnect static resource counts.
- Hydrate from `financeStore` aggregates (Power: available - usage).

#### [MODIFY] store.ts (file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/shared/utils/store.ts)
- Inject finance hook in `addShape` to subtract `room.price` instantly. 

## Open Questions
- What is the default time step for rent collection (1 day = X seconds, rent monthly)?
- Does the `roomManifest` price update correctly if a shape requires deleting intersecting blocks during merge?

## Verification Plan
### Automated Tests
- TypeScript compliance (`tsc --noEmit`).
- Validate `roomMetadata.json` parsing.

### Manual Verification
1. Add an apartment -> Price triggers deduction.
2. Open Room Information panel -> Click "Assign Occupant".
3. Right click room -> Overlay has User Icon -> Hover opens Tenancy radial menu.
4. Assigned room adds `average_rent` to total on tick.
