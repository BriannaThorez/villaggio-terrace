import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
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
  const material = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: "#3d2b1f", // Rich Dark Brown (Chocolate)
      roughness: 0.8, // Frost the surface
      metalness: 0.0, // Subdued reflection
      ior: 1.4,
      transmission: 0,
      clearcoat: 0.5, // Subtle architectural glow
      clearcoatRoughness: 0.9,
      thickness: 2,
      envMapIntensity: 0.2, // Avoid excessive sheen
      transparent: false,
      opacity: 1.0,
      depthWrite: true,
      side: THREE.FrontSide,
    });
    mat.toneMapped = true;
    return mat;
  }, []);

  return (
    <mesh
      position={[0, -thickness / 2, 0]}
      renderOrder={-2} // Behind grid but above background
    >
      <boxGeometry args={[width, thickness, depth]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

export default GroundIndicatorPlane;
