import React, { useMemo } from "react";
import * as THREE from "three";
import { parseMaterial } from "../../../engine/MaterialParser";
import { buildRoomShellGeometry } from "../structural/geometry";
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
  onPointerDown?: (e: any) => void;
  onDoubleClick?: (e: any) => void;
}

const WALL_THICKNESS = 1.1;

const materialCache = new Map<string, THREE.Material[]>();
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

const buildRoomBodyGeometry = (
  width: number,
  height: number,
  depth: number,
  hasLeftWall: boolean,
  hasRightWall: boolean,
) => {
  const geometry = new THREE.BoxGeometry(width, height, depth);

  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");

  // Map BoxGeometry faces:
  // 0 right, 1 left, 2 top, 3 bottom, 4 front(+z), 5 back(-z)
  const visibleFaces = new Set<number>([0, 1, 2, 3, 5]);

  if (!hasLeftWall) visibleFaces.delete(1);
  if (!hasRightWall) visibleFaces.delete(0);

  const index = geometry.index;
  if (index) {
    const indexArray = Array.from(index.array as ArrayLike<number>);
    const filtered: number[] = [];
    for (let i = 0; i < indexArray.length; i += 6) {
      const faceIndex = i / 6;
      if (visibleFaces.has(faceIndex)) {
        filtered.push(
          indexArray[i],
          indexArray[i + 1],
          indexArray[i + 2],
          indexArray[i + 3],
          indexArray[i + 4],
          indexArray[i + 5],
        );
      }
    }
    geometry.setIndex(filtered);
  }

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
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

  const roomGeometry = useMemo(
    () =>
      buildRoomShellGeometry(shellDimensions, effectiveOpenings).shellGeometry,
    [shellDimensions, effectiveOpenings],
  );

  const materials = useMemo(() => {
    const cacheKey = `${color}_${hasLeftWall}_${hasRightWall}`;
    if (!materialCache.has(cacheKey)) {
      const mat = parseMaterial({
        albedo: color,
        roughness: 0.8,
        metalness: 0.1,
      });
      mat.side = THREE.DoubleSide;
      materialCache.set(cacheKey, [mat, mat, mat, mat, mat, mat]);
    }
    return materialCache.get(cacheKey)!;
  }, [color, hasLeftWall, hasRightWall]);

  const edgeGeometry = useMemo(() => {
    const fallback = buildRoomBodyGeometry(
      width,
      height,
      depth,
      hasLeftWall,
      hasRightWall,
    );
    fallback.computeBoundingBox();
    fallback.computeBoundingSphere();
    return fallback;
  }, [width, height, depth, hasLeftWall, hasRightWall]);

  const cellLinesGeo = useMemo(() => {
    const numLines = Math.floor(width / 10) - 1;
    if (numLines <= 0) return null;

    const points: THREE.Vector3[] = [];
    for (let i = 0; i < numLines; i++) {
      const x = -width / 2 + (i + 1) * 10;
      points.push(new THREE.Vector3(x, -height / 2, -depth / 2 + 0.1));
      points.push(new THREE.Vector3(x, height / 2, -depth / 2 + 0.1));
      points.push(new THREE.Vector3(x, height / 2 - 0.1, -depth / 2));
      points.push(new THREE.Vector3(x, height / 2 - 0.1, depth / 2));
      points.push(new THREE.Vector3(x, -height / 2 + 0.1, -depth / 2));
      points.push(new THREE.Vector3(x, -height / 2 + 0.1, depth / 2));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [width, height, depth]);

  const edgesGeo = useMemo(() => {
    if (hasLeftWall && hasRightWall && effectiveOpenings.length === 0) {
      return sharedGeometries.edges;
    }
    return edgeGeometry;
  }, [edgeGeometry, effectiveOpenings.length, hasLeftWall, hasRightWall]);

  return (
    <group
      position={position}
      rotation={[0, 0, rotation]}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      <mesh geometry={roomGeometry} material={materials} />
      <lineSegments geometry={edgesGeo} material={sharedTrimMaterial} />
      {cellLinesGeo && (
        <lineSegments
          geometry={cellLinesGeo}
          material={sharedCellLineMaterial}
        />
      )}
    </group>
  );
};
