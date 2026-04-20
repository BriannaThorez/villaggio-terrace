import { SimulationNode } from "../../shared/utils/store";
import roomMetadata from "../../entities/rooms/roomMetadata.json";

export interface HotelCapacityMap {
  desks: Record<string, { totalCapacity: number; usedCapacity: number; assignedRoomIds: string[] }>;
  rooms: Record<string, { deskId: string | null; status: "SERVICED" | "NO_RECEPTION" }>;
}

/**
 * buildHotelCapacityMap
 * Resolves provider/consumer relationships for Hotel rooms based on proximity.
 * Assignment strategy: Nearest-desk-first, up to capacity (10 units per desk).
 */
export const buildHotelCapacityMap = (shapes: SimulationNode[]): HotelCapacityMap => {
  const map: HotelCapacityMap = {
    desks: {},
    rooms: {},
  };

  // 1. Identify all Hotel components
  const allHotelRooms = shapes.filter((s) => {
    const meta = (roomMetadata.rooms as any[]).find((m) => m.id === s.metadataId);
    return meta?.class === "Hotel";
  });

  const desks = allHotelRooms.filter((r) => r.metadataId === "hotel-reception-desk");
  const basicRooms = allHotelRooms.filter((r) => r.metadataId === "hotel-room-basic");

  // 2. Initialize map
  desks.forEach((d) => {
    map.desks[d.id] = { totalCapacity: 10, usedCapacity: 0, assignedRoomIds: [] };
  });

  // 3. Simple Greedy Nearest-Desk Assignment
  // For each room, find the closest desk that still has capacity.
  basicRooms.forEach((room) => {
    let closestDeskId: string | null = null;
    let minDistance = Infinity;

    desks.forEach((desk) => {
      const deskState = map.desks[desk.id];
      if (deskState.usedCapacity < deskState.totalCapacity) {
        const dist = Math.sqrt(
          Math.pow(room.position[0] - desk.position[0], 2) +
          Math.pow(room.position[1] - desk.position[1], 2)
        );

        if (dist < minDistance) {
          minDistance = dist;
          closestDeskId = desk.id;
        }
      }
    });

    if (closestDeskId) {
      map.desks[closestDeskId].usedCapacity += 1;
      map.desks[closestDeskId].assignedRoomIds.push(room.id);
      map.rooms[room.id] = { deskId: closestDeskId, status: "SERVICED" };
    } else {
      map.rooms[room.id] = { deskId: null, status: "NO_RECEPTION" };
    }
  });

  return map;
};
