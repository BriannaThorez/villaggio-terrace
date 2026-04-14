# Generalized Residence and Texture Pipeline Metadata Implementation

## 1. Axiomatic, Axiological, and Teleological Intent

*   **Axiomatic Intent (AmI):** Architectural state logic is inviolable. All residential configurations and their physical/material attributes must be strictly derived from a central metadata matrix (`roomMetadata.json`). Hardcoded variables inside entity renderers are a violation of state consistency.
*   **Axiological Intent (AlI):** Modularity, maintainability, and absolute aesthetic fidelity. By deprecating the rigid `studio1` moniker and coalescing around a generalized `residence` entity, we radically reduce component redundancy. Textures must remain PBR-accurate perfectly mapping spatial bounds.
*   **Teleological Intent (Tli):** To produce an infinitely scalable simulation where a limitless combination of room visuals can be hot-swapped or instantiated on the fly using pure metadata instructions, without introducing runtime GPU "judder" due to the pre-caching mechanism functioning dynamically alongside it.

---

## 2. Executive Summary
This implementation plan transitions the rigid `studio1` hardcoded component to a unified `residence` template. Simultaneously, it drives all texture assignments (`wall`, `floor`, `ceiling`) via `roomMetadata.json`, ensuring the preloader cache intercepts and warms these assets autonomously.

---

## 3. Implementation Phases

### Phase 1: Metadata Matrix Standardization
**Goal:** Migrate and standardize texture and residential data references within `roomMetadata.json`.
1.  **Refactor Room Metadata Schema:** Extend `roomMetadata.json` standard schema to explicitly include:
    *   `wallTexture` (e.g., `"beige_wall_1"`)
    *   `floorTexture` (e.g., `"wood_floor_1"`)
    *   `ceilingTexture` (e.g., `"concrete_wall_1"`)
2.  **Definition Update:** Ensure the generic `residence` class in `roomMetadata.json` carries an array or default configurations mapping to physical layouts (size combinations) and their assigned texture keys.
3.  *Verification/QA:* Run TypeScript schema tests (`eslint` and `tsc --noEmit`). Ensure the JSON validation does not shatter the simulation store.

### Phase 2: Pipeline Refactoring & Asset Preloader Synchronization
**Goal:** Hook the Simulation Canvas and MaterialParser into dynamic metadata mappings rather than static arrays.
1.  **Refactor `MaterialParser.ts`:**
    *   Deprecate rigid functions like `getResidentialMaterials()`.
    *   Implement/update `parseRoomMaterialFromMetadata(metadata: RoomSurfaceMetadata)` that accepts dynamic arguments supplied by the simulation node.
2.  **Synchronize Asset Preloader:**
    *   Update `src/features/assetPreloader/api/preload.ts` to scan `roomMetadata.json` specifically extracting all unique texture strings.
    *   Populate the `bundleCache` and execute `renderer.compile` against these dynamic texture variants to guarantee a judder-free experience.
3.  *Verification/QA:* Execute `tsc` and linter to resolve unmapped exports. Run the `AssetPreloader` UI locally to ensure smooth loading progress over the simulated dummy scenes.

### Phase 3: Unifying `studio1` To Generic `residence`
**Goal:** Standardize the physical React-Three-Fiber room template to consume the generalized properties.
1.  **Component Renaming:** Transition `Studio1.tsx` to a generalized `ResidentialUnit.tsx` (or `Residence.tsx`).
2.  **Prop Drilling Transformation:** Update the entity's signature to accept `wallTextureId`, `floorTextureId`, and `ceilingTextureId` (derived from metadata).
3.  **SimulationNodes Alignment:** In `SimulationNodes.tsx`, swap explicit renders of `shape.type === "residential"` (previously hard-keyed to studio1 configurations) to feed the metadata-driven texture values to the `ResidentialUnit` component.
4.  *Verification/QA:* Complete walkthrough of full placement pipeline. Verify grid placements no longer drop errors while the correct dynamic materials map to index [2] (floor), [3] (ceiling), and [0,1,4,5] (walls). Execute global `npm run lint`.

## 4. User Review Required
> [!WARNING]
> By generalizing `studio1` to `residence`, any previous manual layout saves using the key `"studio1"` within the local storage cache may need migration or a fallback map to avoid null reference crashes. Ensure backwards compatibility on initial launch if required.
