import * as THREE from "three";

export type GrassIndicatorVariant = "default" | "dense" | "soft";

export interface GrassIndicatorTextureOptions {
  size?: number;
  seed?: number;
  repeat?: number;
  variant?: GrassIndicatorVariant;
  baseColor?: string;
  bladeColor?: string;
  accentColor?: string;
}

export interface GrassIndicatorTextureSet {
  diffuse: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
  dispose: () => void;
}

const DEFAULT_SIZE = 512;

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

const parseColor = (value: string) => new THREE.Color(value);

const variantProfile = (variant: GrassIndicatorVariant) => {
  switch (variant) {
    case "dense":
      return { density: 1.2, height: 1.15, softness: 0.85, contrast: 1.15 };
    case "soft":
      return { density: 0.82, height: 0.92, softness: 1.2, contrast: 0.9 };
    default:
      return { density: 1, height: 1, softness: 1, contrast: 1 };
  }
};

const makeCanvas = (size: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create 2D canvas context for grass texture.");
  }

  return { canvas, context };
};

const applyTextureSettings = (texture: THREE.CanvasTexture, repeat: number) => {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
};

const writePixel = (
  imageData: ImageData,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a = 255,
) => {
  const idx = (y * imageData.width + x) * 4;
  imageData.data[idx] = Math.round(clamp01(r) * 255);
  imageData.data[idx + 1] = Math.round(clamp01(g) * 255);
  imageData.data[idx + 2] = Math.round(clamp01(b) * 255);
  imageData.data[idx + 3] = Math.round(clamp01(a / 255) * 255);
};

const buildDiffuseTexture = (
  size: number,
  seed: number,
  variant: GrassIndicatorVariant,
  baseColor: string,
  bladeColor: string,
  accentColor: string,
) => {
  const profile = variantProfile(variant);
  const random = mulberry32(seed);
  const { canvas, context } = makeCanvas(size);
  const imageData = context.createImageData(size, size);

  const base = parseColor(baseColor);
  const blade = parseColor(bladeColor);
  const accent = parseColor(accentColor);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;

      const patch = Math.sin((nx * 8 + seed * 0.013) * Math.PI * 2) * 0.03;
      const patch2 = Math.cos((ny * 11 - seed * 0.017) * Math.PI * 2) * 0.03;

      // REDUCED NOISE: Slashing per-pixel random grain for a smoother "soft" grass look
      const grain = (random() - 0.5) * 0.02 * profile.contrast;

      const bladeHint =
        Math.max(
          0,
          Math.sin((nx * profile.density * 18 + ny * 4 + seed * 0.031) * Math.PI),
        ) * 0.28 * profile.height;
      const accentHint =
        Math.max(
          0,
          Math.cos((nx * 23 - ny * 13 + seed * 0.021) * Math.PI),
        ) * 0.12 * profile.softness;

      const t = clamp01(0.5 + patch + patch2 + grain);
      const baseMix = base.clone().lerp(blade, clamp01(bladeHint));
      const finalMix = baseMix.lerp(accent, clamp01(accentHint * 0.55));

      // REDUCED SHADE NOISE: Smoothing the jitter in luminosity
      const shade = clamp01(0.92 + (random() - 0.5) * 0.02 + t * 0.05);
      writePixel(
        imageData,
        x,
        y,
        finalMix.r * shade,
        finalMix.g * shade,
        finalMix.b * shade,
        255,
      );
    }
  }

  context.putImageData(imageData, 0, 0);

  // Softening Pass: Blend the pixels to achieve the "Soft Plaster/Grass" vibe
  context.globalCompositeOperation = "overlay";
  context.filter = "blur(0.8px)";
  context.drawImage(context.canvas, 0, 0);

  return canvas;
};

