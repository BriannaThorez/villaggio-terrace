import {
  registerWorkerTask,
  type WorkerTaskContext,
} from "./runtime";

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
    (payload, context) => {
      if (context.signal.aborted) {
        throw new Error("Worker task was cancelled before echo completion");
      }

      return {
        value: payload.value,
        requestId: context.requestId,
      };
    },
  );
};

registerFoundationWorkerTasks();
