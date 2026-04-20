# Architectural Texture Pipeline Audit

**Generated**: 2026-04-16
**Updated**: 2026-04-20 (Phase 3.5.2 — Pipeline Verified & Fully Operational)
**Workflow Status**: ✅ All Regressions Resolved

---

## 🔍 Discovered Texture Sets (Auto-Registry)

Textures are auto-discovered at build time via `import.meta.glob` in `materials.ts`. No manual registration required for new textures — just add the folder under `src/assets/textures/<name>/`.

| Texture Name | Maps | Referenced By | Status |
|---|---|---|---|
| `beige_wall_1` | diff, arm, nor, disp | Apartments, Hotel, generic fallback, Lobby walls | ✅ |
| `concrete_floor_1` | diff, arm, nor, disp | EmptyFloor, Structural, hardcoded | ✅ |
| `concrete_wall_1` | diff, arm, nor, disp | EmptyFloor, Structural, Office class default, hardcoded | ✅ |
| `concrete_wall_2` | diff, arm, nor, disp | Available, not yet referenced | ✅ |
| `grey_cartago_tiles` | diff, arm, nor, disp | Lobby floor (hardcoded `getLobbyMaterials()`), Lobby class default | ✅ |
| `metal_plate_1` | diff, arm, nor, disp | Available, not yet referenced | ✅ |
| `oak_veneer_01` | diff, arm, nor, disp | Window casings | ✅ |
| `painted_plaster_wall` | arm, nor, disp | **No diff map** — `normalizeTextureName()` silently redirects → `beige_wall_1` | ⚠️ Redirect active |
| `rocky_terrain_2` | diff, arm, nor, disp, spec | Terrain/environment | ✅ |
| `wood_floor_1` | diff, arm, nor, disp | Apartments, Hotel rooms, generic fallback | ✅ |
| `wood_worn_1` | diff, arm, nor, disp | Window frames | ✅ |

---

## 🧱 Hardcoded vs. Manifest-Driven Textures

| Room Type | Source | Texture Fields | Notes |
|---|---|---|---|
| **Lobby** | Hardcoded — `getLobbyMaterials()` in `MaterialParser.ts` | `beige_wall_1` / `grey_cartago_tiles` / `concrete_wall_1` | Must be manually seeded in `preload.ts` base set |
| **Empty Floor** | Hardcoded — `getEmptyFloorMaterials()` | `concrete_wall_1` / `concrete_floor_1` / `concrete_wall_1` | Same — manually seeded |
| **Structure / Scaffold** | Hardcoded — `getStructuralConcreteMaterials()` | `concrete_wall_1` / `concrete_floor_1` | Same — manually seeded |
| **Apartment** | `roomMetadata.json :: rooms[].metadata` | `wallTexture`, `floorTexture`, `ceilingTexture` | Per-room entries exist; class default: `beige_wall_1 / wood_floor_1 / beige_wall_1` |
| **Office** | `roomMetadata.json :: rooms[].metadata` | No per-room texture entries → falls to class default | Class default: `concrete_wall_1 / concrete_floor_1 / concrete_wall_1` |
| **Hotel** | `roomMetadata.json :: rooms[].metadata` | Per-room texture entries exist | Class default: `beige_wall_1 / wood_floor_1 / beige_wall_1` |
| **Restaurant** | `roomMetadata.json :: rooms[].metadata` | No per-room texture entries → falls to class default | Class default: `beige_wall_1 / wood_floor_1 / beige_wall_1` |
| **Store** | `roomMetadata.json :: rooms[].metadata` | No per-room texture entries → falls to class default | Class default: `beige_wall_1 / wood_floor_1 / beige_wall_1` |
| **Services** | `roomMetadata.json :: rooms[].metadata` | No per-room texture entries → falls to class default | Class default: `concrete_wall_1 / concrete_floor_1 / concrete_wall_1` |
| **FootTraffic** | `roomMetadata.json :: rooms[].metadata` | No per-room texture entries → falls to class default | Class default: `concrete_wall_1 / concrete_floor_1 / concrete_wall_1` |

