import React, { useMemo } from "react";
import * as THREE from "three";
import { parseMaterial, getEmptyFloorMaterials } from "../../../engine/MaterialParser";
import { RoomMeshCSG } from "../visuals/RoomMeshCSG";
import { generateWindowCutouts } from "../visuals/WindowGenerator";
import {
    STRUCTURE_WALL_THICKNESS,
    STRUCTURE_FLOOR_THICKNESS,
    STRUCTURE_CEILING_THICKNESS,
} from "../constants/structuralConstants";

interface EmptyFloorRoomProps {
    position: [number, number, number];
    rotation: number;
    width: number;
    height: number;
    depth: number;
    hasLeftWall?: boolean;
    hasRightWall?: boolean;
    onPointerDown?: (e: any) => void;
    onDoubleClick?: (e: any) => void;
}

/**
 * EmptyFloorRoom: Renders vacant structural scaffolds (Lobby/Floor).
 *
 * Like ResidentialRoom, this component is ENCAPSULATED inside its parent
 * structure. Dimensions are inset by structure wall/floor/ceiling thicknesses.
 */
export const EmptyFloorRoom: React.FC<EmptyFloorRoomProps> = ({
    position,
    rotation,
    width,
    height,
    depth,
    hasLeftWall = true,
    hasRightWall = true,
    onPointerDown,
    onDoubleClick,
}) => {
    // ──────────────────────────────────────────────────────────
    // Structural Inset: Same logic as ResidentialRoom.
    // Room sits INSIDE the structure shell.
    // ──────────────────────────────────────────────────────────
    const insetWidth = useMemo(() => {
        let w = width;
        if (hasLeftWall) w -= STRUCTURE_WALL_THICKNESS;
        if (hasRightWall) w -= STRUCTURE_WALL_THICKNESS;
        return w;
    }, [width, hasLeftWall, hasRightWall]);

    const insetHeight = height - STRUCTURE_FLOOR_THICKNESS - STRUCTURE_CEILING_THICKNESS;
    const insetDepth = depth - STRUCTURE_WALL_THICKNESS; // Back wall; front is open

    // Architectural Configuration
    const openingWidth = 7.5;
    const openingHeight = 25.0;
    const verticalCenteringOffset = 0.275;

    const roomPosition = useMemo<[number, number, number]>(() => {
        let xOffset = 0;
        if (hasLeftWall && !hasRightWall) xOffset = STRUCTURE_WALL_THICKNESS / 2;
        if (!hasLeftWall && hasRightWall) xOffset = -STRUCTURE_WALL_THICKNESS / 2;

        return [
            position[0] + xOffset,
            position[1] + STRUCTURE_FLOOR_THICKNESS,       // Y: top of structure floor slab
            position[2] + STRUCTURE_WALL_THICKNESS / 2,    // Z: inner face of back wall
        ];
    }, [position, hasLeftWall, hasRightWall]);

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
            roomWidth: insetWidth,
            roomHeight: insetHeight,
            roomDepth: insetDepth,
            cutoutWidth: openingWidth,
            cutoutHeight: openingHeight,
            verticalOffset: verticalCenteringOffset,
            penetrationDepth: 20.0,
        });
    }, [insetWidth, insetHeight, insetDepth, openingWidth, openingHeight, verticalCenteringOffset]);

    return (
        <group
            position={roomPosition}
            rotation={[0, 0, rotation]}
            onPointerDown={onPointerDown}
            onDoubleClick={onDoubleClick}
        >
            <RoomMeshCSG
                width={insetWidth}
                height={insetHeight}
                depth={insetDepth}
                material={roomShellMaterials}
                hasLeftWall={hasLeftWall}
                hasRightWall={hasRightWall}
                hasBackWall={true}
                cutouts={windowCutouts}
            />

            {windowCutouts.map((cutout, index) => (
                <group key={`window-${index}`} position={[cutout.x, insetHeight / 2 + verticalCenteringOffset, 0]}>
                    <group position={[0, 0, -insetDepth + 0.1]}>
                        <mesh material={glassMaterial} position={[0, 0, 0.05]}>
                            <boxGeometry args={[openingWidth, insetHeight, 0.05]} />
                        </mesh>
                        <mesh material={frameMaterial} position={[0, insetHeight / 2 + 0.1, 0]}>
                            <boxGeometry args={[openingWidth + 0.4, 0.15, 0.3]} />
                        </mesh>
                        <mesh material={frameMaterial} position={[0, -insetHeight / 2 - 0.1, 0]}>
                            <boxGeometry args={[openingWidth + 0.4, 0.15, 0.3]} />
                        </mesh>
                    </group>
                </group>
            ))}
        </group>
    );
};
