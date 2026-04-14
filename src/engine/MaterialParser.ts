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
import { getTextureBundle } from "../features/materialsEngine/presets/materials";

type RoomSurfaceTextureKey = "wallTexture" | "floorTexture" | "ceilingTexture";

type RoomSurfaceTextureMap = Partial<Record<RoomSurfaceTextureKey, string>>;

type RoomMaterialConfig = MaterialConfig & RoomSurfaceTextureMap;

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

const getRoomMaterialKey = (config: RoomMaterialConfig) =>
  [
    "room-material",
    config.albedo,
    config.roughness,
    config.metalness,
    config.wallTexture ?? "",
    config.floorTexture ?? "",
    config.ceilingTexture ?? "",
  ].join(":");

const getAssetMaterialKey = (assetName: string, tintHex: string) =>
  ["asset-material", assetName, tintHex].join(":");

const normalizeTextureName = (textureName: string): string => {
  if (textureName === "painted_plaster_wall") {
    return "beige_wall_1";
  }
  return textureName;
};

const getSurfaceTextureName = (
  config: RoomMaterialConfig,
): string | undefined =>
  config.wallTexture ?? config.floorTexture ?? config.ceilingTexture;

const createRoomSurfaceMaterial = (
  textureName: string,
  tintHex: string,
  fallbackTextureName: string,
) => {
  const bundle = getTextureBundle(
    normalizeTextureName(textureName ?? fallbackTextureName),
  );

  const material = new THREE.MeshPhysicalMaterial({
    map: bundle.albedoMap,
    color: "#ffffff",
    aoMap: bundle.aoMap,
    roughnessMap: bundle.roughnessMap,
    metalnessMap: bundle.metalnessMap,
    normalMap: bundle.normalMap,
    displacementMap: bundle.displacementMap,
    displacementScale: 0.01,
    displacementBias: -0.005,
    side: THREE.FrontSide,
    shadowSide: THREE.BackSide,
    roughness: 0.95,
    metalness: 0.0,
    envMapIntensity: 0.2,
  });

  applyTriplanarProjection(material, {
    scale: 0.05,
    detailScale: 5,
    detailIntensity: 0.3,
  });

  material.aoMapIntensity = 1.8;
  material.needsUpdate = true;

  const managed = createManagedMaterial(material, [
    bundle.albedoMap,
    bundle.aoMap,
    bundle.normalMap,
    bundle.roughnessMap,
  ]);

  return managed.material as THREE.MeshPhysicalMaterial;
};

export const parseMaterial = (
  config: MaterialConfig,
): THREE.MeshPhysicalMaterial => {
  const cacheKey = getManagedMaterialKey(config);
  const existing = managedMaterialCache.get(cacheKey);
  if (existing) {
    return existing.material as THREE.MeshPhysicalMaterial;
  }

  const material = new THREE.MeshPhysicalMaterial({
    color: config.albedo,
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

/**
 * ARCHITECTURAL PIPELINE (Fancy):
 * Used for structural components (walls, lobby shells).
 * Applies displacement and high-intensity AO for realistic architectural depth.
 */
export const parseRoomMaterial = (
  config: RoomMaterialConfig,
): THREE.MeshPhysicalMaterial => {
  const cacheKey = getRoomMaterialKey(config);
  const existing = roomMaterialCache.get(cacheKey);
  if (existing) {
    return existing.material as THREE.MeshPhysicalMaterial;
  }

  const textureBundle = getPaintedPlasterBundle();

  const material = config.floorTexture
    ? createRoomSurfaceMaterial(
      config.floorTexture,
      config.albedo,
      "wood_floor_1",
    )
    : config.wallTexture || config.ceilingTexture
      ? createRoomSurfaceMaterial(
        config.wallTexture ?? config.ceilingTexture ?? "beige_wall_1",
        config.albedo,
        "beige_wall_1",
      )
      : new THREE.MeshPhysicalMaterial({
        map: textureBundle.albedoMap,
        color: "#ffffff",
        aoMap: textureBundle.aoMap,
        roughnessMap: textureBundle.roughnessMap,
        metalnessMap: textureBundle.metalnessMap,
        clearcoat: 0.25,
        clearcoatRoughness: 0.4,
        envMapIntensity: 0.1,
        roughness: 0.98,
        metalness: 0.0,
        side: THREE.FrontSide,
      });

  if (!config.floorTexture && !config.wallTexture && !config.ceilingTexture) {
    material.aoMapIntensity = 1.6;
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
  }

  material.needsUpdate = true;

  const managed = createManagedMaterial(material, [
    material.map,
    material.aoMap,
    material.roughnessMap,
    material.metalnessMap,
    material.normalMap,
    material.displacementMap,
  ]);

  roomMaterialCache.set(cacheKey, managed);
  return managed.material as THREE.MeshPhysicalMaterial;
};

export const getResidentialMaterials = (): THREE.Material[] => {
  const wall = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    wallTexture: "beige_wall_1",
  });
  const floor = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    floorTexture: "wood_floor_1",
  });
  const ceiling = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    ceilingTexture: "beige_wall_1",
  });
  return [wall, wall, floor, ceiling, wall, wall];
};

export const getEmptyFloorMaterials = (): THREE.Material[] => {
  const wall = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    wallTexture: "concrete_wall_1",
  });
  const floor = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    floorTexture: "concrete_floor_1",
  });
  const ceiling = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    ceilingTexture: "concrete_wall_1",
  });
  return [wall, wall, floor, ceiling, wall, wall];
};

export const getLobbyMaterials = (): THREE.Material[] => {
  const wall = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    wallTexture: "beige_wall_1",
  });
  const floor = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    floorTexture: "grey_cartago_tiles",
  });
  const ceiling = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    ceilingTexture: "concrete_wall_1",
  });
  return [wall, wall, floor, ceiling, wall, wall];
};

export const getStructuralConcreteMaterials = () => {
  const wall = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    wallTexture: "concrete_wall_1",
  });
  const floor = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    floorTexture: "concrete_floor_1",
  });
  const ceiling = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    ceilingTexture: "concrete_wall_1",
  });
  const frameMaterial = parseRoomMaterial({
    albedo: "#808080",
    roughness: 0.3,
    metalness: 0.8,
    wallTexture: "concrete_wall_1",
  });
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: "#8090A0",
    metalness: 0.9,
    roughness: 0.05,
    transmission: 0.95,
    opacity: 0.2,
    transparent: true,
    ior: 1.5,
    thickness: 0.1,
    side: THREE.DoubleSide,
  });
  return { frameMaterial, glassMaterial, ceiling, floor, wall };
};

export const getEmptyRoomMaterials = () => {
  const frameMaterial = parseRoomMaterial({
    albedo: "#808080",
    roughness: 0.3,
    metalness: 0.8,
    wallTexture: "concrete_wall_1",
  });
  const wallMaterial = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    wallTexture: "concrete_wall_1",
  });
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: "#8090A0",
    metalness: 0.9,
    roughness: 0.05,
    transmission: 0.95,
    opacity: 0.2,
    transparent: true,
    ior: 1.5,
    thickness: 0.1,
    side: THREE.DoubleSide,
  });
  return { frameMaterial, glassMaterial, wallMaterial };
};

export const getStructuralShellMaterials = () => {
  const wallMaterial = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    wallTexture: "concrete_wall_1",
  });
  const floorMaterial = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    floorTexture: "concrete_floor_1",
  });
  return { wallMaterial, floorMaterial };
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

export const releaseParsedRoomMaterial = (config: RoomMaterialConfig): void => {
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
