import { SimulationNode, GRID_SIZE_Y } from "@/src/shared/utils/store";
//logic for empty floors
export interface VacancyReconstructionParams {
  deletedShape: SimulationNode;
  currentShapes: SimulationNode[];
  addShapeCallback: (
    node: Partial<SimulationNode>,
    force?: boolean,
    skipSave?: boolean,
    opts?: { skipSelection?: boolean }
  ) => void;
}

/**
 * 2D Volumetric Vacancy Reconstruction Engine
 * 
 * Replaces the structural void left by a deleted room precisely using its native volumetric footprint.
 * Ensures multi-floor, large-width matrices are accurately painted with `empty_floor` instances without overhangs.
 */
export const reconstructVacancy = ({
  deletedShape,
  currentShapes,
  addShapeCallback,
}: VacancyReconstructionParams) => {
  const deletedLeft = deletedShape.position[0] - deletedShape.size[0] / 2;
  const deletedRight = deletedShape.position[0] + deletedShape.size[0] / 2;

  const deletedBottom = deletedShape.position[1] - deletedShape.size[1] / 2;
  const deletedTop = deletedShape.position[1] + deletedShape.size[1] / 2;

  // The Z-Height matrix uses standard GRID_SIZE_Y (40) chunks
  for (let cy = deletedBottom + GRID_SIZE_Y / 2; cy < deletedTop; cy += GRID_SIZE_Y) {
    // The X-Width matrix uses standard 10 chunk boundaries
    for (let cx = deletedLeft + 5; cx < deletedRight; cx += 10) {

      // Perform strict physics AABB test to ensure this exact scaffold block is geometrically unoccupied
      const testNode: Partial<SimulationNode> = {
        position: [cx, cy],
        size: [10, GRID_SIZE_Y]
      };

      const isAreaOccupied = currentShapes.some((s) => {
        // Essential: Structures are background foundations and must NOT block scaffold generation
        if (s.type === "structure") return false;

        // We only care about matching Y level and overlapping X level
        const strLeft = s.position[0] - s.size[0] / 2;
        const strRight = s.position[0] + s.size[0] / 2;
        const strBottom = s.position[1] - s.size[1] / 2;
        const strTop = s.position[1] + s.size[1] / 2;

        const testLeft = (testNode.position as any)[0] - (testNode.size as any)[0] / 2;
        const testRight = (testNode.position as any)[0] + (testNode.size as any)[0] / 2;
        const testBottom = (testNode.position as any)[1] - (testNode.size as any)[1] / 2;
        const testTop = (testNode.position as any)[1] + (testNode.size as any)[1] / 2;

        return (
          testLeft < strRight - 0.1 &&
          testRight > strLeft + 0.1 &&
          testBottom < strTop - 0.1 &&
          testTop > strBottom + 0.1
        );
      });

      if (!isAreaOccupied) {
        addShapeCallback(
          {
            id: `empty_floor_${Math.random().toString(36).substring(2, 9)}`,
            type: "empty_floor",
            position: [cx, cy],
            size: [10, GRID_SIZE_Y],
            vertices: [
              [-5, -GRID_SIZE_Y / 2],
              [5, -GRID_SIZE_Y / 2],
              [5, GRID_SIZE_Y / 2],
              [-5, GRID_SIZE_Y / 2],
            ],
            name: "Empty Floor",
          },
          true,
          true,
          { skipSelection: true }
        );
      }
    }
  }
};
