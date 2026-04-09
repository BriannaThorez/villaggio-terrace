import React from "react";
import { RoomMeshCSG } from "../../visuals/RoomMeshCSG";
import { getLobbyMaterials } from "@/src/engine/MaterialParser";

interface Lobby1VisualsProps {
    width: number;
    height: number;
    depth: number;
    color?: string;
    hasLeftWall: boolean;
    hasRightWall: boolean;
}

/**
 * Lobby1: Entry point visual entity.
 */
export const Lobby1: React.FC<Lobby1VisualsProps> = ({
    width,
    height,
    depth,
    color = "#ffffff",
    hasLeftWall,
    hasRightWall,
}) => {
    const materials = React.useMemo(() => getLobbyMaterials(color), [color]);

    return (
        <RoomMeshCSG
            width={width}
            height={height}
            depth={depth}
            material={materials}
            hasLeftWall={hasLeftWall}
            hasRightWall={hasRightWall}
            hasBackWall={true}
        />
    );
};
