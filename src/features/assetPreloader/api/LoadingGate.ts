export type LoadingPhase = 
  | 'idle' 
  | 'fetching_textures' 
  | 'compiling_shaders' 
  | 'warming_materials' 
  | 'ready';

type Listener = (phase: LoadingPhase) => void;

/**
 * LoadingGate: A framework-agnostic event bus for tracking the asset preloading lifecycle.
 * Decouples the preloading logic (api/preload.ts) from the UI (ui/AssetPreloader.tsx)
 * without introducing complex global state management dependencies.
 */
class LoadingGate {
  private currentPhase: LoadingPhase = 'idle';
  private listeners: Set<Listener> = new Set();

  /**
   * Transitions the gate to a new phase and notifies all active subscribers.
   */
  public advance(phase: LoadingPhase): void {
    if (this.currentPhase === phase) return;
    this.currentPhase = phase;
    this.notify();
  }

  /**
   * Subscribes to phase changes. Returns an unsubscribe function.
   * Immediately notifies the callback with the current state.
   */
  public subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    cb(this.currentPhase); // Initial notify
    return () => {
      this.listeners.delete(cb);
    };
  }

  /**
   * Returns true if the preloading sequence has reached the 'ready' state.
   */
  public isReady(): boolean {
    return this.currentPhase === 'ready';
  }

  /**
   * Returns the current phase of the loading sequence.
   */
  public getCurrentPhase(): LoadingPhase {
    return this.currentPhase;
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb(this.currentPhase));
  }
}

export const loadingGate = new LoadingGate();
