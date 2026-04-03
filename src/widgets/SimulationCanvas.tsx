import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  Environment,
  ContactShadows,
} from "@react-three/drei";
import themes from "../shared/themes/color_palettes.json";
import { Bloom, Noise, Vignette } from "@react-three/postprocessing";
import { SimulationNodes } from "../entities/SimulationNodes";
import { SimulationLinks } from "../entities/SimulationLinks";
import {
  useSimulationStore,
  snapX,
  getPlacementCenterY,
} from "../shared/utils/store";
import * as THREE from "three";
import { useRef, useEffect, useMemo, useState } from "react";

const RAIN_COUNT = 1400;
const RAIN_AREA = 1200;
const RAIN_HEIGHT = 420;
const RAIN_FALL_SPEED = 420;
const RAIN_WIND_SPEED = 95;
const RAIN_MIST_COUNT = 180;
const RAIN_MIST_SPEED = 16;
const RAIN_MIST_RADIUS = 22;

const PlacementIndicator = () => {
  const activeTool = useSimulationStore((state) => state.activeTool);
  const themeName = useSimulationStore((state) => state.themeName);
  const currentTheme = useMemo(() => (themes as any)[themeName], [themeName]);

  const groupRef = useRef<THREE.Group>(null);
  const materialRef1 = useRef<THREE.MeshBasicMaterial>(null);
  const materialRef2 = useRef<THREE.MeshBasicMaterial>(null);
  const materialRef3 = useRef<THREE.MeshBasicMaterial>(null);
  const materialRef4 = useRef<THREE.LineBasicMaterial>(null);

  const { camera, pointer, raycaster } = useThree();

  useFrame(() => {
    if (
      !groupRef.current ||
      activeTool === "select" ||
      activeTool === "link" ||
      activeTool === "vertex"
    ) {
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }

    raycaster.setFromCamera(pointer, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -25);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    if (intersectPoint) {
      groupRef.current.visible = true;
      let size: [number, number] = [40, 40];
      if (activeTool === "residential") size = [40, 40];
      else if (activeTool === "office") size = [50, 40];
      else if (
        activeTool === "lobby" ||
        activeTool === "elevator" ||
        activeTool === "utility"
      ) {
        size = [10, 40];
      } else if (activeTool === "text") size = [20, 5];

      const snappedX = snapX(intersectPoint.x, size[0]);
      const snappedY =
        activeTool === "lobby"
          ? 0
          : getPlacementCenterY(intersectPoint.y, size[1]);

      groupRef.current.position.set(snappedX, snappedY, 0.1);

      const existing = useSimulationStore
        .getState()
        .shapes.find(
          (s) => s.position[0] === snappedX && s.position[1] === snappedY,
        );

      const color = existing ? "#ff4444" : currentTheme.accent;
      if (materialRef1.current) materialRef1.current.color.set(color);
      if (materialRef2.current) materialRef2.current.color.set(color);
      if (materialRef3.current) materialRef3.current.color.set(color);
      if (materialRef4.current) materialRef4.current.color.set(color);
    } else {
      groupRef.current.visible = false;
    }
  });

  if (
    activeTool === "select" ||
    activeTool === "link" ||
    activeTool === "vertex"
  ) {
    return null;
  }

  let size: [number, number] = [40, 40];
  if (activeTool === "residential") size = [40, 40];
  else if (activeTool === "office") size = [50, 40];
  else if (
    activeTool === "lobby" ||
    activeTool === "elevator" ||
    activeTool === "utility"
  ) {
    size = [10, 40];
  } else if (activeTool === "text") size = [20, 5];

  return (
    <group ref={groupRef} visible={false}>
      <mesh>
        <planeGeometry args={[size[0] + 2, size[1] + 2]} />
        <meshBasicMaterial
          ref={materialRef1}
          color={currentTheme.accent}
          transparent
          opacity={0.3}
        />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <ringGeometry args={[size[0] / 2 - 1, size[0] / 2, 4]} />
        <meshBasicMaterial ref={materialRef2} color={currentTheme.accent} />
      </mesh>

      <mesh>
        <boxGeometry args={[size[0], size[1], 40]} />
        <meshBasicMaterial
          ref={materialRef3}
          color={currentTheme.accent}
          transparent
          opacity={0.1}
          wireframe
        />
      </mesh>

      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(size[0], size[1], 40)]} />
        <lineBasicMaterial
          ref={materialRef4}
          color={currentTheme.accent}
          linewidth={2}
        />
      </lineSegments>
    </group>
  );
};

