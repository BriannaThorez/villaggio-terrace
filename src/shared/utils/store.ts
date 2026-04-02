import { create } from "zustand";

/**
 * Simulation building blocks.
 */
export type SimulationNodeType =
  | "box"
  | "diamond"
  | "circle"
  | "parallelogram"
  | "cylinder"
  | "document"
  | "hexagon"
  | "trapezoid"
  | "terminal"
  | "predefined_process"
  | "internal_storage"
  | "manual_input"
  | "display"
  | "or"
  | "summing_junction"
  | "off_page_connector"
  | "custom"
  | "text"
  | "residential"
  | "commercial"
  | "office"
  | "utility"
  | "lobby"
  | "elevator";

// The visual grid unit is 4 StructuralCells wide by 1 StructuralCell high.
// Since a StructuralCell is 1w x 4h (in StructuralAtoms), the visual grid unit is 4w x 4h in StructuralAtoms.
export const GRID_SIZE = 10;
export const GRID_SIZE_X = 10;
export const GRID_SIZE_Y = 40;

export const snapX = (x: number, width: number) => {
  const cells = Math.round(width / 10);
  if (cells % 2 !== 0) {
    return Math.floor(x / 10) * 10 + 5;
  }
  return Math.round(x / 10) * 10;
};

export const snapY = (y: number, height: number) => {
  return Math.round(y / 40) * 40;
};

export type PortType = "top" | "bottom" | "left" | "right";

export interface Link {
  id: string;
  from: string; // Shape ID
  to: string; // Shape ID
  fromPort?: PortType;
  toPort?: PortType;
}

export interface SimulationNode {
  id: string;
  type: SimulationNodeType;
  position: [number, number];
  size: [number, number];
  vertices: [number, number][]; // Relative to position
  text?: string;
  color?: string; // Legacy/Override
  themeColors?: Record<string, string>; // themeName -> hexColor
  material?: "plastic" | "glass";
  rotation?: number; // in radians
}

export interface Resources {
  power: number;
  water: number;
  internet: number;
}

export interface SimulationState {
  shapes: SimulationNode[];
  links: Link[];
  resources: Resources;
  towerGrid: Map<string, string>; // "x,y" -> shapeId
  activeTool:
    | SimulationNodeType
    | "link"
    | "select"
    | "vertex"
    | "residential"
    | "commercial"
    | "office"
    | "utility"
    | "lobby"
    | "elevator";
  mode: "studio" | "viewer";
  selectedId: string | null;
  editingId: string | null;
  isDragging: boolean;
  isRotating: boolean;
  isPanning: boolean;
  dragOffset: [number, number];

  // Drag-to-link state
  linkingFrom: { id: string; port: PortType } | null;
  linkingTo: [number, number] | null;

  addShape: (
    shape: SimulationNode,
    force?: boolean,
    skipHistory?: boolean,
  ) => void;
  updateShape: (
    id: string,
    updates: Partial<SimulationNode>,
    skipHistory?: boolean,
  ) => void;
  deleteShape: (id: string) => void;
  addLink: (
    from: string,
    to: string,
    fromPort?: PortType,
    toPort?: PortType,
  ) => void;
  placeModule: (x: number, y: number, moduleId: string) => void;
  removeModule: (x: number, y: number) => void;
  setActiveTool: (tool: SimulationState["activeTool"]) => void;
  setMode: (mode: SimulationState["mode"]) => void;
  setSelectedId: (id: string | null) => void;
  setEditingId: (id: string | null) => void;
  setIsDragging: (isDragging: boolean) => void;
  setIsRotating: (isRotating: boolean) => void;
  setIsPanning: (isPanning: boolean) => void;
  setDragOffset: (offset: [number, number]) => void;
  setLinkingFrom: (linking: { id: string; port: PortType } | null) => void;
  setLinkingTo: (pos: [number, number] | null) => void;
  resolveAllOverlaps: () => void;
  undo: () => void;
  redo: () => void;
  pushToHistory: () => void;
  resetCamera: () => void;
  shouldResetCamera: boolean;
  setShouldResetCamera: (val: boolean) => void;

  // Camera tracking for minimap
  cameraState: {
    position: [number, number, number];
    zoom: number;
    worldWidth: number;
    worldHeight: number;
  };
  setCameraState: (
    pos: [number, number, number],
    zoom: number,
    worldWidth: number,
    worldHeight: number,
  ) => void;

  // Camera rotation for readout
  cameraRotation: {
    azimuth: number;
    polar: number;
  };
  setCameraRotation: (azimuth: number, polar: number) => void;

  // Camera movement request from minimap
  cameraMoveRequest: [number, number] | null;
  requestCameraMove: (pos: [number, number] | null) => void;

  // Pointer tracking for placement indicator
  pointerPosition: [number, number] | null;
  setPointerPosition: (pos: [number, number] | null) => void;

