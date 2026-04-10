import type { SimulationNode } from "../../../entities/SimulationNodes";
import { checkStructuralIntegrity } from "./structuralIntegrity";
import { FloorBucketIndex, STRUCTURAL_CONSTANTS } from "./spatialIndex";

const { COLLISION_EPSILON } = STRUCTURAL_CONSTANTS;

export interface PlacementResult {
    isValid: boolean;
    error?: "collision" | "structural" | "ground";
    collidingId?: string;
    overhang?: number;
}

/**
 * Validates a proposed node placement against ALL simulation rules.
 * Consolidates collision detection and structural integrity (overhang) checks.
 * 
 * Performance: Accepts an optional FloorBucketIndex for O(1) floor-level
 * queries instead of scanning every node in the simulation.
 */
export const validatePlacement = (
    x: number,
    y: number,
    width: number,
    height: number,
    allShapes: SimulationNode[],
    type: string,
    ignoreId?: string,
    isForce = false,
    index?: FloorBucketIndex
): PlacementResult => {
    // 1. Collision Check — keep this fast by checking overlaps before large structural traversal.
    //    We can skip the structural overhang work for clearly invalid overlaps (invalid builds over existing rooms).
    const candidates = index ? index.getFloorNodes(y) : allShapes;

    for (const s2 of candidates) {
        if (s2.id === ignoreId) continue;
        if (s2.type === "structure") continue;
        if (type !== "empty_floor" && s2.type === "empty_floor") continue;

        const w2 = s2.size[0];
        const h2 = s2.size[1];
        const cx2 = s2.position[0];
        const cy2 = s2.position[1];

        // Standard AABB overlap with epsilon
        if (
            Math.abs(x - cx2) < (width + w2) / 2 - COLLISION_EPSILON &&
            Math.abs(y - cy2) < (height + h2) / 2 - COLLISION_EPSILON
        ) {
            if (!isForce) {
                return { isValid: false, error: "collision", collidingId: s2.id };
            }
        }
    }

    // 2. Structural Integrity Check (Overhang)
    //    Run this only once we’ve established there are no instant collisions.
    const structuralResult = checkStructuralIntegrity(x, y, width, allShapes, type, undefined, index);
    if (!structuralResult.isValid) {
        return {
            isValid: false,
            error: "structural",
            overhang: structuralResult.overhang,
        };
    }

    return { isValid: true };
};
