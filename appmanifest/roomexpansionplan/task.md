# Task: Architecting Dynamic Data-Driven Build System

- [ ] Preparation
    - [x] Analyze `roomMetadata.json`, `BuildToolbar.tsx`, and `SimulationCanvas.tsx`
    - [x] Draft `implementation_plan.md` for SSOT architecture
- [ ] Execution: Dynamic Initialization
    - [ ] Refactor `BuildToolbar.tsx` to dynamically parse `roomMetadata.json`
    - [ ] Generate Category and variant sub-menus procedurally based on JSON keys
- [ ] Execution: Meta-Driven Sizing & Placement
    - [ ] Refactor `SimulationCanvas.tsx` placement math
    - [ ] Implement `activeModuleId` resolution for bounds generation (w * 10, h * 40)
    - [ ] Deprecate legacy hardcoded `activeTool` nodeSize switch blocks
- [ ] Verification
    - [ ] Run `npx tsc --noEmit`
    - [ ] Deploy simulation to browser and verify variable sizing across metadata categories
