export const WORKER_PROTOCOL_NAME =
  "villaggio-terrace-worker-protocol" as const;
export const WORKER_PROTOCOL_VERSION = 2 as const;

export const WORKER_MESSAGE_KIND = {
  Request: "request",
  Result: "result",
  Cancel: "cancel",
  Fallback: "fallback",
  Ready: "ready",
  Ping: "ping",
  Pong: "pong",
  Shutdown: "shutdown",
  Error: "error",
  Cancelled: "cancelled",
  Stale: "stale",
  Task: "task",
} as const;

export type WorkerMessageKind =
  (typeof WORKER_MESSAGE_KIND)[keyof typeof WORKER_MESSAGE_KIND];

export type WorkerProtocolVersion = typeof WORKER_PROTOCOL_VERSION;

export type WorkerRequestId = string;

export interface WorkerProtocolHeader {
  protocol: typeof WORKER_PROTOCOL_NAME;
  version: WorkerProtocolVersion;
}

export interface WorkerEnvelopeBase extends WorkerProtocolHeader {
  requestId: WorkerRequestId;
  kind: WorkerMessageKind;
  /**
   * `channel` identifies the logical direction:
   * - `pool-to-worker`: pool/runtime control messages and task dispatch
   * - `worker-to-pool`: worker telemetry and task outcomes
   * - `shared`: protocol-neutral metadata or compatibility-only traffic
   */
  channel: "pool-to-worker" | "worker-to-pool" | "shared";
}

export interface WorkerCancellationMetadata {
  canceled: boolean;
  canceledAtMs?: number;
  cancelReason?: string;
  canceledBy?: "user" | "system" | "timeout" | "navigation" | "unknown";
}

export interface WorkerFallbackMetadata {
  usedFallback: boolean;
  fallbackReason?: string;
  fallbackSource?: string;
  fallbackVersion?: string;
}

export interface WorkerCapabilityEnvelope extends WorkerProtocolHeader {
  capabilities: string[];
  supportedKinds: WorkerMessageKind[];
  supportsCancellation: boolean;
  supportsFallback: boolean;
  supportsTypedResults: boolean;
  minCompatibleVersion?: number;
  maxCompatibleVersion?: number;
}

export interface WorkerTaskRequestEnvelope<
  TType extends string = string,
  TPayload = unknown,
> extends WorkerEnvelopeBase {
  kind: typeof WORKER_MESSAGE_KIND.Task;
  channel: "pool-to-worker";
  type: TType;
  payload: TPayload;
  sceneRevision: number;
  clientRevision: number;
  role?: string;
  priority?: number;
  silent?: boolean;
  createdAtMs: number;
  cancellation?: WorkerCancellationMetadata;
  fallback?: WorkerFallbackMetadata;
}

export interface WorkerResultEnvelope<
  TType extends string = string,
  TResult = unknown,
  TError = unknown,
> extends WorkerEnvelopeBase {
  kind: typeof WORKER_MESSAGE_KIND.Result;
  channel: "worker-to-pool";
  type: TType;
  requestId: WorkerRequestId;
  ok: true;
  result: TResult;
  error?: never;
  sceneRevision: number;
  clientRevision: number;
  role?: string;
  completedAtMs: number;
  durationMs?: number;
  cancellation?: WorkerCancellationMetadata;
  fallback?: WorkerFallbackMetadata;
}

export interface WorkerResultErrorEnvelope<
  TType extends string = string,
  TError = unknown,
> extends WorkerEnvelopeBase {
  kind: typeof WORKER_MESSAGE_KIND.Result;
  channel: "worker-to-pool";
  type: TType;
  requestId: WorkerRequestId;
  ok: false;
  result?: never;
  error: TError;
  sceneRevision: number;
  clientRevision: number;
  role?: string;
  completedAtMs: number;
  durationMs?: number;
  cancellation?: WorkerCancellationMetadata;
  fallback?: WorkerFallbackMetadata;
}

