# Room Metadata and Display Naming Refactor

This plan updates `roomMetadata.json` to ensure consistency for Store sizes and refactors the `BuildToolbar` to use more direct naming conventions for Services and Stores.

## Goal Description
1.  **Metadata Standardization**: Add a `size` field to all Store entries in `roomMetadata.json` (consistent with Office/Apartment).
2.  **Display Logic Overhaul**:
    *   **Services**: Display name directly from the `name` field.
    *   **Stores**: Display name as `size` + `name`.
    *   **Preservation**: Maintain high data integrity in the large `roomMetadata.json` file.

## Proposed Changes

### Configuration Data
#### [MODIFY] [roomMetadata.json](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/entities/rooms/roomMetadata.json)
- Iterate through all rooms with `class: "Store"`.
- If `metadata.size` is missing, inject it based on the current `metadata.type` or by parsing the `id`/`name`.
- Ensure bit-for-bit preservation of all other fields.

### UI Components
#### [MODIFY] [BuildToolbar.tsx](file:///c:/AIDev/AiDev_LLM/villaggio-terrace/src/features/ui/toolbars/BuildToolbar.tsx)
- Refactor `buildRoomDisplayName` to include conditional logic:
    - `class === "Services"`: `topLine` = `room.name`.
    - `class === "Store"`: `topLine` = `${room.metadata.size} ${room.name}`.
    - Default: Keep existing logic (combining quality, specialization, form).

## Verification Plan
### Automated Verification
- Run a custom Python script to verify every Store in `roomMetadata.json` has a `metadata.size` field.
- `npm run lint` to ensure no regressions in UI logic.

### Manual Verification
- Verify the Build Menu in-game shows the new name formats for Services and Stores.
- Confirm prices and star quality are still rendered correctly on the new name strings.
