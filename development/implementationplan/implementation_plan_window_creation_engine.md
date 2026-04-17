# Implementation Plan — Window Creation Engine

> **Circular Reference**: See [tasks_window_creation_engine.md](./tasks_window_creation_engine.md) for granular task tracking. That file mirrors and tracks the phases described here. Both files must be updated in sync as phases progress.
> See [prompt_window_creation_engine.md](./prompt_window_creation_engine.md) for the originating intent analysis.

---

## Overview

The **Window Creation Engine** elevates the current hardcoded window (a simple CSG cutout + concrete frame) into a fully modular, data-driven, performance-parity architectural subsystem. It lives at `src/features/window-creation-engine/` as a Feature Slice Design module.

Each window style declares its own casing (trim) geometry, muntin (pane divider) geometry, glass properties, and casing texture — exactly mirroring how rooms declare `wallTexture`, `floorTexture`. All existing performance pipelines — `TextureLODHandler`, preloader `preloadAllAssets`, `useHoverPreloader`, `useToolPreloader`, triplanar shader projection, GPU pre-compilation, `createManagedMaterial`, `createTextureCache` — are extended to include window casing textures with zero divergence from room surface patterns.

**First concrete style**: `MinimalistOak` — the current window opening, now framed with the oak_veneer_01 4K PBR casing.

---

## Performance Technology Parity Audit (Rooms → Windows)

| Technology | Rooms | Windows (Target) |
|---|---|---|
| `TextureLODHandler.getBundleProgressiveSync` | ✅ | ✅ Phase 1 |
| `textureLODHandler.injectBundle` (preloader) | ✅ | ✅ Phase 1 |
| `preloadAllAssets` — RAM warming | ✅ | ✅ Phase 1 |
| GPU shader pre-compilation via `renderer.compile()` | ✅ | ✅ Phase 1 |
| `useHoverPreloader` — hover warming | ✅ | ✅ Phase 2 |
| `useToolPreloader` — tool-select warming | ✅ | ✅ Phase 2 |
| `applyTriplanarProjection` | ✅ | ✅ Phase 2 |
| `createManagedMaterial` + lifecycle | ✅ | ✅ Phase 2 |
| `createTextureCache` | ✅ | ✅ Phase 2 |
| Progressive placeholder → swap on load | ✅ | ✅ Phase 2 |
| Auto-discovery via `import.meta.glob` | ✅ (global) | ✅ Already inherits via shared glob |

---

## User Review Required

> [!IMPORTANT]
> **Phase 5 is a surgical modification** to `EmptyRoom.tsx`, `MaterialParser.ts`, `preload.ts`, `useHoverPreloader.ts`, and `useToolPreloader.ts`. All edits are **targeted, non-rewriting additions**. No existing room logic or material behavior is changed — only additive integration.

> [!NOTE]
> The `oak_veneer_01` texture set is already auto-discovered by the existing `import.meta.glob` in `materials.ts`. No glob pattern changes are needed. We only need to add `'oak_veneer_01'` as a warming target during preload/hover/tool warming.

---

## 💾 Phase 0 — Snapshot

> **Invoke `briannas_snapshot_skill` before any code changes.**

---

## Phase 1 — Feature Slice Scaffold & Type System

> **Goal**: Establish the directory structure, types, and registry contract. No visual changes yet.
> **Constraint**: Only new files created. No existing files modified.

### New Files

#### [NEW] `src/features/window-creation-engine/types/index.ts`
Central type definitions:
```ts
export interface WindowCasingConfig {
  casingTexture: string;      // maps into ASSET_REGISTRY (e.g. "oak_veneer_01")
  casingFallbackColor: string; // placeholder color for progressive load
  casingWidth: number;         // world-unit thickness of casing trim band
  casingDepth: number;         // extrusion depth of casing from wall face
}

export interface WindowMuntinConfig {
  horizontalCount: number;    // horizontal bar count inside pane
  verticalCount: number;      // vertical bar count inside pane
  barWidth: number;
  barDepth: number;
  barTexture?: string;        // optional separate texture for muntins
}

export interface WindowGlassConfig {
  color: string;
  metalness: number;
  roughness: number;
  transmission: number;
  ior: number;
  opacity: number;
  thickness: number;
}

export interface WindowStyleDefinition {
  id: string;
  displayName: string;
  casing: WindowCasingConfig;
  muntin: WindowMuntinConfig;
  glass: WindowGlassConfig;
}
```

