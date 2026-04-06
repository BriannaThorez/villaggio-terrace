import { SimulationNode } from "../../../entities/SimulationNodes";
import { checkStructuralIntegrity } from "./structuralIntegrity";

export interface PlacementResult {
    isValid: boolean;
    error?: "collision" | "structural" | "ground";
    collidingId?: string;
    overhang?: number;
}

/**
 * Validates a proposed node placement against ALL simulation rules.
 * Consolidates collision detection and structural integrity (overhang) checks.
 */
export const validatePlacement = (
    x: number,
    y: number,
    width: number,
    height: number,
    allShapes: SimulationNode[],
    type: string,
    ignoreId?: string,
    isForce = false
): PlacementResult => {
    // 1. Structural Integrity Check (Overhang)
    // Industry Standard Rule: Max 5 cell cantilever overhang without foundational support below.
    const structuralResult = checkStructuralIntegrity(x, y, width, allShapes, type);
    if (!structuralResult.isValid) {
        return {
            isValid: false,
            error: "structural",
            overhang: structuralResult.overhang
        };
    }

    // 2. Collision Check
    // We scan for overlaps with existing habitable rooms.
    // Foundation Scaffolds (type: "structure") are exempt from collision blocks.
    const cx1 = x;
    const cy1 = y;

    for (const s2 of allShapes) {
        if (s2.id === ignoreId) continue;
        if (s2.type === "structure") continue;

        const w2 = s2.size[0];
        const h2 = s2.size[1];
        const cx2 = s2.position[0];
        const cy2 = s2.position[1];

        // Standard AABB overlap with epsilon
        if (
            Math.abs(cx1 - cx2) < (width + w2) / 2 - 0.1 &&
            Math.abs(cy1 - cy2) < (height + h2) / 2 - 0.1
        ) {
            if (!isForce) {
                return { isValid: false, error: "collision", collidingId: s2.id };
            }
        }
    }

    return { isValid: true };
};