export interface WorkerResultErrorEnvelope<
  TType extends string = string,
  TError = unknown,
> extends WorkerEnvelopeBase {
  kind: typeof WORKER_MESSAGE_KIND.Result;
  channel: "worker-to-pool";
  type: TType;
  requestId: WorkerRequestId;
  ok: false;
  result?: never;
  error: TError;
  sceneRevision: number;
  clientRevision: number;
  role?: string;
  completedAtMs: number;
  durationMs?: number;
  cancellation?: WorkerCancellationMetadata;
  fallback?: WorkerFallbackMetadata;
}

export interface WorkerRequestEnvelope<
  TType extends string = string,
  TPayload = unknown,
> extends WorkerEnvelopeBase {
  kind: typeof WORKER_MESSAGE_KIND.Request;
  channel: "pool-to-worker";
  type: TType;
  payload: TPayload;
  sceneRevision: number;
  clientRevision: number;
  role?: string;
  priority?: number;
  createdAtMs: number;
  cancellation?: WorkerCancellationMetadata;
  fallback?: WorkerFallbackMetadata;
}

export interface WorkerCancelEnvelope extends WorkerEnvelopeBase {
  kind: typeof WORKER_MESSAGE_KIND.Cancel;
  channel: "pool-to-worker";
  targetRequestId: WorkerRequestId;
  sceneRevision?: number;
  clientRevision?: number;
  reason?: string;
  cancellation: WorkerCancellationMetadata;
}

export interface WorkerLifecycleEnvelope extends WorkerEnvelopeBase {
  requestId: WorkerRequestId;
  atMs: number;
}

export interface WorkerFallbackEnvelope<
  TType extends string = string,
  TPayload = unknown,
> extends WorkerEnvelopeBase {
  kind: typeof WORKER_MESSAGE_KIND.Fallback;
  channel: "worker-to-pool";
  type: TType;
  payload: TPayload;
  sceneRevision?: number;
  clientRevision?: number;
  role?: string;
  fallback: WorkerFallbackMetadata;
}

export interface WorkerReadyEnvelope extends WorkerLifecycleEnvelope {
  kind: typeof WORKER_MESSAGE_KIND.Ready;
  channel: "worker-to-pool";
  roles: string[];
  capabilities: string[];
}

export interface WorkerPingEnvelope extends WorkerLifecycleEnvelope {
  kind: typeof WORKER_MESSAGE_KIND.Ping;
  channel: "pool-to-worker";
}

export interface WorkerPongEnvelope extends WorkerLifecycleEnvelope {
  kind: typeof WORKER_MESSAGE_KIND.Pong;
  channel: "worker-to-pool";
}

export interface WorkerShutdownEnvelope extends WorkerLifecycleEnvelope {
  kind: typeof WORKER_MESSAGE_KIND.Shutdown;
  channel: "pool-to-worker";
}

export interface WorkerTaskErrorDetails {
  message: string;
  name?: string;
  stack?: string;
  code?: string;
}

export interface WorkerTaskErrorEnvelope extends WorkerEnvelopeBase {
  kind: typeof WORKER_MESSAGE_KIND.Error;
  channel: "worker-to-pool";
  error: {
    requestId: WorkerRequestId;
    taskType: string;
    status: "failed";
    error: WorkerTaskErrorDetails;
    sceneRevision: number;
    clientRevision: number;
    role?: string;
    failedAtMs: number;
  };
}

export interface WorkerTaskCancelledEnvelope extends WorkerEnvelopeBase {
  kind: typeof WORKER_MESSAGE_KIND.Cancelled;
  channel: "worker-to-pool";
  cancelled: {
    requestId: WorkerRequestId;
    taskType: string;
    status: "cancelled";
    sceneRevision: number;
    clientRevision: number;
    role?: string;
    cancelledAtMs: number;
    reason?: string;
  };
}

