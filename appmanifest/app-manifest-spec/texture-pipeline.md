# Texture Pipeline — Directed Acyclic Graph (DAG)

> **IMPORTANT: DO NOT DELETE.** This is the canonical reference for the Villaggio Terrace texture loading architecture.
> **Updated**: 2026-04-20 (Phase 3.5.2 — Verified Operational)

---

## 1. Full Pipeline DAG

```mermaid
flowchart TD
  subgraph DISK["💾 Disk: assets/textures/<name>/"]
    PNG_DIFF["*_diff.png (Albedo)"]
    PNG_ARM["*_arm.png (AO+Rough+Metal)"]
    PNG_NOR["*_nor_gl.png (Normal)"]
    PNG_DISP["*_disp.png (Displacement)"]
  end

  subgraph BUILD["🛠️ Build Time — materials.ts"]
    GLOB["import.meta.glob()\nScans assets/textures/**/*.png\nEager — zero runtime cost"]
    REGISTRY["ASSET_REGISTRY\nRecord<folderName, AssetPaths>\nauto-keyed by texture folder name"]
    GLOB --> REGISTRY
  end

  DISK --> GLOB

  subgraph INIT["🚀 Program-Initialization Prewarmer\npreload.ts :: preloadAllAssets()"]
    direction TB
    I1["1. Read roomMetadata.json rooms[]\nExtract wall/floor/ceiling per room"]
    I2["2. Seed 5 hardcoded base textures\n(beige_wall_1, wood_floor_1,\nconcrete_wall_1, concrete_floor_1,\ngrey_cartago_tiles)"]
    I3["3. Deduplicate → textureSet + visualSignatureSet"]
    I4["4. getTextureBundle() for ALL keys\nPromise.all() — parallel 4K load\nLogs: Program-Initialization Prewarmer"]
    I5["5. textureLODHandler.injectBundle()\nWrites 4K bundles to memoryCache"]
    I6["6. getRoomMaterialsFromMetadata()\nPer-signature GPU material build"]
    I7["7. renderer.compile(dummyScene)\nForced GPU shader link — zero stutter on first placement"]
    I1 --> I2 --> I3 --> I4 --> I5 --> I6 --> I7
  end

  REGISTRY --> I4

  subgraph LOD["⚡ Runtime — TextureLODHandler"]
    MEMCACHE["memoryCache\nMap<assetName, TextureBundle>\nPersistent shared RAM cache"]
    PLACEHOLDER["createSolidPlaceholder()\n8×8 canvas + DataTexture\n(isPlaceholder: true)\nFallback colour = tintHex"]
    ACTIVELOADS["activeLoads\nMap<assetName, Promise>\nDe-dupes in-flight fetches"]
  end

  I5 --> MEMCACHE

  subgraph HOVER["🖱️ BuildToolbar-Hover Prewarmer\nuseHoverPreloader :: warmForModule()"]
    H1["onPointerEnter on room card button"]
    H2["Find room in roomMetadata.json by moduleId\nRead wall/floor/ceiling + normalize()"]
    H3["getBundleProgressiveSync(txName)\nfor each texture\nLogs: BuildToolbar-Hover Prewarmer"]
    H1 --> H2 --> H3
  end

  H3 --> MEMCACHE

  subgraph SELECT["🖱️ BuildToolbar-Select\nBuildToolbar onClick → setActiveModuleId()"]
    S1["Store: activeModuleId = sub.id\nLogs: BuildToolbar-Select Prewarmer"]
  end

  subgraph PLACE["🏗️ Room Placement\nSimulationCanvas :: handlePlaneClick()"]
    P1["addShape({\n  type: activeTool,\n  metadataId: activeModuleId\n})"]
    P2["SimulationNode stored in Zustand\n{ metadataId: 'apartment-studio-basic' }"]
    P1 --> P2
  end

  SELECT --> S1 --> P1

  subgraph FALLBACK["🔗 Three-Level Texture Fallback\nResidentialRoom.tsx :: textureMeta useMemo"]
    F1["1. rooms[].metadata.wallTexture\n(most specific — individual room ID)"]
    F2["2. classLibrary[class].defaultTextures\n(class-level — Office, Apartment, Hotel, etc.)"]
    F3["3. residence.wallTexture\n(global last resort)"]
    F1 -->|absent| F2 -->|absent| F3
  end

  subgraph RENDER["🎨 Render Pipeline"]
    R1["SimulationNodes.tsx\nPasses shape.metadataId to ResidentialRoom"]
    R2["ResidentialRoom.tsx\nResolves wall/floor/ceilingTextureId\nvia three-level fallback"]
    R3["parseRoomMaterial()\nChecks roomMaterialCache\nOn MISS → createRoomSurfaceMaterial()"]
    R4["createRoomSurfaceMaterial()\n1. getBundleProgressiveSync()\n2. Build MeshPhysicalMaterial\n3. Attach promise.then() swap\n4. material.needsUpdate = true"]
    R1 --> R2 --> R3 --> R4
  end

  P2 --> R1
  FALLBACK --> R3

  subgraph CSG["⚙️ RoomMeshCSG.tsx — Geometry Grouping"]
    C1["useLayoutEffect runs EVERY render\n(no deps — catches CSG async buffer swap)"]
    C2["Guard: identity + vertexCount\nSkips if geometry unchanged"]
    C3["Normal-based group assignment:\n  ny > 0.5  → slot 2 (floor)\n  ny < -0.5 → slot 3 (ceiling)\n  else      → slot 0 (wall)"]
    C4["Material array: [wall, wall, floor, ceiling, wall, wall]\nfrom getRoomMaterialsFromMetadata()"]
    C1 --> C2 --> C3 --> C4
  end

  R4 --> CSG

  subgraph SWAP["🔄 Async Texture Swap"]
    SW1["promise.then(heavyBundle)\nIdentity Protection: if material.map === heavyBundle.albedoMap → skip"]
    SW2["material.map = heavyBundle.albedoMap\n...all maps...\nmaterial.needsUpdate = true"]
    SW1 -->|maps differ| SW2
  end

  MEMCACHE -->|"CACHE HIT → 4K bundle"| R4
  MEMCACHE -->|"CACHE MISS → placeholder + promise"| PLACEHOLDER
  PLACEHOLDER --> R4
  ACTIVELOADS --> SW1

  subgraph GPU["🖥️ GPU"]
    VRAM["VRAM\nTexture bindings + Compiled Shaders"]
  end

  SW2 --> VRAM
  I7 --> VRAM
  R4 -->|"needsUpdate = true"| VRAM

  subgraph VISUAL["👁️ Visual Output"]
    PH_VIS["⏳ Placeholder\n(flat 8px tinted canvas)\nvisible only on cold cache miss"]
    FULL["✅ Full 4K Texture\nCorrect surface per manifest"]
  end

  PLACEHOLDER --> PH_VIS
  VRAM --> FULL
  SW2 --> FULL
```

