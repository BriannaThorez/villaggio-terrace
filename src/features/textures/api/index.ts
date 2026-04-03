import * as THREE from "three";

export interface TextureCacheOptions {
  maxEntries: number;
  ttlMs: number;
}

export const createTextureCache = <T>() => {
  const entries = new Map<string, T>();
  const lastAccessed = new Map<string, number>();
  let evictionTimer: ReturnType<typeof setInterval> | undefined;

  const now = () => Date.now();

  const touch = (key: string) => {
    lastAccessed.set(key, now());
  };

  const prune = (maxEntries: number, ttlMs: number) => {
    const cutoff = now() - ttlMs;

    for (const [key, accessedAt] of lastAccessed) {
      if (accessedAt < cutoff && entries.has(key)) {
        entries.delete(key);
        lastAccessed.delete(key);
      }
    }

    while (entries.size > maxEntries) {
      let oldestKey: string | undefined;
      let oldestAt = Number.POSITIVE_INFINITY;

      for (const [key, accessedAt] of lastAccessed) {
        if (!entries.has(key)) continue;
        if (accessedAt < oldestAt) {
          oldestAt = accessedAt;
          oldestKey = key;
        }
      }

      if (!oldestKey) {
        break;
      }

      entries.delete(oldestKey);
      lastAccessed.delete(oldestKey);
    }
  };

  return {
    get: (key: string) => {
      const value = entries.get(key);
      if (value !== undefined) {
        touch(key);
      }
      return value;
    },
    set: (key: string, value: T) => {
      entries.set(key, value);
      touch(key);
    },
    has: (key: string) => entries.has(key),
    keys: () => entries.keys(),
    delete: (key: string) => {
      entries.delete(key);
      lastAccessed.delete(key);
    },
    clear: () => {
      entries.clear();
      lastAccessed.clear();
      if (evictionTimer) {
        clearInterval(evictionTimer);
        evictionTimer = undefined;
      }
    },
    prune,
    ensureEvictionTimer: (options: TextureCacheOptions) => {
      if (evictionTimer) {
        return;
      }

      evictionTimer = setInterval(() => {
        prune(options.maxEntries, options.ttlMs);
      }, options.ttlMs);

      if (typeof evictionTimer.unref === "function") {
        evictionTimer.unref();
      }
    },
  };
};

export type TextureKind = "bump" | "normal";

export interface DrywallTextureDescriptor {
  kind: "drywall";
  size: number;
  seed: number;
  variant: "default" | "fine" | "coarse";
  tint: string;
  repeat: number;
  cacheScope: string;
}

export interface DrywallTextureParams {
  size?: number;
  seed?: number;
  scale?: number;
  intensity?: number;
  colorSpace?: THREE.ColorSpace;
}

export interface DrywallTextureBundle {
  bumpMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  dispose: () => void;
}

export interface ManagedMaterialHandle<
  T extends THREE.Material = THREE.Material,
> {
  material: T;
  dispose: () => void;
}

const DEFAULT_SIZE = 256;
const DEFAULT_MAX_BUNDLE_REFS = 64;
const DEFAULT_TTL_MS = 10 * 60 * 1000;

const createSeededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const drawDrywallNoise = (
  context: CanvasRenderingContext2D,
  size: number,
  seed: number,
  scale: number,
  intensity: number,
) => {
  const random = createSeededRandom(seed);
  const image = context.createImageData(size, size);
  const data = image.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;

      const baseNoise = (random() - 0.5) * 2;
      const grain = (random() - 0.5) * 0.25;
      const streak = Math.sin((x / size) * Math.PI * scale * 2) * 0.03;
      const pore = Math.cos((y / size) * Math.PI * scale * 3) * 0.02;

      const value =
        0.5 + (baseNoise * 0.08 + grain * 0.05 + streak + pore) * intensity;
      const clamped = Math.max(0, Math.min(1, value));
      const channel = Math.round(clamped * 255);

      data[index] = channel;
      data[index + 1] = channel;
      data[index + 2] = channel;
      data[index + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
};

const canvasToTexture = (
  canvas: HTMLCanvasElement,
  colorSpace?: THREE.ColorSpace,
) => {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  texture.colorSpace = colorSpace ?? THREE.NoColorSpace;
  return texture;
};

const createTextureCanvas = (
  size: number,
  seed: number,
  scale: number,
  intensity: number,
) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error(
      "Unable to create 2D context for drywall texture generation.",
    );
  }

  drawDrywallNoise(context, size, seed, scale, intensity);
  return canvas;
};

