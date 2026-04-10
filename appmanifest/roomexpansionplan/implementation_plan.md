# Dynamic Data-Driven Build System (SSOT Architecture)

This architectural phase shifts the simulation from hardcoded build tools to a fully dynamic system governed by `roomMetadata.json`. The metadata will act as the Single Source of Truth (SSOT), dictating room nomenclature, categorization, and physical bounds.

## User Review Required
None - Proceeding to automate GUI generation and spatial bounds logic.

## 💾 Snapshot Protocol
Prior to commencement, a system state snapshot will be recorded.

## Proposed Changes

### [Feature] [BuildToolbar.tsx](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/ui/toolbars/BuildToolbar.tsx)
Summary: Refactor to procedurally generate menus from metadata.
- **Dynamic Aggregation**: Group `roomMetadata.json` by `.category`.
- **Procedural SubTypes**: Generate the `subTypes` arrays, reading `.name`, `.id`, and dynamically calculating GUI display colors if necessary (or pulling from a color map).

### [Feature] [SimulationCanvas.tsx](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/widgets/SimulationCanvas.tsx)
Summary: Completely gut the hardcoded sizing switch-case in favor of metadata-driven placement math.
- **Sizing Resolution**: Look up the selected `activeModuleId` in the metadata list during raycasting/placement.
- **Spatial Matrix Computation**: 
  - `nodeSize` width = `metadata.dimensions.width * 10`
  - `nodeSize` height = `metadata.dimensions.height * 40`
- **Dynamic Vertices**: Generate the `[-halfW, -halfH]` bounding box vectors procedurally using the computed `nodeSize`.

## Verification Plan

### Automated Tests
- Run `npx tsc --noEmit` to verify type propagation for `metadataId` usage.

### Manual Verification
- Select different sized modules from the dynamically generated Build Bar (e.g., Small Office vs. Large Cinema) and verify their placement holograms and physical meshes respect the exact `dimensions` declared in `roomMetadata.json`.
