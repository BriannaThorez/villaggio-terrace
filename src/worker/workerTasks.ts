import {
  registerWorkerTask,
  type WorkerTaskContext,
} from "./runtime";
import { SpatialHash } from "../shared/utils/SpatialHash";
import {
  SIMULATION_TASK_TYPE,
  type CheckPlacementPayload,
  type CheckPlacementResult,
  type SyncSpatialHashPayload,
} from "../shared/worker/protocol";
import { validatePlacement } from "../features/roomPlacement/constraints/placementRules";

const workerHash = new SpatialHash(100);

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
    (payload, context) => {
      // The worker focuses on fast spatial collision detection.
      // High-fidelity structural checks (overhang/slab support) run on the main thread.
      const candidates = workerHash.query(payload.x, payload.y, payload.w, payload.h);
      const colliders = Array.from(candidates).filter(id => id !== payload.ignoreId);

      return { isValid: colliders.length === 0, collidingId: colliders[0] };
    },
  );

  registerWorkerTask<SyncSpatialHashPayload, { success: boolean }>(
    SIMULATION_TASK_TYPE.SyncSpatialHash,
    (payload) => {
      if (payload.clear) workerHash.clear();
      if (payload.removes) payload.removes.forEach((r) => workerHash.remove(r.id, r.x, r.y, r.w, r.h));
      if (payload.inserts) payload.inserts.forEach((i) => workerHash.insert(i.id, i.x, i.y, i.w, i.h));
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
