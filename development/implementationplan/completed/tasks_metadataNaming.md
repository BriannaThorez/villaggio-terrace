# Tasks: Metadata and Naming Refactor

- [x] **Phase  research & Setup**
  - [x] Research `roomMetadata.json` Store structures.
  - [x] Research `BuildToolbar.tsx` naming logic.

- [x] **Phase 1: Metadata Update (`roomMetadata.json`)**
  - [x] Create a migration script (Python) to inject `size` into all Store metadata.
  - [x] Execute migration script.
  - [x] Verify JSON integrity and confirm `size` field presence.

- [x] **Phase 2: Build Menu Logic (`BuildToolbar.tsx`)**
  - [x] Modify `buildRoomDisplayName` to handle `Services` class (TopLine = Name).
  - [x] Modify `buildRoomDisplayName` to handle `Store` class (TopLine = Size + Name).
  - [x] Ensure formatting handles potential redundancy (e.g. double spaces).

- [x] **Phase 3: Verification & Cleanup**
  - [x] Run `npm run lint` to catch UI regressions.
  - [x] Visual QA in browser.
  - [x] Remove any temporary migration scripts.
