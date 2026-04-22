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
  hotelNightlyRevenue: number;
  weeklyGuestRevenue: number;
  processWeeklyFinances: () => void;
  updateBalances: () => void;
  recordHotelCheckout: (roomId: string, guestId: string, nightsStayed: number) => void;
  getHotelOccupancyKPI: () => { totalRooms: number; occupiedRooms: number; rate: number };
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  totalIncome: 0,
  totalExpenses: 0,
  resourceUsage: { power: 0, water: 0, internet: 0 },
  resourceCapacity: { power: 0, water: 0, internet: 0 },
  hotelNightlyRevenue: 0,
  weeklyGuestRevenue: 0,

  recordHotelCheckout: (roomId: string, guestId: string, nightsStayed: number) => {
    const shapes = useSimulationStore.getState().shapes;
    const shape = shapes.find(s => s.id === roomId);
    if (!shape) return;
    const roomMeta = (roomMetadata.rooms as any[]).find(r => r.id === shape.metadataId);
    if (!roomMeta || roomMeta.class !== "Hotel") return;

    const nightlyRate = (roomMeta.metadata as any).nightly_rate_base || 150;
    const occupancyModifier = 1.0; // Placeholder for HE1/HE3
    const amount = nightsStayed * nightlyRate * occupancyModifier;
    
    set(state => ({
      weeklyGuestRevenue: state.weeklyGuestRevenue + amount
    }));
  },

  getHotelOccupancyKPI: () => {
    const shapes = useSimulationStore.getState().shapes;
    const hotelStatus = useSimulationStore.getState().hotelRoomServiceStatus;
    const hotelRooms = shapes.filter(s => {
      const meta = (roomMetadata.rooms as any[]).find(r => r.id === s.metadataId);
      return meta?.class === "Hotel" && meta.id !== "hotel-reception-desk";
    });
    
    const totalRooms = hotelRooms.length;
    const occupiedRooms = hotelRooms.filter(r => hotelStatus[r.id] === "SERVICED").length; // In P10, this will check actual guests. For now, SERVICED = proxy.
    const rate = totalRooms > 0 ? occupiedRooms / totalRooms : 0;
    
    return { totalRooms, occupiedRooms, rate };
  },

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
    let hotelIncome = 0;

    const simulationState = useSimulationStore.getState();
    const hotelStatus = simulationState.hotelRoomServiceStatus;

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

      // Hotel Revenue Handling
      if (roomMeta.class === "Hotel") {
        if (roomMeta.id === "hotel-room-basic") {
          const isServiced = hotelStatus[shape.id] === "SERVICED";
          if (isServiced) {
            // Baseline nightly revenue (e.g., $150/night -> $1050/wk)
            const nightlyRate = (roomMeta.metadata as any).nightly_rate_base || 150;
            hotelIncome += nightlyRate;
            income += (nightlyRate * 7); // Projecting weekly for unified balance
          }
        }
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
      hotelNightlyRevenue: hotelIncome,
      resourceUsage: { power: powerUse, water: waterUse, internet: internetUse },
      resourceCapacity: { power: powerCap, water: waterCap, internet: internetCap },
    });
  },

  processWeeklyFinances: () => {
    // Force a fresh balance update first to capture all active elements
    get().updateBalances();
    const { totalIncome } = get();
    // Process the exact net payout for the week
    // Process the exact net payout for the week plus checkout revenue
    const currentMoney = useSimulationStore.getState().spendableMoney;
    const { weeklyGuestRevenue } = get();
    useSimulationStore.getState().setSpendableMoney(currentMoney + totalIncome + weeklyGuestRevenue);
    
    // Reset weekly accumulators
    set({ weeklyGuestRevenue: 0 });
  },
}));
