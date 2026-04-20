import {
  registerWorkerTask,
  type WorkerTaskContext,
} from "./runtime";
import type { SimulationNode } from "../shared/utils/store";
import { SpatialHash } from "../shared/utils/SpatialHash";
import {
  SIMULATION_TASK_TYPE,
  type CheckPlacementPayload,
  type CheckPlacementResult,
  type SyncSpatialHashPayload,
} from "../shared/worker/protocol";
import { validatePlacement } from "../features/roomPlacement/constraints/placementRules";
import { FloorBucketIndex } from "../features/roomPlacement/constraints/spatialIndex";

import { getMaxCantileverLogic, type SimpleNode } from "../features/roomPlacement/constraints/structuralLogic";

const workerHash = new SpatialHash(100);
const workerNodeState = new Map<string, SimpleNode>();

export type WorkerTaskPayloadMap = {
  "worker/health-check": {
    timestamp: number;
  };
  "worker/revision-check": {
    taskType: string;
    sceneRevision: number;
    clientRevision: number;
  };
  "worker/echo": {
    value: unknown;
  };
  [SIMULATION_TASK_TYPE.CheckPlacement]: CheckPlacementPayload;
  [SIMULATION_TASK_TYPE.SyncSpatialHash]: SyncSpatialHashPayload;
};

export type WorkerTaskResultMap = {
  "worker/health-check": {
    ok: true;
    timestamp: number;
    workerRevision: number;
    role: WorkerTaskContext["role"];
  };
  "worker/revision-check": {
    accepted: boolean;
    sceneRevision: number;
    clientRevision: number;
    stale: boolean;
  };
  "worker/echo": {
    value: unknown;
    requestId: string;
  };
  [SIMULATION_TASK_TYPE.CheckPlacement]: CheckPlacementResult;
  [SIMULATION_TASK_TYPE.SyncSpatialHash]: { success: boolean };
};

const normalizeRevisionPair = (
  sceneRevision: number,
  clientRevision: number,
) => ({
  sceneRevision: Number.isFinite(sceneRevision) ? sceneRevision : 0,
  clientRevision: Number.isFinite(clientRevision) ? clientRevision : 0,
});

export const registerFoundationWorkerTasks = () => {
  registerWorkerTask<WorkerTaskPayloadMap["worker/health-check"], WorkerTaskResultMap["worker/health-check"]>(
    "worker/health-check",
    (_payload, context) => {
      return {
        ok: true,
        timestamp: Date.now(),
        workerRevision: context.sceneRevision,
        role: context.role,
      };
    },
  );

  registerWorkerTask<WorkerTaskPayloadMap["worker/revision-check"], WorkerTaskResultMap["worker/revision-check"]>(
    "worker/revision-check",
    (payload, context) => {
      const incoming = normalizeRevisionPair(
        payload.sceneRevision,
        payload.clientRevision,
      );

      const stale =
        context.isStale() ||
        incoming.sceneRevision < context.sceneRevision ||
        (incoming.sceneRevision === context.sceneRevision &&
          incoming.clientRevision < context.clientRevision);

      return {
        accepted: !stale,
        sceneRevision: incoming.sceneRevision,
        clientRevision: incoming.clientRevision,
        stale,
      };
    },
  );

  registerWorkerTask<WorkerTaskPayloadMap["worker/echo"], WorkerTaskResultMap["worker/echo"]>(
    "worker/echo",
    (payload, context) => ({ value: payload.value, requestId: context.requestId }),
  );
};

export const registerLayoutTasks = () => {
  registerWorkerTask<CheckPlacementPayload, CheckPlacementResult>(
    SIMULATION_TASK_TYPE.CheckPlacement,
    (payload) => {
      // 1. Transform worker state (flat format) into SimulationNode (nested format)
      // This is VITAL because validatePlacement expects s.position[0] and s.size[0].
      const nodes = Array.from(workerNodeState.values()).map(n => ({
        id: n.id,
        type: n.type,
        position: [n.x, n.y],
        size: [n.w, n.h],
        vertices: [] // Stub for worker-side collision math
      })) as any as SimulationNode[];
      
      // 2. Build the optimized floor bucket index
      const index = new FloorBucketIndex(nodes);

      // 3. Delegate to master validation engine
      return validatePlacement(
        payload.x,
        payload.y,
        payload.w,
        payload.h,
        nodes,
        payload.type,
        payload.ignoreId,
        false, // isForce
        index
      );
    },
  );

  registerWorkerTask<SyncSpatialHashPayload, { success: boolean }>(
    SIMULATION_TASK_TYPE.SyncSpatialHash,
    (payload) => {
      if (payload.clear) {
        workerHash.clear();
        workerNodeState.clear();
      }
      if (payload.removes) {
        payload.removes.forEach((r) => {
          workerHash.remove(r.id, r.x, r.y, r.w, r.h);
          workerNodeState.delete(r.id);
        });
      }
      if (payload.inserts) {
        payload.inserts.forEach((i) => {
          workerHash.insert(i.id, i.x, i.y, i.w, i.h);
          workerNodeState.set(i.id, {
            id: i.id,
            x: i.x,
            y: i.y,
            w: i.w,
            h: i.h,
            type: i.type,
          });
        });
      }
      return { success: true };
    },
  );
};

export const registerRoutingTasks = () => {
  // Placeholder for future pathfinding and link resolving tasks
};

export const registerAnalysisTasks = () => {
  // Placeholder for metrics and validation tasks
};

registerFoundationWorkerTasks();
registerLayoutTasks();
