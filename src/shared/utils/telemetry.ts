// Telemetry module for structured performance capture, IndexedDB persistence, local export, and compact analysis.

const getTelemetryEnabled = () => {
  const env = (
    globalThis as unknown as {
      import?: {
        meta?: {
          env?: Record<string, string | boolean | undefined>;
        };
      };
    }
  ).import?.meta?.env;

  const raw = env?.VITE_DEBUGGING ?? env?.VITE_TELEMETRY_ENABLED;
  if (typeof raw === "string") return raw.toLowerCase() === "true";
  if (typeof raw === "boolean") return raw;
  return true;
};

export const DEBUGGING = getTelemetryEnabled();
export const TELEMETRY_ENABLED = DEBUGGING;

export type TelemetrySeverity = "debug" | "info" | "warn" | "error";

export type TelemetryEventKind =
  | "app_start"
  | "app_ready"
  | "session_start"
  | "session_end"
  | "frame_sample"
  | "frame_spike"
  | "react_commit"
  | "store_write"
  | "pointer_move"
  | "pointer_down"
  | "pointer_up"
  | "drag_start"
  | "drag_end"
  | "zoom_start"
  | "zoom_end"
  | "selection_change"
  | "shape_add"
  | "shape_update"
  | "shape_delete"
  | "link_add"
  | "link_delete"
  | "collision_check"
  | "raycast_sample"
  | "render_stats"
  | "memory_sample"
  | "worker_task"
  | "worker_validation"
  | "error";

export interface TelemetryEvent {
  event_id: string;
  session_id: string;
  timestamp_ms: number;
  event_kind: TelemetryEventKind;
  severity: TelemetrySeverity;
  source: string;
  entity_id: string | null;
  scene_object_count: number | null;
  frame_ms: number | null;
  react_commit_ms: number | null;
  draw_calls: number | null;
  store_write_count: number | null;
  raycast_count: number | null;
  memory_mb: number | null;
  notes_key: string | null;
  details: Record<string, unknown> | null;
}

export interface TelemetrySummary {
  session_id: string;
  started_at_ms: number;
  ended_at_ms: number;
  avg_fps: number;
  p95_frame_ms: number;
  max_frame_ms: number;
  avg_react_commit_ms: number;
  max_react_commit_ms: number;
  total_store_writes: number;
  total_raycast_count: number;
  peak_scene_object_count: number;
  peak_memory_mb: number;
  hotspots: string[];
}

export interface TelemetrySession {
  session_id: string;
  started_at_ms: number;
  ended_at_ms: number | null;
  events: TelemetryEvent[];
  summary: TelemetrySummary | null;
}

export interface TelemetryManifestEntry {
  session_id: string;
  started_at_ms: number;
  ended_at_ms: number | null;
  summary_path: string;
  events_path: string;
  event_count: number;
  avg_fps: number | null;
  p95_frame_ms: number | null;
  max_frame_ms: number | null;
  peak_scene_object_count: number | null;
  peak_memory_mb: number | null;
  hotspots: string[];
}

export interface TelemetryManifest {
  version: number;
  updated_at_ms: number;
  sessions: TelemetryManifestEntry[];
}

export interface TelemetryArtifacts {
  manifest: string;
  summary: string;
  events: string;
}

export interface TelemetryPersistResult {
  sessionId: string;
  manifestEntry: TelemetryManifestEntry;
  summary: TelemetrySummary;
  storedEventCount: number;
}

