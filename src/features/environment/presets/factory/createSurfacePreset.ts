import * as THREE from "three";

export type SurfacePresetTextureMode = "texture" | "solid";

export interface SurfaceTilingCompensationConfig {
  mode: "distance" | "edgeFade";
  edgeFadeStart?: number;
  edgeFadeEnd?: number;
  maxRepeatScale?: number;
  minRepeatScale?: number;
  sharpenNormalScale?: number;
  sharpenDisplacementScale?: number;
}

export interface SurfacePresetMaterialConfig {
  assetName: string;
  tintHex?: string;
  roughness?: number;
  metalness?: number;
  envMapIntensity?: number;
  repeatScale?: number;
  displacementScale?: number;
  displacementBias?: number;
  normalScale?: number;
  useShadowSide?: boolean;
  tilingCompensation?: SurfaceTilingCompensationConfig;
}

export interface SurfacePresetGeometryConfig {
  width: number;
  depth: number;
  thickness?: number;
}

export interface SurfacePresetRenderConfig {
  castShadow?: boolean;
  receiveShadow?: boolean;
  renderOrder?: number;
}

export interface SurfacePresetConfig {
  id: string;
  label: string;
  material: SurfacePresetMaterialConfig;
  geometry?: SurfacePresetGeometryConfig;
  render?: SurfacePresetRenderConfig;
  textureMode?: SurfacePresetTextureMode;
}

export interface SurfacePreset {
  id: string;
  label: string;
  material: SurfacePresetMaterialConfig;
  geometry?: SurfacePresetGeometryConfig;
  render: Required<SurfacePresetRenderConfig>;
  textureMode: SurfacePresetTextureMode;
}

export interface SurfaceMaterialBuildResult {
  material: THREE.MeshPhysicalMaterial;
  textureRepeat: number;
  tilingCompensation: SurfaceTilingCompensationConfig;
}

const DEFAULT_RENDER: Required<SurfacePresetRenderConfig> = {
  castShadow: true,
  receiveShadow: true,
  renderOrder: -20,
};

const DEFAULT_MATERIAL: Required<
  Pick<
    SurfacePresetMaterialConfig,
    | "tintHex"
    | "roughness"
    | "metalness"
    | "envMapIntensity"
    | "repeatScale"
    | "displacementScale"
    | "displacementBias"
    | "normalScale"
    | "useShadowSide"
  >
> = {
  tintHex: "#ffffff",
  roughness: 1,
  metalness: 0,
  envMapIntensity: 0.5,
  repeatScale: 40,
  displacementScale: 0.01,
  displacementBias: -0.005,
  normalScale: 1,
  useShadowSide: true,
};

const DEFAULT_TILING_COMPENSATION: SurfaceTilingCompensationConfig = {
  mode: "distance",
  edgeFadeStart: 0.68,
  edgeFadeEnd: 1,
  maxRepeatScale: 24,
  minRepeatScale: 10,
  sharpenNormalScale: 1.25,
  sharpenDisplacementScale: 0.008,
};

export const createSurfacePreset = (
  config: SurfacePresetConfig,
): SurfacePreset => {
  const material: SurfacePresetMaterialConfig = {
    ...DEFAULT_MATERIAL,
    ...config.material,
    tilingCompensation: {
      ...DEFAULT_TILING_COMPENSATION,
      ...config.material.tilingCompensation,
    },
  };

  const render: Required<SurfacePresetRenderConfig> = {
    ...DEFAULT_RENDER,
    ...config.render,
  };

  return {
    id: config.id,
    label: config.label,
    material,
    geometry: config.geometry,
    render,
    textureMode: config.textureMode ?? "texture",
  };
};

