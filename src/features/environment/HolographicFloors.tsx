import React from "react";
import * as THREE from "three";
import { Line, Text } from "@react-three/drei";

export const HolographicFloors: React.FC = () => {
  const floors = [
    { level: 1, y: 0 },
    { level: 2, y: 40 },
    { level: 3, y: 80 },
  ];

  return (
    <group>
      {floors.map((floor) => (
        <group key={floor.level}>
          <Line
            points={[
              [-200, floor.y, 0],
              [200, floor.y, 0],
            ]}
            color="#22d3ee"
            lineWidth={2}
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
            depthTest={false}
          />
          <Text
            position={[-80, floor.y + 1.5, 0]}
            color="#22d3ee"
            fontSize={5}
            anchorX="left"
            anchorY="bottom"
            fillOpacity={0.65}
            letterSpacing={0.1}
          >
            {`FLOOR ${floor.level}`}
          </Text>
        </group>
      ))}
    </group>
  );
};
