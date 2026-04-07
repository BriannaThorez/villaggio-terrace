/**
 * Mutable position store for SimPeople.
 * 
 * This is intentionally NOT a Zustand store. Positions change every frame
 * and must never trigger React re-renders. Components read from this
 * inside useFrame callbacks, bypassing React's reconciliation entirely.
 */

export interface SimTransform {
    position: [number, number, number];
    targetPosition: [number, number, number] | null;
    currentState: 'idle' | 'walking' | 'waiting' | 'in_elevator';
}

class SimPositionStore {
    private transforms: Map<string, SimTransform> = new Map();

    set(id: string, transform: SimTransform) {
        this.transforms.set(id, transform);
    }

    get(id: string): SimTransform | undefined {
        return this.transforms.get(id);
    }

    getAll(): Map<string, SimTransform> {
        return this.transforms;
    }

    update(id: string, partial: Partial<SimTransform>) {
        const existing = this.transforms.get(id);
        if (existing) {
            Object.assign(existing, partial);
        }
    }

    remove(id: string) {
        this.transforms.delete(id);
    }

    clear() {
        this.transforms.clear();
    }
}

/** Singleton mutable position store — never triggers React re-renders */
export const simPositions = new SimPositionStore();