const disposeTexture = (texture?: THREE.Texture | null): void => {
  if (!texture) return;
  texture.dispose();
};

const textureBundleCache = new Map<string, DrywallTextureBundle>();
const textureBundleRefCounts = new Map<string, number>();
const textureBundleLastAccessed = new Map<string, number>();
let evictionTimer: ReturnType<typeof setInterval> | undefined;

const nowMs = () => Date.now();

const ensureEvictionTimer = () => {
  if (evictionTimer) return;

  evictionTimer = setInterval(() => {
    pruneExpiredTextureBundles();
  }, DEFAULT_TTL_MS);
  if (typeof evictionTimer.unref === "function") {
    evictionTimer.unref();
  }
};

const stopEvictionTimerIfIdle = () => {
  if (
    evictionTimer &&
    textureBundleCache.size === 0 &&
    textureBundleRefCounts.size === 0
  ) {
    clearInterval(evictionTimer);
    evictionTimer = undefined;
  }
};

const evictTextureBundle = (key: string) => {
  const bundle = textureBundleCache.get(key);
  if (!bundle) return;

  bundle.dispose();
  textureBundleCache.delete(key);
  textureBundleRefCounts.delete(key);
  textureBundleLastAccessed.delete(key);
};

const pruneExpiredTextureBundles = () => {
  const cutoff = nowMs() - DEFAULT_TTL_MS;

  for (const [key, accessedAt] of textureBundleLastAccessed) {
    const refCount = textureBundleRefCounts.get(key) ?? 0;
    if (refCount > 0) continue;
    if (accessedAt > cutoff) continue;
    evictTextureBundle(key);
  }

  while (textureBundleCache.size > DEFAULT_MAX_BUNDLE_REFS) {
    let oldestKey: string | undefined;
    let oldestAt = Number.POSITIVE_INFINITY;

    for (const [key, accessedAt] of textureBundleLastAccessed) {
      const refCount = textureBundleRefCounts.get(key) ?? 0;
      if (refCount > 0) continue;
      if (accessedAt < oldestAt) {
        oldestAt = accessedAt;
        oldestKey = key;
      }
    }

    if (!oldestKey) {
      break;
    }

    evictTextureBundle(oldestKey);
  }

  stopEvictionTimerIfIdle();
};

const retainTextureBundle = (key: string) => {
  textureBundleRefCounts.set(key, (textureBundleRefCounts.get(key) ?? 0) + 1);
  textureBundleLastAccessed.set(key, nowMs());
  ensureEvictionTimer();
};

const releaseTextureBundle = (key: string) => {
  const current = textureBundleRefCounts.get(key) ?? 0;
  if (current <= 1) {
    textureBundleRefCounts.delete(key);
    textureBundleLastAccessed.set(key, nowMs());
    pruneExpiredTextureBundles();
    return;
  }

  textureBundleRefCounts.set(key, current - 1);
  textureBundleLastAccessed.set(key, nowMs());
};

export const disposeAllTextureBundles = (): void => {
  for (const key of Array.from(textureBundleCache.keys())) {
    evictTextureBundle(key);
  }
  textureBundleRefCounts.clear();
  textureBundleLastAccessed.clear();
  stopEvictionTimerIfIdle();
};

const resolveTextureScale = (variant: DrywallTextureDescriptor["variant"]) => {
  switch (variant) {
    case "fine":
      return 0.9;
    case "coarse":
      return 1.1;
    default:
      return 1.0;
  }
};

const resolveTextureIntensity = (
  variant: DrywallTextureDescriptor["variant"],
) => {
  switch (variant) {
    case "fine":
      return 0.18;
    case "coarse":
      return 0.24;
    default:
      return 0.2;
  }
};

const buildTextureParams = (
  descriptor: DrywallTextureDescriptor,
): DrywallTextureParams => ({
  size: descriptor.size,
  seed: descriptor.seed,
  scale: resolveTextureScale(descriptor.variant),
  intensity: resolveTextureIntensity(descriptor.variant),
  colorSpace: THREE.NoColorSpace,
});

export const createDrywallTextureBundle = (
  params: DrywallTextureParams = {},
): DrywallTextureBundle => {
  const size = params.size ?? DEFAULT_SIZE;
  const seed = params.seed ?? 1337;
  const scale = params.scale ?? 1;
  const intensity = params.intensity ?? 1;
  const colorSpace = params.colorSpace ?? THREE.NoColorSpace;

  const bumpCanvas = createTextureCanvas(size, seed, scale, intensity);
  const normalCanvas = createTextureCanvas(size, seed + 1, scale, intensity);

  const bumpMap = canvasToTexture(bumpCanvas, THREE.NoColorSpace);
  const normalMap = canvasToTexture(normalCanvas, THREE.NoColorSpace);

  normalMap.name = "drywall-normal-map";
  bumpMap.name = "drywall-bump-map";

  return {
    bumpMap,
    normalMap,
    dispose: () => {
      disposeTexture(bumpMap);
      disposeTexture(normalMap);
    },
  };
};

