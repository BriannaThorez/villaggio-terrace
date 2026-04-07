import React, { useMemo, useRef, useState, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { ResidentialRoom } from "../features/roomPlacement/residential/base/ResidentialRoom";
import { RoomMeshCSG } from "../features/roomPlacement/visuals/RoomMeshCSG";
import { SelectionIndicator } from "../features/ui/world_ui/SelectionIndicator";
import { useFrame } from "@react-three/fiber";
import { useSimulationStore, SimulationNode } from "../shared/utils/store";

import { Text, Html } from "@react-three/drei";
import type { StructuralFace } from "../features/roomPlacement/structural/graph";
import {
  ShapeSDFVertexShader,
  ShapeSDFFragmentShader,
} from "../shared/shaders/ShapeSDFMaterial";
import { RadialMenu } from "../features/ui/world_ui/RadialMenu";
import themes from "../shared/themes/color_palettes.json";
import { RotateCw } from "lucide-react";
import * as THREE from "three";
import CustomShaderMaterial from "three-custom-shader-material";
import {
  attachStructuralMetadataToShapes,
  buildCellBeamGraph,
  type StructuralShape,
} from "../features/roomPlacement/structural/graph";
import { parseMaterial } from "../engine/MaterialParser";
import { EmptyFloorRoom } from "../features/roomPlacement/emptyFloor/EmptyFloorRoom";

type RenderShape = StructuralShape<SimulationNode>;

const RotateHandle = ({ rotation }: { rotation: number }) => {
  const [hovered, setHovered] = useState(false);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
  };

  return (
    <mesh
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <Html
        center
        transform
        scale={1}
        zIndexRange={[10000, 10100]}
        portal={{ current: document.body }}
        pointerEvents="none"
      >
        <div
          className={`pointer-events-none w-40 h-40 rounded-full bg-white border-8 text-black flex items-center justify-center transition-all duration-300 ${hovered
            ? "border-gray-300 scale-110 shadow-[0_0_100px_rgba(255,255,255,0.8)]"
            : "border-gray-100 shadow-[0_0_80px_rgba(255,255,255,0.4)]"
            }`}
        >
          <div className="scale-[4]">
            <RotateCw
              size={22}
              className={hovered ? "text-black" : "text-black"}
            />
          </div>
        </div>
      </Html>

      <circleGeometry args={[4, 32]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
};

const VertexHandle = ({
  position,
  onDrag,
  onDragStart,
  color,
}: {
  position: [number, number];
  onDrag: (pos: [number, number]) => void;
  onDragStart: () => void;
  color: string;
}) => {
  const [hovered, setHovered] = useState(false);

  const themeName = useSimulationStore((state) => state.themeName);
  const currentTheme = (themes as any)[themeName];

  return (
    <mesh
      position={[position[0], position[1], 0.1]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onPointerDown={(e) => {
        e.stopPropagation();
        onDragStart();
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerMove={(e) => {
        if (e.buttons === 1) {
          // Left click dragging
          onDrag([e.point.x, e.point.y]);
        }
      }}
      scale={hovered ? 1.5 : 1}
    >
      <circleGeometry args={[0.5, 16]} />
      <meshBasicMaterial color={hovered ? "#fff" : currentTheme.accent} />
    </mesh>
  );
};

const isInsideShape = (
  uv: THREE.Vector2 | undefined,
  shape: SimulationNode,
) => {
  if (!uv) return false;
  const uSizeX = shape.size[0] + 12;
  const uSizeY = shape.size[1] + 12;
  const px = (uv.x - 0.5) * uSizeX;
  const py = (uv.y - 0.5) * uSizeY;
  const sx = Math.max(uSizeX - 12.0, 2.0);
  const sy = Math.max(uSizeY - 12.0, 2.0);

  let d = 1e10;
  if (
    shape.type === "box" ||
    shape.type === "text" ||
    shape.type === "cylinder" ||
    shape.type === "document" ||
    [
      "residential",
      "commercial",
      "office",
      "utility",
      "lobby",
      "elevator",
      "structure",
    ].includes(shape.type)
  ) {
    const qx = Math.abs(px) - sx * 0.5;
    const qy = Math.abs(py) - sy * 0.5;
    d =
      Math.sqrt(
        Math.pow(Math.max(qx, 0.0), 2) + Math.pow(Math.max(qy, 0.0), 2),
      ) + Math.min(Math.max(qx, qy), 0.0);
  } else if (shape.type === "diamond") {
    d = Math.abs(px) + Math.abs(py) - sx * 0.4;
  } else if (shape.type === "circle" || shape.type === "hexagon") {
    d = Math.sqrt(px * px + py * py) - sy * 0.4;
  } else if (shape.type === "parallelogram" || shape.type === "trapezoid") {
    d = Math.abs(px) + Math.abs(py) - sx * 0.5; // Approximation for hit testing
  }
  return d <= 0.1;
};

const Port = ({
  position,
  type,
  shapeId,
}: {
  position: [number, number];
  type: any;
  shapeId: string;
}) => {
  const [hovered, setHovered] = useState(false);
  const setLinkingFrom = useSimulationStore((state) => state.setLinkingFrom);
  const linkingFrom = useSimulationStore((state) => state.linkingFrom);
  const addLink = useSimulationStore((state) => state.addLink);
  const setLinkingTo = useSimulationStore((state) => state.setLinkingTo);
  const setSelectedId = useSimulationStore((state) => state.setSelectedId);
  const themeName = useSimulationStore((state) => state.themeName);
  const currentTheme = (themes as any)[themeName];

  const handlePointerDown = (e: any) => {
    if (e.button === 2) return; // Ignore right click
    e.stopPropagation();
    setLinkingFrom({ id: shapeId, port: type });
    setLinkingTo([e.point.x, e.point.y]);
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    if (linkingFrom && linkingFrom.id !== shapeId) {
      addLink(linkingFrom.id, shapeId, linkingFrom.port, type);
    }
    setLinkingFrom(null);
    setLinkingTo(null);
  };

  return (
    <group position={[position[0], position[1], 0.15]}>
      {/* Black outline for visibility */}
      <mesh scale={[1.15, 1.15, 1]}>
        <circleGeometry args={[0.8, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.6} />
      </mesh>
      <mesh
        name="port"
        userData={{ shapeId, portType: type }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onPointerDown={handlePointerDown}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedId(shapeId);
        }}
      >
        <circleGeometry args={[0.8, 16]} />
        <meshBasicMaterial
          color={hovered ? currentTheme.accent : currentTheme.primary}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
};

export const SimulationNodes = () => {
  const shapes = useSimulationStore((state) => state.shapes);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const setSelectedId = useSimulationStore((state) => state.setSelectedId);
  const activeTool = useSimulationStore((state) => state.activeTool);
  const isSelectionMode =
    activeTool === "select" ||
    activeTool === "link" ||
    activeTool === "vertex" ||
    activeTool === "text";
  const updateShape = useSimulationStore((state) => state.updateShape);
  const editingId = useSimulationStore((state) => state.editingId);
  const setEditingId = useSimulationStore((state) => state.setEditingId);
  const linkingFrom = useSimulationStore((state) => state.linkingFrom);
  const structuralGraph = useMemo(() => buildCellBeamGraph(shapes), [shapes]);
  const renderedShapes = useMemo<RenderShape[]>(
    () => attachStructuralMetadataToShapes(shapes, structuralGraph),
    [shapes, structuralGraph],
  );
  const renderedShapeById = useMemo(
    () => new Map(renderedShapes.map((shape) => [shape.id, shape])),
    [renderedShapes],
  );

  // PRE-CALCULATE Foundation/Room Relationship (Industry Leading O(N) Speedup)
  const roomByFoundationId = useMemo(() => {
    const map = new Map<string, RenderShape>();
    const rooms = renderedShapes.filter(s => s.type !== "structure" && s.type !== "empty_floor" && s.type !== "text");
    const structures = renderedShapes.filter(s => s.type === "structure");

    structures.forEach(str => {
      const myLeft = str.position[0] - str.size[0] / 2;
      const myRight = str.position[0] + str.size[0] / 2;
      const roomAbove = rooms.find(s =>
        Math.abs(s.position[1] - str.position[1]) < 5 &&
        (s.position[0] + s.size[0] / 2 > myLeft + 0.1) &&
        (s.position[0] - s.size[0] / 2 < myRight - 0.1)
      );
      if (roomAbove) map.set(str.id, roomAbove);
    });
    return map;
  }, [renderedShapes]);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const portMeshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<any>(null);
  const { size } = useThree();

  // Ensure all structures have an empty floor or a real room.
  useEffect(() => {
    if (useSimulationStore.getState().shapes.length === 0) {
      useSimulationStore.getState().initializeWorld();
    }
    const unpopulatedStructures = useSimulationStore.getState().shapes.filter(s => {
      if (s.type !== 'structure') return false;
      const hasRoom = useSimulationStore.getState().shapes.some(other =>
        other.type !== 'structure' &&
        Math.abs(other.position[0] - s.position[0]) < 0.1 &&
        Math.abs(other.position[1] - s.position[1]) < 0.1
      );
      return !hasRoom;
    });

    if (unpopulatedStructures.length > 0) {
      setTimeout(() => {
        unpopulatedStructures.forEach(str => {
          useSimulationStore.getState().addShape({
            id: `empty_floor_${Math.random().toString(36).substr(2, 9)}`,
            type: 'empty_floor',
            position: [...str.position],
            size: [...str.size],
            vertices: [...str.vertices],
            name: "Empty Floor"
          }, true, true);
        });
      }, 0);
    }
  }, []);
  const themeName = useSimulationStore((state) => state.themeName);

  // Reusable THREE objects to avoid GC pressure in hot loops
  const tempMatrix = useRef(new THREE.Matrix4());
  const tempRotation = useRef(new THREE.Quaternion());
  const tempPosition = useRef(new THREE.Vector3());
  const tempScale = useRef(new THREE.Vector3(1, 1, 1));
  const tempEuler = useRef(new THREE.Euler());
  const tempColor = useRef(new THREE.Color());

  // Instanced Attributes
  const colorArray = useMemo(
    () => new Float32Array(renderedShapes.length * 3),
    [renderedShapes.length],
  );
  const shapeTypeArray = useMemo(
    () => new Float32Array(renderedShapes.length),
    [renderedShapes.length],
  );
  const isSelectedArray = useMemo(
    () => new Float32Array(renderedShapes.length),
    [renderedShapes.length],
  );
  const sizeArray = useMemo(
    () => new Float32Array(renderedShapes.length * 2),
    [renderedShapes.length],
  );
  const opacityArray = useMemo(
    () => new Float32Array(renderedShapes.length),
    [renderedShapes.length],
  );
  const materialArray = useMemo(
    () => new Float32Array(renderedShapes.length),
    [renderedShapes.length],
  );
  const portColorArray = useMemo(
    () => new Float32Array(renderedShapes.length * 4 * 3),
    [renderedShapes.length],
  );

  const getShapeType = (type: string) => {
    const mapping: Record<string, number> = {
      box: 0.0,
      text: 0.0,
      diamond: 1.0,
      circle: 2.0,
      parallelogram: 3.0,
      cylinder: 4.0,
      document: 5.0,
      hexagon: 6.0,
      trapezoid: 7.0,
      terminal: 8.0,
      predefined_process: 9.0,
      internal_storage: 10.0,
      manual_input: 11.0,
      display: 12.0,
      or: 16.0,
      summing_junction: 17.0,
      off_page_connector: 18.0,
      residential: 0.0,
      commercial: 0.0,
      office: 0.0,
      utility: 0.0,
      lobby: 0.0,
      elevator: 0.0,
    };
    return mapping[type] ?? 0.0;
  };

  useFrame(() => {
    if (materialRef.current && materialRef.current.uniforms) {
      materialRef.current.uniforms.uTime.value = performance.now() / 1000;
    }
  });

  useEffect(() => {
    if (!meshRef.current) return;

    renderedShapes.forEach((shape, i) => {
      tempPosition.current.set(shape.position[0], shape.position[1] + shape.size[1] / 2, 0);
      tempEuler.current.set(0, 0, shape.rotation || 0);
      tempRotation.current.setFromEuler(tempEuler.current);

      // STRUCTURAL RENDERING FIX: 
      // For rooms, we nullify the SDF background scale to prevent Z-fighting 
      // with the 3D CSG shell opening at Z=0.
      const isRoom = [
        "residential",
        "commercial",
        "office",
        "utility",
        "lobby",
        "elevator",
        "structure",
        "empty_floor",
      ].includes(shape.type);

      if (isRoom) {
        tempScale.current.set(0, 0, 0);
      } else {
        tempScale.current.set(shape.size[0] + 12, shape.size[1] + 12, 1);
      }

      tempMatrix.current.compose(
        tempPosition.current,
        tempRotation.current,
        tempScale.current,
      );
      meshRef.current!.setMatrixAt(i, tempMatrix.current);

      // Resolve color: per-theme override > global color > theme primary
      const themeColor = shape.themeColors?.[themeName];
      const resolvedColor =
        themeColor || shape.color || (themes as any)[themeName].primary;
      tempColor.current.set(resolvedColor);

      colorArray[i * 3] = tempColor.current.r;
      colorArray[i * 3 + 1] = tempColor.current.g;
      colorArray[i * 3 + 2] = tempColor.current.b;

      shapeTypeArray[i] = getShapeType(shape.type);
      isSelectedArray[i] = selectedId === shape.id ? 1.0 : 0.0;
      sizeArray[i * 2] = shape.size[0] + 12;
      sizeArray[i * 2 + 1] = shape.size[1] + 12;
      opacityArray[i] = shape.type === "text" || isRoom ? 0.0 : 1.0;
      materialArray[i] = shape.material === "glass" ? 1.0 : 0.0;
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.computeBoundingSphere();
    meshRef.current.computeBoundingBox();
    if (meshRef.current.geometry.attributes.aColor)
      meshRef.current.geometry.attributes.aColor.needsUpdate = true;
    if (meshRef.current.geometry.attributes.aShapeType)
      meshRef.current.geometry.attributes.aShapeType.needsUpdate = true;
    if (meshRef.current.geometry.attributes.aIsSelected)
      meshRef.current.geometry.attributes.aIsSelected.needsUpdate = true;
    if (meshRef.current.geometry.attributes.aSize)
      meshRef.current.geometry.attributes.aSize.needsUpdate = true;
    if (meshRef.current.geometry.attributes.aOpacity)
      meshRef.current.geometry.attributes.aOpacity.needsUpdate = true;
    if (meshRef.current.geometry.attributes.aMaterial)
      meshRef.current.geometry.attributes.aMaterial.needsUpdate = true;
  }, [
    renderedShapes,
    themeName,
    selectedId,
    colorArray,
    shapeTypeArray,
    isSelectedArray,
    sizeArray,
    opacityArray,
    materialArray,
  ]);

  const handleNodePointerDown = (e: any, id: string) => {
    if (e.button === 2) return; // Ignore right click

    const shape = renderedShapeById.get(id);
    if (!shape) return;

    // Movement interactions are intentionally disabled for now.
    // Preserve this handler so room/node movement can be re-enabled later without changing ownership or selection flow.
    if (e.button === 1) return;

    // For volumetric room components, rely on mesh intersection rather than 2D SDF UV mapping
    const isVolumetricRoom = ["residential", "commercial", "office", "utility", "lobby", "elevator", "structure", "empty_floor"].includes(shape.type);
    if (!isVolumetricRoom && !isInsideShape(e.uv, shape)) return;

    e.stopPropagation();

    if (editingId && editingId !== id) {
      const editingShape = renderedShapeById.get(editingId);
      if (
        editingShape &&
        (!editingShape.text || editingShape.text.trim() === "")
      ) {
        useSimulationStore.getState().deleteShape(editingId);
      }
      setEditingId(null);
    }

    if (activeTool !== "select") return;
    setSelectedId(id);
  };

  const handleNodeDoubleClick = (e: any, id: string) => {
    if (!isSelectionMode) return;

    // Movement interactions are intentionally disabled for now.
    // Keep this path in place for future edit/move behavior restoration.

    const shape = renderedShapeById.get(id);
    if (!shape) return;

    const isVolumetricRoom = ["residential", "commercial", "office", "utility", "lobby", "elevator", "structure", "empty_floor"].includes(shape.type);
    if (!isVolumetricRoom && !isInsideShape(e.uv, shape)) return;

    e.stopPropagation();
    if (activeTool !== "select") return;
    if (shape.type === "text") {
      setEditingId(id);
    }
  };

  const handleVertexDrag = (
    shapeId: string,
    vertexIndex: number,
    newPos: [number, number],
  ) => {
    const shape = renderedShapeById.get(shapeId);
    if (!shape) return;

    const newVertices = [...shape.vertices];
    // Movement interactions are intentionally disabled for now.
    // Retain this update path so future node manipulation can be restored without reworking the model.
    newVertices[vertexIndex] = [
      newPos[0] - shape.position[0],
      newPos[1] - shape.position[1],
    ];

    // Movement interactions are intentionally disabled for now.
    // Keep this update path in place so future move/edit behavior can be restored without reworking the node model.
    updateShape(shapeId, { vertices: newVertices }, true);
  };

  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    if (editingId) {
      const interval = setInterval(() => {
        setCursorVisible((v) => !v);
      }, 500);
      return () => clearInterval(interval);
    } else {
      setCursorVisible(true);
    }
  }, [editingId]);

  // Legacy blendablePositions heuristic was removed for the Cell-Beam Structural Graph.

  return (
    <group>
      {/* Phase 1: High-Performance Instanced SDFs */}
      <instancedMesh
        key={renderedShapes.length} // Recreate if count changes for simplicity, though dynamic update is possible
        ref={meshRef}
        args={[null as any, null as any, renderedShapes.length]}
        frustumCulled={false}
        castShadow
        receiveShadow
        onPointerDown={(e) => {
          if (e.instanceId !== undefined) {
            handleNodePointerDown(e, renderedShapes[e.instanceId].id);
          }
        }}
        onDoubleClick={(e) => {
          if (e.instanceId !== undefined) {
            handleNodeDoubleClick(e, renderedShapes[e.instanceId].id);
          }
        }}
        onClick={(e) => {
          if (!isSelectionMode) return;
          if (e.instanceId !== undefined) {
            const shape = renderedShapes[e.instanceId];
            if (!isInsideShape(e.uv, shape)) return;
            e.stopPropagation();
            setSelectedId(shape.id);
          }
        }}
      >
        <planeGeometry args={[1, 1]}>
          <instancedBufferAttribute
            attach="attributes-aColor"
            args={[colorArray, 3]}
          />
          <instancedBufferAttribute
            attach="attributes-aShapeType"
            args={[shapeTypeArray, 1]}
          />
          <instancedBufferAttribute
            attach="attributes-aIsSelected"
            args={[isSelectedArray, 1]}
          />
          <instancedBufferAttribute
            attach="attributes-aSize"
            args={[sizeArray, 2]}
          />
          <instancedBufferAttribute
            attach="attributes-aOpacity"
            args={[opacityArray, 1]}
          />
          <instancedBufferAttribute
            attach="attributes-aMaterial"
            args={[materialArray, 1]}
          />
        </planeGeometry>
        <CustomShaderMaterial
          ref={materialRef}
          baseMaterial={THREE.MeshPhysicalMaterial}
          vertexShader={ShapeSDFVertexShader}
          fragmentShader={ShapeSDFFragmentShader}
          transparent
          roughness={0.1}
          metalness={0.8}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          uniforms={{
            uTime: { value: 0.0 },
          }}
        />
      </instancedMesh>

      {/* Individual Overlays (Text, Menu, Ports) */}
      {renderedShapes.map((shape) => {
        const structuralFace = shape.structuralRoom?.canonicalFace as
          | StructuralFace
          | undefined;
        const selectionRotation =
          structuralFace === "back"
            ? Math.PI
            : structuralFace === "left"
              ? Math.PI / 2
              : structuralFace === "right"
                ? -Math.PI / 2
                : structuralFace === "ceiling"
                  ? Math.PI / 2
                  : structuralFace === "floor"
                    ? -Math.PI / 2
                    : shape.rotation || 0;

        return (
          <group
            key={shape.id}
            position={[shape.position[0], shape.position[1], 0]}
            rotation={[0, 0, selectionRotation]}
          >
            {selectedId === shape.id && !editingId && (
              <SelectionIndicator shape={shape} />
            )}

            {/* Text Rendering */}
            {(shape.text || editingId === shape.id) && (
              <Text
                position={[0, shape.size[1] / 2, 0.1]}
                fontSize={2}
                color={
                  (themes as any)[themeName].mode === "dark"
                    ? (themes as any)[themeName].neutral_light
                    : (themes as any)[themeName].neutral_dark
                }
                anchorX="center"
                anchorY="middle"
                visible={true}
                onClick={(e) => {
                  if (!isSelectionMode) return;
                  e.stopPropagation();
                  setSelectedId(shape.id);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (
                    activeTool === "select" ||
                    activeTool === "text" ||
                    shape.type === "text"
                  ) {
                    setEditingId(shape.id);
                  }
                }}
                maxWidth={shape.type === "text" ? 100 : shape.size[0] * 0.8}
                onSync={(mesh) => {
                  if (shape.type === "text" && mesh.geometry.boundingBox) {
                    const box = mesh.geometry.boundingBox;
                    const width = box.max.x - box.min.x + 4;
                    const height = box.max.y - box.min.y + 2;
                    if (
                      Math.abs(shape.size[0] - width) > 0.1 ||
                      Math.abs(shape.size[1] - height) > 0.1
                    ) {
                      // Movement interactions are intentionally disabled for now.
                      // This resize path is preserved for future node manipulation workflows.
                      updateShape(shape.id, { size: [width, height] });
                    }
                  }
                }}
              >
                {shape.text || ""}
                {editingId === shape.id && cursorVisible ? "_" : ""}
              </Text>
            )}

            {selectedId === shape.id && !editingId && (
              <SelectionIndicator shape={shape} />
            )}



            {/* Room Rendering */}
            {[
              "residential",
              "commercial",
              "office",
              "utility",
              "lobby",
              "elevator",
              "empty_floor",
            ].includes(shape.type) &&
              (() => {
                let hasLeftWall = true;
                let hasRightWall = true;

                // Sole reliance on the high-accuracy Structural Cell-Beam Graph.
                if (shape.structuralRoom) {
                  const checkWall = (adjacentIds: string[]) => {
                    if (adjacentIds.length === 0) return true;
                    // INDUSTRY LEADING PRIVACY FIX: 
                    // Wall removal is ONLY permitted for public circulation or structural foundations.
                    // Private units (Residences, Offices, Commercial) must ALWAYS preserve demising walls for household isolation.
                    const mergableTypes = ["lobby", "elevator", "structure", "empty_floor"];
                    const isMergable = mergableTypes.includes(shape.type);

                    const hasHomogenousNeighbor = isMergable && adjacentIds.some(id => {
                      const neighbor = renderedShapeById.get(id);
                      return neighbor && neighbor.type === shape.type;
                    });
                    return !hasHomogenousNeighbor;
                  };

                  hasLeftWall = checkWall(shape.structuralRoom.canonicalFaces.left.adjacentRoomIds);
                  hasRightWall = checkWall(shape.structuralRoom.canonicalFaces.right.adjacentRoomIds);
                }

                if (shape.type === "empty_floor") {
                  return (
                    <EmptyFloorRoom
                      position={[0, 0, 0]}
                      rotation={0}
                      width={shape.size[0]}
                      height={shape.size[1]}
                      depth={40}
                      hasLeftWall={hasLeftWall}
                      hasRightWall={hasRightWall}
                      onPointerDown={(e) => {
                        if (!isSelectionMode) return;
                        e.stopPropagation();
                        // Movement interactions are intentionally disabled for now.
                        // Keep this selection binding so move behavior can be re-enabled later.
                        handleNodePointerDown(e, shape.id);
                      }}
                      onDoubleClick={(e) => {
                        if (!isSelectionMode) return;
                        e.stopPropagation();
                        // Movement interactions are intentionally disabled for now.
                        // This hook remains so future node move/edit interactions can be restored.
                        handleNodeDoubleClick(e, shape.id);
                      }}
                    />
                  );
                }

                return (
                  <ResidentialRoom
                    position={[0, 0, 0]}
                    rotation={0}
                    size={shape.size}
                    roomType={shape.type}
                    color={shape.color || (themes as any)[themeName].primary}
                    material={shape.material}
                    hasLeftWall={hasLeftWall}
                    hasRightWall={hasRightWall}
                    openings={shape.structuralRoom?.openings.map(o => o.definition)}
                    structuralSettings={(shape as any).structuralSettings}
                    structuralRoom={shape.structuralRoom}
                    frontFaceVisibility="transparent"
                    onPointerDown={(e) => {
                      if (!isSelectionMode) return;
                      e.stopPropagation();
                      // Movement interactions are intentionally disabled for now.
                      // Keep this selection binding so move behavior can be re-enabled later.
                      handleNodePointerDown(e, shape.id);
                    }}
                    onDoubleClick={(e) => {
                      if (!isSelectionMode) return;
                      e.stopPropagation();
                      // Movement interactions are intentionally disabled for now.
                      // This hook remains so future node move/edit interactions can be restored.
                      handleNodeDoubleClick(e, shape.id);
                    }}
                  />
                );
              })()}

            {/* Background Scaffold Rendering via Unified CSG */}
            {shape.type === "structure" && (() => {
              const roomAbove = roomByFoundationId.get(shape.id);
              const hasRoomAbove = !!roomAbove;

              let baseColor = (themes as any)[themeName].neutral_dark;
              if (roomAbove) {
                if (roomAbove.color) {
                  baseColor = roomAbove.color;
                } else if (roomAbove.themeColors) {
                  baseColor = roomAbove.themeColors[themeName] || baseColor;
                }
              }

              const darkenedColor = new THREE.Color(baseColor).lerp(new THREE.Color(0x000000), 0.25).getHexString();

              const scaffoldMat = parseMaterial({
                albedo: `#${darkenedColor}`,
                roughness: 0.95,
                metalness: 0.2
              });
              scaffoldMat.polygonOffset = true;
              scaffoldMat.polygonOffsetFactor = 1; // Slight pushback to ensure room interior renders cleanly if boundaries are perfectly flush
              scaffoldMat.polygonOffsetUnits = 1;

              return (
                <group
                  onPointerDown={(e) => {
                    if (hasRoomAbove) return;
                    handleNodePointerDown(e, shape.id);
                  }}
                  onDoubleClick={(e) => {
                    if (hasRoomAbove) return;
                    handleNodeDoubleClick(e, shape.id);
                  }}
                >
                  <RoomMeshCSG
                    width={shape.size[0]}
                    height={shape.size[1]}
                    depth={40}
                    wallThickness={0.25}
                    material={scaffoldMat}
                    hasBackWall={false}
                    hasLeftWall={shape.structuralRoom ? shape.structuralRoom.canonicalFaces.left.adjacentRoomIds.length === 0 : true}
                    hasRightWall={shape.structuralRoom ? shape.structuralRoom.canonicalFaces.right.adjacentRoomIds.length === 0 : true}
                  />
                </group>
              );
            })()}

            {activeTool === "vertex" &&
              selectedId === shape.id &&
              shape.vertices.map((vertex, index) => (
                <VertexHandle
                  key={index}
                  position={[vertex[0], vertex[1]]}
                  onDragStart={() =>
                    useSimulationStore.getState().pushToHistory()
                  }
                  onDrag={(pos) => handleVertexDrag(shape.id, index, pos)}
                  color="#39ff14"
                />
              ))}
          </group>
        );
      })}
    </group>
  );
};