export interface TelemetryStore {
  session: TelemetrySession;
  append: (
    event: Omit<TelemetryEvent, "event_id" | "timestamp_ms" | "session_id"> & {
      timestamp_ms?: number;
      event_id?: string;
    },
  ) => TelemetryEvent;
  markSummary: () => TelemetrySummary;
  resetSession: () => TelemetrySession;
  getEventsByKind: (kind: TelemetryEventKind) => TelemetryEvent[];
  getEventsByRange: (startMs: number, endMs: number) => TelemetryEvent[];
  getEventsByEntity: (entityId: string) => TelemetryEvent[];
  exportJSONL: () => string;
  exportSummaryJSON: () => string;
  exportManifestJSON: () => string;
  exportSessionArtifacts: () => TelemetryArtifacts;
  buildManifestEntry: () => TelemetryManifestEntry;
  persistSessionToIndexedDB: () => Promise<TelemetryPersistResult | null>;
  loadTelemetryManifestFromIndexedDB: () => Promise<TelemetryManifest | null>;
  loadTelemetryEventsFromIndexedDB: (
    sessionId: string,
  ) => Promise<TelemetryEvent[]>;
  markSessionEnded: () => TelemetrySummary;
  isSessionEnded: () => boolean;
  logWorkerTaskTiming: (
    source: string,
    taskName: string,
    durationMs: number,
    queueDepth?: number | null,
  ) => TelemetryEvent;
  logWorkerQueueDepth: (
    source: string,
    queueDepth: number,
    taskName?: string | null,
  ) => TelemetryEvent;
  logWorkerCancellation: (
    source: string,
    taskName: string,
    reason?: string | null,
  ) => TelemetryEvent;
  logWorkerStaleResultRejected: (
    source: string,
    taskName: string,
    staleResultAgeMs?: number | null,
  ) => TelemetryEvent;
  logWorkerFallback: (
    source: string,
    message: string,
    details?: Record<string, unknown> | null,
  ) => TelemetryEvent;
}

const telemetryGuard = () => TELEMETRY_ENABLED;

const TELEMETRY_FOLDER = "telemetry";
const TELEMETRY_MANIFEST_FILE = "manifest.json";
const TELEMETRY_SESSION_PREFIX = "session_";
const TELEMETRY_SUMMARY_SUFFIX = ".summary.json";
const TELEMETRY_EVENTS_SUFFIX = ".jsonl";

const TELEMETRY_DB_NAME = "villaggio-terrace-telemetry";
const TELEMETRY_DB_VERSION = 1;
const TELEMETRY_EVENTS_STORE = "events";
const TELEMETRY_SESSIONS_STORE = "sessions";
const TELEMETRY_MANIFEST_STORE = "manifest";
const TELEMETRY_PERSIST_BATCH_SIZE = 250;

const EVENT_ID_PREFIX = "evt";
const SESSION_ID_PREFIX = "sess";

const now = () => Date.now();

const createId = (prefix: string) => {
  const randomPart = Math.random().toString(36).slice(2, 10);
  const timePart = now().toString(36);
  return `${prefix}_${timePart}_${randomPart}`;
};

const percentile = (values: number[], p: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index];
};

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const max = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce(
    (highest, value) => (value > highest ? value : highest),
    values[0],
  );
};

const safeNumber = (value: unknown): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const createSession = (): TelemetrySession => ({
  session_id: createId(SESSION_ID_PREFIX),
  started_at_ms: now(),
  ended_at_ms: null,
  events: [],
  summary: null,
});

const createTelemetryPaths = (sessionId: string) => ({
  folder: TELEMETRY_FOLDER,
  sessionFolder: `${TELEMETRY_FOLDER}/${TELEMETRY_SESSION_PREFIX}${sessionId}`,
  summaryPath: `${TELEMETRY_FOLDER}/${TELEMETRY_SESSION_PREFIX}${sessionId}${TELEMETRY_SUMMARY_SUFFIX}`,
  eventsPath: `${TELEMETRY_FOLDER}/${TELEMETRY_SESSION_PREFIX}${sessionId}${TELEMETRY_EVENTS_SUFFIX}`,
  manifestPath: `${TELEMETRY_FOLDER}/${TELEMETRY_MANIFEST_FILE}`,
});

type TelemetryDB = IDBDatabase;

const telemetryDbPromise: {
  value: Promise<TelemetryDB> | null;
} = {
  value: null,
};

const openTelemetryDatabase = (): Promise<TelemetryDB> => {
  if (!telemetryGuard()) {
    return Promise.reject(new Error("Telemetry is disabled."));
  }

  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new Error("IndexedDB is not available in this environment."),
    );
  }

  if (!telemetryDbPromise.value) {
    telemetryDbPromise.value = new Promise((resolve, reject) => {
      const request = indexedDB.open(TELEMETRY_DB_NAME, TELEMETRY_DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(TELEMETRY_EVENTS_STORE)) {
          db.createObjectStore(TELEMETRY_EVENTS_STORE, { keyPath: "event_id" });
        }

        if (!db.objectStoreNames.contains(TELEMETRY_SESSIONS_STORE)) {
          db.createObjectStore(TELEMETRY_SESSIONS_STORE, {
            keyPath: "session_id",
          });
        }

        if (!db.objectStoreNames.contains(TELEMETRY_MANIFEST_STORE)) {
          db.createObjectStore(TELEMETRY_MANIFEST_STORE, {
            keyPath: "manifest_id",
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(
          request.error ?? new Error("Failed to open telemetry IndexedDB."),
        );
    });
  }

  return telemetryDbPromise.value;
};

const idbRequest = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed."));
  });

