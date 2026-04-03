import * as THREE from "three";
import { MaterialConfig } from "../entities/rooms/types";
import {
  createManagedMaterial,
  createReusableDrywallTexture,
  createTextureCache,
  type ManagedMaterialHandle,
  type DrywallTextureBundle,
} from "../features/textures/api";

const createTextureCacheKey = (
  namespace: string,
  flavor: string,
  seed: number,
) => [namespace, flavor, seed].join(":");

const drywallTextureCache = createTextureCache<DrywallTextureBundle>();

const managedMaterialCache = createTextureCache<ManagedMaterialHandle>();

const DEFAULT_DRYWALL_TEXTURE_OPTIONS = Object.freeze({
  size: 256,
  seed: 1337,
});

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

export const parseMaterial = (
  config: MaterialConfig,
): THREE.MeshPhysicalMaterial => {
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(config.albedo),
    roughness: config.roughness,
    metalness: config.metalness,
    normalScale: new THREE.Vector2(
      config.normalMapIntensity || 1,
      config.normalMapIntensity || 1,
    ),
    // PBR defaults for physical plausibility
    clearcoat: 0.1,
    clearcoatRoughness: 0.1,
  });

  const textureSet = getDrywallTextureSet();

  material.bumpMap = textureSet.bumpMap;
  material.bumpScale = config.normalMapIntensity || 1;

  material.normalMap = textureSet.normalMap;

  material.needsUpdate = true;

  const managed = createManagedMaterial(material);

  const cacheKey = getManagedMaterialKey(config);
  managedMaterialCache.set(cacheKey, managed);

  return managed.material;
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

  for (const key of drywallTextureCache.keys()) {
    const textureSet = drywallTextureCache.get(key);
    textureSet?.dispose?.();
    drywallTextureCache.delete(key);
  }
};

export const releaseParsedMaterial = (config: MaterialConfig): void => {
  const cacheKey = getManagedMaterialKey(config);
  const handle = managedMaterialCache.get(cacheKey);
  handle?.dispose();
  managedMaterialCache.delete(cacheKey);
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
