import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  Environment,
  ContactShadows,
  Lightformer,
} from "@react-three/drei";
import themes from "../shared/themes/color_palettes.json";
import { Bloom, Noise, Vignette, N8AO } from "@react-three/postprocessing";
import { HolographicFloors } from "../features/environment/HolographicFloors";
import { GroundIndicatorPlane } from "../features/rooms/structural/components/GroundIndicatorPlane";
import { SimulationNodes } from "../entities/SimulationNodes";
import { InternetConnectivity } from "../features/rooms/visuals/InternetConnectivity";
import { SolarSystem } from "../features/lighting/ui/SolarSystem";
import { RainField, RainMist } from "../features/weather/ui/WeatherEffects";
import { WeatherPanel } from "../features/weather/ui/WeatherPanel";
import { SimulationLinks } from "../entities/SimulationLinks";
import {
  useSimulationStore,
  snapX,
  getPlacementCenterY,
} from "../shared/utils/store";
import * as THREE from "three";
import { useRef, useEffect, useMemo, useState } from "react";

// RAIN_COUNT constants moved to modular features/weather.

const PlacementIndicator = () => {
  const activeTool = useSimulationStore((state) => state.activeTool);
  const themeName = useSimulationStore((state) => state.themeName);
  const currentTheme = useMemo(() => (themes as any)[themeName], [themeName]);

  const groupRef = useRef<THREE.Group>(null);
  const materialRef1 = useRef<THREE.MeshBasicMaterial>(null);
  const materialRef2 = useRef<THREE.MeshBasicMaterial>(null);
  const materialRef3 = useRef<THREE.MeshBasicMaterial>(null);
  const materialRef4 = useRef<THREE.LineBasicMaterial>(null);

  const { camera, pointer, raycaster, size } = useThree();

  useFrame((state) => {
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
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    if (intersectPoint) {
      groupRef.current.visible = true;
      let clashSize: [number, number] = [40, 40];
      const tool = activeTool;
      if (tool === "residential") clashSize = [40, 40];
      else if (tool === "office") clashSize = [50, 40];
      else if (
        tool === "lobby" ||
        tool === "elevator" ||
        tool === "utility"
      ) {
        clashSize = [10, 40];
      } else if (tool === "text") clashSize = [20, 5];

      const snappedX = snapX(intersectPoint.x, clashSize[0]);
      const snappedY =
        activeTool === "lobby"
          ? 0
          : getPlacementCenterY(intersectPoint.y, clashSize[1]);

      // Spectacular Lerp for Premium Feel
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, snappedX, 0.42);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, snappedY, 0.42);

      groupRef.current.position.z = 0.5;

      const isValid = useSimulationStore
        .getState()
        .checkPlacement(snappedX, snappedY, clashSize[0], clashSize[1]);

      const color = !isValid ? "#ff4444" : currentTheme.accent;

      // Pulse animation for spectacular feedback
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.05;
      groupRef.current.scale.set(pulse, pulse, pulse);

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

  let nodeSize: [number, number] = [40, 40];
  if (activeTool === "residential") nodeSize = [40, 40];
  else if (activeTool === "office") nodeSize = [50, 40];
  else if (
    activeTool === "lobby" ||
    activeTool === "elevator" ||
    activeTool === "utility"
  ) {
    nodeSize = [10, 40];
  } else if (activeTool === "text") nodeSize = [20, 5];

  return (
    <group ref={groupRef} visible={false}>
      <mesh position={[0, nodeSize[1] / 2, 0]}>
        <planeGeometry args={[nodeSize[0] + 2, nodeSize[1] + 2]} />
        <meshBasicMaterial
          ref={materialRef1}
          color={currentTheme.accent}
          transparent
          opacity={0.3}
        />
      </mesh>
      <mesh position={[0, nodeSize[1] / 2, 0]} rotation={[0, 0, Math.PI / 4]} castShadow receiveShadow>
        <ringGeometry args={[nodeSize[0] / 2 - 1, nodeSize[0] / 2, 4]} />
        <meshBasicMaterial ref={materialRef2} color={currentTheme.accent} />
      </mesh>

      {/* 3D Ghost Mesh */}
      <mesh position={[0, nodeSize[1] / 2, -20]} castShadow receiveShadow>
        <boxGeometry args={[nodeSize[0], nodeSize[1], 40]} />
        <meshBasicMaterial
          ref={materialRef3}
          color={currentTheme.accent}
          transparent
          opacity={0.1}
          wireframe
        />
      </mesh>

      <lineSegments position={[0, nodeSize[1] / 2, -20]}>
        <edgesGeometry args={[new THREE.BoxGeometry(nodeSize[0], nodeSize[1], 40)]} />
        <lineBasicMaterial
          ref={materialRef4}
          color={currentTheme.accent}
          linewidth={2}
        />
      </lineSegments>
    </group>
  );
};

// RainField and RainMist moved to modular features/weather.

const CanvasScene = () => {
  const { camera, controls, raycaster, pointer, scene, size } = useThree();
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

  const lastPlacedCellRef = useRef<string | null>(null);

  const targetZoom = useRef(useSimulationStore.getState().cameraState.zoom);
  const hasInteractedRef = useRef(false);
  const sphereRef = useRef<THREE.Mesh>(null);
  const lastSyncTimeRef = useRef(0);
  const lastStampedPos = useRef<string | null>(null);



  useEffect(() => {
    if (shouldResetCamera) {
      const { cameraState, cameraRotation } = useSimulationStore.getState();
      targetZoom.current = cameraState.zoom;
      camera.position.set(...(cameraState.position as [number, number, number]));
      (camera as THREE.OrthographicCamera).zoom = cameraState.zoom;
      camera.updateProjectionMatrix();
      if (controls) {
        const orbit = controls as any;
        orbit.target.set(0, 0, 0);
        orbit.setAzimuthalAngle(cameraRotation.azimuth);
        orbit.setPolarAngle(cameraRotation.polar);
        orbit.update();
      }
      setShouldResetCamera(false);
    }
  }, [shouldResetCamera, camera, controls, setShouldResetCamera]);

  // Manual mount overrides removed to allow Store/Canvas props to lead
  useEffect(() => {
    if (controls) {
      const { cameraRotation } = useSimulationStore.getState();
      const orbit = controls as any;
      orbit.setAzimuthalAngle(cameraRotation.azimuth);
      orbit.setPolarAngle(cameraRotation.polar);
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

    // Detect first interaction to prevent startup drift
    if (!hasInteractedRef.current && (Math.abs(state.pointer.x) > 0.01 || Math.abs(state.pointer.y) > 0.01)) {
      hasInteractedRef.current = true;
    }

    if (Math.abs(cam.zoom - targetZoom.current) > 0.001) {

      const oldZoom = cam.zoom;
      cam.zoom = targetZoom.current;

      const mouseWorld = mouseWorldRef.current
        .set(state.pointer.x, state.pointer.y, 0)
        .unproject(cam);
      const zoomRatio = 1 - oldZoom / cam.zoom;

      // Only shift position if user has interacted, otherwise keep centered on default POS
      if (hasInteractedRef.current) {
        const moveVector = moveVectorRef.current
          .subVectors(mouseWorld, cam.position)
          .multiplyScalar(zoomRatio);

        moveVector.z = 0;
        cam.position.add(moveVector);
        if (controls) {
          (controls as any).target.add(moveVector);
          (controls as any).update();
        }
      }


      cam.updateProjectionMatrix();
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

    // Unify raycasting math for bit-for-bit placement parity (Industry leading finish)
    raycaster.setFromCamera(pointer, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    if (!intersectPoint) return;

    let nodeSize: [number, number] = [40, 40];
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
      "floor",
    ];
    const isRoom = roomTypes.includes(activeTool);

    if (activeTool === "text") {
      nodeSize = [20, 5];
      vertices = [
        [-10, -2.5],
        [10, -2.5],
        [10, 2.5],
        [-10, 2.5],
      ];
    } else if (activeTool === "residential") {
      nodeSize = [40, 40];
      vertices = [
        [-20, -20],
        [20, -20],
        [20, 20],
        [-20, 20],
      ];
    } else if (activeTool === "office") {
      nodeSize = [50, 40];
      vertices = [
        [-25, -20],
        [25, -20],
        [25, 20],
        [-25, 20],
      ];
    } else if (
      activeTool === "lobby" ||
      activeTool === "elevator" ||
      activeTool === "utility" ||
      activeTool === "floor"
    ) {
      nodeSize = [10, 40];
      vertices = [
        [-5, -20],
        [5, -20],
        [5, 20],
        [-5, 20],
      ];
    } else if (isRoom) {
      nodeSize = [40, 40];
      vertices = [
        [-20, -20],
        [20, -20],
        [20, 20],
        [-20, 20],
      ];
    } else if (activeTool === "terminal") {
      nodeSize = [25, 10];
      vertices = [
        [-12.5, -5],
        [12.5, -5],
        [12.5, 5],
        [-12.5, 5],
      ];
    } else if (activeTool === "parallelogram") {
      nodeSize = [22, 15];
      vertices = [
        [-11, -7.5],
        [11, -7.5],
        [11, 7.5],
        [-11, 7.5],
      ];
    } else if (activeTool === "hexagon") {
      nodeSize = [24, 15];
      vertices = [
        [-12, -7.5],
        [12, -7.5],
        [12, 7.5],
        [-12, 7.5],
      ];
    } else if (activeTool === "trapezoid") {
      nodeSize = [22, 15];
      vertices = [
        [-11, -7.5],
        [11, -7.5],
        [11, 7.5],
        [-11, 7.5],
      ];
    } else if (activeTool === "display") {
      nodeSize = [24, 15];
      vertices = [
        [-12, -7.5],
        [12, -7.5],
        [12, 7.5],
        [-12, 7.5],
      ];
    }

    const snappedX = snapX(intersectPoint.x, nodeSize[0]);
    const snappedY = activeTool === "lobby"
      ? 0
      : getPlacementCenterY(intersectPoint.y, nodeSize[1]);

    const position: [number, number] = [snappedX, snappedY];
    const gridKey = `${snappedX},${snappedY}`;

    // Block overlapping clicks
    const isValid = useSimulationStore
      .getState()
      .checkPlacement(snappedX, snappedY, nodeSize[0], nodeSize[1]);
    if (!isValid) return;

    // Block rapid multiple placements (dealt with after uniqueness check)
    if (lastPlacedCellRef.current === gridKey) return;
    lastPlacedCellRef.current = gridKey;

    // Reset guard after short delay
    setTimeout(() => {
      lastPlacedCellRef.current = null;
    }, 100);

    const id = Math.random().toString(36);
    addShape(
      {
        id,
        type: activeTool as any,
        position,
        size: nodeSize,
        vertices,
        text: activeTool === "text" ? "" : undefined,
      },
      true, // Force exact position since we already checked existence
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
      // Stamping logic removed to enforce single-click placement
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

  const gridRef = useRef<any>(null);
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const raycastResult = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    if (gridRef.current) {
      // Find the screen center in world space on the ground plane (y=0)
      state.raycaster.setFromCamera(new THREE.Vector2(0, 0), state.camera);
      const intersect = state.raycaster.ray.intersectPlane(groundPlane, raycastResult);

      if (intersect) {
        // Snap the grid center to 10-unit increments to prevent line-shifting
        gridRef.current.position.x = Math.round(intersect.x / 10) * 10;
        gridRef.current.position.z = Math.round(intersect.z / 10) * 10;
      }
    }
  });

  const handlePointerDown = (e: any) => {
    wasPanningRef.current = false;
    wasDraggingRef.current = false;
    wasLinkingRef.current = false;
    pointerDownPos.current = [e.clientX, e.clientY];

    if (e.button === 2) {
      return;
    }

    if (e.nativeEvent.target.tagName !== "CANVAS") return;

    if (activeTool !== "select") return;
    if (selectedId) setSelectedId(null);
  };

  const handlePointerUp = (e: any) => {
    setIsPanning(false);
    setIsRotating(false);

    let wasStaticClick = false;
    if (pointerDownPos.current) {
      const dx = e.clientX - pointerDownPos.current[0];
      const dy = e.clientY - pointerDownPos.current[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 6) {
      } else {
        wasStaticClick = true;
        wasPanningRef.current = false;
        wasDraggingRef.current = false;
        wasLinkingRef.current = false;
      }
    }

    if (e.button === 2 && wasStaticClick) {
      setActiveTool("select");
      setSelectedId(null); // RIGHT CLICK DESELECT
    }

    if (e.button === 0 && wasStaticClick && activeTool === "select") {
      setSelectedId(null); // LEFT CLICK DESELECT ONLY IN SELECT MODE
    }

    if (linkingFrom) {
      wasLinkingRef.current = true;
      raycaster.setFromCamera(pointer, camera);
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

  const showWeather = useSimulationStore((state) => state.showWeather);

  return (
    <>
      <color attach="background" args={[isDark ? "#0d1117" : "#cbd5e1"]} />
      <fog attach="fog" args={[isDark ? "#0d1117" : "#cbd5e1", showWeather ? 100 : 500, showWeather ? 1000 : 4000]} />

      {/* Modular Atmospheric Simulation */}
      <SolarSystem />

      <Environment
        preset={isDark ? "night" : "city"}
        background={false}
        environmentIntensity={showWeather ? 0.45 : (isDark ? 0.35 : 0.45)} // Lifted to restore PBR material reflections
      >
        {isDark && (
          <group rotation={[0, 0, 0]}>
            <Lightformer intensity={3.5} rotation={[Math.PI / 2, 0, 0]} position={[0, 20, -10]} scale={[20, 20, 1]} color="#22d3ee" />
            <Lightformer intensity={1.5} rotation={[0, Math.PI / 2, 0]} position={[-10, 10, 0]} scale={[20, 10, 1]} color="#a855f7" />
            <Lightformer intensity={1.5} rotation={[0, -Math.PI / 2, 0]} position={[10, 10, 0]} scale={[20, 10, 1]} color="#3b82f6" />
          </group>
        )}
      </Environment>

      <OrbitControls
        makeDefault
        enableRotate={true}
        enableZoom={false}
        enableDamping={true}
        dampingFactor={0.1}
        enabled={!isDragging && !linkingFrom && !isRotating && !isPanning}
        mouseButtons={{
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.ROTATE,
          RIGHT: THREE.MOUSE.PAN,
        }}
        onStart={() => {
          wasPanningRef.current = false;
        }}
        onChange={() => {
          wasPanningRef.current = true;

          // Event-driven camera sync (Industry Leading Optimization)
          const now = performance.now();
          if (now - lastSyncTimeRef.current > 100) {
            const cam = camera as THREE.OrthographicCamera;
            const orbit = controls as any;
            const azimuth = orbit.getAzimuthalAngle();
            const polar = orbit.getPolarAngle();

            const currentSize = (controls as any).object.getState?.().size || size;
            setCameraState(
              [cam.position.x, cam.position.y, cam.position.z],
              cam.zoom,
              currentSize.width / cam.zoom,
              currentSize.height / cam.zoom
            );
            setCameraRotation(azimuth, polar);
            lastSyncTimeRef.current = now;
          }
        }}

        onEnd={() => {
          setTimeout(() => {
            // Only clear wasPanning if we actually finished a move
            // Static clicks will have already cleared it in handlePointerUp
          }, 200);
        }}
      />

      <PlacementIndicator />
      <SimulationNodes />
      <InternetConnectivity />
      <SimulationLinks />
      <GroundIndicatorPlane
        position={[0, 0, 0]}
        thickness={5}
        color="#2e7d32"
        opacity={1.0}
        renderOrder={-1}
      />

      <Grid
        ref={gridRef}
        position={[0, 1.0, 0]} // Raised by 1 unit to prevent Z-fighting
        args={[2000, 2000]}
        cellSize={10}
        cellThickness={1.0}
        cellColor={isDark ? "rgba(216, 231, 242, 0.2)" : "rgba(237, 244, 249, 0.2)"}
        sectionSize={40}
        sectionThickness={1.5}
        sectionColor={isDark ? "rgba(143, 178, 200, 0.2)" : "rgba(199, 214, 226, 0.2)"}
        fadeDistance={280}
        fadeStrength={1.5}
        followCamera={false} // Manually following via useFrame for better control
        infiniteGrid={true}
      />

      <HolographicFloors />

      <mesh
        position={[0, 0, -150]}
        onPointerUp={handlePointerUp}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
      >
        <planeGeometry args={[4000, 4000]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>



      {showWeather && (
        <>
          <RainField isDark={isDark} />
          <RainMist isDark={isDark} />
        </>
      )}

      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.65}
        scale={240}
        blur={2.2}
        far={70}
        resolution={2048}
        color={isDark ? "#0d1a1f" : "#1a242a"}
        frames={1}
      />

      <N8AO
        aoRadius={8} // Increased from 5 to cover larger interior volumes
        intensity={isDark ? 3.0 : 3.0} // Increased to 3.0 per user request
        color={isDark ? "#05080a" : "#0d1316"} // Deep dark to swallow true corners
        quality="high"
      />
      <Bloom
        mipmapBlur
        luminanceThreshold={2.5} // Raised back to 2.5 to prevent wall-glow 'bleeding'
        luminanceSmoothing={0.5}
        intensity={isDark ? 0.2 : 0.1}
      />
      <Noise opacity={0.002} premultiply />
      <Vignette eskil={false} offset={0.1} darkness={isDark ? 0.78 : 0.22} />
    </>
  );
};

export const SimulationCanvas = () => {
  const cameraState = useSimulationStore((state) => state.cameraState);
  const showWeather = useSimulationStore((state) => state.showWeather);

  return (
    <Canvas
      orthographic
      shadows="soft"
      camera={{
        zoom: cameraState.zoom,
        position: cameraState.position as [number, number, number],
        far: 5000,
        near: -5000
      }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: showWeather ? 0.4 : 0.7, // Dynamic exposure for weather mood
        outputColorSpace: THREE.SRGBColorSpace,
      }}
    >
      <CanvasScene />
    </Canvas>
  );
};
