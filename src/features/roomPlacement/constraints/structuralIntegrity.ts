import type { SimulationNode } from "../../../shared/utils/store";
import { FloorBucketIndex, STRUCTURAL_CONSTANTS } from "./spatialIndex";
import { getMaxCantileverLogic, SimpleNode } from "./structuralLogic";

const {
  FLOOR_HEIGHT,
} = STRUCTURAL_CONSTANTS;

/**
 * Maps SimulationNodes to a simplified format for the pure logic engine.
 */
const mapToSimpleNodes = (nodes: any[]): SimpleNode[] => 
  nodes.map(s => ({
    id: s.id,
    x: s.position[0],
    y: s.position[1],
    w: s.size[0],
    h: s.size[1],
    type: s.type
  }));

/**
 * Calculates the maximum cantilever distance for a contiguous structural cluster.
 * 
 * Performance: Uses FloorBucketIndex for O(1) floor-level optimization.
 */
export const getMaxCantilever = (
  x: number,
  y: number,
  width: number,
  allShapes: SimulationNode[],
  _targetType: string,
  index?: FloorBucketIndex,
): number => {
  const floorNodes = index
    ? index.getStructuralFloorNodes(y)
    : allShapes.filter(s => Math.abs(s.position[1] - y) < 5);

  const supportsBelow = index
    ? index.getSupportNodes(y)
    : allShapes.filter(s => Math.abs(s.position[1] - (y - FLOOR_HEIGHT)) < 10);

  const supportsAbove = index
    ? index.getAboveNodes(y)
    : allShapes.filter(s => Math.abs(s.position[1] - (y + FLOOR_HEIGHT)) < 10);

  return getMaxCantileverLogic(
    x,
    y,
    width,
    mapToSimpleNodes(floorNodes),
    mapToSimpleNodes(supportsBelow),
    mapToSimpleNodes(supportsAbove),
  );
};

/**
 * Enforces the "Max 5 unit cantilever overhang" industry-leading structural constraint.
 */
export const checkStructuralIntegrity = (
  x: number,
  y: number,
  width: number,
  allShapes: SimulationNode[],
  _targetType: string,
  maxOverhang = 50.1, // 5 Cells (Industry Standard)
  index?: FloorBucketIndex,
): { isValid: boolean; overhang: number } => {
  const cantilever = getMaxCantilever(
    x,
    y,
    width,
    allShapes,
    _targetType,
    index,
  );
  return {
    isValid: cantilever <= maxOverhang,
    overhang: cantilever,
  };
};
