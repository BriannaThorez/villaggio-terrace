import * as THREE from "three";
import { MaterialConfig } from "../entities/rooms/types";
import {
  applyTriplanarProjection,
  createManagedMaterial,
  createReusableDrywallTexture,
  createTextureCache,
  type DrywallTextureBundle,
  type ManagedMaterialHandle,
} from "../features/materialsEngine/api";
import {
  disposePaintedPlasterBundles,
  getPaintedPlasterBundle,
} from "../features/materialsEngine/presets/paintedPlaster";

const SALMON_TINT = new THREE.Color(0xf7b8ae);


const drywallTextureCache = createTextureCache<DrywallTextureBundle>();
const managedMaterialCache = createTextureCache<ManagedMaterialHandle>();
const roomMaterialCache = createTextureCache<ManagedMaterialHandle>();

const DEFAULT_DRYWALL_TEXTURE_OPTIONS = Object.freeze({
  size: 256,
  seed: 1337,
});

const createTextureCacheKey = (
  namespace: string,
  flavor: string,
  seed: number,
) => [namespace, flavor, seed].join(":");

const getDrywallTextureSet = () => {
  const options = DEFAULT_DRYWALL_TEXTURE_OPTIONS;
  const cacheKey = createTextureCacheKey("drywall", "normal", options.seed);

  const existing = drywallTextureCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const textureSet = createReusableDrywallTexture({
    size: options.size,
    seed: options.seed,
  });

  drywallTextureCache.set(cacheKey, textureSet);
  return textureSet;
};

const getManagedMaterialKey = (config: MaterialConfig) =>
  ["material", config.albedo, config.roughness, config.metalness].join(":");

const getRoomMaterialKey = (config: MaterialConfig) =>
  ["room-material", config.albedo, config.roughness, config.metalness].join(":");

export const parseMaterial = (
  config: MaterialConfig,
): THREE.MeshPhysicalMaterial => {
  const cacheKey = getManagedMaterialKey(config);
  const existing = managedMaterialCache.get(cacheKey);
  if (existing) {
    return existing.material as THREE.MeshPhysicalMaterial;
  }

  const color = new THREE.Color(config.albedo);
  const material = new THREE.MeshPhysicalMaterial({
    color,
    clearcoat: 0.3,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.45,
    roughness: 0.65,
    metalness: 0.0,
    side: THREE.FrontSide,
    flatShading: false,
  });

  const textureSet = getDrywallTextureSet();
  material.normalMap = textureSet.normalMap;
  material.normalScale = new THREE.Vector2(0.6, 0.6);
  material.bumpMap = textureSet.bumpMap;
  material.bumpScale = 0.005;
  material.needsUpdate = true;

  const managed = createManagedMaterial(material, [
    textureSet.bumpMap,
    textureSet.normalMap,
  ]);

  managedMaterialCache.set(cacheKey, managed);
  return managed.material as THREE.MeshPhysicalMaterial;
};

export const parseRoomMaterial = (
  config: MaterialConfig,
): THREE.MeshPhysicalMaterial => {
  const cacheKey = getRoomMaterialKey(config);
  const existing = roomMaterialCache.get(cacheKey);
  if (existing) {
    return existing.material as THREE.MeshPhysicalMaterial;
  }

  const textureBundle = getPaintedPlasterBundle();
  const baseColor = new THREE.Color(config.albedo).lerp(SALMON_TINT, 0.45);

  const material = new THREE.MeshPhysicalMaterial({
    color: baseColor,
    map: textureBundle.albedoMap,
    aoMap: textureBundle.aoMap,
    roughnessMap: textureBundle.roughnessMap,
    metalnessMap: textureBundle.metalnessMap,
    clearcoat: 0.25,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.55,
    roughness: 0.84,
    metalness: 0.0,
    side: THREE.FrontSide,
  });

  material.aoMapIntensity = 1.0;
  material.normalMap = textureBundle.normalMap;
  material.normalScale = new THREE.Vector2(0.85, 0.85);
  material.displacementMap = textureBundle.displacementMap;
  material.displacementScale = 0.015;
  material.displacementBias = -0.005;

  applyTriplanarProjection(material, {
    scale: 0.058,
    detailScale: 6,
    detailIntensity: 0.42,
  });

  material.needsUpdate = true;



  const managed = createManagedMaterial(material, [
    textureBundle.albedoMap,
    textureBundle.aoMap,
    textureBundle.roughnessMap,
    textureBundle.metalnessMap,
    textureBundle.normalMap,
    textureBundle.displacementMap,
  ]);

  roomMaterialCache.set(cacheKey, managed);
  return managed.material as THREE.MeshPhysicalMaterial;
};

export const disposeParsedMaterial = (
  material?: THREE.Material | null,
): void => {
  if (!material) return;
  material.dispose();
};

export const disposeParsedMaterialWithTextures = (
  material?: THREE.Material | null,
  textures?: Array<THREE.Texture | null | undefined>,
): void => {
  if (textures) {
    for (const texture of textures) {
      texture?.dispose();
    }
  }
  if (material) {
    material.dispose();
  }
};

export const disposeAllParsedMaterialCaches = (): void => {
  for (const key of managedMaterialCache.keys()) {
    const handle = managedMaterialCache.get(key);
    handle?.dispose();
    managedMaterialCache.delete(key);
  }
  for (const key of roomMaterialCache.keys()) {
    const handle = roomMaterialCache.get(key);
    handle?.dispose();
    roomMaterialCache.delete(key);
  }
  for (const key of drywallTextureCache.keys()) {
    const textureSet = drywallTextureCache.get(key);
    textureSet?.dispose?.();
    drywallTextureCache.delete(key);
  }
  disposePaintedPlasterBundles();
};

export const releaseParsedMaterial = (config: MaterialConfig): void => {
  const cacheKey = getManagedMaterialKey(config);
  const handle = managedMaterialCache.get(cacheKey);
  handle?.dispose();
  managedMaterialCache.delete(cacheKey);
};

export const releaseParsedRoomMaterial = (config: MaterialConfig): void => {
  const cacheKey = getRoomMaterialKey(config);
  const handle = roomMaterialCache.get(cacheKey);
  handle?.dispose();
  roomMaterialCache.delete(cacheKey);
};

export const createRoomMaterialCleanup = (
  material: THREE.Material,
  textures?: Array<THREE.Texture | null | undefined>,
) => ({
  material,
  dispose: () => {
    for (const texture of textures ?? []) {
      texture?.dispose();
    }
    material.dispose();
  },
});

export const createMaterialLifecycle = createRoomMaterialCleanup;
