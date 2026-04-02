import * as THREE from "three";
import {
  DEFAULT_REVEAL_DEPTH,
  DEFAULT_REVEAL_INSET,
  MIN_CLEARANCE,
  ROOM_FACE_AXES,
  type RoomExclusionZone,
  type RoomFace,
  type RoomOpeningDefinition,
  type RoomPlacementBand,
  type RoomShellDimensions,
  type RoomShellGeometryResult,
  type RoomStructuralLayout,
  type RoomStructuralSettings,
  type RoomValidationIssue,
} from "../types";

const FACE_ORDER: RoomFace[] = [
  "front",
  "back",
  "left",
  "right",
  "top",
  "bottom",
];

const EPSILON = 1e-4;

const isValidPositive = (value: number) => Number.isFinite(value) && value > 0;

const vec3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const box2FromSize = (width: number, height: number) =>
  new THREE.Box2(
    new THREE.Vector2(-width / 2, -height / 2),
    new THREE.Vector2(width / 2, height / 2),
  );

const buildFaceCenter = (dimensions: RoomShellDimensions, face: RoomFace) => {
  const hw = dimensions.width / 2;
  const hh = dimensions.height / 2;
  const hd = dimensions.depth / 2;

  switch (face) {
    case "front":
      return vec3(0, 0, hd);
    case "back":
      return vec3(0, 0, -hd);
    case "left":
      return vec3(-hw, 0, 0);
    case "right":
      return vec3(hw, 0, 0);
    case "top":
      return vec3(0, hh, 0);
    case "bottom":
      return vec3(0, -hh, 0);
  }
};

const getFacePlaneSize = (
  dimensions: RoomShellDimensions,
  face: RoomFace,
): [number, number] => {
  switch (face) {
    case "front":
    case "back":
      return [dimensions.width, dimensions.height];
    case "left":
    case "right":
      return [dimensions.depth, dimensions.height];
    case "top":
    case "bottom":
      return [dimensions.width, dimensions.depth];
  }
};

const getFaceAxes = (face: RoomFace) => ROOM_FACE_AXES[face];

const faceCenter = (dimensions: RoomShellDimensions, face: RoomFace) => {
  const hw = dimensions.width / 2;
  const hh = dimensions.height / 2;
  const hd = dimensions.depth / 2;

  switch (face) {
    case "front":
      return vec3(0, 0, hd);
    case "back":
      return vec3(0, 0, -hd);
    case "left":
      return vec3(-hw, 0, 0);
    case "right":
      return vec3(hw, 0, 0);
    case "top":
      return vec3(0, hh, 0);
    case "bottom":
      return vec3(0, -hh, 0);
  }
};

export const validateRoomShellDimensions = (
  dimensions: RoomShellDimensions,
): RoomValidationIssue[] => {
  const issues: RoomValidationIssue[] = [];
  const {
    width,
    height,
    depth,
    wallThickness,
    floorThickness,
    ceilingThickness,
  } = dimensions;

  if (
    !isValidPositive(width) ||
    !isValidPositive(height) ||
    !isValidPositive(depth) ||
    !isValidPositive(wallThickness) ||
    !isValidPositive(floorThickness) ||
    !isValidPositive(ceilingThickness)
  ) {
    issues.push({
      code: "invalid-dimensions",
      message: "Room shell dimensions must be finite positive values.",
    });
    return issues;
  }

  if (wallThickness * 2 >= width || wallThickness * 2 >= depth) {
    issues.push({
      code: "invalid-dimensions",
      message: "Wall thickness is too large for the room footprint.",
    });
  }

  if (floorThickness + ceilingThickness >= height) {
    issues.push({
      code: "invalid-dimensions",
      message:
        "Floor and ceiling thickness cannot consume the full room height.",
    });
  }

  return issues;
};

export const getRoomFaceFrame = (
  dimensions: RoomShellDimensions,
  face: RoomFace,
  revealInset = DEFAULT_REVEAL_INSET,
) => {
  const [planeWidth, planeHeight] = getFacePlaneSize(dimensions, face);
  const outerBounds = box2FromSize(planeWidth, planeHeight);
  const innerBounds = box2FromSize(
    Math.max(0, planeWidth - revealInset * 2),
    Math.max(0, planeHeight - revealInset * 2),
  );
  const revealBounds = box2FromSize(
    Math.max(0, planeWidth - revealInset * 4),
    Math.max(0, planeHeight - revealInset * 4),
  );

  return {
    face,
    planeSize: [planeWidth, planeHeight] as [number, number],
    outerBounds,
    innerBounds,
    revealBounds,
  };
};

