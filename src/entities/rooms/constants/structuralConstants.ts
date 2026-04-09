/**
 * Structural Constants — Single Source of Truth
 *
 * These define the physical dimensions of the structure shell (the outer
 * architectural envelope). Room components use these to compute their inset
 * dimensions so they sit visually INSIDE the structure.
 *
 * Reference: RoomMeshCSG.tsx renders the structure CSG with wallThickness=0.25.
 * The CSG subtraction formula uses (wallThickness + 0.55) for the floor/ceiling
 * slab, and wallThickness for back wall depth.
 */

/** Thickness of each structure wall (left, right, back) in world units. */
export const STRUCTURE_WALL_THICKNESS = 0.25;

/** Thickness of the structure's floor slab in world units. */
export const STRUCTURE_FLOOR_THICKNESS = 0.5;

/** Thickness of the structure's ceiling slab in world units. */
export const STRUCTURE_CEILING_THICKNESS = 0.25;

/** Standard room depth (Z-axis) in world units. */
export const STRUCTURE_DEPTH = 40;
