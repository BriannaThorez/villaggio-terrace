import * as THREE from "three";

export type SurfacePresetKind = "terrain" | "ground" | "grass" | "custom";

export interface SurfaceMaterialStyle {
  assetName: string;
  tintHex?: string;
  roughness?: number;
  metalness?: number;
  envMapIntensity?: number;
  displacementScale?: number;
  displacementBias?: number;
  normalScale?: [number, number];
  repeat?: number;
  useTriplanar?: boolean;
}

export interface SurfaceGeometryStyle {
  width: number;
  depth: number;
  thickness?: number;
  topAtYZero?: boolean;
}

export interface SurfaceRenderStyle {
  castShadow?: boolean;
  receiveShadow?: boolean;
  renderOrder?: number;
  opacity?: number;
  side?: THREE.Side;
}

export interface SurfacePresetDefinition {
  kind: SurfacePresetKind;
  name: string;
  material: SurfaceMaterialStyle;
  geometry: SurfaceGeometryStyle;
  render: SurfaceRenderStyle;
}

export interface SurfacePresetInstance {
  definition: SurfacePresetDefinition;
  material: THREE.MeshPhysicalMaterial;
}

export interface CreateSurfacePresetInput {
  definition: SurfacePresetDefinition;
  material: THREE.MeshPhysicalMaterial;
}
