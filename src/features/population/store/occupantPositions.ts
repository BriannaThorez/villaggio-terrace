import { NavPath } from "../types/occupant";

export interface OccupantTransform {
  id: string;
  x: number;
  y: number;
  floorIndex: number;
  path?: NavPath;
  state?: 'moving' | 'idle' | 'queued';
}

class OccupantPositionStore {
  private transforms = new Map<string, OccupantTransform>();

  setTransform(id: string, transform: Omit<OccupantTransform, 'id'>) {
    this.transforms.set(id, { id, ...transform });
  }

  getTransform(id: string): OccupantTransform | undefined {
    return this.transforms.get(id);
  }

  removeTransform(id: string) {
    this.transforms.delete(id);
  }

  getAll(): OccupantTransform[] {
    return Array.from(this.transforms.values());
  }

  clear() {
    this.transforms.clear();
  }
}

export const occupantPositions = new OccupantPositionStore();
