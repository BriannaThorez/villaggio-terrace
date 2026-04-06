import { useMemo } from 'react';
import { GRID_SIZE_X, getFloorBaseY } from '../../../shared/utils/store';
import { RoomPlacementGrid, SubAtomPrecision } from '../domain/types';

/**
 * Procedurally generates the Atom placement grid mapping for a room node.
 * Axiomatically inherits cell constraints and aligns the Y-axis to the exact placable surface vector.
 * Refactored from legacy 'usePlacementGrid'.
 */
export const useInteriorSubgrid = (
    roomId: string,
    roomSizeX: number,
    roomSizeZ: number,
    roomYPos: number,
    precision: SubAtomPrecision = 'tenth'
): RoomPlacementGrid => {
    return useMemo(() => {
        // 1. Structural Inheritance
        // Calculate total width measured in Atoms (where 10 units = 1 Atom).
        const widthAtoms = Math.max(1, Math.round(roomSizeX / GRID_SIZE_X));
        const depthAtoms = Math.max(1, Math.round(roomSizeZ / GRID_SIZE_X));

        // 2. Vertical Restraint (Axiomatic Floor Top-Face)
        // Inherit the exact base Y from the architectural store constraint.
        const baseFloorY = getFloorBaseY(roomYPos);

        return {
            roomId,
            widthAtoms,
            depthAtoms,
            baseFloorY,
            precision,
            anchorOriginX: 0,
            anchorOriginZ: 0,
        };
    }, [roomId, roomSizeX, roomSizeZ, roomYPos, precision]);
};
