# Implementation Plan: Optimization, Audio, and UX Features

## 💾 [SNAPSHOT_CREATION]
Before proceeding with Phase 0 execution, run the snapshot skill (`briannas_snapshot_skill`) to preserve the stable codebase state.

## Phase 0: Infrastructure & Typographic Foundation
* **Goal**: Establish a unified visual language and strict design constraints for the interface.
### Proposed Changes
- **Centralized Font Control**: Integrate a global typography constant across the UI features. `Lexend Deca` will be rigidly applied, explicitly mapped by context (button, textbox, generic gui layer, and 3D simulation canvas space). This separates rendering domains while maintaining visual coherence.

### 🛑 Phase 0 Pause & QA Checkpoint
- Verify Lexend Deca is rendering correctly across all three identified domains (HUD, 3D world, interactive forms).
- Confirm font-weight and line-height parity with the desired "premium" aesthetic.

## Phase 1: Materials Engine Audit & Texture LOD System [COMPLETED]
* **Goal**: Optimize texture load times, ensure modularity, and standardize robust performant pipelines.
- Completed asynchronous progressive loading, predictive pre-fetching, and VRAM decompression optimizations.

## Phase 2: Procedural Audio Engine (Tone.js + Tonal.js) [COMPLETED]
* **Goal**: A fully generative, harmonically warm "analog" procedural audio engine with high operational resilience and "cozy/snappy" feedback.
### Proposed Changes
- **AudioEngine Core**: Implement `src/features/audio-engine/AudioEngine.ts`.
  - Master Bus: 2000Hz LPF (0.8 Q) + Subtle Compression + Reverb.
  - Tonal Brain: Use `Tonal.js` (C Lydian scale) to generate major 7th/9th harmonies for build events.
  - Synth Timbre: Multi-oscillator detuning for "analog drift" and `AmplitudeEnvelope` to eliminate digital pops.
  - **Interaction Refinement**: 
    - **Dry Snappiness**: Bypass `masterReverb` for `uiSynth` to eliminate "airyness" and ensure bone-dry tactile feedback.
    - **Tight Build Thud**: Reduce `buildSynth` reverb wetness and decay (0.5s) for a punchy, conclusive impact.
    - Snappier `uiSynth`: 0.05s decay/release for a tight, tactile feel.
    - **Nuance**: Distinct synthesis profiles for cancel/deselect (downward sweep) and menu expansion (high pip).
- **Tab Focus Resilience & Persistence**:
  - `useAudioController.ts` will implement `focus` and `visibilitychange` listeners to auto-resume the context when returning to the tab.
  - Interaction triggers will remain persistent (not one-shot) to allow manual recovery from browser-enforced suspensions.
- **Weather Mixing & Ambience**: Organic noise blending matrix hooked into `camera.zoom`. 
  - Zoom < 3.0: LPF-muted external noise + increased interior mechanical hum.
  - Zoom >= 3.0: Open Cutoff for wind/rain layers + faded interior hums.
- **Spatial 3D Panner Nodes**:
  - `Tone.Panner3D` node architecture for entities (Sims, elevators).
  - Sync Web Audio `Listener` with `THREE.Camera`.

### 🛑 Phase 2 Pause & QA Checkpoint [COMPLETED]
- [x] Verify Lexend Deca is rendering correctly.
- [x] Audit "snappy/cozy" harmonic structure.
- [x] **Focus Test**: Leave and return to the tab; verified auto-resume.
- [x] **Trigger Test**: Confirmed individual sub-room buttons in `BuildToolbar` fire distinct events.

### 🛑 Phase 2.5: Audio Robustness & Interaction Refinement [REFINING]
* **Goal**: Solve tab-switch suspension and achieve "premium" tactile auditory feedback without "airyness."
- [x] **Implemented Focus Resilience**: Automated `forceResume` on `focus`/`visibilitychange`.
- [x] **Implemented Persistent Initialization**: Watchdog loop (2s) to prevent context death.
- [/] **Dry Snappy Tuning**: Bypassing reverb for UI pips to remove ghostly tails.
- [/] **Primary Trigger Restoration**: Restoring audio to buildmenu category hovers/clicks.

## Phase 3: Spatial UX Feedback (Floating Finances)
... (existing content) ...

## Phase 4: Financial Dialog & Metrics
... (existing content) ...

## Phase 5: State Persistence (IndexedDB)
* **Goal**: Industrial-grade, modular persistence solution ensuring zero progress loss using IndexedDB.
### Proposed Changes
- **Persistence Engine**: Implement `src/features/persistence/PersistenceEngine.ts`.
  - **Delta-Only Diff Sync**: Only write modified SpatialHash cells to the database to maximize frame-time during rapid construction.
  - Auto-Save: Hook into Zustand state changes with a 2-second debounce.
- **Management UI**:
  - Main Menu: Add "Save Slots" and "Load Instance" dialogues.
  - Debug Toggle: "Automatic Wipe on Reload" persistent setting (defaulted ON for development).

### 🛑 Phase 5 Pause & QA Checkpoint
- Verify that refreshing the page correctly restores the exact tower state, spendable money, and simulation time.
- Test "Automatic Wipe" toggle function.


## Verification & QA
- Establish `tsc --noEmit` pass requirements continuously throughout module integration.
- Unit test spatial hash cache alignment and ring-buffer data ejection rates.
- Ensure positional audio Doppler effects (if enabled) and panning remain artifacts-free during rapid camera strafing.
