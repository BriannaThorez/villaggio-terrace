# Tasks — Window Creation Engine

> **Circular Reference**: See [implementation_plan_window_creation_engine.md](./implementation_plan_window_creation_engine.md) for full phase design.
> Update this file and the plan in sync as work progresses.

---

## 💾 Phase 0 — Project Snapshot
- [ ] Invoke `briannas_snapshot_skill` before any code changes

---

## Phase 1 — Feature Slice Scaffold & Type System
> Instruction: Only create new files. Do not modify any existing file.
> Best Practices: Use `readonly` on config fields. Export types from `index.ts` barrel.

- [ ] Create `src/features/window-creation-engine/types/index.ts`
  - [ ] Define `WindowCasingConfig`
  - [ ] Define `WindowMuntinConfig`
  - [ ] Define `WindowGlassConfig`
  - [ ] Define `WindowStyleDefinition`
- [ ] Create `src/features/window-creation-engine/registry/WindowStyleRegistry.ts`
  - [ ] Singleton Map: `id → WindowStyleDefinition`
  - [ ] Export `windowStyleRegistry` and `getAllRegisteredStyles()`
- [ ] Create `src/features/window-creation-engine/styles/MinimalistOak.ts`
  - [ ] `casingTexture: "oak_veneer_01"`
  - [ ] `casingFallbackColor: "#8B6914"`
  - [ ] `casingWidth: 0.35`, `casingDepth: 0.25`
  - [ ] Muntin: `horizontalCount: 0, verticalCount: 0`
  - [ ] Glass: match current `EmptyRoom` glass config exactly
  - [ ] Self-register in `windowStyleRegistry` on module load
- [ ] Create `src/features/window-creation-engine/index.ts` (barrel)
- [ ] **Lint & Type Check**: Run `npx tsc --noEmit` — zero errors
- [ ] **QA Checkpoint**: Pause. Assert registry resolves `"minimalist_oak"`.

---

## Phase 2 — Material Parser Extension: Window Casing Pipeline
> Instruction: Only additive changes to `MaterialParser.ts`. No existing functions renamed/modified.
> Best Practices: Cache key must be namespaced `"window-casing:"` to avoid collisions with room material cache.

- [ ] **[MODIFY]** `src/engine/MaterialParser.ts`
  - [ ] Add `windowCasingMaterialCache`
  - [ ] Add `parseWindowCasingMaterial(casingTexture, fallbackColor)` — full LOD progressive pattern
  - [ ] Add `applyTriplanarProjection` call within `parseWindowCasingMaterial`
  - [ ] Add placeholder → swap promise chain (matching `createRoomSurfaceMaterial`)
  - [ ] Add `getWindowCasingMaterialsForPreload(styles)` — returns `THREE.Material[]`
  - [ ] Add `releaseWindowCasingMaterial` for dispose lifecycle
- [ ] Create `src/features/window-creation-engine/hooks/useWindowCasingMaterial.ts`
  - [ ] `useMemo` wrapping `parseWindowCasingMaterial`
  - [ ] Correct deps (style ID, texture name)
- [ ] **Lint & Type Check**: Run `npx tsc --noEmit` — zero errors
- [ ] **QA Checkpoint**: Pause. Import hook in a test file. Confirm type-safe.

---

## Phase 3 — Window Mesh Components
> Instruction: New files only. Use `React.memo` with full prop comparison on all components.
> Best Practices: No object instantiation inside render. All geometry via `useMemo`.

- [ ] Create `src/features/window-creation-engine/components/CasingMesh.tsx`
  - [ ] 4 trim strips (top/bottom/left/right) using `BoxGeometry` via `useMemo`
  - [ ] Accepts `casingConfig: WindowCasingConfig`, `openingWidth`, `openingHeight`
  - [ ] Uses `useWindowCasingMaterial` hook for material
  - [ ] `castShadow`, `receiveShadow`
  - [ ] Wrapped in `React.memo`
- [ ] Create `src/features/window-creation-engine/components/MuntinMesh.tsx`
  - [ ] Accepts `muntinConfig: WindowMuntinConfig`, `openingWidth`, `openingHeight`
  - [ ] Bar positions computed via `useMemo`
  - [ ] Wrapped in `React.memo`
- [ ] Create `src/features/window-creation-engine/components/WindowUnit.tsx`
  - [ ] Composes `CasingMesh` + glass mesh + `MuntinMesh`
  - [ ] Glass material: `THREE.MeshPhysicalMaterial` from `style.glass` config
  - [ ] Glass material created once via `useMemo`
  - [ ] Accepts `style: WindowStyleDefinition`, `openingWidth`, `openingHeight`, `position`
- [ ] **Lint & Type Check**: Run `npx tsc --noEmit` — zero errors
- [ ] **QA Checkpoint**: Pause. Visual check in dev server — WindowUnit renders standalone.

---

## Phase 4 — Preloader & Warming Pipeline Integration
> Instruction: Targeted additive changes only. Do not rewrite existing logic blocks.
> Best Practices: Use `getAllRegisteredStyles()` to remain open/closed — new styles auto-register.

- [ ] **[MODIFY]** `src/features/assetPreloader/api/preload.ts`
  - [ ] Import `getAllRegisteredStyles` from window-creation-engine
  - [ ] Add window casing textures to `textureSet` (after room texture extraction block)
  - [ ] Import `getWindowCasingMaterialsForPreload` from MaterialParser
  - [ ] Add window casing materials to `materialQueue` (before GPU compile)
- [ ] **[MODIFY]** `src/features/assetPreloader/hooks/useHoverPreloader.ts`
  - [ ] After existing room textures, warm casing texture for matching windowStyleId
  - [ ] Default to `"minimalist_oak"` if no windowStyleId in metadata
- [ ] **[MODIFY]** `src/features/assetPreloader/hooks/useToolPreloader.ts`
  - [ ] Same pattern as useHoverPreloader changes
- [ ] **Lint & Type Check**: Run `npx tsc --noEmit` — zero errors
- [ ] **Console Verification**: Confirm `[TextureLOD] Injected warm bundle for: oak_veneer_01`
- [ ] **QA Checkpoint — STOP**: Request user testing of preloading before Phase 5.

---

## Phase 5 — EmptyRoom Integration
> Instruction: Surgical replacement of window rendering block only. Do not touch CSG, room shell, or other materials.
> Best Practices: Remove only the code being replaced. Leave all comments intact.

- [ ] **[MODIFY]** `src/entities/rooms/structural/emptyRoom/EmptyRoom.tsx`
  - [ ] Import `WindowUnit` from window-creation-engine
  - [ ] Import `windowStyleRegistry`
  - [ ] Replace `{windowCutouts.map(...)}` inner group JSX with `<WindowUnit ...>`
  - [ ] Remove now-unused `frameMaterial` and `glassMaterial` from `useMemo` (if exclusively used there)
- [ ] **Lint & Type Check**: Run `npx tsc --noEmit` — zero errors
- [ ] **Visual Verification**: Oak veneer casing frames each window opening
- [ ] **Regression Check**: Room shell, walls, floor, ceiling unchanged
- [ ] **QA Checkpoint — STOP**: Request user visual approval. Plan complete.
