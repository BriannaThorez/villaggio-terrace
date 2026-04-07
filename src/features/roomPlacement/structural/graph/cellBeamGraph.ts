import {
  GRID_SIZE_X,
  GRID_SIZE_Y,
  snapX,
  snapY,
  type SimulationNode,
  type SimulationNodeType,
} from "../../../../shared/utils/store";
import { STRUCTURAL_METADATA_CONTRACT_VERSION } from "./contract";
import type {
  BeamPlane,
  BeamRole,
  CellBoundaryDirection,
  StructuralAdjacencyGap,
  StructuralBeam,
  StructuralCanonicalFace,
  StructuralCell,
  StructuralCellBeamGraph,
  StructuralCorner,
  StructuralFaceBounds,
  StructuralFaceCutout,
  StructuralFace,
  StructuralMetadataExport,
  StructuralOpeningMetadata,
  StructuralRoomAdjacency,
  StructuralRoomMetadata,
  StructuralShape,
} from "./contract";
import type {
  RoomFace,
  RoomOpeningDefinition,
  RoomStructuralSettings,
} from "../types";

const ROOM_NODE_TYPES = new Set<SimulationNodeType>([
  "residential",
  "commercial",
  "office",
  "utility",
  "lobby",
  "elevator",
  "empty_floor",
]);

const ROOM_DEPTH = 40;
const FLOOR_CLEARANCE = 1e-3;

const FACE_ORDER: StructuralFace[] = [
  "front",
  "right",
  "back",
  "left",
  "ceiling",
  "floor",
];

const DIRECTION_TO_FACE: Record<CellBoundaryDirection, StructuralFace> = {
  north: "back",
  south: "front",
  east: "right",
  west: "left",
};

type EdgeDefinition = {
  direction: CellBoundaryDirection;
  cornerIds: [string, string];
};

type AdjacencyAccumulator = {
  roomIds: [string, string];
  directions: Set<CellBoundaryDirection>;
  cellPairs: StructuralRoomAdjacency["cellPairs"];
  sharedBeamIds: Set<string>;
  sharedWallBeamIds: Set<string>;
};

type RoomShapeWithStructure = SimulationNode & {
  openings?: RoomOpeningDefinition[];
  structuralSettings?: Partial<RoomStructuralSettings>;
};

const toHalfGrid = (value: number, gridSize: number) =>
  Math.round((value * 2) / gridSize);

const fromHalfGrid = (value: number, gridSize: number) =>
  (value * gridSize) / 2;

const cellKey = (x2: number, y2: number) => `${x2},${y2}`;

const cornerKey = (x2: number, y2: number) => `${x2},${y2}`;

const cornerId = (x2: number, y2: number) => `corner:${cornerKey(x2, y2)}`;

const sortedUnique = (values: Iterable<string>) => [...new Set(values)].sort();

