import React, { useMemo } from 'react';
import { useSimulationStore } from '../../../shared/utils/store';
import { Line } from '@react-three/drei';


/**
 * InternetConnectivity: Renders orange connectivity lines between
 * lobby and empty_floor nodes to visualize network backbone.
 *
 * Performance (B6): Uses a narrowed selector that only extracts
 * lobby/empty_floor nodes, preventing re-renders when non-network
 * shapes change (e.g. room dragging, text edits).
 *
 * Logic (C3): Fixed dead 'floor' type filter — replaced with 'empty_floor'.
 */
export const InternetConnectivity: React.FC = () => {
    const shapes = useSimulationStore((state) => state.shapes);

    // Filter and memoize the network backbone nodes
    const blendables = useMemo(() =>
        shapes.filter(s => s.type === 'lobby' || s.type === 'empty_floor'),
        [shapes]
    );

    const connections = useMemo(() => {
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
                            [s.position[0], s.position[1] + s.size[1] / 2, -15.0],
                            [s2.position[0], s2.position[1] + s2.size[1] / 2, -15.0]
                        ]);
                    }
                }
            }
        });

        return lines;
    }, [blendables]);

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
                />
            ))}
        </group>
    );
};
