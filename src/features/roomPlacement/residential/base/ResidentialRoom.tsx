import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  useSimulationStore,
  SimulationNode,
} from "../../../../shared/utils/store";
import { useInteriorSubgrid } from "../../../interiorPlacement/hooks/useInteriorSubgrid";
import { StructuralCutoutOverlay } from "../../structural/skin/RoomSkin";
import type { StructuralRoomMetadata } from "../../structural/graph";
import {
  type RoomOpeningDefinition,
  type RoomStructuralSettings,
} from "../../structural/types";
import {
  STRUCTURE_WALL_THICKNESS,
  STRUCTURE_FLOOR_THICKNESS,
  STRUCTURE_CEILING_THICKNESS,
} from "@/src/entities/rooms/constants/structuralConstants";
import { ResidentialUnit, roomMetadata } from "@/src/entities/rooms";

interface ResidentialRoomProps {
  position: [number, number, number];
  rotation: number;
  size: [number, number];
  color: string;
  hasLeftWall?: boolean;
  hasRightWall?: boolean;
  openings?: RoomOpeningDefinition[];
  structuralSettings?: RoomStructuralSettings;
  structuralRoom?: StructuralRoomMetadata;
  material?: "plastic" | "glass";
  frontFaceVisibility?: "solid" | "transparent" | "hidden";
  onPointerDown?: (e: any) => void;
  onDoubleClick?: (e: any) => void;
  roomType?: string;
}

/**
 * ResidentialRoom: The primary dwelling unit component.
 *
 * Orchestrates placement and encapsulation, delegating visual
 * rendering to modular room entities.
 */
export const ResidentialRoom: React.FC<ResidentialRoomProps> = ({
  position,
  rotation,
  size: [width, height],
  color,
  hasLeftWall = true,
  hasRightWall = true,
  structuralSettings,
  structuralRoom,
  onPointerDown,
  onDoubleClick,
  roomType = "residential",
}) => {
  const depth = 40;

  const insetWidth = useMemo(() => {
    let w = width;
    if (hasLeftWall) w -= STRUCTURE_WALL_THICKNESS;
    if (hasRightWall) w -= STRUCTURE_WALL_THICKNESS;
    return w;
  }, [width, hasLeftWall, hasRightWall]);

  const insetHeight =
    height - STRUCTURE_FLOOR_THICKNESS - STRUCTURE_CEILING_THICKNESS;
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

  const showPlacementGrid = useSimulationStore(
    (state) => state.showPlacementGrid,
  );
  const selectedId = useSimulationStore((state) => state.selectedId);
  const isSelected = structuralRoom
    ? structuralRoom.roomId === selectedId
    : false;
  const isGridVisible = isSelected && showPlacementGrid;

  const placementGrid = useInteriorSubgrid(
    structuralRoom?.roomId ||
      `room_${position[0]}_${position[1]}_${position[2]}`,
    insetWidth,
    insetDepth,
    position[1],
    "tenth",
  );

  const textureMeta = useMemo(() => {
    // Attempt to parse metadata for dynamic textures
    const parsedMeta = (roomMetadata as any).rooms?.find((r: any) => r.id === roomType)?.metadata;
    // Fallback if none exist, grab generic residence
    const generic = (roomMetadata as any).residence || {};
    return {
      wallTextureId: parsedMeta?.wallTexture || generic.wallTexture || "beige_wall_1",
      floorTextureId: parsedMeta?.floorTexture || generic.floorTexture || "wood_floor_1",
      ceilingTextureId: parsedMeta?.ceilingTexture || generic.ceilingTexture || "beige_wall_1",
    };
  }, [roomType]);

  return (
    <group
      position={roomPosition}
      rotation={[0, 0, rotation]}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      {/* Delegate to Modular Residential Entity */}
      <ResidentialUnit
        width={insetWidth}
        height={insetHeight}
        depth={insetDepth}
        color={color}
        hasLeftWall={hasLeftWall}
        hasRightWall={hasRightWall}
        placementGrid={placementGrid}
        isGridVisible={isGridVisible}
        wallTextureId={textureMeta.wallTextureId}
        floorTextureId={textureMeta.floorTextureId}
        ceilingTextureId={textureMeta.ceilingTextureId}
      />

      {structuralRoom && (
        <StructuralCutoutOverlay
          room={structuralRoom}
          faceVisibility={{
            left: hasLeftWall,
            right: hasRightWall,
          }}
        />
      )}
    </group>
  );
};
