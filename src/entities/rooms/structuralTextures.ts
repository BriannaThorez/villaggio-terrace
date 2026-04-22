/**
 * structuralTextures.ts
 *
 * SINGLE SOURCE OF TRUTH accessor for all hardcoded (non-roomMetadata.json)
 * room surface textures: lobby, emptyFloor, emptyRoom, structure.
 *
 * All MaterialParser functions, EmptyRoom.tsx, and all prewarmers import
 * from HERE. To change a texture, edit structural-texture-sources.json only.
 */
import sourceData from "./structural-texture-sources.json";

interface SurfaceTextures {
  wall: string;
  floor: string | null;
  ceiling: string | null;
}

// Access named keys directly to avoid TypeScript complaints about _comment field
export const STRUCTURAL_TEXTURES = {
  lobby:          sourceData.lobby          as unknown as SurfaceTextures,
  emptyFloor:     sourceData.emptyFloor     as unknown as SurfaceTextures,
  emptyRoom:      sourceData.emptyRoom      as unknown as SurfaceTextures,
  structure:      sourceData.structure      as unknown as SurfaceTextures,
  structureFrame: sourceData.structureFrame as unknown as SurfaceTextures,
} as const;

/**
 * Returns all unique non-null texture names referenced across ALL hardcoded room types.
 * Used by the initialization prewarmer to populate its warm set.
 */
export const getAllStructuralTextureNames = (): string[] => {
  const names = new Set<string>();
  for (const surfaces of Object.values(STRUCTURAL_TEXTURES)) {
    const s = surfaces as SurfaceTextures;
    if (s.wall)    names.add(s.wall);
    if (s.floor)   names.add(s.floor);
    if (s.ceiling) names.add(s.ceiling);
  }
  return Array.from(names);
};
