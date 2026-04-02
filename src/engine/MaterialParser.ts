import * as THREE from "three";
import { MaterialConfig } from "../entities/rooms/types";

export const parseMaterial = (
  config: MaterialConfig,
): THREE.MeshPhysicalMaterial => {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(config.albedo),
    roughness: config.roughness,
    metalness: config.metalness,
    normalScale: new THREE.Vector2(
      config.normalMapIntensity || 1,
      config.normalMapIntensity || 1,
    ),
    // PBR defaults for physical plausibility
    clearcoat: 0.1,
    clearcoatRoughness: 0.1,
  });
};
