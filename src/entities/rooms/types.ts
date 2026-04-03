export type RoomAxis = "x" | "y" | "z";

export type RoomFace = "north" | "south" | "east" | "west" | "bottom" | "top";

export type RoomOpeningType = "window" | "door" | "cutaway" | "passage";

export type RoomOpeningCoordinateAxis = "x" | "y" | "z";

export type RoomId = string;
export type RoomOpeningId = string;
export type RoomZoneId = string;

export interface RoomVec3 {
  x: number;
  y: number;
  z: number;
}

export interface RoomDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface RoomThickness {
  wall: number;
  bottom: number;
  top: number;
}

export interface RoomBounds {
  min: RoomVec3;
  max: RoomVec3;
}

export interface RoomSpan {
  start: number;
  end: number;
}

export interface RoomOpeningSize {
  width: number;
  height: number;
}

export interface RoomOpeningPlacement {
  face: RoomFace;
  offset: number;
  axis: RoomOpeningCoordinateAxis;
  inward: number;
}

export interface RoomOpening {
  id: RoomOpeningId;
  type: RoomOpeningType;
  size: RoomOpeningSize;
  placement: RoomOpeningPlacement;
  sillHeight?: number;
  lintelHeight?: number;
  metadata?: RoomRecord;
}

export interface RoomOpeningBounds {
  min: RoomVec3;
  max: RoomVec3;
}

export type RoomFramingBeamRole = "header" | "sill" | "jamb";

export interface RoomFramingBeam {
  id: string;
  openingId: RoomOpeningId;
  face: RoomFace;
  role: RoomFramingBeamRole;
  start: RoomVec3;
  end: RoomVec3;
  axis: RoomAxis;
  normal: RoomVec3;
}

export interface RoomOpeningCutout {
  openingId: RoomOpeningId;
  face: RoomFace;
  bounds: RoomOpeningBounds;
  normal: RoomVec3;
  depth: number;
  framingBeamIds: string[];
}

export interface RoomFramingMetadata {
  beams: RoomFramingBeam[];
  cutouts: RoomOpeningCutout[];
  validationIssues: RoomValidationIssue[];
}

export interface RoomValidationIssue {
  code: string;
  message: string;
  openingId?: RoomOpeningId;
  zoneId?: RoomZoneId;
  face?: RoomFace;
  severity?: "info" | "warning" | "error";
}

export interface RoomPlacementZone {
  id: RoomZoneId;
  face: RoomFace;
  bounds: RoomSpan;
  clearance: number;
  enabled: boolean;
  metadata?: RoomRecord;
}

export interface RoomStructuralMetadata {
  anchors: RoomVec3[];
  placementZones: RoomPlacementZone[];
  exclusionZones: RoomPlacementZone[];
}

export interface RoomShellLayer {
  outer: RoomDimensions;
  inner: RoomDimensions;
  thickness: RoomThickness;
}

export interface StructuralRoom {
  id: RoomId;
  name?: string;
  shell: RoomShellLayer;
  openings: RoomOpening[];
  metadata: RoomStructuralMetadata;
  tags?: string[];
  version?: number;
}

export interface SerializedRoomVec3 {
  x: number;
  y: number;
  z: number;
}

export interface SerializedRoomDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface SerializedRoomThickness {
  wall: number;
  bottom: number;
  top: number;
}

export interface SerializedRoomSpan {
  start: number;
  end: number;
}

export interface SerializedRoomOpeningPlacement {
  face: RoomFace;
  offset: number;
  axis: RoomOpeningCoordinateAxis;
  inward: number;
}

export interface SerializedRoomOpening {
  id: RoomOpeningId;
  type: RoomOpeningType;
  size: RoomOpeningSize;
  placement: SerializedRoomOpeningPlacement;
  sillHeight?: number;
  lintelHeight?: number;
  metadata?: RoomRecord;
}

export interface SerializedRoomPlacementZone {
  id: RoomZoneId;
  face: RoomFace;
  bounds: SerializedRoomSpan;
  clearance: number;
  enabled: boolean;
  metadata?: RoomRecord;
}

