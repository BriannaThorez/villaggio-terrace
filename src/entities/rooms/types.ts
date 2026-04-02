export interface MaterialConfig {
  albedo: string; // Hex color
  roughness: number; // 0 to 1
  metalness: number; // 0 to 1
  normalMapIntensity?: number;
}
