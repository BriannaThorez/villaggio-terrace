import { create } from "zustand";
import { OccupantEntity } from "../types/occupant";

interface PopulationState {
  occupants: Record<string, OccupantEntity>;
  selectedOccupantId: string | null;
  addOccupant: (occupant: OccupantEntity) => void;
  removeOccupant: (id: string) => void;
  updateOccupantLifecycle: (id: string, state: string) => void;
  setSelectedOccupantId: (id: string | null) => void;
}

export const usePopulationStore = create<PopulationState>((set) => ({
  occupants: {},
  selectedOccupantId: null,

  addOccupant: (occupant) =>
    set((state) => ({
      occupants: { ...state.occupants, [occupant.id]: occupant },
    })),

  removeOccupant: (id) =>
    set((state) => {
      const newOccupants = { ...state.occupants };
      delete newOccupants[id];
      return {
        occupants: newOccupants,
        selectedOccupantId: state.selectedOccupantId === id ? null : state.selectedOccupantId,
      };
    }),

  updateOccupantLifecycle: (id, lifecycleState) =>
    set((state) => {
      const occupant = state.occupants[id];
      if (!occupant) return state;
      return {
        occupants: {
          ...state.occupants,
          [id]: { ...occupant, lifecycleState } as unknown as OccupantEntity,
        },
      };
    }),

  setSelectedOccupantId: (id) =>
    set(() => ({ selectedOccupantId: id })),
}));
