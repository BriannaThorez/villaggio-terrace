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
  FACE_ORDER
} from "../types";

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

  switch (face) {
    case "front":
      return vec3(0, hh, 0);
    case "back":
      return vec3(0, hh, -dimensions.depth);
    case "left":
      return vec3(-hw, hh, -dimensions.depth / 2);
    case "right":
      return vec3(hw, hh, -dimensions.depth / 2);
    case "top":
      return vec3(0, dimensions.height, -dimensions.depth / 2);
    case "bottom":
      return vec3(0, 0, -dimensions.depth / 2);
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

  switch (face) {
    case "front":
      return vec3(0, hh, 0);
    case "back":
      return vec3(0, hh, -dimensions.depth);
    case "left":
      return vec3(-hw, hh, -dimensions.depth / 2);
    case "right":
      return vec3(hw, hh, -dimensions.depth / 2);
    case "top":
      return vec3(0, dimensions.height, -dimensions.depth / 2);
    case "bottom":
      return vec3(0, 0, -dimensions.depth / 2);
  }
};






