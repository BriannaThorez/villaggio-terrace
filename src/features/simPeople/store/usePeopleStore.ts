import { create } from "zustand";

export interface SimMetadata {
    id: string;
    name: string;
    height: number;
    tint: string;
    homeId?: string;
    workId?: string;
}

/**
 * Zustand store for SimPeople METADATA only.
 * 
 * Positions/states that change every frame live in simPositions.ts
 * (a plain mutable object) to avoid triggering React re-renders.
 */
interface PeopleStore {
    /** Stable list of sim IDs — only changes when sims are added/removed */
    simIds: string[];
    /** Metadata keyed by ID */
    metadata: Record<string, SimMetadata>;
    addPerson: (id: string, meta: SimMetadata) => void;
    removePerson: (id: string) => void;
}

export const usePeopleStore = create<PeopleStore>((set) => ({
    simIds: [],
    metadata: {},
    addPerson: (id, meta) =>
        set((state) => ({
            simIds: [...state.simIds, id],
            metadata: { ...state.metadata, [id]: meta },
        })),
    removePerson: (id) =>
        set((state) => {
            const { [id]: _, ...rest } = state.metadata;
            return {
                simIds: state.simIds.filter((s) => s !== id),
                metadata: rest,
            };
        }),
}));
