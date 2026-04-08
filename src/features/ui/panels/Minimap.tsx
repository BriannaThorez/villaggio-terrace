import React, { useMemo, useRef, useState, useEffect } from "react";
import { useSimulationStore } from "../../../shared/utils/store";
import { SmartTooltip } from "../../../shared/components/SmartTooltip";
import { Map } from "lucide-react";
import { motion } from "framer-motion";

export const Minimap: React.FC = () => {
  const shapes = useSimulationStore((state) => state.shapes);
  const links = useSimulationStore((state) => state.links);
  const cameraState = useSimulationStore((state) => state.cameraState);
  const requestCameraMove = useSimulationStore((state) => state.requestCameraMove);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [isDraggingViewport, setIsDraggingViewport] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [localZoom, setLocalZoom] = useState(0.45);
  const [localCenter, setLocalCenter] = useState<[number, number]>([0, 0]);
  const lastMousePos = useRef<[number, number]>([0, 0]);

  const uiPositions = useSimulationStore((state) => state.uiPositions);
  const setUIPosition = useSimulationStore((state) => state.setUIPosition);

  // High-performance viewport clamping for the initial render
  const pos = useMemo(() => {
    const raw = uiPositions["minimap"] || { x: 0, y: 0 };
    // If the position is extreme (likely corrupted or off-screen), reset to safe default
    if (raw.x < -window.innerWidth * 0.5) return { x: 16, y: 0 };
    return raw;
  }, [uiPositions]);

  const handleDragEnd = (_: any, info: any) => {
    setUIPosition("minimap", {
      x: pos.x + info.offset.x,
      y: pos.y + info.offset.y,
    });
  };

  // Center on shapes initially if no center exists
  useEffect(() => {
    if (shapes.length > 0 && localCenter[0] === 0 && localCenter[1] === 0) {
      const avg = shapes.reduce((acc, s) => [acc[0] + s.position[0], acc[1] + s.position[1]], [0, 0]);
      setLocalCenter([avg[0] / shapes.length, avg[1] / shapes.length]);
    }
  }, [shapes.length]);

  // High-performance Canvas rendering for shapes and links
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const viewSize = width / localZoom;
    const minX = localCenter[0] - viewSize / 2;
    const minY = -localCenter[1] - viewSize / 2;

    const transformX = (worldX: number) => ((worldX - minX) / viewSize) * width;
    const transformY = (worldY: number) => ((-worldY - minY) / viewSize) * height;

    // Draw Grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.setLineDash([]);
    const gridSize = 100;
    const startX = Math.floor(minX / gridSize) * gridSize;
    const startY = Math.floor(minY / gridSize) * gridSize;

    for (let x = startX; x < minX + viewSize; x += gridSize) {
      const px = transformX(x);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
    }
    for (let y = startY; y < minY + viewSize; y += gridSize) {
      const py = ((y - minY) / viewSize) * height;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(width, py);
      ctx.stroke();
    }

    // Draw Links
    ctx.strokeStyle = "rgba(100, 180, 255, 0.2)";
    ctx.lineWidth = 1;
    links.forEach(link => {
      const from = shapes.find(s => s.id === link.from);
      const to = shapes.find(s => s.id === link.to);
      if (from && to) {
        ctx.beginPath();
        ctx.moveTo(transformX(from.position[0]), transformY(from.position[1]));
        ctx.lineTo(transformX(to.position[0]), transformY(to.position[1]));
        ctx.stroke();
      }
    });

    // Draw Shapes
    ctx.fillStyle = "rgba(100, 180, 255, 0.5)";
    shapes.forEach(shape => {
      const x = transformX(shape.position[0] - shape.size[0] / 2);
      const y = transformY(shape.position[1] + shape.size[1] / 2);
      const w = (shape.size[0] / viewSize) * width;
      const h = (shape.size[1] / viewSize) * height;
      ctx.fillRect(x, y, w, h);
    });
  }, [shapes, links, localZoom, localCenter]);

  // SVG Layer for Interactive Viewport and Bounds
  const viewport = useMemo(() => {
    const { position, worldWidth, worldHeight } = cameraState;
    return {
      x: position[0] - worldWidth / 2,
      y: position[1] - worldHeight / 2,
      w: worldWidth,
      h: worldHeight
    };
  }, [cameraState]);

  const viewSize = 200 / localZoom;
  const viewBoxMinX = localCenter[0] - viewSize / 2;
  const viewBoxMinY = -localCenter[1] - viewSize / 2;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * viewSize + viewBoxMinX;
    const y = ((e.clientY - rect.top) / rect.height) * viewSize + viewBoxMinY;

    if (e.button === 0) {
      setIsDraggingViewport(true);
      requestCameraMove([x, -y]);
    } else {
      setIsPanning(true);
      lastMousePos.current = [e.clientX, e.clientY];
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = (e.clientX - lastMousePos.current[0]) * (viewSize / 200);
      const dy = (e.clientY - lastMousePos.current[1]) * (viewSize / 200);
      setLocalCenter(prev => [prev[0] - dx, prev[1] + dy]);
      lastMousePos.current = [e.clientX, e.clientY];
    } else if (isDraggingViewport) {
      const rect = svgRef.current!.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * viewSize + viewBoxMinX;
      const y = ((e.clientY - rect.top) / rect.height) * viewSize + viewBoxMinY;
      requestCameraMove([x, -y]);
    }
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      animate={{ x: pos.x, y: pos.y }}
      className="absolute bottom-20 right-4 z-[90] w-52 h-52 bg-background/90 backdrop-blur-md border border-text/10 rounded-2xl overflow-hidden shadow-2xl pointer-events-auto cursor-grab active:cursor-grabbing group"
      onWheel={e => setLocalZoom(z => Math.max(0.1, Math.min(2, z - e.deltaY * 0.001)))}
      onContextMenu={e => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
      />

      <svg
        ref={svgRef}
        viewBox={`${viewBoxMinX} ${viewBoxMinY} ${viewSize} ${viewSize}`}
        className="absolute inset-0 w-full h-full cursor-crosshair active:cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={() => { setIsDraggingViewport(false); setIsPanning(false); }}
        onMouseLeave={() => { setIsDraggingViewport(false); setIsPanning(false); }}
      >
        <rect
          x={viewport.x}
          y={-viewport.y - viewport.h}
          width={viewport.w}
          height={viewport.h}
          fill="var(--accent)"
          fillOpacity="0.1"
          stroke="var(--accent)"
          strokeWidth={2 / localZoom}
          className="pointer-events-none"
        />
      </svg>

      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
        <Map size={14} className="text-primary" />
        <span className="text-[10px] font-bold tracking-widest uppercase opacity-40">Tactical Overlay</span>
      </div>

      <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/5 pointer-events-none">
        <span className="text-[9px] font-mono opacity-80">Z:{localZoom.toFixed(2)}</span>
      </div>

      <div className="absolute bottom-3 right-3">
        <SmartTooltip content="Recenter View" position="left">
          <button
            onClick={() => setLocalCenter([cameraState.position[0], cameraState.position[1]])}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-primary/20 transition-colors pointer-events-auto"
          >
            <div className="w-2 h-2 rounded-full bg-primary" />
          </button>
        </SmartTooltip>
      </div>
    </motion.div>
  );
};
