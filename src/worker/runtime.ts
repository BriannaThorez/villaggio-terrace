import {
  WORKER_MESSAGE_KIND,
  WORKER_PROTOCOL_NAME,
  WORKER_PROTOCOL_VERSION,
  createWorkerReadyEnvelope,
  createWorkerResultEnvelope,
  createWorkerTaskCancelledEnvelope,
  createWorkerTaskErrorEnvelope,
  createWorkerTaskStaleEnvelope,
  isWorkerEnvelope as isSharedWorkerEnvelope,
  type WorkerCancelEnvelope,
  type WorkerEnvelope,
  type WorkerPingEnvelope,
  type WorkerPongEnvelope,
  type WorkerRequestEnvelope,
  type WorkerShutdownEnvelope,
  type WorkerTaskRequestEnvelope,
} from "../shared/worker/protocol";

type RuntimeFallbackReason =
  | "unsupported_environment"
  | "initialization_failure"
  | "capacity_exceeded"
  | "worker_crash"
  | "worker_protocol_mismatch";

export type WorkerRole =
  | "default"
  | "layout"
  | "routing"
  | "analysis"
  | "export";

export interface WorkerTaskContext {
  requestId: string;
  taskType: string;
  sceneRevision: number;
  clientRevision: number;
  role: WorkerRole;
  priority: number;
  createdAt: number;
  cancelled: boolean;
  cancelReason?: string;
  signal: AbortSignal;
  isStale: () => boolean;
}

export type WorkerTaskHandler<TPayload = unknown, TResult = unknown> = (
  payload: TPayload,
  context: WorkerTaskContext,
) => Promise<TResult> | TResult;

export type WorkerTaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "cancelled"
  | "failed"
  | "stale";

export interface WorkerTaskRequest<TPayload = unknown> {
  requestId: string;
  taskType: string;
  payload: TPayload;
  sceneRevision: number;
  clientRevision: number;
  role?: WorkerRole;
  priority?: number;
  silent?: boolean;
  createdAt: number;
}

export interface WorkerTaskResult<TData = unknown> {
  requestId: string;
  taskType: string;
  status: Extract<WorkerTaskStatus, "completed">;
  data: TData;
  sceneRevision: number;
  clientRevision: number;
  role?: WorkerRole;
  completedAt: number;
}

export interface WorkerTaskError {
  requestId: string;
  taskType: string;
  status: Extract<WorkerTaskStatus, "failed">;
  error: {
    message: string;
    name?: string;
    stack?: string;
    code?: string;
  };
  sceneRevision: number;
  clientRevision: number;
  role?: WorkerRole;
  failedAt: number;
}

export interface WorkerTaskCancelled {
  requestId: string;
  taskType: string;
  status: Extract<WorkerTaskStatus, "cancelled">;
  sceneRevision: number;
  clientRevision: number;
  role?: WorkerRole;
  cancelledAt: number;
}

export interface WorkerTaskStale {
  requestId: string;
  taskType: string;
  status: Extract<WorkerTaskStatus, "stale">;
  sceneRevision: number;
  clientRevision: number;
  role?: WorkerRole;
  staleAt: number;
  reason: "revision_mismatch" | "superseded" | "late_arrival";
}

export interface WorkerRuntimeOptions {
  role?: WorkerRole;
  supportedRoles?: WorkerRole[];
  capabilities?: string[];
  maxConcurrentTasks?: number;
}

interface ActiveTaskRecord {
  controller: AbortController;
  task: WorkerTaskRequest;
  startedAt: number;
  terminalEmitted: boolean;
}

type WorkerMessageHandler = (event: MessageEvent<unknown>) => void;

const DEFAULT_MAX_CONCURRENT_TASKS = 1;

const globalScope: DedicatedWorkerGlobalScope | undefined =
  typeof self !== "undefined" &&
    typeof (self as DedicatedWorkerGlobalScope).postMessage === "function"
    ? (self as DedicatedWorkerGlobalScope)
    : undefined;

const activeTasks = new Map<string, ActiveTaskRecord>();
const handlers = new Map<string, WorkerTaskHandler>();
const latestRevisionByTaskType = new Map<
  string,
  { sceneRevision: number; clientRevision: number }
>();
const extensionHandlers = new Set<WorkerMessageHandler>();

