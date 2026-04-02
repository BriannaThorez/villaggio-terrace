import React from "react";
import { Line } from "@react-three/drei";
import { useSimulationStore, SimulationNode } from "../shared/utils/store";

type StructuralFace = "front" | "back" | "left" | "right" | "top" | "bottom";
type StructuralAnchorFace =
  | "front"
  | "back"
  | "left"
  | "right"
  | "floor"
  | "ceiling";

interface SelectionIndicatorProps {
  shape: SimulationNode;
}

const FRONT_FACE_EPSILON = 0.02;

const getCanonicalStructuralFace = (
  face: string,
): StructuralAnchorFace | null => {
  if (face === "top") return "ceiling";
  if (face === "bottom") return "floor";
  if (
    face === "front" ||
    face === "back" ||
    face === "left" ||
    face === "right" ||
    face === "floor" ||
    face === "ceiling"
  ) {
    return face;
  }
  return null;
};

const getStructuralRoomFace = (shape: SimulationNode) => {
  const structuralRoom = (shape as any).structuralRoom;
  const dimensions = structuralRoom?.dimensions ?? (shape as any).dimensions;
  const face = getCanonicalStructuralFace(
    structuralRoom?.face ?? (shape as any).face,
  );

  if (
    dimensions &&
    typeof dimensions.width === "number" &&
    typeof dimensions.height === "number" &&
    typeof dimensions.depth === "number" &&
    face
  ) {
    return { dimensions, face };
  }

  return null;
};

const getStructuralFaceOffset = (
  face: StructuralAnchorFace,
  dimensions: { width: number; height: number; depth: number },
) => {
  const halfWidth = dimensions.width / 2;
  const halfHeight = dimensions.height / 2;
  const halfDepth = dimensions.depth / 2;

  switch (face) {
    case "front":
      return halfDepth + FRONT_FACE_EPSILON;
    case "back":
      return -halfDepth - FRONT_FACE_EPSILON;
    case "left":
      return -halfWidth - FRONT_FACE_EPSILON;
    case "right":
      return halfWidth + FRONT_FACE_EPSILON;
    case "ceiling":
      return halfHeight + FRONT_FACE_EPSILON;
    case "floor":
      return -halfHeight - FRONT_FACE_EPSILON;
  }
};

const getSelectionPlaneOffset = (shape: SimulationNode) => {
  const structuralRoom = getStructuralRoomFace(shape);

  if (structuralRoom) {
    return getStructuralFaceOffset(
      structuralRoom.face,
      structuralRoom.dimensions,
    );
  }

  const frontFaceOffset = (shape as any).frontFaceOffset;
  if (typeof frontFaceOffset === "number") {
    return frontFaceOffset;
  }

  const depth =
    typeof (shape as any).depth === "number" ? (shape as any).depth : 0;
  return depth > 0 ? depth / 2 + FRONT_FACE_EPSILON : FRONT_FACE_EPSILON;
};

export const SelectionIndicator: React.FC<SelectionIndicatorProps> = ({
  shape,
}) => {
  const setIsDragging = useSimulationStore((state) => state.setIsDragging);
  const setDragOffset = useSimulationStore((state) => state.setDragOffset);
  const pushToHistory = useSimulationStore((state) => state.pushToHistory);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    pushToHistory();
    setIsDragging(true);
    setDragOffset([
      e.point.x - shape.position[0],
      e.point.y - shape.position[1],
    ]);
  };

  const w = shape.size[0] / 2;
  const h = shape.size[1] / 2;
  const z = getSelectionPlaneOffset(shape);
  const rotation = (shape as any).rotation || 0;

  const points = [
    [-w, -h, z],
    [w, -h, z],
    [w, h, z],
    [-w, h, z],
    [-w, -h, z],
  ].map(([x, y, pointZ]) => {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return [x * cos - y * sin, x * sin + y * cos, pointZ];
  });

  return (
    <group onPointerDown={handlePointerDown} rotation={[0, 0, rotation]}>
      <Line points={points as any} color="#39ff14" lineWidth={3} />
      <mesh position={[0, 0, z - 0.1]}>
        <planeGeometry args={[shape.size[0], shape.size[1]]} />
        <meshBasicMaterial color="#39ff14" transparent opacity={0.1} />
      </mesh>
    </group>
  );
};
