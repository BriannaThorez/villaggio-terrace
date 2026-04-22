# Source of Truth: Modular Room Volumes & Dynamic Object Placement Prompt

## User Prompt

"We need to ensure all rooms are physically placable by assigning them a physical room kind of like how the resident rooms have... Does office use the residential unit one? We need physical room volumes that will resize for all of the classes. Not just offices, residences etc."

"The bed mesh is a placeholder for a dynamic object placement system i'd like to ultimately build in which the room is divided into snap points based on how many cells wide it is and obects of various types may be placed there."

## AI Analysis & Intent

### Axiomatic Intent (Fundamental Principles)
- The core rendering system (CSG, SimulationNodes) must be completely decoupled from specific room classes (like residential). A universal room volumetric shell is an absolute necessity to prevent class-specific components (e.g., a bed) from bleeding into unrelated spaces (e.g., an office).
- The spatial integrity of the simulation is governed by a strict cell-based grid system. Room interiors must logically inherit and divide this spatial system into local coordinate snap points.

### Axiological Intent (Values & Standards)
- **Modularity:** Components must be distinct and reusable. A room volume should not "know" it has a bed; it should only know it has a grid of snap points where an object (like a bed or desk) can be placed.
- **Scalability & Performance:** Reusing a single optimized CSG shell (`ModularRoomVolume`) ensures that as new room classes are introduced, the rendering logic does not fork or bloat.
- **Industry-Leading Precision:** Implementing a true dynamic object placement system rather than relying on hardcoded placeholder meshes brings the engine up to commercial simulation standards (akin to advanced management sims).

### Teleological Intent (Ultimate Goal)
- To architect a robust, modular physical space layer where every standard room in the game—regardless of its class—utilizes a unified, scalable 3D volumetric shell. Within these shells, to establish a functional, cell-wide dependent interior grid coordinate system (snap points) that serves as the foundation for a fully dynamic, user-driven furniture/object placement mechanic.
