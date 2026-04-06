import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { parseMaterial } from "../../../engine/MaterialParser";
import { buildRoomShellGeometry } from "../structural/geometry";
import { RoomSkin } from "../structural/skin/RoomSkin";
import { RoomMeshCSG } from "../visuals/RoomMeshCSG";
import type { StructuralRoomMetadata } from "../structural/graph";
import {
  DEFAULT_ROOM_SHELL_DIMENSIONS,
  type RoomOpeningDefinition,
  type RoomStructuralSettings,
} from "../structural/types";

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
const sharedCellLineMaterial = new THREE.LineBasicMaterial({
  color: "#ffffff",
  transparent: true,
  opacity: 0.3,
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
      width,
      height,
      depth,
      ...(structuralSettings?.dimensions ?? {}),
    }),
    [width, height, depth, structuralSettings?.dimensions],
  );
  const effectiveOpenings = structuralSettings?.openings ?? openings;

  const roomGeometryResult = useMemo(
    () => buildRoomShellGeometry(shellDimensions, effectiveOpenings),
    [shellDimensions, effectiveOpenings],
  );
  const roomGeometry = roomGeometryResult.shellGeometry;

  const [, , zOffset] = position;
  const groundedPosition: [number, number, number] = [0, 0, zOffset];

  const materials = useMemo(() => {
    const mat = parseMaterial({
      albedo: color,
      roughness: 0.8,
      metalness: 0.1,
    });
    mat.side = THREE.DoubleSide;
    return [mat, mat, mat, mat, mat, mat];
  }, [color]);

  const cellLinesGeo = useMemo(() => {
    const numLines = Math.floor(width / 10) - 1;
    if (numLines <= 0) return null;

    const floorY = 0;
    const ceilingY = height;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < numLines; i++) {
      const x = -width / 2 + (i + 1) * 10;
      points.push(new THREE.Vector3(x, floorY, -depth / 2 + 0.1));
      points.push(new THREE.Vector3(x, ceilingY, -depth / 2 + 0.1));
      points.push(new THREE.Vector3(x, ceilingY - 0.1, -depth / 2));
      points.push(new THREE.Vector3(x, ceilingY - 0.1, depth / 2));
      points.push(new THREE.Vector3(x, floorY + 0.1, -depth / 2));
      points.push(new THREE.Vector3(x, floorY + 0.1, depth / 2));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [width, height, depth]);

  useEffect(() => {
    return () => {
      if (roomGeometryResult.shellGeometry !== roomGeometry) {
        roomGeometryResult.shellGeometry.dispose();
      }

      if (cellLinesGeo) {
        cellLinesGeo.dispose();
      }
    };
  }, [roomGeometry, roomGeometryResult.shellGeometry, cellLinesGeo]);

  return (
    <group
      position={groundedPosition}
      rotation={[0, 0, rotation]}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      {/* 
        Industry-leading Single-Mesh CSG Rendering.
        The Base CSG replaces overlapping primitive boundaries for a seamless interior.
      */}
      <RoomMeshCSG
        width={width}
        height={height}
        depth={depth}
        material={materials[0]}
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
      {cellLinesGeo && (
        <lineSegments
          geometry={cellLinesGeo}
          material={sharedCellLineMaterial}
        />
      )}
    </group>
  );
};