const RainField = ({ isDark }: { isDark: boolean }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const array = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i += 1) {
      array[i * 3] = (Math.random() - 0.5) * RAIN_AREA;
      array[i * 3 + 1] = Math.random() * RAIN_HEIGHT;
      array[i * 3 + 2] = (Math.random() - 0.5) * RAIN_AREA;
    }
    return array;
  }, []);

  const offsets = useMemo(
    () => Array.from({ length: RAIN_COUNT }, () => Math.random() * RAIN_HEIGHT),
    [],
  );

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    const positionsAttr = points.geometry.getAttribute("position");
    const array = positionsAttr.array as Float32Array;
    const cam = state.camera.position;

    for (let i = 0; i < RAIN_COUNT; i += 1) {
      const base = i * 3;
      let y = array[base + 1] - RAIN_FALL_SPEED * delta;
      if (y < -40) {
        y = RAIN_HEIGHT + Math.random() * 100;
        array[base] = cam.x + (Math.random() - 0.5) * RAIN_AREA;
        array[base + 2] = cam.y + (Math.random() - 0.5) * RAIN_AREA;
      }

      array[base + 1] = y;
      array[base] +=
        (Math.sin(offsets[i] + state.clock.elapsedTime * 0.6) *
          RAIN_WIND_SPEED *
          delta) /
        60;
      array[base + 2] +=
        (Math.cos(offsets[i] + state.clock.elapsedTime * 0.45) *
          RAIN_WIND_SPEED *
          delta) /
        120;
    }

    positionsAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} position={[0, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={isDark ? "#cfe8ff" : "#e8f2ff"}
        size={1.4}
        sizeAttenuation
        transparent
        opacity={0.38}
        depthWrite={false}
      />
    </points>
  );
};

