import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing';
import { FlowchartNodes } from '../entities/FlowchartNodes';
import { FlowchartLinks } from '../entities/FlowchartLinks';
import { useFlowchartStore, snapX, snapY } from '../shared/utils/store';
import themes from '../shared/themes/color_palettes.json';
import * as THREE from 'three';
import { useRef, useEffect, useMemo, useState } from 'react';

const PlacementIndicator = () => {
  const activeTool = useFlowchartStore(state => state.activeTool);
  const themeName = useFlowchartStore(state => state.themeName);
  const currentTheme = useMemo(() => (themes as any)[themeName], [themeName]);
  
  const groupRef = useRef<THREE.Group>(null);
  const materialRef1 = useRef<THREE.MeshBasicMaterial>(null);
  const materialRef2 = useRef<THREE.MeshBasicMaterial>(null);
  const materialRef3 = useRef<THREE.MeshBasicMaterial>(null);
  const materialRef4 = useRef<THREE.LineBasicMaterial>(null);

  const { camera, pointer, raycaster } = useThree();

  useFrame(() => {
    if (!groupRef.current || activeTool === 'select' || activeTool === 'link' || activeTool === 'vertex') {
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }
    
    // Raycast to Z=25 plane (where the placement layer is)
    raycaster.setFromCamera(pointer, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -25);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);
    
    if (intersectPoint) {
      groupRef.current.visible = true;
      let size: [number, number] = [40, 40];
      if (activeTool === 'residential') size = [40, 40];
      else if (activeTool === 'office') size = [50, 40];
      else if (activeTool === 'lobby' || activeTool === 'elevator' || activeTool === 'utility') size = [10, 40];
      else if (activeTool === 'text') size = [20, 5];

      const snappedX = snapX(intersectPoint.x, size[0]);
      const snappedY = activeTool === 'lobby' ? 0 : snapY(intersectPoint.y, size[1]);
      
      groupRef.current.position.set(snappedX, snappedY, 0.1);
      
      // Check collision
      const existing = useFlowchartStore.getState().shapes.find(s => 
        s.position[0] === snappedX && s.position[1] === snappedY
      );
      
      const color = existing ? '#ff4444' : currentTheme.accent;
      if (materialRef1.current) materialRef1.current.color.set(color);
      if (materialRef2.current) materialRef2.current.color.set(color);
      if (materialRef3.current) materialRef3.current.color.set(color);
      if (materialRef4.current) materialRef4.current.color.set(color);
    } else {
      groupRef.current.visible = false;
    }
  });

  if (activeTool === 'select' || activeTool === 'link' || activeTool === 'vertex') return null;

  let size: [number, number] = [40, 40];
  if (activeTool === 'residential') size = [40, 40];
  else if (activeTool === 'office') size = [50, 40];
  else if (activeTool === 'lobby' || activeTool === 'elevator' || activeTool === 'utility') size = [10, 40];
  else if (activeTool === 'text') size = [20, 5];

  return (
    <group ref={groupRef} visible={false}>
      {/* 2D Outline on the front face */}
      <mesh>
        <planeGeometry args={[size[0] + 2, size[1] + 2]} />
        <meshBasicMaterial ref={materialRef1} color={currentTheme.accent} transparent opacity={0.3} />
      </mesh>
      <mesh>
        <ringGeometry args={[size[0] / 2 - 1, size[0] / 2, 4]} rotation={[0, 0, Math.PI / 4]} />
        <meshBasicMaterial ref={materialRef2} color={currentTheme.accent} />
      </mesh>
      
      {/* Ghost Box */}
      <mesh>
        <boxGeometry args={[size[0], size[1], 40]} />
        <meshBasicMaterial ref={materialRef3} color={currentTheme.accent} transparent opacity={0.1} wireframe />
      </mesh>

      {/* Outline */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(size[0], size[1], 40)]} />
        <lineBasicMaterial ref={materialRef4} color={currentTheme.accent} linewidth={2} />
      </lineSegments>
    </group>
  );
};

