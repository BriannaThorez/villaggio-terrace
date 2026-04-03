import test from "node:test";
import assert from "node:assert/strict";
import {
  attachStructuralMetadataToShapes,
  buildCellBeamGraph,
  exportStructuralMetadata,
} from "./cellBeamGraph";
import { STRUCTURAL_METADATA_CONTRACT_VERSION } from "./contract";
import {
  getCanonicalFaceBeamIds,
  getNeighborSharedWallBeamIds,
} from "./helpers";
import type { SimulationNode } from "../../../../shared/utils/store";
import type { RoomOpeningDefinition } from "../types";

const makeRoom = (
  id: string,
  position: [number, number],
  size: [number, number],
  openings: RoomOpeningDefinition[] = [],
): SimulationNode => ({
  id,
  type: "residential",
  position,
  size,
  vertices: [
    [-size[0] / 2, -size[1] / 2],
    [size[0] / 2, -size[1] / 2],
    [size[0] / 2, size[1] / 2],
    [-size[0] / 2, size[1] / 2],
  ],
  structuralSettings: {
    openings,
  },
});

test("single cell exposes four canonical wall beams", () => {
  const graph = buildCellBeamGraph([makeRoom("solo", [0, 0], [20, 40])]);
  const room = graph.roomsById.get("solo");

  assert.ok(room);

  const canonicalBeams = [
    ...room.canonicalFaces.front.beamIds,
    ...room.canonicalFaces.back.beamIds,
    ...room.canonicalFaces.left.beamIds,
    ...room.canonicalFaces.right.beamIds,
  ];

  const wallBeams = room.beams.filter((beam) => beam.plane === "wall");
  const uniqueWallBeamIds = new Set(wallBeams.map((beam) => beam.id));

  assert.ok(room.canonicalFaces.front.beamIds.length > 0);
  assert.ok(room.canonicalFaces.back.beamIds.length > 0);
  assert.ok(room.canonicalFaces.left.beamIds.length > 0);
  assert.ok(room.canonicalFaces.right.beamIds.length > 0);

  assert.equal(uniqueWallBeamIds.size, 4);
  assert.equal(
    canonicalBeams.filter((beamId) => uniqueWallBeamIds.has(beamId)).length,
    4,
  );
});

test("adjacent rooms reuse a single shared partition beam", () => {
  const graph = buildCellBeamGraph([
    makeRoom("room-a", [0, 0], [20, 40]),
    makeRoom("room-b", [20, 0], [20, 40]),
  ]);

  const roomA = graph.roomsById.get("room-a");
  const roomB = graph.roomsById.get("room-b");

  assert.ok(roomA);
  assert.ok(roomB);
  assert.deepEqual(roomA.neighboringRoomIds, ["room-b"]);
  assert.deepEqual(roomB.neighboringRoomIds, ["room-a"]);

  const adjacency = graph.adjacencies.find(
    (entry) => entry.roomIds[0] === "room-a" && entry.roomIds[1] === "room-b",
  );

  assert.ok(adjacency);
  assert.equal(adjacency.sharedWallBeamIds.length, 1);
  assert.equal(adjacency.sharedBeamIds.length, 3);

  const sharedBeam = graph.beamsById.get(adjacency.sharedWallBeamIds[0]);
  assert.ok(sharedBeam);
  assert.equal(sharedBeam.role, "interior-partition");
  assert.deepEqual(sharedBeam.roomIds, ["room-a", "room-b"]);
});

test("multi-cell rooms do not duplicate shared partition beams", () => {
  const graph = buildCellBeamGraph([
    makeRoom("left", [5, 0], [10, 80]),
    makeRoom("right", [15, 0], [10, 80]),
  ]);

  const adjacency = graph.adjacencies.find(
    (entry) => entry.roomIds[0] === "left" && entry.roomIds[1] === "right",
  );

  assert.ok(adjacency);
  assert.equal(adjacency.sharedWallBeamIds.length, 2);
  assert.deepEqual(adjacency.directions, ["east", "west"]);

  const uniqueSharedWallBeams = new Set(adjacency.sharedWallBeamIds);
  assert.equal(uniqueSharedWallBeams.size, adjacency.sharedWallBeamIds.length);
});