#### [NEW] `src/features/window-creation-engine/registry/WindowStyleRegistry.ts`
A singleton registry that maps style IDs to their definitions. Prevents duplication. Exported as `windowStyleRegistry`.

#### [NEW] `src/features/window-creation-engine/styles/MinimalistOak.ts`
First style. Encodes the current window's geometry parameters, plus:
- `casingTexture: "oak_veneer_01"`
- `casingWidth: 0.35` (minimalist thin trim)
- Muntin: `horizontalCount: 0, verticalCount: 0` (current empty pane)
- Glass: exact copy of current `EmptyRoom` glass config

#### [NEW] `src/features/window-creation-engine/index.ts`
Public barrel export for the feature slice.

### Verification
- `tsc --noEmit` — zero type errors in new files
- Registry returns correct definition for `"minimalist_oak"`

---

## Phase 2 — Material Parser Extension: Window Casing Pipeline

> **Goal**: Add `parseWindowCasingMaterial` to `MaterialParser.ts`. Full parity with `parseRoomMaterial` — progressive LOD, triplanar, `createManagedMaterial`, cache.
> **Constraint**: Only additive. No existing functions modified.

### Modified Files

#### [MODIFY] `src/engine/MaterialParser.ts`
Add (additive-only, after existing exports):

```ts
// Window casing material cache — same pattern as roomMaterialCache
const windowCasingMaterialCache = createTextureCache<ManagedMaterialHandle>();

export const parseWindowCasingMaterial = (casingTexture: string, fallbackColor: string): THREE.MeshPhysicalMaterial => {
  const cacheKey = `window-casing:${casingTexture}`;
  const existing = windowCasingMaterialCache.get(cacheKey);
  if (existing) return existing.material as THREE.MeshPhysicalMaterial;

  // Use same progressive LOD pathway as createRoomSurfaceMaterial
  const { progressive, promise } = textureLODHandler.getBundleProgressiveSync(casingTexture, fallbackColor);

  const material = new THREE.MeshPhysicalMaterial({ /* PBR props matching room walls */ });
  applyTriplanarProjection(material, { scale: 0.07, detailScale: 5, detailIntensity: 0.25 });

  if (progressive.isPlaceholder) {
    promise.then(bundle => { /* swap heavy textures */ material.needsUpdate = true; });
  }

  const managed = createManagedMaterial(material, [...]);
  windowCasingMaterialCache.set(cacheKey, managed);
  return managed.material as THREE.MeshPhysicalMaterial;
};

export const releaseWindowCasingMaterial = (casingTexture: string): void => { ... };
```

Also add `getWindowCasingMaterialsForPreload(styles: WindowStyleDefinition[]): THREE.Material[]` — used by preloader.

### New Files

#### [NEW] `src/features/window-creation-engine/hooks/useWindowCasingMaterial.ts`
React hook that wraps `parseWindowCasingMaterial` with `useMemo`, correct dependency array. Returns a stable material reference.

### Verification
- `tsc --noEmit`
- Import `parseWindowCasingMaterial` in a test consumer, confirm no TS errors

---

## Phase 3 — Window Mesh Component: CasingMesh & MuntinMesh

> **Goal**: Create the React Three Fiber components that render casing trim and muntin bars. These are geometry-only components driven purely by `WindowStyleDefinition`.
> **Constraint**: Only new files. No existing mesh components modified.

### New Files

#### [NEW] `src/features/window-creation-engine/components/CasingMesh.tsx`
Renders 4 trim strips (top, bottom, left, right) around a window opening:
- Uses `parsedCasingMaterial` from `useWindowCasingMaterial` hook
- Accepts `openingWidth`, `openingHeight`, `casingConfig: WindowCasingConfig`
- Geometry: `BoxGeometry` per strip, positioned flush against the opening edges
- `castShadow`, `receiveShadow`, `frustumCulled={false}`
- Wrapped in `React.memo` with full prop comparison

#### [NEW] `src/features/window-creation-engine/components/MuntinMesh.tsx`
Renders horizontal + vertical bars inside the pane:
- Accepts `openingWidth`, `openingHeight`, `muntinConfig: WindowMuntinConfig`
- Uses shared `parseWindowCasingMaterial` (or optional `barTexture`)
- Computes bar positions via `useMemo`
- Wrapped in `React.memo`

