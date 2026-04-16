import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  Environment,
  ContactShadows,
  Lightformer,
} from "@react-three/drei";
import themes from "../features/ui/themes/palettes/color_palettes.json";
import { Bloom, Noise, Vignette, N8AO } from "@react-three/postprocessing";
import { HolographicFloors } from "../features/environment/HolographicFloors";
import { HolographicHeightScale } from "../features/environment/HolographicHeightScale";
import { HolographicWidthScale } from "../features/environment/HolographicWidthScale";
import { GroundIndicatorPlane } from "../features/environment/components/GroundIndicatorPlane";
import { SimulationNodes } from "../entities/SimulationNodes";
import { InternetConnectivity } from "../features/roomPlacement/visuals/InternetConnectivity";
import { SolarSystem } from "../features/lighting/ui/SolarSystem";
import { RainField, RainMist } from "../features/weather/ui/WeatherEffects";
import { WeatherPanel } from "../features/weather/ui/WeatherPanel";
import { AssetPreloader } from "../features/assetPreloader/ui/AssetPreloader";
// [DISABLED] SimPeople — re-enable after grass shader integration
// import { SimPeopleManager } from "../features/simPeople/components/SimPeopleManager";
// import { usePeopleSpawner } from "../features/simPeople/store/usePeopleSpawner";
// import { useSimPeopleLoop } from "../features/simPeople/animations/useSimPeopleLoop";
import { GrassField } from "../features/environment/components/GrassField";
import { TimeEngine } from "../features/time/components/TimeEngine";
import { SimulationLinks } from "../entities/SimulationLinks";
import { useSimulationStore, GRID_SIZE_X, GRID_SIZE_Y, snapX, getPlacementCenterY, getFloorBaseY } from "../shared/utils/store";
import roomMetadata from "../entities/rooms/roomMetadata.json";
import * as THREE from "three";
import { useRef, useEffect, useMemo, useState } from "react";
import { useToolPreloader } from "../features/assetPreloader/hooks/useToolPreloader";
import { useAudioController } from "../features/audio-engine/hooks/useAudioController";
import { audioEngine } from "../features/audio-engine/AudioEngine";
import { AudioListenerSync } from "../features/audio-engine/components/AudioListenerSync";

// RAIN_COUNT constants moved to modular features/weather.

