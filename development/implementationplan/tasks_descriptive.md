# UI Theming Implementation Tasks

## Objective
Create a centralized, industry-leading theme and global styling foundation under `src/features/ui/themes` that starts with a **base 14px global root**, a **clamped compensation token set** for high-DPI / 4K / scaling environments, and the **3-layer theme structure**:
1. `theme.ts` as the source of truth
2. `globalStyles.css` as the CSS variable bridge
3. components as consumers

The system must preserve the current visual appearance as the baseline while making sizing relative, predictable, and resilient on large displays without ballooning or breaking.

## Guiding principles
- Preserve current visual behavior unless a change is required for parity or consolidation.
- Make only targeted, careful changes.
- Avoid rewrites unless explicitly necessary.
- Remove hard-coded styling only after equivalent theme tokens exist.
- Verify each phase with linting and QA checks.
- Keep the current look and feel as the baseline reference.

## Axiomatic, axiological, and teleological intent

### Request 1: Create an industry-leading themes engine/global styles
- **Axiomatic intent**: Establish a single authoritative theme foundation for GUI styling, sizing, and colors.
- **Axiological intent**: Improve consistency, maintainability, clarity, and future theme switching without degrading the current design.
- **Teleological intent**: Enable the entire GUI to derive its styling from a centralized, scalable theme system.

### Request 2: Use the current theme for all information and do not change anything unless it improves parity without visual sacrifice
- **Axiomatic intent**: The existing visual system is the source of truth.
- **Axiological intent**: Preserve user trust and avoid unnecessary visual regressions.
- **Teleological intent**: Migrate styling infrastructure safely while retaining current polish.

### Request 3: Remove hard codings in favor of theme/global style sizing
- **Axiomatic intent**: Hard-coded values should be replaced by reusable tokens and theme abstractions wherever possible.
- **Axiological intent**: Improve long-term maintainability, consistency, and future extensibility.
- **Teleological intent**: Reduce duplication and make future theme switching practical.

---

## Phase 1 — Baseline audit and relative token inventory
- [ ] Inventory current GUI sizing, spacing, radius, border, shadow, and color usage.
- [ ] Identify existing theme data sources and current palette usage.
- [ ] Catalog hard-coded values that are candidates for tokenization:
  - [ ] spacing
  - [ ] radius
  - [ ] shadow
  - [ ] border
  - [ ] font sizing
  - [ ] icon sizing
  - [ ] surface/background treatment
- [ ] Record the highest-visibility UI elements that must not regress.
- [ ] Confirm current visual parity expectations before additional migration.
- [ ] Identify all places where the current UI may be influenced by root font-size, rem scaling, or container-based scaling.

### Verification / QA
- [ ] Run linting on all touched files.
- [ ] Review current UI screenshots or runtime behavior as a baseline reference.
- [ ] Validate that the current visual system is documented before changes continue.

---

## Phase 2 — Theme engine and relative token model
- [ ] Finalize the `src/features/ui/themes` structure.
- [ ] Define a token model that includes:
  - [ ] color palette
  - [ ] semantic surface colors
  - [ ] spacing scale
  - [ ] radius scale
  - [ ] shadow scale
  - [ ] component sizing tokens
  - [ ] relative compensation tokens for large-display resilience
- [ ] Define the industry-standard 5-color palette contract.
- [ ] Define a base `14px` global root contract.
- [ ] Define a clamped compensation token set that prevents runaway scaling on high-DPI / 4K / ultrawide displays.
- [ ] Ensure the theme model can faithfully represent the current GUI without visual sacrifice.
- [ ] Keep the API simple enough for incremental adoption in existing components.

### Verification / QA
- [ ] Run linting on all new theme files.
- [ ] Validate type safety and token shape consistency.
- [ ] Confirm the theme model can express the current UI baseline.

---

## Phase 3 — Global style foundation
- [ ] Introduce `globalStyles.css` as the CSS variable bridge derived from the theme tokens.
- [ ] Set the global base font size to `14px`.
- [ ] Expose CSS variables for semantic and component-level tokens.
- [ ] Expose clamped compensation variables for large-display-safe scaling.
- [ ] Preserve existing rendering behavior while moving toward theme-driven styling.
- [ ] Keep the global style layer additive and non-destructive.

