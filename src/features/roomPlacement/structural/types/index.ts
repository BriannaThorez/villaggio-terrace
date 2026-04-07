import * as THREE from "three";

export type RoomFace = "front" | "back" | "left" | "right" | "top" | "bottom";

export type StructuralWallFace = "front" | "back" | "left" | "right";
export type StructuralBoundary = "top" | "bottom";
export type StructuralBoundaryRole = "ceiling" | "floor";
export type OpeningKind = "door" | "window" | "cutaway";

export const FACE_ORDER: RoomFace[] = [
  "front",
  "back",
  "left",
  "right",
  "top",
  "bottom",
];

export interface RoomShellDimensions {
  width: number;
  height: number;
  depth: number;
  wallThickness: number;
  floorThickness: number;
  ceilingThickness: number;
}

export interface RoomOpeningDefinition {
  id: string;
  kind: OpeningKind;
  face: RoomFace;
  /** Local offset from the face center in room units. */
  center: [number, number];
  /** Opening size in face-local units. */
  size: [number, number];
  /** Depth cut into the shell from the target face. */
  revealDepth?: number;
  /** Optional extra inset for frame/reveal generation. */
  revealInset?: number;
  /** If true, the opening can fully remove the wall segment. */
  passThrough?: boolean;
}

export interface RoomAnchor {
  id: string;
  face: RoomFace;
  position: [number, number, number];
}

export interface RoomExclusionZone {
  id: string;
  face?: RoomFace;
  center: [number, number, number];
  size: [number, number, number];
}

export interface RoomPlacementBand {
  id: string;
  face: RoomFace;
  start: number;
  end: number;
  minClearance: number;
}

export interface RoomStructuralSettings {
  dimensions: RoomShellDimensions;
  openings?: RoomOpeningDefinition[];
  anchors?: RoomAnchor[];
  exclusionZones?: RoomExclusionZone[];
  placementBands?: RoomPlacementBand[];
}

export interface RoomValidationIssue {
  code:
  | "invalid-dimensions"
  | "invalid-opening"
  | "opening-out-of-bounds"
  | "opening-overlap"
  | "invalid-zone"
  | "completion-missing"
  | "completion-mismatch";
  message: string;
  openingId?: string;
  zoneId?: string;
  face?: RoomFace;
  severity?: "info" | "warning" | "error";
}

export interface RoomFaceFrame {
  face: RoomFace;
  planeSize: [number, number];
  outerBounds: THREE.Box2;
  innerBounds: THREE.Box2;
  revealBounds: THREE.Box2;
}

export interface RoomShellGeometryResult {
  outerGeometry: THREE.BufferGeometry;
  innerGeometry: THREE.BufferGeometry;
  shellGeometry: THREE.BufferGeometry;
  revealGeometry: THREE.BufferGeometry[];
  openingMasks: THREE.Box3[];
}

export interface RoomStructuralLayout {
  shell: RoomShellGeometryResult;
  anchors: RoomAnchor[];
  exclusionZones: RoomExclusionZone[];
  placementBands: RoomPlacementBand[];
  validationIssues: RoomValidationIssue[];
  completionIssues: RoomValidationIssue[];
}

export const ROOM_FACE_AXES: Record<
  RoomFace,
  {
    normal: [number, number, number];
    u: [number, number, number];
    v: [number, number, number];
  }
> = {
  front: {
    normal: [0, 0, 1],
    u: [1, 0, 0],
    v: [0, 1, 0],
  },
  back: {
    normal: [0, 0, -1],
    u: [-1, 0, 0],
    v: [0, 1, 0],
  },
  left: {
    normal: [-1, 0, 0],
    u: [0, 0, -1],
    v: [0, 1, 0],
  },
  right: {
    normal: [1, 0, 0],
    u: [0, 0, 1],
    v: [0, 1, 0],
  },
  top: {
    normal: [0, 1, 0],
    u: [1, 0, 0],
    v: [0, 0, -1],
  },
  bottom: {
    normal: [0, -1, 0],
    u: [1, 0, 0],
    v: [0, 0, 1],
  },
};

export const DEFAULT_ROOM_SHELL_DIMENSIONS: RoomShellDimensions = {
  width: 12,
  height: 3,
  depth: 8,
  wallThickness: 0.35,
  floorThickness: 0.25,
  ceilingThickness: 0.25,
};

export const STRUCTURAL_FACE_TO_BOUNDARY: Record<
  StructuralBoundary,
  StructuralBoundaryRole
> = {
  top: "ceiling",
  bottom: "floor",
};

export const isStructuralFace = (face: RoomFace): face is StructuralWallFace =>
  face === "front" || face === "back" || face === "left" || face === "right";

export const isStructuralBoundary = (
  face: RoomFace,
): face is StructuralBoundary => face === "top" || face === "bottom";

export const getStructuralBoundaryRole = (
  face: StructuralBoundary,
): StructuralBoundaryRole => (face === "top" ? "ceiling" : "floor");

export const DEFAULT_REVEAL_DEPTH = 0.2;
export const DEFAULT_REVEAL_INSET = 0.08;
export const MIN_CLEARANCE = 0.05;