const writeTelemetryRecord = async <T>(
  storeName: string,
  value: T,
): Promise<T> => {
  const db = await openTelemetryDatabase();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  const request = store.put(value as never);
  await idbRequest(request);
  return value;
};

const getTelemetryRecord = async <T>(
  storeName: string,
  key: IDBValidKey,
): Promise<T | undefined> => {
  const db = await openTelemetryDatabase();
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  const request = store.get(key);
  const result = await idbRequest(request);
  return (result as T | undefined) ?? undefined;
};

const getTelemetryRecords = async <T>(storeName: string): Promise<T[]> => {
  const db = await openTelemetryDatabase();
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  const request = store.getAll();
  const result = await idbRequest(request);
  return result as T[];
};

const buildSummary = (session: TelemetrySession): TelemetrySummary => {
  const frameSamples = session.events
    .map((event) => event.frame_ms)
    .filter((value): value is number => typeof value === "number");

  const reactSamples = session.events
    .map((event) => event.react_commit_ms)
    .filter((value): value is number => typeof value === "number");

  const storeWrites = session.events
    .map((event) => event.store_write_count)
    .filter((value): value is number => typeof value === "number");

  const raycasts = session.events
    .map((event) => event.raycast_count)
    .filter((value): value is number => typeof value === "number");

  const sceneCounts = session.events
    .map((event) => event.scene_object_count)
    .filter((value): value is number => typeof value === "number");

  const memorySamples = session.events
    .map((event) => event.memory_mb)
    .filter((value): value is number => typeof value === "number");

  const hotspotKinds = session.events
    .filter((event) => {
      const frame = event.frame_ms ?? 0;
      const commit = event.react_commit_ms ?? 0;
      return frame >= 16.7 || commit >= 8 || event.event_kind === "frame_spike";
    })
    .map((event) => event.event_kind);

  return {
    session_id: session.session_id,
    started_at_ms: session.started_at_ms,
    ended_at_ms: session.ended_at_ms ?? now(),
    avg_fps: frameSamples.length > 0 ? 1000 / average(frameSamples) : 0,
    p95_frame_ms: percentile(frameSamples, 95),
    max_frame_ms: max(frameSamples),
    avg_react_commit_ms: average(reactSamples),
    max_react_commit_ms: max(reactSamples),
    total_store_writes: storeWrites.reduce((sum, value) => sum + value, 0),
    total_raycast_count: raycasts.reduce((sum, value) => sum + value, 0),
    peak_scene_object_count: max(sceneCounts),
    peak_memory_mb: max(memorySamples),
    hotspots: Array.from(new Set(hotspotKinds)).slice(0, 16),
  };
};

const buildManifestEntry = (
  session: TelemetrySession,
  paths = createTelemetryPaths(session.session_id),
): TelemetryManifestEntry => {
  const summary = session.summary ?? buildSummary(session);

  return {
    session_id: session.session_id,
    started_at_ms: session.started_at_ms,
    ended_at_ms: session.ended_at_ms,
    summary_path: paths.summaryPath,
    events_path: paths.eventsPath,
    event_count: session.events.length,
    avg_fps: summary.avg_fps || null,
    p95_frame_ms: summary.p95_frame_ms || null,
    max_frame_ms: summary.max_frame_ms || null,
    peak_scene_object_count: summary.peak_scene_object_count || null,
    peak_memory_mb: summary.peak_memory_mb || null,
    hotspots: summary.hotspots,
  };
};

const buildManifest = (session: TelemetrySession): TelemetryManifest => ({
  version: 1,
  updated_at_ms: now(),
  sessions: [buildManifestEntry(session)],
});

