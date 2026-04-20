import type { SimulationNode } from "../../../shared/utils/store";
import { checkStructuralIntegrity } from "./structuralIntegrity";
import { FloorBucketIndex, STRUCTURAL_CONSTANTS } from "./spatialIndex";
import { buildHotelCapacityMap } from "../../hotel/hotelCapacityEngine";
import roomMetadata from "../../../entities/rooms/roomMetadata.json";

const { COLLISION_EPSILON } = STRUCTURAL_CONSTANTS;

export interface PlacementResult {
  isValid: boolean;
  error?: "collision" | "structural" | "ground";
  collidingId?: string;
  overhang?: number;
  warnings?: ("NO_RECEPTION_DESK" | "DESK_AT_CAPACITY")[];
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
  index?: FloorBucketIndex,
): PlacementResult => {
  // 1. Collision Check — keep this fast by checking overlaps before large structural traversal.
  //    We can skip the structural overhang work for clearly invalid overlaps (invalid builds over existing rooms).
  const candidates = index ? index.getFloorNodes(y) : allShapes;

  for (const s2 of candidates) {
    if (s2.id === ignoreId) continue;

    // RULE: Structural elements (scaffolds, empty floors) bypass regular collision 
    // to allow real rooms to be built "over" them.
    // BUT: To solve the 'sidequest', we MUST block placing a structural element 
    // over another structural element of the same type (redundant stacking).
    const isS1Structural = type === "structure" || type === "empty_floor";
    const isS2Structural = s2.type === "structure" || s2.type === "empty_floor";
    
    // If placing a room over a structural element, always allow (continue)
    if (type !== "structure" && type !== "empty_floor" && isS2Structural) continue;
    
    // If placing a structural element over a DIFFERENT type, or if isForce, we skip regular collision
    // Actually, we want to allow structural elements to coexist EXCEPT if they are redundant.
    if (isS1Structural && isS2Structural) {
      // If they are exactly the same type and overlapping, block it.
      if (type === s2.type) {
        const w2 = s2.size[0];
        const h2 = s2.size[1];
        const cx2 = s2.position[0];
        const cy2 = s2.position[1];

        if (
          Math.abs(x - cx2) < (width + w2) / 2 - COLLISION_EPSILON &&
          Math.abs(y - cy2) < (height + h2) / 2 - COLLISION_EPSILON
        ) {
          return { isValid: false, error: "collision", collidingId: s2.id };
        }
      }
      // Otherwise, allow them to overlap (e.g. lobby over structure)
      continue;
    }

    // Standard Room-on-Room collision
    const w2 = s2.size[0];
    const h2 = s2.size[1];
    const cx2 = s2.position[0];
    const cy2 = s2.position[1];

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
  const structuralResult = checkStructuralIntegrity(
    x,
    y,
    width,
    allShapes,
    type,
    undefined,
    index,
  );
  if (!structuralResult.isValid) {
    return {
      isValid: false,
      error: "structural",
      overhang: structuralResult.overhang,
    };
  }

  // 3. Hotel Capacity Check (Warnings only)
  if (type === "hotel") {
    const tempShapes = [...allShapes, { id: "temp", metadataId: ignoreId || "", position: [x, y], size: [width, height], type } as any];
    const capacityMap = buildHotelCapacityMap(tempShapes);
    const roomStatus = capacityMap.rooms["temp"];
    
    if (roomStatus) {
      if (roomStatus.status === "NO_RECEPTION") {
        // Distinguish between no desk existing vs desks full
        const hostDesks = allShapes.filter(s => s.metadataId === "hotel-reception-desk");
        return { 
          isValid: true, 
          warnings: hostDesks.length === 0 ? ["NO_RECEPTION_DESK"] : ["DESK_AT_CAPACITY"] 
        };
      }
    }
  }

  return { isValid: true };
};
