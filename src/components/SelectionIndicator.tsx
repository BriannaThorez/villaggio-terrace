import React from 'react';
import { Line } from '@react-three/drei';
import { useFlowchartStore, Shape } from '../shared/utils/store';

interface SelectionIndicatorProps {
  shape: Shape;
}

export const SelectionIndicator: React.FC<SelectionIndicatorProps> = ({ shape }) => {
  const setIsDragging = useFlowchartStore(state => state.setIsDragging);
  const setDragOffset = useFlowchartStore(state => state.setDragOffset);
  const pushToHistory = useFlowchartStore(state => state.pushToHistory);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    pushToHistory();
    setIsDragging(true);
    setDragOffset([e.point.x - shape.position[0], e.point.y - shape.position[1]]);
  };

  const w = shape.size[0] / 2;
  const h = shape.size[1] / 2;

  const points = [
    [-w, -h, 0.2],
    [w, -h, 0.2],
    [w, h, 0.2],
    [-w, h, 0.2],
    [-w, -h, 0.2],
  ];

  return (
    <group onPointerDown={handlePointerDown} position={[0, 0, 0]}>
      <Line
        points={points as any}
        color="#39ff14"
        lineWidth={3}
      />
      <mesh position={[0, 0, 0.1]}>
        <planeGeometry args={[shape.size[0], shape.size[1]]} />
        <meshBasicMaterial color="#39ff14" transparent opacity={0.1} />
      </mesh>
    </group>
  );
};
