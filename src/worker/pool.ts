import type {
  WorkerCapabilityEnvelope,
  WorkerCancelEnvelope,
  WorkerEnvelope,
  WorkerMessageKind,
  WorkerProtocolCapabilities,
  WorkerReadyEnvelope,
  WorkerRequestEnvelope,
  WorkerRequestId,
  WorkerResultEnvelope,
  WorkerShutdownEnvelope,
  WorkerTaskCancelledEnvelope,
  WorkerTaskErrorEnvelope,
  WorkerTaskRequestEnvelope,
  WorkerTaskStaleEnvelope,
} from "../shared/worker/protocol";

export type WorkerRole =
  | "default"
  | "layout"
  | "routing"
  | "analysis"
  | "export";

import {
  WORKER_MESSAGE_KIND,
  WORKER_PROTOCOL_NAME,
  WORKER_PROTOCOL_VERSION,
  createWorkerPingEnvelope,
  createWorkerShutdownEnvelope,
  createWorkerTaskEnvelope,
  createWorkerTaskErrorEnvelope,
  createWorkerTaskCancelledEnvelope,
  createWorkerTaskStaleEnvelope,
  isWorkerEnvelope as isSharedWorkerEnvelope,
} from "../shared/worker/protocol";

type TaskTerminalStatus = "completed" | "cancelled" | "stale" | "failed";

const markTerminalOnce = <T extends PendingTaskRecord>(
  pending: T,
  status: WorkerPoolTaskStatus,
) => {
  if (pending.terminalEmitted) {
    return false;
  }

  pending.status = status;
  pending.terminalEmitted = true;
  return true;
};

const markWorkerBusy = (record: WorkerPoolWorkerRecord) => {
  record.busyCount += 1;
};

const clearWorkerBusy = (record: WorkerPoolWorkerRecord) => {
  if (record.busyCount > 0) {
    record.busyCount -= 1;
  }
};

const markPendingTerminal = <T extends PendingTaskRecord>(
  pending: T,
  status: WorkerPoolTaskStatus,
) => {
  if (pending.terminalEmitted) {
    return false;
  }

  pending.status = status;
  pending.terminalEmitted = true;
  return true;
};

export type WorkerPoolTaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "cancelled"
  | "stale"
  | "failed";

export interface WorkerPoolTaskOptions<TPayload = unknown> {
  taskType: string;
  payload: TPayload;
  sceneRevision: number;
  clientRevision: number;
  role?: WorkerRole;
  priority?: number;
}

export interface WorkerPoolTaskHandle<TResult = unknown> {
  requestId: string;
  promise: Promise<TResult>;
  cancel: (reason?: string) => void;
  status: () => WorkerPoolTaskStatus;
}

interface WorkerPoolWorkerRecord {
  worker: Worker;
  role: WorkerRole;
  busyCount: number;
  healthy: boolean;
  lastPingAt: number;
  lastReadyAt: number;
  supportedRoles: WorkerRole[];
  capabilities: WorkerProtocolCapabilities;
}

interface PendingTaskRecord<TResult = unknown> {
  request: WorkerTaskRequestEnvelope;
  resolve: (value: TResult) => void;
  reject: (reason: unknown) => void;
  status: WorkerPoolTaskStatus;
  worker?: WorkerPoolWorkerRecord;
  staleKey: string;
  createdAt: number;
  terminalEmitted: boolean;
}

export interface WorkerPoolOptions {
  workerFactory: (role: WorkerRole) => Worker;
  workerCount?: number;
  roles?: WorkerRole[];
  maxQueueSize?: number;
  staleWindowMs?: number;
}

const DEFAULT_WORKER_COUNT = 2;
const DEFAULT_MAX_QUEUE_SIZE = 128;
const DEFAULT_STALE_WINDOW_MS = 15_000;