#### [NEW] `src/features/window-creation-engine/components/WindowUnit.tsx`
Composite component assembling `CasingMesh` + glass `<mesh>` + `MuntinMesh`:
- Accepts `style: WindowStyleDefinition`, `openingWidth`, `openingHeight`, positional props
- Consolidates all glass material creation
- Is the single component `EmptyRoom` will consume

### Verification
- `tsc --noEmit`
- Visual inspection in running dev server

---

## Phase 4 — Preloader & Warming Pipeline Integration

> **Goal**: Extend `preloadAllAssets`, `useHoverPreloader`, `useToolPreloader` to include window casing textures. Full parity with how room textures are warmed.
> **Constraint**: **Targeted additions only**. No rewriting of existing logic blocks.

### Modified Files

#### [MODIFY] `src/features/assetPreloader/api/preload.ts`
After the existing `textureSet` population block, add:
```ts
// Window Casing Textures — full parity with room surface textures
import { getAllRegisteredStyles } from '@/src/features/window-creation-engine/registry/WindowStyleRegistry';
getAllRegisteredStyles().forEach(style => {
  textureSet.add(style.casing.casingTexture);
  if (style.muntin.barTexture) textureSet.add(style.muntin.barTexture);
});
```
After GPU compile, add window casing materials to `materialQueue`:
```ts
import { getWindowCasingMaterialsForPreload } from '@/src/engine/MaterialParser';
materialQueue.push(...getWindowCasingMaterialsForPreload(getAllRegisteredStyles()));
```

#### [MODIFY] `src/features/assetPreloader/hooks/useHoverPreloader.ts`
After existing room texture warming, add window casing texture IDs from the style that matches the room's `windowStyleId` metadata field (defaulting to `"minimalist_oak"`).

#### [MODIFY] `src/features/assetPreloader/hooks/useToolPreloader.ts`
Same pattern: after room textures, warm the window casing texture for the active module's style.

### Verification
- `tsc --noEmit`
- Console confirms `[AssetPreloader] Found N unique visual signatures` includes oak_veneer_01
- Console confirms `[TextureLOD] Injected warm bundle for: oak_veneer_01`

> [!IMPORTANT]
> **Phase 4 QA Checkpoint — STOP. Request user testing of preload behavior before proceeding.**

---

## Phase 5 — EmptyRoom Integration

> **Goal**: Replace the hardcoded inline window mesh in `EmptyRoom.tsx` with the `<WindowUnit>` component consuming the `MinimalistOak` style.
> **Constraint**: Surgical replacement of the window rendering block only. Room shell, CSG, materials — untouched.

### Modified Files

#### [MODIFY] `src/entities/rooms/structural/emptyRoom/EmptyRoom.tsx`
Replace the `{windowCutouts.map(...)}` JSX block's inner group (lines 107–124) with:
```tsx
import { WindowUnit } from '@/src/features/window-creation-engine/components/WindowUnit';
import { windowStyleRegistry } from '@/src/features/window-creation-engine/registry/WindowStyleRegistry';

const windowStyle = windowStyleRegistry.get('minimalist_oak')!;

{windowCutouts.map((cutout, index) => (
  <WindowUnit
    key={`window-${index}`}
    style={windowStyle}
    openingWidth={openingWidth}
    openingHeight={openingHeight}
    position={[cutout.x, height / 2 + verticalCenteringOffset, -depth + 0.1]}
  />
))}
```

Remove now-redundant `frameMaterial` and `glassMaterial` from the `useMemo` block.

### Verification
- `tsc --noEmit`
- Visual inspection: windows render with oak casing trim
- No regression to room shell or other visual elements

> [!IMPORTANT]
> **Phase 5 QA Checkpoint — STOP. Request user visual approval before closing plan.**

---

## Open Questions
- None blocking execution.

## Verification Plan

### Automated
```
npx tsc --noEmit
```
Run after each phase.

### Manual (Per Phase)
- Phase 1: Registry resolves `"minimalist_oak"` correctly.
- Phase 3: `WindowUnit` renders with correct casing geometry.
- Phase 4: Console confirms warm bundle injections for `oak_veneer_01` at startup.
- Phase 5: Visual — windows show oak trim. No regressions.
