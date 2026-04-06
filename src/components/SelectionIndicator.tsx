import React, { useMemo } from "react";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { useSimulationStore, type SimulationNode } from "../shared/utils/store";
import type {
  StructuralCanonicalFace,
  StructuralFace,
  StructuralRoomMetadata,
} from "../features/rooms/structural/graph";
import { RadialMenu } from "./RadialMenu";

const START_LABEL_COLOR = "#ffffff";
const START_LABEL_SHADOW = "0 0 12px rgba(0, 0, 0, 0.45)";
const START_LABEL_TOP_OFFSET = 10;
const START_LABEL_FRONT_FACE_OFFSET = 0;
const START_LABEL_SCALE = 4;
const MENU_BUTTON_SCALE = 1.0;
const ROTATE_BUTTON_SCALE = 1.0;

const FRONT_FRAME_COLOR = "#39ff14";
const FRONT_FRAME_EDGE = "rgba(57, 255, 20, 0.95)";
const FRONT_FRAME_GLOW = "rgba(57, 255, 20, 0.14)";

interface SelectionIndicatorProps {
  shape: SimulationNode & {
    structuralRoom?: StructuralRoomMetadata;
  };
}

const FACE_EPSILON = 0.12;
const OVERLAY_Z = 0.2;

type RoomFaceRecord = {
  room: StructuralRoomMetadata;
  face: StructuralFace;
  record: StructuralCanonicalFace;
};

type OverlayFrame = {
  points: [number, number, number][];
  planePosition: [number, number, number];
  planeRotation: [number, number, number];
  planeSize: [number, number];
  menuPosition: [number, number, number];
  rotatePosition: [number, number, number];
  startPosition: [number, number, number];
  cornerMarkers: [number, number, number][];
};

const getRoomFace = (
  shape: SimulationNode & { structuralRoom?: StructuralRoomMetadata },
): RoomFaceRecord | null => {
  const room = shape.structuralRoom;
  if (!room) return null;

  const face = room.canonicalFace;
  const record = room.canonicalFaces[face];
  if (!record) return null;

  return { room, face, record };
};

const getFrontFaceOverlayFrame = (
  room: StructuralRoomMetadata,
): OverlayFrame => {
  const halfWidth = room.dimensions.width / 2;
  const z = 0;
  const topY = room.dimensions.height;
  const topMargin = 8;
  const cornerX = halfWidth + 22;

  return {
    points: [
      [-halfWidth, 0, z],
      [halfWidth, 0, z],
      [halfWidth, topY, z],
      [-halfWidth, topY, z],
      [-halfWidth, 0, z],
    ],
    planePosition: [0, topY / 2, z - FACE_EPSILON / 2],
    planeRotation: [0, 0, 0],
    planeSize: [room.dimensions.width, room.dimensions.height],
    menuPosition: [cornerX - room.dimensions.width * 0.25, topY + topMargin, 0],
    rotatePosition: [cornerX - room.dimensions.width * 0.25, -topMargin, 0],
    startPosition: [0, topY + topMargin, START_LABEL_FRONT_FACE_OFFSET],
    cornerMarkers: [],
  };
};

const getFallbackOverlayFrame = (shape: SimulationNode): OverlayFrame => {
  const halfWidth = shape.size[0] / 2;
  const topY = shape.size[1];
  const z = 0;
  const topMargin = 8;
  const cornerX = halfWidth + 22;

  return {
    points: [
      [-halfWidth, 0, z],
      [halfWidth, 0, z],
      [halfWidth, topY, z],
      [-halfWidth, topY, z],
      [-halfWidth, 0, z],
    ],
    planePosition: [0, topY / 2, z - 0.05],
    planeRotation: [0, 0, 0],
    planeSize: [shape.size[0], shape.size[1]],
    menuPosition: [cornerX - shape.size[0] * 0.25, topY + topMargin, 0],
    rotatePosition: [
      cornerX - shape.size[0] * 0.25,
      -topMargin,
      0,
    ],
    startPosition: [0, topY + topMargin, START_LABEL_FRONT_FACE_OFFSET],
    cornerMarkers: [],
  };
};

