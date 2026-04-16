
---
## 2026-04-16 — Predictions from: Affirmative Asset Preloading & Worker Audit

### New Feature Predictions

**P1 — Shared Array Buffer Texture Pipeline**
Textures could be decoded on a worker via OffscreenCanvas and transferred to GPU via SharedArrayBuffer. This completely removes texture decode from the main thread. Currently, THREE.TextureLoader decodes on main.

**P2 — GPU Priority Queue (PBR Sort)**
When multiple textures are in-flight, sort by view-frustum center distance. Closest rooms get highest VRAM priority. Currently the LOD pipeline has no spatial prioritization; all textures compete equally.

**P3 — Persisted Texture Cache via Origin Private File System (OPFS)**
Use the browser's OPFS API to persist decoded 4K texture buffers. On return sessions, bypass network entirely — serve textures from local filesystem. Eliminates all network latency on warm sessions.

**P4 — ResolveOverlaps Worker Task as Continuous Background Pass**
The outing worker slot is idle. A low-priority background pass could continuously sweep workerNodeState for soft overlaps or co-planar drift and surface corrections before they become visible artifacts.

**P5 — Worker-Side Structural Beam Graph**
The uildCellBeamGraph() in SimulationNodes.tsx runs every shapes change on the main thread. This is a prime candidate for the nalysis slot: send delta-shape updates, receive updated beam graph. Main thread just consumes the result.

### Enrichments to Existing Features

**E1 — Enrichment: Loading Gate → Extend to Audio Engine Init**
The LoadingGate (Phase 1) could also gate audio engine initialization. Currently AudioEngine initializes eagerly. A loadingGate.onReady().then(() => audioEngine.prime()) sequence ensures audio is never fighting GPU compilation for bandwidth.

**E2 — Enrichment: Hover Preloader → Category-Level Warming**
Currently we hover-warm per sub-room. We could extend warmForModule to accept a categoryId and preload the entire visible sub-drawer grid (filtered by the active size tab) in one batch on category hover.

**E3 — Enrichment: Worker Pool → Priority Lane for PlacementIndicator**
The PlacementIndicator async check (Phase 4.4) should use a priority: 10 flag in the task envelope. This ensures it pre-empts lower-priority background tasks (e.g. structural beam graph analysis) without the user seeing lag.

