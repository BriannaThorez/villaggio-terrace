import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { getResidentialMaterials } from "../../../../engine/MaterialParser";
import { StructuralCutoutOverlay } from "../../structural/skin/RoomSkin";
import { RoomMeshCSG } from "../../visuals/RoomMeshCSG";
import {
  useSimulationStore,
  SimulationNode,
} from "../../../../shared/utils/store";
import { useInteriorSubgrid } from "../../../interiorPlacement/hooks/useInteriorSubgrid";
import { PlacementHologram } from "../../../interiorPlacement/ui/PlacementHologram";
import type { StructuralRoomMetadata } from "../../structural/graph";
import {
  DEFAULT_ROOM_SHELL_DIMENSIONS,
  type RoomOpeningDefinition,
  type RoomStructuralSettings,
} from "../../structural/types";
import { computeSnappedWorldOffset } from "../../../interiorPlacement/domain/CoordinateEngine";
import {
  STRUCTURE_WALL_THICKNESS,
  STRUCTURE_FLOOR_THICKNESS,
  STRUCTURE_CEILING_THICKNESS,
} from "../../constants/structuralConstants";

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
 * Rooms are ENCAPSULATED inside their parent structure. The outer face of the
 * room's walls aligns with the INNER face of the structure's walls, and the
 * room's floor base sits on TOP of the structure's floor slab.
 */
export const ResidentialRoom: React.FC<ResidentialRoomProps> = ({
  position,
  rotation,
  size: [width, height],
  color,
  hasLeftWall = true,
  hasRightWall = true,
  openings = [],
  structuralSettings,
  structuralRoom,
  material = "plastic",
  frontFaceVisibility = "solid",
  onPointerDown,
  onDoubleClick,
  roomType = "residential",
}) => {
  const depth = 40;

  // ──────────────────────────────────────────────────────────
  // Structural Inset: Room dimensions are SMALLER than the
  // parent structure by the structure's wall/floor/ceiling
  // thicknesses. This creates the encapsulated visual.
  // ──────────────────────────────────────────────────────────
  const insetWidth = useMemo(() => {
    let w = width;
    // Subtract structure wall thickness on sides that have walls
    if (hasLeftWall) w -= STRUCTURE_WALL_THICKNESS;
    if (hasRightWall) w -= STRUCTURE_WALL_THICKNESS;
    return w;
  }, [width, hasLeftWall, hasRightWall]);

  const insetHeight = height - STRUCTURE_FLOOR_THICKNESS - STRUCTURE_CEILING_THICKNESS;
  const insetDepth = depth - STRUCTURE_WALL_THICKNESS; // Back wall only; front is open

  const shellDimensions = useMemo(
    () => ({
      ...DEFAULT_ROOM_SHELL_DIMENSIONS,
      width: insetWidth,
      height: insetHeight,
      depth: insetDepth,
      ...(structuralSettings?.dimensions ?? {}),
    }),
    [insetWidth, insetHeight, insetDepth, structuralSettings?.dimensions],
  );

  // ──────────────────────────────────────────────────────────
  // Room Position: Offset so the room sits INSIDE the structure.
  //   Y: Start at the top of the structure's floor slab
  //   Z: Start at the inner face of the structure's back wall
  //   X: Center within the available interior width
  // ──────────────────────────────────────────────────────────
  const roomPosition = useMemo<[number, number, number]>(() => {
    let xOffset = 0;
    // When one wall is shared (removed), shift the room towards that side
    // so the remaining wall stays aligned with the structure's inner face
    if (hasLeftWall && !hasRightWall) xOffset = STRUCTURE_WALL_THICKNESS / 2;
    if (!hasLeftWall && hasRightWall) xOffset = -STRUCTURE_WALL_THICKNESS / 2;

    return [
      position[0] + xOffset,
      position[1] + STRUCTURE_FLOOR_THICKNESS,        // Y: top of structure floor slab
      position[2] + STRUCTURE_WALL_THICKNESS / 2,     // Z: inner face of back wall
    ];
  }, [position, hasLeftWall, hasRightWall]);

  const materials = useMemo(() => {
    return getResidentialMaterials(color);
  }, [color]);

  const showPlacementGrid = useSimulationStore((state) => state.showPlacementGrid);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const isSelected = structuralRoom ? (structuralRoom.roomId === selectedId) : false;
  const isGridVisible = isSelected && showPlacementGrid;

  const placementGrid = useInteriorSubgrid(
    structuralRoom?.roomId || `room_${position[0]}_${position[1]}_${position[2]}`,
    shellDimensions.width,
    shellDimensions.depth,
    position[1],
    'tenth'
  );

  return (
    <group
      position={roomPosition}
      rotation={[0, 0, rotation]}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      <RoomMeshCSG
        width={shellDimensions.width}
        height={shellDimensions.height}
        depth={shellDimensions.depth}
        material={materials[0]}
        hasLeftWall={hasLeftWall}
        hasRightWall={hasRightWall}
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

      <group position={[0, 2.22, -depth / 2]}>
        <PlacementHologram grid={placementGrid} visible={isGridVisible} />

        {/* 
          Standard Residential Furnishing: BED.
          Constantly visible to demonstrate room utilization.
        */}
        {roomType === "residential" && (
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
        )}
      </group>
    </group>
  );
};
