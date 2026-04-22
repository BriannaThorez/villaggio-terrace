**Villaggio Terrace**
Author: Brianna Thorez
Version: 1.0.0

---

## Worker Pool Configuration

workers = Math.max(navigator.hardwareConcurrency || 4, 4)
roles   = ["layout", "layout", "routing", "analysis"]

---

## Structural Simulation Logic
```yaml
purpose:
  brief: "Define the architectural and simulation logic for the tower building simulator."
  expanded:
    axiomatic_intent: "The building is a discrete grid of modules bounded by mathematical constraints. The fundamental volumetric metric is the Atom."
    axiological_intent: "We prioritize spatial efficiency, resource propagation, collision-free subgrid stability, and simulation depth."
    teleological_intent: "To build a high-performance, WebGL2-accelerated tower management simulator."

simulation_logic:
  grid_system:
    base_unit: "StructuralAtom (10x10x10 units historically mapped to GRID_SIZE_X)."
    working_unit: "StructuralCell (4:1 horizontal spanning construct)."
    modular_unit: "StructuralRoom/StructuralUnit (composed of multiple StructuralCells)."
    subgrid_unit: "SubZone (1x1 scaling fractional alignment element under 'tenth' precision)."
    aspect_ratio: "1:4 (width:height) for StructuralCells."
    modular_footprints: "Fixed dimensions based on StructuralCell count (e.g., 4x1)."
    verticality: "Floor-based height (1 StructuralCell height = 1 floor)."
    propagation: "Resources (power, water) propagate through the grid network."

  grid_terminology:
    StructuralAtom: "Base volumetric metric (10 units wide). The foundation of the visual and structural footprint subdivision."
    StructuralCell: "Working-grid container segment holding multiple atoms algorithmically."
    SubZone: "Fractional bounding array under 'interiorPlacement', resolving subgrid positions dynamically."
    StructuralRoom: "Cumulative shell object composed of several components, rendering internal CSG boundaries."
    grid_coordinate: "Index [x, y] representing absolute positioning arrays."

  interior_placement:
    feature_slice: "interiorPlacement"
    coordinate_engine: "Leverages computeSnappedWorldOffset to resolve exact spatial mappings from Atom boundaries."
    boundary_constraints: "Strict AABB clamping guarantees logic preventing floor-overhang or wall-penetrations."
    snapping_mechanics: "Procedural geometry alignment providing perfect centromere parsing and corner/intersection point support for discrete props."

  alignment_strategy:
    grid_snapping: "Constrains parent volumes to macro-grid (GRID_SIZE) boundaries."
    spatial_constraints: "Modules mandate spatial validation logic enforcing support architecture."
    visual_grid_reference: "Debug visualizations highlight active Atom matrices bounding dynamically placed entities."

  implementation_plan:
    phase_1_data_model: "Leveraging SpatialHash mapping supplemented by micro-level subZone array bounding logic."
    phase_2_ui_ux: "Transformation via contextual placement interactions and dynamic grid overlays."
    phase_3_simulation: "Implement discrete tick-based resource generation."
    phase_4_visuals: "Unified mesh CSG rendering resolving interior boundaries automatically."

  rendering_engine:
    type: "Three.js 3D scene representation."
    style: "Deep 3D orthographic-styled single mesh projections via advanced geometry CSG evaluation."
    performance: "Resolution-independent deterministic framerate structure."
```