const FlowchartCanvasInner = () => {
  const { camera, controls, raycaster, mouse, scene } = useThree();
  const themeName = useFlowchartStore(state => state.themeName);
  
  const currentTheme = useMemo(() => (themes as any)[themeName], [themeName]);
  const isDark = currentTheme.mode === 'dark';
  const bgColor = isDark ? currentTheme.neutral_dark : currentTheme.neutral_light;
  const gridColor = isDark ? '#222222' : '#dddddd';
  const cellColor = isDark ? '#111111' : '#eeeeee';

  const wasLinkingRef = useRef(false);
  const wasDraggingRef = useRef(false);
  const wasPanningRef = useRef(false);
  const pointerDownPos = useRef<[number, number] | null>(null);

  const addShape = useFlowchartStore(state => state.addShape);
  const setActiveTool = useFlowchartStore(state => state.setActiveTool);
  const activeTool = useFlowchartStore(state => state.activeTool);
  const mode = useFlowchartStore(state => state.mode);
  const updateShape = useFlowchartStore(state => state.updateShape);
  const selectedId = useFlowchartStore(state => state.selectedId);
  const setSelectedId = useFlowchartStore(state => state.setSelectedId);
  const editingId = useFlowchartStore(state => state.editingId);
  const setEditingId = useFlowchartStore(state => state.setEditingId);
  const deleteShape = useFlowchartStore(state => state.deleteShape);
  const isDragging = useFlowchartStore(state => state.isDragging);
  const setIsDragging = useFlowchartStore(state => state.setIsDragging);
  const isRotating = useFlowchartStore(state => state.isRotating);
  const setIsRotating = useFlowchartStore(state => state.setIsRotating);
  const isPanning = useFlowchartStore(state => state.isPanning);
  const isRoomTool = activeTool !== 'select' && activeTool !== 'link' && activeTool !== 'vertex';
  const setIsPanning = useFlowchartStore(state => state.setIsPanning);
  const dragOffset = useFlowchartStore(state => state.dragOffset);
  const linkingFrom = useFlowchartStore(state => state.linkingFrom);
  const setLinkingFrom = useFlowchartStore(state => state.setLinkingFrom);
  const setLinkingTo = useFlowchartStore(state => state.setLinkingTo);
  const addLink = useFlowchartStore(state => state.addLink);
  const shouldResetCamera = useFlowchartStore(state => state.shouldResetCamera);
  const setShouldResetCamera = useFlowchartStore(state => state.setShouldResetCamera);
  const setCameraState = useFlowchartStore(state => state.setCameraState);
  const setCameraRotation = useFlowchartStore(state => state.setCameraRotation);
  const cameraMoveRequest = useFlowchartStore(state => state.cameraMoveRequest);
  const requestCameraMove = useFlowchartStore(state => state.requestCameraMove);

  const [isStamping, setIsStamping] = useState(false);
  const lastStampedPos = useRef<string | null>(null);

  const targetZoom = useRef(10);
  const zoomVelocity = useRef(0);
  const sphereRef = useRef<THREE.Mesh>(null);

  // Handle camera reset
  useEffect(() => {
    if (shouldResetCamera) {
      targetZoom.current = 7.5;
      camera.position.set(0, 0, 100);
      (camera as THREE.OrthographicCamera).zoom = 7.5;
      camera.updateProjectionMatrix();
      if (controls) {
        const orbit = controls as any;
        orbit.target.set(0, 0, 0);
        // Apply Project Highrise style default angles
        orbit.setAzimuthalAngle(-10 * Math.PI / 180);
        orbit.setPolarAngle(Math.PI / 2 - (2 * Math.PI / 180));
        orbit.update();
      }
      setShouldResetCamera(false);
    }
  }, [shouldResetCamera, camera, controls, setShouldResetCamera]);

  // Initial camera angle setup
  useEffect(() => {
    if (controls) {
      const orbit = controls as any;
      orbit.setAzimuthalAngle(-10 * Math.PI / 180);
      orbit.setPolarAngle(Math.PI / 2 - (2 * Math.PI / 180));
      orbit.update();
    }
  }, [controls]);

  // Handle external camera move requests (from minimap)
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

  // High-fidelity zoom loop
  useFrame((state, delta) => {
    const cam = camera as THREE.OrthographicCamera;
    
    // Apply zoom with crisp lerp
    if (Math.abs(cam.zoom - targetZoom.current) > 0.001) {
      const oldZoom = cam.zoom;
      
      // Crisp zoom without sluggish lerp
      cam.zoom = targetZoom.current;
      
      // Zoom-to-cursor logic: keep the point under the mouse fixed in world space
      const mouseWorld = mouseWorldRef.current.set(mouse.x, mouse.y, 0).unproject(cam);
      const zoomRatio = 1 - oldZoom / cam.zoom;
      const moveVector = moveVectorRef.current
        .subVectors(mouseWorld, cam.position)
        .multiplyScalar(zoomRatio);
      
      moveVector.z = 0; // Ensure camera stays at constant Z depth
      cam.position.add(moveVector);
      if (controls) {
        (controls as any).target.add(moveVector);
        (controls as any).update();
      }
      
      cam.updateProjectionMatrix();
    }

    // Sync atmospheric sphere to camera position
    if (sphereRef.current) {
      sphereRef.current.position.x = cam.position.x;
      sphereRef.current.position.y = cam.position.y;
    }

    // Sync camera state to store for minimap
    const currentZoom = cam.zoom;
    const worldWidth = state.size.width / currentZoom;
    const worldHeight = state.size.height / currentZoom;
    
    const prevCameraState = useFlowchartStore.getState().cameraState;
    if (
      prevCameraState.position[0] !== cam.position.x ||
      prevCameraState.position[1] !== cam.position.y ||
      prevCameraState.position[2] !== cam.position.z ||
      prevCameraState.zoom !== currentZoom ||
      prevCameraState.worldWidth !== worldWidth ||
      prevCameraState.worldHeight !== worldHeight
    ) {
      setCameraState([cam.position.x, cam.position.y, cam.position.z], currentZoom, worldWidth, worldHeight);
    }

    // Sync camera rotation to store for readout
    if (controls) {
      const orbit = controls as any;
      const azimuth = orbit.getAzimuthalAngle();
      const polar = orbit.getPolarAngle();
      const prevRotation = useFlowchartStore.getState().cameraRotation;
      if (Math.abs(prevRotation.azimuth - azimuth) > 0.001 || Math.abs(prevRotation.polar - polar) > 0.001) {
        setCameraRotation(azimuth, polar);
      }
    }
  });

  const placeAtPoint = (point: THREE.Vector3, skipHistory = true) => {
    if (!point) return;
    const size: [number, number] = [10, 40];
    const snappedX = snapX(point.x, size[0]);
    const snappedY = 0; // Lobby is strictly ground floor
    const posKey = `${snappedX},${snappedY}`;
    
    if (lastStampedPos.current === posKey) return;
    
    const shapes = useFlowchartStore.getState().shapes;
    const existing = shapes.find(s => s.position[0] === snappedX && s.position[1] === snappedY);
    if (existing) return;

    lastStampedPos.current = posKey;
    
    const id = Math.random().toString(36);
    addShape({
      id,
      type: 'lobby',
      position: [snappedX, snappedY],
      size,
      vertices: [[-5, -20], [5, -20], [5, 20], [-5, 20]],
    }, true, skipHistory);
  };

  // Handle keyboard and wheel zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingId) return;
      if (e.key === '+' || e.key === '=') {
        zoomVelocity.current += 0.05; 
      }
      if (e.key === '-' || e.key === '_') {
        zoomVelocity.current -= 0.05; 
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          deleteShape(selectedId);
          setSelectedId(null);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (editingId) return;
      // Prevent default to stop page scroll, but keep it snappy
      e.preventDefault();
      
      const delta = -e.deltaY;
      const zoomFactor = Math.pow(1.002, delta);
      
      targetZoom.current *= zoomFactor;
      targetZoom.current = THREE.MathUtils.clamp(targetZoom.current, 0.5, 150);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [editingId, selectedId, deleteShape, setSelectedId]);

  const handleClick = (event: any) => {
    if (mode === 'viewer' || wasLinkingRef.current || wasDraggingRef.current || wasPanningRef.current) {
      wasLinkingRef.current = false;
      wasDraggingRef.current = false;
      wasPanningRef.current = false;
      return;
    }

    if (editingId) {
      const shapes = useFlowchartStore.getState().shapes;
      const editingShape = shapes.find(s => s.id === editingId);
      if (editingShape && (!editingShape.text || editingShape.text.trim() === '')) {
        deleteShape(editingId);
      }
      setEditingId(null);
      return;
    }

    if (activeTool === 'select' || activeTool === 'link' || activeTool === 'vertex' || activeTool === 'lobby') return;
    
    if (!event.point) return;

    let size: [number, number] = [40, 40];
    let vertices: [number, number][] = [[-20, -20], [20, -20], [20, 20], [-20, 20]];

    // Handle room types specifically
    const roomTypes = ['residential', 'commercial', 'office', 'utility', 'lobby', 'elevator'];
    const isRoom = roomTypes.includes(activeTool);

    if (activeTool === 'text') {
      size = [20, 5];
      vertices = [[-10, -2.5], [10, -2.5], [10, 2.5], [-10, 2.5]];
    } else if (activeTool === 'residential') {
      size = [40, 40];
      vertices = [[-20, -20], [20, -20], [20, 20], [-20, 20]];
    } else if (activeTool === 'office') {
      size = [50, 40];
      vertices = [[-25, -20], [25, -20], [25, 20], [-25, 20]];
    } else if (activeTool === 'lobby' || activeTool === 'elevator' || activeTool === 'utility') {
      size = [10, 40];
      vertices = [[-5, -20], [5, -20], [5, 20], [-5, 20]];
    } else if (isRoom) {
      size = [40, 40];
      vertices = [[-20, -20], [20, -20], [20, 20], [-20, 20]];
    } else if (activeTool === 'terminal') {
      size = [25, 10];
      vertices = [[-12.5, -5], [12.5, -5], [12.5, 5], [-12.5, 5]];
    } else if (activeTool === 'parallelogram') {
      size = [22, 15];
      vertices = [[-11, -7.5], [11, -7.5], [11, 7.5], [-11, 7.5]];
    } else if (activeTool === 'hexagon') {
      size = [24, 15];
      vertices = [[-12, -7.5], [12, -7.5], [12, 7.5], [-12, 7.5]];
    } else if (activeTool === 'trapezoid') {
      size = [22, 15];
      vertices = [[-11, -7.5], [11, -7.5], [11, 7.5], [-11, 7.5]];
    } else if (activeTool === 'display') {
      size = [24, 15];
      vertices = [[-12, -7.5], [12, -7.5], [12, 7.5], [-12, 7.5]];
    }

    const snappedX = snapX(event.point.x, size[0]);
    const snappedY = activeTool === 'lobby' ? 0 : snapY(event.point.y, size[1]);
    const position: [number, number] = [snappedX, snappedY];

    // Check if a module already exists at this position
    const existing = useFlowchartStore.getState().shapes.find(s => 
      s.position[0] === snappedX && s.position[1] === snappedY
    );
    if (existing) return;

    addShape({
      id,
      type: activeTool as any,
      position,
      size,
      vertices,
      text: activeTool === 'text' ? '' : undefined,
    }, isRoom);

    setSelectedId(id);

    if (activeTool === 'text') {
      setEditingId(id);
      setActiveTool('select'); // Switch back to select tool after placing text
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
    window.addEventListener('pointerup', handleGlobalUp);
    return () => window.removeEventListener('pointerup', handleGlobalUp);
  }, [setIsPanning, setIsRotating, setIsDragging, setLinkingFrom, setLinkingTo]);

  const handlePointerMove = (e: any) => {
    if (mode === 'viewer') return;

    let currentIsDragging = isDragging;
    let currentIsPanning = isPanning;
    let currentIsRotating = isRotating;
    let currentLinkingFrom = linkingFrom;

    if (e.nativeEvent.buttons === 0) {
      if (isDragging) { setIsDragging(false); currentIsDragging = false; }
      if (isPanning) { setIsPanning(false); currentIsPanning = false; }
      if (isRotating) { setIsRotating(false); currentIsRotating = false; }
      if (linkingFrom) {
        setLinkingFrom(null);
        setLinkingTo(null);
        currentLinkingFrom = null;
      }
    }

    // Update pointer position for placement indicator
    if (e.point) {
      if (isStamping && activeTool === 'lobby') {
        placeAtPoint(e.point, true);
      }
    }

    const zoom = (camera as THREE.OrthographicCamera).zoom;

    // Handle Rotation
    if (currentIsRotating && selectedId && e.nativeEvent.buttons !== 0) {
      const shapes = useFlowchartStore.getState().shapes;
      const shape = shapes.find(s => s.id === selectedId);
      if (shape) {
        // Project mouse to z=0 plane for consistent rotation calculation
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

    // Handle Manual Panning (from Radial Menu or Right Click)
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

    // Handle Dragging / Linking (with Reach Pan)
    if (currentIsDragging || currentLinkingFrom) {
      const zoom = (camera as THREE.OrthographicCamera).zoom;
      // Use native movement for precise camera tracking
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

    const isDraggableTool = activeTool !== 'link' && activeTool !== 'vertex';
    if (!selectedId || !isDraggableTool || !currentIsDragging) return;
    
    if (e.point) {
      const targetX = e.point.x - dragOffset[0];
      const targetY = e.point.y - dragOffset[1];
      
      const shape = useFlowchartStore.getState().shapes.find(s => s.id === selectedId);
      if (!shape) return;

      const snappedX = snapX(targetX, shape.size[0]);
      const snappedY = shape.type === 'lobby' ? 0 : snapY(targetY, shape.size[1]);

      updateShape(selectedId, {
        position: [snappedX, snappedY]
      }, true);
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

    if (activeTool === 'lobby' && e.point) {
      setIsStamping(true);
      lastStampedPos.current = null;
      useFlowchartStore.getState().pushToHistory();
      placeAtPoint(e.point, true);
      return;
    }
    
    // CRITICAL: If we clicked on a DOM element (like the radial menu), don't deselect.
    // R3F events bubble from the canvas. If the target is not the canvas, it's a DOM overlay.
    if (e.nativeEvent.target.tagName !== 'CANVAS') return;

    if (mode === 'viewer' || activeTool !== 'select') return;
    if (selectedId) setSelectedId(null);
  };

  const handlePointerUp = (e: any) => {
    setIsPanning(false);
    setIsRotating(false);
    setIsStamping(false);
    lastStampedPos.current = null;

    let wasStaticClick = false;
    // Check if we actually moved enough to count as a pan/drag
    if (pointerDownPos.current) {
      const dx = e.clientX - pointerDownPos.current[0];
      const dy = e.clientY - pointerDownPos.current[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 3) {
        // We moved, so this was likely a pan or drag
      } else {
        // Very small movement, treat as a static click
        wasStaticClick = true;
        wasPanningRef.current = false;
        wasDraggingRef.current = false;
        wasLinkingRef.current = false;
      }
    }

    if (e.button === 2 && wasStaticClick) {
      setActiveTool('select');
    }

    if (linkingFrom) {
      wasLinkingRef.current = true;
      // Raycast to find port under cursor
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      const portIntersect = intersects.find(i => i.object.name === 'port');
      
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
      <color attach="background" args={[bgColor]} />
      <ambientLight intensity={isDark ? 0.4 : 0.6} />
      <directionalLight 
        position={[-50, 100, 50]} 
        intensity={isDark ? 2.0 : 1.5} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
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
          LEFT: -1 as any, // Disable left-click panning to ensure left-click is exclusively for placing/building
          MIDDLE: THREE.MOUSE.ROTATE,
          RIGHT: THREE.MOUSE.PAN
        }}
        onStart={() => { wasPanningRef.current = false; }}
        onChange={() => { wasPanningRef.current = true; }}
        onEnd={() => {
          // Keep it true for a moment to let handleClick consume it
          setTimeout(() => {
            if (wasPanningRef.current) wasPanningRef.current = false;
          }, 200);
        }}
      />

      <group onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} rotation={[0, 0, 0]}>
        <FlowchartLinks />
        <FlowchartNodes />
        <PlacementIndicator />
        
        {/* Semi-transparent greenish glass ground */}
        <mesh position={[0, -20.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[10000, 10000]} />
          <meshPhysicalMaterial 
            color="#22c55e"
            transparent
            opacity={0.4}
            roughness={0.1}
            metalness={0.2}
            transmission={0.8}
            thickness={2}
            ior={1.5}
          />
        </mesh>

        {/* Ground Floor Grid - Aligned to base of start box (y = -20) */}
        <Grid
          position={[0, -20, 0]}
          infiniteGrid
          fadeDistance={500}
          fadeStrength={5}
          cellSize={10}
          sectionSize={40}
          sectionColor={gridColor}
          sectionThickness={2}
          cellColor={cellColor}
          cellThickness={1}
          rotation={[0, 0, 0]}
        />
      </group>

      {/* World-space Simulation Grid - Background */}
      <Grid
        infiniteGrid
        fadeDistance={1000}
        fadeStrength={5}
        cellSize={10}
        sectionSize={40}
        sectionColor={gridColor}
        sectionThickness={1.5}
        cellColor={cellColor}
        cellThickness={1.0}
        rotation={[Math.PI / 2, 0, 0]}
        position={[20, 20, -30]}
      />

      {/* Atmospheric Bounding Sphere - Follows camera for depth and leading aesthetic */}
      <mesh ref={sphereRef} position={[0, 0, -500]}>
        <sphereGeometry args={[800, 64, 64]} />
        <meshBasicMaterial 
          color={isDark ? "#0a0a0a" : "#fff"} 
          side={THREE.BackSide}
          transparent
          opacity={isDark ? 0.5 : 0.2}
        />
      </mesh>

      <EffectComposer multisampling={8}>
        <Bloom 
          luminanceThreshold={isDark ? 1.0 : 1.5} 
          luminanceSmoothing={0.5} 
          intensity={isDark ? 0.5 : 0.2} 
        />
        <Vignette eskil={false} offset={0.1} darkness={isDark ? 0.8 : 0.2} />
      </EffectComposer>

      {/* Interaction Shield - Captures all events during drag/link/rotate to prevent occlusion and fighting */}
      {(isDragging || linkingFrom || isRotating || isPanning || isStamping) && (
        <mesh 
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          position={[camera.position.x, camera.position.y, 50]}
        >
          <planeGeometry args={[10000, 10000]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}

      {/* Background for clicks/panning initiation */}
      <mesh 
        onClick={handleClick} 
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        position={[0, 0, -1]}
      >
        <planeGeometry args={[10000, 10000]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Placement Layer - Captures clicks even when clicking on existing rooms */}
      {isRoomTool && (
        <mesh 
          onClick={handleClick}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          position={[0, 0, 25]}
        >
          <planeGeometry args={[10000, 10000]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </>
  );
};

export const FlowchartCanvas = () => {
  const { setActiveTool } = useFlowchartStore();

  const handleContextMenu = (e: any) => {
    e.preventDefault();
    // Removed setActiveTool('select') to prevent tool deselection on right-click pan
  };

  return (
    <div className="w-full h-full" onContextMenu={handleContextMenu}>
      <Canvas 
        orthographic 
        camera={{ zoom: 7.5, position: [0, 0, 100], far: 2000, near: -2000 }}
        gl={{ antialias: true }}
      >
        <FlowchartCanvasInner />
      </Canvas>
    </div>
  );
};
