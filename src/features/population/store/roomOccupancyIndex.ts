class RoomOccupancyIndex {
  private index = new Map<string, Set<string>>();

  addOccupantToRoom(roomId: string, occupantId: string) {
    if (!this.index.has(roomId)) {
      this.index.set(roomId, new Set());
    }
    this.index.get(roomId)!.add(occupantId);
  }

  removeOccupantFromRoom(roomId: string, occupantId: string) {
    const set = this.index.get(roomId);
    if (set) {
      set.delete(occupantId);
      if (set.size === 0) {
        this.index.delete(roomId);
      }
    }
  }

  getOccupantsForRoom(roomId: string): Set<string> {
    return this.index.get(roomId) || new Set();
  }

  clear() {
    this.index.clear();
  }
}

export const roomOccupancyIndex = new RoomOccupancyIndex();