---

## 2. Hardcoded vs. Manifest-Driven Textures

| Room Type | Source | Notes |
|---|---|---|
| **Lobby** | `getLobbyMaterials()` — hardcoded | `grey_cartago_tiles` must stay in `preload.ts` base seed |
| **Empty Floor** | `getEmptyFloorMaterials()` — hardcoded | Must be in base seed |
| **Structure/Scaffold** | `getStructuralConcreteMaterials()` — hardcoded | Must be in base seed |
| **Apartment / Hotel / Restaurant / Store / Services / FootTraffic / Office** | `roomMetadata.json` | Per-room entry → class default → global fallback |

### Hardcoded Base Seed (`preload.ts` lines 34–39)
These must always be present. They cover rooms that have no `roomMetadata.json` entry:
```
beige_wall_1        — generic fallback / Apartment class / Lobby walls
wood_floor_1        — generic fallback / Apartment class
concrete_wall_1     — EmptyFloor / Structural / Office class
concrete_floor_1    — EmptyFloor / Structural / Office class
grey_cartago_tiles  — Lobby floor (getLobbyMaterials())
```

---

## 3. Prewarmer Summary Table

| # | Prewarmer | Trigger | Hardcoded or Dynamic | Log Prefix |
|---|---|---|---|---|
| 1 | **Program-Initialization** | App boot (once) | **Both** — 5 hardcoded base + all manifest rooms[] | `[Program-Initialization Prewarmer]` |
| 2 | **BuildToolbar-Hover** | Mouse enter on room card | **Dynamic** — reads room's textures from manifest | `[BuildToolbar-Hover Prewarmer] Module: X | Textures: [...]` |
| 3 | **BuildToolbar-Select** | Click room card | Log only — no new loads | `[BuildToolbar-Select Prewarmer] Module selected: X` |

