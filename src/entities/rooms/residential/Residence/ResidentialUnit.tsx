import React from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { RoomMeshCSG } from "../../visuals/RoomMeshCSG";
import { getRoomMaterialsFromMetadata } from "@/src/engine/MaterialParser";
import { getFurnitureMaterial } from "@/src/engine/materials/FurnitureRegistry";
import { computeSnappedWorldOffset } from "@/src/shared/utils/CoordinateEngine";
import { PlacementHologram } from "@/src/shared/components/PlacementHologram";

interface ResidenceVisualsProps {
  width: number;
  height: number;
  depth: number;
  color?: string;
  hasLeftWall: boolean;
  hasRightWall: boolean;
  placementGrid: any;
  isGridVisible: boolean;
  wallTextureId?: string;
  floorTextureId?: string;
  ceilingTextureId?: string;
}

/**
 * ResidentialUnit: Generalized residential module.
 * This entity defines the visual look and interior furniture dynamically.
 */
export const ResidentialUnit: React.FC<ResidenceVisualsProps> = ({
  width,
  height,
  depth,
  color = "#ffffff",
  hasLeftWall,
  hasRightWall,
  placementGrid,
  isGridVisible,
  wallTextureId,
  floorTextureId,
  ceilingTextureId,
}) => {
  const materials = React.useMemo(() => getRoomMaterialsFromMetadata({
    wallTexture: wallTextureId,
    floorTexture: floorTextureId,
    ceilingTexture: ceilingTextureId,
  }), [wallTextureId, floorTextureId, ceilingTextureId]);

  return (
    <group>
      <RoomMeshCSG
        width={width}
        height={height}
        depth={depth}
        material={materials}
        hasLeftWall={hasLeftWall}
        hasRightWall={hasRightWall}
      />

      <group position={[0, 2.22, -depth / 2]}>
        <PlacementHologram grid={placementGrid} visible={isGridVisible} />

        {/* Studio Furniture: BED */}
        <mesh
          position={(() => {
            const offset = computeSnappedWorldOffset(
              placementGrid,
              1,
              3,
              5,
              8,
              { width: 10, depth: 10 },
            );
            return [offset[0], 2.5, offset[2]];
          })()}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[8, 2, 6]} />
          <meshStandardMaterial {...(getFurnitureMaterial("#FF5F1F") as any)} />
          <mesh position={[2.5, 1.2, 0]}>
            <boxGeometry args={[2, 0.5, 4]} />
            <meshStandardMaterial
              {...(getFurnitureMaterial("#FFE5B4") as any)}
            />
          </mesh>
          <Text
            position={[0, 1.5, 0]}
            fontSize={0.8}
            color="white"
            anchorX="center"
          >
            BED
          </Text>
        </mesh>
      </group>
    </group>
  );
};