const buildHeightValue = (
  nx: number,
  ny: number,
  seed: number,
  variant: GrassIndicatorVariant,
) => {
  const profile = variantProfile(variant);
  const ripple = Math.sin((nx * 22 + seed * 0.01) * Math.PI) * 0.03;
  const ripple2 = Math.cos((ny * 19 - seed * 0.015) * Math.PI) * 0.03;
  const clump = Math.max(
    0,
    Math.sin((nx * 9.5 + ny * 11.25 + seed * 0.002) * Math.PI * 2),
  );
  const tuft = Math.max(
    0,
    Math.cos((nx * 15.5 - ny * 14.5 + seed * 0.004) * Math.PI * 2),
  );
  return clamp01(
    0.5 +
    (ripple + ripple2 + clump * 0.18 * profile.height + tuft * 0.12) *
    profile.contrast,
  );
};

const buildNormalTexture = (
  size: number,
  seed: number,
  variant: GrassIndicatorVariant,
) => {
  const { canvas, context } = makeCanvas(size);
  const imageData = context.createImageData(size, size);

  const heightAt = (x: number, y: number) =>
    buildHeightValue(x / size, y / size, seed, variant);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xm1 = Math.max(0, x - 1);
      const xp1 = Math.min(size - 1, x + 1);
      const ym1 = Math.max(0, y - 1);
      const yp1 = Math.min(size - 1, y + 1);

      const dx = heightAt(xp1, y) - heightAt(xm1, y);
      const dy = heightAt(x, yp1) - heightAt(x, ym1);
      const normal = new THREE.Vector3(-dx * 10, -dy * 10, 1).normalize();

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

const buildBumpTexture = (
  size: number,
  seed: number,
  variant: GrassIndicatorVariant,
) => {
  const { canvas, context } = makeCanvas(size);
  const imageData = context.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const value = buildHeightValue(x / size, y / size, seed, variant);
      const c = Math.round(value * 255);
      const idx = (y * size + x) * 4;
      imageData.data[idx] = c;
      imageData.data[idx + 1] = c;
      imageData.data[idx + 2] = c;
      imageData.data[idx + 3] = 255;
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
};

export const createGrassIndicatorTextureSet = (
  options: GrassIndicatorTextureOptions = {},
): GrassIndicatorTextureSet => {
  const size = options.size ?? DEFAULT_SIZE;
  const seed = options.seed ?? 7;
  const repeat = options.repeat ?? 1;
  const variant = options.variant ?? "default";
  const baseColor = options.baseColor ?? "#3f6f34";
  const bladeColor = options.bladeColor ?? "#5f8d42";
  const accentColor = options.accentColor ?? "#9ac46a";

  const diffuse = new THREE.CanvasTexture(
    buildDiffuseTexture(size, seed, variant, baseColor, bladeColor, accentColor),
  );
  diffuse.colorSpace = THREE.SRGBColorSpace;

  const normal = new THREE.CanvasTexture(
    buildNormalTexture(size, seed, variant),
  );
  normal.colorSpace = THREE.NoColorSpace;

  const bump = new THREE.CanvasTexture(
    buildBumpTexture(size, seed, variant),
  );
  bump.colorSpace = THREE.NoColorSpace;

  applyTextureSettings(diffuse, repeat);
  applyTextureSettings(normal, repeat);
  applyTextureSettings(bump, repeat);

  return {
    diffuse,
    normal,
    bump,
    dispose: () => {
      diffuse.dispose();
      normal.dispose();
      bump.dispose();
    },
  };
};

export const createGrassIndicatorDiffuseTexture = (
  options: GrassIndicatorTextureOptions = {},
) => createGrassIndicatorTextureSet(options).diffuse;

export const createGrassIndicatorNormalTexture = (
  options: GrassIndicatorTextureOptions = {},
) => createGrassIndicatorTextureSet(options).normal;

export const createGrassIndicatorBumpTexture = (
  options: GrassIndicatorTextureOptions = {},
) => createGrassIndicatorTextureSet(options).bump;