const openingToBounds = (
  opening: RoomOpeningDefinition,
  dimensions: RoomShellDimensions,
): { min: THREE.Vector3; max: THREE.Vector3 } | null => {
  const [faceWidth, faceHeight] = getFacePlaneSize(dimensions, opening.face);
  const [openWidth, openHeight] = opening.size;
  const [offsetU, offsetV] = opening.center;

  if (openWidth <= 0 || openHeight <= 0) return null;
  if (
    Math.abs(offsetU) + openWidth / 2 > faceWidth / 2 + EPSILON ||
    Math.abs(offsetV) + openHeight / 2 > faceHeight / 2 + EPSILON
  ) {
    return null;
  }

  const center = buildFaceCenter(dimensions, opening.face);
  const depth = Math.max(
    opening.revealDepth ?? DEFAULT_REVEAL_DEPTH,
    MIN_CLEARANCE,
  );
  const inset = Math.max(opening.revealInset ?? DEFAULT_REVEAL_INSET, 0);
  const cutDepth = depth + inset;

  const min = center.clone();
  const max = center.clone();

  if (opening.face === "front" || opening.face === "back") {
    min.x = offsetU - openWidth / 2;
    max.x = offsetU + openWidth / 2;
    min.y = offsetV - openHeight / 2;
    max.y = offsetV + openHeight / 2;
    min.z = center.z - cutDepth;
    max.z = center.z + cutDepth;
  } else if (opening.face === "left" || opening.face === "right") {
    min.z = offsetU - openWidth / 2;
    max.z = offsetU + openWidth / 2;
    min.y = offsetV - openHeight / 2;
    max.y = offsetV + openHeight / 2;
    min.x = center.x - cutDepth;
    max.x = center.x + cutDepth;
  } else {
    min.x = offsetU - openWidth / 2;
    max.x = offsetU + openWidth / 2;
    min.z = offsetV - openHeight / 2;
    max.z = offsetV + openHeight / 2;
    min.y = center.y - cutDepth;
    max.y = center.y + cutDepth;
  }

  const normal = getFaceAxes(opening.face).normal;
  min.add(
    new THREE.Vector3(
      -normal[0] * EPSILON,
      -normal[1] * EPSILON,
      -normal[2] * EPSILON,
    ),
  );
  max.add(
    new THREE.Vector3(
      normal[0] * EPSILON,
      normal[1] * EPSILON,
      normal[2] * EPSILON,
    ),
  );

  return { min, max };
};

export const validateOpenings = (
  dimensions: RoomShellDimensions,
  openings: RoomOpeningDefinition[] = [],
): RoomValidationIssue[] => {
  const issues: RoomValidationIssue[] = [];
  const openingsByFace = new Map<RoomFace, RoomOpeningDefinition[]>();

  for (const opening of openings) {
    const bounds = openingToBounds(opening, dimensions);
    if (!bounds) {
      issues.push({
        code: "invalid-opening",
        message: `Opening ${opening.id} has invalid size or offset.`,
        openingId: opening.id,
      });
      continue;
    }

    const [planeWidth, planeHeight] = getFacePlaneSize(
      dimensions,
      opening.face,
    );
    const [openWidth, openHeight] = opening.size;
    const [offsetU, offsetV] = opening.center;

    if (
      Math.abs(offsetU) + openWidth / 2 > planeWidth / 2 + EPSILON ||
      Math.abs(offsetV) + openHeight / 2 > planeHeight / 2 + EPSILON
    ) {
      issues.push({
        code: "opening-out-of-bounds",
        message: `Opening ${opening.id} exceeds the bounds of the ${opening.face} face.`,
        openingId: opening.id,
      });
      continue;
    }

    const faceOpenings = openingsByFace.get(opening.face) ?? [];
    faceOpenings.push(opening);
    openingsByFace.set(opening.face, faceOpenings);
  }

  for (const [face, faceOpenings] of openingsByFace) {
    for (let i = 0; i < faceOpenings.length; i++) {
      for (let j = i + 1; j < faceOpenings.length; j++) {
        const a = faceOpenings[i];
        const b = faceOpenings[j];
        const [ax, ay] = a.center;
        const [bx, by] = b.center;

        const overlapsX =
          Math.abs(ax - bx) < (a.size[0] + b.size[0]) / 2 - MIN_CLEARANCE;
        const overlapsY =
          Math.abs(ay - by) < (a.size[1] + b.size[1]) / 2 - MIN_CLEARANCE;

        if (overlapsX && overlapsY) {
          issues.push({
            code: "opening-overlap",
            message: `Openings ${a.id} and ${b.id} overlap on the ${face} face.`,
            openingId: a.id,
          });
        }
      }
    }
  }

  return issues;
};

