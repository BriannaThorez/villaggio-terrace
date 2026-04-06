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

export const RoomMeshCSG: React.FC<RoomMeshCSGProps> = ({
    width,
    height,
    depth,
    wallThickness = 1.1,
    material,
    hasLeftWall = true,
    hasRightWall = true,
}) => {
    // Pre-calculate distinct geometries to guarantee the CSG boolean parser recognizes them 
    // and accurately processes their UV definitions for bump/normal textures.
    const baseBox = useMemo(() => scaleBoxUVs(new THREE.BoxGeometry(width, height, depth)), [width, height, depth]);

    // SEAMLESS BLENDING CALCULATION:
    // We adjust the subtraction volume to extend beyond the base bounds if walls are omitted.
    const effectiveSubWidth = useMemo(() => {
        let w = width;
        if (hasLeftWall) w -= wallThickness;
        if (hasRightWall) w -= wallThickness;
        return w;
    }, [width, wallThickness, hasLeftWall, hasRightWall]);

    const subXOffset = useMemo(() => {
        if (!hasLeftWall && !hasRightWall) return 0;
        if (!hasLeftWall) return -wallThickness / 2;
        if (!hasRightWall) return wallThickness / 2;
        return 0;
    }, [hasLeftWall, hasRightWall, wallThickness]);

    const subBox = useMemo(() =>
        scaleBoxUVs(new THREE.BoxGeometry(
            effectiveSubWidth,
            height - wallThickness * 3, // Thicker structural floor slab
            depth
        )),
        [effectiveSubWidth, height, depth, wallThickness]
    );

    return (
        <group position={[0, height / 2, -depth / 2]}>
            <mesh material={material} castShadow receiveShadow>
                <Geometry computeVertexNormals>
                    <Base geometry={baseBox} />
                    {/* 
                        STRUCTURAL FLOOR REMEDIATION: 
                        Shift SUBtraction UP by wallThickness/2 to ensure the floor slab is preserved.
                        Shift Z by wallThickness to sheer the front face.
                    */}
                    <Subtraction geometry={subBox} position={[subXOffset, wallThickness / 2, wallThickness]} />
                </Geometry>
            </mesh>
        </group>
    );
};
