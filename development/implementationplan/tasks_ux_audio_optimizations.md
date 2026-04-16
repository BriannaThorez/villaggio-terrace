# Tasks: Optimization, Audio, and UX Features

- [x] Execute `briannas_snapshot_skill`

### Phase 0: Infrastructure & Typographic Foundation
- [x] Isolate typography settings inside a central UI constants config.
- [x] Bind `Lexend Deca` globally via theme injections segmented strictly into: Buttons/Textboxes, 2D Overlay GUI, and 3D Simulation Canvas.
- [ ] **🛑 PAUSE for User Feedback & QA Checkpoint**

### Phase 1: Materials Engine Audit & Texture LOD System [COMPLETED]
- [x] Audit `src/features/materialsEngine/`: Identify and prune redundant material shaders/loaders while formalizing high-fidelity passes.
- [x] Create `src/features/materialsEngine/TextureLODHandler.ts`:
  - [x] Implement progressive loading system.
  - [x] Migrate existing ad-hoc texture caching/instantiation routines into this centralized module.
  - [x] **Predictive Pre-Fetching Base**: Implement tracking algorithm using frustum/drift velocity to trigger anticipatory high-res loads.
- [x] Run Performance/VRAM render audits asserting latency removal via developer tooling/telemetry logging.
- [x] **🛑 PAUSE for User Feedback & QA Checkpoint**

### Phase 2: Procedural Audio Engine (Tone.js + Tonal.js) [COMPLETED]
- [x] Write logic scaffolding for `AudioEngine.ts` inside `src/features/audio-engine/`.
  - [x] Initialize Master Bus (LPF + Compressor + Reverb).
  - [x] Implement browser-compliant `resumeContext` logic.
  - [x] Setup `Tonal.js` scale generator for C-Lydian synthesis.
- [x] Create Synthesis Triggers:
  - [x] `triggerUIClick` (Soft Boop).
  - [x] `triggerBuildThud` (Deep Triad Thud).
  - [x] Implement `AmplitudeEnvelope` for all triggers to prevent digital clicks.
- [x] **Weather Mixing**: Map `camera.zoom` metrics to the AudioEngine context bounds.
  - [x] Configure algorithm to crossfade interior warmth logic with an escalated White-Noise/Low-Pass environment filter when `zoom >= 3.0`.
- [x] **Spatial 3D Integration**:
  - [x] Implement `<AudioListenerSync />` context for ThreeJS-to-Tone sync.
  - [x] Integrate `triggerUIClick` into Main/Build toolbars.
  - [x] Integrate `triggerBuildThud` into `SimulationCanvas` placement success.
  - [x] (Optional) Initial Panner3D scaffolding for future Sim/Elevator audio.
- [x] **🛑 PAUSE for User Feedback & QA Checkpoint**
 
- [x] **🛑 PAUSE for User Feedback & QA Checkpoint**
 
### Phase 2.5: Audio Robustness & Interaction Refinement [REFINING]
- [x] **Audio Engine Hardened Triggers**:
  - [x] Remove `isInitialized` hard gates for extreme-case resiliency.
  - [x] **Tab Focus Resilience**: Implement focus/visibility listeners in `useAudioController.ts` to solve "audio dying on exit" bug.
  - [/] **Nuanced Soundscape & Snappy Tuning**:
    - [x] `triggerUICancel`: Add downward sine sweep for Tool Deselection (Right-click).
    - [x] `triggerMenuExpand`: Refine the 'hover' boop to be a high-frequency/short (0.05s) "pip".
    - [x] `triggerSubSelect`: Implement a double-tap style procedural "Confirmation" sound for final tool picking.
    - [ ] **Dry Snappiness**: Bypass `masterReverb` for `uiSynth` to eliminate "airyness" (ghostly tails).
    - [ ] **Tight Tuning**: Reduce `buildSynth` release to 0.35s and `masterReverb` decay to 0.5s for a punchy construction impact.
- [/] **Toolbar Trigger Audit & Restoration**:
  - [x] Move hover-boop from Category container to individual sub-room buttons in `BuildToolbar.tsx`.
  - [ ] Restore `triggerMenuExpand` to primary Category/Class icons for consistent navigation feedback.
- [x] **Initialization Optimization**:
  - [x] Investigate `Tone.Reverb` baking delay and implement deferred/non-blocking initialization.
- [ ] **🛑 PAUSE for User Feedback & QA Checkpoint**
- [ ] **🛑 PAUSE for User Feedback & QA Checkpoint**

### Phase 3: Spatial UX Feedback (Floating Finances)
- [ ] Hook floating mesh/canvas overlay rendering directly into the synchronous successful resolution vector of `checkPlacement` actions.
- [ ] **Combo Multiplier text**: Establish a state `timer/counter` capturing rapid construction events. Escalate the scale geometries and string formats (`-$$$!`) dynamically based on accumulation.
- [ ] **Midnight Revenue Popups**: Tap into the simulation game-tick/scheduler. On the cycle completion flag, calculate individual room yield, spawning green positive floating mesh instances dynamically above inhabited coordinates.
- [ ] **🛑 PAUSE for User Feedback & QA Checkpoint**

### Phase 4: Financial Dialog & Metrics
- [ ] Implement `FinanceDialogueOverlay.tsx` utilizing existing theme structures for a cohesive classic Sim/Tycoon dashboard (Incomes vs Expenses/Cycles).
- [ ] Wire the modal's entry action logic to clicking the "Total Available Cash" interface marker.
- [ ] **Visual Historical Charts**: Integrate Data Visualization module (`recharts` / `chart.js`).
- [ ] Establish a limited, memory-safe data ring-buffer in `useSimulationStore` recording net revenue delta per interval (capping at 30 entries).
- [ ] Compile historical line-graph payload bound to the Finance Overlay modal.
- [ ] Extend toolbar logic in UI tooltips to extract and display estimated mathematical returns on ROI/payback periods based on room structures.
- [ ] **🛑 PAUSE for Phase 4 & Final Project QA Checkpoint**

### Phase 5: State Persistence (IndexedDB)
- [ ] Implement `src/features/persistence/PersistenceEngine.ts`.
  - [ ] **Delta-Only Diff Sync**: Implement SpatialHash-to-IDB serialization.
  - [ ] Setup Debounced Auto-Save (2s).
- [ ] Management UI:
  - [ ] Add Save/Load slots to the Main Menu.
  - [ ] Implement "Automatic Wipe on Reload" debug toggle.
- [ ] **🛑 PAUSE for Phase 5 & Final Project QA Checkpoint**

### Final Verifications
- [ ] Unit Test: Ring-buffer data ejection, Spatial Combo accumulator resets.
- [ ] Perform programmatic testing of audio panning accuracy and Listener-to-Camera sync.
- [ ] Run comprehensive `tsc --noEmit` and confirm `Exit code: 0`.