export const buildRoomOpeningMasks = (
  dimensions: RoomShellDimensions,
  openings: RoomOpeningDefinition[] = [],
) =>
  openings
    .map((opening) => openingToBounds(opening, dimensions))
    .filter(
      (mask): mask is { min: THREE.Vector3; max: THREE.Vector3 } =>
        mask !== null,
    )
    .map((mask) => new THREE.Box3(mask.min, mask.max));

const buildBoxGeometry = (width: number, height: number, depth: number) => {
  const safeWidth = Math.max(EPSILON, Math.abs(width));
  const safeHeight = Math.max(EPSILON, Math.abs(height));
  const safeDepth = Math.max(EPSILON, Math.abs(depth));
  const geometry = new THREE.BoxGeometry(safeWidth, safeHeight, safeDepth);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
};

const buildThickShellFaces = (dimensions: RoomShellDimensions) => {
  const {
    width,
    height,
    depth,
    wallThickness,
    floorThickness,
    ceilingThickness,
  } = dimensions;

  const innerWidth = Math.max(EPSILON, width - wallThickness * 2);
  const innerDepth = Math.max(EPSILON, depth - wallThickness * 2);
  const innerHeight = Math.max(
    EPSILON,
    height - floorThickness - ceilingThickness,
  );

  const outerHalfW = width / 2;
  const outerHalfH = height / 2;
  const outerHalfD = depth / 2;

  const floorCenterY = -outerHalfH + floorThickness / 2;
  const ceilingCenterY = outerHalfH - ceilingThickness / 2;
  const wallCenterX = width / 2 - wallThickness / 2;
  const wallCenterZ = depth / 2 - wallThickness / 2;
  const innerCenterY = floorCenterY + floorThickness + innerHeight / 2;
  const revealInset = Math.max(MIN_CLEARANCE, DEFAULT_REVEAL_INSET);

  const outerShell = [
    new THREE.Mesh(
      buildBoxGeometry(width, wallThickness, depth),
      new THREE.MeshBasicMaterial(),
    ),
  ];

  const wallPanels = [
    {
      geometry: buildBoxGeometry(width, floorThickness, depth),
      position: vec3(0, floorCenterY, 0),
    },
    {
      geometry: buildBoxGeometry(width, ceilingThickness, depth),
      position: vec3(0, ceilingCenterY, 0),
    },
    {
      geometry: buildBoxGeometry(
        wallThickness,
        height - floorThickness - ceilingThickness,
        depth,
      ),
      position: vec3(-wallCenterX, innerCenterY, 0),
    },
    {
      geometry: buildBoxGeometry(
        wallThickness,
        height - floorThickness - ceilingThickness,
        depth,
      ),
      position: vec3(wallCenterX, innerCenterY, 0),
    },
    {
      geometry: buildBoxGeometry(
        innerWidth,
        height - floorThickness - ceilingThickness,
        wallThickness,
      ),
      position: vec3(0, innerCenterY, outerHalfD - wallThickness / 2),
    },
    {
      geometry: buildBoxGeometry(
        innerWidth,
        height - floorThickness - ceilingThickness,
        wallThickness,
      ),
      position: vec3(0, innerCenterY, -outerHalfD + wallThickness / 2),
    },
  ];

  const shellGeometries = wallPanels.map(({ geometry, position }) => {
    geometry.translate(position.x, position.y, position.z);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  });

  return {
    outerShell,
    shellGeometries,
    revealInset,
  };
};

const buildShellGeometry = (dimensions: RoomShellDimensions) => {
  const { shellGeometries } = buildThickShellFaces(dimensions);
  return shellGeometries.filter((geometry) => {
    const position = geometry.getAttribute("position");
    return position !== undefined && position.count > 0;
  });
};

const buildInnerGeometry = (dimensions: RoomShellDimensions) => {
  const innerWidth = Math.max(
    EPSILON,
    dimensions.width - dimensions.wallThickness * 2,
  );
  const innerHeight = Math.max(
    EPSILON,
    dimensions.height - dimensions.floorThickness - dimensions.ceilingThickness,
  );
  const innerDepth = Math.max(
    EPSILON,
    dimensions.depth - dimensions.wallThickness * 2,
  );
  const geometry = new THREE.BoxGeometry(innerWidth, innerHeight, innerDepth);
  geometry.translate(
    0,
    dimensions.floorThickness + innerHeight / 2 - dimensions.height / 2,
    0,
  );
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
};

