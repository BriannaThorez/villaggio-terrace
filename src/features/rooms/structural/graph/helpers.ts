import type { StructuralFace, StructuralRoomMetadata } from "./contract";

const uniqueSortedIds = (ids: Iterable<string>) => [...new Set(ids)].sort();

export const getCanonicalFaceBeamIds = (
  room: StructuralRoomMetadata,
  face: StructuralFace,
) => uniqueSortedIds(room.canonicalFaces[face].beamIds);

export const getNeighborSharedWallBeamIds = (
  room: StructuralRoomMetadata,
  neighborRoomId: string,
) => uniqueSortedIds(room.adjacency[neighborRoomId]?.sharedWallBeamIds ?? []);
