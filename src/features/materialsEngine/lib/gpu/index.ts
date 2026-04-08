import * as THREE from "three";

export interface GpuTextureConversionOptions {
  minFilter?: THREE.TextureFilter;
  magFilter?: THREE.TextureFilter;
  wrapS?: THREE.Wrapping;
  wrapT?: THREE.Wrapping;
  generateMipmaps?: boolean;
  colorSpace?: THREE.ColorSpace;
  anisotropy?: number;
}

const applyTextureDefaults = (
  texture: THREE.Texture,
  options: GpuTextureConversionOptions = {},
): THREE.Texture => {
  texture.needsUpdate = true;
  texture.minFilter = options.minFilter ?? THREE.LinearMipMapLinearFilter;
  texture.magFilter = (options.magFilter ?? THREE.LinearFilter) as THREE.MagnificationTextureFilter;
  texture.wrapS = options.wrapS ?? THREE.RepeatWrapping;
  texture.wrapT = options.wrapT ?? THREE.RepeatWrapping;
  texture.generateMipmaps = options.generateMipmaps ?? true;
  texture.colorSpace = options.colorSpace ?? THREE.NoColorSpace;
  texture.anisotropy = options.anisotropy ?? 1;

  return texture;
};

export const toCanvasTexture = (
  canvas: HTMLCanvasElement,
  options: GpuTextureConversionOptions = {},
): THREE.CanvasTexture => {
  const texture = new THREE.CanvasTexture(canvas);
  return applyTextureDefaults(texture, options) as THREE.CanvasTexture;
};

export const toDataTexture = (
  data: Uint8Array | Uint8ClampedArray | Float32Array,
  width: number,
  height: number,
  options: GpuTextureConversionOptions = {},
): THREE.DataTexture => {
  const texture = new THREE.DataTexture(data, width, height);
  return applyTextureDefaults(texture, options) as THREE.DataTexture;
};

export const disposeTexture = (texture?: THREE.Texture | null): void => {
  if (!texture) return;
  texture.dispose();
};

export const cloneTexture = <T extends THREE.Texture>(texture: T): T => {
  return texture.clone() as T;
};
