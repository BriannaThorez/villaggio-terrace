/**
 * Core placement definitions.
 * Axiomatic Truth: An Atom is defined mathematically as 10 units cubed.
 * In the context of room placement, `GRID_SIZE_X` (10 units) directly corresponds to 1 Atom width.
 */

export type SubAtomPrecision = "quarter" | "tenth";

export interface InteriorObjectBounds {
    width: number;
    depth: number;
    height?: number;
}

/**
 * Maps the abstract subdivision coordinate of an item.
 * `cellXIndex` represents the 0-indexed cell (Atom) from the left of the room bounding box.
 * `subZoneZ` and `subZoneX` represent the fractional offset inside the cell based on precision.
 */
export interface PlacementZone {
    cellXIndex: number;
    subZoneX: number; // 0-3 for quarter, 0-9 for tenth
    subZoneZ: number; // 0-3 for quarter, 0-9 for tenth

    // Y-axis placement is anchored directly to the dynamically computed floor surface, elevated by offsets.
    verticalSubZoneY: number;
}

/**
 * Calculates the bounding limits of a room mapped into placement terminology.
 */
export interface RoomPlacementGrid {
    roomId: string;
    widthAtoms: number;    // Total width of room measured in discrete Atoms
    depthAtoms: number;    // Depth mapped (generally equivalent to cell bounds)
    baseFloorY: number;    // The absolute world Y coordinate of the "mapped object-placable surface"
    precision: SubAtomPrecision;

    // To orient the grid relative to world
    anchorOriginX: number;
    anchorOriginZ: number;
}
