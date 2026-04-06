import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Addition, Subtraction, Geometry, Base } from '@react-three/csg';

interface RoomMeshCSGProps {
    width: number;
    height: number;
    depth: number;
    wallThickness?: number;
    material: THREE.Material | THREE.Material[];
}

export const RoomMeshCSG: React.FC<RoomMeshCSGProps> = ({
    width,
    height,
    depth,
    wallThickness = 1.1,
    material
}) => {
    // Pre-calculate distinct geometries to guarantee the CSG boolean parser recognizes them 
    // and accurately processes their UV definitions for bump/normal textures.
    const baseBox = useMemo(() => new THREE.BoxGeometry(width, height, depth), [width, height, depth]);
    const subBox = useMemo(() =>
        new THREE.BoxGeometry(
            width - wallThickness * 2,
            height - wallThickness * 3, // Thicker structural floor slab
            depth
        ),
        [width, height, depth, wallThickness]
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
                    <Subtraction geometry={subBox} position={[0, wallThickness / 2, wallThickness]} />
                </Geometry>
            </mesh>
        </group>
    );
};
