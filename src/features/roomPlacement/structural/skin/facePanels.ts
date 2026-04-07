import type {
  StructuralFace,
  StructuralFaceCutout,
  StructuralRoomMetadata,
} from "../graph";

const FRONT_FACE_Z = 0;
const BACK_FACE_Z = 0;
const FLOOR_Y = 0;



export const buildCutoutOutlinePoints = (
  room: StructuralRoomMetadata,
  cutout: Pick<StructuralFaceCutout, "bounds" | "face">,
  offset: number,
): [number, number, number][] => {
  const [minU, minV] = cutout.bounds.min;
  const [maxU, maxV] = cutout.bounds.max;
  const halfWidth = room.dimensions.width / 2;

  switch (cutout.face) {
    case "front": {
      const z = FRONT_FACE_Z + offset;
      return [
        [minU, minV, z],
        [maxU, minV, z],
        [maxU, maxV, z],
        [minU, maxV, z],
        [minU, minV, z],
      ];
    }
    case "back": {
      const z = -room.dimensions.depth + BACK_FACE_Z - offset;
      return [
        [minU, minV, z],
        [maxU, minV, z],
        [maxU, maxV, z],
        [minU, maxV, z],
        [minU, minV, z],
      ];
    }
    case "left": {
      const x = -halfWidth - offset;
      return [
        [x, minV, minU],
        [x, minV, maxU],
        [x, maxV, maxU],
        [x, maxV, minU],
        [x, minV, minU],
      ];
    }
    case "right": {
      const x = halfWidth + offset;
      return [
        [x, minV, minU],
        [x, minV, maxU],
        [x, maxV, maxU],
        [x, maxV, minU],
        [x, minV, minU],
      ];
    }
    case "ceiling": {
      const y = room.dimensions.height + offset;
      return [
        [minU, y, minV],
        [maxU, y, minV],
        [maxU, y, maxV],
        [minU, y, maxV],
        [minU, y, minV],
      ];
    }
    case "floor": {
      const y = FLOOR_Y + offset;
      return [
        [minU, y, minV],
        [maxU, y, minV],
        [maxU, y, maxV],
        [minU, y, maxV],
        [minU, y, minV],
      ];
    }
  }
};
