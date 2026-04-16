- [x] 💾 **Snapshot**
  - [x] Invoke `briannas_snapshot_skill`

- [x] **Phase 1: Feature Slice `src/features/time`**
  - [x] Create `timeStore.ts` state manager to track `sunTime`, `dayOfWeek` (1-7), `gameSpeed` (0=Paused, 1=Normal, 2=Fast, etc).
  - [x] Create `TimeEngine.tsx` component to handle requestAnimationFrame looping.
  - [x] Implement `10 in-game minutes = 1 real-world second` scaling inside `TimeEngine`.
  - [x] Interlock the day-change trigger to jump `dayOfWeek` by `1` when `sunTime` loops at midnight.
  - [x] Strip out the old `sunTime` tracking from `store.ts` ensuring all lighting logic respects `useTimeStore`.

- [x] **Phase 2: GUI Module**
  - [x] Locate `MainToolbar.tsx` and strip out the 'Export Data' icon/functionality.
  - [x] Add the Vertical Divider.
  - [x] Implement Play/Pause/Fast-Forward icons bounding the new `gameSpeed` state.
  - [x] Integrate a formatted `[M T W T F S S]` text flex container highlighting the active `dayOfWeek`.
  - [x] Build a digital clock string mapping directly to `sunTime` formatting.
  - [x] Verify `npm run lint` layout alignment.

- [x] **Phase 2-B: Expanded Speed Controls**
  - [x] Add `faster` (5x) and `super` (10x) speeds to the toolbar.
  - [x] Update `timeStore.ts` to support `5` and `10` as `GameSpeed` types and start at 6 AM (`sunTime: 0.25`).
  - [x] Wrap speeds in `SmartTooltip` displaying title and real/game time conversions.
  - [x] Verify framerate independence logic inside `TimeEngine`.

- [x] **Phase 3: Service Room Schema Data Restructure**
  - [x] Extract an array of all `class === "Services"` modules.
  - [x] Programmatically overwrite their sub-data map in `roomMetadata.json`.
  - [x] Inject `"upkeep_cost": 1500` uniformly.
  - [x] Inject `"services_provided"` matching their key variable defined structurally in `masterTraitSchema`.
  - [x] Preserve all legacy arrays/attributes that don't conflict, ensuring NO DATA LOSS.

- [x] **Phase 4: Game Logic & Overhaul (Finance/Validation)**
  - [x] Stop automatic 5-second ticking in `financeStore.ts`.
  - [x] Hook the logic to execute `updateBalances()` on specifically Friday at 17:00 (End of Work Week) or similar trigger inside `TimeEngine`.
  - [x] Update `SelectionPanel.tsx` conditional rendering to mask out zero-sum numeric outputs like $0 rent.
  - [x] Prepend `-` minus sign formatting and `/wk` string suffix for `upkeep_cost` and rent visuals.
  - [x] Execute programmatic validation checks to ensure `roomMetadata.json` services schema was written cleanly.
  - [x] Verify `npm run lint`.
  - [x] Quality Assurance manual test inside the WebGL browser framework.

- [x] **Phase 5: GUI Elevation & Component Modularity (Appended)**
  - [x] Spin off `activeTooltipId` from `store.ts` to `src/shared/components/tooltipStore.ts`.
  - [x] Remap `SmartTooltip.tsx` to utilize `useTooltipStore` instead.
  - [x] Update `SelectionPanel.tsx` logic to aggressively hide tenancy slots for non-occupiable nodes (Lobbies, Corridors, Services, etc.).
  - [x] Modify `BuildToolbar.tsx` tooltips to inject `price`, layout rendering to include `Expected Income/Upkeep`, and individually enumerate explicitly loaded `services_provided`.
  - [x] Recalculate build menu inline category buttons to display: `[Name] - $140K [Stars]`.
