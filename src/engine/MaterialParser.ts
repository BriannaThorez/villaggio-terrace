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
import { textureLODHandler } from "../features/materialsEngine/TextureLODHandler";
import { STRUCTURAL_TEXTURES } from "../entities/rooms/structuralTextures";

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
  const { progressive, promise } = textureLODHandler.getBundleProgressiveSync(
    normalizeTextureName(textureName ?? fallbackTextureName), tintHex
  );

  const material = new THREE.MeshPhysicalMaterial({
    map: progressive.albedoMap,
    color: "#ffffff",
    aoMap: progressive.aoMap,
    roughnessMap: progressive.roughnessMap,
    metalnessMap: progressive.metalnessMap,
    normalMap: progressive.normalMap,
    displacementMap: progressive.displacementMap,
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
  
  // SWAP HEAVY TEXTURES LATER: Prevents main-thread/VRAM stall on room placement drag
  // PHASE 3.5 (Restored): Always attach the swapper to ensure reliability, 
  // but use Identity Protection to avoid the performance hitch on already-cached assets.
  promise.then((heavyBundle) => {
    // IDENTITY PROTECTION: If the material already has the high-res map (from cache hit), 
    // skip the update to avoid a shader re-compilation stall (The Hitch).
    if (material.map === heavyBundle.albedoMap) return;

    material.map = heavyBundle.albedoMap;
    material.aoMap = heavyBundle.aoMap;
    material.roughnessMap = heavyBundle.roughnessMap;
    material.metalnessMap = heavyBundle.metalnessMap;
    material.normalMap = heavyBundle.normalMap;
    material.displacementMap = heavyBundle.displacementMap;
    material.needsUpdate = true;
  });

  const managed = createManagedMaterial(material, [
    progressive.albedoMap,
    progressive.aoMap,
    progressive.normalMap,
    progressive.roughnessMap,
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

export interface RoomSurfaceMetadata {
  wallTexture?: string;
  floorTexture?: string;
  ceilingTexture?: string;
}

// Generic residential fallback textures (for roomMetadata-driven rooms with no surface override)
const RESIDENTIAL_FALLBACK = {
  wall:    "beige_wall_1",
  floor:   "wood_floor_1",
  ceiling: "beige_wall_1",
} as const;

/**
 * Shared glass singleton — transmission glass requires a dedicated GPU render pass.
 * Creating a new MeshPhysicalMaterial({ transmission }) on every call forces a fresh
 * shader compilation on each placement. One cached instance is shared across all rooms.
 */
let _glassMaterialSingleton: THREE.MeshPhysicalMaterial | null = null;
export const getGlassMaterial = (): THREE.MeshPhysicalMaterial => {
  if (_glassMaterialSingleton) return _glassMaterialSingleton;
  _glassMaterialSingleton = new THREE.MeshPhysicalMaterial({
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
  return _glassMaterialSingleton;
};

export const getRoomMaterialsFromMetadata = (metadata?: RoomSurfaceMetadata): THREE.Material[] => {
  const wallTex    = metadata?.wallTexture    || RESIDENTIAL_FALLBACK.wall;
  const floorTex   = metadata?.floorTexture   || RESIDENTIAL_FALLBACK.floor;
  const ceilingTex = metadata?.ceilingTexture || RESIDENTIAL_FALLBACK.ceiling;

  const wall = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    wallTexture: wallTex,
  });
  const floor = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    floorTexture: floorTex,
  });
  const ceiling = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    ceilingTexture: ceilingTex,
  });
  return [wall, wall, floor, ceiling, wall, wall];
};

export const getEmptyFloorMaterials = (): THREE.Material[] => {
  const tx = STRUCTURAL_TEXTURES.emptyFloor;
  const wall = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    wallTexture: tx.wall,
  });
  const floor = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    floorTexture: tx.floor!,
  });
  const ceiling = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    ceilingTexture: tx.ceiling!,
  });
  return [wall, wall, floor, ceiling, wall, wall];
};

export const getLobbyMaterials = (): THREE.Material[] => {
  const tx = STRUCTURAL_TEXTURES.lobby;
  const wall = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    wallTexture: tx.wall,
  });
  const floor = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    floorTexture: tx.floor!,
  });
  const ceiling = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    ceilingTexture: tx.ceiling!,
  });
  return [wall, wall, floor, ceiling, wall, wall];
};

export const getStructuralConcreteMaterials = () => {
  const tx = STRUCTURAL_TEXTURES.structure;
  const fr = STRUCTURAL_TEXTURES.structureFrame;
  const wall = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    wallTexture: tx.wall,
  });
  const floor = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    floorTexture: tx.floor!,
  });
  const ceiling = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    ceilingTexture: tx.ceiling!,
  });
  const frameMaterial = parseRoomMaterial({
    albedo: "#808080",
    roughness: 0.3,
    metalness: 0.8,
    wallTexture: fr.wall,
  });
  const glassMaterial = getGlassMaterial();
  return { frameMaterial, glassMaterial, ceiling, floor, wall };
};

export const getEmptyRoomMaterials = () => {
  const tx = STRUCTURAL_TEXTURES.emptyRoom;
  const fr = STRUCTURAL_TEXTURES.structureFrame;
  const frameMaterial = parseRoomMaterial({
    albedo: "#808080",
    roughness: 0.3,
    metalness: 0.8,
    wallTexture: fr.wall,
  });
  const wallMaterial = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    wallTexture: tx.wall,
  });
  const floorMaterial = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 0.9,
    metalness: 0.0,
    floorTexture: tx.floor!,  // FIX: was concrete_wall_1 (bug), correct is concrete_floor_1
  });
  const glassMaterial = getGlassMaterial();
  return { frameMaterial, glassMaterial, wallMaterial, floorMaterial };
};

export const getStructuralShellMaterials = () => {
  const tx = STRUCTURAL_TEXTURES.structure;
  const wallMaterial = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    wallTexture: tx.wall,
  });
  const floorMaterial = parseRoomMaterial({
    albedo: "#ffffff",
    roughness: 1.0,
    metalness: 0.0,
    floorTexture: tx.floor!,
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
