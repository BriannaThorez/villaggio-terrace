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
  type StructuralIntegrityPayload,
  type StructuralIntegrityResult,
  type ResolveOverlapsPayload,
  type ResolveOverlapsResult,
} from "../shared/worker/protocol";
import { validatePlacement } from "../features/roomPlacement/constraints/placementRules";
import { FloorBucketIndex } from "../features/roomPlacement/constraints/spatialIndex";
import { checkStructuralIntegrity } from "../features/roomPlacement/constraints/structuralIntegrity";

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
  [SIMULATION_TASK_TYPE.ValidateStructuralIntegrity]: StructuralIntegrityPayload;
  [SIMULATION_TASK_TYPE.ResolveOverlaps]: ResolveOverlapsPayload;
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
  [SIMULATION_TASK_TYPE.ValidateStructuralIntegrity]: StructuralIntegrityResult;
  [SIMULATION_TASK_TYPE.ResolveOverlaps]: ResolveOverlapsResult;
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

const getWorkerSimulationNodes = () => {
  return Array.from(workerNodeState.values()).map(n => ({
    id: n.id,
    type: n.type,
    position: [n.x, n.y],
    size: [n.w, n.h],
    vertices: [] // Stub for worker-side collision math
  })) as any as SimulationNode[];
};

export const registerLayoutTasks = () => {
  registerWorkerTask<CheckPlacementPayload, CheckPlacementResult>(
    SIMULATION_TASK_TYPE.CheckPlacement,
    (payload) => {
      const nodes = getWorkerSimulationNodes();
      const index = new FloorBucketIndex(nodes);

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
  registerWorkerTask<ResolveOverlapsPayload, ResolveOverlapsResult>(
    SIMULATION_TASK_TYPE.ResolveOverlaps,
    (payload) => {
      const patches: Array<{ id: string; position: [number, number] }> = [];
      
      // Simple O(N^2) overlap resolution for worker offloading
      // In a production scenario, we'd use the SpatialHash here too.
      for(let i=0; i<payload.shapes.length; i++) {
        const a = payload.shapes[i];
        for(let j=i+1; j<payload.shapes.length; j++) {
          const b = payload.shapes[j];
          
          const dx = a.position[0] - b.position[0];
          const dy = a.position[1] - b.position[1];
          const minW = (a.size[0] + b.size[0]) / 2;
          const minH = (a.size[1] + b.size[1]) / 2;
          
          if (Math.abs(dx) < minW && Math.abs(dy) < minH) {
             // Overlap detected. Push A away from B.
             const overlapX = minW - Math.abs(dx);
             const pushX = dx > 0 ? overlapX : -overlapX;
             patches.push({ id: a.id, position: [a.position[0] + pushX, a.position[1]] });
          }
        }
      }
      
      return { patches };
    }
  );
};

export const registerAnalysisTasks = () => {
  registerWorkerTask<StructuralIntegrityPayload, StructuralIntegrityResult>(
    SIMULATION_TASK_TYPE.ValidateStructuralIntegrity,
    (payload) => {
      const nodes = getWorkerSimulationNodes();
      const index = new FloorBucketIndex(nodes);
      
      const { isValid, overhang } = checkStructuralIntegrity(
        payload.x,
        payload.y,
        payload.w,
        nodes,
        payload.type,
        50.1, // Max Cantilever
        index
      );

      return { isValid, overhang };
    }
  );
};

registerFoundationWorkerTasks();
registerLayoutTasks();
registerRoutingTasks();
registerAnalysisTasks();