---

## 4. Visual Failure Cues

| Symptom | Probable Cause |
|---|---|
| All room faces show same flat beige | CSG grouping not applying (check layout effect fires after CSG) |
| Lobby floor is grey/concrete not tiled | `grey_cartago_tiles` missing from `preload.ts` base seed |
| Textures never upgrade from placeholder | Promise swap detached — check `createRoomSurfaceMaterial` `.then()` handler |
| All rooms identical texture despite different IDs | `metadataId` not piped from `SimulationNodes` → `ResidentialRoom` |
| Office rooms show apartment beige | Class-level `defaultTextures` missing from `classLibrary` in `roomMetadata.json` |

---

## 5. Agentic IDE Reference — Integration Checklist

> **FOR FUTURE AI AGENTS**: Read this section in full before touching any texture, material, or room rendering code.

### 5.1 Adding a New Texture
1. Create `src/assets/textures/<texture_name>/` with `*_diff.png`, `*_arm.png`, `*_nor_gl.png`, `*_disp.png`
2. Auto-discovered by `ASSET_REGISTRY` at build time — no manual entry needed
3. **Manifest room** → add to `rooms[].metadata` in `roomMetadata.json`
4. **Hardcoded room** (Lobby/Structure/EmptyFloor) → also add to base seed in `preload.ts` lines ~34–39
5. Verify: `[Program-Initialization Prewarmer] Injecting warm bundle → <name> (4K-bundle)` in console

### 5.2 Adding a New Hardcoded Room Type
1. Add `getXyzMaterials()` to `MaterialParser.ts` using `parseRoomMaterial({wallTexture, floorTexture, ceilingTexture})`
2. Add all textures used to the base seed in `preload.ts` (lines ~34–39)
3. Add `...getXyzMaterials()` to `preload.ts` material queue (lines ~85–89)

### 5.3 Adding a New Manifest Room Type
1. Add to `roomMetadata.json :: rooms[]` with `metadata.wallTexture`, `metadata.floorTexture`, `metadata.ceilingTexture`
2. Ensure `class` field matches an entry in `classLibrary` (provides fallback)
3. Both the initialization prewarmer and hover prewarmer will auto-discover it on next boot

### 5.4 Adding a New Room Class
1. Add to `roomMetadata.json :: classLibrary` with `defaultTextures: { wallTexture, floorTexture, ceilingTexture }`
2. Add class-level textures to `preload.ts` base seed if not already present
3. Use the safe script pattern (`scripts/add_class_textures.mjs`) for editing `roomMetadata.json`

### 5.5 DO NOT BREAK — Pipeline Invariants
- `shape.metadataId` **must** be set in `addShape()` for all placed rooms
- `SimulationNodes.tsx` **must** pass `metadataId={shape.metadataId}` to `ResidentialRoom`
- `ResidentialRoom.tsx` **must** use the three-level fallback chain (room → class → generic)
- `RoomMeshCSG.tsx` `useLayoutEffect` **must not** have a deps array (must run every render to catch CSG async swap)
- `createRoomSurfaceMaterial()` **must** always attach a `.then()` swap handler
- `grey_cartago_tiles` **must** remain in the `preload.ts` base seed
- Use `normalizeTextureName()` anywhere a texture name from the manifest is consumed
- Never directly edit `roomMetadata.json` by hand — use a script tool for safety