# Migration Plan: Room Metadata Utilities and Services Refactoring

This plan outlines the steps to restructure `roomMetadata.json` by nesting utilities, services, and preferences into subtrees, and refactoring utilities from a binary presence ("x") to quantitative consumption values.

## User Review Required

> [!IMPORTANT]
> This is a structural migration. It changes the access path for preferences, utilities, and services in the codebase (e.g., from `meta.electricity` to `meta.utilities.electricity`). 
> Additionally, any utility currently marked `"x"` will be converted to the number `1` to act as a numeric consumption placeholder.

> [!WARNING]
> Downstream components (`metadataUtils.ts`, `financeStore.ts`, `SelectionPanel.tsx`, etc.) will be patched to consume the nested structures and interpret utilities as numeric values, allowing dynamic pool consumption per room.

## Proposed Changes

### [Component Name] Data Layer Migration

#### [MODIFY] [roomMetadata.json](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/entities/rooms/roomMetadata.json)
- Restructure the `metadata` object for each entry in the `rooms` array:
  - Migrate keys matching `masterTraitSchema.preferences` into a `preferences` subtree.
  - Migrate keys matching `masterTraitSchema.services` into a `services` subtree.
  - Migrate keys matching `masterTraitSchema.utilities` into a `utilities` subtree.
  - **Conversion:** For any utility value that is `"x"`, convert it to the integer `1`. (e.g., `"electricity": 1`).
  - **Injection:** Inject `"tenancy_table": "src/entities/tenants/tenancy_tabel.json"` into the root `metadata` object for all rooms.

### [Component Name] Dependency Integration

#### [MODIFY] [metadataUtils.ts](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/shared/utils/metadataUtils.ts)
- Update `resolveTraitsByCategory` to read from the newly nested `metadata.preferences`, `metadata.utilities`, and `metadata.services`.
- Adjust type definitions and parsing logic to accept numeric values for utilities.

#### [MODIFY] [financeStore.ts](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/finance/store/financeStore.ts)
- Update `updateBalances` to read nested utilities (e.g., `roomMeta.metadata.utilities.electricity`).
- Refactor the usage calculation: Instead of adding arbitrary baseline caps if value is `"x"`, it will dynamically add the integer consumption value assigned to the room (e.g., `powerUse += roomMeta.metadata.utilities.electricity || 0`), ensuring placed rooms consume exact utility values from the global capacity.

#### [MODIFY] [SelectionPanel.tsx](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/ui/panels/SelectionPanel.tsx)
- Ensure the UI logic correctly displays utility amounts if they are numbers instead of just boolean icons, adapting the metadata readout.

## Verification Plan

### Automated Setup
- Create a `migrateMetadata.js` script to automate the JSON rewrite deterministicly.

### Manual Verification
- Run `npm run dev`.
- Verify no TypeScript errors remain in the dependency chain.
- Validate `financeStore` accurately deducts power/water capacity relative to the sum of numeric utility data across all instantiated shapes.
