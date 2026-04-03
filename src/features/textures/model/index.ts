import * as THREE from "three";

export type TextureKind = "drywall";
export type TextureVariant = "bump" | "normal";

export interface TextureDimensions {
  readonly width: number;
  readonly height: number;
}

export interface TextureSampling {
  readonly repeat: number;
  readonly anisotropy: number;
  readonly colorSpace: THREE.ColorSpace;
}

export interface TextureNoiseProfile {
  readonly seed: number;
  readonly scale: number;
  readonly intensity: number;
}

export interface DrywallTextureDescriptor {
  readonly kind: TextureKind;
  readonly variant: TextureVariant;
  readonly dimensions: TextureDimensions;
  readonly noise: TextureNoiseProfile;
  readonly sampling: TextureSampling;
}

export interface DrywallTextureBundleDescriptor {
  readonly kind: TextureKind;
  readonly dimensions: TextureDimensions;
  readonly bump: TextureNoiseProfile;
  readonly normal: TextureNoiseProfile;
  readonly sampling: TextureSampling;
}

export interface TextureCacheKeyParts {
  readonly kind: TextureKind;
  readonly variant: TextureVariant;
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly scale: number;
  readonly intensity: number;
  readonly repeat: number;
  readonly anisotropy: number;
  readonly colorSpace: THREE.ColorSpace;
}

export type TextureCacheKey = string;

export const DEFAULT_TEXTURE_DIMENSIONS: TextureDimensions = {
  width: 256,
  height: 256,
};

export const DEFAULT_TEXTURE_SAMPLING: TextureSampling = {
  repeat: 1,
  anisotropy: 4,
  colorSpace: THREE.NoColorSpace,
};

export const DEFAULT_DRYWALL_BUMP_PROFILE: TextureNoiseProfile = {
  seed: 1337,
  scale: 1,
  intensity: 1,
};

export const DEFAULT_DRYWALL_NORMAL_PROFILE: TextureNoiseProfile = {
  seed: 1338,
  scale: 1,
  intensity: 1,
};

export const DEFAULT_DRYWALL_TEXTURE_DESCRIPTOR: DrywallTextureDescriptor = {
  kind: "drywall",
  variant: "bump",
  dimensions: DEFAULT_TEXTURE_DIMENSIONS,
  noise: DEFAULT_DRYWALL_BUMP_PROFILE,
  sampling: DEFAULT_TEXTURE_SAMPLING,
};

export const DEFAULT_DRYWALL_TEXTURE_BUNDLE_DESCRIPTOR: DrywallTextureBundleDescriptor =
  {
    kind: "drywall",
    dimensions: DEFAULT_TEXTURE_DIMENSIONS,
    bump: DEFAULT_DRYWALL_BUMP_PROFILE,
    normal: DEFAULT_DRYWALL_NORMAL_PROFILE,
    sampling: DEFAULT_TEXTURE_SAMPLING,
  };

const normalizeDimension = (value: number | undefined, fallback: number) => {
  const normalized = value ?? fallback;
  return Number.isFinite(normalized) && normalized > 0
    ? Math.floor(normalized)
    : fallback;
};

const normalizeNumber = (value: number | undefined, fallback: number) => {
  const normalized = value ?? fallback;
  return Number.isFinite(normalized) ? normalized : fallback;
};

const normalizeColorSpace = (value: THREE.ColorSpace | undefined) =>
  value ?? DEFAULT_TEXTURE_SAMPLING.colorSpace;

export const createTextureDimensions = (
  width: number,
  height: number,
): TextureDimensions => ({
  width: normalizeDimension(width, DEFAULT_TEXTURE_DIMENSIONS.width),
  height: normalizeDimension(height, DEFAULT_TEXTURE_DIMENSIONS.height),
});

export const createDrywallTextureDescriptor = (
  descriptor: Partial<DrywallTextureDescriptor> = {},
): DrywallTextureDescriptor => ({
  kind: "drywall",
  variant: descriptor.variant ?? "bump",
  dimensions: createTextureDimensions(
    descriptor.dimensions?.width,
    descriptor.dimensions?.height,
  ),
  noise: {
    seed: normalizeNumber(
      descriptor.noise?.seed,
      DEFAULT_DRYWALL_BUMP_PROFILE.seed,
    ),
    scale: normalizeNumber(
      descriptor.noise?.scale,
      DEFAULT_DRYWALL_BUMP_PROFILE.scale,
    ),
    intensity: normalizeNumber(
      descriptor.noise?.intensity,
      DEFAULT_DRYWALL_BUMP_PROFILE.intensity,
    ),
  },
  sampling: {
    repeat: normalizeNumber(
      descriptor.sampling?.repeat,
      DEFAULT_TEXTURE_SAMPLING.repeat,
    ),
    anisotropy: normalizeNumber(
      descriptor.sampling?.anisotropy,
      DEFAULT_TEXTURE_SAMPLING.anisotropy,
    ),
    colorSpace: normalizeColorSpace(descriptor.sampling?.colorSpace),
  },
});

