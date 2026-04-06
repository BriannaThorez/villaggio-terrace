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
        size: 1024,
        seed,
        repeat: Math.max(1, Math.round(Math.max(width, depth) / 32)),
        variant: "soft",
        baseColor: "#1a2b16", // Deep, velvety forest green
        bladeColor: "#223d1d", // Subtle highlights
        accentColor: "#2a3d20", // Muted undertones
      }),
    [depth, seed, width],
  );

  const material = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 1.0, // Absolute matte
      metalness: 0.0, // Non-metallic velvet
      transparent: false,
      opacity: 1.0,
      depthWrite: true,
      side: THREE.FrontSide,
      map: textureSet.diffuse,
      normalMap: textureSet.normal,
      bumpMap: textureSet.bump,
      bumpScale: 0.15, // Muted bumps for velvet feel
      normalScale: new THREE.Vector2(0.8, 0.8), // Smoother transition
      envMapIntensity: 0.0, // Reject environment reflections
    });
    mat.toneMapped = true;
    return mat;
  }, [textureSet.bump, textureSet.diffuse, textureSet.normal]);

  return (
    <mesh
      position={[0, -thickness / 2, 0]}
      receiveShadow
      renderOrder={-2} // Behind grid but above background
    >
      <boxGeometry args={[width, thickness, depth]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

export default GroundIndicatorPlane;
