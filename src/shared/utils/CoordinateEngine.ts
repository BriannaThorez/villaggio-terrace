import { RoomPlacementGrid } from "@/src/shared/types/interiorPlacement";
import { GRID_SIZE_X } from "@/src/shared/utils/store";

/**
 * Translates a sub-Atom coordinate into a deterministic world positional offset 
 * relative to the room's physical geometry, enhanced with boundary restraints
 * and intersection snap calculation mathematically derived from foundational constants.
 */
export const computeSnappedWorldOffset = (
    grid: RoomPlacementGrid,
    atomX: number,
    atomZ: number,
    subZoneX: number,
    subZoneZ: number,
    objectBounds?: { width: number, depth: number }
): [number, number, number] => {
    // Math derivation from `usePlacementGrid.ts` legacy function:
    const isTenth = grid.precision === "tenth";
    const divisor = isTenth ? 10 : 4;
    const unitSize = GRID_SIZE_X / divisor;

    // Resolve absolute origin offset constraints referencing the parent width
    const cellOriginX = (atomX * GRID_SIZE_X) - (grid.widthAtoms * GRID_SIZE_X) / 2;
    const cellOriginZ = (atomZ * GRID_SIZE_X) - (grid.depthAtoms * GRID_SIZE_X) / 2;

    // Centered coordinate inside sub-zone calculation
    let offsetX = cellOriginX + (subZoneX * unitSize) + (unitSize / 2);
    let offsetZ = cellOriginZ + (subZoneZ * unitSize) + (unitSize / 2);

    // If intersection snapping points are requested (e.g. alignment to boundaries)
    // We adjust the offsetX based on the object's geometry bounds enforcement.
    if (objectBounds) {
        // Enforce structural boundary limits
        const maxLimitX = (grid.widthAtoms * GRID_SIZE_X) / 2;
        const minLimitX = -maxLimitX;

        const maxLimitZ = (grid.depthAtoms * GRID_SIZE_X) / 2;
        const minLimitZ = -maxLimitZ;

        // Apply clamping boundary logic so objects cannot overhang or clip via AABB
        if (offsetX - objectBounds.width / 2 < minLimitX) {
            offsetX = minLimitX + objectBounds.width / 2;
        }
        if (offsetX + objectBounds.width / 2 > maxLimitX) {
            offsetX = maxLimitX - objectBounds.width / 2;
        }

        if (offsetZ - objectBounds.depth / 2 < minLimitZ) {
            offsetZ = minLimitZ + objectBounds.depth / 2;
        }
        if (offsetZ + objectBounds.depth / 2 > maxLimitZ) {
            offsetZ = maxLimitZ - objectBounds.depth / 2;
        }
    }

    return [offsetX, grid.baseFloorY, offsetZ];
};
