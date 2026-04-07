export class SpatialHash {
  private cellSize: number;
  private grid: Map<string, Set<string>>;

  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  private getHash(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  clear() {
    this.grid.clear();
  }

  insert(id: string, x: number, y: number, width: number, height: number) {
    const minX = x - width / 2;
    const minY = y - height / 2;
    const maxX = x + width / 2;
    const maxY = y + height / 2;

    const startCX = Math.floor(minX / this.cellSize);
    const endCX = Math.floor(maxX / this.cellSize);
    const startCY = Math.floor(minY / this.cellSize);
    const endCY = Math.floor(maxY / this.cellSize);

    for (let cx = startCX; cx <= endCX; cx++) {
      for (let cy = startCY; cy <= endCY; cy++) {
        const hash = `${cx},${cy}`;
        if (!this.grid.has(hash)) {
          this.grid.set(hash, new Set());
        }
        this.grid.get(hash)!.add(id);
      }
    }
  }

  remove(id: string, x: number, y: number, width: number, height: number) {
    const minX = x - width / 2;
    const minY = y - height / 2;
    const maxX = x + width / 2;
    const maxY = y + height / 2;

    const startCX = Math.floor(minX / this.cellSize);
    const endCX = Math.floor(maxX / this.cellSize);
    const startCY = Math.floor(minY / this.cellSize);
    const endCY = Math.floor(maxY / this.cellSize);

    for (let cx = startCX; cx <= endCX; cx++) {
      for (let cy = startCY; cy <= endCY; cy++) {
        const hash = `${cx},${cy}`;
        const cell = this.grid.get(hash);
        if (cell) {
          cell.delete(id);
          if (cell.size === 0) {
            this.grid.delete(hash);
          }
        }
      }
    }
  }

  query(x: number, y: number, width: number, height: number): Set<string> {
    const result = new Set<string>();
    const minX = x - width / 2;
    const minY = y - height / 2;
    const maxX = x + width / 2;
    const maxY = y + height / 2;

    const startCX = Math.floor(minX / this.cellSize);
    const endCX = Math.floor(maxX / this.cellSize);
    const startCY = Math.floor(minY / this.cellSize);
    const endCY = Math.floor(maxY / this.cellSize);

    for (let cx = startCX; cx <= endCX; cx++) {
      for (let cy = startCY; cy <= endCY; cy++) {
        const hash = `${cx},${cy}`;
        const cell = this.grid.get(hash);
        if (cell) {
          for (const id of cell) {
            result.add(id);
          }
        }
      }
    }
    return result;
  }
}