export interface WorkerTaskStale {
  requestId: string;
  taskType: string;
  status: "stale";
  sceneRevision: number;
  clientRevision: number;
  role?: string;
  staleAtMs: number;
  reason: "revision_mismatch" | "superseded" | "late_arrival";
}

/**
 * SIMULATION TASK TYPES
 */
export const SIMULATION_TASK_TYPE = {
  CheckPlacement: "simulation/check-placement",
  ResolveOverlaps: "simulation/resolve-overlaps",
  SyncSpatialHash: "simulation/sync-spatial-hash",
} as const;

export type SimulationTaskType =
  (typeof SIMULATION_TASK_TYPE)[keyof typeof SIMULATION_TASK_TYPE];

export interface CheckPlacementPayload {
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
  ignoreId?: string;
}

export interface CheckPlacementResult {
  isValid: boolean;
  reason?: string;
  collidingId?: string;
}

export interface SyncSpatialHashPayload {
  clear?: boolean;
  inserts?: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
  removes?: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
}

export interface ResolveOverlapsPayload {
  shapes: Array<{
    id: string;
    position: [number, number];
    size: [number, number];
  }>;
}

export interface ResolveOverlapsResult {
  patches: Array<{
    id: string;
    position: [number, number];
  }>;
}

export interface WorkerTaskStaleEnvelope extends WorkerEnvelopeBase {
  kind: typeof WORKER_MESSAGE_KIND.Stale;
  channel: "worker-to-pool";
  stale: WorkerTaskStale;
}

export type WorkerEnvelope<
  TRequestType extends string = string,
  TPayload = unknown,
  TResult = unknown,
  TError = unknown,
> =
  | WorkerRequestEnvelope<TRequestType, TPayload>
  | WorkerResultEnvelope<TRequestType, TResult, TError>
  | WorkerResultErrorEnvelope<TRequestType, TError>
  | WorkerCancelEnvelope
  | WorkerFallbackEnvelope<TRequestType, TPayload>
  | WorkerReadyEnvelope
  | WorkerPingEnvelope
  | WorkerPongEnvelope
  | WorkerShutdownEnvelope
  | WorkerTaskErrorEnvelope
  | WorkerTaskCancelledEnvelope
  | WorkerTaskStaleEnvelope
  | WorkerTaskRequestEnvelope<TRequestType, TPayload>;

export interface WorkerRequestContext {
  requestId: WorkerRequestId;
  startedAtMs: number;
  signal?: AbortSignal;
  cancellation?: WorkerCancellationMetadata;
  fallback?: WorkerFallbackMetadata;
}

export interface WorkerProtocolCapabilities {
  protocol: typeof WORKER_PROTOCOL_NAME;
  version: WorkerProtocolVersion;
  supportsCancellation: boolean;
  supportsFallback: boolean;
  supportsTypedResults: boolean;
  supportedKinds: WorkerMessageKind[];
  minCompatibleVersion?: number;
  maxCompatibleVersion?: number;
}

export const DEFAULT_WORKER_PROTOCOL_CAPABILITIES: WorkerProtocolCapabilities =
  {
    protocol: WORKER_PROTOCOL_NAME,
    version: WORKER_PROTOCOL_VERSION,
    supportsCancellation: true,
    supportsFallback: true,
    supportsTypedResults: true,
    supportedKinds: [
      WORKER_MESSAGE_KIND.Request,
      WORKER_MESSAGE_KIND.Result,
      WORKER_MESSAGE_KIND.Cancel,
      WORKER_MESSAGE_KIND.Fallback,
      WORKER_MESSAGE_KIND.Ready,
      WORKER_MESSAGE_KIND.Ping,
      WORKER_MESSAGE_KIND.Pong,
      WORKER_MESSAGE_KIND.Shutdown,
      WORKER_MESSAGE_KIND.Error,
      WORKER_MESSAGE_KIND.Cancelled,
      WORKER_MESSAGE_KIND.Stale,
      WORKER_MESSAGE_KIND.Task,
    ],
    minCompatibleVersion: 1,
    maxCompatibleVersion: WORKER_PROTOCOL_VERSION,
  } as const;

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object";

