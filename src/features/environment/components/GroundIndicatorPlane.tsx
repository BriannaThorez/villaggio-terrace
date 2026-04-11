import React, { useMemo } from "react";
import * as THREE from "three";
import { createTerrainSurfacePreset, buildSurfaceMaterial } from "../presets";
import { parseAssetMaterial } from "../../../engine/MaterialParser";

export interface GroundIndicatorPlaneProps {
  position?: [number, number, number];
  width?: number;
  depth?: number;
  thickness?: number;
  opacity?: number;
  color?: string;
  seed?: number;
  variant?: "default" | "dense" | "soft";
  renderOrder?: number;
}

const DEFAULT_WIDTH = 1000;
const DEFAULT_DEPTH = 1000;
const DEFAULT_THICKNESS = 5;

let sharedGroundIndicatorCount = 0;
let sharedGroundIndicatorMesh: THREE.Mesh | null = null;

export const GroundIndicatorPlane: React.FC<GroundIndicatorPlaneProps> = ({
  position = [0, 0, 0],
  width = DEFAULT_WIDTH,
  depth = DEFAULT_DEPTH,
  thickness = DEFAULT_THICKNESS,
  opacity = 0.35,
  color = "#2e7d32",
  seed = 17,
  variant = "default",
  renderOrder = -20,
}) => {
  const preset = useMemo(() => createTerrainSurfacePreset(), []);

  const material = useMemo(() => {
    const base = parseAssetMaterial("rocky_terrain_2", "#ffffff");
    const clone = base.clone() as THREE.MeshPhysicalMaterial;
    const built = buildSurfaceMaterial(
      clone,
      preset,
      preset.material.repeatScale ?? 40,
    );

    const textures = [
      built.material.map,
      built.material.normalMap,
      built.material.displacementMap,
    ];
    for (const texture of textures) {
      if (!texture) continue;
      texture.repeat.set(built.textureRepeat, built.textureRepeat);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.needsUpdate = true;
    }

    if (built.material.normalMap) {
      const sharpen = built.tilingCompensation.sharpenNormalScale ?? 1;
      built.material.normalScale = new THREE.Vector2(sharpen, sharpen);
    }
    if (built.material.displacementMap) {
      built.material.displacementScale =
        built.tilingCompensation.sharpenDisplacementScale ??
        built.material.displacementScale;
    }

    built.material.needsUpdate = true;
    return built.material;
  }, [preset]);

  return (
    <mesh
      position={[0, -thickness / 2, 0]}
      renderOrder={preset.render.renderOrder}
      castShadow={preset.render.castShadow}
      receiveShadow={preset.render.receiveShadow}
    >
      <boxGeometry args={[width, thickness, depth]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

export default GroundIndicatorPlane;
