import React, { useMemo } from 'react';
import * as THREE from 'three';
import { parseMaterial } from '../../../engine/MaterialParser';

interface ResidentialRoomProps {
  position: [number, number, number];
  rotation: number;
  size: [number, number];
  color: string;
  hasLeftWall?: boolean;
  hasRightWall?: boolean;
  onPointerDown?: (e: any) => void;
  onDoubleClick?: (e: any) => void;
}

// Global caches to prevent massive instantiation delays and draw call overhead
const materialCache = new Map<string, THREE.Material[]>();
const invisibleMaterial = new THREE.MeshBasicMaterial({ visible: false });
const sharedTrimMaterial = new THREE.LineBasicMaterial({ color: '#333333', transparent: true, opacity: 0.5 });
const sharedCellLineMaterial = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3 });

const sharedGeometries = {
  box: new THREE.BoxGeometry(1, 1, 1),
  edges: new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
};

export const ResidentialRoom: React.FC<ResidentialRoomProps> = ({ position, rotation, size: [width, height], color, hasLeftWall = true, hasRightWall = true, onPointerDown, onDoubleClick }) => {
  const depth = 40; // Standard depth for all rooms

  const materials = useMemo(() => {
    const cacheKey = `${color}_${hasLeftWall}_${hasRightWall}`;
    if (!materialCache.has(cacheKey)) {
      const mat = parseMaterial({
          albedo: color,
          roughness: 0.8,
          metalness: 0.1,
      });
      mat.side = THREE.DoubleSide;
      // BoxGeometry material order: right(+x), left(-x), top(+y), bottom(-y), front(+z), back(-z)
      materialCache.set(cacheKey, [
        hasRightWall ? mat : invisibleMaterial, 
        hasLeftWall ? mat : invisibleMaterial, 
        mat, 
        mat, 
        invisibleMaterial, 
        mat
      ]);
    }
    return materialCache.get(cacheKey)!;
  }, [color, hasLeftWall, hasRightWall]);

  // Procedurally generate cell lines as a single BufferGeometry (1 draw call)
  const cellLinesGeo = useMemo(() => {
    const numLines = Math.floor(width / 10) - 1;
    if (numLines <= 0) return null;
    
    const points = [];
    for (let i = 0; i < numLines; i++) {
      const x = -width / 2 + (i + 1) * 10;
      // Back wall vertical line
      points.push(new THREE.Vector3(x, -height / 2, -depth / 2 + 0.1));
      points.push(new THREE.Vector3(x, height / 2, -depth / 2 + 0.1));
      // Top wall line (depth-wise)
      points.push(new THREE.Vector3(x, height / 2 - 0.1, -depth / 2));
      points.push(new THREE.Vector3(x, height / 2 - 0.1, depth / 2));
      // Bottom wall line (depth-wise)
      points.push(new THREE.Vector3(x, -height / 2 + 0.1, -depth / 2));
      points.push(new THREE.Vector3(x, -height / 2 + 0.1, depth / 2));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [width, height, depth]);

  // Procedurally generate edges to omit left/right if needed
  const edgesGeo = useMemo(() => {
    if (hasLeftWall && hasRightWall) return sharedGeometries.edges;
    
    // Custom edges if walls are missing
    const points = [];
    const hw = width / 2;
    const hh = height / 2;
    const hd = depth / 2;
    
    // Front face
    points.push(new THREE.Vector3(-hw, hh, hd), new THREE.Vector3(hw, hh, hd)); // Top
    points.push(new THREE.Vector3(-hw, -hh, hd), new THREE.Vector3(hw, -hh, hd)); // Bottom
    if (hasLeftWall) points.push(new THREE.Vector3(-hw, -hh, hd), new THREE.Vector3(-hw, hh, hd)); // Left
    if (hasRightWall) points.push(new THREE.Vector3(hw, -hh, hd), new THREE.Vector3(hw, hh, hd)); // Right
    
    // Back face
    points.push(new THREE.Vector3(-hw, hh, -hd), new THREE.Vector3(hw, hh, -hd)); // Top
    points.push(new THREE.Vector3(-hw, -hh, -hd), new THREE.Vector3(hw, -hh, -hd)); // Bottom
    if (hasLeftWall) points.push(new THREE.Vector3(-hw, -hh, -hd), new THREE.Vector3(-hw, hh, -hd)); // Left
    if (hasRightWall) points.push(new THREE.Vector3(hw, -hh, -hd), new THREE.Vector3(hw, hh, -hd)); // Right
    
    // Connecting lines (depth)
    if (hasLeftWall) {
      points.push(new THREE.Vector3(-hw, hh, hd), new THREE.Vector3(-hw, hh, -hd)); // Top-left
      points.push(new THREE.Vector3(-hw, -hh, hd), new THREE.Vector3(-hw, -hh, -hd)); // Bottom-left
    }
    if (hasRightWall) {
      points.push(new THREE.Vector3(hw, hh, hd), new THREE.Vector3(hw, hh, -hd)); // Top-right
      points.push(new THREE.Vector3(hw, -hh, hd), new THREE.Vector3(hw, -hh, -hd)); // Bottom-right
    }
    
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [width, height, depth, hasLeftWall, hasRightWall]);

  return (
    <group position={position} rotation={[0, 0, rotation]} onPointerDown={onPointerDown} onDoubleClick={onDoubleClick}>
      {/* Main Body (5 walls, 1 draw call via multi-material) */}
      <mesh geometry={sharedGeometries.box} material={materials} scale={[width, height, depth]} />
      
      {/* Edges (1 draw call via LineSegments) */}
      <lineSegments geometry={edgesGeo} material={sharedTrimMaterial} />
      
      {/* Cell Lines (1 draw call via LineSegments) */}
      {cellLinesGeo && (
        <lineSegments geometry={cellLinesGeo} material={sharedCellLineMaterial} />
      )}
    </group>
  );
};
