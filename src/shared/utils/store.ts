import { create } from "zustand";
import { SpatialHash } from "./SpatialHash";
import { getWorkerPool } from "../../worker/client";
import {
  SIMULATION_TASK_TYPE,
  type CheckPlacementPayload,
  type CheckPlacementResult,
} from "../worker/protocol";
import { validatePlacement } from "../../features/roomPlacement/constraints/placementRules";
import { FloorBucketIndex } from "../../features/roomPlacement/constraints/spatialIndex";
import simulationSettings from "@/src/simulationSettings.json";
import { reconstructVacancy } from "../../features/structuralScaffold/api/emptyRoomsSpawning";
import roomMetadata from "../../entities/rooms/roomMetadata.json";
import { buildHotelCapacityMap } from "../../features/hotel/hotelCapacityEngine";

const globalHash = new SpatialHash(100);

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
  | "elevator"
  | "structure"
  | "hotel"
  | "empty_floor";

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
  Math.max(0, Math.ceil((y - FLOOR_Y_EPSILON) / GRID_SIZE_Y) - 1);

export const getFloorBaseY = (y: number) => getFloorIndex(y) * GRID_SIZE_Y;

export const getPlacementCenterY = (y: number, _height: number) =>
  getFloorBaseY(y);

export const snapY = (y: number, _height?: number) => {
  return getFloorBaseY(y);
};

const overlapsAABB = (a: SimulationNode, b: SimulationNode) => {
  const aLeft = a.position[0] - a.size[0] / 2;
  const aRight = a.position[0] + a.size[0] / 2;
  const aTop = a.position[1] + a.size[1] / 2;
  const aBottom = a.position[1] - a.size[1] / 2;

  const bLeft = b.position[0] - b.size[0] / 2;
  const bRight = b.position[0] + b.size[0] / 2;
  const bTop = b.position[1] + b.size[1] / 2;
  const bBottom = b.position[1] - b.size[1] / 2;

  return (
    Math.abs(a.position[1] - b.position[1]) < 1 &&
    aLeft < bRight - 0.1 &&
    aRight > bLeft + 0.1 &&
    aBottom < bTop - 0.1 &&
    aTop > bBottom + 0.1
  );
};

const purgeOverlappingEmptyFloors = (
  shapes: SimulationNode[],
  room: SimulationNode,
) => {
  return shapes.filter((shape) => {
    if (shape.type !== "empty_floor") return true;
    return !overlapsAABB(shape, room);
  });
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
  metadataId?: string; // Links to roomMetadata.json
  position: [number, number];
  size: [number, number];
  vertices: [number, number][]; // Relative to position
  text?: string;
  name?: string;
  color?: string; // Legacy/Override
  themeColors?: Record<string, string>; // themeName -> hexColor
  material?: "plastic" | "glass";
  rotation?: number; // in radians
  structuralSettings?: {
    openings: any[];
  };
  structuralMetadata?: {
    adjacencies: string[]; // IDs of touching units
    wallMask: number; // Bitmask for left/right/top/bottom wall presence
  };
}

export interface Resources {
  power: number;
  water: number;
  internet: number;
}

export interface AddShapeOptions {
  skipSelection?: boolean;
}

export interface SimulationState {
  shapes: SimulationNode[];
  links: Link[];
  resources: Resources;
  spendableMoney: number;
  towerGrid: Map<string, string>; // "x,y" -> shapeId
  
  // Hotel Capacity & Service Status
  hotelReceptionCapacity: Record<string, number>; // deskId -> remaining units (0-10)
  hotelRoomServiceStatus: Record<string, "SERVICED" | "NO_RECEPTION">; // roomId -> status
  activeTool: string;
  activeModuleId: string | null; // The specific ID from roomMetadata.json
  selectedId: string | null;
  editingId: string | null;
  isRotating: boolean;
  isPanning: boolean;

  // Drag-to-link state
  linkingFrom: { id: string; port: PortType } | null;
  linkingTo: [number, number] | null;

