# Tasks: Tenancy and Finance Systems

- [ ] 💾 **Snapshot**
  - [ ] Invoke `briannas_snapshot_skill`

- [x] **Phase 1: Feature Layout (Tenancy)**
  - [x] Create `src/features/tenancy/store/tenancyStore.ts` for unified occupant handling
  - [x] Create `TenancyRadialMenu.tsx` identical to `RadialMenu.tsx` mechanisms
  - [x] Update `SelectionIndicator.tsx` to replace Rotate Icon with Person Silhouette triggering `TenancyRadialMenu`
  - [x] Update `SelectionPanel.tsx` UI to hook into Tenancy Dialogs
  - [x] Run linting and Verification (TypeScript QA)

- [x] **Phase 2: Feature Layout (Finance & Resources)**
  - [x] Create `src/features/finance/store/financeStore.ts`
  - [x] Build O(1) sync function parsing `roomMetadata.json` capacity bounds vs built rooms
  - [x] Implement build-cost extraction in `addShape` logic
  - [x] Run linting and Verification (TypeScript QA)

- [x] **Phase 3: Unification and Testing**
  - [x] Combine Tenancy Rent calculations into Finance tick
  - [x] Update `MainToolbar.tsx` to read dynamic capacities and funds
  - [x] Run full runtime validation and resolve missing imports
