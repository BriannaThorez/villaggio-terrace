import {
  type StructuralFace,
  type StructuralRoomMetadata,
  sortedUnique
} from "./contract";

/** @internal - Legacy test utility for beam graph validation */
export const getCanonicalFaceBeamIds = (
  room: StructuralRoomMetadata,
  face: StructuralFace,
) => sortedUnique(room.canonicalFaces[face].beamIds);

/** @internal - Legacy test utility for beam graph validation */
export const getNeighborSharedWallBeamIds = (
  room: StructuralRoomMetadata,
  neighborRoomId: string,
) => sortedUnique(room.adjacency[neighborRoomId]?.sharedWallBeamIds ?? []);