const buildRevealGeometry = (
  dimensions: RoomShellDimensions,
  openings: RoomOpeningDefinition[] = [],
) => {
  const revealGeometries: THREE.BufferGeometry[] = [];

  for (const opening of openings) {
    const depth = Math.max(
      opening.revealDepth ?? DEFAULT_REVEAL_DEPTH,
      MIN_CLEARANCE,
    );
    const inset = Math.max(opening.revealInset ?? DEFAULT_REVEAL_INSET, 0);
    const [w, h] = opening.size;
    const revealWidth = Math.max(EPSILON, w + inset * 2);
    const revealHeight = Math.max(EPSILON, h + inset * 2);
    const revealDepth = Math.max(EPSILON, depth);

    const geo = new THREE.BoxGeometry(revealWidth, revealHeight, revealDepth);
    const [u, v] = opening.center;
    const face = opening.face;
    const faceNormal = ROOM_FACE_AXES[face].normal;
    const center = buildFaceCenter(dimensions, face);

    if (face === "front" || face === "back") {
      geo.translate(u, v, center.z - (faceNormal[2] * revealDepth) / 2);
      if (face === "back") geo.rotateY(Math.PI);
    } else if (face === "left" || face === "right") {
      geo.rotateY(Math.PI / 2);
      geo.translate(center.x - (faceNormal[0] * revealDepth) / 2, v, u);
      if (face === "left") geo.rotateY(Math.PI);
    } else {
      geo.rotateX(Math.PI / 2);
      geo.translate(u, center.y - (faceNormal[1] * revealDepth) / 2, v);
      if (face === "bottom") geo.rotateZ(Math.PI);
    }

    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    revealGeometries.push(geo);
  }

  return revealGeometries;
};

const mergeGeometryList = (geometries: THREE.BufferGeometry[]) => {
  const result = new THREE.BufferGeometry();
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  for (const geometry of geometries) {
    const position = geometry.getAttribute("position");
    if (!position || position.count === 0) continue;

    const normal = geometry.getAttribute("normal");
    const uv = geometry.getAttribute("uv");

    for (let i = 0; i < position.count; i++) {
      positions.push(position.getX(i), position.getY(i), position.getZ(i));
      if (normal) normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
      if (uv) uvs.push(uv.getX(i), uv.getY(i));
    }
  }

  if (positions.length === 0) {
    const fallback = new THREE.BoxGeometry(EPSILON, EPSILON, EPSILON);
    fallback.computeBoundingBox();
    fallback.computeBoundingSphere();
    return fallback;
  }

  result.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  if (normals.length > 0) {
    result.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  }
  if (uvs.length > 0) {
    result.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  }

  result.computeBoundingBox();
  result.computeBoundingSphere();
  return result;
};

export const buildRoomStructuralLayout = (
  settings: RoomStructuralSettings,
): RoomStructuralLayout => {
  const validationIssues = deriveRoomValidationIssues(settings);
  const completionIssues = deriveRoomCompletionIssues(settings);
  const shell = buildRoomShellGeometry(
    settings.dimensions,
    settings.openings ?? [],
  );
  const placementBands: RoomPlacementBand[] = settings.placementBands ?? [];

  return {
    shell,
    anchors: settings.anchors ?? [],
    exclusionZones: settings.exclusionZones ?? [],
    placementBands,
    validationIssues: [...validationIssues, ...completionIssues],
    completionIssues,
  };
};

