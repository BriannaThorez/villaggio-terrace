import React from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { RoomMeshCSG } from "../../visuals/RoomMeshCSG";
import { getResidentialMaterials } from "@/src/engine/MaterialParser";
import { computeSnappedWorldOffset } from "@/src/shared/utils/CoordinateEngine";
import { PlacementHologram } from "@/src/shared/components/PlacementHologram";

interface Studio1VisualsProps {
    width: number;
    height: number;
    depth: number;
    color: string;
    hasLeftWall: boolean;
    hasRightWall: boolean;
    placementGrid: any;
    isGridVisible: boolean;
}

/**
 * Studio1: Standard residential unit with a bed.
 * This entity defines the visual look and interior furniture.
 */
export const Studio1: React.FC<Studio1VisualsProps> = ({
    width,
    height,
    depth,
    color,
    hasLeftWall,
    hasRightWall,
    placementGrid,
    isGridVisible,
}) => {
    const materials = React.useMemo(() => getResidentialMaterials(color), [color]);

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
                            1, 3, 5, 8,
                            { width: 10, depth: 10 }
                        );
                        return [offset[0], 2.5, offset[2]];
                    })()}
                    castShadow
                    receiveShadow
                >
                    <boxGeometry args={[8, 2, 6]} />
                    <meshStandardMaterial color="#FF5F1F" roughness={0.8} />
                    <mesh position={[2.5, 1.2, 0]}>
                        <boxGeometry args={[2, 0.5, 4]} />
                        <meshStandardMaterial color="#FFE5B4" roughness={0.9} />
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