const createRequestId = () =>
  `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;

const makeStaleKey = (request: WorkerTaskRequestEnvelope) =>
  `${request.type}:${request.sceneRevision}:${request.clientRevision}`;

const isTerminalStatus = (status: WorkerPoolTaskStatus) =>
  status === "completed" ||
  status === "cancelled" ||
  status === "stale" ||
  status === "failed";

const isWorkerEnvelope = (value: unknown): value is WorkerEnvelope => {
  return isSharedWorkerEnvelope(value);
};

const normalizeCapabilityEnvelope = (
  envelope: WorkerCapabilityEnvelope,
): WorkerProtocolCapabilities => ({
  protocol: envelope.protocol,
  version: envelope.version,
  supportsCancellation: envelope.supportsCancellation,
  supportsFallback: envelope.supportsFallback,
  supportsTypedResults: envelope.supportsTypedResults,
  supportedKinds: envelope.supportedKinds,
  minCompatibleVersion: envelope.minCompatibleVersion,
  maxCompatibleVersion: envelope.maxCompatibleVersion,
});

const normalizeWorkerError = (
  error: WorkerTaskErrorEnvelope["error"]["error"],
) => {
  const wrapped = new Error(error.message);
  wrapped.name = error.name ?? wrapped.name;
  if (error.stack) {
    wrapped.stack = error.stack;
  }
  return wrapped;
};

export class WorkerPoolCoordinator {
  private readonly workers: WorkerPoolWorkerRecord[] = [];
  private readonly pending = new Map<string, PendingTaskRecord>();
  private readonly staleResults = new Set<string>();
  private readonly queue: Array<PendingTaskRecord> = [];
  private readonly workerFactory: () => Worker;
  private readonly maxQueueSize: number;
  private readonly staleWindowMs: number;

  constructor(options: WorkerPoolOptions) {
    this.workerFactory = options.workerFactory;
    this.maxQueueSize = options.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE;
    this.staleWindowMs = options.staleWindowMs ?? DEFAULT_STALE_WINDOW_MS;

    const workerCount = options.workerCount ?? DEFAULT_WORKER_COUNT;
    const roles: WorkerRole[] =
      options.roles && options.roles.length > 0 ? options.roles : ["default"];

    for (let i = 0; i < workerCount; i += 1) {
      const role = roles[i % roles.length];
      this.spawnWorker(role);
    }
  }

  submit<TPayload, TResult = unknown>(
    options: WorkerPoolTaskOptions<TPayload>,
  ): WorkerPoolTaskHandle<TResult> {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error("Worker pool queue is full");
    }

    const request = createWorkerTaskEnvelope(
      options.taskType,
      createRequestId(),
      options.payload,
      {
        createdAtMs: Date.now(),
        sceneRevision: options.sceneRevision,
        clientRevision: options.clientRevision,
        role: options.role,
        priority: options.priority,
      },
    );

    const staleKey = makeStaleKey(request);

    const promise = new Promise<TResult>((resolve, reject) => {
      const pending: PendingTaskRecord<TResult> = {
        request,
        resolve,
        reject,
        status: "queued",
        staleKey,
        createdAt: Date.now(),
        terminalEmitted: false,
      };

      this.pending.set(request.requestId, pending);
      this.queue.push(pending);
      this.dispatch();
    });

    return {
      requestId: request.requestId,
      promise,
      cancel: (reason?: string) => {
        this.cancel(request.requestId, reason);
      },
      status: () => this.pending.get(request.requestId)?.status ?? "completed",
    };
  }

  cancel(requestId: string, reason?: string) {
    const pending = this.pending.get(requestId);
    if (
      !pending ||
      isTerminalStatus(pending.status) ||
      pending.terminalEmitted
    ) {
      return false;
    }

    if (!markPendingTerminal(pending, "cancelled")) {
      return false;
    }

    this.pending.delete(requestId);
    this.staleResults.add(pending.staleKey);
    clearWorkerBusy(pending.worker!);

    if (pending.worker) {
      const cancelEnvelope: WorkerCancelEnvelope = {
        protocol: WORKER_PROTOCOL_NAME,
        version: WORKER_PROTOCOL_VERSION,
        kind: WORKER_MESSAGE_KIND.Cancel,
        channel: "pool-to-worker",
        requestId,
        targetRequestId: requestId,
        reason,
        sceneRevision: pending.request.sceneRevision,
        clientRevision: pending.request.clientRevision,
        cancellation: {
          canceled: true,
          canceledAtMs: Date.now(),
          cancelReason: reason,
          canceledBy: "user",
        },
      };
      pending.worker.worker.postMessage(cancelEnvelope);
    }

    pending.reject(new Error(reason ?? "Task cancelled"));
    return true;
  }

  shutdown() {
    for (const pending of this.pending.values()) {
      if (!markPendingTerminal(pending, "cancelled")) {
        continue;
      }

      pending.worker?.worker.postMessage(
        createWorkerShutdownEnvelope("runtime", {
          atMs: Date.now(),
        }),
      );
      pending.reject(new Error("Worker pool shutting down"));
    }

    this.pending.clear();
    this.queue.length = 0;

    for (const worker of this.workers) {
      worker.worker.terminate();
    }

    this.workers.length = 0;
  }

  getSnapshot() {
    return {
      workerCount: this.workers.length,
      busyWorkers: this.workers.reduce(
        (count, worker) => count + worker.busyCount,
        0,
      ),
      queueDepth: this.queue.length,
      pendingCount: this.pending.size,
      healthyWorkers: this.workers.filter((worker) => worker.healthy).length,
    };
  }

  private spawnWorker(role: WorkerRole) {
    const worker = this.workerFactory(role);

    const record: WorkerPoolWorkerRecord = {
      worker,
      role,
      busyCount: 0,
      healthy: true,
      lastPingAt: Date.now(),
      lastReadyAt: 0,
      supportedRoles: [role],
      capabilities: {
        protocol: WORKER_PROTOCOL_NAME,
        version: WORKER_PROTOCOL_VERSION,
        supportsCancellation: true,
        supportsFallback: true,
        supportsTypedResults: true,
        supportedKinds: [],
        minCompatibleVersion: 1,
        maxCompatibleVersion: WORKER_PROTOCOL_VERSION,
      },
    };

    worker.onmessage = (event: MessageEvent<WorkerEnvelope>) => {
      const envelope = event.data;
      if (!isWorkerEnvelope(envelope)) return;

      if (envelope.kind === WORKER_MESSAGE_KIND.Ready) {
        const readyEnvelope = envelope as WorkerReadyEnvelope;
        record.lastReadyAt = Date.now();
        record.supportedRoles = readyEnvelope.roles as WorkerRole[];
        record.capabilities = {
          ...record.capabilities,
          supportedKinds: readyEnvelope.capabilities as any,
        };
        record.healthy = true;
        this.dispatch();
        return;
      }

      if (envelope.kind === WORKER_MESSAGE_KIND.Pong) {
        record.lastPingAt = Date.now();
        record.healthy = true;
        return;
      }

      if (envelope.kind === WORKER_MESSAGE_KIND.Result) {
        const resultEnvelope = envelope as WorkerResultEnvelope;
        this.handleResult(record, resultEnvelope);
        return;
      }

      if (envelope.kind === WORKER_MESSAGE_KIND.Error) {
        const errorEnvelope = envelope as WorkerTaskErrorEnvelope;
        this.handleFailure(
          record,
          errorEnvelope.error.requestId,
          normalizeWorkerError(errorEnvelope.error.error),
        );
        return;
      }

      if (envelope.kind === WORKER_MESSAGE_KIND.Cancelled) {
        const cancelledEnvelope = envelope as WorkerTaskCancelledEnvelope;
        this.handleCancellation(cancelledEnvelope.cancelled.requestId);
        return;
      }

      if (envelope.kind === WORKER_MESSAGE_KIND.Stale) {
        const staleEnvelope = envelope as WorkerTaskStaleEnvelope;
        this.handleStale(
          staleEnvelope.stale.requestId,
          staleEnvelope.stale.reason,
        );
        return;
      }
    };

    worker.onerror = () => {
      record.healthy = false;
      this.replaceWorker(record);
    };

    this.workers.push(record);
    worker.postMessage(
      createWorkerPingEnvelope("runtime", {
        atMs: Date.now(),
      }),
    );
  }

  private replaceWorker(record: WorkerPoolWorkerRecord) {
    const index = this.workers.indexOf(record);
    if (index >= 0) {
      this.workers.splice(index, 1);
    }
    record.worker.terminate();
    this.spawnWorker(record.role);
  }

  private dispatch() {
    if (this.queue.length === 0) return;

    for (const pending of [...this.queue]) {
      if (pending.status !== "queued") continue;

      const worker = this.pickWorker(
        pending.request.role as WorkerRole | undefined,
      );
      if (!worker) return;

      const age = Date.now() - pending.createdAt;
      if (age > this.staleWindowMs) {
        pending.status = "stale";
        pending.terminalEmitted = true;
        this.pending.delete(pending.request.requestId);
        pending.reject(new Error("Task became stale before dispatch"));
        continue;
      }

      markWorkerBusy(worker);
      pending.worker = worker;
      pending.status = "running";

      worker.worker.postMessage(pending.request);

      const queueIndex = this.queue.indexOf(pending);
      if (queueIndex >= 0) {
        this.queue.splice(queueIndex, 1);
      }
    }
  }

  private pickWorker(role?: WorkerRole) {
    const eligible = this.workers.filter((worker) => {
      if (!worker.healthy) return false;
      if (!role) return true;
      return worker.role === role || worker.supportedRoles.includes(role);
    });

    if (eligible.length === 0) return undefined;

    eligible.sort(
      (a, b) => a.busyCount - b.busyCount || a.lastReadyAt - b.lastReadyAt,
    );
    return eligible[0];
  }

  private handleResult(
    record: WorkerPoolWorkerRecord,
    envelope: WorkerResultEnvelope,
  ) {
    const result = envelope.result as {
      requestId: string;
      taskType: string;
      sceneRevision: number;
      clientRevision: number;
      data: unknown;
    };
    const pending = this.pending.get(result.requestId);
    clearWorkerBusy(record);

    if (!pending || pending.terminalEmitted) {
      this.staleResults.add(
        `${result.taskType}:${result.sceneRevision}:${result.clientRevision}`,
      );
      return;
    }

    const resultKey = `${result.taskType}:${result.sceneRevision}:${result.clientRevision}`;
    if (pending.staleKey !== resultKey || this.staleResults.has(resultKey)) {
      if (markPendingTerminal(pending, "stale")) {
        this.pending.delete(result.requestId);
        pending.reject(new Error("Rejected stale worker result"));
      }
      this.dispatch();
      return;
    }

    if (markPendingTerminal(pending, "completed")) {
      this.pending.delete(result.requestId);
      this.staleResults.add(pending.staleKey);
      pending.resolve(result.data as never);
    }
    this.dispatch();
  }

  private handleFailure(
    record: WorkerPoolWorkerRecord,
    requestId: string,
    error: Error,
  ) {
    const pending = this.pending.get(requestId);
    clearWorkerBusy(record);

    if (!pending || pending.terminalEmitted) return;

    if (markPendingTerminal(pending, "failed")) {
      this.pending.delete(requestId);
      pending.reject(error);
    }
    this.dispatch();
  }

  private handleCancellation(requestId: string) {
    const pending = this.pending.get(requestId);
    if (!pending || pending.terminalEmitted) return;

    if (markPendingTerminal(pending, "cancelled")) {
      this.pending.delete(requestId);
      pending.reject(new Error("Task cancelled by worker"));
    }
    this.dispatch();
  }

  private handleStale(requestId: string, reason: string) {
    const pending = this.pending.get(requestId);
    if (!pending || pending.terminalEmitted) return;

    if (markPendingTerminal(pending, "stale")) {
      this.pending.delete(requestId);
      pending.reject(new Error(`Stale result rejected: ${reason}`));
    }
    this.dispatch();
  }
}

export class WorkerPoolClient {
  private readonly coordinator: WorkerPoolCoordinator;

  constructor(options: WorkerPoolOptions) {
    this.coordinator = new WorkerPoolCoordinator(options);
  }

  submit<TPayload, TResult = unknown>(
    options: WorkerPoolTaskOptions<TPayload>,
  ): WorkerPoolTaskHandle<TResult> {
    return this.coordinator.submit<TPayload, TResult>(options);
  }

  cancel(requestId: string, reason?: string) {
    return this.coordinator.cancel(requestId, reason);
  }

  shutdown() {
    this.coordinator.shutdown();
  }

  snapshot() {
    return this.coordinator.getSnapshot();
  }
}

export const createWorkerPoolClient = (options: WorkerPoolOptions) =>
  new WorkerPoolClient(options);
