import React, { useMemo } from "react";
import * as THREE from "three";
import { parseMaterial } from "../../../engine/MaterialParser";
import { RoomMeshCSG } from "../visuals/RoomMeshCSG";
import { generateWindowCutouts } from "../visuals/WindowGenerator";

interface EmptyFloorRoomProps {
    position: [number, number, number];
    rotation: number;
    width: number;
    height: number;
    depth: number;
    id: string;
    hasLeftWall?: boolean;
    hasRightWall?: boolean;
    onPointerDown?: (e: any) => void;
    onDoubleClick?: (e: any) => void;
}

export const EmptyFloorRoom: React.FC<EmptyFloorRoomProps> = ({
    position,
    rotation,
    width,
    height,
    depth,
    id,
    hasLeftWall = true,
    hasRightWall = true,
    onPointerDown,
    onDoubleClick,
}) => {
    // Architectural Configuration
    const openingWidth = 7.5; // 25% (2.5 units) margin on each side of 10-unit cell
    const openingHeight = 25.0; // Extreme high-profile vertical slit aesthetic
    const verticalCenteringOffset = 0.275; // Aligned with the normalized structural interior

    const shellHeight = height - 0.75;
    const shellDepth = depth - 0.25;

    const roomPosition = useMemo<[number, number, number]>(() => {
        return [position[0], position[1] + 0.5, position[2] + 0.125];
    }, [position]);

    const frameMaterial = useMemo(() => {
        return parseMaterial({
            albedo: "#808080", // Metallic Silver/Grey
            roughness: 0.3,
            metalness: 0.8,
        });
    }, []);

    const glassMaterial = useMemo(() => {
        return new THREE.MeshPhysicalMaterial({
            color: "#8090A0", // Darker greyish tint
            metalness: 0.9, // Highly reflective
            roughness: 0.05,
            transmission: 0.95, // 95% TRANSPARENT
            opacity: 0.2,
            transparent: true,
            ior: 1.5,
            thickness: 0.1,
            side: THREE.DoubleSide,
            envMapIntensity: 2.0,
        });
    }, []);

    // Standardized Architectural Window Generation
    const windowCutouts = useMemo(() => {
        return generateWindowCutouts({
            roomWidth: width,
            roomHeight: height,
            roomDepth: depth - 0.25,
            cutoutWidth: openingWidth,
            cutoutHeight: openingHeight,
            verticalOffset: verticalCenteringOffset,
            penetrationDepth: 20.0,
        });
    }, [width, height, depth, openingWidth, openingHeight, verticalCenteringOffset]);

    return (
        <group
            position={roomPosition}
            rotation={[0, 0, rotation]}
            onPointerDown={onPointerDown}
            onDoubleClick={onDoubleClick}
        >
            {/* Structural Shell with Modular CSG Voids */}
            <RoomMeshCSG
                width={width}
                height={height}
                depth={depth - 0.25}
                material={frameMaterial}
                hasLeftWall={hasLeftWall}
                hasRightWall={hasRightWall}
                hasBackWall={true}
                cutouts={windowCutouts}
            />

            {/* High-Fidelity Glass Insets (Centered in vertical slits) */}
            {windowCutouts.map((cutout, index) => (
                <group key={`window-${index}`} position={[cutout.x, shellHeight / 2 + verticalCenteringOffset, 0]}>
                    <group position={[0, 0, -shellDepth + 0.1]}>
                        {/* The Glass Pane (Restricted to Shell Height for realism) */}
                        <mesh material={glassMaterial} position={[0, 0, 0.05]}>
                            <boxGeometry args={[openingWidth, shellHeight, 0.05]} />
                        </mesh>

                        {/* Industrial Horizontal Sills */}
                        <mesh material={frameMaterial} position={[0, shellHeight / 2 + 0.1, 0]}>
                            <boxGeometry args={[openingWidth + 0.4, 0.15, 0.3]} />
                        </mesh>
                        <mesh material={frameMaterial} position={[0, -shellHeight / 2 - 0.1, 0]}>
                            <boxGeometry args={[openingWidth + 0.4, 0.15, 0.3]} />
                        </mesh>
                    </group>
                </group>
            ))}
        </group>
    );
};