export interface SerializedRoomStructuralMetadata {
  anchors: SerializedRoomVec3[];
  placementZones: SerializedRoomPlacementZone[];
  exclusionZones: SerializedRoomPlacementZone[];
}

export interface SerializedRoomShellLayer {
  outer: SerializedRoomDimensions;
  inner: SerializedRoomDimensions;
  thickness: SerializedRoomThickness;
}

export interface SerializedStructuralRoom {
  id: RoomId;
  name?: string;
  shell: SerializedRoomShellLayer;
  openings: SerializedRoomOpening[];
  metadata: SerializedRoomStructuralMetadata;
  tags?: string[];
  version?: number;
}

export type RoomPrimitive = string | number | boolean | null;
export type RoomRecord = {
  [key: string]:
    | RoomPrimitive
    | RoomPrimitive[]
    | RoomRecord
    | RoomRecord[]
    | undefined;
};

export interface MaterialConfig {
  albedo: string;
  roughness: number;
  metalness: number;
  normalMapIntensity?: number;
}

export const clampRoomValue = (
  value: number,
  min: number,
  max: number,
): number => {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
};

export const createRoomVec3 = (x: number, y: number, z: number): RoomVec3 => ({
  x,
  y,
  z,
});

export const createRoomDimensions = (
  width: number,
  height: number,
  depth: number,
): RoomDimensions => ({
  width,
  height,
  depth,
});

export const createRoomThickness = (
  wall: number,
  bottom: number,
  top: number,
): RoomThickness => ({
  wall,
  bottom,
  top,
});

export const createRoomSpan = (start: number, end: number): RoomSpan => ({
  start,
  end,
});

export const createRoomOpening = (opening: RoomOpening): RoomOpening => ({
  ...opening,
  metadata: opening.metadata ? { ...opening.metadata } : undefined,
});

export const createRoomPlacementZone = (
  zone: RoomPlacementZone,
): RoomPlacementZone => ({
  ...zone,
  metadata: zone.metadata ? { ...zone.metadata } : undefined,
});

export const createRoomStructuralMetadata = (
  metadata: RoomStructuralMetadata,
): RoomStructuralMetadata => ({
  anchors: metadata.anchors.map((anchor) => ({ ...anchor })),
  placementZones: metadata.placementZones.map((zone) =>
    createRoomPlacementZone(zone),
  ),
  exclusionZones: metadata.exclusionZones.map((zone) =>
    createRoomPlacementZone(zone),
  ),
});

export const createRoomShellLayer = (
  outer: RoomDimensions,
  thickness: RoomThickness,
): RoomShellLayer => ({
  outer,
  inner: {
    width: Math.max(0, outer.width - thickness.wall * 2),
    height: Math.max(0, outer.height - thickness.bottom - thickness.top),
    depth: Math.max(0, outer.depth - thickness.wall * 2),
  },
  thickness,
});

export const createStructuralRoom = (room: StructuralRoom): StructuralRoom => ({
  ...room,
  shell: {
    outer: { ...room.shell.outer },
    inner: { ...room.shell.inner },
    thickness: { ...room.shell.thickness },
  },
  openings: room.openings.map((opening) => createRoomOpening(opening)),
  metadata: createRoomStructuralMetadata(room.metadata),
  tags: room.tags ? [...room.tags] : undefined,
});

export const serializeRoomVec3 = (value: RoomVec3): SerializedRoomVec3 => ({
  x: value.x,
  y: value.y,
  z: value.z,
});

export const serializeRoomDimensions = (
  value: RoomDimensions,
): SerializedRoomDimensions => ({
  width: value.width,
  height: value.height,
  depth: value.depth,
});

export const serializeRoomThickness = (
  value: RoomThickness,
): SerializedRoomThickness => ({
  wall: value.wall,
  bottom: value.bottom,
  top: value.top,
});

export const serializeRoomSpan = (value: RoomSpan): SerializedRoomSpan => ({
  start: value.start,
  end: value.end,
});

export const serializeRoomOpening = (
  value: RoomOpening,
): SerializedRoomOpening => ({
  id: value.id,
  type: value.type,
  size: { ...value.size },
  placement: { ...value.placement },
  sillHeight: value.sillHeight,
  lintelHeight: value.lintelHeight,
  metadata: value.metadata ? { ...value.metadata } : undefined,
});

