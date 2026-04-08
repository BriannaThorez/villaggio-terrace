import * as THREE from "three";

export type DrywallTextureVariant = "default" | "fine" | "coarse";

export interface DrywallTextureOptions {
  size?: number;
  variant?: DrywallTextureVariant;
  seed?: number;
  tint?: string;
  opacity?: number;
  repeat?: number;
}

export interface DrywallTextureSet {
  diffuse: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
}

const DEFAULT_SIZE = 256;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const hashSeed = (seed: number) => {
  let t = seed | 0;
  t ^= t >>> 16;
  t = Math.imul(t, 0x7feb352d);
  t ^= t >>> 15;
  t = Math.imul(t, 0x846ca68b);
  t ^= t >>> 16;
  return t >>> 0;
};

const mulberry32 = (seed: number) => {
  let t = hashSeed(seed);
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const variantProfile = (variant: DrywallTextureVariant) => {
  switch (variant) {
    case "fine":
      return { grain: 0.08, pits: 0.025, ridges: 0.03, contrast: 0.9 };
    case "coarse":
      return { grain: 0.18, pits: 0.07, ridges: 0.08, contrast: 1.2 };
    default:
      return { grain: 0.12, pits: 0.045, ridges: 0.05, contrast: 1 };
  }
};

const parseColor = (value: string) => new THREE.Color(value);

const makeTexture = (size: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create 2D canvas context for drywall texture");
  }
  return { canvas, context };
};

const applyTextureSettings = (texture: THREE.CanvasTexture, repeat: number) => {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
};

const writeGrayscalePixel = (
  imageData: ImageData,
  x: number,
  y: number,
  value: number,
) => {
  const idx = (y * imageData.width + x) * 4;
  const c = Math.round(clamp01(value) * 255);
  imageData.data[idx] = c;
  imageData.data[idx + 1] = c;
  imageData.data[idx + 2] = c;
  imageData.data[idx + 3] = 255;
};

const buildHeightMap = (
  size: number,
  variant: DrywallTextureVariant,
  seed: number,
) => {
  const profile = variantProfile(variant);
  const random = mulberry32(seed);
  const { canvas, context } = makeTexture(size);
  const imageData = context.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;

      const baseNoise =
        random() * profile.grain +
        Math.sin((nx * Math.PI * 8 + seed) * 1.7) * 0.015 +
        Math.cos((ny * Math.PI * 11 + seed) * 1.3) * 0.015;

      const pits =
        Math.max(0, Math.sin((nx + ny * 1.13 + seed * 0.001) * Math.PI * 17)) *
        profile.pits;

      const ridges =
        Math.max(0, Math.cos((nx * 1.7 - ny * 1.2 + seed * 0.002) * Math.PI * 9)) *
        profile.ridges;

      const value = 0.5 + (baseNoise + pits + ridges - 0.5 * profile.grain) * profile.contrast;
      writeGrayscalePixel(imageData, x, y, value);
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
};

const buildDiffuseTexture = (
  size: number,
  tint: string,
  variant: DrywallTextureVariant,
  seed: number,
) => {
  const profile = variantProfile(variant);
  const { canvas, context } = makeTexture(size);
  const base = parseColor(tint);
  const imageData = context.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const edge = Math.abs((x / size) - 0.5) + Math.abs((y / size) - 0.5);
      const variation = (Math.sin((x + seed) * 0.11) + Math.cos((y - seed) * 0.13)) * 0.012;
      const grain = (Math.random() - 0.5) * 0.0 + variation;
      const shade = clamp01(0.97 - edge * 0.02 + grain * profile.contrast);

      const idx = (y * size + x) * 4;
      imageData.data[idx] = Math.round(clamp01(base.r * shade) * 255);
      imageData.data[idx + 1] = Math.round(clamp01(base.g * shade) * 255);
      imageData.data[idx + 2] = Math.round(clamp01(base.b * shade) * 255);
      imageData.data[idx + 3] = 255;
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
};

const buildNormalTexture = (
  size: number,
  variant: DrywallTextureVariant,
  seed: number,
) => {
  const profile = variantProfile(variant);
  const random = mulberry32(seed + 17);
  const { canvas, context } = makeTexture(size);
  const imageData = context.createImageData(size, size);

  const heightAt = (x: number, y: number) => {
    const nx = x / size;
    const ny = y / size;
    const grain = (random() - 0.5) * profile.grain;
    const pits = Math.sin((nx * 13 + ny * 17 + seed * 0.01) * Math.PI) * profile.pits;
    const ridges = Math.cos((nx * 9 - ny * 7 + seed * 0.02) * Math.PI) * profile.ridges;
    return 0.5 + grain + pits + ridges;
  };

  const sample = (x: number, y: number) => {
    const xm1 = Math.max(0, x - 1);
    const xp1 = Math.min(size - 1, x + 1);
    const ym1 = Math.max(0, y - 1);
    const yp1 = Math.min(size - 1, y + 1);
    const dx = heightAt(xp1, y) - heightAt(xm1, y);
    const dy = heightAt(x, yp1) - heightAt(x, ym1);
    const normal = new THREE.Vector3(-dx * 8, -dy * 8, 1).normalize();
    return normal;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const normal = sample(x, y);
      const idx = (y * size + x) * 4;
      imageData.data[idx] = Math.round((normal.x * 0.5 + 0.5) * 255);
      imageData.data[idx + 1] = Math.round((normal.y * 0.5 + 0.5) * 255);
      imageData.data[idx + 2] = Math.round((normal.z * 0.5 + 0.5) * 255);
      imageData.data[idx + 3] = 255;
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
};

export const createDrywallTextureSet = (
  options: DrywallTextureOptions = {},
): DrywallTextureSet => {
  const size = options.size ?? DEFAULT_SIZE;
  const variant = options.variant ?? "default";
  const seed = options.seed ?? 1;
  const tint = options.tint ?? "#f2f0eb";
  const repeat = options.repeat ?? 1;

  const diffuse = new THREE.CanvasTexture(
    buildDiffuseTexture(size, tint, variant, seed),
  );
  diffuse.colorSpace = THREE.SRGBColorSpace;

  const normal = new THREE.CanvasTexture(buildNormalTexture(size, variant, seed));
  normal.colorSpace = THREE.NoColorSpace;

  const bump = new THREE.CanvasTexture(buildHeightMap(size, variant, seed));
  bump.colorSpace = THREE.NoColorSpace;

  applyTextureSettings(diffuse, repeat);
  applyTextureSettings(normal, repeat);
  applyTextureSettings(bump, repeat);

  return { diffuse, normal, bump };
};

export const createDrywallBumpTexture = (options: DrywallTextureOptions = {}) =>
  createDrywallTextureSet(options).bump;

export const createDrywallNormalTexture = (options: DrywallTextureOptions = {}) =>
  createDrywallTextureSet(options).normal;

export const createDrywallDiffuseTexture = (options: DrywallTextureOptions = {}) =>
  createDrywallTextureSet(options).diffuse;
