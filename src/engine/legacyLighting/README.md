# Legacy Lighting System

This folder encapsulates the legacy rendering/pass that predates the new GI pipeline.

- `LegacyLightingSystem.tsx` renders the lighting-only assets (background, fog, environment, solar system, contact shadows, and post-processing) so the rest of the app can stay focused on the simulation logic.
- `index.ts` re-exports the lighting entry point so it can be swapped in via a single import.

Use this module whenever you need to fall back to the old lighting stack without touching `SimulationCanvas` or other unrelated systems.