export const serializeRoomPlacementZone = (
  value: RoomPlacementZone,
): SerializedRoomPlacementZone => ({
  id: value.id,
  face: value.face,
  bounds: serializeRoomSpan(value.bounds),
  clearance: value.clearance,
  enabled: value.enabled,
  metadata: value.metadata ? { ...value.metadata } : undefined,
});

export const serializeRoomStructuralMetadata = (
  value: RoomStructuralMetadata,
): SerializedRoomStructuralMetadata => ({
  anchors: value.anchors.map((anchor) => serializeRoomVec3(anchor)),
  placementZones: value.placementZones.map((zone) =>
    serializeRoomPlacementZone(zone),
  ),
  exclusionZones: value.exclusionZones.map((zone) =>
    serializeRoomPlacementZone(zone),
  ),
});

export const serializeRoomShellLayer = (
  value: RoomShellLayer,
): SerializedRoomShellLayer => ({
  outer: serializeRoomDimensions(value.outer),
  inner: serializeRoomDimensions(value.inner),
  thickness: serializeRoomThickness(value.thickness),
});

export const serializeStructuralRoom = (
  value: StructuralRoom,
): SerializedStructuralRoom => ({
  id: value.id,
  name: value.name,
  shell: serializeRoomShellLayer(value.shell),
  openings: value.openings.map((opening) => serializeRoomOpening(opening)),
  metadata: serializeRoomStructuralMetadata(value.metadata),
  tags: value.tags ? [...value.tags] : undefined,
  version: value.version,
});

export const deserializeRoomVec3 = (value: SerializedRoomVec3): RoomVec3 => ({
  x: value.x,
  y: value.y,
  z: value.z,
});

export const deserializeRoomDimensions = (
  value: SerializedRoomDimensions,
): RoomDimensions => ({
  width: value.width,
  height: value.height,
  depth: value.depth,
});

export const deserializeRoomThickness = (
  value: SerializedRoomThickness,
): RoomThickness => ({
  wall: value.wall,
  bottom: value.bottom,
  top: value.top,
});

export const deserializeRoomSpan = (value: SerializedRoomSpan): RoomSpan => ({
  start: value.start,
  end: value.end,
});

export const deserializeRoomOpening = (
  value: SerializedRoomOpening,
): RoomOpening => ({
  id: value.id,
  type: value.type,
  size: { ...value.size },
  placement: { ...value.placement },
  sillHeight: value.sillHeight,
  lintelHeight: value.lintelHeight,
  metadata: value.metadata ? { ...value.metadata } : undefined,
});

export const deserializeRoomPlacementZone = (
  value: SerializedRoomPlacementZone,
): RoomPlacementZone => ({
  id: value.id,
  face: value.face,
  bounds: deserializeRoomSpan(value.bounds),
  clearance: value.clearance,
  enabled: value.enabled,
  metadata: value.metadata ? { ...value.metadata } : undefined,
});

export const deserializeRoomStructuralMetadata = (
  value: SerializedRoomStructuralMetadata,
): RoomStructuralMetadata => ({
  anchors: value.anchors.map((anchor) => deserializeRoomVec3(anchor)),
  placementZones: value.placementZones.map((zone) =>
    deserializeRoomPlacementZone(zone),
  ),
  exclusionZones: value.exclusionZones.map((zone) =>
    deserializeRoomPlacementZone(zone),
  ),
});

export const deserializeRoomShellLayer = (
  value: SerializedRoomShellLayer,
): RoomShellLayer => ({
  outer: deserializeRoomDimensions(value.outer),
  inner: deserializeRoomDimensions(value.inner),
  thickness: deserializeRoomThickness(value.thickness),
});

export const deserializeStructuralRoom = (
  value: SerializedStructuralRoom,
): StructuralRoom => ({
  id: value.id,
  name: value.name,
  shell: deserializeRoomShellLayer(value.shell),
  openings: value.openings.map((opening) => deserializeRoomOpening(opening)),
  metadata: deserializeRoomStructuralMetadata(value.metadata),
  tags: value.tags ? [...value.tags] : undefined,
  version: value.version,
});
