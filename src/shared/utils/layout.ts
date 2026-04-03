import { SimulationNode } from "./store";

type StructuralShape = SimulationNode & {
  structuralRoom?: {
    canonicalFace: "front" | "back" | "left" | "right" | "ceiling" | "floor";
  };
};

type Offset2D = { x: number; y: number };

const rotateOffset = (offset: Offset2D, rotation: number): Offset2D => {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    x: offset.x * cos - offset.y * sin,
    y: offset.x * sin + offset.y * cos,
  };
};

const getRotationFromShape = (shape: SimulationNode) => shape.rotation || 0;

const getCanonicalFaceOffset = (shape: StructuralShape): Offset2D => {
  const rotation = getRotationFromShape(shape);
  const face = shape.structuralRoom?.canonicalFace;

  if (face === "back") {
    return rotateOffset({ x: 0, y: shape.size[1] / 2 }, rotation);
  }

  if (face === "left") {
    return rotateOffset({ x: shape.size[0] / 2, y: 0 }, rotation);
  }

  if (face === "right") {
    return rotateOffset({ x: -shape.size[0] / 2, y: 0 }, rotation);
  }

  if (face === "ceiling") {
    return { x: 0, y: 0 };
  }

  if (face === "floor") {
    return { x: 0, y: 0 };
  }

  return rotateOffset({ x: 0, y: -(shape.size[1] / 2) }, rotation);
};

export const getMenuOffset = (
  shape: StructuralShape,
  allShapes: SimulationNode[],
) => {
  const others = allShapes.filter((s) => s.id !== shape.id);
  const margin = 10;
  const { position } = shape;

  const baseOffset = getCanonicalFaceOffset(shape);
  const candidates: Offset2D[] = [
    baseOffset,
    { x: -baseOffset.x, y: -baseOffset.y },
    rotateOffset({ x: -baseOffset.y, y: baseOffset.x }, 0),
    rotateOffset({ x: baseOffset.y, y: -baseOffset.x }, 0),
  ];

  const checkOverlapAt = (ox: number, oy: number) => {
    const tx = position[0] + ox;
    const ty = position[1] + oy;
    return others.some((s) => {
      const dx = Math.abs(s.position[0] - tx);
      const dy = Math.abs(s.position[1] - ty);
      return dx < s.size[0] / 2 + margin && dy < s.size[1] / 2 + margin;
    });
  };

  for (const cand of candidates) {
    if (!checkOverlapAt(cand.x, cand.y)) {
      return cand;
    }
  }

  return candidates[0];
};
