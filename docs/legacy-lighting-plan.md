# Legacy Lighting Modularization Plan

## Objective
Isolate and encapsulate the legacy lighting system under `src/engine/legacyLighting` so it can be swapped in and out without touching `SimulationCanvas` or other unrelated code paths. The focus is strictly on the lighting stack—nothing else, no rewrites of interaction/input logic.

## Steps
1. **Document the lighting footprint**
   - Identify the lighting-specific pieces inside `SimulationCanvas` (environment setup, background/fog, lighting helpers, post-processing passes, and any shader/material assets used solely for lighting).
   - Confirm which dependencies can move into the legacy folder without dragging the entire scene logic along.

2. **Create a dedicated legacy module**
   - Introduce `src/engine/legacyLighting/LegacyLightingSystem.tsx` that renders just the lighting stack (color/fog, `Environment`, `SolarSystem`, post-processing passes, and the `GroundIndicatorPlane` if it participates in lighting).
   - Keep this module self-contained: move any shader/material definitions it uses into the same folder or add thin wrappers that re-export the originals without breaking other imports.
   - Ensure no logic from `SimulationCanvas` (input handling, grid management, pointer interactions) is moved into this module.

3. **Expose a simple entry point**
   - Create `src/engine/legacyLighting/index.ts` that re-exports `LegacyLightingSystem` and documents how to render it.
   - Add a short `README.md` inside the folder explaining its purpose and how to keep the old lighting path available.

4. **Verify isolation**
   - Run `npm run lint` (or `tsc --noEmit`) with the new module in place to confirm there are no import errors or orphaned dependencies.
   - Keep `SimulationCanvas.tsx` untouched in this pass.

The plan is stored here to avoid drifting from the “legacy lighting only” mission.
