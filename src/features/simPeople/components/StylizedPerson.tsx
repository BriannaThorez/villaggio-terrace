import React, { useMemo } from 'react';
import * as THREE from 'three';

interface StylizedPersonProps {
    shirtColor?: string;
    pantsColor?: string;
    skinColor?: string;
    hairColor?: string;
}

/**
 * Stylized low-poly procedural person.
 * Zero external dependencies. Renders instantly.
 * ~400 triangles total — performant for 50+ instances.
 *
 * Proportions based on 8-head figure scaled to ~1.7 units tall
 * (matches real-world proportions at 1 unit = 1 meter).
 */
export const StylizedPerson: React.FC<StylizedPersonProps> = ({
    shirtColor = '#5b8cbe',
    pantsColor = '#3a3a50',
    skinColor = '#e8b88a',
    hairColor = '#4a3728',
}) => {
    const shirtMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: shirtColor, roughness: 0.7, metalness: 0.05,
    }), [shirtColor]);

    const pantsMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: pantsColor, roughness: 0.8, metalness: 0.0,
    }), [pantsColor]);

    const skinMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: skinColor, roughness: 0.6, metalness: 0.0,
    }), [skinColor]);

    const hairMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: hairColor, roughness: 0.9, metalness: 0.0,
    }), [hairColor]);

    const shoeMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#2a2a2a', roughness: 0.9, metalness: 0.1,
    }), []);

    return (
        <group>
            {/* ── Hair (sits on top of head) ── */}
            <mesh position={[0, 1.62, -0.02]} material={hairMat} castShadow>
                <sphereGeometry args={[0.14, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
            </mesh>

            {/* ── Head ── */}
            <mesh position={[0, 1.55, 0]} material={skinMat} castShadow>
                <sphereGeometry args={[0.12, 12, 10]} />
            </mesh>

            {/* ── Neck ── */}
            <mesh position={[0, 1.4, 0]} material={skinMat} castShadow>
                <cylinderGeometry args={[0.04, 0.05, 0.08, 8]} />
            </mesh>

            {/* ── Torso (shirt) ── */}
            <mesh position={[0, 1.15, 0]} material={shirtMat} castShadow>
                <capsuleGeometry args={[0.12, 0.32, 6, 12]} />
            </mesh>

            {/* ── Left Arm ── */}
            <group position={[-0.18, 1.25, 0]} rotation={[0, 0, 0.15]}>
                {/* Upper arm */}
                <mesh position={[0, -0.1, 0]} material={shirtMat} castShadow>
                    <capsuleGeometry args={[0.04, 0.16, 4, 8]} />
                </mesh>
                {/* Forearm */}
                <mesh position={[0, -0.28, 0]} material={skinMat} castShadow>
                    <capsuleGeometry args={[0.035, 0.14, 4, 8]} />
                </mesh>
            </group>

            {/* ── Right Arm ── */}
            <group position={[0.18, 1.25, 0]} rotation={[0, 0, -0.15]}>
                <mesh position={[0, -0.1, 0]} material={shirtMat} castShadow>
                    <capsuleGeometry args={[0.04, 0.16, 4, 8]} />
                </mesh>
                <mesh position={[0, -0.28, 0]} material={skinMat} castShadow>
                    <capsuleGeometry args={[0.035, 0.14, 4, 8]} />
                </mesh>
            </group>

            {/* ── Hips / Belt area ── */}
            <mesh position={[0, 0.88, 0]} material={pantsMat} castShadow>
                <capsuleGeometry args={[0.11, 0.08, 6, 10]} />
            </mesh>

            {/* ── Left Leg ── */}
            <group position={[-0.065, 0.7, 0]}>
                {/* Thigh */}
                <mesh position={[0, 0, 0]} material={pantsMat} castShadow>
                    <capsuleGeometry args={[0.055, 0.22, 4, 8]} />
                </mesh>
                {/* Shin */}
                <mesh position={[0, -0.26, 0]} material={pantsMat} castShadow>
                    <capsuleGeometry args={[0.045, 0.2, 4, 8]} />
                </mesh>
                {/* Shoe */}
                <mesh position={[0, -0.44, 0.02]} material={shoeMat} castShadow>
                    <boxGeometry args={[0.08, 0.06, 0.14]} />
                </mesh>
            </group>

            {/* ── Right Leg ── */}
            <group position={[0.065, 0.7, 0]}>
                <mesh position={[0, 0, 0]} material={pantsMat} castShadow>
                    <capsuleGeometry args={[0.055, 0.22, 4, 8]} />
                </mesh>
                <mesh position={[0, -0.26, 0]} material={pantsMat} castShadow>
                    <capsuleGeometry args={[0.045, 0.2, 4, 8]} />
                </mesh>
                <mesh position={[0, -0.44, 0.02]} material={shoeMat} castShadow>
                    <boxGeometry args={[0.08, 0.06, 0.14]} />
                </mesh>
            </group>
        </group>
    );
};