let runtimeRole: WorkerRole = "default";
let runtimeCapabilities: string[] = [];
let runtimeSupportedRoles: WorkerRole[] = ["default"];
let runtimeMaxConcurrentTasks = DEFAULT_MAX_CONCURRENT_TASKS;
let runtimeBootstrapped = false;
let runtimeMessageListenerInstalled = false;
let runtimeShutdownRequested = false;
let runtimeFallbackEnabled = false;
let runtimeFallbackReason: RuntimeFallbackReason | undefined;
let runtimeFallbackSource = "runtime";
let runtimeFallbackVersion = WORKER_PROTOCOL_VERSION.toString();
let runtimeFallbackLogger:
  | ((reason: RuntimeFallbackReason, details?: string) => void)
  | undefined;

export const createWorkerTaskId = () =>
  `wk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;

export const registerWorkerTask = <TPayload, TResult>(
  taskType: string,
  handler: WorkerTaskHandler<TPayload, TResult>,
) => {
  handlers.set(taskType, handler as WorkerTaskHandler);
};

export const unregisterWorkerTask = (taskType: string) => {
  handlers.delete(taskType);
};

export const registerWorkerMessageHandler = (handler: WorkerMessageHandler) => {
  extensionHandlers.add(handler);
  return () => extensionHandlers.delete(handler);
};

export const isTaskStale = (
  taskType: string,
  sceneRevision: number,
  clientRevision: number,
) => {
  const latest = latestRevisionByTaskType.get(taskType);
  if (!latest) return false;
  return (
    sceneRevision < latest.sceneRevision ||
    (sceneRevision === latest.sceneRevision &&
      clientRevision < latest.clientRevision)
  );
};

const postEnvelope = (envelope: WorkerEnvelope) => {
  globalScope?.postMessage(envelope);
};

const emitReady = () => {
  if (!globalScope || runtimeBootstrapped) return;

  runtimeBootstrapped = true;
  postEnvelope(
    createWorkerReadyEnvelope("runtime", {
      roles: runtimeSupportedRoles,
      capabilities: runtimeCapabilities,
      atMs: Date.now(),
    }),
  );
};

const emitFallbackNotice = (reason: RuntimeFallbackReason, message: string) => {
  runtimeFallbackReason = reason;
  runtimeFallbackEnabled = true;
  runtimeFallbackLogger?.(reason, message);

  if (!globalScope) return;

  postEnvelope({
    protocol: WORKER_PROTOCOL_NAME,
    version: WORKER_PROTOCOL_VERSION,
    kind: WORKER_MESSAGE_KIND.Fallback,
    channel: "worker-to-pool",
    requestId: createWorkerTaskId(),
    type: "runtime",
    payload: {
      message,
      fallback: true,
      reason,
      source: runtimeFallbackSource,
      version: runtimeFallbackVersion,
    },
    fallback: {
      usedFallback: true,
      fallbackReason: reason,
      fallbackSource: runtimeFallbackSource,
      fallbackVersion: runtimeFallbackVersion,
    },
  } as WorkerEnvelope);
};

const emitShutdownSafeCancelled = (
  task: WorkerTaskRequest,
  cancelledAt: number,
  reason: string,
) => {
  if (runtimeShutdownRequested) {
    return;
  }

  emitCancelled(task, cancelledAt, reason);
};

const emitCancelled = (
  task: WorkerTaskRequest,
  cancelledAt: number,
  reason?: string,
) => {
  postEnvelope(
    createWorkerTaskCancelledEnvelope(task.requestId, task.taskType, {
      sceneRevision: task.sceneRevision,
      clientRevision: task.clientRevision,
      role: task.role ?? runtimeRole,
      cancelledAtMs: cancelledAt,
      reason,
    }),
  );
};

const emitStale = (
  task: WorkerTaskRequest,
  staleAt: number,
  reason: WorkerTaskStale["reason"],
) => {
  postEnvelope(
    createWorkerTaskStaleEnvelope(task.requestId, task.taskType, reason, {
      sceneRevision: task.sceneRevision,
      clientRevision: task.clientRevision,
      role: task.role ?? runtimeRole,
      staleAtMs: staleAt,
    }),
  );
};

const emitError = (
  task: WorkerTaskRequest,
  error: unknown,
  failedAt: number,
) => {
  const normalized =
    error instanceof Error
      ? {
        message: error.message,
        name: error.name,
        stack: error.stack,
      }
      : {
        message: typeof error === "string" ? error : "Worker task failed",
      };

  postEnvelope(
    createWorkerTaskErrorEnvelope(task.requestId, task.taskType, normalized, {
      sceneRevision: task.sceneRevision,
      clientRevision: task.clientRevision,
      role: task.role ?? runtimeRole,
      failedAtMs: failedAt,
    }),
  );
};

const markRevision = (task: WorkerTaskRequest) => {
  latestRevisionByTaskType.set(task.taskType, {
    sceneRevision: task.sceneRevision,
    clientRevision: task.clientRevision,
  });
};

const handleTask = async (task: WorkerTaskRequest) => {
  const handler = handlers.get(task.taskType);
  const now = Date.now();

  if (!handler) {
    emitError(
      task,
      new Error(
        `No worker handler registered for task type "${task.taskType}"`,
      ),
      now,
    );
    return;
  }

  if (isTaskStale(task.taskType, task.sceneRevision, task.clientRevision)) {
    emitStale(task, now, "revision_mismatch");
    return;
  }

  if (activeTasks.size >= runtimeMaxConcurrentTasks) {
    emitFallbackNotice(
      "capacity_exceeded",
      `Runtime at capacity while handling ${task.taskType}`,
    );
    emitError(task, new Error("Worker runtime is at capacity"), now);
    return;
  }

  const controller = new AbortController();
  const record: ActiveTaskRecord = {
    controller,
    task,
    startedAt: now,
    terminalEmitted: false,
  };
  activeTasks.set(task.requestId, record);
  markRevision(task);

  const context: WorkerTaskContext = {
    requestId: task.requestId,
    taskType: task.taskType,
    sceneRevision: task.sceneRevision,
    clientRevision: task.clientRevision,
    role: task.role ?? runtimeRole,
    priority: task.priority ?? 0,
    createdAt: task.createdAt,
    cancelled: false,
    signal: controller.signal,
    isStale: () =>
      isTaskStale(task.taskType, task.sceneRevision, task.clientRevision),
  };

  const emitTerminalOnce = () => {
    const active = activeTasks.get(task.requestId);
    if (!active || active.terminalEmitted) {
      return false;
    }
    active.terminalEmitted = true;
    activeTasks.delete(task.requestId);
    return true;
  };

  try {
    const result = await handler(task.payload, context);

    if (controller.signal.aborted || context.isStale()) {
      if (emitTerminalOnce()) {
        emitStale(
          task,
          Date.now(),
          controller.signal.aborted ? "superseded" : "late_arrival",
        );
      }
      return;
    }

    if (task.silent) {
      if (emitTerminalOnce()) {
        // Silent success - do not post message back to main thread
      }
      return;
    }

    if (emitTerminalOnce()) {
      postEnvelope(
        createWorkerResultEnvelope(task.taskType, task.requestId, result, {
          sceneRevision: task.sceneRevision,
          clientRevision: task.clientRevision,
          role: task.role ?? runtimeRole,
          completedAtMs: Date.now(),
          durationMs: Date.now() - record.startedAt,
        }),
      );
    }
  } catch (error) {
    if (controller.signal.aborted) {
      if (emitTerminalOnce()) {
        emitCancelled(task, Date.now(), "cancelled");
      }
      return;
    }

    if (emitTerminalOnce()) {
      emitError(task, error, Date.now());
    }
  } finally {
    const active = activeTasks.get(task.requestId);
    if (active && !active.terminalEmitted) {
      activeTasks.delete(task.requestId);
    }
  }
};

const cancelTask = (requestId: string, reason?: string) => {
  const active = activeTasks.get(requestId);
  if (!active || active.terminalEmitted) return false;

  active.terminalEmitted = true;
  active.controller.abort(reason);
  emitCancelled(active.task, Date.now(), reason);
  activeTasks.delete(requestId);
  return true;
};

const handleEnvelope = (envelope: WorkerEnvelope) => {
  if (
    envelope.kind === WORKER_MESSAGE_KIND.Task ||
    envelope.kind === WORKER_MESSAGE_KIND.Request
  ) {
    const taskEnvelope = envelope as any;
    void handleTask({
      requestId: taskEnvelope.requestId,
      taskType: taskEnvelope.type,
      payload: taskEnvelope.payload,
      sceneRevision: taskEnvelope.sceneRevision,
      clientRevision: taskEnvelope.clientRevision,
      role: (taskEnvelope.role as WorkerRole | undefined) ?? runtimeRole,
      priority: taskEnvelope.priority,
      silent: !!taskEnvelope.silent,
      createdAt: taskEnvelope.createdAtMs,
    });
    return;
  }

  if (envelope.kind === WORKER_MESSAGE_KIND.Cancel) {
    const cancelEnvelope = envelope as WorkerCancelEnvelope;
    cancelTask(cancelEnvelope.targetRequestId, cancelEnvelope.reason);
    return;
  }

  if (envelope.kind === WORKER_MESSAGE_KIND.Ping) {
    postEnvelope({
      protocol: WORKER_PROTOCOL_NAME,
      version: WORKER_PROTOCOL_VERSION,
      kind: WORKER_MESSAGE_KIND.Pong,
      channel: "worker-to-pool",
      requestId: envelope.requestId,
      atMs: Date.now(),
    } satisfies WorkerPongEnvelope);
    return;
  }

  if (envelope.kind === WORKER_MESSAGE_KIND.Shutdown) {
    runtimeShutdownRequested = true;
    for (const [requestId, active] of activeTasks) {
      active.terminalEmitted = true;
      active.controller.abort("shutdown");
      emitShutdownSafeCancelled(active.task, Date.now(), "shutdown");
      activeTasks.delete(requestId);
    }
    return;
  }

  for (const handler of extensionHandlers) {
    handler({ data: envelope } as MessageEvent<unknown>);
  }
};

export const configureWorkerRuntime = (options: WorkerRuntimeOptions = {}) => {
  runtimeRole = options.role ?? runtimeRole;
  runtimeCapabilities = options.capabilities ?? runtimeCapabilities;
  runtimeSupportedRoles = options.supportedRoles ?? runtimeSupportedRoles;
  runtimeMaxConcurrentTasks =
    options.maxConcurrentTasks ?? DEFAULT_MAX_CONCURRENT_TASKS;

  emitReady();
};

export const configureWorkerRuntimeFallback = (
  options: {
    enabled?: boolean;
    reason?: RuntimeFallbackReason;
    source?: string;
    version?: string;
    logger?: (reason: RuntimeFallbackReason, details?: string) => void;
  } = {},
) => {
  runtimeFallbackEnabled = options.enabled ?? runtimeFallbackEnabled;
  runtimeFallbackReason = options.reason ?? runtimeFallbackReason;
  runtimeFallbackSource = options.source ?? runtimeFallbackSource;
  runtimeFallbackVersion = options.version ?? runtimeFallbackVersion;
  runtimeFallbackLogger = options.logger ?? runtimeFallbackLogger;
};

export const getWorkerRuntimeState = () => ({
  role: runtimeRole,
  capabilities: [...runtimeCapabilities],
  supportedRoles: [...runtimeSupportedRoles],
  maxConcurrentTasks: runtimeMaxConcurrentTasks,
  activeTaskCount: activeTasks.size,
  fallbackEnabled: runtimeFallbackEnabled,
  fallbackReason: runtimeFallbackReason,
  fallbackSource: runtimeFallbackSource,
  fallbackVersion: runtimeFallbackVersion,
});

const WORKER_RUNTIME_PROFILER_THRESHOLD_MS = 50;

export const initWorkerRuntime = (options: WorkerRuntimeOptions = {}) => {
  // Detect role from URL if available
  if (globalScope && (globalScope as any).location?.search) {
    const params = new URLSearchParams((globalScope as any).location.search);
    const urlRole = params.get("role") as WorkerRole;
    if (urlRole) {
      options.role = urlRole;
      options.supportedRoles = [urlRole];
    }
  }

  configureWorkerRuntime(options);

  if (!globalScope) {
    emitFallbackNotice(
      "unsupported_environment",
      "Workers are not available in this environment",
    );
    return;
  }

  if (runtimeMessageListenerInstalled) return;

  runtimeMessageListenerInstalled = true;
  const addMessageListener = (
    globalScope as unknown as {
      addEventListener: (
        type: "message",
        listener: (event: MessageEvent<unknown>) => void,
      ) => void;
    }
  ).addEventListener.bind(globalScope);

  addMessageListener("message", (event: MessageEvent<unknown>) => {
    const startMs = performance.now();
    try {
      const envelope = event.data;
      if (!isSharedWorkerEnvelope(envelope)) {
        for (const handler of extensionHandlers) {
          handler(event);
        }
        return;
      }

      handleEnvelope(envelope as WorkerEnvelope);
    } finally {
      const duration = performance.now() - startMs;
      if (duration >= WORKER_RUNTIME_PROFILER_THRESHOLD_MS) {
        const kind = (event.data as WorkerEnvelope | undefined)?.kind ?? "unknown";
        console.warn(
          `[WorkerRuntimeProfiler] message handler (${kind}) took ${duration.toFixed(1)}ms`,
        );
      }
    }
  });

  emitReady();
};

export const recoverWorkerRuntimeAfterCrash = (reason = "worker crash") => {
  emitFallbackNotice("worker_crash", reason);
  runtimeMessageListenerInstalled = false;
  runtimeBootstrapped = false;
};

if (globalScope) {
  initWorkerRuntime();
}
