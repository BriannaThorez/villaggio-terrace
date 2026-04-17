import React, { useMemo } from "react";
import * as THREE from "three";
import { Line, Text } from "@react-three/drei";

/**
 * HolographicWidthScale: Visual reference scale mirroring the height scale,
 * running linearly along the X-axis.
 */
export const HolographicWidthScale: React.FC = () => {
    const maxUnits = 400;

    const { ftMarks, mMarks } = useMemo(() => {
        const _ft = [];
        const _m = [];

        const unitsPerFoot = 3.048;
        for (let ft = 0; ft <= maxUnits / unitsPerFoot; ft++) {
            const x = ft * unitsPerFoot;
            const isTens = ft % 10 === 0;
            const isFives = ft % 5 === 0;

            _ft.push({
                x,
                ft,
                isTens,
                isFives,
                depth: isTens ? 6 : (isFives ? 3.5 : 1.5)
            });
        }

        const unitsPerMeter = 10;
        for (let m = 0; m <= maxUnits / unitsPerMeter; m++) {
            const x = m * unitsPerMeter;
            const isTens = m % 10 === 0;
            const isFives = m % 5 === 0;

            _m.push({
                x,
                m,
                isTens,
                isFives,
                depth: isTens ? 6 : (isFives ? 3.5 : 2)
            });
        }

        return { ftMarks: _ft, mMarks: _m };
    }, []);

    return (
        <group position={[0, 1, 0]}>
            <Line
                points={[
                    [-maxUnits, 0, 0],
                    [maxUnits, 0, 0],
                ]}
                color="#00ffcc"
                lineWidth={2}
                transparent
                opacity={0.8}
                blending={THREE.AdditiveBlending}
            />

            {ftMarks.map((mark) => (
                <group key={`ft-pos-${mark.ft}`}>
                    <Line
                        points={[
                            [mark.x, 0, 0],
                            [mark.x, 0, mark.depth],
                        ]}
                        color="#00ffcc"
                        lineWidth={mark.isTens ? 2 : 1}
                        transparent
                        opacity={mark.isTens ? 0.7 : (mark.isFives ? 0.6 : 0.5)}
                        blending={THREE.AdditiveBlending}
                    />
                    {(mark.isFives && mark.x > 0) && (
                        <Text
                            position={[mark.x, 0, mark.depth + 5.5]}
                            color="#00ffcc"
                            fontSize={4.0}
                            rotation={[-Math.PI / 2, 0, 0]}
                            anchorX="center"
                            anchorY="bottom"
                            fillOpacity={mark.isTens ? 1.0 : 0.7}
                        >
                            {`${mark.ft} ft`}
                        </Text>
                    )}

                    {mark.x > 0 && (
                        <>
                            <Line
                                points={[
                                    [-mark.x, 0, 0],
                                    [-mark.x, 0, mark.depth],
                                ]}
                                color="#00ffcc"
                                lineWidth={mark.isTens ? 2 : 1}
                                transparent
                                opacity={mark.isTens ? 0.9 : (mark.isFives ? 0.6 : 0.3)}
                                blending={THREE.AdditiveBlending}
                            />
                            {mark.isFives && (
                                <Text
                                    position={[-mark.x, 0, mark.depth + 5.5]}
                                    color="#00ffcc"
                                    fontSize={4.0}
                                    rotation={[-Math.PI / 2, 0, 0]}
                                    anchorX="center"
                                    anchorY="bottom"
                                    fillOpacity={mark.isTens ? 1.0 : 0.7}
                                >
                                    {`${mark.ft} ft`}
                                </Text>
                            )}
                        </>
                    )}
                </group>
            ))}

            {mMarks.map((mark) => (
                <group key={`m-pos-${mark.m}`}>
                    <Line
                        points={[
                            [mark.x, 0, 0],
                            [mark.x, 0, mark.depth * 1.5],
                        ]}
                        color="#ff66cc"
                        lineWidth={mark.isTens ? 2 : 1}
                        transparent
                        opacity={mark.isTens ? 0.9 : (mark.isFives ? 0.6 : 0.3)}
                        blending={THREE.AdditiveBlending}
                    />
                    {mark.m > 0 && (
                        <Text
                            position={[mark.x, 0, (mark.depth * 1.5) + 2.5]}
                            color="#ff66cc"
                            fontSize={4.0}
                            rotation={[-Math.PI / 2, 0, 0]}
                            anchorX="center"
                            anchorY="bottom"
                            fillOpacity={mark.isTens ? 1.0 : 0.7}
                        >
                            {`${mark.m} m`}
                        </Text>
                    )}

                    {mark.x > 0 && (
                        <>
                            <Line
                                points={[
                                    [-mark.x, 0, 0],
                                    [-mark.x, 0, mark.depth * 1.5],
                                ]}
                                color="#ff66cc"
                                lineWidth={mark.isTens ? 2 : 1}
                                transparent
                                opacity={mark.isTens ? 0.9 : (mark.isFives ? 0.6 : 0.3)}
                                blending={THREE.AdditiveBlending}
                            />
                            <Text
                                position={[-mark.x, 0, (mark.depth * 1.5) + 2.5]}
                                color="#ff66cc"
                                fontSize={4.0}
                                rotation={[-Math.PI / 2, 0, 0]}
                                anchorX="center"
                                anchorY="bottom"
                                fillOpacity={mark.isTens ? 1.0 : 0.7}
                            >
                                {`${mark.m} m`}
                            </Text>
                        </>
                    )}
                </group>
            ))}
        </group>
    );
};
