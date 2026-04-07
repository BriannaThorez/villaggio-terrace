import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePeopleStore } from '../store/usePeopleStore';
import { simPositions } from '../store/simPositions';
import { StylizedPerson } from './StylizedPerson';
import * as THREE from 'three';

interface SimPersonProps {
    id: string;
}

export const SimPerson: React.FC<SimPersonProps> = ({ id }) => {
    const metadata = usePeopleStore((state) => state.metadata[id]);
    const groupRef = useRef<THREE.Group>(null);

    useFrame(() => {
        if (!groupRef.current) return;
        const transform = simPositions.get(id);
        if (transform) {
            groupRef.current.position.set(
                transform.position[0],
                transform.position[1],
                transform.position[2],
            );
        }
    });

    if (!metadata) return null;
    const s = 16.5 * metadata.height;

    return (
        <group ref={groupRef} scale={[s, s, s]}>
            <StylizedPerson shirtColor={metadata.tint} />
        </group>
    );
};