  addShape: (
    shape: SimulationNode,
    force?: boolean,
    skipHistory?: boolean,
    options?: AddShapeOptions,
  ) => void;
  updateShape: (
    id: string,
    updates: Partial<SimulationNode>,
    skipHistory?: boolean,
  ) => void;
  deleteShape: (id: string, isMerge?: boolean) => void;
  addLink: (
    from: string,
    to: string,
    fromPort?: PortType,
    toPort?: PortType,
  ) => void;
  recomputeHotelCapacity: () => void;
  placeModule: (x: number, y: number, moduleId: string) => void;
  removeModule: (x: number, y: number) => void;
  setActiveTool: (tool: SimulationState["activeTool"]) => void;
  setActiveModuleId: (id: string | null) => void;
  lastDeletedNodeType: SimulationNodeType | null;
  setLastDeletedNodeType: (type: SimulationNodeType | null) => void;
  setSelectedId: (id: string | null) => void;
  setEditingId: (id: string | null) => void;
  setIsRotating: (isRotating: boolean) => void;
  setIsPanning: (isPanning: boolean) => void;
  checkPlacement: (
    x: number,
    y: number,
    w: number,
    h: number,
    type: string,
    ignoreId?: string,
    isForce?: boolean,
  ) => boolean;
  checkPlacementAuthoritative: (
    x: number,
    y: number,
    w: number,
    h: number,
    ignoreId?: string,
  ) => Promise<boolean>;
  setLinkingFrom: (linking: { id: string; port: PortType } | null) => void;
  setLinkingTo: (pos: [number, number] | null) => void;
  resolveAllOverlaps: () => void;
  undo: () => void;
  redo: () => void;
  pushToHistory: () => void;
  initializeWorld: () => void;
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

  // UI Positions
  uiPositions: Record<string, { x: number; y: number }>;
  setUIPosition: (id: string, pos: { x: number; y: number }) => void;

