import React, { useMemo } from 'react';
import { useSimulationStore } from '../../../shared/utils/store';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

export const InternetConnectivity: React.FC = () => {
    const shapes = useSimulationStore((state) => state.shapes);

    const connections = useMemo(() => {
        const blendables = shapes.filter(s => s.type === 'lobby' || s.type === 'floor');
        const lines: [number, number, number][][] = [];

        blendables.forEach((s, idx) => {
            // 1. Internal Connection (if it spans multiple cells)
            if (s.size[0] > 10) {
                const startX = s.position[0] - s.size[0] / 2 + 5;
                const endX = s.position[0] + s.size[0] / 2 - 5;
                const yPos = s.position[1] + s.size[1] / 2; // Vertically centered within the room
                const zPos = -15.0; // Deep inside the room depth
                lines.push([
                    [startX, yPos, zPos],
                    [endX, yPos, zPos]
                ]);
            }

            // 2. Inter-node Connection
            for (let i = idx + 1; i < blendables.length; i++) {
                const s2 = blendables[i];
                if (Math.abs(s.position[1] - s2.position[1]) < 1) { // Same floor
                    const dist = Math.abs(s.position[0] - s2.position[0]);
                    const expectedDist = (s.size[0] + s2.size[0]) / 2;
                    if (Math.abs(dist - expectedDist) < 1) {
                        lines.push([
                            [s.position[0], s.position[1] + s.size[1] / 2, 0.6],
                            [s2.position[0], s2.position[1] + s2.size[1] / 2, 0.6]
                        ]);
                    }
                }
            }
        });

        return lines;
    }, [shapes]);

    return (
        <group>
            {connections.map((points, i) => (
                <Line
                    key={i}
                    points={points}
                    color="#FF5F1F"
                    lineWidth={3}
                    transparent
                    opacity={0.8}
                // blending={THREE.AdditiveBlending}
                />
            ))}
        </group>
    );
};