### Verification / QA
- [ ] Run linting after global style integration.
- [ ] Check that the application renders without visual regressions in primary screens.
- [ ] Confirm global styles do not conflict with current toolbar/panel styling.
- [ ] Validate that large viewport or scaling conditions do not balloon the UI.

---

## Phase 4 — Theme consumption by high-visibility components
- [ ] Update the most visible GUI components to read from theme tokens where values are exact matches.
- [ ] Prioritize components that already follow stable visual conventions.
- [ ] Replace hard-coded values only when the tokenized value preserves parity.
- [ ] Keep component changes narrow and reversible.
- [ ] Avoid modifying unrelated behavior while migrating styling.
- [ ] Apply clamped compensation tokens only where needed to stabilize large-display rendering.

### Verification / QA
- [ ] Run linting after each migration batch.
- [ ] Visually compare migrated components against the current baseline.
- [ ] Confirm no component loses its current visual quality or consistency.
- [ ] Confirm no component becomes oversized on 4K / DPI-scaled displays.

---

## Phase 5 — Hard-coded styling removal
- [ ] Replace remaining safe hard-coded GUI values with theme/global style references.
- [ ] Replace hard-coded colors with palette or semantic tokens where appropriate.
- [ ] Consolidate duplicated style constants into shared theme tokens when safe.
- [ ] Preserve bespoke values only where they are required to maintain unique visuals.
- [ ] Avoid rewrites unless absolutely necessary for correctness.

### Verification / QA
- [ ] Run linting after each cleanup pass.
- [ ] Re-check the main toolbar, build toolbar, and other high-visibility GUI elements.
- [ ] Confirm visual parity remains intact after tokenization.
- [ ] Confirm compensation values are clamped and do not inflate controls at high scale.

---

## Phase 6 — Parity review and display-resilience refinement
- [ ] Audit the migrated UI against the current visual baseline.
- [ ] Review radius, spacing, border, shadow, and palette consistency.
- [ ] Confirm theme adoption did not introduce perceptible regressions.
- [ ] Review the 14px root and compensation system across common display scales.
- [ ] Refine only when necessary to preserve the current look.
- [ ] Verify the system is ready for future theme switching and display scaling.

### Verification / QA
- [ ] Run linting across the touched UI/theme files.
- [ ] Perform manual QA of the primary screens and toolbars.
- [ ] Confirm no runtime warnings or visual inconsistencies remain.
- [ ] Validate behavior under high-DPI, 4K, and browser zoom conditions.

---

## Phase 7 — Documentation and forward compatibility
- [ ] Document the theme engine structure and usage pattern.
- [ ] Document token naming conventions and migration rules.
- [ ] Document the `14px` base root and clamped compensation strategy.
- [ ] Document how future themes can be introduced without rewrites.
- [ ] Clarify the expectation that styling changes should prefer tokens over literals.
- [ ] Capture parity-first and display-resilience guidelines for future contributors.

### Verification / QA
- [ ] Run linting on documentation-adjacent code changes.
- [ ] Review docs for correctness and clarity.
- [ ] Confirm the architecture is understandable and maintainable.

---

## Completion criteria
- [ ] A centralized theming system exists in `src/features/ui/themes`.
- [ ] `globalStyles.css` sets a 14px base root and bridges the theme variables.
- [ ] The GUI can derive sizing and color from a global style/token layer.
- [ ] The compensation system prevents ballooning on high-DPI / 4K / zoomed environments.
- [ ] The current theme remains visually faithful.
- [ ] Hard-coded GUI styles are reduced where safe and appropriate.
- [ ] Linting and QA checks are performed in every phase.
- [ ] The architecture supports future theme switching without a rewrite.
- [ ] No unrelated visual regressions are introduced.

## Notes
- Prioritize targeted, low-risk changes over broad rewrites.
- If a tokenization change risks visual sacrifice, preserve the existing style until a safe equivalent is available.
- The theme system should be structured so future theme switching can be added without reworking the entire GUI.