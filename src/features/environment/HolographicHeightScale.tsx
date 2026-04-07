import React, { useMemo } from "react";
import * as THREE from "three";
import { Line, Text } from "@react-three/drei";

/**
 * HolographicHeightScale: Visual reference scale mapped to the spatial unit constraints of the engine.
 * 
 * Spatial Translation Math:
 * 1 Foot = 5 world units.
 * Given GRID_SIZE_Y = 40 (Floor-to-floor height):
 * Total Floor Height = 40 units / 5 = 8.0 feet.
 * With structural slab displacement (floor 0.5 + ceiling 0.25):
 * 39.25 interior units / 5 = ~7.85ft nominal interior clearance.
 */
export const HolographicHeightScale: React.FC = () => {
    // Render up to ~9 floors (Z-index/height limits scaling)
    const maxUnits = 360;

    // Precompute line geometries to reduce React-Three-Fiber reconciliation loops
    const { ftMarks, mMarks } = useMemo(() => {
        const _ft = [];
        const _m = [];

        // FEET SCALE (1 Foot = 5 units)
        for (let ft = 0; ft <= maxUnits / 5; ft++) {
            const y = ft * 5;
            const isTens = ft % 10 === 0;
            const isFives = ft % 5 === 0;

            _ft.push({
                y,
                ft,
                isTens,
                isFives,
                width: isTens ? 6 : (isFives ? 3.5 : 1.5)
            });
        }

        // METERS SCALE (1 Foot = 0.3048 Meters)
        const unitsPerMeter = 5 / 0.3048;
        for (let m = 0; m <= maxUnits / unitsPerMeter; m++) {
            const y = m * unitsPerMeter;
            const isTens = m % 10 === 0;
            const isFives = m % 5 === 0;

            _m.push({
                y,
                m,
                isTens,
                isFives,
                width: isTens ? 6 : (isFives ? 3.5 : 2)
            });
        }

        return { ftMarks: _ft, mMarks: _m };
    }, []);

    return (
        <group position={[0, 0, 0]}>
            {/* Primary Center Spine */}
            <Line
                points={[
                    [0, 0, 0],
                    [0, maxUnits, 0],
                ]}
                color="#00ffcc"
                lineWidth={3}
                transparent
                opacity={0.7}
                blending={THREE.AdditiveBlending}
                depthTest={false}
            />

            {/* Left Hand Data: Imperial (Feet) */}
            {ftMarks.map((mark) => (
                <group key={`ft-${mark.ft}`}>
                    <Line
                        points={[
                            [0, mark.y, 0],
                            [-mark.width, mark.y, 0],
                        ]}
                        color="#00ffcc"
                        lineWidth={mark.isTens ? 3 : 1}
                        transparent
                        opacity={mark.isTens ? 0.9 : (mark.isFives ? 0.6 : 0.2)}
                        blending={THREE.AdditiveBlending}
                        depthTest={false}
                    />
                    {(mark.isFives && mark.y > 0) && (
                        <Text
                            position={[-mark.width - 1.5, mark.y, 0]}
                            color="#00ffcc"
                            fontSize={3.0}
                            anchorX="right"
                            anchorY="middle"
                            fillOpacity={mark.isTens ? 1.0 : 0.7}
                            depthTest={false}
                        >
                            {`${mark.ft} ft`}
                        </Text>
                    )}
                </group>
            ))}

            {/* Right Hand Data: Metric (Meters) */}
            {mMarks.map((mark) => (
                <group key={`m-${mark.m}`}>
                    <Line
                        points={[
                            [0, mark.y, 0],
                            [mark.width, mark.y, 0],
                        ]}
                        color="#ff66cc" // Neon Magenta offset for quick parsing
                        lineWidth={mark.isTens ? 3 : 1}
                        transparent
                        opacity={mark.isTens ? 0.9 : (mark.isFives ? 0.6 : 0.3)}
                        blending={THREE.AdditiveBlending}
                        depthTest={false}
                    />
                    {mark.m > 0 && (
                        <Text
                            position={[mark.width + 1.5, mark.y, 0]}
                            color="#ff66cc"
                            fontSize={3.0}
                            anchorX="left"
                            anchorY="middle"
                            fillOpacity={mark.isTens ? 1.0 : 0.7}
                            depthTest={false}
                        >
                            {`${mark.m} m`}
                        </Text>
                    )}
                </group>
            ))}
        </group>
    );
};
