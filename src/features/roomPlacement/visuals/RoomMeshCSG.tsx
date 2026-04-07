import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Addition, Subtraction, Geometry, Base } from '@react-three/csg';

interface RoomMeshCSGProps {
    width: number;
    height: number;
    depth: number;
    wallThickness?: number;
    material: THREE.Material | THREE.Material[];
    hasLeftWall?: boolean;
    hasRightWall?: boolean;
    hasBackWall?: boolean;
    cutouts?: { x: number, y: number, z: number, w: number, h: number, d: number }[];
}

const scaleBoxUVs = (geo: THREE.BoxGeometry) => {
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const norm = geo.attributes.normal;
    const uvScale = 0.1; // 1 texture repeat every 10 units

    for (let i = 0; i < uv.count; i++) {
        const nx = Math.abs(norm.getX(i));
        const ny = Math.abs(norm.getY(i));
        // nz is dominant if others aren't

        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);

        if (nx > 0.5) {
            uv.setXY(i, z * uvScale, y * uvScale);
        } else if (ny > 0.5) {
            uv.setXY(i, x * uvScale, z * uvScale);
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
    cutouts = []
}) => {
    // ... same baseBox and effectiveSubWidth code ...
    const baseBox = useMemo(() => scaleBoxUVs(new THREE.BoxGeometry(width, height, depth)), [width, height, depth]);

    const effectiveSubWidth = useMemo(() => {
        let w = width;
        if (hasLeftWall) w -= wallThickness; else w += 0.2;
        if (hasRightWall) w -= wallThickness; else w += 0.2;
        return w;
    }, [width, wallThickness, hasLeftWall, hasRightWall]);

    const subXOffset = useMemo(() => {
        if (!hasLeftWall && !hasRightWall) return 0;
        if (!hasLeftWall) return -wallThickness / 2 - 0.1;
        if (!hasRightWall) return wallThickness / 2 + 0.1;
        return 0;
    }, [hasLeftWall, hasRightWall, wallThickness]);

    const subBox = useMemo(() =>
        scaleBoxUVs(new THREE.BoxGeometry(
            effectiveSubWidth,
            height - (wallThickness + 0.55), // Standard structural floor (1.1) + thin ceiling (0.55)
            hasBackWall ? depth - wallThickness : depth + 10
        )),
        [effectiveSubWidth, height, depth, wallThickness, hasBackWall]
    );

    return (
        <group position={[0, height / 2, -depth / 2]}>
            <mesh material={material} castShadow receiveShadow>
                <Geometry computeVertexNormals>
                    <Base geometry={baseBox} />
                    {/* Main Interior Hollowing - Offset upwards to preserve floor slab */}
                    <Subtraction geometry={subBox} position={[subXOffset, (wallThickness - 0.55) / 2, hasBackWall ? wallThickness : 0]} />

                    {/* Architectural Window/Entrance Cutouts */}
                    {cutouts.map((c, i) => (
                        <Subtraction
                            key={`cutout-${i}`}
                            position={[c.x, c.y, c.z]}
                        >
                            <boxGeometry args={[c.w, c.h, c.d]} />
                        </Subtraction>
                    ))}
                </Geometry>
            </mesh>
        </group>
    );
};

/**
 * Memoized CSG room shell renderer.
 * Custom comparator prevents re-computation when parent re-renders
 * without changing structural geometry props.
 */
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
        prev.cutouts === next.cutouts // Reference equality — parents must stabilize via useMemo
    );
});