const createPersistedChunkRecord = (
  sessionId: string,
  chunkIndex: number,
  events: TelemetryEvent[],
) => ({
  event_id: `${sessionId}_chunk_${String(chunkIndex).padStart(4, "0")}`,
  session_id: sessionId,
  chunk_index: chunkIndex,
  events,
});

const createStore = (): TelemetryStore => {
  const session = createSession();
  const paths = createTelemetryPaths(session.session_id);
  let persisted = false;
  let persistPromise: Promise<TelemetryPersistResult | null> | null = null;

  const store: TelemetryStore = {
    session,
    append: (event) => {
      if (!telemetryGuard() || session.ended_at_ms !== null) {
        return {
          event_id: event.event_id ?? createId(EVENT_ID_PREFIX),
          session_id: session.session_id,
          timestamp_ms: event.timestamp_ms ?? now(),
          event_kind: event.event_kind,
          severity: event.severity,
          source: event.source,
          entity_id: event.entity_id ?? null,
          scene_object_count: safeNumber(event.scene_object_count),
          frame_ms: safeNumber(event.frame_ms),
          react_commit_ms: safeNumber(event.react_commit_ms),
          draw_calls: safeNumber(event.draw_calls),
          store_write_count: safeNumber(event.store_write_count),
          raycast_count: safeNumber(event.raycast_count),
          memory_mb: safeNumber(event.memory_mb),
          notes_key: event.notes_key ?? null,
          details: event.details ?? null,
        };
      }

      const entry: TelemetryEvent = {
        event_id: event.event_id ?? createId(EVENT_ID_PREFIX),
        session_id: session.session_id,
        timestamp_ms: event.timestamp_ms ?? now(),
        event_kind: event.event_kind,
        severity: event.severity,
        source: event.source,
        entity_id: event.entity_id ?? null,
        scene_object_count: safeNumber(event.scene_object_count),
        frame_ms: safeNumber(event.frame_ms),
        react_commit_ms: safeNumber(event.react_commit_ms),
        draw_calls: safeNumber(event.draw_calls),
        store_write_count: safeNumber(event.store_write_count),
        raycast_count: safeNumber(event.raycast_count),
        memory_mb: safeNumber(event.memory_mb),
        notes_key: event.notes_key ?? null,
        details: event.details ?? null,
      };

      session.events.push(entry);
      return entry;
    },
    markSummary: () => {
      if (session.summary && session.ended_at_ms !== null) {
        return session.summary;
      }

      const summary = buildSummary(session);
      session.summary = summary;
      session.ended_at_ms = now();
      return summary;
    },
    resetSession: () => {
      const next = createSession();
      store.session = next;
      return next;
    },
    getEventsByKind: (kind) =>
      session.events.filter((event) => event.event_kind === kind),
    getEventsByRange: (startMs, endMs) =>
      session.events.filter(
        (event) => event.timestamp_ms >= startMs && event.timestamp_ms <= endMs,
      ),
    getEventsByEntity: (entityId) =>
      session.events.filter((event) => event.entity_id === entityId),
    exportJSONL: () =>
      session.events.map((event) => JSON.stringify(event)).join("\n"),
    exportSummaryJSON: () =>
      JSON.stringify(session.summary ?? buildSummary(session), null, 2),
    exportManifestJSON: () => JSON.stringify(buildManifest(session), null, 2),
    exportSessionArtifacts: () => ({
      manifest: JSON.stringify(buildManifest(session), null, 2),
      summary: JSON.stringify(
        session.summary ?? buildSummary(session),
        null,
        2,
      ),
      events: session.events.map((event) => JSON.stringify(event)).join("\n"),
    }),
    buildManifestEntry: () => buildManifestEntry(session, paths),
    markSessionEnded: () => {
      return store.markSummary();
    },

    isSessionEnded: () => session.ended_at_ms !== null,

    persistSessionToIndexedDB: async () => {
      if (!telemetryGuard() || (persisted && persistPromise)) {
        return persistPromise;
      }

      persistPromise = (async () => {
        const summary = store.markSummary();
        const manifestEntry = buildManifestEntry(session, paths);
        const manifest = buildManifest(session);
        const events = session.events;

        await writeTelemetryRecord(TELEMETRY_SESSIONS_STORE, {
          session_id: session.session_id,
          started_at_ms: session.started_at_ms,
          ended_at_ms: session.ended_at_ms,
          summary,
          event_count: events.length,
        });

        const chunks = chunkArray(events, TELEMETRY_PERSIST_BATCH_SIZE);
        for (let index = 0; index < chunks.length; index += 1) {
          const chunk = chunks[index];
          await writeTelemetryRecord(
            TELEMETRY_EVENTS_STORE,
            createPersistedChunkRecord(session.session_id, index, chunk),
          );
        }

        await writeTelemetryRecord(TELEMETRY_MANIFEST_STORE, {
          manifest_id: "latest",
          ...manifest,
        });

        persisted = true;

        return {
          sessionId: session.session_id,
          manifestEntry,
          summary,
          storedEventCount: events.length,
        };
      })();

      return persistPromise;
    },
    loadTelemetryManifestFromIndexedDB: async () => {
      if (!telemetryGuard()) return null;
      const record = await getTelemetryRecord<
        TelemetryManifest & { manifest_id?: string }
      >(TELEMETRY_MANIFEST_STORE, "latest");
      if (!record) return null;
      const { manifest_id: _manifestId, ...manifest } = record;
      return manifest;
    },
    loadTelemetryEventsFromIndexedDB: async (sessionId: string) => {
      if (!telemetryGuard()) return [];
      const records = await getTelemetryRecords<{
        session_id: string;
        events: TelemetryEvent[];
        chunk_index: number;
      }>(TELEMETRY_EVENTS_STORE);

      return records
        .filter((record) => record.session_id === sessionId)
        .sort((a, b) => a.chunk_index - b.chunk_index)
        .flatMap((record) => record.events);
    },
    logWorkerTaskTiming: (source, taskName, durationMs, queueDepth = null) =>
      logTelemetryEvent({
        event_kind: "worker_task",
        severity: durationMs >= 16.7 ? "warn" : "debug",
        source,
        entity_id: null,
        scene_object_count: queueDepth ?? null,
        frame_ms: durationMs,
        react_commit_ms: null,
        draw_calls: null,
        store_write_count: null,
        raycast_count: null,
        memory_mb: null,
        notes_key: taskName,
        details: { taskName, durationMs, queueDepth },
      }),
    logWorkerQueueDepth: (source, queueDepth, taskName = null) =>
      logTelemetryEvent({
        event_kind: "worker_task",
        severity: queueDepth > 0 ? "info" : "debug",
        source,
        entity_id: null,
        scene_object_count: queueDepth,
        frame_ms: null,
        react_commit_ms: null,
        draw_calls: null,
        store_write_count: null,
        raycast_count: null,
        memory_mb: null,
        notes_key: taskName,
        details: { taskName, queueDepth },
      }),
    logWorkerCancellation: (source, taskName, reason = null) =>
      logTelemetryEvent({
        event_kind: "worker_task",
        severity: "warn",
        source,
        entity_id: null,
        scene_object_count: null,
        frame_ms: null,
        react_commit_ms: null,
        draw_calls: null,
        store_write_count: null,
        raycast_count: null,
        memory_mb: null,
        notes_key: taskName,
        details: { taskName, reason, canceled: true },
      }),
    logWorkerStaleResultRejected: (source, taskName, staleResultAgeMs = null) =>
      logTelemetryEvent({
        event_kind: "worker_validation",
        severity: "warn",
        source,
        entity_id: null,
        scene_object_count: null,
        frame_ms: null,
        react_commit_ms: null,
        draw_calls: null,
        store_write_count: null,
        raycast_count: null,
        memory_mb: null,
        notes_key: taskName,
        details: { taskName, staleResultAgeMs, rejected: true },
      }),
    logWorkerFallback: (source, message, details = null) =>
      logTelemetryEvent({
        event_kind: "worker_validation",
        severity: "warn",
        source,
        entity_id: null,
        scene_object_count: null,
        frame_ms: null,
        react_commit_ms: null,
        draw_calls: null,
        store_write_count: null,
        raycast_count: null,
        memory_mb: null,
        notes_key: null,
        details: { message, ...(details ?? {}) },
      }),
  };

  return store;
};

