import * as THREE from "three";

export interface TerrainSurfaceTextureSet {
  albedoMap: THREE.Texture;
  aoMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
  metalnessMap?: THREE.Texture;
  normalMap?: THREE.Texture;
  displacementMap?: THREE.Texture;
}

export interface TerrainSurfaceMaterialOptions {
  color?: string;
  repeat?: number;
  roughness?: number;
  metalness?: number;
  envMapIntensity?: number;
  displacementScale?: number;
  displacementBias?: number;
  normalScale?: [number, number];
}

export interface TerrainSurfacePreset {
  name: string;
  texturePath: string;
  materialOptions: Required<Omit<TerrainSurfaceMaterialOptions, "normalScale">> & {
    normalScale: [number, number];
  };
}

export const rockyTerrain2Preset: TerrainSurfacePreset = {
  name: "rocky_terrain_2",
  texturePath: "src/assets/textures/rocky_terrain_2",
  materialOptions: {
    color: "#ffffff",
    repeat: 40,
    roughness: 1.0,
    metalness: 0.0,
    envMapIntensity: 0.5,
    displacementScale: 0.01,
    displacementBias: -0.005,
    normalScale: [1, 1],
  },
};

export default rockyTerrain2Preset;