  // Theme state
  themeName: string;
  setThemeName: (name: string) => void;

  // Tooltip deconfliction
  activeTooltipId: string | null;
  setActiveTooltipId: (id: string | null) => void;
}

const getAABB = (shape: SimulationNode) => {
  const rotation = shape.rotation || 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  for (const [vx, vy] of shape.vertices) {
    const rx = vx * cos - vy * sin;
    const ry = vx * sin + vy * cos;
    minX = Math.min(minX, rx);
    maxX = Math.max(maxX, rx);
    minY = Math.min(minY, ry);
    maxY = Math.max(maxY, ry);
  }

  return {
    w: maxX - minX,
    h: maxY - minY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  };
};

const checkOverlap = (s1: SimulationNode, s2: SimulationNode) => {
  const aabb1 = getAABB(s1);
  const aabb2 = getAABB(s2);

  const cx1 = s1.position[0] + aabb1.cx;
  const cy1 = s1.position[1] + aabb1.cy;
  const cx2 = s2.position[0] + aabb2.cx;
  const cy2 = s2.position[1] + aabb2.cy;

  return (
    Math.abs(cx1 - cx2) < (aabb1.w + aabb2.w) / 2 - 0.1 &&
    Math.abs(cy1 - cy2) < (aabb1.h + aabb2.h) / 2 - 0.1
  );
};

const findBestPosition = (
  shape: SimulationNode,
  allShapes: SimulationNode[],
): [number, number] => {
  const [startX, startY] = shape.position;
  const others = allShapes.filter((s) => s.id !== shape.id);

  if (
    !others.some((s) =>
      checkOverlap({ ...shape, position: [startX, startY] }, s),
    )
  ) {
    return [startX, startY];
  }

  const stepX = 10;
  const stepY = 40;
  const maxIterations = 200;

  for (let i = 1; i < maxIterations; i++) {
    for (let dx = -i; dx <= i; dx++) {
      for (let dy = -i; dy <= i; dy++) {
        if (Math.abs(dx) !== i && Math.abs(dy) !== i) continue;

        const nx = startX + dx * stepX;
        const ny = startY + dy * stepY;
        const testShape = { ...shape, position: [nx, ny] as [number, number] };

        if (!others.some((s) => checkOverlap(testShape, s))) {
          return [nx, ny];
        }
      }
    }
  }

  return [startX, startY];
};

interface HistoryState {
  shapes: SimulationNode[];
  links: Link[];
}