const uniqueById = <T extends { id: string }>(values: Iterable<T>) => {
  const byId = new Map<string, T>();
  for (const value of values) {
    if (!byId.has(value.id)) {
      byId.set(value.id, value);
    }
  }
  return [...byId.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
};

const dedupeSortedIds = (ids: Iterable<string>) => sortedUnique(ids);

const beamIdFromCorners = (
  plane: BeamPlane,
  firstCornerId: string,
  secondCornerId: string,
) => {
  const [startCornerId, endCornerId] = [firstCornerId, secondCornerId].sort();
  return `beam:${plane}:${startCornerId}:${endCornerId}`;
};

const roomAdjacencyId = (firstRoomId: string, secondRoomId: string) => {
  const [roomA, roomB] = [firstRoomId, secondRoomId].sort();
  return `adjacency:${roomA}:${roomB}`;
};

const openingFramingBeamId = (
  roomId: string,
  openingId: string,
  role: Extract<BeamRole, "header" | "sill" | "jamb">,
  index: number,
) => `beam:opening:${roomId}:${openingId}:${role}:${index}`;

const cutoutId = (roomId: string, openingId: string) =>
  `cutout:${roomId}:${openingId}`;

const adjacencyGapId = (roomId: string, openingId: string) =>
  `gap:${roomId}:${openingId}`;

const isRoomNode = (shape: SimulationNode) => ROOM_NODE_TYPES.has(shape.type);

const buildCellFootprint = (shape: SimulationNode): StructuralCell[] => {
  const widthCells = Math.max(1, Math.round(shape.size[0] / GRID_SIZE_X));
  const heightCells = Math.max(1, Math.round(shape.size[1] / GRID_SIZE_Y));
  const snappedX = snapX(shape.position[0], shape.size[0]);
  const snappedY = snapY(shape.position[1]);
  const minX2 = toHalfGrid(snappedX - shape.size[0] / 2, GRID_SIZE_X);
  const minY2 = toHalfGrid(snappedY - shape.size[1] / 2, GRID_SIZE_Y);
  const cells: StructuralCell[] = [];

  for (let row = 0; row < heightCells; row += 1) {
    for (let column = 0; column < widthCells; column += 1) {
      const x2 = minX2 + column * 2;
      const y2 = minY2 + row * 2;
      const northWest = cornerId(x2, y2 + 2);
      const northEast = cornerId(x2 + 2, y2 + 2);
      const southEast = cornerId(x2 + 2, y2);
      const southWest = cornerId(x2, y2);

      cells.push({
        id: `${shape.id}:cell:${x2},${y2}`,
        roomId: shape.id,
        column,
        row,
        x2,
        y2,
        center: [
          fromHalfGrid(x2 + 1, GRID_SIZE_X),
          fromHalfGrid(y2 + 1, GRID_SIZE_Y),
        ],
        cornerIds: {
          northWest,
          northEast,
          southEast,
          southWest,
        },
        beamIds: [],
        neighboringRoomIds: [],
      });
    }
  }

  return cells;
};

const getCellEdges = (cell: StructuralCell): EdgeDefinition[] => [
  {
    direction: "north",
    cornerIds: [cell.cornerIds.northWest, cell.cornerIds.northEast],
  },
  {
    direction: "south",
    cornerIds: [cell.cornerIds.southWest, cell.cornerIds.southEast],
  },
  {
    direction: "east",
    cornerIds: [cell.cornerIds.northEast, cell.cornerIds.southEast],
  },
  {
    direction: "west",
    cornerIds: [cell.cornerIds.northWest, cell.cornerIds.southWest],
  },
];

const getNeighborCellKey = (
  cell: StructuralCell,
  direction: CellBoundaryDirection,
) => {
  switch (direction) {
    case "north":
      return cellKey(cell.x2, cell.y2 + 2);
    case "south":
      return cellKey(cell.x2, cell.y2 - 2);
    case "east":
      return cellKey(cell.x2 + 2, cell.y2);
    case "west":
      return cellKey(cell.x2 - 2, cell.y2);
  }
};

const compareCells = (left: StructuralCell, right: StructuralCell) => {
  if (left.roomId !== right.roomId) {
    return left.roomId.localeCompare(right.roomId);
  }
  if (left.row !== right.row) {
    return left.row - right.row;
  }
  return left.column - right.column;
};

const createCorner = (x2: number, y2: number): StructuralCorner => ({
  id: cornerId(x2, y2),
  x2,
  y2,
  position: [fromHalfGrid(x2, GRID_SIZE_X), fromHalfGrid(y2, GRID_SIZE_Y)],
});

const toBeamPoint3 = (
  x: number,
  y: number,
  z: number,
): [number, number, number] => [x, y, z];

const getRoomOpenings = (
  shape: RoomShapeWithStructure,
): RoomOpeningDefinition[] =>
  [...(shape.structuralSettings?.openings ?? shape.openings ?? [])].sort(
    (a, b) => a.id.localeCompare(b.id),
  );

const isWallFace = (
  face: StructuralFace,
): face is Extract<StructuralFace, "front" | "back" | "left" | "right"> =>
  face === "front" || face === "back" || face === "left" || face === "right";

const roomFaceToStructuralFace = (face: RoomFace): StructuralFace =>
  face === "top" ? "ceiling" : face === "bottom" ? "floor" : face;

const buildOpeningBounds = (
  opening: RoomOpeningDefinition,
  dimensions: StructuralRoomMetadata["dimensions"],
): StructuralFaceBounds | null => {
  const [openWidth, openHeight] = opening.size;
  const [offsetU, offsetV] = opening.center;
  if (!(openWidth > 0) || !(openHeight > 0)) {
    return null;
  }

  const planeWidth =
    opening.face === "left" || opening.face === "right"
      ? dimensions.depth
      : dimensions.width;
  const planeHeight =
    opening.face === "top" || opening.face === "bottom"
      ? dimensions.depth
      : dimensions.height;
  const minU = offsetU - openWidth / 2;
  const maxU = offsetU + openWidth / 2;
  const minV = offsetV - openHeight / 2;
  const maxV = offsetV + openHeight / 2;

  if (
    minU < -planeWidth / 2 ||
    maxU > planeWidth / 2 ||
    minV < -planeHeight / 2 ||
    maxV > planeHeight / 2
  ) {
    return null;
  }

  return {
    min: [minU, minV],
    max: [maxU, maxV],
  };
};

const buildOpeningBeam = (
  roomId: string,
  face: Extract<StructuralFace, "front" | "back" | "left" | "right">,
  openingId: string,
  role: Extract<BeamRole, "header" | "sill" | "jamb">,
  index: number,
  start: [number, number, number],
  end: [number, number, number],
): StructuralBeam => ({
  id: openingFramingBeamId(roomId, openingId, role, index),
  plane: "wall",
  role,
  axis: start[0] !== end[0] ? "x" : start[1] !== end[1] ? "y" : "z",
  cornerIds: [
    `corner:opening:${roomId}:${openingId}:${role}:${index}:0`,
    `corner:opening:${roomId}:${openingId}:${role}:${index}:1`,
  ],
  start,
  end,
  roomIds: [roomId],
  cellIds: [],
  face,
  openingId,
  source: "opening-framing",
});

const buildFramingBeamsForOpening = (
  roomId: string,
  opening: RoomOpeningDefinition,
  dimensions: StructuralRoomMetadata["dimensions"],
): {
  beams: StructuralBeam[];
  cutout: StructuralFaceCutout | null;
  adjacencyGap: StructuralAdjacencyGap | null;
  metadata: StructuralOpeningMetadata | null;
} => {
  const face = roomFaceToStructuralFace(opening.face);
  if (!isWallFace(face)) {
    return {
      beams: [],
      cutout: null,
      adjacencyGap: null,
      metadata: null,
    };
  }

  const bounds = buildOpeningBounds(opening, dimensions);
  if (!bounds) {
    return {
      beams: [],
      cutout: null,
      adjacencyGap: null,
      metadata: null,
    };
  }

  const [minU, minV] = bounds.min;
  const [maxU, maxV] = bounds.max;
  const planePosition =
    face === "front"
      ? 0
      : face === "back"
        ? -dimensions.depth
        : face === "right"
          ? dimensions.width / 2
          : -dimensions.width / 2;

  const pointsForFace =
    face === "front" || face === "back"
      ? {
        map: (u: number, v: number): [number, number, number] =>
          toBeamPoint3(u, v, planePosition),
      }
      : {
        map: (u: number, v: number): [number, number, number] =>
          toBeamPoint3(planePosition, v, u),
      };

  const beams: StructuralBeam[] = [
    buildOpeningBeam(
      roomId,
      face,
      opening.id,
      "jamb",
      0,
      pointsForFace.map(minU, minV),
      pointsForFace.map(minU, maxV),
    ),
    buildOpeningBeam(
      roomId,
      face,
      opening.id,
      "jamb",
      1,
      pointsForFace.map(maxU, minV),
      pointsForFace.map(maxU, maxV),
    ),
    buildOpeningBeam(
      roomId,
      face,
      opening.id,
      "header",
      0,
      pointsForFace.map(minU, maxV),
      pointsForFace.map(maxU, maxV),
    ),
  ];

  const touchesFloor = minV <= -dimensions.height / 2 + FLOOR_CLEARANCE;
  if (!touchesFloor) {
    beams.push(
      buildOpeningBeam(
        roomId,
        face,
        opening.id,
        "sill",
        0,
        pointsForFace.map(minU, minV),
        pointsForFace.map(maxU, minV),
      ),
    );
  }

  const framingBeamIds = beams.map((beam) => beam.id).sort();
  const builtCutout: StructuralFaceCutout = {
    id: cutoutId(roomId, opening.id),
    roomId,
    openingId: opening.id,
    face,
    openingKind: opening.kind,
    bounds,
    beamIds: framingBeamIds,
    adjacencyGapId: adjacencyGapId(roomId, opening.id),
  };
  const builtAdjacencyGap: StructuralAdjacencyGap = {
    id: adjacencyGapId(roomId, opening.id),
    roomId,
    face,
    kind: "opening-gap",
    source: "opening",
    openingId: opening.id,
    cutoutId: builtCutout.id,
    beamIds: framingBeamIds,
    bounds,
    adjacentRoomIds: [],
  };

  return {
    beams,
    cutout: builtCutout,
    adjacencyGap: builtAdjacencyGap,
    metadata: {
      openingId: opening.id,
      definition: { ...opening },
      face,
      framingBeamIds,
      cutoutId: builtCutout.id,
      adjacencyGapId: builtAdjacencyGap.id,
    },
  };
};

const compareBeams = (left: StructuralBeam, right: StructuralBeam) =>
  left.id.localeCompare(right.id);

const canonicalFacePriority: StructuralFace[] = [
  "front",
  "right",
  "back",
  "left",
  "ceiling",
  "floor",
];

const sortStructuralIds = (ids: Iterable<string>) => [...new Set(ids)].sort();

const getFaceOwningRoomIds = (
  roomId: string,
  face: StructuralFace,
  roomCells: StructuralCell[],
  cellLookup: Map<string, StructuralCell>,
) => {
  const direction = Object.entries(DIRECTION_TO_FACE).find(
    ([, mappedFace]) => mappedFace === face,
  )?.[0] as CellBoundaryDirection | undefined;

  if (!direction) {
    return [] as string[];
  }

  const owningRoomIds = new Set<string>();

  for (const cell of roomCells) {
    const edge = getCellEdges(cell).find(
      (candidate) => candidate.direction === direction,
    );
    if (!edge) {
      continue;
    }

    const neighbor = cellLookup.get(getNeighborCellKey(cell, direction));
    if (!neighbor || neighbor.roomId === roomId) {
      continue;
    }

    owningRoomIds.add(
      [roomId, neighbor.roomId].sort()[0] === roomId ? roomId : neighbor.roomId,
    );
  }

  return [...owningRoomIds].sort();
};

export const buildCellBeamGraph = (
  shapes: SimulationNode[],
): StructuralCellBeamGraph => {
  const roomShapes = [...shapes]
    .filter(isRoomNode)
    .sort((a, b) => a.id.localeCompare(b.id));
  const cells = roomShapes.flatMap(buildCellFootprint).sort(compareCells);
  const cellLookup = new Map(
    cells.map((cell) => [cellKey(cell.x2, cell.y2), cell]),
  );
  const cornerLookup = new Map<string, StructuralCorner>();
  const beamLookup = new Map<string, StructuralBeam>();
  const adjacencyLookup = new Map<string, AdjacencyAccumulator>();

  const ensureCorner = (id: string) => {
    if (cornerLookup.has(id)) {
      return cornerLookup.get(id)!;
    }

    const [, rawPoint] = id.split(":");
    const [x2Text, y2Text] = rawPoint.split(",");
    const corner = createCorner(Number(x2Text), Number(y2Text));
    cornerLookup.set(id, corner);
    return corner;
  };

  const registerBeam = (
    plane: BeamPlane,
    role: BeamRole,
    cell: StructuralCell,
    corners: [string, string],
    extraRoomIds: string[] = [],
  ) => {
    const id = beamIdFromCorners(plane, corners[0], corners[1]);
    const firstCorner = ensureCorner(corners[0]);
    const secondCorner = ensureCorner(corners[1]);
    const beam =
      beamLookup.get(id) ??
      (() => {
        const created: StructuralBeam = {
          id,
          plane,
          role,
          axis:
            firstCorner.position[0] === secondCorner.position[0] ? "y" : "x",
          cornerIds:
            corners[0] <= corners[1]
              ? [corners[0], corners[1]]
              : [corners[1], corners[0]],
          start: [...firstCorner.position, 0],
          end: [...secondCorner.position, 0],
          roomIds: [],
          cellIds: [],
          source: "grid",
        };
        beamLookup.set(id, created);
        return created;
      })();

    beam.role =
      beam.role === "exterior-wall" && role === "interior-partition"
        ? role
        : beam.role;
    beam.roomIds = sortedUnique([
      ...beam.roomIds,
      cell.roomId,
      ...extraRoomIds,
    ]);
    beam.cellIds = sortedUnique([...beam.cellIds, cell.id]);
    cell.beamIds = sortedUnique([...cell.beamIds, id]);

    return id;
  };

  for (const cell of cells) {
    for (const edge of getCellEdges(cell)) {
      registerBeam("floor", "floor", cell, edge.cornerIds);
      registerBeam("ceiling", "ceiling", cell, edge.cornerIds);

      const neighbor = cellLookup.get(getNeighborCellKey(cell, edge.direction));
      if (neighbor?.roomId === cell.roomId) {
        continue;
      }

      const role: BeamRole = neighbor ? "interior-partition" : "exterior-wall";
      const wallBeamId = registerBeam(
        "wall",
        role,
        cell,
        edge.cornerIds,
        neighbor ? [neighbor.roomId] : [],
      );

      if (neighbor) {
        const adjacencyId = roomAdjacencyId(cell.roomId, neighbor.roomId);
        const roomIds = [cell.roomId, neighbor.roomId].sort() as [
          string,
          string,
        ];
        const adjacency =
          adjacencyLookup.get(adjacencyId) ??
          (() => {
            const created: AdjacencyAccumulator = {
              roomIds,
              directions: new Set<CellBoundaryDirection>(),
              cellPairs: [],
              sharedBeamIds: new Set<string>(),
              sharedWallBeamIds: new Set<string>(),
            };
            adjacencyLookup.set(adjacencyId, created);
            return created;
          })();

        adjacency.directions.add(edge.direction);
        adjacency.cellPairs.push({
          roomId: cell.roomId,
          cellId: cell.id,
          neighborRoomId: neighbor.roomId,
          neighborCellId: neighbor.id,
          direction: edge.direction,
        });
        adjacency.sharedWallBeamIds.add(wallBeamId);
        adjacency.sharedBeamIds.add(wallBeamId);
        adjacency.sharedBeamIds.add(
          registerBeam("floor", "floor", cell, edge.cornerIds, [
            neighbor.roomId,
          ]),
        );
        adjacency.sharedBeamIds.add(
          registerBeam("ceiling", "ceiling", cell, edge.cornerIds, [
            neighbor.roomId,
          ]),
        );
      }
    }
  }

  for (const adjacency of adjacencyLookup.values()) {
    adjacency.directions = new Set(
      [...adjacency.directions].sort(),
    ) as Set<CellBoundaryDirection>;
    adjacency.cellPairs = adjacency.cellPairs
      .filter(
        (pair, index, pairs) =>
          index ===
          pairs.findIndex(
            (candidate) =>
              candidate.roomId === pair.roomId &&
              candidate.cellId === pair.cellId &&
              candidate.neighborRoomId === pair.neighborRoomId &&
              candidate.neighborCellId === pair.neighborCellId &&
              candidate.direction === pair.direction,
          ),
      )
      .sort((left, right) =>
        `${left.roomId}:${left.cellId}:${left.direction}:${left.neighborRoomId}:${left.neighborCellId}`.localeCompare(
          `${right.roomId}:${right.cellId}:${right.direction}:${right.neighborRoomId}:${right.neighborCellId}`,
        ),
      );
    adjacency.sharedBeamIds = new Set(sortedUnique(adjacency.sharedBeamIds));
    adjacency.sharedWallBeamIds = new Set(
      sortedUnique(adjacency.sharedWallBeamIds),
    );
  }

  for (const cell of cells) {
    const neighboringRoomIds = new Set<string>();
    for (const direction of ["north", "south", "east", "west"] as const) {
      const neighbor = cellLookup.get(getNeighborCellKey(cell, direction));
      if (neighbor && neighbor.roomId !== cell.roomId) {
        neighboringRoomIds.add(neighbor.roomId);
      }
    }
    cell.neighboringRoomIds = sortedUnique(neighboringRoomIds);
  }

  const gridBeams = [...beamLookup.values()].sort(compareBeams);
  const gridBeamsById = new Map(gridBeams.map((beam) => [beam.id, beam]));
  const adjacencies = [...adjacencyLookup.entries()]
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
    .map(([id, adjacency]) => ({
      id,
      roomIds: adjacency.roomIds,
      directions: [...adjacency.directions].sort(),
      cellPairs: [...adjacency.cellPairs].sort((left, right) =>
        `${left.roomId}:${left.cellId}:${left.direction}:${left.neighborRoomId}:${left.neighborCellId}`.localeCompare(
          `${right.roomId}:${right.cellId}:${right.direction}:${right.neighborRoomId}:${right.neighborCellId}`,
        ),
      ),
      sharedBeamIds: [...adjacency.sharedBeamIds].sort(),
      sharedWallBeamIds: [...adjacency.sharedWallBeamIds].sort(),
    }));

  const rooms = roomShapes.map<StructuralRoomMetadata>((shape) => {
    const roomCells = cells.filter((cell) => cell.roomId === shape.id);
    const roomBeamIds = sortedUnique(roomCells.flatMap((cell) => cell.beamIds));
    const roomBeams = roomBeamIds
      .map((beamId) => gridBeamsById.get(beamId))
      .filter((beam): beam is StructuralBeam => beam !== undefined);
    const openingResults = getRoomOpenings(shape as RoomShapeWithStructure).map(
      (opening) =>
        buildFramingBeamsForOpening(shape.id, opening, {
          width: shape.size[0],
          height: shape.size[1],
          depth: ROOM_DEPTH,
        }),
    );
    const framingBeams = openingResults
      .flatMap((result) => result.beams)
      .sort(compareBeams);
    const cutouts = openingResults
      .flatMap((result) => (result.cutout ? [result.cutout] : []))
      .sort((left, right) => left.id.localeCompare(right.id));
    const adjacencyGaps = openingResults
      .flatMap((result) => (result.adjacencyGap ? [result.adjacencyGap] : []))
      .sort((left, right) => left.id.localeCompare(right.id));
    const openings = openingResults
      .flatMap((result) => (result.metadata ? [result.metadata] : []))
      .sort((left, right) => left.openingId.localeCompare(right.openingId));
    const allRoomBeams = [...roomBeams, ...framingBeams].sort(compareBeams);
    const allRoomBeamIds = allRoomBeams.map((beam) => beam.id);
    const cutoutIds = cutouts.map((cutout) => cutout.id);
    const adjacencyGapIds = adjacencyGaps.map((gap) => gap.id);

    const adjacency = Object.fromEntries(
      adjacencies
        .filter((entry) => entry.roomIds.includes(shape.id))
        .map((entry) => {
          const neighborRoomId =
            entry.roomIds[0] === shape.id ? entry.roomIds[1] : entry.roomIds[0];
          return [neighborRoomId, entry];
        }),
    ) as Record<string, StructuralRoomAdjacency>;

    const buildFace = (face: StructuralFace): StructuralCanonicalFace => {
      if (face === "floor" || face === "ceiling") {
        const plane = face === "floor" ? "floor" : "ceiling";
        const beamIds = dedupeSortedIds(
          allRoomBeams
            .filter((beam) => beam.plane === plane)
            .map((beam) => beam.id),
        );

        return {
          id: `${shape.id}:face:${face}`,
          roomId: shape.id,
          face,
          exposed: beamIds.length > 0,
          cellIds: roomCells.map((cell) => cell.id),
          beamIds,
          adjacentRoomIds: [],
          cutoutIds: [],
          adjacencyGapIds: [],
        };
      }

      const direction = Object.entries(DIRECTION_TO_FACE).find(
        ([, mappedFace]) => mappedFace === face,
      )?.[0] as CellBoundaryDirection;
      const cellIds = new Set<string>();
      const beamIds = new Set<string>();
      const adjacentRoomIds = new Set<string>();
      const cutoutIdsForFace = new Set<string>();
      const adjacencyGapIdsForFace = new Set<string>();

      for (const cell of roomCells) {
        const edge = getCellEdges(cell).find(
          (candidate) => candidate.direction === direction,
        );
        if (!edge) {
          continue;
        }

        const neighbor = cellLookup.get(getNeighborCellKey(cell, direction));
        if (neighbor?.roomId === cell.roomId) {
          continue;
        }

        cellIds.add(cell.id);
        beamIds.add(
          beamIdFromCorners("wall", edge.cornerIds[0], edge.cornerIds[1]),
        );
        if (neighbor) {
          adjacentRoomIds.add(neighbor.roomId);
        }
      }

      const canonicalOpeningBeamIds = new Set(
        framingBeams
          .filter((beam) => beam.face === face)
          .map((beam) => beam.id),
      );

      for (const cutout of cutouts) {
        if (cutout.face !== face) {
          continue;
        }
        cutoutIdsForFace.add(cutout.id);
      }
      for (const gap of adjacencyGaps) {
        if (gap.face !== face) {
          continue;
        }
        adjacencyGapIdsForFace.add(gap.id);
      }

      return {
        id: `${shape.id}:face:${face}`,
        roomId: shape.id,
        face,
        exposed: beamIds.size > 0 || canonicalOpeningBeamIds.size > 0,
        cellIds: [...cellIds].sort(),
        beamIds: dedupeSortedIds([...beamIds, ...canonicalOpeningBeamIds]),
        adjacentRoomIds: [...adjacentRoomIds].sort(),
        cutoutIds: [...cutoutIdsForFace].sort(),
        adjacencyGapIds: [...adjacencyGapIdsForFace].sort(),
      };
    };

    const canonicalFaces: Record<StructuralFace, StructuralCanonicalFace> = {
      front: buildFace("front"),
      back: buildFace("back"),
      left: buildFace("left"),
      right: buildFace("right"),
      ceiling: buildFace("ceiling"),
      floor: buildFace("floor"),
    };

    const canonicalFace =
      FACE_ORDER.find((face) => canonicalFaces[face].exposed) ?? "front";

    return {
      roomId: shape.id,
      dimensions: {
        width: shape.size[0],
        height: shape.size[1],
        depth: ROOM_DEPTH,
      },
      cells: roomCells,
      cellIds: roomCells.map((cell) => cell.id),
      beams: allRoomBeams,
      beamIds: allRoomBeamIds,
      cutouts,
      cutoutIds,
      adjacencyGaps,
      adjacencyGapIds,
      openings,
      canonicalFace,
      face: canonicalFace,
      canonicalFaces,
      adjacency,
      neighboringRoomIds: Object.keys(adjacency).sort(),
    };
  });

  const canonicalFaceByRoomId = new Map(
    rooms.map((room) => [room.roomId, room.canonicalFace]),
  );

  for (const room of rooms) {
    const canonicalFace = canonicalFaceByRoomId.get(room.roomId);
    if (!canonicalFace) {
      continue;
    }

    room.canonicalFaces[canonicalFace].exposed = true;
    room.face = canonicalFace;
  }

  const beams = [
    ...new Map(
      rooms.flatMap((room) => room.beams).map((beam) => [beam.id, beam]),
    ).values(),
  ].sort(compareBeams);
  const roomsById = new Map(rooms.map((room) => [room.roomId, room]));
  const beamsById = new Map(beams.map((beam) => [beam.id, beam]));

  return {
    cells,
    beams,
    adjacencies,
    rooms,
    roomsById,
    beamsById,
  };
};

export const buildStructuralMetadata = (shapes: SimulationNode[]) =>
  buildCellBeamGraph(shapes).roomsById;

export const exportStructuralMetadata = (
  graph: StructuralCellBeamGraph,
): StructuralMetadataExport => ({
  schemaVersion: STRUCTURAL_METADATA_CONTRACT_VERSION,
  roomIds: graph.rooms.map((room) => room.roomId),
  cells: graph.cells.map((cell) => ({
    ...cell,
    center: [...cell.center] as [number, number],
    cornerIds: { ...cell.cornerIds },
    beamIds: [...cell.beamIds],
    neighboringRoomIds: [...cell.neighboringRoomIds],
  })),
  beams: graph.beams.map((beam) => ({
    ...beam,
    cornerIds: [...beam.cornerIds] as [string, string],
    start: [...beam.start] as [number, number, number],
    end: [...beam.end] as [number, number, number],
    roomIds: [...beam.roomIds],
    cellIds: [...beam.cellIds],
  })),
  adjacencies: graph.adjacencies.map((adjacency) => ({
    ...adjacency,
    roomIds: [...adjacency.roomIds] as [string, string],
    directions: [...adjacency.directions],
    cellPairs: adjacency.cellPairs.map((pair) => ({ ...pair })),
    sharedBeamIds: [...adjacency.sharedBeamIds],
    sharedWallBeamIds: [...adjacency.sharedWallBeamIds],
  })),
  rooms: graph.rooms.map((room) => ({
    roomId: room.roomId,
    dimensions: { ...room.dimensions },
    cellIds: [...room.cellIds],
    beamIds: [...room.beamIds],
    cutoutIds: [...room.cutoutIds],
    adjacencyGapIds: [...room.adjacencyGapIds],
    canonicalFace: room.canonicalFace,
    canonicalFaces: Object.fromEntries(
      FACE_ORDER.map((face) => [
        face,
        {
          ...room.canonicalFaces[face],
          cellIds: [...room.canonicalFaces[face].cellIds],
          beamIds: [...room.canonicalFaces[face].beamIds],
          adjacentRoomIds: [...room.canonicalFaces[face].adjacentRoomIds],
          cutoutIds: [...room.canonicalFaces[face].cutoutIds],
          adjacencyGapIds: [...room.canonicalFaces[face].adjacencyGapIds],
        },
      ]),
    ) as StructuralRoomMetadata["canonicalFaces"],
    adjacency: Object.fromEntries(
      Object.entries(room.adjacency)
        .sort(([leftRoomId], [rightRoomId]) =>
          leftRoomId.localeCompare(rightRoomId),
        )
        .map(([neighborRoomId, adjacency]) => [
          neighborRoomId,
          {
            ...adjacency,
            roomIds: [...adjacency.roomIds] as [string, string],
            directions: [...adjacency.directions],
            cellPairs: adjacency.cellPairs.map((pair) => ({ ...pair })),
            sharedBeamIds: [...adjacency.sharedBeamIds],
            sharedWallBeamIds: [...adjacency.sharedWallBeamIds],
          },
        ]),
    ) as Record<string, StructuralRoomAdjacency>,
    neighboringRoomIds: [...room.neighboringRoomIds],
    cutouts: room.cutouts.map((cutout) => ({
      ...cutout,
      beamIds: [...cutout.beamIds],
      bounds: {
        min: [...cutout.bounds.min] as [number, number],
        max: [...cutout.bounds.max] as [number, number],
      },
    })),
    adjacencyGaps: room.adjacencyGaps.map((gap) => ({
      ...gap,
      beamIds: [...gap.beamIds],
      adjacentRoomIds: [...gap.adjacentRoomIds],
      bounds: {
        min: [...gap.bounds.min] as [number, number],
        max: [...gap.bounds.max] as [number, number],
      },
    })),
    openings: room.openings.map((opening) => ({
      ...opening,
      definition: { ...opening.definition },
      framingBeamIds: [...opening.framingBeamIds],
    })),
  })),
});

export const attachStructuralMetadataToShapes = <TShape extends SimulationNode>(
  shapes: TShape[],
  graph = buildCellBeamGraph(shapes),
): StructuralShape<TShape>[] =>
  shapes.map((shape) => {
    const structuralRoom = graph.roomsById.get(shape.id);
    return structuralRoom ? { ...shape, structuralRoom } : shape;
  });

export { isRoomNode };
