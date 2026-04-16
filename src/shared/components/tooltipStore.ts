import { create } from "zustand";

interface TooltipState {
  activeTooltipId: string | null;
  setActiveTooltipId: (id: string | null) => void;
}

export const useTooltipStore = create<TooltipState>((set) => ({
  activeTooltipId: null,
  setActiveTooltipId: (id) => set({ activeTooltipId: id }),
}));
