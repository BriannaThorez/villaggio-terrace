# Tasks: Generalized Residence & Dynamic Texture Pipeline

- [ ] **Phase 1: Metadata Matrix Standardization**
  - [ ] Extend `roomMetadata.json` schema to support `wallTexture`, `floorTexture`, and `ceilingTexture`.
  - [ ] Migrate the `studio1` definition within `roomMetadata.json` to a generalized `residence` key.
  - [ ] Assign default string texture keys to the new `residence` configuration.
  - [ ] Run `tsc --noEmit` and `npm run lint` to parse logic errors from metadata refactor.

- [ ] **Phase 2: Pipeline Refactoring & Asset Preloader Synchronization**
  - [ ] Update `MaterialParser.ts` logic to accept `RoomSurfaceMetadata` payloads from `roomMetadata.json` context.
  - [ ] Deprecate static generators like `getResidentialMaterials()` in favor of dynamic generator mapping.
  - [ ] Refactor `src/features/assetPreloader/api/preload.ts` to scan `roomMetadata.json` for unique texture variants.
  - [ ] Assure `runPreload()` caches dynamic payloads into 4K VRAM.
  - [ ] Run `tsc --noEmit` and verify structural typing alignment across the parser engine.

- [ ] **Phase 3: Unifying `studio1` To Generic `residence`**
  - [ ] Rename `Studio1.tsx` strictly to `Residence.tsx` (or `ResidentialUnit.tsx` per FSD layout).
  - [ ] Modify `Residence.tsx` prop-interface to inject `wallTextureId`, `floorTextureId`, and `ceilingTextureId`.
  - [ ] Refactor `SimulationNodes.tsx` (the render map) to iterate `type === "residence"` instead of obsolete tags, drilling down metadata payload directly into `Residence.tsx`.
  - [ ] Conduct rigorous manual walkthrough of GUI placement functionality. Guarantee floor/ceiling materials adhere correctly via normal mapping.
  - [ ] Validate standard `npm run lint` metrics (allow existing TS2304 legacy errors if out of scope).

- [ ] **Final QA**
  - [ ] Ensure backward compatibility parsing layer (map legacy `studio1` loads to `residence` if localstorage exists).
  - [ ] Final verification of `judder` removal on initialization.
