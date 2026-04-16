# Walkthrough - Tenancy and Finance Systems

I have implemented a modular Tenancy and Finance system, fully integrated with the GUI and existing room metadata.

## Key Accomplishments

### 1. Robust Finance Engine 💰
- **Modular Store**: Created `financeStore.ts` to track income, resource usage, and capacities.
- **Construction Costs**: Room placement now deducts `price` from `spendableMoney` based on `roomMetadata.json`.
- **Dynamic Resources**: The toolbar now displays `Usage / Capacity` for Power, Water, and Internet, updating in real-time as rooms are placed.
- **Simulation Tick**: Implemented a background tick that generates revenue from occupied rooms.

### 2. High-Fidelity Tenancy System 🏠
- **Unified Logic**: Both the room overlay and information panel now share the same `tenancyStore.ts`.
- **Selection Overlay GUI**: Replaced the rotation handle with a **Person Silhouette** icon. Hovering/Clicking it opens a quick-access Tenancy radial menu.
- **Room Information Panel GUI**: Integrated a new "Tenancy Status" section in `SelectionPanel.tsx` allowing for occupant assignment and eviction directly from the panel.

## Implementation Details

### Files Modified/Created:
- [tenancyStore.ts](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/tenancy/store/tenancyStore.ts) [NEW]
- [financeStore.ts](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/finance/store/financeStore.ts) [NEW]
- [TenancyRadialMenu.tsx](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/ui/world_ui/TenancyRadialMenu.tsx) [NEW]
- [SelectionIndicator.tsx](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/ui/world_ui/SelectionIndicator.tsx) [MODIFY]
- [SelectionPanel.tsx](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/ui/panels/SelectionPanel.tsx) [MODIFY]
- [MainToolbar.tsx](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/ui/toolbars/MainToolbar.tsx) [MODIFY]
- [store.ts](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/shared/utils/store.ts) [MODIFY]

## Verification
- Verified construction price lookup using `roomMetadata.json` during `addShape`.
- Confirmed bi-directional sync between Tenancy GUI components.
- Validated real-time resource aggregation in the Main Toolbar.

> [!NOTE]
> The simulation tick is currently set to a 5-second interval for stability, depositing a portion of monthly rent into the treasury. You can adjust this in `MainToolbar.tsx`.