export const buildPlacementZones = (
  dimensions: RoomShellDimensions,
  openings: RoomOpeningDefinition[] = [],
  exclusionZones: RoomExclusionZone[] = [],
) => {
  const zones: RoomExclusionZone[] = [];
  const wallInset = dimensions.wallThickness + MIN_CLEARANCE;
  const floorCeilingInset =
    dimensions.floorThickness + dimensions.ceilingThickness + MIN_CLEARANCE;

  for (const face of FACE_ORDER) {
    const [planeWidth, planeHeight] = getFacePlaneSize(dimensions, face);
    const halfW = planeWidth / 2;
    const halfH = planeHeight / 2;

    const faceZones = openings
      .filter((opening) => opening.face === face)
      .map((opening) => {
        const [u, v] = opening.center;
        const [ow, oh] = opening.size;
        const margin = Math.max(
          opening.revealInset ?? DEFAULT_REVEAL_INSET,
          MIN_CLEARANCE,
        );
        const size: [number, number, number] =
          face === "top" || face === "bottom"
            ? [ow + margin * 2, dimensions.wallThickness, oh + margin * 2]
            : [ow + margin * 2, oh + margin * 2, dimensions.wallThickness];
        const center: [number, number, number] =
          face === "front"
            ? [u, v, dimensions.depth / 2 - wallInset]
            : face === "back"
              ? [u, v, -dimensions.depth / 2 + wallInset]
              : face === "left"
                ? [-dimensions.width / 2 + wallInset, v, u]
                : face === "right"
                  ? [dimensions.width / 2 - wallInset, v, u]
                  : face === "top"
                    ? [u, dimensions.height / 2 - floorCeilingInset, v]
                    : [u, -dimensions.height / 2 + floorCeilingInset, v];
        return {
          id: `${opening.id}-zone`,
          face,
          center,
          size,
        };
      });

    zones.push(...faceZones);
  }

  zones.push(...exclusionZones);
  return zones;
};

export const buildRoomShellGeometry = (
  dimensions: RoomShellDimensions,
  openings: RoomOpeningDefinition[] = [],
): RoomShellGeometryResult => {
  const outerGeometry = buildBoxGeometry(
    dimensions.width,
    dimensions.height,
    dimensions.depth,
  );
  const innerGeometry = buildInnerGeometry(dimensions);
  const revealGeometry = buildRevealGeometry(dimensions, openings);
  const shellGeometry = mergeGeometryList([
    outerGeometry,
    innerGeometry,
    ...revealGeometry,
  ]);

  if (!shellGeometry.getAttribute("position")) {
    const fallback = buildBoxGeometry(
      Math.max(EPSILON, dimensions.width),
      Math.max(EPSILON, dimensions.height),
      Math.max(EPSILON, dimensions.depth),
    );
    fallback.translate(0, 0, 0);
    fallback.computeBoundingBox();
    fallback.computeBoundingSphere();
    return {
      outerGeometry,
      innerGeometry,
      shellGeometry: fallback,
      revealGeometry,
      openingMasks: buildRoomOpeningMasks(dimensions, openings),
    };
  }

  const openingMasks = buildRoomOpeningMasks(dimensions, openings);

  return {
    outerGeometry,
    innerGeometry,
    shellGeometry,
    revealGeometry,
    openingMasks,
  };
};

export const deriveRoomPlacementZones = buildPlacementZones;

export const deriveRoomAnchors = (
  dimensions: RoomShellDimensions,
  openings: RoomOpeningDefinition[] = [],
) => {
  const anchors = openings.map((opening) => {
    const center = faceCenter(dimensions, opening.face);
    const [u, v] = opening.center;
    switch (opening.face) {
      case "front":
        return {
          id: `${opening.id}-anchor`,
          face: opening.face,
          position: [u, v, center.z] as [number, number, number],
        };
      case "back":
        return {
          id: `${opening.id}-anchor`,
          face: opening.face,
          position: [u, v, center.z] as [number, number, number],
        };
      case "left":
      case "right":
        return {
          id: `${opening.id}-anchor`,
          face: opening.face,
          position: [center.x, v, u] as [number, number, number],
        };
      case "top":
      case "bottom":
        return {
          id: `${opening.id}-anchor`,
          face: opening.face,
          position: [u, center.y, v] as [number, number, number],
        };
    }
  });

  return anchors;
};

export const deriveRoomValidationIssues = (
  settings: RoomStructuralSettings,
): RoomValidationIssue[] => {
  const issues = [
    ...validateRoomShellDimensions(settings.dimensions),
    ...validateOpenings(settings.dimensions, settings.openings ?? []),
  ];

  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.openingId ?? ""}:${issue.zoneId ?? ""}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const deriveRoomCompletionIssues = (
  settings: RoomStructuralSettings,
): RoomValidationIssue[] => {
  return settings.openings?.some((opening) => opening.face === "top") ? [] : [];
};

export const deriveRoomValidationOverlay = (
  settings: RoomStructuralSettings,
) => {
  const validationIssues = deriveRoomValidationIssues(settings);

  return {
    issues: validationIssues,
    issueCount: validationIssues.length,
    hasBlockingIssues: validationIssues.some(
      (issue) => issue.code === "invalid-dimensions",
    ),
  };
};
