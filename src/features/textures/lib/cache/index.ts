export type TextureCacheKey = string;

export interface TextureCacheEntry<T> {
  key: TextureCacheKey;
  value: T;
  createdAt: number;
  lastAccessedAt: number;
}

export interface TextureCacheOptions {
  maxEntries?: number;
  ttlMs?: number;
}

const DEFAULT_MAX_ENTRIES = 64;

export class TextureCache<T> {
  private readonly maxEntries: number;
  private readonly ttlMs?: number;
  private readonly entries = new Map<TextureCacheKey, TextureCacheEntry<T>>();

  constructor(options: TextureCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.ttlMs = options.ttlMs;
  }

  get(key: TextureCacheKey): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    if (this.ttlMs !== undefined && Date.now() - entry.createdAt > this.ttlMs) {
      this.entries.delete(key);
      return undefined;
    }

    entry.lastAccessedAt = Date.now();
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  has(key: TextureCacheKey): boolean {
    return this.get(key) !== undefined;
  }

  set(key: TextureCacheKey, value: T): T {
    const now = Date.now();

    if (this.entries.has(key)) {
      this.entries.delete(key);
    }

    this.entries.set(key, {
      key,
      value,
      createdAt: now,
      lastAccessedAt: now,
    });

    this.evictIfNeeded();
    return value;
  }

  delete(key: TextureCacheKey): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  size(): number {
    this.pruneExpired();
    return this.entries.size;
  }

  keys(): TextureCacheKey[] {
    this.pruneExpired();
    return Array.from(this.entries.keys());
  }

  private evictIfNeeded(): void {
    this.pruneExpired();

    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value as
        | TextureCacheKey
        | undefined;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }
  }

  private pruneExpired(): void {
    if (this.ttlMs === undefined) return;

    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (now - entry.createdAt > this.ttlMs) {
        this.entries.delete(key);
      }
    }
  }
}

export const createTextureCache = <T>(options?: TextureCacheOptions) =>
  new TextureCache<T>(options);

export const textureCacheKey = (...parts: Array<string | number | boolean>) =>
  parts.map(String).join("|");
