import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { parseMaterial } from "../../../../engine/MaterialParser";
import { buildRoomShellGeometry } from "../../structural/geometry";
import { RoomSkin } from "../../structural/skin/RoomSkin";
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

interface ResidentialRoomProps {
  position: [number, number, number];
  rotation: number;
  size: [number, number];
  color: string;
  hasLeftWall?: boolean;
  hasRightWall?: boolean;
  openings?: RoomOpeningDefinition[];
  structuralSettings?: Partial<RoomStructuralSettings>;
  structuralRoom?: StructuralRoomMetadata;
  material?: "plastic" | "glass";
  frontFaceVisibility?: "solid" | "transparent" | "hidden";
  onPointerDown?: (e: any) => void;
  onDoubleClick?: (e: any) => void;
}

const WALL_THICKNESS = 1.1;

const sharedTrimMaterial = new THREE.LineBasicMaterial({
  color: "#333333",
  transparent: true,
  opacity: 0.5,
});

const sharedGeometries = {
  box: new THREE.BoxGeometry(1, 1, 1),
  edges: new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
};

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
}) => {
  const depth = 40;
  const shellDimensions = useMemo(
    () => ({
      ...DEFAULT_ROOM_SHELL_DIMENSIONS,
      width: width - (hasLeftWall ? 0.25 : 0) - (hasRightWall ? 0.25 : 0),
      height: height - 0.75, // Floor is 0.5 thick, ceiling is 0.25 thick
      depth: depth - 0.25, // Front is open, back wall is 0.25 thick
      ...(structuralSettings?.dimensions ?? {}),
    }),
    [width, height, depth, hasLeftWall, hasRightWall, structuralSettings?.dimensions],
  );
  const effectiveOpenings = structuralSettings?.openings ?? openings;

  const roomGeometryResult = useMemo(
    () => buildRoomShellGeometry(shellDimensions, effectiveOpenings),
    [shellDimensions, effectiveOpenings],
  );
  const roomGeometry = roomGeometryResult.shellGeometry;

  const roomPosition = useMemo<[number, number, number]>(() => {
    let xOffset = 0;
    if (hasLeftWall && !hasRightWall) xOffset = 0.125;
    if (!hasLeftWall && hasRightWall) xOffset = -0.125;

    // Y: 0.5 up for floor thickness. Z: 0.125 forward for back wall thickness.
    return [position[0] + xOffset, position[1] + 0.5, position[2] + 0.125];
  }, [position, hasLeftWall, hasRightWall]);

  const materials = useMemo(() => {
    const mat = parseMaterial({
      albedo: color,
      roughness: 0.8,
      metalness: 0.1,
    });
    mat.side = THREE.FrontSide;
    mat.shadowSide = THREE.BackSide;
    return [mat, mat, mat, mat, mat, mat];
  }, [color]);

  const showPlacementGrid = useSimulationStore((state) => state.showPlacementGrid);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const isSelected = structuralRoom ? (structuralRoom.roomId === selectedId) : false;
  const isGridVisible = isSelected && showPlacementGrid; // Overlay visible exclusively when both debugging is enabled and the unit is active.

  const placementGrid = useInteriorSubgrid(
    structuralRoom?.roomId ?? "temp-room",
    width,
    depth,
    0,
    "tenth"
  );

  useEffect(() => {
    return () => {
      if (roomGeometryResult.shellGeometry !== roomGeometry) {
        roomGeometryResult.shellGeometry.dispose();
      }
    };
  }, [roomGeometry, roomGeometryResult.shellGeometry]);

  return (
    <group
      position={roomPosition}
      rotation={[0, 0, rotation]}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      {/* 
        Industry-leading Single-Mesh CSG Rendering.
        The Base CSG replaces overlapping primitive boundaries for a seamless interior.
      */}
      <RoomMeshCSG
        width={shellDimensions.width}
        height={shellDimensions.height}
        depth={shellDimensions.depth}
        material={materials[0]}
        hasLeftWall={hasLeftWall}
        hasRightWall={hasRightWall}
      />

      {structuralRoom && (
        <RoomSkin
          room={structuralRoom}
          color={color}
          material={material}
          frontFaceVisibility={frontFaceVisibility}
          faceVisibility={{
            left: hasLeftWall,
            right: hasRightWall,
          }}
        />
      )}
      <group position={[0, 2.22, -depth / 2]}>
        <PlacementHologram grid={placementGrid} visible={isGridVisible} />

        {/* 
          Diagnostic Desk: Snapped to the Placement Engine group.
          This ensures coordinate parity between the blue guide and the object.
          Target: Second Cell (index 1) but Second Atom from the front (index 8).
        */}
        <mesh
          position={(() => {
            const offset = computeSnappedWorldOffset(
              placementGrid,
              1, // Second Cell (X Index 1)
              3, // Front-most Cell (Z Index 3)
              5, // Centered in Cell X (Atom index 5)
              8, // Second Atom from the front (index 8)
              { width: 10, depth: 10 } // Constraint: size of the debug box
            );
            // offset[1] is baseFloorY. Since we are in the grid group, we only need local height.
            return [offset[0], 2.5, offset[2]];
          })()}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[8, 2, 6]} />
          <meshStandardMaterial color="#FF5F1F" roughness={0.8} />
          {/* Pillow */}
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
