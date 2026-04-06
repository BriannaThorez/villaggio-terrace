import { create } from "zustand";
import { SpatialHash } from "./SpatialHash";
import { getWorkerPool } from "../../worker/client";
import { SIMULATION_TASK_TYPE } from "../worker/protocol";

const globalHash = new SpatialHash(100);
globalHash.insert("default-node", 0, 0, 40, 40);

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

const FLOOR_Y_EPSILON = 1e-3;

export const snapX = (x: number, width: number) => {
  const cells = Math.round(width / 10);
  if (cells % 2 !== 0) {
    return Math.floor(x / 10) * 10 + 5;
  }
  return Math.round(x / 10) * 10;
};

export const getFloorIndex = (y: number) =>
  Math.max(
    0,
    Math.ceil((y - FLOOR_Y_EPSILON) / GRID_SIZE_Y) - 1,
  );

export const getFloorBaseY = (y: number) => getFloorIndex(y) * GRID_SIZE_Y;

export const getPlacementCenterY = (y: number, _height: number) =>
  getFloorBaseY(y);

export const snapY = (y: number, _height?: number) => {
  return getFloorBaseY(y);
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
  name?: string;
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
  preDragPosition: [number, number] | null;

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
  setPreDragPosition: (pos: [number, number] | null) => void;
  checkPlacement: (x: number, y: number, w: number, h: number, ignoreId?: string) => boolean;
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

  // UI Positions
  uiPositions: Record<string, { x: number; y: number }>;
  setUIPosition: (id: string, pos: { x: number; y: number }) => void;

  // HUD Visibility
  showControls: boolean;
  setShowControls: (val: boolean) => void;
}

export const getGridKey = (x: number, y: number) => `${x},${y}`;

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



interface HistoryState {
  shapes: SimulationNode[];
  links: Link[];
}

