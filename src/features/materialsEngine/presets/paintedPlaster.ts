import * as THREE from "three";
import { createTextureCache } from "../api";

import paintedPlasterArmUrl from "../../../assets/textures/painted_plaster_wall/painted_plaster_wall_arm_4k.png";
import paintedPlasterDispUrl from "../../../assets/textures/painted_plaster_wall/painted_plaster_wall_disp_4k.png";
import paintedPlasterNormalUrl from "../../../assets/textures/painted_plaster_wall/painted_plaster_wall_nor_gl_4k.png";

const textureLoader = new THREE.TextureLoader();

interface TextureOptions {
  name: string;
  colorSpace: THREE.ColorSpace;
  flipY?: boolean;
}

const configureTexture = (
  texture: THREE.Texture,
  options: TextureOptions,
): THREE.Texture => {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.colorSpace = options.colorSpace;
  if (options.flipY !== undefined) {
    texture.flipY = options.flipY;
  }
  texture.name = options.name;
  return texture;
};

const loadPaintedPlasterTexture = (
  url: string,
  options: TextureOptions,
): THREE.Texture => {
  const texture = textureLoader.load(
    url,
    () => {
      texture.needsUpdate = true;
    },
    undefined,
    (error) => {
      console.error(`[painted-plaster] failed to load ${url}`, error);
    },
  );
  return configureTexture(texture, options);
};

export interface PaintedPlasterTextureBundle {
  albedoMap: THREE.Texture | null;
  aoMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  metalnessMap: THREE.Texture;
  normalMap: THREE.Texture;
  displacementMap: THREE.Texture;
}

const paintedPlasterCache = createTextureCache<PaintedPlasterTextureBundle>();

export const getPaintedPlasterBundle = (): PaintedPlasterTextureBundle => {
  const cacheKey = "painted-plaster-wall-4k";
  const cached = paintedPlasterCache.get(cacheKey);
  if (cached) return cached;

  const albedoMap = loadPaintedPlasterTexture(paintedPlasterArmUrl, {
    name: "painted-plaster-arm",
    colorSpace: THREE.SRGBColorSpace,
  });

  const normalMap = loadPaintedPlasterTexture(paintedPlasterNormalUrl, {
    name: "painted-plaster-normal",
    colorSpace: THREE.NoColorSpace,
    flipY: false,
  });

  const displacementMap = loadPaintedPlasterTexture(paintedPlasterDispUrl, {
    name: "painted-plaster-displacement",
    colorSpace: THREE.NoColorSpace,
  });

  const bundle: PaintedPlasterTextureBundle = {
    albedoMap: null as any, // Explicitly decoupled; use material base color instead
    aoMap: albedoMap,
    roughnessMap: albedoMap,
    metalnessMap: albedoMap,
    normalMap,
    displacementMap,
  };

  paintedPlasterCache.set(cacheKey, bundle);
  return bundle;
};

export const disposePaintedPlasterBundles = (): void => {
  const seen = new Set<THREE.Texture>();
  for (const key of paintedPlasterCache.keys()) {
    const bundle = paintedPlasterCache.get(key);
    if (!bundle) {
      paintedPlasterCache.delete(key);
      continue;
    }

    for (const texture of [bundle.albedoMap, bundle.normalMap, bundle.displacementMap]) {
      if (texture && !seen.has(texture)) {
        seen.add(texture);
        texture.dispose();
      }
    }

    paintedPlasterCache.delete(key);
  }
};
