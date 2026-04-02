import {
  createRoomVec3,
  type RoomDimensions,
  type RoomFace,
  type RoomOpening,
  type RoomOpeningCoordinateAxis,
  type RoomThickness,
  type RoomVec3,
} from "../../types";

export interface RoomOpeningBounds {
  min: RoomVec3;
  max: RoomVec3;
}

export interface RoomShellGeometry {
  outerBounds: RoomOpeningBounds;
  innerBounds: RoomOpeningBounds;
  floorBounds: RoomOpeningBounds;
  ceilingBounds: RoomOpeningBounds;
}

export interface RoomFaceGeometry {
  face: RoomFace;
  normal: RoomVec3;
  center: RoomVec3;
  isVertical: boolean;
}

const axisSignForFace = (face: RoomFace): 1 | -1 => {
  switch (face) {
    case "south":
    case "east":
    case "top":
      return 1;
    case "north":
    case "west":
    case "bottom":
    default:
      return -1;
  }
};

const roomCenterToBounds = (dimensions: RoomDimensions): RoomOpeningBounds => ({
  min: createRoomVec3(
    -dimensions.width / 2,
    -dimensions.height / 2,
    -dimensions.depth / 2,
  ),
  max: createRoomVec3(
    dimensions.width / 2,
    dimensions.height / 2,
    dimensions.depth / 2,
  ),
});

const getRoomFaceNormal = (face: RoomFace): RoomVec3 => {
  switch (face) {
    case "north":
      return createRoomVec3(0, 0, -1);
    case "south":
      return createRoomVec3(0, 0, 1);
    case "east":
      return createRoomVec3(1, 0, 0);
    case "west":
      return createRoomVec3(-1, 0, 0);
    case "top":
      return createRoomVec3(0, 1, 0);
    case "bottom":
      return createRoomVec3(0, -1, 0);
  }
};

const isRoomOpeningOnVerticalFace = (face: RoomFace): boolean =>
  face === "north" || face === "south" || face === "east" || face === "west";

const applyPlacementOffset = (
  position: RoomVec3,
  axis: RoomOpeningCoordinateAxis,
  offset: number,
): RoomVec3 => {
  switch (axis) {
    case "x":
      return createRoomVec3(position.x + offset, position.y, position.z);
    case "y":
      return createRoomVec3(position.x, position.y + offset, position.z);
    case "z":
      return createRoomVec3(position.x, position.y, position.z + offset);
  }
};

export const getRoomShellGeometry = (
  dimensions: RoomDimensions,
  thickness: RoomThickness,
): RoomShellGeometry => {
  const outerBounds = roomCenterToBounds(dimensions);

  const innerWidth = Math.max(0, dimensions.width - thickness.wall * 2);
  const innerHeight = Math.max(
    0,
    dimensions.height - thickness.bottom - thickness.top,
  );
  const innerDepth = Math.max(0, dimensions.depth - thickness.wall * 2);

  const innerBounds: RoomOpeningBounds = {
    min: createRoomVec3(
      -innerWidth / 2,
      -innerHeight / 2 + thickness.bottom,
      -innerDepth / 2,
    ),
    max: createRoomVec3(
      innerWidth / 2,
      innerHeight / 2 - thickness.top,
      innerDepth / 2,
    ),
  };

  return {
    outerBounds,
    innerBounds,
    floorBounds: {
      min: createRoomVec3(
        outerBounds.min.x,
        outerBounds.min.y,
        outerBounds.min.z,
      ),
      max: createRoomVec3(
        outerBounds.max.x,
        outerBounds.min.y + thickness.bottom,
        outerBounds.max.z,
      ),
    },
    ceilingBounds: {
      min: createRoomVec3(
        outerBounds.min.x,
        outerBounds.max.y - thickness.top,
        outerBounds.min.z,
      ),
      max: createRoomVec3(
        outerBounds.max.x,
        outerBounds.max.y,
        outerBounds.max.z,
      ),
    },
  };
};

export const getRoomFaceGeometry = (
  face: RoomFace,
  dimensions: RoomDimensions,
): RoomFaceGeometry => {
  const halfWidth = dimensions.width / 2;
  const halfHeight = dimensions.height / 2;
  const halfDepth = dimensions.depth / 2;

  switch (face) {
    case "north":
      return {
        face,
        normal: getRoomFaceNormal(face),
        center: createRoomVec3(0, 0, -halfDepth),
        isVertical: true,
      };
    case "south":
      return {
        face,
        normal: getRoomFaceNormal(face),
        center: createRoomVec3(0, 0, halfDepth),
        isVertical: true,
      };
    case "east":
      return {
        face,
        normal: getRoomFaceNormal(face),
        center: createRoomVec3(halfWidth, 0, 0),
        isVertical: true,
      };
    case "west":
      return {
        face,
        normal: getRoomFaceNormal(face),
        center: createRoomVec3(-halfWidth, 0, 0),
        isVertical: true,
      };
    case "bottom":
      return {
        face,
        normal: getRoomFaceNormal(face),
        center: createRoomVec3(0, -halfHeight, 0),
        isVertical: false,
      };
    case "top":
      return {
        face,
        normal: getRoomFaceNormal(face),
        center: createRoomVec3(0, halfHeight, 0),
        isVertical: false,
      };
  }
};

