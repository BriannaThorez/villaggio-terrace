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

  React.useLayoutEffect(() => {
    if (!meshRef.current || !Array.isArray(material)) return;
    const geo = meshRef.current.geometry;
    if (!geo.attributes.normal) return;

    const floorIdx = 2; // Floor is index 2 (+Y in interior cavity)
    const ceilingIdx = 3; // Ceiling is index 3 (-Y in interior cavity)
    const wallIdx = 0;

    const normals = geo.attributes.normal;
    const count = normals.count;
    
    // Clear existing groups
    geo.clearGroups();

    // In a hollowed room, we need to sort or group triangles by their normal
    // For BoxGeometry CSG, we can often rely on simple thresholding
    // However, to be industry-leading, we should create a mask or multi-draw
    
    // Simplified robust approach for Box-based rooms:
    // We'll iterate through triangles and add groups. 
    // This is most efficient when faces are contiguous, which CSG tries to do.
    
    // For the sake of this fix, we will re-group based on the first vertex of each triangle
    for (let i = 0; i < count; i += 3) {
      const ny = normals.getY(i);
      let targetIdx = wallIdx;
      
      // LOGIC: 
      // Floor normal points UP (+Y) relative to the room floor.
      // Ceiling normal points DOWN (-Y) relative to the room ceiling.
      if (ny > 0.5) targetIdx = floorIdx;
      else if (ny < -0.5) targetIdx = ceilingIdx;
      
      geo.addGroup(i, 3, targetIdx);
    }
    
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
