import React, { useMemo } from "react";
import * as THREE from "three";
import { createTerrainSurfacePreset, buildSurfaceMaterial } from "../presets";
import { parseRoomMaterial } from "../../../engine/MaterialParser";
import { textureLODHandler } from "../../../features/materialsEngine/TextureLODHandler";

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
    const { progressive, promise } = textureLODHandler.getBundleProgressiveSync("rocky_terrain_2", "#2e7d32");

    const mat = new THREE.MeshPhysicalMaterial({
        map: progressive.albedoMap,
        color: "#ffffff",
        aoMap: progressive.aoMap,
        roughnessMap: progressive.roughnessMap,
        metalnessMap: progressive.metalnessMap,
        normalMap: progressive.normalMap,
        displacementMap: progressive.displacementMap,
        displacementScale: 0.015,
        displacementBias: -0.005,
        side: THREE.FrontSide,
        roughness: 1.0,
        metalness: 0.0,
    });

    const built = buildSurfaceMaterial(mat, preset, preset.material.repeatScale ?? 40);

    const applyRepeating = (tex: THREE.Texture) => {
        tex.repeat.set(built.textureRepeat, built.textureRepeat);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.needsUpdate = true;
    };

    const setupTextures = (bundle: any) => {
        if (bundle.albedoMap) applyRepeating(bundle.albedoMap);
        if (bundle.normalMap) applyRepeating(bundle.normalMap);
        if (bundle.displacementMap) applyRepeating(bundle.displacementMap);
        if (bundle.aoMap) applyRepeating(bundle.aoMap);
        if (bundle.roughnessMap) applyRepeating(bundle.roughnessMap);
        if (bundle.metalnessMap) applyRepeating(bundle.metalnessMap);
    };

    setupTextures(progressive);

    if (built.material.normalMap) {
      const sharpen = built.tilingCompensation.sharpenNormalScale ?? 1;
      built.material.normalScale = new THREE.Vector2(sharpen, sharpen);
    }
    if (built.material.displacementMap) {
      built.material.displacementScale = built.tilingCompensation.sharpenDisplacementScale ?? built.material.displacementScale;
    }
    built.material.needsUpdate = true;

    promise.then((heavyBundle) => {
        setupTextures(heavyBundle);
        built.material.map = heavyBundle.albedoMap;
        built.material.aoMap = heavyBundle.aoMap;
        built.material.roughnessMap = heavyBundle.roughnessMap;
        built.material.metalnessMap = heavyBundle.metalnessMap;
        built.material.normalMap = heavyBundle.normalMap;
        built.material.displacementMap = heavyBundle.displacementMap;
        built.material.needsUpdate = true;
    });

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