export function isWorkerMessageBase(
  value: unknown,
): value is WorkerEnvelopeBase {
  if (!isObject(value)) {
    return false;
  }

  const candidate = value as Partial<WorkerEnvelopeBase>;
  return (
    candidate.protocol === WORKER_PROTOCOL_NAME &&
    typeof candidate.version === "number" &&
    typeof candidate.requestId === "string" &&
    typeof candidate.kind === "string" &&
    typeof candidate.channel === "string"
  );
}

export function isWorkerCompatibleVersion(
  version: unknown,
): version is WorkerProtocolVersion {
  return (
    typeof version === "number" &&
    version >= DEFAULT_WORKER_PROTOCOL_CAPABILITIES.minCompatibleVersion! &&
    version <= DEFAULT_WORKER_PROTOCOL_CAPABILITIES.maxCompatibleVersion!
  );
}

export function isWorkerEnvelope(value: unknown): value is WorkerEnvelope {
  return isWorkerMessageBase(value) && isWorkerCompatibleVersion(value.version);
}

export function createWorkerRequestEnvelope<TType extends string, TPayload>(
  type: TType,
  requestId: WorkerRequestId,
  payload: TPayload,
  options: {
    createdAtMs?: number;
    sceneRevision?: number;
    clientRevision?: number;
    role?: string;
    priority?: number;
    cancellation?: WorkerCancellationMetadata;
    fallback?: WorkerFallbackMetadata;
  } = {},
): WorkerRequestEnvelope<TType, TPayload> {
  return {
    protocol: WORKER_PROTOCOL_NAME,
    version: WORKER_PROTOCOL_VERSION,
    kind: WORKER_MESSAGE_KIND.Request,
    channel: "pool-to-worker",
    type,
    requestId,
    payload,
    sceneRevision: options.sceneRevision ?? 0,
    clientRevision: options.clientRevision ?? 0,
    role: options.role,
    priority: options.priority,
    createdAtMs: options.createdAtMs ?? Date.now(),
    cancellation: options.cancellation,
    fallback: options.fallback,
  };
}

export function createWorkerTaskEnvelope<TType extends string, TPayload>(
  type: TType,
  requestId: WorkerRequestId,
  payload: TPayload,
  options: {
    createdAtMs?: number;
    sceneRevision?: number;
    clientRevision?: number;
    role?: string;
    priority?: number;
    cancellation?: WorkerCancellationMetadata;
    fallback?: WorkerFallbackMetadata;
  } = {},
): WorkerTaskRequestEnvelope<TType, TPayload> {
  return {
    protocol: WORKER_PROTOCOL_NAME,
    version: WORKER_PROTOCOL_VERSION,
    kind: WORKER_MESSAGE_KIND.Task,
    channel: "pool-to-worker",
    type,
    requestId,
    payload,
    sceneRevision: options.sceneRevision ?? 0,
    clientRevision: options.clientRevision ?? 0,
    role: options.role,
    priority: options.priority,
    createdAtMs: options.createdAtMs ?? Date.now(),
    cancellation: options.cancellation,
    fallback: options.fallback,
  };
}

export function createWorkerResultEnvelope<TType extends string, TResult>(
  type: TType,
  requestId: WorkerRequestId,
  result: TResult,
  options: {
    sceneRevision?: number;
    clientRevision?: number;
    role?: string;
    completedAtMs?: number;
    durationMs?: number;
    cancellation?: WorkerCancellationMetadata;
    fallback?: WorkerFallbackMetadata;
  } = {},
): WorkerResultEnvelope<TType, TResult> {
  return {
    protocol: WORKER_PROTOCOL_NAME,
    version: WORKER_PROTOCOL_VERSION,
    kind: WORKER_MESSAGE_KIND.Result,
    channel: "worker-to-pool",
    type,
    requestId,
    ok: true,
    result,
    sceneRevision: options.sceneRevision ?? 0,
    clientRevision: options.clientRevision ?? 0,
    role: options.role,
    completedAtMs: options.completedAtMs ?? Date.now(),
    durationMs: options.durationMs,
    cancellation: options.cancellation,
    fallback: options.fallback,
  };
}