test("walls resolve between shared beams without spanning openings", () => {
  const graph = buildCellBeamGraph([
    makeRoom(
      "room-a",
      [0, 0],
      [20, 40],
      [
        {
          id: "door-1",
          kind: "door",
          face: "front",
          center: [0, -8],
          size: [8, 12],
        },
      ],
    ),
    makeRoom("room-b", [20, 0], [20, 40]),
  ]);

  const roomA = graph.roomsById.get("room-a");
  const adjacency = graph.adjacencies.find(
    (entry) => entry.roomIds[0] === "room-a" && entry.roomIds[1] === "room-b",
  );

  assert.ok(roomA);
  assert.ok(adjacency);
  assert.ok(roomA.cutouts.length > 0);
  assert.ok(roomA.adjacencyGaps.length > 0);
  assert.ok(roomA.canonicalFaces.front.cutoutIds.length > 0);
  assert.ok(roomA.canonicalFaces.front.adjacencyGapIds.length > 0);
  assert.equal(adjacency.sharedWallBeamIds.length, 1);
});

test("canonical face selection stays deterministic", () => {
  const graph = buildCellBeamGraph([makeRoom("solo", [0, 0], [20, 40])]);
  const room = graph.roomsById.get("solo");

  assert.ok(room);
  assert.equal(room.canonicalFace, "front");
  assert.equal(room.canonicalFaces.front.exposed, true);
  assert.equal(room.canonicalFaces.floor.exposed, true);
});

test("mirrored room inputs preserve canonical face and beam stability", () => {
  const room = makeRoom("mirror", [0, 0], [20, 40]);
  const mirroredRoom = makeRoom("mirror", [0, 0], [20, 40]);
  mirroredRoom.vertices = [...room.vertices].reverse();

  const graphA = buildCellBeamGraph([room]);
  const graphB = buildCellBeamGraph([mirroredRoom]);

  const roomA = graphA.roomsById.get("mirror");
  const roomB = graphB.roomsById.get("mirror");

  assert.ok(roomA);
  assert.ok(roomB);

  assert.equal(roomA.canonicalFace, roomB.canonicalFace);
  assert.deepEqual(
    roomA.canonicalFaces.front.beamIds,
    roomB.canonicalFaces.front.beamIds,
  );
  assert.deepEqual(
    roomA.canonicalFaces.back.beamIds,
    roomB.canonicalFaces.back.beamIds,
  );
  assert.deepEqual(
    roomA.canonicalFaces.left.beamIds,
    roomB.canonicalFaces.left.beamIds,
  );
  assert.deepEqual(
    roomA.canonicalFaces.right.beamIds,
    roomB.canonicalFaces.right.beamIds,
  );
  assert.deepEqual(roomA.adjacency, roomB.adjacency);
  assert.deepEqual(roomA.beamIds, roomB.beamIds);

  assert.deepEqual(
    getCanonicalFaceBeamIds(roomA, roomA.canonicalFace),
    getCanonicalFaceBeamIds(roomB, roomB.canonicalFace),
  );
});

test("openings produce framing beams, cutouts, and adjacency gaps", () => {
  const graph = buildCellBeamGraph([
    makeRoom(
      "room-a",
      [0, 0],
      [20, 40],
      [
        {
          id: "window-1",
          kind: "window",
          face: "front",
          center: [0, 0],
          size: [8, 12],
        },
      ],
    ),
  ]);
  const room = graph.roomsById.get("room-a");

  assert.ok(room);
  assert.equal(room.cutouts.length, 1);
  assert.equal(room.adjacencyGaps.length, 1);
  assert.equal(room.openings.length, 1);
  assert.deepEqual(room.canonicalFaces.front.cutoutIds, [
    "cutout:room-a:window-1",
  ]);
  assert.deepEqual(room.canonicalFaces.front.adjacencyGapIds, [
    "gap:room-a:window-1",
  ]);

  const framingBeams = room.beams.filter(
    (beam) => beam.source === "opening-framing",
  );
  assert.equal(framingBeams.length, 4);
  assert.deepEqual(framingBeams.map((beam) => beam.role).sort(), [
    "header",
    "jamb",
    "jamb",
    "sill",
  ]);
});

