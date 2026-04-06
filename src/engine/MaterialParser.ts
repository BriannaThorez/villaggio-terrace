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
    // ARCHITECTURAL REFINEMENT: Re-enabling subtle micro-texture
    // Balancing "Solid" aesthetic with "Drywall" physical depth
    clearcoat: 0.3, // Reduced from 0.6 for a less "glossy" rainy look
    clearcoatRoughness: 0.2, // Rougher clearcoat for diffuse light
    envMapIntensity: 0.45, // SLASHED from 1.2 to match "Seattle" overcast gloom
    roughness: 0.65, // Increased slightly to dampen grit flickering
    metalness: 0.0
  });

  const textureSet = getDrywallTextureSet();

  // PROPER NORMAL MAPPING: Lighting now creates the "spots"
  // Using the new RGB Normal Map at standard scale [1.0, 1.0]
  material.normalMap = textureSet.normalMap;
  material.normalScale = new THREE.Vector2(0.6, 0.6);

  // Using BumpMap only for micro-depth occlusion
  material.bumpMap = textureSet.bumpMap;
  material.bumpScale = 0.005;

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
