# Prompt: Window Creation Engine

## User Prompt (verbatim)

Use `development/newplan_skill.md` to create a fully modular and expansive feature, in accordance with feature slice design, that can dynamically generate windows of various casing (trim) and muntin (pane) patterns, starting with our current window type written as it's own casing (trim) and muntin (pane) pattern within a subdirectory window-engine/styles.
Let each pattern specify the texture to use for its casing/trim just as our rooms do. modify our high-performance preexisting texture pipeline, prewarmers, and loaders to all handle this new set of textures for each room (windows).
Let it be modularized in window-creation-engine.

Ensure that each template casing/trim etc textures integrate in full parity to the same one our rooms use to ensure, including all of the extra performance and loading logic, so they get/use our high quality textures and load speeds.

Compare all of the performance technologies that rooms currently use and ensure they are applied to the windows within the rooms.

Frame our current window with a minimalist casing (trim) around the edge. `C:\AIDev\AiDev_LLM\villaggio-terrace\src\assets\textures\oak_veneer_01`

Predict enrichments and items not called for as I'm really not sure how to articulate this massive project but I think you understand the idea and the importance of its integration into our current performance pipelines.

---

## AI Analysis

### Axiomatic Intent (AmI)
The foundational invariant is **pipeline parity**: the Window Creation Engine must be a first-class citizen within the existing asset-loading ecosystem. Every performance technology employed for room surfaces — `TextureLODHandler`, `textureLODHandler.injectBundle`, `preloadAllAssets`, `useHoverPreloader`, `useToolPreloader`, triplanar projection, `MeshPhysicalMaterial` with PBR maps, `applyTriplanarProjection`, GPU shader pre-compilation, `createManagedMaterial`, and `createTextureCache` — must be identically applied to window casing materials. Zero special-casing. Zero divergence.

### Axiological Intent (AlI)
The core value being created is **architectural believability at scale**. Windows currently exist as simple CSG cutouts with a hardcoded concrete frame material. The new system must elevate windows to a fully authored architectural element — with real PBR timber casing (oak veneer), glass that responds to lighting, and a style system that allows the design language to evolve per room type. The oak_veneer_01 set (diff/arm/nor/disp 4K) is the first real material to be used, establishing that windows deserve the same material authorship as walls and floors.

### Teleological Intent (TlI)
The long-term goal is a **style registry** — a data-driven lookup table where each `WindowStyle` declares its `casingTexture`, muntin geometry parameters, sill parameters, and glass properties. `EmptyRoom` selects a style by ID. New architectural styles (factory steel, mid-century wood, Art Deco brass) can be added by adding a new file in `window-engine/styles/` and registering it — with zero changes to anything that consumes windows. The engine is the extension point.
