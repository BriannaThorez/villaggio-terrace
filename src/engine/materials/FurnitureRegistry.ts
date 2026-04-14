import * as THREE from "three";

/**
 * FurnitureRegistry: Centralizes furniture materials to ensure performance
 * (by sharing instances) and visual consistency (by enforcing global lighting defaults).
 */

// Global Lighting Defaults for Furniture
const FURNITURE_DEFAULTS = {
  roughness: 1.0,
  metalness: 0.0,
  envMapIntensity: 0.45,
  aoMapIntensity: 0.8,
};

// Cache to ensure we only ever create one instance per color/config
const furnitureMaterialCache: Record<string, THREE.MeshStandardMaterial> = {};

/**
 * Creates or retrieves a shared furniture material based on color.
 * Using a simple color-key cache to prevent redundant object creation.
 */
export const getFurnitureMaterial = (color: string): THREE.MeshStandardMaterial => {
  const cacheKey = color.toLowerCase();

  if (furnitureMaterialCache[cacheKey]) {
    return furnitureMaterialCache[cacheKey];
  }

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: FURNITURE_DEFAULTS.roughness,
    metalness: FURNITURE_DEFAULTS.metalness,
    envMapIntensity: FURNITURE_DEFAULTS.envMapIntensity,
  });

  // Note: Standard material for furniture is simpler than room shells,
  // but we enforce the AO intensity standard here as well.
  // @ts-ignore - aoMapIntensity is supported on MeshStandardMaterial
  material.aoMapIntensity = FURNITURE_DEFAULTS.aoMapIntensity;

  material.needsUpdate = true;
  furnitureMaterialCache[cacheKey] = material;

  return material;
};

/**
 * Clears all cached furniture materials if the theme or global state changes.
 */
export const disposeAllFurnitureMaterials = (): void => {
  Object.values(furnitureMaterialCache).forEach((mat) => mat.dispose());
  for (const key in furnitureMaterialCache) {
    delete furnitureMaterialCache[key];
  }
};