const RainMist = ({ isDark }: { isDark: boolean }) => {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const array = new Float32Array(RAIN_MIST_COUNT * 3);
    for (let i = 0; i < RAIN_MIST_COUNT; i += 1) {
      array[i * 3] = (Math.random() - 0.5) * 900;
      array[i * 3 + 1] = Math.random() * 140;
      array[i * 3 + 2] = (Math.random() - 0.5) * 900;
    }
    return array;
  }, []);

  const seeds = useMemo(
    () =>
      Array.from(
        { length: RAIN_MIST_COUNT },
        () => Math.random() * Math.PI * 2,
      ),
    [],
  );

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    const attr = points.geometry.getAttribute("position");
    const array = attr.array as Float32Array;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < RAIN_MIST_COUNT; i += 1) {
      const base = i * 3;
      const s = seeds[i];
      array[base + 1] =
        26 + Math.sin(t * 0.4 + s) * 7 + Math.cos(t * 0.2 + s) * 3;
      array[base] += Math.sin(t * 0.08 + s) * RAIN_MIST_SPEED * delta;
      array[base + 2] += Math.cos(t * 0.06 + s) * RAIN_MIST_SPEED * delta;
    }

    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} position={[0, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={isDark ? "#dfeeff" : "#f4fbff"}
        size={RAIN_MIST_RADIUS}
        sizeAttenuation
        transparent
        opacity={0.03}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

const CanvasScene = () => {
  const { camera, controls, raycaster, mouse, scene } = useThree();
  const themeName = useSimulationStore((state) => state.themeName);

  const currentTheme = useMemo(() => (themes as any)[themeName], [themeName]);
  const isDark = currentTheme.mode === "dark";

  const wasLinkingRef = useRef(false);
  const wasDraggingRef = useRef(false);
  const wasPanningRef = useRef(false);
  const pointerDownPos = useRef<[number, number] | null>(null);

  const addShape = useSimulationStore((state) => state.addShape);
  const setActiveTool = useSimulationStore((state) => state.setActiveTool);
  const activeTool = useSimulationStore((state) => state.activeTool);
  const mode = useSimulationStore((state) => state.mode);
  const updateShape = useSimulationStore((state) => state.updateShape);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const setSelectedId = useSimulationStore((state) => state.setSelectedId);
  const editingId = useSimulationStore((state) => state.editingId);
  const setEditingId = useSimulationStore((state) => state.setEditingId);
  const deleteShape = useSimulationStore((state) => state.deleteShape);
  const isDragging = useSimulationStore((state) => state.isDragging);
  const setIsDragging = useSimulationStore((state) => state.setIsDragging);
  const isRotating = useSimulationStore((state) => state.isRotating);
  const setIsRotating = useSimulationStore((state) => state.setIsRotating);
  const isPanning = useSimulationStore((state) => state.isPanning);
  const setIsPanning = useSimulationStore((state) => state.setIsPanning);
  const dragOffset = useSimulationStore((state) => state.dragOffset);
  const linkingFrom = useSimulationStore((state) => state.linkingFrom);
  const setLinkingFrom = useSimulationStore((state) => state.setLinkingFrom);
  const setLinkingTo = useSimulationStore((state) => state.setLinkingTo);
  const addLink = useSimulationStore((state) => state.addLink);
  const shouldResetCamera = useSimulationStore(
    (state) => state.shouldResetCamera,
  );
  const setShouldResetCamera = useSimulationStore(
    (state) => state.setShouldResetCamera,
  );
  const setCameraState = useSimulationStore((state) => state.setCameraState);
  const setCameraRotation = useSimulationStore(
    (state) => state.setCameraRotation,
  );
  const cameraMoveRequest = useSimulationStore(
    (state) => state.cameraMoveRequest,
  );
  const requestCameraMove = useSimulationStore(
    (state) => state.requestCameraMove,
  );

  const [isStamping, setIsStamping] = useState(false);
  const lastStampedPos = useRef<string | null>(null);

  const targetZoom = useRef(10);
  const sphereRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (shouldResetCamera) {
      targetZoom.current = 7.5;
      camera.position.set(0, 0, 100);
      (camera as THREE.OrthographicCamera).zoom = 7.5;
      camera.updateProjectionMatrix();
      if (controls) {
        const orbit = controls as any;
        orbit.target.set(0, 0, 0);
        orbit.setAzimuthalAngle((-10 * Math.PI) / 180);
        orbit.setPolarAngle(Math.PI / 2 - (2 * Math.PI) / 180);
        orbit.update();
      }
      setShouldResetCamera(false);
    }
  }, [shouldResetCamera, camera, controls, setShouldResetCamera]);

  useEffect(() => {
    if (controls) {
      const orbit = controls as any;
      orbit.setAzimuthalAngle((-10 * Math.PI) / 180);
      orbit.setPolarAngle(Math.PI / 2 - (2 * Math.PI) / 180);
      orbit.update();
    }
  }, [controls]);

  useEffect(() => {
    if (cameraMoveRequest) {
      const [x, y] = cameraMoveRequest;
      camera.position.x = x;
      camera.position.y = y;
      if (controls) {
        (controls as any).target.set(x, y, 0);
        (controls as any).update();
      }
      requestCameraMove(null);
    }
  }, [cameraMoveRequest, camera, controls, requestCameraMove]);

  const mouseWorldRef = useRef(new THREE.Vector3());
  const moveVectorRef = useRef(new THREE.Vector3());

  useFrame((state) => {
    const frameStart = performance.now();
    const cam = camera as THREE.OrthographicCamera;

    if (Math.abs(cam.zoom - targetZoom.current) > 0.001) {
      const oldZoom = cam.zoom;
      cam.zoom = targetZoom.current;

      const mouseWorld = mouseWorldRef.current
        .set(state.pointer.x, state.pointer.y, 0)
        .unproject(cam);
      const zoomRatio = 1 - oldZoom / cam.zoom;
      const moveVector = moveVectorRef.current
        .subVectors(mouseWorld, cam.position)
        .multiplyScalar(zoomRatio);

      moveVector.z = 0;
      cam.position.add(moveVector);
      if (controls) {
        (controls as any).target.add(moveVector);
        (controls as any).update();
      }

      cam.updateProjectionMatrix();
    }

    if (sphereRef.current) {
      sphereRef.current.position.x = cam.position.x;
      sphereRef.current.position.y = cam.position.y;
    }

    const currentZoom = cam.zoom;
    const worldWidth = state.size.width / currentZoom;
    const worldHeight = state.size.height / currentZoom;

    const prevCameraState = useSimulationStore.getState().cameraState;
    if (
      prevCameraState.position[0] !== cam.position.x ||
      prevCameraState.position[1] !== cam.position.y ||
      prevCameraState.position[2] !== cam.position.z ||
      prevCameraState.zoom !== currentZoom ||
      prevCameraState.worldWidth !== worldWidth ||
      prevCameraState.worldHeight !== worldHeight
    ) {
      setCameraState(
        [cam.position.x, cam.position.y, cam.position.z],
        currentZoom,
        worldWidth,
        worldHeight,
      );
    }

    if (controls) {
      const orbit = controls as any;
      const azimuth = orbit.getAzimuthalAngle();
      const polar = orbit.getPolarAngle();
      const prevRotation = useSimulationStore.getState().cameraRotation;
      if (
        Math.abs(prevRotation.azimuth - azimuth) > 0.001 ||
        Math.abs(prevRotation.polar - polar) > 0.001
      ) {
        setCameraRotation(azimuth, polar);
      }
    }

    const frameMs = performance.now() - frameStart;
    if (frameMs > 16.7) {
      const _ = frameMs;
      void _;
    }
  });

  const placeAtPoint = (point: THREE.Vector3, skipHistory = true) => {
    if (!point) return;
    const size: [number, number] = [10, 40];
    const snappedX = snapX(point.x, size[0]);
    const snappedY = 0;
    const posKey = `${snappedX},${snappedY}`;

    if (lastStampedPos.current === posKey) return;

    const shapes = useSimulationStore.getState().shapes;
    const existing = shapes.find(
      (s) => s.position[0] === snappedX && s.position[1] === snappedY,
    );
    if (existing) return;

    lastStampedPos.current = posKey;

    const id = Math.random().toString(36);
    addShape(
      {
        id,
        type: "lobby",
        position: [snappedX, snappedY],
        size,
        vertices: [
          [-5, -20],
          [5, -20],
          [5, 20],
          [-5, 20],
        ],
      },
      true,
      skipHistory,
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingId) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        targetZoom.current *= 1.05;
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        targetZoom.current *= 0.95;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          deleteShape(selectedId);
          setSelectedId(null);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (editingId) return;
      e.preventDefault();

      const delta = -e.deltaY;
      const zoomFactor = Math.pow(1.002, delta);

      targetZoom.current *= zoomFactor;
      targetZoom.current = THREE.MathUtils.clamp(targetZoom.current, 0.5, 150);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [editingId, selectedId, deleteShape, setSelectedId]);

  const handleClick = (event: any) => {
    if (
      mode === "viewer" ||
      wasLinkingRef.current ||
      wasDraggingRef.current ||
      wasPanningRef.current
    ) {
      wasLinkingRef.current = false;
      wasDraggingRef.current = false;
      wasPanningRef.current = false;
      return;
    }

    if (editingId) {
      const shapes = useSimulationStore.getState().shapes;
      const editingShape = shapes.find((s) => s.id === editingId);
      if (
        editingShape &&
        (!editingShape.text || editingShape.text.trim() === "")
      ) {
        deleteShape(editingId);
      }

      setEditingId(null);
      return;
    }

    if (
      activeTool === "select" ||
      activeTool === "link" ||
      activeTool === "vertex"
    ) {
      return;
    }

    if (!event.point) return;

    let size: [number, number] = [40, 40];
    let vertices: [number, number][] = [
      [-20, -20],
      [20, -20],
      [20, 20],
      [-20, 20],
    ];

    const roomTypes = [
      "residential",
      "commercial",
      "office",
      "utility",
      "lobby",
      "elevator",
    ];
    const isRoom = roomTypes.includes(activeTool);

    if (activeTool === "text") {
      size = [20, 5];
      vertices = [
        [-10, -2.5],
        [10, -2.5],
        [10, 2.5],
        [-10, 2.5],
      ];
    } else if (activeTool === "residential") {
      size = [40, 40];
      vertices = [
        [-20, -20],
        [20, -20],
        [20, 20],
        [-20, 20],
      ];
    } else if (activeTool === "office") {
      size = [50, 40];
      vertices = [
        [-25, -20],
        [25, -20],
        [25, 20],
        [-25, 20],
      ];
    } else if (
      activeTool === "lobby" ||
      activeTool === "elevator" ||
      activeTool === "utility"
    ) {
      size = [10, 40];
      vertices = [
        [-5, -20],
        [5, -20],
        [5, 20],
        [-5, 20],
      ];
    } else if (isRoom) {
      size = [40, 40];
      vertices = [
        [-20, -20],
        [20, -20],
        [20, 20],
        [-20, 20],
      ];
    } else if (activeTool === "terminal") {
      size = [25, 10];
      vertices = [
        [-12.5, -5],
        [12.5, -5],
        [12.5, 5],
        [-12.5, 5],
      ];
    } else if (activeTool === "parallelogram") {
      size = [22, 15];
      vertices = [
        [-11, -7.5],
        [11, -7.5],
        [11, 7.5],
        [-11, 7.5],
      ];
    } else if (activeTool === "hexagon") {
      size = [24, 15];
      vertices = [
        [-12, -7.5],
        [12, -7.5],
        [12, 7.5],
        [-12, 7.5],
      ];
    } else if (activeTool === "trapezoid") {
      size = [22, 15];
      vertices = [
        [-11, -7.5],
        [11, -7.5],
        [11, 7.5],
        [-11, 7.5],
      ];
    } else if (activeTool === "display") {
      size = [24, 15];
      vertices = [
        [-12, -7.5],
        [12, -7.5],
        [12, 7.5],
        [-12, 7.5],
      ];
    }

    const snappedX = snapX(event.point.x, size[0]);
    const isLobby = activeTool === "lobby";
    const snappedY = isLobby
      ? 0
      : getPlacementCenterY(event.point.y, size[1]);
    const position: [number, number] = [snappedX, snappedY];

    const existing = useSimulationStore
      .getState()
      .shapes.find(
        (s) => s.position[0] === snappedX && s.position[1] === snappedY,
      );
    if (existing) return;

    const id = Math.random().toString(36);

    addShape(
      {
        id,
        type: activeTool as any,
        position,
        size,
        vertices,
        text: activeTool === "text" ? "" : undefined,
      },
      isRoom,
    );

    setSelectedId(id);

    if (activeTool === "text") {
      setEditingId(id);
      setActiveTool("select");
    }
  };

  useEffect(() => {
    const handleGlobalUp = () => {
      setIsPanning(false);
      setIsRotating(false);
      setIsDragging(false);
      setLinkingFrom(null);
      setLinkingTo(null);
    };
    window.addEventListener("pointerup", handleGlobalUp);
    return () => window.removeEventListener("pointerup", handleGlobalUp);
  }, [
    setIsPanning,
    setIsRotating,
    setIsDragging,
    setLinkingFrom,
    setLinkingTo,
  ]);

  const handlePointerMove = (e: any) => {
    if (mode === "viewer") return;

    let currentIsDragging = isDragging;
    let currentIsPanning = isPanning;
    let currentIsRotating = isRotating;
    let currentLinkingFrom = linkingFrom;

    if (e.nativeEvent.buttons === 0) {
      if (isDragging) {
        setIsDragging(false);
        currentIsDragging = false;
      }
      if (isPanning) {
        setIsPanning(false);
        currentIsPanning = false;
      }
      if (isRotating) {
        setIsRotating(false);
        currentIsRotating = false;
      }
      if (linkingFrom) {
        setLinkingFrom(null);
        setLinkingTo(null);
        currentLinkingFrom = null;
      }
    }

    if (e.point) {
      if (isStamping && activeTool === "lobby") {
        placeAtPoint(e.point, true);
      }
    }

    const zoom = (camera as THREE.OrthographicCamera).zoom;

    if (currentIsRotating && selectedId && e.nativeEvent.buttons !== 0) {
      const shapes = useSimulationStore.getState().shapes;
      const shape = shapes.find((s) => s.id === selectedId);
      if (shape) {
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersectPoint = new THREE.Vector3();
        e.ray.intersectPlane(plane, intersectPoint);

        const dx = intersectPoint.x - shape.position[0];
        const dy = intersectPoint.y - shape.position[1];
        const currentAngle = Math.atan2(dy, dx);
        const [startAngle, startRotation] = dragOffset;
        const delta = currentAngle - startAngle;
        updateShape(selectedId, { rotation: startRotation + delta }, true);
      }
      return;
    }

    if (currentIsPanning && e.nativeEvent.buttons !== 0) {
      const dx = e.nativeEvent.movementX / zoom;
      const dy = -e.nativeEvent.movementY / zoom;
      camera.position.x -= dx;
      camera.position.y -= dy;
      if (controls) {
        (controls as any).target.x -= dx;
        (controls as any).target.y -= dy;
      }
      return;
    }

    if (currentIsDragging || currentLinkingFrom) {
      const zoom = (camera as THREE.OrthographicCamera).zoom;
      const dx = e.nativeEvent.movementX / zoom;
      const dy = -e.nativeEvent.movementY / zoom;

      camera.position.x += dx;
      camera.position.y += dy;
      if (controls) {
        (controls as any).target.x += dx;
        (controls as any).target.y += dy;
      }
    }

    if (currentLinkingFrom && e.point) {
      setLinkingTo([e.point.x, e.point.y]);
      return;
    }

    const isDraggableTool = activeTool !== "link" && activeTool !== "vertex";
    if (!selectedId || !isDraggableTool || !currentIsDragging) return;

    if (e.point) {
      const targetX = e.point.x - dragOffset[0];
      const targetY = e.point.y - dragOffset[1];

      const shape = useSimulationStore
        .getState()
        .shapes.find((s) => s.id === selectedId);
      if (!shape) return;

      const snappedX = snapX(targetX, shape.size[0]);
      const snappedY =
        shape.type === "lobby"
          ? 0
          : getPlacementCenterY(targetY, shape.size[1]);

      updateShape(
        selectedId,
        {
          position: [snappedX, snappedY],
        },
        true,
      );
    }
  };

  const handlePointerDown = (e: any) => {
    wasPanningRef.current = false;
    wasDraggingRef.current = false;
    wasLinkingRef.current = false;
    pointerDownPos.current = [e.clientX, e.clientY];

    if (e.button === 2) {
      return;
    }

    if (e.point && activeTool === "lobby") {
      setIsStamping(true);
      lastStampedPos.current = null;
      useSimulationStore.getState().pushToHistory();
      placeAtPoint(e.point, true);
      return;
    }

    if (e.nativeEvent.target.tagName !== "CANVAS") return;

    if (mode === "viewer" || activeTool !== "select") return;
    if (selectedId) setSelectedId(null);
  };

  const handlePointerUp = (e: any) => {
    setIsPanning(false);
    setIsRotating(false);
    setIsStamping(false);
    lastStampedPos.current = null;

    let wasStaticClick = false;
    if (pointerDownPos.current) {
      const dx = e.clientX - pointerDownPos.current[0];
      const dy = e.clientY - pointerDownPos.current[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 3) {
      } else {
        wasStaticClick = true;
        wasPanningRef.current = false;
        wasDraggingRef.current = false;
        wasLinkingRef.current = false;
      }
    }

    if (e.button === 2 && wasStaticClick) {
      setActiveTool("select");
    }

    if (linkingFrom) {
      wasLinkingRef.current = true;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      const portIntersect = intersects.find((i) => i.object.name === "port");

      if (portIntersect) {
        const { shapeId, portType } = portIntersect.object.userData;
        if (shapeId !== linkingFrom.id) {
          addLink(linkingFrom.id, shapeId, linkingFrom.port, portType);
        }
      }
    }

    if (isDragging) {
      wasDraggingRef.current = true;
    }

    setIsDragging(false);
    setLinkingFrom(null);
    setLinkingTo(null);
  };

  return (
    <>
      <color attach="background" args={["#9bb2c8"]} />
      <fog attach="fog" args={["#a9bfd2", 140, 920]} />
      <ambientLight
        intensity={isDark ? 0.48 : 0.66}
        color={isDark ? "#c8d4df" : "#d7e2ea"}
      />
      <directionalLight
        position={[-80, 120, 70]}
        intensity={isDark ? 1.6 : 1.3}
        color="#d9e6ef"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.00008}
        shadow-normalBias={0.03}
      />
      <hemisphereLight
        args={[
          isDark ? "#b7cad8" : "#e8f0f6",
          isDark ? "#112028" : "#9fc0a8",
          0.55,
        ]}
      />
      <Environment preset="city" />

      <OrbitControls
        makeDefault
        enableRotate={true}
        enableZoom={false}
        enableDamping={true}
        dampingFactor={0.1}
        enabled={!isDragging && !linkingFrom && !isRotating && !isPanning}
        mouseButtons={{
          LEFT: -1 as any,
          MIDDLE: THREE.MOUSE.ROTATE,
          RIGHT: THREE.MOUSE.PAN,
        }}
        onStart={() => {
          wasPanningRef.current = false;
        }}
        onChange={() => {
          wasPanningRef.current = true;
        }}
        onEnd={() => {
          setTimeout(() => {
            if (wasPanningRef.current) wasPanningRef.current = false;
          }, 200);
        }}
      />

      <group
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        rotation={[0, 0, 0]}
      >
        <SimulationLinks />
        <SimulationNodes />
        <PlacementIndicator />

        <mesh
          position={[0, -20.1, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
          castShadow={false}
        >
          <planeGeometry args={[10000, 10000]} />
          <meshPhysicalMaterial
            color="#2e7d32"
            transparent
            opacity={0.28}
            roughness={0.06}
            metalness={0.0}
            transmission={0.82}
            thickness={1.6}
            ior={1.47}
            clearcoat={1.0}
            clearcoatRoughness={0.08}
          />
        </mesh>

        <Grid
          position={[0, -20, 0]}
          infiniteGrid
          fadeDistance={500}
          fadeStrength={5}
          cellSize={10}
          sectionSize={40}
          sectionColor={isDark ? "#8fb2c8" : "#c7d6e2"}
          sectionThickness={1.3}
          cellColor={isDark ? "#d8e7f2" : "#edf4f9"}
          cellThickness={0.8}
          rotation={[0, 0, 0]}
        />
      </group>

      <mesh ref={sphereRef} position={[0, 0, -500]}>
        <sphereGeometry args={[800, 64, 64]} />
        <meshBasicMaterial
          color={isDark ? "#6f8396" : "#d4e0ea"}
          side={THREE.BackSide}
          transparent
          opacity={isDark ? 0.34 : 0.22}
          fog={false}
        />
      </mesh>

      <RainField isDark={isDark} />
      <RainMist isDark={isDark} />

      <ContactShadows
        position={[0, -20.05, 0]}
        opacity={0.32}
        scale={180}
        blur={2.6}
        far={70}
        resolution={1024}
        color={isDark ? "#0d1a1f" : "#2b3a42"}
        frames={1}
      />

      <Bloom
        luminanceThreshold={isDark ? 1.0 : 1.5}
        luminanceSmoothing={0.5}
        intensity={isDark ? 0.35 : 0.18}
      />
      <Noise opacity={isDark ? 0.035 : 0.02} premultiply />
      <Vignette eskil={false} offset={0.1} darkness={isDark ? 0.78 : 0.22} />
    </>
  );
};

export const SimulationCanvas = () => {
  return (
    <Canvas
      orthographic
      shadows
      camera={{ zoom: 7.5, position: [0, 0, 100], far: 2000, near: -2000 }}
      gl={{ antialias: true }}
    >
      <CanvasScene />
    </Canvas>
  );
};
