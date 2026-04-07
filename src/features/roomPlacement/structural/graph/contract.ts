import type { SimulationNode } from "../../../../shared/utils/store";
import type { OpeningKind, RoomOpeningDefinition } from "../types";

export const STRUCTURAL_METADATA_CONTRACT_VERSION = "1.0.0";

export type StructuralFace =
  | "front"
  | "back"
  | "left"
  | "right"
  | "ceiling"
  | "floor";

export const FACE_ORDER: StructuralFace[] = [
  "front",
  "right",
  "back",
  "left",
  "ceiling",
  "floor",
];

export const sortedUnique = (values: Iterable<string>) => [...new Set(values)].sort();

export type CellBoundaryDirection = "north" | "south" | "east" | "west";

export type BeamAxis = "x" | "y" | "z";
export type BeamPlane = "wall" | "floor" | "ceiling";
export type BeamRole =
  | "interior-partition"
  | "exterior-wall"
  | "floor"
  | "ceiling"
  | "header"
  | "sill"
  | "jamb";

export interface StructuralCorner {
  id: string;
  x2: number;
  y2: number;
  position: [number, number];
}

export interface StructuralCell {
  id: string;
  roomId: string;
  column: number;
  row: number;
  x2: number;
  y2: number;
  center: [number, number];
  cornerIds: {
    northWest: string;
    northEast: string;
    southEast: string;
    southWest: string;
  };
  beamIds: string[];
  neighboringRoomIds: string[];
}

export interface StructuralBeam {
  id: string;
  plane: BeamPlane;
  role: BeamRole;
  axis: BeamAxis;
  cornerIds: [string, string];
  start: [number, number, number];
  end: [number, number, number];
  roomIds: string[];
  cellIds: string[];
  face?: StructuralFace;
  openingId?: string;
  source: "grid" | "opening-framing";
}

export interface StructuralFaceBounds {
  min: [number, number];
  max: [number, number];
}

export interface StructuralAdjacencyGap {
  id: string;
  roomId: string;
  face: StructuralFace;
  kind: "opening-gap";
  source: "opening";
  openingId: string;
  cutoutId: string;
  beamIds: string[];
  bounds: StructuralFaceBounds;
  adjacentRoomIds: string[];
}

export interface StructuralFaceCutout {
  id: string;
  roomId: string;
  openingId: string;
  face: StructuralFace;
  openingKind: OpeningKind;
  bounds: StructuralFaceBounds;
  beamIds: string[];
  adjacencyGapId: string;
}

export interface StructuralOpeningMetadata {
  openingId: string;
  definition: RoomOpeningDefinition;
  face: StructuralFace;
  framingBeamIds: string[];
  cutoutId: string;
  adjacencyGapId: string;
}

export interface StructuralRoomAdjacency {
  id: string;
  roomIds: [string, string];
  directions: CellBoundaryDirection[];
  cellPairs: Array<{
    roomId: string;
    cellId: string;
    neighborRoomId: string;
    neighborCellId: string;
    direction: CellBoundaryDirection;
  }>;
  sharedBeamIds: string[];
  sharedWallBeamIds: string[];
}

export interface StructuralCanonicalFace {
  id: string;
  roomId: string;
  face: StructuralFace;
  exposed: boolean;
  cellIds: string[];
  beamIds: string[];
  adjacentRoomIds: string[];
  cutoutIds: string[];
  adjacencyGapIds: string[];
}

export interface StructuralRoomMetadata {
  roomId: string;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  cells: StructuralCell[];
  cellIds: string[];
  beams: StructuralBeam[];
  beamIds: string[];
  cutouts: StructuralFaceCutout[];
  cutoutIds: string[];
  adjacencyGaps: StructuralAdjacencyGap[];
  adjacencyGapIds: string[];
  openings: StructuralOpeningMetadata[];
  canonicalFace: StructuralFace;
  face: StructuralFace;
  canonicalFaces: Record<StructuralFace, StructuralCanonicalFace>;
  adjacency: Record<string, StructuralRoomAdjacency>;
  neighboringRoomIds: string[];
}

export interface StructuralCellBeamGraph {
  cells: StructuralCell[];
  beams: StructuralBeam[];
  adjacencies: StructuralRoomAdjacency[];
  rooms: StructuralRoomMetadata[];
  roomsById: Map<string, StructuralRoomMetadata>;
  beamsById: Map<string, StructuralBeam>;
}

export interface StructuralRoomMetadataExport {
  roomId: string;
  dimensions: StructuralRoomMetadata["dimensions"];
  cellIds: string[];
  beamIds: string[];
  cutoutIds: string[];
  adjacencyGapIds: string[];
  canonicalFace: StructuralFace;
  canonicalFaces: Record<StructuralFace, StructuralCanonicalFace>;
  adjacency: Record<string, StructuralRoomAdjacency>;
  neighboringRoomIds: string[];
  cutouts: StructuralFaceCutout[];
  adjacencyGaps: StructuralAdjacencyGap[];
  openings: StructuralOpeningMetadata[];
}

export interface StructuralMetadataExport {
  schemaVersion: typeof STRUCTURAL_METADATA_CONTRACT_VERSION;
  roomIds: string[];
  cells: StructuralCell[];
  beams: StructuralBeam[];
  adjacencies: StructuralRoomAdjacency[];
  rooms: StructuralRoomMetadataExport[];
}

export type StructuralShape<TShape extends SimulationNode = SimulationNode> =
  TShape & {
    structuralRoom?: StructuralRoomMetadata;
  };