export const getOpeningBounds = (
  opening: RoomOpening,
  dimensions: RoomDimensions,
): RoomOpeningBounds => {
  const center = getOpeningCenter(opening, dimensions);
  const halfWidth = opening.size.width / 2;
  const halfHeight = opening.size.height / 2;
  const wallDepth = dimensions.depth / 2;
  const wallWidth = dimensions.width / 2;
  const face = opening.placement.face;

  if (face === "north" || face === "south") {
    return {
      min: createRoomVec3(
        center.x - halfWidth,
        center.y - halfHeight,
        -wallDepth,
      ),
      max: createRoomVec3(
        center.x + halfWidth,
        center.y + halfHeight,
        wallDepth,
      ),
    };
  }

  if (face === "east" || face === "west") {
    return {
      min: createRoomVec3(
        -wallWidth,
        center.y - halfHeight,
        center.z - halfWidth,
      ),
      max: createRoomVec3(
        wallWidth,
        center.y + halfHeight,
        center.z + halfWidth,
      ),
    };
  }

  return {
    min: createRoomVec3(
      center.x - halfWidth,
      center.y - halfHeight,
      center.z - halfWidth,
    ),
    max: createRoomVec3(
      center.x + halfWidth,
      center.y + halfHeight,
      center.z + halfWidth,
    ),
  };
};

export const getOpeningCenter = (
  opening: RoomOpening,
  dimensions: RoomDimensions,
): RoomVec3 => {
  const { placement } = opening;
  const baseCenter = getFacePlacementAnchor(
    placement.face,
    dimensions,
    placement.inward,
  );

  return applyPlacementOffset(baseCenter, placement.axis, placement.offset);
};

export const getOpeningClearance = (
  opening: RoomOpening,
  thickness: RoomThickness,
): number => {
  const base = Math.max(thickness.wall, thickness.bottom, thickness.top);
  switch (opening.type) {
    case "door":
      return base * 1.5;
    case "window":
      return base;
    case "cutaway":
      return base * 2;
    case "passage":
    default:
      return base;
  }
};

export const isOpeningValidForFace = (opening: RoomOpening): boolean =>
  opening.placement.face === "north" ||
  opening.placement.face === "south" ||
  opening.placement.face === "east" ||
  opening.placement.face === "west" ||
  opening.placement.face === "bottom" ||
  opening.placement.face === "top";

export const getFacePlacementAnchor = (
  face: RoomFace,
  dimensions: RoomDimensions,
  inset = 0,
): RoomVec3 => {
  const halfWidth = dimensions.width / 2;
  const halfHeight = dimensions.height / 2;
  const halfDepth = dimensions.depth / 2;

  switch (face) {
    case "north":
      return createRoomVec3(0, 0, -halfDepth + inset);
    case "south":
      return createRoomVec3(0, 0, halfDepth - inset);
    case "east":
      return createRoomVec3(halfWidth - inset, 0, 0);
    case "west":
      return createRoomVec3(-halfWidth + inset, 0, 0);
    case "bottom":
      return createRoomVec3(0, -halfHeight + inset, 0);
    case "top":
      return createRoomVec3(0, halfHeight - inset, 0);
  }
};

export const getStructuralPlacementZones = (
  dimensions: RoomDimensions,
  thickness: RoomThickness,
) => {
  const shell = getRoomShellGeometry(dimensions, thickness);

  return {
    shell,
    floorZone: {
      min: shell.innerBounds.min,
      max: createRoomVec3(
        shell.innerBounds.max.x,
        shell.innerBounds.min.y + thickness.bottom,
        shell.innerBounds.max.z,
      ),
    },
    ceilingZone: {
      min: createRoomVec3(
        shell.innerBounds.min.x,
        shell.innerBounds.max.y - thickness.top,
        shell.innerBounds.min.z,
      ),
      max: shell.innerBounds.max,
    },
  };
};

export const getOpeningFacingDirection = (opening: RoomOpening): RoomVec3 =>
  getRoomFaceNormal(opening.placement.face);

export const getOpeningSpanAxis = (opening: RoomOpening): "x" | "z" => {
  const { axis, face } = opening.placement;

  if (axis === "x" || axis === "z") {
    return axis;
  }

  if (face === "north" || face === "south") {
    return "x";
  }

  return "z";
};
