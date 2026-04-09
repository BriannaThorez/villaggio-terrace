import React, { useMemo } from "react";
import {
    STRUCTURE_WALL_THICKNESS,
    STRUCTURE_FLOOR_THICKNESS,
    STRUCTURE_CEILING_THICKNESS,
} from "@/src/entities/rooms/constants/structuralConstants";
import { EmptyRoom } from "@/src/entities/rooms";

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
 * Orchestrates placement and delegates visuals to the EmptyRoom modular entity.
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

    return (
        <group
            position={roomPosition}
            rotation={[0, 0, rotation]}
            onPointerDown={onPointerDown}
            onDoubleClick={onDoubleClick}
        >
            <EmptyRoom
                width={insetWidth}
                height={insetHeight}
                depth={insetDepth}
                hasLeftWall={hasLeftWall}
                hasRightWall={hasRightWall}
            />
        </group>
    );
};