export const telemetry = createStore();

export const startTelemetrySession = () => {
  if (!TELEMETRY_ENABLED) {
    return telemetry.session;
  }
  return telemetry.resetSession();
};

export const logTelemetryEvent = (
  event: Omit<TelemetryEvent, "event_id" | "timestamp_ms" | "session_id"> & {
    timestamp_ms?: number;
    event_id?: string;
  },
) => telemetry.append(event);

export const endTelemetrySession = () => telemetry.markSummary();

export const getTelemetrySummary = () =>
  telemetry.session.summary ?? buildSummary(telemetry.session);

export const getTelemetryEvents = () => telemetry.session.events;

export const getTelemetrySessionId = () => telemetry.session.session_id;

export const telemetryQueries = {
  byKind: (kind: TelemetryEventKind) =>
    TELEMETRY_ENABLED ? telemetry.getEventsByKind(kind) : [],
  byRange: (startMs: number, endMs: number) =>
    TELEMETRY_ENABLED ? telemetry.getEventsByRange(startMs, endMs) : [],
  byEntity: (entityId: string) =>
    TELEMETRY_ENABLED ? telemetry.getEventsByEntity(entityId) : [],
};

export const telemetryExport = {
  jsonl: () => (TELEMETRY_ENABLED ? telemetry.exportJSONL() : ""),
  summary: () => (TELEMETRY_ENABLED ? telemetry.exportSummaryJSON() : "{}"),
  manifest: () => (TELEMETRY_ENABLED ? telemetry.exportManifestJSON() : "{}"),
  artifacts: () =>
    TELEMETRY_ENABLED
      ? telemetry.exportSessionArtifacts()
      : { manifest: "{}", summary: "{}", events: "" },
  persistIndexedDB: () =>
    TELEMETRY_ENABLED
      ? telemetry.persistSessionToIndexedDB()
      : Promise.resolve(null),
  loadManifest: () =>
    TELEMETRY_ENABLED
      ? telemetry.loadTelemetryManifestFromIndexedDB()
      : Promise.resolve(null),
  loadEvents: (sessionId: string) =>
    TELEMETRY_ENABLED
      ? telemetry.loadTelemetryEventsFromIndexedDB(sessionId)
      : Promise.resolve([]),
  finalize: () => telemetry.markSessionEnded(),
  isFinalized: () => telemetry.isSessionEnded(),
};

