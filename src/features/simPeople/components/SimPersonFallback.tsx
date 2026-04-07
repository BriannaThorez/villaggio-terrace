import React, { useMemo } from 'react';
import * as THREE from 'three';

interface SimPersonFallbackProps {
    tint?: string;
}

/**
 * Procedural capsule character — renders immediately with zero async
 * dependencies. Used as the Suspense fallback and as a permanent
 * lightweight option for background/distant sims.
 * 
 * Anatomy: capsule body + sphere head + two thin cylinder legs.
 * Total geometry: 4 primitives, ~200 triangles.
 */
export const SimPersonFallback: React.FC<SimPersonFallbackProps> = ({ tint = '#6b8cae' }) => {
    const bodyMaterial = useMemo(
        () => new THREE.MeshStandardMaterial({ color: tint, roughness: 0.6, metalness: 0.1 }),
        [tint]
    );
    const skinMaterial = useMemo(
        () => new THREE.MeshStandardMaterial({ color: '#e8c4a0', roughness: 0.7, metalness: 0.0 }),
        []
    );
    const pantsMaterial = useMemo(
        () => new THREE.MeshStandardMaterial({ color: '#3a3a4a', roughness: 0.8, metalness: 0.0 }),
        []
    );

    return (
        <group>
            {/* Head */}
            <mesh position={[0, 7.2, 0]} material={skinMaterial} castShadow>
                <sphereGeometry args={[1.0, 12, 8]} />
            </mesh>

            {/* Torso (capsule approximation) */}
            <mesh position={[0, 4.8, 0]} material={bodyMaterial} castShadow>
                <capsuleGeometry args={[0.8, 2.4, 6, 12]} />
            </mesh>

            {/* Left Leg */}
            <mesh position={[-0.4, 1.5, 0]} material={pantsMaterial} castShadow>
                <capsuleGeometry args={[0.35, 2.0, 4, 8]} />
            </mesh>

            {/* Right Leg */}
            <mesh position={[0.4, 1.5, 0]} material={pantsMaterial} castShadow>
                <capsuleGeometry args={[0.35, 2.0, 4, 8]} />
            </mesh>
        </group>
    );
};
