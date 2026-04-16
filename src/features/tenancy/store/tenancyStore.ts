import { create } from "zustand";

export interface TenantData {
  tenantId: string;
  name: string;
  moveInDate: number;
  monthlyRent: number;
}

interface TenancyState {
  // roomId -> TenantData
  occupants: Record<string, TenantData>;
  assignTenant: (roomId: string, tenant: TenantData) => void;
  evictTenant: (roomId: string) => void;
}

export const useTenancyStore = create<TenancyState>((set) => ({
  occupants: {},
  assignTenant: (roomId, tenant) =>
    set((state) => ({
      occupants: { ...state.occupants, [roomId]: tenant },
    })),
  evictTenant: (roomId) =>
    set((state) => {
      const { [roomId]: _, ...rest } = state.occupants;
      return { occupants: rest };
    }),
}));