export const createTerrainSurfacePreset = () =>
  createSurfacePreset({
    id: "terrainGround",
    label: "Terrain Ground",
    material: {
      assetName: "rocky_terrain_2",
      tintHex: "#ffffff",
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.5,
      repeatScale: 40,
      displacementScale: 0.01,
      displacementBias: -0.005,
      normalScale: 1,
      useShadowSide: true,
      tilingCompensation: {
        mode: "distance",
        edgeFadeStart: 0.72,
        edgeFadeEnd: 1,
        maxRepeatScale: 20,
        minRepeatScale: 8,
        sharpenNormalScale: 1.4,
        sharpenDisplacementScale: 0.006,
      },
    },
    render: {
      castShadow: true,
      receiveShadow: true,
      renderOrder: -20,
    },
    textureMode: "texture",
  });

export const TERRAIN_SURFACE_PRESETS = {
  terrainGround: createTerrainSurfacePreset(),
} as const;

export const isSurfacePreset = (value: unknown): value is SurfacePreset => {
  if (!value || typeof value !== "object") return false;
  const preset = value as SurfacePreset;
  return typeof preset.id === "string" && typeof preset.label === "string";
};

export const cloneSurfacePreset = (preset: SurfacePreset): SurfacePreset => ({
  id: preset.id,
  label: preset.label,
  material: {
    ...preset.material,
    tilingCompensation: preset.material.tilingCompensation
      ? { ...preset.material.tilingCompensation }
      : undefined,
  },
  geometry: preset.geometry ? { ...preset.geometry } : undefined,
  render: { ...preset.render },
  textureMode: preset.textureMode,
});

export const getSurfacePresetRepeat = (preset: SurfacePreset): number =>
  preset.material.repeatScale ?? DEFAULT_MATERIAL.repeatScale;

export const getSurfacePresetTint = (preset: SurfacePreset): string =>
  preset.material.tintHex ?? DEFAULT_MATERIAL.tintHex;

export const getSurfacePresetMaterialDefaults = (
  preset: SurfacePreset,
): Required<
  Pick<
    SurfacePresetMaterialConfig,
    | "tintHex"
    | "roughness"
    | "metalness"
    | "envMapIntensity"
    | "repeatScale"
    | "displacementScale"
    | "displacementBias"
    | "normalScale"
    | "useShadowSide"
  >
> => ({
  ...DEFAULT_MATERIAL,
  ...preset.material,
});

export const getSurfaceTilingCompensation = (
  preset: SurfacePreset,
): SurfaceTilingCompensationConfig =>
  preset.material.tilingCompensation
    ? { ...DEFAULT_TILING_COMPENSATION, ...preset.material.tilingCompensation }
    : { ...DEFAULT_TILING_COMPENSATION };

export const getTerrainGroundPreset = (): SurfacePreset =>
  cloneSurfacePreset(TERRAIN_SURFACE_PRESETS.terrainGround);

export const buildSurfaceMaterial = (
  baseMaterial: THREE.MeshPhysicalMaterial,
  preset: SurfacePreset,
  repeatScale: number,
): SurfaceMaterialBuildResult => {
  const defaults = getSurfacePresetMaterialDefaults(preset);
  const compensation = getSurfaceTilingCompensation(preset);

  baseMaterial.color = new THREE.Color(defaults.tintHex);
  baseMaterial.roughness = defaults.roughness;
  baseMaterial.metalness = defaults.metalness;
  baseMaterial.envMapIntensity = defaults.envMapIntensity;

  return {
    material: baseMaterial,
    textureRepeat: Math.min(
      compensation.maxRepeatScale ?? repeatScale,
      Math.max(compensation.minRepeatScale ?? repeatScale, repeatScale),
    ),
    tilingCompensation: compensation,
  };
};

export const applySurfacePresetMaterialDefaults = (
  material: THREE.MeshPhysicalMaterial,
  preset: SurfacePreset,
): THREE.MeshPhysicalMaterial => {
  const defaults = getSurfacePresetMaterialDefaults(preset);
  material.color = new THREE.Color(defaults.tintHex);
  material.roughness = defaults.roughness;
  material.metalness = defaults.metalness;
  material.envMapIntensity = defaults.envMapIntensity;
  return material;
};
