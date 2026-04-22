import { create } from "zustand";

export interface TenantData {
  tenantId: string;
  name: string;
  moveInDate: number;
  monthlyRent: number;
  occupantId?: string;
  roomCapacity?: number;
  slotOccupants?: string[];
}

interface TenancyState {
  // roomId -> TenantData
  occupants: Record<string, TenantData>;
  assignTenant: (roomId: string, tenant: TenantData) => void;
  evictTenant: (roomId: string) => void;
  assignOccupantToRoom: (roomId: string, occupantId: string) => void;
  removeOccupantFromRoom: (roomId: string, occupantId: string) => void;
}

export const useTenancyStore = create<TenancyState>((set) => ({
  occupants: {},
  assignTenant: (roomId, tenant) =>
    set((state) => ({
      occupants: { 
        ...state.occupants, 
        [roomId]: {
          ...tenant,
          slotOccupants: tenant.slotOccupants || []
        } 
      },
    })),
  evictTenant: (roomId) =>
    set((state) => {
      const { [roomId]: _, ...rest } = state.occupants;
      return { occupants: rest };
    }),
  assignOccupantToRoom: (roomId, occupantId) =>
    set((state) => {
      const room = state.occupants[roomId];
      if (!room) return state;
      const slotOccupants = room.slotOccupants || [];
      if (!slotOccupants.includes(occupantId)) {
        return {
          occupants: {
            ...state.occupants,
            [roomId]: { ...room, slotOccupants: [...slotOccupants, occupantId] }
          }
        };
      }
      return state;
    }),
  removeOccupantFromRoom: (roomId, occupantId) =>
    set((state) => {
      const room = state.occupants[roomId];
      if (!room) return state;
      const slotOccupants = room.slotOccupants || [];
      return {
        occupants: {
          ...state.occupants,
          [roomId]: { ...room, slotOccupants: slotOccupants.filter(id => id !== occupantId) }
        }
      };
    })
}));
