import React, { useMemo } from "react";
import * as THREE from "three";
import { Addition, Subtraction, Geometry, Base } from "@react-three/csg";

interface RoomMeshCSGProps {
  width: number;
  height: number;
  depth: number;
  wallThickness?: number;
  material: THREE.Material | THREE.Material[];
  hasLeftWall?: boolean;
  hasRightWall?: boolean;
  hasBackWall?: boolean;
  cutouts?: {
    x: number;
    y: number;
    z: number;
    w: number;
    h: number;
    d: number;
  }[];
  frustumCulled?: boolean;
}

const scaleBoxUVs = (geo: THREE.BoxGeometry) => {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const norm = geo.attributes.normal;
  const uvScale = 0.1; // 1 texture repeat every 10 units

  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));
    const nz = Math.abs(norm.getZ(i));

    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    if (ny > 0.5) {
      uv.setXY(i, x * uvScale, z * uvScale);
    } else if (nx > 0.5) {
      uv.setXY(i, z * uvScale, y * uvScale);
    } else if (nz > 0.5) {
      uv.setXY(i, x * uvScale, y * uvScale);
    } else {
      uv.setXY(i, x * uvScale, y * uvScale);
    }
  }
  uv.needsUpdate = true;
  return geo;
};

const RoomMeshCSGInner: React.FC<RoomMeshCSGProps> = ({
  width,
  height,
  depth,
  wallThickness = 1.1,
  material,
  hasLeftWall = true,
  hasRightWall = true,
  hasBackWall = true,
  cutouts = [],
  frustumCulled = true,
}) => {
  const baseBox = useMemo(
    () => scaleBoxUVs(new THREE.BoxGeometry(width, height, depth)),
    [width, height, depth],
  );

  const effectiveSubWidth = useMemo(() => {
    let w = width;
    if (hasLeftWall) w -= wallThickness;
    else w += 0.2;
    if (hasRightWall) w -= wallThickness;
    else w += 0.2;
    return w;
  }, [width, wallThickness, hasLeftWall, hasRightWall]);

  const subXOffset = useMemo(() => {
    if (!hasLeftWall && !hasRightWall) return 0;
    if (!hasLeftWall) return -wallThickness / 2 - 0.1;
    if (!hasRightWall) return wallThickness / 2 + 0.1;
    return 0;
  }, [hasLeftWall, hasRightWall, wallThickness]);

  const subBox = useMemo(
    () =>
      scaleBoxUVs(
        new THREE.BoxGeometry(
          effectiveSubWidth,
          height - (wallThickness + 0.55),
          hasBackWall ? depth - wallThickness : depth + 10,
        ),
      ),
    [effectiveSubWidth, height, depth, wallThickness, hasBackWall],
  );

  const meshRef = React.useRef<THREE.Mesh>(null);

  const lastGeoRef = React.useRef<THREE.BufferGeometry | null>(null);

  React.useLayoutEffect(() => {
    if (!meshRef.current || !Array.isArray(material)) return;
    const geo = meshRef.current.geometry;
    
    // PHASE 3.5 Optimization: Only re-calc groups if the identity of the geometry has changed
    // (e.g. after a CSG operation finishes and swaps the geometry buffer)
    if (lastGeoRef.current === geo) return;
    lastGeoRef.current = geo;

    if (!geo.attributes.normal) return;

    const floorIdx = 2; 
    const ceilingIdx = 3; 
    const wallIdx = 0;

    const normals = geo.attributes.normal;
    const count = normals.count;
    
    geo.clearGroups();

    // Batch group creation to avoid re-calculating on every frame
    const groups: { start: number, count: number, materialIndex: number }[] = [];
    
    for (let i = 0; i < count; i += 3) {
      const ny = normals.getY(i);
      let targetIdx = wallIdx;
      
      if (ny > 0.5) targetIdx = floorIdx;
      else if (ny < -0.5) targetIdx = ceilingIdx;
      
      // Merge contiguous triangles with same material index into one group for performance
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.materialIndex === targetIdx) {
        lastGroup.count += 3;
      } else {
        groups.push({ start: i, count: 3, materialIndex: targetIdx });
      }
    }

    groups.forEach(g => geo.addGroup(g.start, g.count, g.materialIndex));
    meshRef.current.material = material;
  }, [material, width, height, depth]);

  return (
    <group position={[0, height / 2, -depth / 2]}>
      <mesh
        ref={meshRef}
        material={material}
        castShadow
        receiveShadow
        frustumCulled={frustumCulled}
      >
        <Geometry key={cutouts.length}>
          <Base geometry={baseBox} />
          <Subtraction
            geometry={subBox}
            position={[
              subXOffset,
              (wallThickness - 0.55) / 2,
              hasBackWall ? wallThickness : 0,
            ]}
          />

          {cutouts.map((c, i) => (
            <Subtraction key={`cutout-${i}`} position={[c.x, c.y, c.z]}>
              <boxGeometry args={[c.w, c.h, c.d]} />
            </Subtraction>
          ))}
        </Geometry>
      </mesh>
    </group>
  );
};

export const RoomMeshCSG = React.memo(RoomMeshCSGInner, (prev, next) => {
  return (
    prev.width === next.width &&
    prev.height === next.height &&
    prev.depth === next.depth &&
    prev.wallThickness === next.wallThickness &&
    prev.material === next.material &&
    prev.hasLeftWall === next.hasLeftWall &&
    prev.hasRightWall === next.hasRightWall &&
    prev.hasBackWall === next.hasBackWall &&
    prev.cutouts === next.cutouts
  );
});
