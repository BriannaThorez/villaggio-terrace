
---
## 2026-04-20 — Predictions from: Texture Pipeline & Performance Settings

### New Feature Predictions

**P-KTX2 — KTX2/Basis Universal Texture Compression**
Convert all source PNGs to KTX2 (Basis Universal) at build time. GPU-native compressed formats decompress directly on the GPU with zero CPU involvement — eliminating the main-thread decode stall entirely. File sizes are 4–8× smaller than PNG. Three.js has native `KTX2Loader` support. On devices with hardware S3TC/ASTC/ETC2 support, this also saves VRAM.

**P-OPFS — Origin Private File System Texture Cache**
Persist decoded texture buffers to the browser's OPFS API after the first load. On return visits, bypass HTTP entirely and serve 4K textures from local disk. Eliminates all network latency for returning players. Pairs with the textureQuality setting to cache the correct resolution tier.

**P-OFFSCREEN — OffscreenCanvas Worker-Side Texture Decode**
Decode PNG textures on a Web Worker via `OffscreenCanvas`. Transfer the `ImageBitmap` to the main thread and upload to GPU directly via `THREE.CanvasTexture`. Removes texture decode from the main thread entirely, enabling background loading without any frame drops.

**P-VRAM-BUDGET — VRAM Budget Manager**
A `VRAMBudgetManager` that tracks estimated VRAM usage (texture resolution × maps per material × material count) and dynamically degrades texture quality for rooms far from the camera or outside the view frustum. Near the camera = Ultra; distant rooms = Medium. Invisible rooms = Low.

**P-STREAMING-PROGRESS — LoadingManager Progress HUD**
Wire `THREE.LoadingManager.onProgress` to a slim progress bar during the initialization prewarmer. Players see "Warming textures... 24/40" instead of a blank loading screen. Pairs with `loadingGate` phases for granular progress steps.

### Enrichments to Existing Features

**E-SETTINGS-AUDIO — Settings Panel: Audio Category**
Full "Audio" tab: Master Volume, Music Volume, SFX Volume sliders + toggles for ambient audio. Wire to `audioEngine` gain nodes. Store in `settingsStore`.

**E-SETTINGS-DISPLAY — Settings Panel: Display Category**
Full "Display" tab: Antialiasing toggle (MSAA on/off), Shadow Quality (4 steps), Ambient Occlusion toggle. Each maps to existing Three.js renderer parameters.

**E-HOVER-CATEGORY — Hover Prewarmer: Category-Level Warming**
When the user hovers a category tab (e.g. "Apartment"), pre-warm all rooms in that category simultaneously in a background batch — not one-by-one on individual room hover.

**E-QUALITY-PER-SURFACE — Per-Surface Quality Override**
Allow `roomMetadata.json` entries to specify `textureQualityOverride: "ultra"` for architecturally important rooms (e.g. Penthouse). Overrides the global quality setting for that room only.

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

---
## 2026-04-16 — Predictions from: Window Creation Engine

### New Feature Predictions

**P6 — Window Style Per-RoomType Binding**
`roomMetadata.json` could gain a `windowStyleId` field. When `EmptyRoom` (or any future room type) is instantiated, it reads its own `windowStyleId` from metadata and selects the style from the registry. Today `EmptyRoom` hardcodes `minimalist_oak`. Future rooms get per-style visual identity automatically.

**P7 — Window Style Preview in Build Menu**
The room build drawer could render a tiny `<WindowUnit style={style} />` thumbnail via an isolated `<Canvas>` per room card. Players see the window style before placing a room — same as material swatches. Low GPU cost since each card canvas is `32×32`.

**P8 — Reactive Casing from Tenancy State**
When a room's tenancy changes (vacant → corporate), the window casing could react: residential = MinimalistOak, commercial = SteelFrameIndustrial, luxury = ArtDecoGold. Zero-cost if style is selected from `windowStyleRegistry` at placement responding to store state.

**P9 — Window Style Hot-Swappable at Runtime**
`WindowUnit` could accept a `styleId` and re-render when `windowStyleRegistry` emits a change event. Enables a "facade redesign" feature where the player globally changes the window style of all rooms.

**P10 — InstancedMesh Casing for Floor-Wide Windows**
20+ rooms per floor = 80+ draw calls just for casing strips. An `InstancedCasingMesh` component could batch all strips across a floor into one draw call via a position buffer populated by visible `windowCutouts`.

### Enrichments to Existing Features

**E4 — Enrichment: Window Casing → Displacement-Driven Sill Geometry**
`casingDepth` in `WindowCasingConfig` could drive a displacement shader on the sill face. The existing triplanar + displacement pipeline in `applyTriplanarProjection` is directly reusable.

**E5 — Enrichment: Muntin → Shadow-Casting Geometry**
Enabling `castShadow` on muntin bars creates interior light grid patterns on room floors — a signature architectural effect at zero extra cost since shadow casting is already on the room shell.

**E6 — Enrichment: Window Engine → Unified ArchitecturalSurfaceRegistry**
The `WindowStyleRegistry` pattern (style-id → definition → material → mesh) generalizes to: Door styles, Ceiling treatments, Lobby floor patterns. A unified `ArchitecturalSurfaceRegistry` could become the top-level abstraction for all architectural surface variations.

