import React, { useMemo } from "react";
import * as THREE from "three";
import { Line, Text } from "@react-three/drei";

/**
 * HolographicHeightScale: Visual reference scale mapped to the spatial unit constraints of the engine.
 * 
 * Spatial Translation Math:
 * 1 Meter = 10 world units (1 Atom = 10 units^3).
 * 1 Foot ≈ 3.048 world units.
 * Given GRID_SIZE_Y = 40 (floor-to-floor height):
 * Total Floor Height = 40 units / 10 = 4.0 meters (~13.12 feet).
 * With structural slab padding, interior clearance ≈ 3.925m (~12.87ft).
 */
export const HolographicHeightScale: React.FC = () => {
    // Render up to ~9 floors (Z-index/height limits scaling)
    const maxUnits = 360;

    // Precompute line geometries to reduce React-Three-Fiber reconciliation loops
    const { ftMarks, mMarks } = useMemo(() => {
        const _ft = [];
        const _m = [];

        // FEET SCALE (1 Foot ≈ 3.048 units)
        const unitsPerFoot = 3.048;
        for (let ft = 0; ft <= maxUnits / unitsPerFoot; ft++) {
            const y = ft * unitsPerFoot;
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

        // METERS SCALE (1 Meter = 10 units)
        const unitsPerMeter = 10;
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
                    />
                    {(mark.isFives && mark.y > 0) && (
                        <Text
                            position={[-mark.width - 1.5, mark.y, 0]}
                            color="#00ffcc"
                            fontSize={3.0}
                            anchorX="right"
                            anchorY="middle"
                            fillOpacity={mark.isTens ? 1.0 : 0.7}
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
                    />
                    {mark.m > 0 && (
                        <Text
                            position={[mark.width + 1.5, mark.y, 0]}
                            color="#ff66cc"
                            fontSize={3.0}
                            anchorX="left"
                            anchorY="middle"
                            fillOpacity={mark.isTens ? 1.0 : 0.7}
                        >
                            {`${mark.m} m`}
                        </Text>
                    )}
                </group>
            ))}
        </group>
    );
};