const PlacementIndicator = () => {
  const activeTool = useSimulationStore((state) => state.activeTool);
  const activeModuleId = useSimulationStore((state) => state.activeModuleId);
  const themeName = useSimulationStore((state) => state.themeName);
  const currentTheme = useMemo(() => (themes as any)[themeName], [themeName]);

  const platformMetadata = useMemo(() => {
    if (!activeModuleId) return null;
    return (
      (roomMetadata.rooms as any[]).find((r) => r.id === activeModuleId) ?? null
    );
  }, [activeModuleId]);

  const indicatorWidth = useMemo(() => {
    if (platformMetadata) {
      return platformMetadata.dimensions.width * GRID_SIZE_X;
    }
    if (activeTool === "office") return 50;
    if (["lobby", "elevator", "utility", "structure"].includes(activeTool))
      return 10;
    if (activeTool === "text") return 20;
    return 40;
  }, [activeTool, platformMetadata]);

  const indicatorHeight = useMemo(() => {
    if (platformMetadata) {
      return platformMetadata.dimensions.height * GRID_SIZE_Y;
    }
    if (activeTool === "office") return 40;
    if (activeTool === "text") return 5;
    return 40;
  }, [activeTool, platformMetadata]);

  const indicatorDepth = useMemo(() => {
    if (platformMetadata && platformMetadata.dimensions.depth) {
      return platformMetadata.dimensions.depth * GRID_SIZE_X;
    }
    // Fall back to one structural cell (40 units) so the box always remains a proper depth
    return GRID_SIZE_Y;
  }, [platformMetadata]);

  const indicatorSize: [number, number] = [indicatorWidth, indicatorHeight];
  const groundSize: [number, number] = [indicatorWidth, indicatorDepth];
  const groupRef = useRef<THREE.Group>(null);
  const materialRef1 = useRef<THREE.MeshBasicMaterial>(null);
  const materialRef2 = useRef<THREE.MeshBasicMaterial>(null);
  const materialRef3 = useRef<THREE.MeshBasicMaterial>(null);
  const materialRef4 = useRef<THREE.LineBasicMaterial>(null);

  const { camera, pointer, raycaster, size } = useThree();

  const [isValid, setIsValid] = useState(true);
  const isValidRef = useRef(true);
  const lastCheckPos = useRef<string>("");
  const isChecking = useRef(false);

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
      const clashSize = indicatorSize;

      const snappedX = snapX(intersectPoint.x, clashSize[0]);
      const snappedY =
        activeTool === "lobby"
          ? 0
          : getPlacementCenterY(intersectPoint.y, clashSize[1]);

      // Spectacular Lerp for Premium Feel
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        snappedX,
        0.42,
      );
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        snappedY,
        0.42,
      );

      groupRef.current.position.z = 0.5;

      // UNIFIED BUILDING LOGIC: Direct Main-Thread Validation
      // We use the same 'checkPlacement' that handleBuild uses, ensuring 100% parity.
      const isValidSync = useSimulationStore
        .getState()
        .checkPlacement(
          snappedX,
          snappedY,
          clashSize[0],
          clashSize[1],
          activeTool
        );

      isValidRef.current = isValidSync;

      // VITAL FIX: Update materials immediately
      const color = !isValidRef.current ? "#ff4444" : currentTheme.accent;

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

  const verticalHeight = indicatorHeight;
  const verticalHalf = verticalHeight / 2;
  const groundWidth = groundSize[0];
  const groundDepth = groundSize[1];
  const ghostCenterZ = -groundDepth / 2;
  const frontFaceZ = ghostCenterZ + groundDepth / 2 + 0.05;

  return (
    <group ref={groupRef} visible={false}>
      <mesh position={[0, verticalHalf, frontFaceZ]}>
        <planeGeometry args={[groundWidth + 2, verticalHeight + 2]} />
        <meshBasicMaterial
          ref={materialRef1}
          color={currentTheme.accent}
          transparent
          opacity={0.3}
        />
      </mesh>
      <lineSegments position={[0, verticalHalf, frontFaceZ]}>
        <edgesGeometry
          args={[new THREE.PlaneGeometry(groundWidth - 2, verticalHeight - 2)]}
        />
        <lineBasicMaterial
          ref={materialRef2}
          color={currentTheme.accent}
          linewidth={2}
        />
      </lineSegments>

      {/* 3D Ghost Mesh */}
      <mesh position={[0, verticalHalf, ghostCenterZ]} castShadow receiveShadow>
        <boxGeometry args={[groundWidth, verticalHeight, groundDepth]} />
        <meshBasicMaterial
          ref={materialRef3}
          color={currentTheme.accent}
          transparent
          opacity={0.1}
          wireframe
        />
      </mesh>

      <lineSegments position={[0, verticalHalf, ghostCenterZ]}>
        <edgesGeometry
          args={[
            new THREE.BoxGeometry(groundWidth, verticalHeight, groundDepth),
          ]}
        />
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

  useToolPreloader();
  useAudioController();

  // usePeopleSpawner();
  // useSimPeopleLoop();

  const wasLinkingRef = useRef(false);
  const wasPanningRef = useRef(false);
  const pointerDownPos = useRef<[number, number] | null>(null);
  const lastStampedCellKey = useRef<string | null>(null);

  const addShape = useSimulationStore((state) => state.addShape);
  const setActiveTool = useSimulationStore((state) => state.setActiveTool);
  const activeTool = useSimulationStore((state) => state.activeTool);
  const updateShape = useSimulationStore((state) => state.updateShape);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const setSelectedId = useSimulationStore((state) => state.setSelectedId);
  const editingId = useSimulationStore((state) => state.editingId);
  const setEditingId = useSimulationStore((state) => state.setEditingId);
  const deleteShape = useSimulationStore((state) => state.deleteShape);
  const isRotating = useSimulationStore((state) => state.isRotating);
  const setIsRotating = useSimulationStore((state) => state.setIsRotating);
  const isPanning = useSimulationStore((state) => state.isPanning);
  const setIsPanning = useSimulationStore((state) => state.setIsPanning);
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
  const isClickMovedRef = useRef(false);

  useEffect(() => {
    if (shouldResetCamera) {
      const { cameraState, cameraRotation } = useSimulationStore.getState();
      targetZoom.current = cameraState.zoom;
      camera.position.set(
        ...(cameraState.position as [number, number, number]),
      );
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
    if (
      !hasInteractedRef.current &&
      (Math.abs(state.pointer.x) > 0.01 || Math.abs(state.pointer.y) > 0.01)
    ) {
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

  const handleClick = (event: any, forceStamp?: boolean) => {
    const shouldIgnoreClick =
      !forceStamp &&
      (wasLinkingRef.current ||
        wasPanningRef.current ||
        isClickMovedRef.current);
    if (shouldIgnoreClick) {
      wasLinkingRef.current = false;
      wasPanningRef.current = false;
      pointerDownPos.current = null;
      isClickMovedRef.current = false;

      const blockingTool =
        activeTool === "select" ||
        activeTool === "link" ||
        activeTool === "vertex";
      if (blockingTool) {
        if (event.stopPropagation) event.stopPropagation();
        return;
      }
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

    if (activeTool === "select" || activeTool === "vertex") {
      return;
    }

    // Unify raycasting math for bit-for-bit placement parity (Industry leading finish)
    // Unify raycasting math for bit-for-bit placement parity (Industry leading finish)
    // We ALWAYS re-calculate the intersection against the Z=0 plane to prevent perspective/depth-plane drift
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
      "structure",
    ];
    const isRoom = roomTypes.includes(activeTool);
    const activeModuleId = useSimulationStore.getState().activeModuleId;
    const metadata = activeModuleId
      ? (roomMetadata.rooms as any[]).find((r) => r.id === activeModuleId)
      : null;

    if (metadata) {
      // Dynamic Targeting Using Centralized Data
      const halfW = (metadata.dimensions.width * GRID_SIZE_X) / 2;
      const halfH = (metadata.dimensions.height * GRID_SIZE_Y) / 2;
      nodeSize = [
        metadata.dimensions.width * GRID_SIZE_X,
        metadata.dimensions.height * GRID_SIZE_Y,
      ];
      vertices = [
        [-halfW, -halfH],
        [halfW, -halfH],
        [halfW, halfH],
        [-halfW, halfH],
      ];
    } else if (activeTool === "text") {
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
      activeTool === "structure"
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
    const snappedY =
      activeTool === "lobby"
        ? 0
        : getPlacementCenterY(intersectPoint.y, nodeSize[1]);

    const position: [number, number] = [snappedX, snappedY];
    const gridKey = `${snappedX},${snappedY}`;

    // Block overlapping clicks
    const isValid = useSimulationStore
      .getState()
      .checkPlacement(snappedX, snappedY, nodeSize[0], nodeSize[1], activeTool);
    if (!isValid) return;

    // Block rapid multiple placements (dealt with after uniqueness check)
    if (lastPlacedCellRef.current === gridKey) return;
    lastPlacedCellRef.current = gridKey;

    // Reset guard after short delay
    setTimeout(() => {
      lastPlacedCellRef.current = null;
    }, 100);

    const id = `room_${Math.random().toString(36).substring(2, 9)}`;

    addShape(
      {
        id,
        type: activeTool as any,
        metadataId: activeModuleId || undefined,
        position,
        size: nodeSize,
        vertices,
        text: activeTool === "text" ? "" : undefined,
      },
      true, // Force exact position since we already checked existence
    );

    // [AUDIO] Trigger a juicy, harmonically warm "Thud" upon successful placement
    // Non-blocking: Wrap in zero-delay timeout to uncouple audio scheduling from frame instantiation logic
    setTimeout(() => {
      audioEngine.triggerBuildThud();
    }, 0);

    setSelectedId(id);

    if (activeTool === "text") {
      setEditingId(id);
      setActiveTool("select");
    }
  };

  useEffect(() => {
    const handleGlobalDown = (e: PointerEvent) => {
      if (e.button === 2) {
        // Prevent default context menu on right click
        e.preventDefault();
      }
    };
    window.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("pointerdown", handleGlobalDown);
    return () => {
      window.removeEventListener("contextmenu", (e) => e.preventDefault());
      window.removeEventListener("pointerdown", handleGlobalDown);
    };
  }, []);

  useEffect(() => {
    const handleGlobalUp = (e: PointerEvent) => {
      // Right-click exclusively: deselect/cancel active tool
      if (e.button === 2) {
        const currentTool = useSimulationStore.getState().activeTool;
        if (currentTool !== "select") {
          setActiveTool("select");
        }
        setSelectedId(null);
        setIsPanning(false);
        setIsRotating(false);
      } else {
        setIsPanning(false);
        setIsRotating(false);
      }

      setLinkingFrom(null);
      setLinkingTo(null);
    };
    window.addEventListener("pointerup", handleGlobalUp);
    return () => window.removeEventListener("pointerup", handleGlobalUp);
  }, [
    setIsPanning,
    setIsRotating,
    setLinkingFrom,
    setLinkingTo,
    setActiveTool,
    setSelectedId,
  ]);

  const handlePointerMove = (e: any) => {
    let currentIsPanning = isPanning;
    let currentIsRotating = isRotating;
    let currentLinkingFrom = linkingFrom;

    if (e.nativeEvent.buttons === 0) {
      if (isPanning) {
        setIsPanning(false);
        currentIsPanning = false;
        wasPanningRef.current = true;
      }
      if (isRotating) {
        setIsRotating(false);
        currentIsRotating = false;
      }
      if (linkingFrom) {
        setLinkingFrom(null);
        setLinkingTo(null);
        currentLinkingFrom = null;
        wasLinkingRef.current = true;
      }
    }

    // Pointer jitter threshold for "click vs move"
    if (pointerDownPos.current && e.nativeEvent.buttons !== 0) {
      const dx = e.nativeEvent.clientX - pointerDownPos.current[0];
      const dy = e.nativeEvent.clientY - pointerDownPos.current[1];
      if (Math.sqrt(dx * dx + dy * dy) > 3) {
        isClickMovedRef.current = true;
      }
    }

    if (e.nativeEvent.buttons === 1) {
      const isStampableTool =
        activeTool === "lobby" || activeTool === "structure";
      if (
        isStampableTool &&
        !currentIsPanning &&
        !currentIsRotating &&
        !currentLinkingFrom
      ) {
        // Unify raycasting math for bit-for-bit placement parity (Industry leading finish)
        raycaster.setFromCamera(pointer, camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersectPoint);

        if (intersectPoint) {
          // Continuous row construction (SimTower style sequential placement)
          // We use a cell key to prevent double-stamping in the same grid spot during the move
          const snappedX = Math.round(intersectPoint.x / 10) * 10;
          const snappedY =
            activeTool === "lobby" ? 0 : getFloorBaseY(intersectPoint.y);
          const cellKey = `${snappedX}:${snappedY}:${activeTool}`;

          if (lastStampedCellKey.current !== cellKey) {
            lastStampedCellKey.current = cellKey;
            handleClick(e, true);
          }
        }
      }
    } else if (e.nativeEvent.buttons === 0) {
      lastStampedCellKey.current = null;
    }

    const zoom = (camera as THREE.OrthographicCamera).zoom;


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

    if (currentLinkingFrom && e.point) {
      setLinkingTo([e.point.x, e.point.y]);
      return;
    }
  };

  const gridRef = useRef<any>(null);
  const groundPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    [],
  );
  const raycastResult = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    if (gridRef.current) {
      // Find the screen center in world space on the ground plane (y=0)
      state.raycaster.setFromCamera(new THREE.Vector2(0, 0), state.camera);
      const intersect = state.raycaster.ray.intersectPlane(
        groundPlane,
        raycastResult,
      );

      if (intersect) {
        // Snap the grid center to 10-unit increments to prevent line-shifting
        gridRef.current.position.x = Math.round(intersect.x / 10) * 10;
        gridRef.current.position.z = Math.round(intersect.z / 10) * 10;
      }
    }
  });

  const handlePointerDown = (e: any) => {
    wasPanningRef.current = false;
    wasLinkingRef.current = false;
    isClickMovedRef.current = false;
    pointerDownPos.current = [e.nativeEvent.clientX, e.nativeEvent.clientY];

    if (e.button === 2) {
      return;
    }

    if (e.nativeEvent.target.tagName !== "CANVAS") return;

    if (activeTool !== "select") return;
    // Don't deselect here, let handlePointerUp/handleClick decide based on movement
  };

  const handlePointerUp = (e: any) => {
    setIsPanning(false);
    setIsRotating(false);

    let wasStaticClick = false;
    if (pointerDownPos.current) {
      const dx = e.nativeEvent.clientX - pointerDownPos.current[0];
      const dy = e.nativeEvent.clientY - pointerDownPos.current[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 6) {
        isClickMovedRef.current = true;
      } else {
        wasStaticClick = true;
        wasPanningRef.current = false;
        wasLinkingRef.current = false;
        isClickMovedRef.current = false;
      }
    }

    if (e.button === 2 && wasStaticClick) {
      // Handled globally in handleGlobalUp for industry-leading reliability
    }

    if (e.button === 0 && wasStaticClick && activeTool === "select") {
      // Only deselect if we didn't just finished a drag/pan/move
      if (
        !wasPanningRef.current &&
        !wasLinkingRef.current &&
        !isClickMovedRef.current
      ) {
        setSelectedId(null); // LEFT CLICK DESELECT ONLY IN SELECT MODE
      }
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

    setLinkingFrom(null);
    setLinkingTo(null);
  };

  const showWeather = useSimulationStore((state) => state.showWeather);

  return (
    <>
      <color attach="background" args={[isDark ? "#0d1117" : "#cbd5e1"]} />
      <fog
        attach="fog"
        args={[
          isDark ? "#0d1117" : "#cbd5e1",
          showWeather ? 100 : 500,
          showWeather ? 1000 : 4000,
        ]}
      />

      {/* Modular Atmospheric Simulation */}
      <SolarSystem />

      <Environment
        preset={isDark ? "night" : "city"}
        background={false}
        environmentIntensity={showWeather ? 0.45 : isDark ? 0.35 : 0.45} // Lifted to restore PBR material reflections
      >
        {isDark && (
          <group rotation={[0, 0, 0]}>
            <Lightformer
              intensity={3.5}
              rotation={[Math.PI / 2, 0, 0]}
              position={[0, 20, -10]}
              scale={[20, 20, 1]}
              color="#22d3ee"
            />
            <Lightformer
              intensity={1.5}
              rotation={[0, Math.PI / 2, 0]}
              position={[-10, 10, 0]}
              scale={[20, 10, 1]}
              color="#a855f7"
            />
            <Lightformer
              intensity={1.5}
              rotation={[0, -Math.PI / 2, 0]}
              position={[10, 10, 0]}
              scale={[20, 10, 1]}
              color="#3b82f6"
            />
          </group>
        )}
      </Environment>

      <AudioListenerSync />
      <OrbitControls
        makeDefault
        enableRotate={true}
        enableZoom={false}
        enableDamping={true}
        dampingFactor={0.1}
        enabled={!linkingFrom && !isRotating && !isPanning}
        mouseButtons={{
          LEFT: activeTool === "select" ? THREE.MOUSE.PAN : (undefined as any),
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

            const currentSize =
              (controls as any).object.getState?.().size || size;
            setCameraState(
              [cam.position.x, cam.position.y, cam.position.z],
              cam.zoom,
              currentSize.width / cam.zoom,
              currentSize.height / cam.zoom,
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
        width={5000}
        depth={5000}
        thickness={10}
        color="#241d18"
        opacity={1.0}
        renderOrder={-1}
      />

      <Grid
        ref={gridRef}
        position={[0, 1.0, 0]} // Raised by 1 unit to prevent Z-fighting
        args={[2000, 2000]}
        cellSize={10}
        cellThickness={1.0}
        cellColor={isDark ? "#d8e7f2" : "#edf4f9"}
        sectionSize={40}
        sectionThickness={1.5}
        sectionColor={isDark ? "#8fb2c8" : "#c7d6e2"}
        fadeDistance={280}
        fadeStrength={1.5}
        followCamera={false} // Manually following via useFrame for better control
        infiniteGrid={true}
      />

      <HolographicFloors />
      <HolographicHeightScale />
      <HolographicWidthScale />
      {/* <SimPeopleManager /> */}
      <GrassField
        width={1000}
        instances={250000}
        joints={3}
        bladeWidth={0.25}
        bladeHeight={1.0}
        position={[0, 0.2, 0]}
        uMaxDistance={380}
      />

      <mesh
        position={[0, 0, -150]}
        onPointerUp={handlePointerUp}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
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
  const showWeather = useSimulationStore((state) => state.showWeather);

  // High-performance camera initialization:
  // We use initial state to bootstrap the camera, but DO NOT subscribe to changes here.
  // Reactive camera updates are handled by OrbitControls and synced back to the store
  // via throttled events to prevent feedback loops and main-thread locking.
  const [initialCamera] = useState(
    () => useSimulationStore.getState().cameraState,
  );

  return (
    <Canvas
      orthographic
      shadows={{ type: THREE.PCFShadowMap }}
      camera={{
        zoom: initialCamera.zoom,
        position: initialCamera.position as [number, number, number],
        far: 5000,
        near: -5000,
      }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: showWeather ? 0.4 : 0.52, // Calibrated for deep architectural contrast without albedo-tinting baseline
        outputColorSpace: THREE.SRGBColorSpace,
      }}
    >
      <AssetPreloader />
      <TimeEngine />
      <CanvasScene />
    </Canvas>
  );
};
