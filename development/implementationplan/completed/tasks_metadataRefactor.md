- [ ] 💾 **Snapshot**
  - [ ] Invoke `briannas_snapshot_skill`

- [x] **Phase 1: Codebase Audit & Script Prep**
  - [x] Audit `metadataUtils.ts` for tray/utility lookup logic
  - [x] Audit `SelectionPanel.tsx` and `TenancyRadialMenu.tsx` for metadata access
  - [x] Audit `financeStore.ts` for utility capacity calculations
  - [x] Create `migrateMetadata.js` in `scratch` folder

- [x] **Phase 2: Execution (Data Migration)**
  - [x] Run `migrateMetadata.js` to refactor `roomMetadata.json` (Incl. Preferences, Tenancy Table, and conversion of utility 'x' -> 1)
  - [x] Assure zero data-loss via key logging

- [x] **Phase 3: Dependency Updates**
  - [x] Update `metadataUtils.ts` to navigate `metadata.utilities`/`metadata.services`/`metadata.preferences`
  - [x] Update `metadataUtils.ts` to expose numeric values rather than booleans
  - [x] Update `financeStore.ts` to dynamically calculate consumption (`powerUse += utility.electricity || 0`) from placed room objects
  - [x] Update `SelectionPanel.tsx` UI to safely read and render updated traits

- [x] **Phase 4: Cleanup & Verification**
  - [x] Delete scratch scripts
  - [x] Verify UI rendering and store consumption in simulation
  - [x] Run linting checks