const SelectionControls = ({
  menuPosition,
  rotatePosition,
  shapeId,
}: {
  menuPosition: [number, number, number];
  rotatePosition: [number, number, number];
  shapeId: string;
}) => {
  return (
    <>
      <Html
        center
        transform
        scale={MENU_BUTTON_SCALE}
        position={menuPosition}
        zIndexRange={[10000, 10100]}
        portal={{ current: document.body }}
      >
        <div className="pointer-events-none flex h-40 w-40 items-center justify-center rounded-full border border-white/30 bg-white text-black shadow-[0_0_28px_rgba(255,255,255,0.3)] backdrop-blur-md">
          <div className="scale-[3.2]">
            <RadialMenu shapeId={shapeId} />
          </div>
        </div>
      </Html>

      <Html
        center
        transform
        scale={ROTATE_BUTTON_SCALE}
        position={rotatePosition}
        zIndexRange={[10000, 10100]}
        portal={{ current: document.body }}
      >
        <div className="pointer-events-none flex h-40 w-40 items-center justify-center rounded-full border border-white/30 bg-white text-black shadow-[0_0_28px_rgba(255,255,255,0.3)] backdrop-blur-md">
          <div className="scale-[6]">⟳</div>
        </div>
      </Html>
    </>
  );
};

const StartLabel = ({
  name,
  type,
  position,
}: {
  name?: string;
  type: string;
  position: [number, number, number];
}) => {
  return (
    <Html
      center
      transform
      scale={1}
      position={position}
      zIndexRange={[10000, 10100]}
      portal={{ current: document.body }}
    >
      <div
        className="pointer-events-none rounded-full px-8 py-3 text-[112px] font-semibold uppercase tracking-[0.35em] whitespace-nowrap"
        style={{
          color: START_LABEL_COLOR,
          textShadow: START_LABEL_SHADOW,
        }}
      >
        {name || type}
      </div>
    </Html>
  );
};

export const SelectionOverlay: React.FC<SelectionIndicatorProps> = ({
  shape,
}) => {
  const setIsDragging = useSimulationStore((state) => state.setIsDragging);
  const setDragOffset = useSimulationStore((state) => state.setDragOffset);
  const pushToHistory = useSimulationStore((state) => state.pushToHistory);

  const roomFace = getRoomFace(shape);

  const frame = useMemo(() => {
    if (roomFace?.face === "front") {
      return getFrontFaceOverlayFrame(roomFace.room);
    }

    return getFallbackOverlayFrame(shape);
  }, [roomFace, shape]);

  const adjacencyData = roomFace
    ? {
      roomId: roomFace.room.roomId,
      canonicalFace: roomFace.face,
      adjacentRoomIds: roomFace.record.adjacentRoomIds,
      adjacencyGapIds: roomFace.record.adjacencyGapIds,
      cutoutIds: roomFace.record.cutoutIds,
    }
    : undefined;

  const handlePointerDown = (e: {
    stopPropagation: () => void;
    point: { x: number; y: number };
  }) => {
    e.stopPropagation();
    pushToHistory();
    setIsDragging(true);
    setDragOffset([
      e.point.x - shape.position[0],
      e.point.y - shape.position[1],
    ]);
  };

  return (
    <group
      onPointerDown={handlePointerDown}
      userData={{
        structuralSelection: adjacencyData,
        selectionOverlay: true,
      }}
    >
      <group renderOrder={10}>
        <Line
          points={frame.points}
          color={FRONT_FRAME_COLOR}
          lineWidth={4}
          dashed={false}
        />
        <Line
          points={frame.points}
          color={FRONT_FRAME_EDGE}
          lineWidth={1.5}
          dashed={false}
        />
      </group>

      {/* 
        STRUCTURAL RENDERING FIX: 
        We remove the 'glow' plane over the front face of rooms to prevent 
        the 'weird dark plane' artifact and ensure the CSG interior is 100% clear.
      */}
      {!roomFace && (
        <mesh
          position={frame.planePosition}
          rotation={frame.planeRotation}
          userData={{ structuralSelection: adjacencyData }}
          renderOrder={0}
        >
          <planeGeometry args={frame.planeSize} />
          <meshBasicMaterial
            color={FRONT_FRAME_GLOW}
            transparent
            opacity={0.08}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      <SelectionControls
        menuPosition={frame.menuPosition}
        rotatePosition={frame.rotatePosition}
        shapeId={shape.id}
      />
      <StartLabel
        name={shape.name}
        type={shape.type}
        position={frame.startPosition}
      />
    </group>
  );
};

export const SelectionIndicator: React.FC<SelectionIndicatorProps> = ({
  shape,
}) => {
  return <SelectionOverlay shape={shape} />;
};

export default SelectionIndicator;
