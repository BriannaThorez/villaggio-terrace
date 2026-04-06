import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { GRID_SIZE_X } from '../../../shared/utils/store';
import { RoomPlacementGrid } from '../domain/types';

interface PlacementHologramProps {
    grid: RoomPlacementGrid;
    visible: boolean;
}

/**
 * An industry-leading holographic debug overlay mapping the atom subdivision matrix.
 */
export const PlacementHologram: React.FC<PlacementHologramProps> = ({ grid, visible }) => {
    const points = useMemo(() => {
        if (!visible) return [];

        const totalWidth = grid.widthAtoms * GRID_SIZE_X;
        const totalDepth = grid.depthAtoms * GRID_SIZE_X;

        const halfW = totalWidth / 2;
        const halfD = totalDepth / 2;

        // Generate grid exclusively mapping 10x10 Atoms
        const atomPoints: THREE.Vector3[] = [];

        // Draw Z-lines strictly mapping Atoms
        for (let x = -halfW; x <= halfW + 0.001; x += GRID_SIZE_X) {
            atomPoints.push(
                new THREE.Vector3(x, 0, -halfD),
                new THREE.Vector3(x, 0, halfD)
            );
        }

        // Draw X-lines strictly mapping Atoms
        for (let z = -halfD; z <= halfD + 0.001; z += GRID_SIZE_X) {
            atomPoints.push(
                new THREE.Vector3(-halfW, 0, z),
                new THREE.Vector3(halfW, 0, z)
            );
        }

        return atomPoints;
    }, [grid, visible]);

    if (!visible || points.length === 0) return null;

    return (
        <group>
            {/* Primary 10x10 Atom boundaries part of Selection overlay */}
            <Line
                points={points}
                color="#00ffff"
                lineWidth={3}
                segments
                transparent
                opacity={0.85} // Maximum clarity when selected
            />
        </group>
    );
};