---
## 2026-04-17 — Predictions from: Population System (Tenants & Guests)

### New Feature Predictions

**P11 — Needs Matrix & Tensor Happiness Engine**
Each `TenantEntity` carries a needs vector: `food_access`, `noise_tolerance`, `elevator_wait_tolerance`, `amenity_proximity`, `natural_light`. Each room type satisfies/degrades different needs. The happiness scalar is `dot(weights, needs_satisfaction)`. Low happiness triggers rent reduction pressure, eviction risk, and (eventually) public review scores that affect tower prestige — the SimTower-class feedback loop.

**P12 — Interpersonal Social Graph**
Tenants and neighbors develop `acquaintance` edges (weighted). Sims who share a floor and pass regularly develop weak ties. "Community" metrics: a floor with high social density gets a prestige bonus; a floor with zero interaction is flagged "isolated." Inspired by Project Highrise's community system.

**P13 — Commute Memory & Population Churn**
Tenants accumulate a `commuteMemory[]` buffer (rolling 7-day average of elevator wait times). If the average exceeds `MAX_WAIT_THRESHOLD`, satisfaction decays. At zero satisfaction, the tenant moves out — triggering a vacancy cascade. New tenants move in when the room has good amenities. This is the natural SimTower churn dynamic.

**P14 — Guest Revenue Attribution**
When a guest's `dwellDuration` expires in a commercial room, the room earns `guestSpendingRate × dwellDuration` (credited to `financeStore`). Commercial rooms only generate revenue when guests are actually present — creating the virtuous cycle: more guests → more revenue → build better amenities → attract more guests.

**P15 — Population Density HeatMap Overlay**
A toggle-able HeatMap overlay renders floor-by-floor occupancy density as a gradient. Dense floors glow orange/red; sparse floors cool blue. Computed from `roomOccupancyIndex` per tick. Renders as an instanced plane mesh with per-instance color — zero texture allocations.

**P16 — Worker-Side Scheduler (Offloaded Tick)**
`OccupantScheduler` is a perfect worker task slot: main thread sends `{occupants, sunTime, shapes}` delta; worker returns `{transitions: [{id, newState, newGoal}]}`. Eliminates main-thread jank on large populations (200+ sims).

**P17 — Hotel & Overnight Guest System**
Hotel guests: `dwellDuration = overnight` (22:00 → 07:00). They occupy a hotel room slot from `tenancyStore`. Hotel occupancy rate becomes a KPI in the finance dashboard — directly mirrors Yoot Tower Hotel mechanics.

**P18 — Crowd Simulation: Lobby Bottleneck Model**
When >N entities converge on the same lobby x-position, they stack vertically with a y-offset per entity. Entities in a stack are flagged `state = 'queued'` and `elevator_wait` need degrades per tick. Produces the satisfying SimTower rush-hour lobby pile-up effect visually.

**P19 — Population Export API**
`populationStore.exportSnapshot()` serializes the current population to JSON: all entity states, positions, lifecycle states, tenancy assignments, happiness scores. Prerequisite for save/load and a statistics screen showing population trends over simulated time.

**P20 — VIP / Landmark Guest Events**
Rare scripted guest events: "CEO Site Visit" (requires ≥3 occupied office floors), "Restaurant Critic" (requires ≥1 restaurant, ×3 revenue if satisfaction > 80%), "Architecture Magazine Feature" (unlocks a cosmetic award badge). Sub-typed `GuestEntity` with higher `spendingRate` and custom info panel.

### Enrichments to Existing Features

**E7 — Enrichment: Population → Finance Store Integration**
`GuestEntity.despawn()` should call `financeStore.recordGuestRevenue(guestId, amount)`. Guest foot-traffic revenue is the missing commercial loop. `financeStore.processWeeklyFinances()` should also process accumulated guest revenue.

**E8 — Enrichment: Tenancy Panel → Live Occupant Viewer**
The SelectionPanel Tenancy Section can show a live list of all `TenantEntity`s linked to the room (`slotOccupants[]`), each with a tiny lifecycle state badge (🛏️ Sleeping / 🚶 Commuting / 🏠 Home / 🍽️ Visiting). Transforms the panel from a form into a live simulation readout.

**E9 — Enrichment: OccupantBar → TrajectoryGhost**
When an entity is selected, render a faint dotted line showing its upcoming NavPath waypoints — each waypoint a small sphere, path segments as thin `<Line>` components. Visualizes the entity's intent, exactly as SimTower's floor map did for elevator paths.

**E10 — Enrichment: Time Engine → Peak Hour Detection**
`OccupantScheduler` emits `peakHour: boolean` when ≥30% of all tenants are commuting simultaneously. `useTimeStore.isPeakHour` exposes this. Other systems (elevators, audio, lighting) react — full SimTower morning rush ambiance.

**E11 — Enrichment: TowerGraph → Stair Nodes**
Stairs as a second connector type: `travelTime > elevator` but `capacity = infinite`. Entities on low floors (±2 floors) prefer stairs; high-floor entities prefer elevators. Mirrors real building behavior and reduces elevator congestion naturally.