export const useSimulationStore = create<SimulationState>((set, get) => {
  const history: HistoryState[] = [];
  const redoStack: HistoryState[] = [];

  const savedUIPositions = JSON.parse(localStorage.getItem("villaggio_ui_positions") || "{}");

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
        name: "Gateway Suite",
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
    preDragPosition: null,
    linkingFrom: null,
    linkingTo: null,
    shouldResetCamera: false,
    uiPositions: savedUIPositions,
    showControls: localStorage.getItem("villaggio_show_controls") === "true",

    checkPlacement: (x, y, w, h, ignoreId) => {
      const state = get();
      const cx1 = x;
      const cy1 = y;

      const candidates = globalHash.query(x, y, w, h);

      for (const s2Id of candidates) {
        if (s2Id === ignoreId) continue;
        const s2 = state.shapes.find(s => s.id === s2Id);
        if (!s2) continue;

        const aabb2 = getAABB(s2);
        const cx2 = s2.position[0] + aabb2.cx;
        const cy2 = s2.position[1] + aabb2.cy;

        if (
          Math.abs(cx1 - cx2) < (w + aabb2.w) / 2 - 0.1 &&
          Math.abs(cy1 - cy2) < (h + aabb2.h) / 2 - 0.1
        ) {
          return false; // Collision detected
        }
      }
      return true; // Valid placement
    },
    checkPlacementAuthoritative: async (x: number, y: number, w: number, h: number, ignoreId?: string) => {
      const workerPool = getWorkerPool();
      const result = await workerPool.submit<CheckPlacementPayload, CheckPlacementResult>({
        taskType: SIMULATION_TASK_TYPE.CheckPlacement,
        payload: { x, y, w, h, ignoreId },
        sceneRevision: 0,
        clientRevision: 0,
      });
      return result.isValid;
    },

    addShape: (shape, force = false, skipHistory = false) => {
      const state = get();

      // Prevent exact placement duplicate or box intersection
      if (!force && !state.checkPlacement(shape.position[0], shape.position[1], shape.size[0], shape.size[1], shape.id)) {
        return; // Placements must be strictly non-overlapping
      }

      if (!skipHistory) {
        pushToHistory();
      }

      const workerPool = getWorkerPool();
      workerPool.submit({
        taskType: SIMULATION_TASK_TYPE.SyncSpatialHash,
        payload: {
          inserts: [{
            id: shape.id,
            x: shape.position[0],
            y: shape.position[1],
            w: shape.size[0],
            h: shape.size[1]
          }]
        },
        sceneRevision: 0, // In a real app, track this
        clientRevision: 0,
      });

      set((state) => ({
        shapes: [...state.shapes, {
          ...shape,
          name: shape.name || (shape.type.charAt(0).toUpperCase() + shape.type.slice(1))
        }]
      }));
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
              globalHash.remove(id, s.position[0], s.position[1], s.size[0], s.size[1]);
              globalHash.insert(id, newShape.position[0], newShape.position[1], newShape.size[0] || s.size[0], newShape.size[1] || s.size[1]);

              const workerPool = getWorkerPool();
              workerPool.submit({
                taskType: SIMULATION_TASK_TYPE.SyncSpatialHash,
                payload: {
                  removes: [{
                    id,
                    x: s.position[0],
                    y: s.position[1],
                    w: s.size[0],
                    h: s.size[1]
                  }],
                  inserts: [{
                    id,
                    x: newShape.position[0],
                    y: newShape.position[1],
                    w: newShape.size[0] || s.size[0],
                    h: newShape.size[1] || s.size[1]
                  }]
                },
                sceneRevision: 0,
                clientRevision: 0,
              });

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
        const shape = state.shapes.find(s => s.id === id);
        if (shape) {
          globalHash.remove(id, shape.position[0], shape.position[1], shape.size[0], shape.size[1]);

          const workerPool = getWorkerPool();
          workerPool.submit({
            taskType: SIMULATION_TASK_TYPE.SyncSpatialHash,
            payload: {
              removes: [{
                id,
                x: shape.position[0],
                y: shape.position[1],
                w: shape.size[0],
                h: shape.size[1]
              }]
            },
            sceneRevision: 0,
            clientRevision: 0,
          });
        }
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
      if (isDragging) {
        const shape = state.selectedId ? state.shapes.find(s => s.id === state.selectedId) : null;
        set({ isDragging, preDragPosition: shape ? [...shape.position] : null });
      } else {
        if (state.isDragging && state.selectedId) {
          const shape = state.shapes.find((s) => s.id === state.selectedId);
          if (shape) {
            if (!state.checkPlacement(shape.position[0], shape.position[1], shape.size[0], shape.size[1], shape.id)) {
              if (state.preDragPosition) {
                state.updateShape(shape.id, { position: state.preDragPosition }, true);
              }
            }
          }
        }
        set({ isDragging, preDragPosition: null });
      }
    },
    setIsRotating: (isRotating) => {
      const state = get();
      if (!isRotating && state.isRotating && state.selectedId) {
        const shape = state.shapes.find((s) => s.id === state.selectedId);
        if (shape) {
          if (!state.checkPlacement(shape.position[0], shape.position[1], shape.size[0], shape.size[1], shape.id)) {
            // Let it revert or stay invalid, typically rotation shouldn't collide inside a bounding box
          }
        }
      }
      set({ isRotating });
    },
    setIsPanning: (isPanning) => set({ isPanning }),
    setDragOffset: (dragOffset) => set({ dragOffset }),
    setLinkingFrom: (linkingFrom) => set({ linkingFrom }),
    setLinkingTo: (linkingTo) => set({ linkingTo }),
    resolveAllOverlaps: () => {
      // Legacy layout resolution disabled in strict mode
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
      position: [-100, 80, 120],
      zoom: 3.5,
      worldWidth: 20,
      worldHeight: 20,
    },
    setCameraState: (position, zoom, worldWidth, worldHeight) =>
      set({
        cameraState: { position, zoom, worldWidth, worldHeight },
      }),

    cameraRotation: {
      azimuth: (-30 * Math.PI) / 180,
      polar: (70 * Math.PI) / 180, // Pitch 20 from horizon = 70 from zenith
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
    setActiveTooltipId: (id) => set({ activeTooltipId: id }),
    uiPositions: (() => {
      try {
        return JSON.parse(localStorage.getItem("villaggio_ui_positions") || "{}");
      } catch {
        return {};
      }
    })(),
    setUIPosition: (id, pos) => {
      set((state) => {
        const next = { ...state.uiPositions, [id]: pos };
        localStorage.setItem("villaggio_ui_positions", JSON.stringify(next));
        return { uiPositions: next };
      });
    },

    // HUD Visibility
    setShowControls: (val) => {
      localStorage.setItem("villaggio_show_controls", String(val));
      set({ showControls: val });
    },
  };
});