export const createReusableDrywallTexture = (params?: DrywallTextureParams) =>
  createDrywallTextureBundle(params);

export const makeDrywallTextureKey = (params: DrywallTextureParams) =>
  [
    params.size ?? DEFAULT_SIZE,
    params.seed ?? 1337,
    params.scale ?? 1,
    params.intensity ?? 1,
  ].join(":");

export const makeDrywallDescriptorKey = (
  descriptor: DrywallTextureDescriptor,
) =>
  [
    descriptor.kind,
    descriptor.cacheScope,
    descriptor.size,
    descriptor.seed,
    descriptor.variant,
    descriptor.tint,
    descriptor.repeat,
  ].join(":");

export const createReusableDrywallTextureBundle = (
  descriptor: DrywallTextureDescriptor,
) => {
  const cacheKey = makeDrywallDescriptorKey(descriptor);
  const cached = textureBundleCache.get(cacheKey);
  if (cached) {
    retainTextureBundle(cacheKey);
    return cached;
  }

  const bundle = createDrywallTextureBundle(buildTextureParams(descriptor));
  textureBundleCache.set(cacheKey, bundle);
  retainTextureBundle(cacheKey);
  return bundle;
};

export const releaseReusableDrywallTextureBundle = (
  descriptor: DrywallTextureDescriptor,
): void => {
  const cacheKey = makeDrywallDescriptorKey(descriptor);
  releaseTextureBundle(cacheKey);
};

export const getOrCreateReusableDrywallTexture = (
  params?: DrywallTextureParams,
): DrywallTextureBundle => {
  const normalized = params ?? {};
  const key = makeDrywallTextureKey(normalized);

  const cached = textureBundleCache.get(key);
  if (cached) {
    retainTextureBundle(key);
    return cached;
  }

  const bundle = createDrywallTextureBundle(normalized);
  textureBundleCache.set(key, bundle);
  retainTextureBundle(key);
  return bundle;
};

export const releaseReusableDrywallTexture = (
  params?: DrywallTextureParams,
): void => {
  const key = makeDrywallTextureKey(params ?? {});

  releaseTextureBundle(key);
};

export const withReusableDrywallTexture = <T>(
  params: DrywallTextureParams | undefined,
  fn: (bundle: DrywallTextureBundle) => T,
): T => {
  const bundle = getOrCreateReusableDrywallTexture(params);
  try {
    return fn(bundle);
  } finally {
    releaseReusableDrywallTexture(params);
  }
};

export const createManagedMaterial = <T extends THREE.Material>(
  material: T,
  textures?: Array<THREE.Texture | null | undefined>,
): ManagedMaterialHandle<T> => {
  let disposed = false;

  return {
    material,
    dispose: () => {
      if (disposed) return;
      disposed = true;

      for (const texture of textures ?? []) {
        disposeTexture(texture);
      }
      material.dispose();
    },
  };
};

export const createManagedRoomMaterial = (
  material: THREE.Material,
  textures?: Array<THREE.Texture | null | undefined>,
) => createManagedMaterial(material, textures);

export const createManagedMaterialFromBundle = (
  material: THREE.Material,
  bundle: DrywallTextureBundle,
) => createManagedMaterial(material, [bundle.bumpMap, bundle.normalMap]);

export const disposeMaterial = (
  material?: THREE.Material | null,
  textures?: Array<THREE.Texture | null | undefined>,
): void => {
  if (!material) {
    for (const texture of textures ?? []) {
      disposeTexture(texture);
    }
    return;
  }

  for (const texture of textures ?? []) {
    disposeTexture(texture);
  }
  material.dispose();
};

export const createRoomMaterialDisposer = (
  material: THREE.Material,
  textures?: Array<THREE.Texture | null | undefined>,
) => ({
  material,
  dispose: () => disposeMaterial(material, textures),
});

export const createRoomMaterialLifecycle = createRoomMaterialDisposer;

export const createSafeMaterialDisposer = (
  material: THREE.Material,
  textures?: Array<THREE.Texture | null | undefined>,
) => createRoomMaterialDisposer(material, textures);