export function createWorkerResultErrorEnvelope<TType extends string, TError>(
  type: TType,
  requestId: WorkerRequestId,
  error: TError,
  options: {
    sceneRevision?: number;
    clientRevision?: number;
    role?: string;
    completedAtMs?: number;
    durationMs?: number;
    cancellation?: WorkerCancellationMetadata;
    fallback?: WorkerFallbackMetadata;
  } = {},
): WorkerResultErrorEnvelope<TType, TError> {
  return {
    protocol: WORKER_PROTOCOL_NAME,
    version: WORKER_PROTOCOL_VERSION,
    kind: WORKER_MESSAGE_KIND.Result,
    channel: "worker-to-pool",
    type,
    requestId,
    ok: false,
    error,
    sceneRevision: options.sceneRevision ?? 0,
    clientRevision: options.clientRevision ?? 0,
    role: options.role,
    completedAtMs: options.completedAtMs ?? Date.now(),
    durationMs: options.durationMs,
    cancellation: options.cancellation,
    fallback: options.fallback,
  };
}

export function createWorkerCancelEnvelope(
  requestId: WorkerRequestId,
  options: {
    targetRequestId?: WorkerRequestId;
    sceneRevision?: number;
    clientRevision?: number;
    reason?: string;
    cancellation?: WorkerCancellationMetadata;
  } = {},
): WorkerCancelEnvelope {
  return {
    protocol: WORKER_PROTOCOL_NAME,
    version: WORKER_PROTOCOL_VERSION,
    kind: WORKER_MESSAGE_KIND.Cancel,
    channel: "pool-to-worker",
    requestId,
    targetRequestId: options.targetRequestId ?? requestId,
    sceneRevision: options.sceneRevision,
    clientRevision: options.clientRevision,
    reason: options.reason,
    cancellation: options.cancellation ?? {
      canceled: true,
      cancelReason: options.reason,
    },
  };
}

export function createWorkerFallbackEnvelope<TType extends string, TPayload>(
  type: TType,
  requestId: WorkerRequestId,
  payload: TPayload,
  options: {
    sceneRevision?: number;
    clientRevision?: number;
    role?: string;
    fallback?: WorkerFallbackMetadata;
  } = {},
): WorkerFallbackEnvelope<TType, TPayload> {
  return {
    protocol: WORKER_PROTOCOL_NAME,
    version: WORKER_PROTOCOL_VERSION,
    kind: WORKER_MESSAGE_KIND.Fallback,
    channel: "worker-to-pool",
    type,
    requestId,
    payload,
    sceneRevision: options.sceneRevision,
    clientRevision: options.clientRevision,
    role: options.role,
    fallback:
      options.fallback ??
      ({
        usedFallback: true,
      } as WorkerFallbackMetadata),
  };
}

export function createWorkerReadyEnvelope(
  requestId: WorkerRequestId,
  options: {
    roles?: string[];
    capabilities?: string[];
    atMs?: number;
  } = {},
): WorkerReadyEnvelope {
  return {
    protocol: WORKER_PROTOCOL_NAME,
    version: WORKER_PROTOCOL_VERSION,
    kind: WORKER_MESSAGE_KIND.Ready,
    channel: "worker-to-pool",
    requestId,
    roles: options.roles ?? [],
    capabilities: options.capabilities ?? [],
    atMs: options.atMs ?? Date.now(),
  };
}