test("structural metadata attaches without mutating the source shapes array", () => {
  const shapes = [
    makeRoom("room-a", [0, 0], [20, 40]),
    {
      id: "label",
      type: "text" as const,
      position: [50, 0] as [number, number],
      size: [20, 20] as [number, number],
      vertices: [
        [-10, -10],
        [10, -10],
        [10, 10],
        [-10, 10],
      ] as [number, number][],
      text: "Label",
    },
  ];

  const attached = attachStructuralMetadataToShapes(shapes);

  assert.equal("structuralRoom" in shapes[0], false);
  assert.ok(attached[0].structuralRoom);
  assert.equal(attached[1].structuralRoom, undefined);
});

test("structural metadata export is deterministic and normalized", () => {
  const shapes = [
    makeRoom("room-b", [20, 0], [20, 40]),
    makeRoom("room-a", [0, 0], [20, 40]),
  ];

  const exportA = exportStructuralMetadata(buildCellBeamGraph(shapes));
  const exportB = exportStructuralMetadata(
    buildCellBeamGraph([...shapes].reverse()),
  );

  assert.equal(exportA.schemaVersion, STRUCTURAL_METADATA_CONTRACT_VERSION);
  assert.deepEqual(exportA, exportB);
  assert.deepEqual(exportA.roomIds, ["room-a", "room-b"]);
  assert.equal(exportA.rooms[0].roomId, "room-a");
  assert.equal(exportA.adjacencies.length, 1);
  assert.deepEqual(Object.keys(exportA.rooms[0].adjacency), ["room-b"]);
  assert.deepEqual(exportA.rooms[0].cutoutIds, []);
  assert.equal("roomsById" in exportA, false);
  assert.equal("beamsById" in exportA, false);

  assert.deepEqual(
    exportA.rooms[0].canonicalFaces.front.beamIds,
    exportB.rooms[0].canonicalFaces.front.beamIds,
  );
  assert.deepEqual(
    exportA.rooms[0].canonicalFaces.right.beamIds,
    exportB.rooms[0].canonicalFaces.right.beamIds,
  );
});

test("RoomSkin helpers expose canonical face and adjacency beam ids", () => {
  const graph = buildCellBeamGraph([
    makeRoom("room-a", [0, 0], [20, 40]),
    makeRoom("room-b", [20, 0], [20, 40]),
  ]);
  const roomA = graph.roomsById.get("room-a");

  assert.ok(roomA);
  assert.deepEqual(
    getCanonicalFaceBeamIds(roomA, "right"),
    roomA.canonicalFaces.right.beamIds,
  );
  assert.deepEqual(
    getNeighborSharedWallBeamIds(roomA, "room-b"),
    roomA.adjacency["room-b"].sharedWallBeamIds,
  );
});

test("wall spans emit visible panels for every canonical face", () => {
  const graph = buildCellBeamGraph([makeRoom("solo", [0, 0], [20, 40])]);
  const room = graph.roomsById.get("solo");

  assert.ok(room);

  for (const face of [
    "front",
    "back",
    "left",
    "right",
    "ceiling",
    "floor",
  ] as const) {
    assert.ok(
      room.canonicalFaces[face].beamIds.length > 0,
      `expected beams for ${face}`,
    );
    assert.ok(
      room.canonicalFaces[face].exposed,
      `expected exposed face for ${face}`,
    );
  }
});