export const telemetryPaths = {
  folder: TELEMETRY_FOLDER,
  manifestFile: `${TELEMETRY_FOLDER}/${TELEMETRY_MANIFEST_FILE}`,
  sessionPath: (sessionId: string) =>
    `${TELEMETRY_FOLDER}/${TELEMETRY_SESSION_PREFIX}${sessionId}`,
  summaryPath: (sessionId: string) =>
    `${TELEMETRY_FOLDER}/${TELEMETRY_SESSION_PREFIX}${sessionId}${TELEMETRY_SUMMARY_SUFFIX}`,
  eventsPath: (sessionId: string) =>
    `${TELEMETRY_FOLDER}/${TELEMETRY_SESSION_PREFIX}${sessionId}${TELEMETRY_EVENTS_SUFFIX}`,
};

export const telemetryFactories = {
  sessionStart: (source = "app") =>
    logTelemetryEvent({
      event_kind: "session_start",
      severity: "info",
      source,
      entity_id: null,
      scene_object_count: null,
      frame_ms: null,
      react_commit_ms: null,
      draw_calls: null,
      store_write_count: null,
      raycast_count: null,
      memory_mb: null,
      notes_key: null,
      details: null,
    }),
  frameSample: (
    source: string,
    frameMs: number,
    sceneObjectCount: number | null = null,
    drawCalls: number | null = null,
  ) =>
    logTelemetryEvent({
      event_kind: "frame_sample",
      severity: frameMs >= 16.7 ? "warn" : "debug",
      source,
      entity_id: null,
      scene_object_count: sceneObjectCount,
      frame_ms: frameMs,
      react_commit_ms: null,
      draw_calls: drawCalls,
      store_write_count: null,
      raycast_count: null,
      memory_mb: null,
      notes_key: null,
      details: null,
    }),
  reactCommit: (source: string, reactCommitMs: number) =>
    logTelemetryEvent({
      event_kind: "react_commit",
      severity: reactCommitMs >= 8 ? "warn" : "debug",
      source,
      entity_id: null,
      scene_object_count: null,
      frame_ms: null,
      react_commit_ms: reactCommitMs,
      draw_calls: null,
      store_write_count: null,
      raycast_count: null,
      memory_mb: null,
      notes_key: null,
      details: null,
    }),
  storeWrite: (
    source: string,
    storeWriteCount = 1,
    entityId: string | null = null,
  ) =>
    logTelemetryEvent({
      event_kind: "store_write",
      severity: "debug",
      source,
      entity_id: entityId,
      scene_object_count: null,
      frame_ms: null,
      react_commit_ms: null,
      draw_calls: null,
      store_write_count: storeWriteCount,
      raycast_count: null,
      memory_mb: null,
      notes_key: null,
      details: null,
    }),
  raycastSample: (
    source: string,
    raycastCount: number,
    entityId: string | null = null,
  ) =>
    logTelemetryEvent({
      event_kind: "raycast_sample",
      severity: raycastCount > 0 ? "debug" : "info",
      source,
      entity_id: entityId,
      scene_object_count: null,
      frame_ms: null,
      react_commit_ms: null,
      draw_calls: null,
      store_write_count: null,
      raycast_count: raycastCount,
      memory_mb: null,
      notes_key: null,
      details: null,
    }),
  workerTaskTiming: (
    source: string,
    taskName: string,
    durationMs: number,
    queueDepth: number | null = null,
  ) =>
    logTelemetryEvent({
      event_kind: "worker_task",
      severity: durationMs >= 16.7 ? "warn" : "debug",
      source,
      entity_id: taskName,
      scene_object_count: queueDepth,
      frame_ms: durationMs,
      react_commit_ms: null,
      draw_calls: null,
      store_write_count: null,
      raycast_count: null,
      memory_mb: null,
      notes_key: "worker_task_timing",
      details: {
        task_name: taskName,
        duration_ms: durationMs,
        queue_depth: queueDepth,
        metric: "task_timing",
      },
    }),
  workerQueueDepth: (
    source: string,
    queueDepth: number,
    taskName: string | null = null,
  ) =>
    logTelemetryEvent({
      event_kind: "worker_validation",
      severity: queueDepth >= 10 ? "warn" : "debug",
      source,
      entity_id: taskName,
      scene_object_count: queueDepth,
      frame_ms: null,
      react_commit_ms: null,
      draw_calls: null,
      store_write_count: null,
      raycast_count: null,
      memory_mb: null,
      notes_key: "worker_queue_depth",
      details: {
        task_name: taskName,
        queue_depth: queueDepth,
        metric: "queue_depth",
      },
    }),
  workerCancellation: (
    source: string,
    taskName: string,
    reason: string | null = null,
  ) =>
    logTelemetryEvent({
      event_kind: "worker_validation",
      severity: "info",
      source,
      entity_id: taskName,
      scene_object_count: null,
      frame_ms: null,
      react_commit_ms: null,
      draw_calls: null,
      store_write_count: null,
      raycast_count: null,
      memory_mb: null,
      notes_key: "worker_cancelled",
      details: {
        task_name: taskName,
        reason,
        metric: "cancellation",
      },
    }),
  workerStaleResultRejected: (
    source: string,
    taskName: string,
    staleResultAgeMs: number | null = null,
  ) =>
    logTelemetryEvent({
      event_kind: "worker_validation",
      severity: "warn",
      source,
      entity_id: taskName,
      scene_object_count: null,
      frame_ms: null,
      react_commit_ms: null,
      draw_calls: null,
      store_write_count: null,
      raycast_count: null,
      memory_mb: null,
      notes_key: "worker_stale_result_rejected",
      details: {
        task_name: taskName,
        stale_result_age_ms: staleResultAgeMs,
        metric: "stale_result_rejection",
      },
    }),
  workerFallback: (
    source: string,
    message: string,
    details: Record<string, unknown> | null = null,
  ) =>
    logTelemetryEvent({
      event_kind: "error",
      severity: "error",
      source,
      entity_id: null,
      scene_object_count: null,
      frame_ms: null,
      react_commit_ms: null,
      draw_calls: null,
      store_write_count: null,
      raycast_count: null,
      memory_mb: null,
      notes_key: "worker_fallback",
      details: {
        message,
        ...((details ?? {}) as Record<string, unknown>),
        fallback: true,
      },
    }),
};