### Three-Level Fallback Chain (implemented in `ResidentialRoom.tsx`)
```
1. rooms[].metadata.wallTexture  (most specific — individual room ID)
         ↓ if absent
2. classLibrary[class].defaultTextures.wallTexture  (class-level default)
         ↓ if absent
3. residence.wallTexture  (global root-level last resort)
```

### roomMetadata.json Texture Field Locations
```json
// Individual room (e.g. line 794–796):
"metadata": {
  "wallTexture": "beige_wall_1",
  "floorTexture": "wood_floor_1",
  "ceilingTexture": "beige_wall_1"
}

// Class default (e.g. classLibrary.Office.defaultTextures):
"defaultTextures": {
  "wallTexture": "concrete_wall_1",
  "floorTexture": "concrete_floor_1",
  "ceilingTexture": "concrete_wall_1"
}

// Global fallback (line ~3084):
"residence": {
  "wallTexture": "beige_wall_1",
  "floorTexture": "wood_floor_1",
  "ceilingTexture": "beige_wall_1"
}
```

---

## 🚀 Prewarmer Chain

### Prewarmer 1 — Program-Initialization
- **File**: `src/features/assetPreloader/api/preload.ts :: preloadAllAssets()`
- **Trigger**: Once on app boot, before the LoadingGate lifts
- **Log Prefix**: `[Program-Initialization Prewarmer]`
- **What it warms**: ALL textures from `rooms[]` manifest + 5 hardcoded base textures (see below). Performs full GPU shader compilation via `renderer.compile()`.

### Prewarmer 2 — BuildToolbar Hover
- **File**: `src/features/assetPreloader/hooks/useHoverPreloader.ts :: warmForModule()`
- **Trigger**: `onPointerEnter` on any room card button in the Build Toolbar
- **Log Prefix**: `[BuildToolbar-Hover Prewarmer] Module: X | Warming textures: [...]`
- **What it warms**: The specific `wallTexture / floorTexture / ceilingTexture` for the hovered room ID

### Prewarmer 3 — BuildToolbar Select (Log Only)
- **File**: `BuildToolbar.tsx :: onClick → setActiveModuleId()`
- **Trigger**: User clicks a room card to select it for placement
- **Log Prefix**: `[BuildToolbar-Select Prewarmer] Module selected for placement: X`
- **What it warms**: Nothing new — warming was done on hover

---

## 📊 Stats
- **Total Rooms in Metadata**: 100+
- **Unique Visual Signatures**: ~6 after class defaults applied
- **GPU Shader Compilation**: Forced via `renderer.compile()` at boot — zero stutter on first placement

---

## ✅ Resolved Regressions

| Issue | Fix | Phase |
|---|---|---|
| All rooms showing identical beige texture | CSG geometry grouping ran before CSG computed — groups never applied | 3.5.2 |
| `lastGeoRef` guard blocked re-grouping after CSG buffer swap | Now tracks both object identity AND vertex count | 3.5.2 |
| `grey_cartago_tiles` never loading for lobby floor | Added to explicit base seed in `preload.ts` | 3.5.1 |
| `metadataId` not passed to renderer (all rooms shared same fallback) | `shape.metadataId` now piped through SimulationNodes → ResidentialRoom | 3.5.0 |
| Placeholders never swapping to 4K | Removed `if (isPlaceholder)` gate; universal swap with identity protection | 3.5.0 |
| Class-level texture fallback missing | Added `defaultTextures` to all `classLibrary` entries via safe script | 3.5.2 |
| `useHoverPreloader` not normalizing texture names | `normalize()` applied before `getBundleProgressiveSync()` call | 3.5.1 |

---

## 🛠️ Modding Instructions

> See `texture-pipeline.md §5` for the full agentic integration checklist.

**Quick reference — adding a new texture:**
1. Create `src/assets/textures/<name>/` with `*_diff.png`, `*_arm.png`, `*_nor_gl.png`, `*_disp.png`
2. **Manifest room**: add to `rooms[].metadata` in `roomMetadata.json` under `wallTexture/floorTexture/ceilingTexture`
3. **Hardcoded room** (Lobby/Structure/EmptyFloor): also add to base seed in `preload.ts` lines ~34–39
4. Verify console shows: `[Program-Initialization Prewarmer] Injecting warm bundle → <name> (4K-bundle)`