export const createDrywallTextureBundleDescriptor = (
  descriptor: Partial<DrywallTextureBundleDescriptor> = {},
): DrywallTextureBundleDescriptor => ({
  kind: "drywall",
  dimensions: createTextureDimensions(
    descriptor.dimensions?.width,
    descriptor.dimensions?.height,
  ),
  bump: {
    seed: normalizeNumber(
      descriptor.bump?.seed,
      DEFAULT_DRYWALL_BUMP_PROFILE.seed,
    ),
    scale: normalizeNumber(
      descriptor.bump?.scale,
      DEFAULT_DRYWALL_BUMP_PROFILE.scale,
    ),
    intensity: normalizeNumber(
      descriptor.bump?.intensity,
      DEFAULT_DRYWALL_BUMP_PROFILE.intensity,
    ),
  },
  normal: {
    seed: normalizeNumber(
      descriptor.normal?.seed,
      DEFAULT_DRYWALL_NORMAL_PROFILE.seed,
    ),
    scale: normalizeNumber(
      descriptor.normal?.scale,
      DEFAULT_DRYWALL_NORMAL_PROFILE.scale,
    ),
    intensity: normalizeNumber(
      descriptor.normal?.intensity,
      DEFAULT_DRYWALL_NORMAL_PROFILE.intensity,
    ),
  },
  sampling: {
    repeat: normalizeNumber(
      descriptor.sampling?.repeat,
      DEFAULT_TEXTURE_SAMPLING.repeat,
    ),
    anisotropy: normalizeNumber(
      descriptor.sampling?.anisotropy,
      DEFAULT_TEXTURE_SAMPLING.anisotropy,
    ),
    colorSpace: normalizeColorSpace(descriptor.sampling?.colorSpace),
  },
});

export const createTextureCacheKey = (
  parts: TextureCacheKeyParts,
): TextureCacheKey =>
  [
    parts.kind,
    parts.variant,
    parts.width,
    parts.height,
    parts.seed,
    parts.scale,
    parts.intensity,
    parts.repeat,
    parts.anisotropy,
    parts.colorSpace,
  ].join(":");

export const createDrywallTextureCacheKey = (
  descriptor: DrywallTextureDescriptor,
): TextureCacheKey =>
  createTextureCacheKey({
    kind: descriptor.kind,
    variant: descriptor.variant,
    width: descriptor.dimensions.width,
    height: descriptor.dimensions.height,
    seed: descriptor.noise.seed,
    scale: descriptor.noise.scale,
    intensity: descriptor.noise.intensity,
    repeat: descriptor.sampling.repeat,
    anisotropy: descriptor.sampling.anisotropy,
    colorSpace: descriptor.sampling.colorSpace,
  });

export const createDrywallTextureBundleCacheKey = (
  descriptor: DrywallTextureBundleDescriptor,
): TextureCacheKey =>
  createTextureCacheKey({
    kind: descriptor.kind,
    variant: "bump",
    width: descriptor.dimensions.width,
    height: descriptor.dimensions.height,
    seed: descriptor.bump.seed,
    scale: descriptor.bump.scale,
    intensity: descriptor.bump.intensity,
    repeat: descriptor.sampling.repeat,
    anisotropy: descriptor.sampling.anisotropy,
    colorSpace: descriptor.sampling.colorSpace,
  }) +
  "|" +
  createTextureCacheKey({
    kind: descriptor.kind,
    variant: "normal",
    width: descriptor.dimensions.width,
    height: descriptor.dimensions.height,
    seed: descriptor.normal.seed,
    scale: descriptor.normal.scale,
    intensity: descriptor.normal.intensity,
    repeat: descriptor.sampling.repeat,
    anisotropy: descriptor.sampling.anisotropy,
    colorSpace: descriptor.sampling.colorSpace,
  });

export const cloneDrywallTextureDescriptor = (
  descriptor: DrywallTextureDescriptor,
): DrywallTextureDescriptor => ({
  kind: descriptor.kind,
  variant: descriptor.variant,
  dimensions: { ...descriptor.dimensions },
  noise: { ...descriptor.noise },
  sampling: { ...descriptor.sampling },
});

export const cloneDrywallTextureBundleDescriptor = (
  descriptor: DrywallTextureBundleDescriptor,
): DrywallTextureBundleDescriptor => ({
  kind: descriptor.kind,
  dimensions: { ...descriptor.dimensions },
  bump: { ...descriptor.bump },
  normal: { ...descriptor.normal },
  sampling: { ...descriptor.sampling },
});