export const useSimulationStore = create<SimulationState>((set, get) => {
  const history: HistoryState[] = [];
  const redoStack: HistoryState[] = [];

  const pushToHistory = () => {
    const { shapes, links } = get();
    history.push(JSON.parse(JSON.stringify({ shapes, links })));
    if (history.length > 50) history.shift();
    redoStack.length = 0; // Clear redo stack on new action
  };

  return {
    shapes: [
      {
        id: "default-node",
        type: "residential",
        position: [0, 0],
        size: [40, 40],
        vertices: [
          [-20, -20],
          [20, -20],
          [20, 20],
          [-20, 20],
        ],
        text: "Start",
      },
    ],
    links: [],
    resources: { power: 50, water: 50, internet: 50 },
    towerGrid: new Map(),
    activeTool: "select",
    mode: "studio",
    selectedId: null,
    editingId: null,
    isDragging: false,
    isRotating: false,
    isPanning: false,
    dragOffset: [0, 0],
    linkingFrom: null,
    linkingTo: null,
    shouldResetCamera: false,

    addShape: (shape, force = false, skipHistory = false) => {
      if (!skipHistory) {
        pushToHistory();
      }
      set((state) => {
        const safePos = force
          ? shape.position
          : findBestPosition(shape, state.shapes);
        const nextShape = { ...shape, position: safePos };
        return { shapes: [...state.shapes, nextShape] };
      });
    },
    updateShape: (id, updates, skipHistory = false) => {
      if (!skipHistory) {
        pushToHistory();
      }
      set((state) => {
        return {
          shapes: state.shapes.map((s) => {
            if (s.id === id) {
              const newShape = { ...s, ...updates };
              if (
                updates.size &&
                (!s.size ||
                  updates.size[0] !== s.size[0] ||
                  updates.size[1] !== s.size[1])
              ) {
                const [w, h] = updates.size;
                newShape.vertices = [
                  [-w / 2, -h / 2],
                  [w / 2, -h / 2],
                  [w / 2, h / 2],
                  [-w / 2, h / 2],
                ];
              }
              return newShape;
            }
            return s;
          }),
        };
      });
    },
    deleteShape: (id) => {
      pushToHistory();
      set((state) => {
        const nextShapes = state.shapes.filter((s) => s.id !== id);
        const nextLinks = state.links.filter(
          (l) => l.from !== id && l.to !== id,
        );
        return {
          shapes: nextShapes,
          links: nextLinks,
          selectedId: state.selectedId === id ? null : state.selectedId,
          editingId: state.editingId === id ? null : state.editingId,
        };
      });
    },
    addLink: (from, to, fromPort, toPort) => {
      pushToHistory();
      set((state) => {
        const exists = state.links.some(
          (l) =>
            l.from === from &&
            l.to === to &&
            l.fromPort === fromPort &&
            l.toPort === toPort,
        );
        if (exists) return state;
        const nextLink = {
          id: Math.random().toString(36),
          from,
          to,
          fromPort,
          toPort,
        };
        return {
          links: [...state.links, nextLink],
        };
      });
    },
    placeModule: (x, y, moduleId) => {
      pushToHistory();
      set((state) => {
        const newTowerGrid = new Map(state.towerGrid);
        newTowerGrid.set(`${x},${y}`, moduleId);
        return { towerGrid: newTowerGrid };
      });
    },
    removeModule: (x, y) => {
      pushToHistory();
      set((state) => {
        const newTowerGrid = new Map(state.towerGrid);
        newTowerGrid.delete(`${x},${y}`);
        return { towerGrid: newTowerGrid };
      });
    },
    setActiveTool: (tool) => set({ activeTool: tool }),
    setMode: (mode) => set({ mode }),
    setSelectedId: (id) => {
      set({ selectedId: id });
    },
    setEditingId: (id) => {
      set({ editingId: id });
    },
    setIsDragging: (isDragging) => {
      const state = get();
      if (!isDragging && state.isDragging && state.selectedId) {
        const shape = state.shapes.find((s) => s.id === state.selectedId);
        if (shape) {
          const safePos = findBestPosition(shape, state.shapes);
          state.updateShape(shape.id, { position: safePos });
        }
      }
      set({ isDragging });
    },
    setIsRotating: (isRotating) => {
      const state = get();
      if (!isRotating && state.isRotating && state.selectedId) {
        const shape = state.shapes.find((s) => s.id === state.selectedId);
        if (shape) {
          const safePos = findBestPosition(shape, state.shapes);
          state.updateShape(shape.id, { position: safePos });
        }
      }
      set({ isRotating });
    },
    setIsPanning: (isPanning) => set({ isPanning }),
    setDragOffset: (dragOffset) => set({ dragOffset }),
    setLinkingFrom: (linkingFrom) => set({ linkingFrom }),
    setLinkingTo: (linkingTo) => set({ linkingTo }),
    resolveAllOverlaps: () => {
      const state = get();
      let newShapes = [...state.shapes];
      let changed = false;

      for (let i = 0; i < newShapes.length; i++) {
        const shape = newShapes[i];
        const safePos = findBestPosition(shape, newShapes);
        if (
          safePos[0] !== shape.position[0] ||
          safePos[1] !== shape.position[1]
        ) {
          newShapes[i] = { ...shape, position: safePos };
          changed = true;
        }
      }

      if (changed) {
        pushToHistory();
        set({ shapes: newShapes });
      }
    },
    undo: () => {
      if (history.length > 0) {
        const { shapes, links } = get();
        redoStack.push(JSON.parse(JSON.stringify({ shapes, links })));
        const previous = history.pop()!;
        set({ shapes: previous.shapes, links: previous.links });
      }
    },
    redo: () => {
      if (redoStack.length > 0) {
        const { shapes, links } = get();
        history.push(JSON.parse(JSON.stringify({ shapes, links })));
        const next = redoStack.pop()!;
        set({ shapes: next.shapes, links: next.links });
      }
    },
    pushToHistory: () => pushToHistory(),
    resetCamera: () => set({ shouldResetCamera: true }),
    setShouldResetCamera: (val) => set({ shouldResetCamera: val }),

    cameraState: {
      position: [0, 0, 100],
      zoom: 7.5,
      worldWidth: 20,
      worldHeight: 20,
    },
    setCameraState: (position, zoom, worldWidth, worldHeight) =>
      set({
        cameraState: { position, zoom, worldWidth, worldHeight },
      }),

    cameraRotation: {
      azimuth: 0,
      polar: 0,
    },
    setCameraRotation: (azimuth, polar) =>
      set({
        cameraRotation: { azimuth, polar },
      }),

    cameraMoveRequest: null,
    requestCameraMove: (cameraMoveRequest) => set({ cameraMoveRequest }),

    pointerPosition: null,
    setPointerPosition: (pointerPosition) => set({ pointerPosition }),

    // Theme state
    themeName: "cozy_cabin",
    setThemeName: (themeName) => set({ themeName }),

    // Tooltip deconfliction
    activeTooltipId: null,
    setActiveTooltipId: (activeTooltipId) => set({ activeTooltipId }),
  };
});