export function createWorkerPingEnvelope(
  requestId: WorkerRequestId,
  options: { atMs?: number } = {},
): WorkerPingEnvelope {
  return {
    protocol: WORKER_PROTOCOL_NAME,
    version: WORKER_PROTOCOL_VERSION,
    kind: WORKER_MESSAGE_KIND.Ping,
    channel: "pool-to-worker",
    requestId,
    atMs: options.atMs ?? Date.now(),
  };
}

export function createWorkerPongEnvelope(
  requestId: WorkerRequestId,
  options: { atMs?: number } = {},
): WorkerPongEnvelope {
  return {
    protocol: WORKER_PROTOCOL_NAME,
    version: WORKER_PROTOCOL_VERSION,
    kind: WORKER_MESSAGE_KIND.Pong,
    channel: "worker-to-pool",
    requestId,
    atMs: options.atMs ?? Date.now(),
  };
}

export function createWorkerShutdownEnvelope(
  requestId: WorkerRequestId,
  options: { atMs?: number } = {},
): WorkerShutdownEnvelope {
  return {
    protocol: WORKER_PROTOCOL_NAME,
    version: WORKER_PROTOCOL_VERSION,
    kind: WORKER_MESSAGE_KIND.Shutdown,
    channel: "pool-to-worker",
    requestId,
    atMs: options.atMs ?? Date.now(),
  };
}

export function createWorkerTaskErrorEnvelope(
  requestId: WorkerRequestId,
  taskType: string,
  error: WorkerTaskErrorDetails,
  options: {
    sceneRevision?: number;
    clientRevision?: number;
    role?: string;
    failedAtMs?: number;
  } = {},
): WorkerTaskErrorEnvelope {
  return {
    protocol: WORKER_PROTOCOL_NAME,
    version: WORKER_PROTOCOL_VERSION,
    kind: WORKER_MESSAGE_KIND.Error,
    channel: "worker-to-pool",
    requestId,
    error: {
      requestId,
      taskType,
      status: "failed",
      error,
      sceneRevision: options.sceneRevision ?? 0,
      clientRevision: options.clientRevision ?? 0,
      role: options.role,
      failedAtMs: options.failedAtMs ?? Date.now(),
    },
  };
}

export function createWorkerTaskCancelledEnvelope(
  requestId: WorkerRequestId,
  taskType: string,
  options: {
    sceneRevision?: number;
    clientRevision?: number;
    role?: string;
    cancelledAtMs?: number;
    reason?: string;
  } = {},
): WorkerTaskCancelledEnvelope {
  return {
    protocol: WORKER_PROTOCOL_NAME,
    version: WORKER_PROTOCOL_VERSION,
    kind: WORKER_MESSAGE_KIND.Cancelled,
    channel: "worker-to-pool",
    requestId,
    cancelled: {
      requestId,
      taskType,
      status: "cancelled",
      sceneRevision: options.sceneRevision ?? 0,
      clientRevision: options.clientRevision ?? 0,
      role: options.role,
      cancelledAtMs: options.cancelledAtMs ?? Date.now(),
      reason: options.reason,
    },
  };
}

export function createWorkerTaskStaleEnvelope(
  requestId: WorkerRequestId,
  taskType: string,
  reason: WorkerTaskStaleEnvelope["stale"]["reason"],
  options: {
    sceneRevision?: number;
    clientRevision?: number;
    role?: string;
    staleAtMs?: number;
  } = {},
): WorkerTaskStaleEnvelope {
  return {
    protocol: WORKER_PROTOCOL_NAME,
    version: WORKER_PROTOCOL_VERSION,
    kind: WORKER_MESSAGE_KIND.Stale,
    channel: "worker-to-pool",
    requestId,
    stale: {
      requestId,
      taskType,
      status: "stale",
      sceneRevision: options.sceneRevision ?? 0,
      clientRevision: options.clientRevision ?? 0,
      role: options.role,
      staleAtMs: options.staleAtMs ?? Date.now(),
      reason,
    },
  };
}
