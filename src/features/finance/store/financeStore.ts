import { create } from "zustand";
import { useSimulationStore } from "../../../shared/utils/store";
import { useTenancyStore } from "../../tenancy/store/tenancyStore";
import roomMetadata from "../../../entities/rooms/roomMetadata.json";

interface FinanceState {
  totalIncome: number;
  totalExpenses: number;
  resourceUsage: {
    power: number;
    water: number;
    internet: number;
  };
  resourceCapacity: {
    power: number;
    water: number;
    internet: number;
  };
  processWeeklyFinances: () => void;
  updateBalances: () => void;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  totalIncome: 0,
  totalExpenses: 0,
  resourceUsage: { power: 0, water: 0, internet: 0 },
  resourceCapacity: { power: 0, water: 0, internet: 0 },

  updateBalances: () => {
    const shapes = useSimulationStore.getState().shapes;
    const occupants = useTenancyStore.getState().occupants;

    let income = 0;
    let powerUse = 0;
    let waterUse = 0;
    let internetUse = 0;
    let powerCap = 100; // Baseline
    let waterCap = 100;
    let internetCap = 100;

    shapes.forEach((shape) => {
      const roomMeta = (roomMetadata.rooms as any[]).find(r => r.id === shape.metadataId);
      if (!roomMeta) return;

      // Income & Expenses
      const tenant = occupants[shape.id];
      if (tenant) {
        income += tenant.monthlyRent; // Legacy name, acts as weekly rent now
      }
      
      if (roomMeta.metadata?.upkeep_cost) {
        income -= roomMeta.metadata.upkeep_cost;
      }

      // Resource usage from numeric numeric mapping
      if (roomMeta.metadata?.utilities) {
        powerUse += roomMeta.metadata.utilities.electricity || 0;
        waterUse += roomMeta.metadata.utilities.water || 0;
        internetUse += roomMeta.metadata.utilities.internet || 0;
      }

      // Resource capacity (utility rooms)
      if (shape.type === "utility") {
        powerCap += 50;
        waterCap += 50;
        internetCap += 50;
      }
    });

    set({
      totalIncome: income,
      resourceUsage: { power: powerUse, water: waterUse, internet: internetUse },
      resourceCapacity: { power: powerCap, water: waterCap, internet: internetCap },
    });
  },

  processWeeklyFinances: () => {
    // Force a fresh balance update first to capture all active elements
    get().updateBalances();
    const { totalIncome } = get();
    // Process the exact net payout for the week
    const currentMoney = useSimulationStore.getState().spendableMoney;
    useSimulationStore.getState().setSpendableMoney(currentMoney + totalIncome);
  },
}));
