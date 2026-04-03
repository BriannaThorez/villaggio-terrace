import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createGrassIndicatorTextureSet } from "../../../../features/textures/lib/procedural/grass";

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
  const groundedPosition: [number, number, number] = [
    position[0],
    0,
    position[2],
  ];
  const textureSet = useMemo(
    () =>
      createGrassIndicatorTextureSet({
        size: 512,
        seed,
        repeat: Math.max(1, Math.round(Math.max(width, depth) / 24)),
        variant,
        baseColor: "#355f2d",
        bladeColor: color,
        accentColor: "#a8cf72",
      }),
    [color, depth, seed, variant, width],
  );

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
      map: textureSet.diffuse,
      normalMap: textureSet.normal,
      bumpMap: textureSet.bump,
      bumpScale: 0.08,
      normalScale: new THREE.Vector2(0.18, 0.18),
    });

    mat.toneMapped = true;
    return mat;
  }, [color, opacity, textureSet.bump, textureSet.diffuse, textureSet.normal]);

  const meshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    sharedGroundIndicatorCount += 1;
    sharedGroundIndicatorMesh = meshRef.current;

    return () => {
      sharedGroundIndicatorCount = Math.max(0, sharedGroundIndicatorCount - 1);
      if (sharedGroundIndicatorCount === 0) {
        sharedGroundIndicatorMesh = null;
      }
      material.dispose();
      textureSet.dispose();
    };
  }, [material, textureSet]);

  return (
    <mesh
      ref={meshRef}
      position={groundedPosition}
      renderOrder={renderOrder}
      userData={{
        groundIndicator: true,
        procedural: "grass",
        thickness,
        singleton: true,
        sceneOwned: true,
        worldGroundY: 0,
      }}
      visible={
        sharedGroundIndicatorMesh === null ||
        sharedGroundIndicatorMesh === meshRef.current
      }
    >
      <cylinderGeometry
        args={[width / 2, width / 2, thickness, 48, 1, false]}
      />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

export default GroundIndicatorPlane;
