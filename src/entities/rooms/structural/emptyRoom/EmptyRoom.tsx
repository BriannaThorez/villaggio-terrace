import React, { useMemo } from "react";
import * as THREE from "three";
import { parseMaterial, getEmptyFloorMaterials } from "@/src/engine/MaterialParser";
import { RoomMeshCSG } from "../../visuals/RoomMeshCSG";
import { generateWindowCutouts } from "../../visuals/WindowGenerator";

interface EmptyRoomVisualsProps {
    width: number;
    height: number;
    depth: number;
    hasLeftWall: boolean;
    hasRightWall: boolean;
}

/**
 * emptyRoom: Structural scaffold visual entity.
 */
export const EmptyRoom: React.FC<EmptyRoomVisualsProps> = ({
    width,
    height,
    depth,
    hasLeftWall,
    hasRightWall,
}) => {
    // Architectural Configuration
    const openingWidth = 7.5;
    const openingHeight = 25.0;
    const verticalCenteringOffset = 0.275;

    const frameMaterial = useMemo(() => {
        return parseMaterial({
            albedo: "#808080",
            roughness: 0.3,
            metalness: 0.8,
        });
    }, []);

    const roomShellMaterials = useMemo(() => {
        return getEmptyFloorMaterials("#909090");
    }, []);

    const glassMaterial = useMemo(() => {
        return new THREE.MeshPhysicalMaterial({
            color: "#8090A0",
            metalness: 0.9,
            roughness: 0.05,
            transmission: 0.95,
            opacity: 0.2,
            transparent: true,
            ior: 1.5,
            thickness: 0.1,
            side: THREE.DoubleSide,
            envMapIntensity: 2.0,
        });
    }, []);

    const windowCutouts = useMemo(() => {
        return generateWindowCutouts({
            roomWidth: width,
            roomHeight: height,
            roomDepth: depth,
            cutoutWidth: openingWidth,
            cutoutHeight: openingHeight,
            verticalOffset: verticalCenteringOffset,
            penetrationDepth: 20.0,
        });
    }, [width, height, depth, openingWidth, openingHeight, verticalCenteringOffset]);

    return (
        <>
            <RoomMeshCSG
                width={width}
                height={height}
                depth={depth}
                material={roomShellMaterials}
                hasLeftWall={hasLeftWall}
                hasRightWall={hasRightWall}
                hasBackWall={true}
                cutouts={windowCutouts}
            />

            {windowCutouts.map((cutout, index) => (
                <group key={`window-${index}`} position={[cutout.x, height / 2 + verticalCenteringOffset, 0]}>
                    <group position={[0, 0, -depth + 0.1]}>
                        <mesh material={glassMaterial} position={[0, 0, 0.05]}>
                            <boxGeometry args={[openingWidth, height, 0.05]} />
                        </mesh>
                        <mesh material={frameMaterial} position={[0, height / 2 + 0.1, 0]}>
                            <boxGeometry args={[openingWidth + 0.4, 0.15, 0.3]} />
                        </mesh>
                        <mesh material={frameMaterial} position={[0, -height / 2 - 0.1, 0]}>
                            <boxGeometry args={[openingWidth + 0.4, 0.15, 0.3]} />
                        </mesh>
                    </group>
                </group>
            ))}
        </>
    );
};
