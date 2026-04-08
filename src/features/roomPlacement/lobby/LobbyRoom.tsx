import React, { useMemo } from "react";
import * as THREE from "three";
import { getLobbyMaterials } from "../../../engine/MaterialParser";
import { RoomMeshCSG } from "../visuals/RoomMeshCSG";
import {
    STRUCTURE_WALL_THICKNESS,
    STRUCTURE_FLOOR_THICKNESS,
    STRUCTURE_CEILING_THICKNESS,
} from "../constants/structuralConstants";

interface LobbyRoomProps {
    position: [number, number, number];
    rotation: number;
    width: number;
    height: number;
    depth: number;
    color?: string;
    hasLeftWall?: boolean;
    hasRightWall?: boolean;
    onPointerDown?: (e: any) => void;
    onDoubleClick?: (e: any) => void;
}

/**
 * LobbyRoom: Renders the entry point of the tower.
 * Features Grey Cartago Tiles and Painted Plaster walls.
 */
export const LobbyRoom: React.FC<LobbyRoomProps> = ({
    position,
    rotation,
    width,
    height,
    depth,
    color = "#ffffff",
    hasLeftWall = true,
    hasRightWall = true,
    onPointerDown,
    onDoubleClick,
}) => {
    const insetWidth = useMemo(() => {
        let w = width;
        if (hasLeftWall) w -= STRUCTURE_WALL_THICKNESS;
        if (hasRightWall) w -= STRUCTURE_WALL_THICKNESS;
        return w;
    }, [width, hasLeftWall, hasRightWall]);

    const insetHeight = height - STRUCTURE_FLOOR_THICKNESS - STRUCTURE_CEILING_THICKNESS;
    const insetDepth = depth - STRUCTURE_WALL_THICKNESS;

    const roomPosition = useMemo<[number, number, number]>(() => {
        let xOffset = 0;
        if (hasLeftWall && !hasRightWall) xOffset = STRUCTURE_WALL_THICKNESS / 2;
        if (!hasLeftWall && hasRightWall) xOffset = -STRUCTURE_WALL_THICKNESS / 2;

        return [
            position[0] + xOffset,
            position[1] + STRUCTURE_FLOOR_THICKNESS,
            position[2] + STRUCTURE_WALL_THICKNESS / 2,
        ];
    }, [position, hasLeftWall, hasRightWall]);

    const materials = useMemo(() => {
        return getLobbyMaterials(color);
    }, [color]);

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
                material={materials}
                hasLeftWall={hasLeftWall}
                hasRightWall={hasRightWall}
                hasBackWall={true}
            />
        </group>
    );
};
