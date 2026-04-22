import { create } from "zustand";

/**
 * settingsStore.ts
 *
 * Global game settings store. Source of truth for all user-adjustable
 * quality and display settings. Persisted to localStorage automatically.
 *
 * textureQuality drives Phase 3 multi-resolution LOD selection:
 *   low    → 512px  (default — fastest, minimum VRAM)
 *   medium → 1K
 *   high   → 2K
 *   ultra  → 4K     (maximum quality, high-end GPUs only)
 */

export type TextureQuality = "low" | "medium" | "high" | "ultra";

const STORAGE_KEY = "villaggio_settings";

interface PersistedSettings {
  textureQuality: TextureQuality;
}

const readFromStorage = (): Partial<PersistedSettings> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Partial<PersistedSettings>;
  } catch (_) {
    // Malformed storage — ignore and use defaults
  }
  return {};
};

const writeToStorage = (settings: PersistedSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (_) {
    // Storage full or unavailable — silently skip
  }
};

interface SettingsState extends PersistedSettings {
  setTextureQuality: (quality: TextureQuality) => void;
}

const persisted = readFromStorage();

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Defaults — overridden by persisted values where available
  textureQuality: persisted.textureQuality ?? "low",

  setTextureQuality: (quality: TextureQuality) => {
    set({ textureQuality: quality });
    writeToStorage({ textureQuality: quality });
    console.debug(`[SettingsStore] textureQuality → "${quality}"`);
  },
}));