  // HUD Visibility
  showControls: boolean;
  setShowControls: (val: boolean) => void;
  showWeather: boolean;
  setShowWeather: (val: boolean) => void;
  showPlacementGrid: boolean;
  setShowPlacementGrid: (val: boolean) => void;
  showMinimap: boolean;
  setShowMinimap: (val: boolean) => void;
  showWeatherPanel: boolean;
  setShowWeatherPanel: (val: boolean) => void;
  setSpendableMoney: (value: number) => void;
  registerStructuralRoom: (
    id: string,
    type: SimulationNodeType,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => void;
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

const computeStructuralMetadata = (
  shapes: SimulationNode[],
): SimulationNode[] => {
  return shapes.map((s) => {
    const adjacencies = shapes
      .filter(
        (other) =>
          other.id !== s.id &&
          Math.abs(other.position[1] - s.position[1]) < 1 &&
          Math.abs(other.position[0] - s.position[0]) <=
            (other.size[0] + s.size[0]) / 2 + 0.1,
      )
      .map((o) => o.id);

    return {
      ...s,
      structuralMetadata: {
        adjacencies,
        wallMask: 0, // Simplified for example
      },
    };
  });
};

interface HistoryState {
  shapes: SimulationNode[];
  links: Link[];
}

export const useSimulationStore = create<SimulationState>((set, get) => {
  const history: HistoryState[] = [];
  const redoStack: HistoryState[] = [];

  const savedUIPositions = JSON.parse(
    localStorage.getItem("villaggio_ui_positions") || "{}",
  );
  const savedSpendableMoney = parseFloat(
    localStorage.getItem("villaggio_spendable_money") ?? "",
  );
  const initialSpendableMoney = Number.isFinite(savedSpendableMoney)
    ? savedSpendableMoney
    : 10000000;

  const pushToHistory = () => {
    const { shapes, links } = get();
    history.push(JSON.parse(JSON.stringify({ shapes, links })));
    if (history.length > 50) history.shift();
    redoStack.length = 0; // Clear redo stack on new action
  };

  return {
    shapes: [],
    links: [],
    resources: { power: 50, water: 50, internet: 50 },
    spendableMoney: initialSpendableMoney,
    towerGrid: new Map(),
    hotelReceptionCapacity: {},
    hotelRoomServiceStatus: {},
    activeTool: "select",
    activeModuleId: null,
    lastDeletedNodeType: null,
    selectedId: null,
    editingId: null,
    isRotating: false,
    isPanning: false,
    linkingFrom: null,
    linkingTo: null,
    shouldResetCamera: false,
    uiPositions: savedUIPositions,
    showControls: localStorage.getItem("villaggio_show_controls") === "true",
    showWeather: localStorage.getItem("villaggio_show_weather") === "true", // Default to false
    showPlacementGrid:
      localStorage.getItem("villaggio_show_placement_grid") === "true",
    showMinimap: localStorage.getItem("villaggio_show_minimap") !== "false", // Default to true
    showWeatherPanel:
      localStorage.getItem("villaggio_show_weather_panel") === "true",
    registerStructuralRoom: (id, type, x, y, w, h) => {
      // Industry Leading Structural Registration
      // This builds the adjacency graph for room merging
      set((state) => {
        const shape = state.shapes.find((s) => s.id === id);
        if (!shape) return state;

        // Force a state update to trigger computeStructuralMetadata
        return {
          shapes: computeStructuralMetadata([...state.shapes]),
        };
      });
    },

    recomputeHotelCapacity: () => {
      set((state) => {
        const map = buildHotelCapacityMap(state.shapes);
        const hotelReceptionCapacity: Record<string, number> = {};
        Object.entries(map.desks).forEach(([id, data]) => {
          hotelReceptionCapacity[id] = data.totalCapacity - data.usedCapacity;
        });

        const hotelRoomServiceStatus: Record<string, "SERVICED" | "NO_RECEPTION"> = {};
        Object.entries(map.rooms).forEach(([id, data]) => {
          hotelRoomServiceStatus[id] = data.status;
        });

        return {
          hotelReceptionCapacity,
          hotelRoomServiceStatus,
        };
      });
    },

    checkPlacement: (
      x: number,
      y: number,
      w: number,
      h: number,
      type: string,
      ignoreId?: string,
      isForce = false,
    ) => {
      const shapes = get().shapes;
      const index = new FloorBucketIndex(shapes);
      const result = validatePlacement(
        x,
        y,
        w,
        h,
        shapes,
        type,
        ignoreId,
        isForce,
        index,
      );
      return result.isValid;
    },
    checkPlacementAuthoritative: async (
      x: number,
      y: number,
      w: number,
      h: number,
      type: string,
      ignoreId?: string,
    ) => {
      const workerPool = getWorkerPool();
      const handle = workerPool.submit<
        CheckPlacementPayload,
        CheckPlacementResult
      >({
        taskType: SIMULATION_TASK_TYPE.CheckPlacement,
        payload: { x, y, w, h, type, ignoreId },
        sceneRevision: 0,
        clientRevision: 0,
      });
      const result = await handle.promise;
      return result.isValid;
    },

    addShape: (
      shape,
      force = false,
      skipHistory = false,
      options?: AddShapeOptions,
    ) => {
      const state = get();
      const skipSelection = options?.skipSelection ?? false;

      // Construction Price Deduction
      if (shape.metadataId) {
        const roomMeta = (roomMetadata.rooms as any[]).find(r => r.id === shape.metadataId);
        if (roomMeta && roomMeta.price) {
          set({ spendableMoney: state.spendableMoney - roomMeta.price });
        }
      }

      // Modular Merging Logic (Industry Leading Foundation)
      const mergeableTypes: SimulationNodeType[] = [
        "lobby",
        "structure",
        "empty_floor",
      ];
      if (mergeableTypes.includes(shape.type)) {
        const snappedX = shape.position[0];
        const snappedY = shape.position[1];
        const halfWidth = shape.size[0] / 2;

        // Intersection + Adjacency Merge Engine (Union Algorithm)
        const overlapEpsilon = 1.0;
        const intersectingNeighbors = state.shapes.filter(
          (s) =>
            s.id !== shape.id &&
            s.type === shape.type &&
            Math.abs(s.position[1] - snappedY) < 1 && // Same floor
            // Check if AABBs intersect or are adjacent
            Math.abs(s.position[0] - snappedX) <=
              (s.size[0] + shape.size[0]) / 2 + overlapEpsilon,
        );

        if (intersectingNeighbors.length > 0) {
          const prime = intersectingNeighbors[0];
          const others = intersectingNeighbors.slice(1);

          let minX = Math.min(
            prime.position[0] - prime.size[0] / 2,
            snappedX - halfWidth,
          );
          let maxX = Math.max(
            prime.position[0] + prime.size[0] / 2,
            snappedX + halfWidth,
          );

          others.forEach((o) => {
            minX = Math.min(minX, o.position[0] - o.size[0] / 2);
            maxX = Math.max(maxX, o.position[0] + o.size[0] / 2);
            state.deleteShape(o.id, true);
          });

          const newWidth = maxX - minX;
          const newCenterX = minX + newWidth / 2;

          state.updateShape(
            prime.id,
            {
              position: [newCenterX, snappedY],
              size: [newWidth, prime.size[1]],
            },
            skipHistory,
          );

          if (shape.type !== "structure" && shape.type !== "empty_floor") {
            const roomLeft = shape.position[0] - shape.size[0] / 2;
            const roomRight = shape.position[0] + shape.size[0] / 2;
            const roomTop = shape.position[1] + shape.size[1] / 2;
            const roomBottom = shape.position[1] - shape.size[1] / 2;

            const toDelete = state.shapes.filter((s) => {
              if (s.type !== "empty_floor") return false;
              const sLeft = s.position[0] - s.size[0] / 2;
              const sRight = s.position[0] + s.size[0] / 2;
              const sTop = s.position[1] + s.size[1] / 2;
              const sBottom = s.position[1] - s.size[1] / 2;
              return (
                sLeft < roomRight - 0.1 &&
                sRight > roomLeft + 0.1 &&
                sBottom < roomTop - 0.1 &&
                sTop > roomBottom + 0.1
              );
            });
            toDelete.forEach((o) => state.deleteShape(o.id, true));
          }

          // Force update of underlying structure if room moved/expanded
          if (shape.type !== "structure") {
            state.addShape(
              {
                id: `scaffold_${Math.random().toString(36).substr(2, 9)}`,
                type: "structure",
                position: [newCenterX, snappedY],
                size: [newWidth, prime.size[1]],
                vertices: [
                  [-newWidth / 2, -prime.size[1] / 2],
                  [newWidth / 2, -prime.size[1] / 2],
                  [newWidth / 2, prime.size[1] / 2],
                  [-newWidth / 2, prime.size[1] / 2],
                ],
                name: "Structural Scaffold",
              },
              true,
              true,
              { skipSelection: true },
            );
          }

          if (shape.type === "structure") {
            const currentShapes = get().shapes;
            // Iterate over the newly merged structural bound by strict 10-width cell increments
            for (let cx = minX + 5; cx < maxX; cx += 10) {
              const hasRoom = currentShapes.some(
                (s) =>
                  s.type !== "structure" &&
                  s.type !== "empty_floor" &&
                  Math.abs(s.position[1] - snappedY) < 1 &&
                  s.position[0] - s.size[0] / 2 < cx + 0.1 &&
                  s.position[0] + s.size[0] / 2 > cx - 0.1,
              );
              const hasEmptyFloor = currentShapes.some(
                (s) =>
                  s.type === "empty_floor" &&
                  Math.abs(s.position[1] - snappedY) < 1 &&
                  s.position[0] - s.size[0] / 2 < cx + 0.1 &&
                  s.position[0] + s.size[0] / 2 > cx - 0.1,
              );

              if (!hasRoom && !hasEmptyFloor) {
                state.addShape(
                  {
                    id: `empty_floor_${Math.random().toString(36).substring(2, 9)}`,
                    type: "empty_floor",
                    position: [cx, snappedY],
                    size: [10, prime.size[1]],
                    vertices: [
                      [-5, -prime.size[1] / 2],
                      [5, -prime.size[1] / 2],
                      [5, prime.size[1] / 2],
                      [-5, prime.size[1] / 2],
                    ],
                    name: "Empty Floor",
                  },
                  true,
                  true,
                  { skipSelection: true },
                );
              }
            }
          }

          if (!skipSelection) {
            set({ selectedId: prime.id });
          }
          return;
        }
      }

      // Prevent exact placement duplicate or box intersection
      if (
        !force &&
        !state.checkPlacement(
          shape.position[0],
          shape.position[1],
          shape.size[0],
          shape.size[1],
          shape.type as string,
          shape.id,
        )
      ) {
        return; // Placements must be strictly non-overlapping
      }

      if (!skipHistory) {
        pushToHistory();
      }

      const workerPool = getWorkerPool();
      workerPool.broadcast({
        taskType: SIMULATION_TASK_TYPE.SyncSpatialHash,
        payload: {
          inserts: [
            {
              id: shape.id,
              x: shape.position[0],
              y: shape.position[1],
              w: shape.size[0],
              h: shape.size[1],
              type: shape.type,
            },
          ],
        },
        sceneRevision: 0,
        clientRevision: 0,
      });

      // Remove any overlapping empty_floor before placing a new room
      if (shape.type !== "empty_floor" && shape.type !== "structure") {
        const myLeft = shape.position[0] - shape.size[0] / 2;
        const myRight = shape.position[0] + shape.size[0] / 2;
        const myTop = shape.position[1] + shape.size[1] / 2;
        const myBottom = shape.position[1] - shape.size[1] / 2;

        const toDelete = state.shapes.filter((s) => {
          if (s.type !== "empty_floor") return false;
          const sLeft = s.position[0] - s.size[0] / 2;
          const sRight = s.position[0] + s.size[0] / 2;
          const sTop = s.position[1] + s.size[1] / 2;
          const sBottom = s.position[1] - s.size[1] / 2;
          return (
            sLeft < myRight - 0.1 &&
            sRight > myLeft + 0.1 &&
            sBottom < myTop - 0.1 &&
            sTop > myBottom + 0.1
          );
        });

        toDelete.forEach((o) => {
          if (o.id !== shape.id) state.deleteShape(o.id, true);
        });
      }

      // Synchronize local spatial hash for authoritative main-thread collision checks
      globalHash.insert(
        shape.id,
        shape.position[0],
        shape.position[1],
        shape.size[0],
        shape.size[1],
      );

      set((state) => {
        const newShapes = [
          ...state.shapes,
          {
            ...shape,
            name:
              shape.name ||
              shape.type.charAt(0).toUpperCase() + shape.type.slice(1),
          },
        ];
        const shouldCleanupEmptyFloors = !["structure", "empty_floor"].includes(
          shape.type,
        );
        const cleanedShapes = shouldCleanupEmptyFloors
          ? purgeOverlappingEmptyFloors(newShapes, shape)
          : newShapes;
        return { shapes: computeStructuralMetadata(cleanedShapes) };
      });

      // Immediately append invisible permanent scaffold structure
      if (
        [
          "residential",
          "commercial",
          "office",
          "utility",
          "lobby",
          "elevator",
          "stairs",
        ].includes(shape.type) &&
        shape.type !== "structure"
      ) {
        const stateAfter = get();
        stateAfter.addShape(
          {
            id: `scaffold_${Math.random().toString(36).substr(2, 9)}`,
            type: "structure",
            position: shape.position,
            size: shape.size,
            vertices: shape.vertices,
            name: "Structural Scaffold",
          },
          true,
          true,
          { skipSelection: true },
        );
      } else if (shape.type === "structure") {
        const stateAfter = get();
        // Check structural vacancy using SpatialHash for localized speed
        const candidates = globalHash.query(
          shape.position[0],
          shape.position[1],
          shape.size[0] - 0.2,
          shape.size[1] - 0.2,
        );
        let isOccupied = false;
        for (const id of candidates) {
          const s = stateAfter.shapes.find((sh) => sh.id === id);
          if (
            s &&
            s.type !== "structure" &&
            s.type !== "empty_floor" &&
            Math.abs(s.position[1] - shape.position[1]) < 0.1 &&
            s.position[0] + s.size[0] / 2 >
              shape.position[0] - shape.size[0] / 2 + 0.1 &&
            s.position[0] - s.size[0] / 2 <
              shape.position[0] + shape.size[0] / 2 - 0.1
          ) {
            isOccupied = true;
            break;
          }
        }

        if (!isOccupied) {
          stateAfter.addShape(
            {
              id: `empty_floor_${Math.random().toString(36).substr(2, 9)}`,
              type: "empty_floor",
              position: [...shape.position],
              size: [...shape.size],
              vertices: [...shape.vertices],
              name: "Empty Floor",
            },
            true,
            true,
            { skipSelection: true },
          );
        }
      }
      get().recomputeHotelCapacity();
    },
    updateShape: (id, updates, skipHistory = false) => {
      if (!skipHistory) {
        pushToHistory();
      }
      set((state) => {
        const updatedShapes = state.shapes.map((s) => {
          if (s.id === id) {
            const newShape = { ...s, ...updates };
            if (s.type !== "structure") {
              globalHash.remove(
                id,
                s.position[0],
                s.position[1],
                s.size[0],
                s.size[1],
              );
              globalHash.insert(
                id,
                newShape.position[0],
                newShape.position[1],
                newShape.size[0] || s.size[0],
                newShape.size[1] || s.size[1],
              );

              const workerPool = getWorkerPool();
              workerPool.broadcast({
                taskType: SIMULATION_TASK_TYPE.SyncSpatialHash,
                payload: {
                  removes: [
                    {
                      id,
                      x: s.position[0],
                      y: s.position[1],
                      w: s.size[0],
                      h: s.size[1],
                    },
                  ],
                  inserts: [
                    {
                      id,
                      x: newShape.position[0],
                      y: newShape.position[1],
                      w: newShape.size[0] || s.size[0],
                      h: newShape.size[1] || s.size[1],
                      type: s.type,
                    },
                  ],
                },
                sceneRevision: 0,
                clientRevision: 0,
              });
            }

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
        });
        return { shapes: computeStructuralMetadata(updatedShapes) };
      });
      get().recomputeHotelCapacity();
    },
    deleteShape: (id, isMerge = false) => {
      const shapeToDelete = get().shapes.find((s) => s.id === id);
      if (!shapeToDelete) return;

      if (
        !isMerge &&
        shapeToDelete.type === "empty_floor" &&
        !simulationSettings.deletable_empty_rooms
      ) {
        console.warn("Village: Empty-floor removal is disabled in settings.");
        return;
      }

      pushToHistory();
      const isStructure = shapeToDelete.type === "structure";
      const isRoom = !isStructure && shapeToDelete.type !== "empty_floor";

      set((state) => {
        const shape = state.shapes.find((s) => s.id === id);
        if (shape) {
          // Guard: Cannot delete a foundation if a room sits on it
          if (shape.type === "structure" && !isMerge) {
            const myLeft = shape.position[0] - shape.size[0] / 2;
            const myRight = shape.position[0] + shape.size[0] / 2;
            const hasRoomAbove = state.shapes.some(
              (s) =>
                s.type !== "structure" &&
                s.type !== "text" &&
                Math.abs(s.position[1] - shape.position[1]) < 5 &&
                s.position[0] + s.size[0] / 2 > myLeft + 0.1 &&
                s.position[0] - s.size[0] / 2 < myRight - 0.1,
            );
            if (hasRoomAbove) {
              console.warn(
                "Village: Deletion blocked - Foundation is occupied.",
              );
              return state;
            }
          }

          if (shape.type !== "structure") {
            globalHash.remove(
              id,
              shape.position[0],
              shape.position[1],
              shape.size[0],
              shape.size[1],
            );

            const workerPool = getWorkerPool();
            workerPool.broadcast({
              taskType: SIMULATION_TASK_TYPE.SyncSpatialHash,
              payload: {
                removes: [
                  {
                    id,
                    x: shape.position[0],
                    y: shape.position[1],
                    w: shape.size[0],
                    h: shape.size[1],
                  },
                ],
              },
              sceneRevision: 0,
              clientRevision: 0,
            });
          }
        }
        const nextShapes = state.shapes.filter((s) => s.id !== id);
        const nextLinks = state.links.filter(
          (l) => l.from !== id && l.to !== id,
        );
        return {
          shapes: computeStructuralMetadata(nextShapes),
          links: nextLinks,
          selectedId: state.selectedId === id ? null : state.selectedId,
          editingId: state.editingId === id ? null : state.editingId,
          lastDeletedNodeType: shape?.type ?? null,
        };
      });

      const stateAfter = get();
      const deletedWasEmptyFloor = shapeToDelete?.type === "empty_floor";
      if (!isMerge && !deletedWasEmptyFloor && shapeToDelete) {
        // --- INDUSTRY LEADING LOCALIZED VACANCY RESTORATION ---
        reconstructVacancy({
          deletedShape: shapeToDelete,
          currentShapes: stateAfter.shapes,
          addShapeCallback: stateAfter.addShape
        });
        if (stateAfter.selectedId === id) {
          stateAfter.setSelectedId(null);
        }
      }
      get().recomputeHotelCapacity();
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
    setActiveModuleId: (id) => set({ activeModuleId: id }),
    setLastDeletedNodeType: (type) => set({ lastDeletedNodeType: type }),
    setSelectedId: (id) => {
      set({ selectedId: id });
    },
    setEditingId: (id) => {
      set({ editingId: id });
    },
    setIsRotating: (isRotating) => {
      const state = get();
      if (!isRotating && state.isRotating && state.selectedId) {
        const shape = state.shapes.find((s) => s.id === state.selectedId);
        if (shape) {
          if (
            !state.checkPlacement(
              shape.position[0],
              shape.position[1],
              shape.size[0],
              shape.size[1],
              shape.id,
            )
          ) {
            // Let it revert or stay invalid, typically rotation shouldn't collide inside a bounding box
          }
        }
      }
      set({ isRotating });
    },
    setIsPanning: (isPanning) => set({ isPanning }),
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
    initializeWorld: () => {
      // Industry Leading Bootstrap Sequence
      // We use addShape to ensure initial lobbies/scaffolds are merged correctly
      const startX = -25;
      for (let i = 0; i < 6; i++) {
        const x = startX + i * 10;

        // Add Lobby Cell
        get().addShape(
          {
            id: `lobby_${Math.random().toString(36).substr(2, 9)}`,
            type: "lobby",
            position: [x, 0],
            size: [10, 40],
            vertices: [
              [-5, -20],
              [5, -20],
              [5, 20],
              [-5, 20],
            ],
            name: "Lobby Entry",
          },
          true,
          true,
          { skipSelection: true },
        );
      }

      // Final structural registration audit to catch any HMR artifacts
      const finalShapes = get().shapes;
      finalShapes.forEach((s) => {
        get().registerStructuralRoom(
          s.id,
          s.type,
          s.position[0],
          s.position[1],
          s.size[0],
          s.size[1],
        );
      });

      // Sync all workers at once
      const workerPool = getWorkerPool();
      workerPool.broadcast({
        taskType: SIMULATION_TASK_TYPE.SyncSpatialHash,
        payload: {
          clear: true,
          inserts: get().shapes.map((s) => ({
            id: s.id,
            x: s.position[0],
            y: s.position[1],
            w: s.size[0],
            h: s.size[1],
          })),
        },
        sceneRevision: 0,
        clientRevision: 0,
      });
    },
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
    setShowWeather: (val) => {
      localStorage.setItem("villaggio_show_weather", String(val));
      set({ showWeather: val });
    },
    setShowPlacementGrid: (val) => {
      localStorage.setItem("villaggio_show_placement_grid", String(val));
      set({ showPlacementGrid: val });
    },
    setShowMinimap: (val) => {
      localStorage.setItem("villaggio_show_minimap", String(val));
      set({ showMinimap: val });
    },
    setShowWeatherPanel: (val) => {
      localStorage.setItem("villaggio_show_weather_panel", String(val));
      set({ showWeatherPanel: val });
    },
    setSpendableMoney: (value) => {
      localStorage.setItem("villaggio_spendable_money", value.toString());
      set({ spendableMoney: value });
    },
  };
});
