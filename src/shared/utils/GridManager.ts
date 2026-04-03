import { GRID_SIZE, GRID_SIZE_X, GRID_SIZE_Y } from "./store";

export const snapToGrid = (val: number) =>
  Math.round(val / GRID_SIZE) * GRID_SIZE;

export const worldToGrid = (x: number, y: number): [number, number] => {
  return [Math.round(x / GRID_SIZE_X), Math.round(y / GRID_SIZE_Y)];
};

export const gridToWorld = (x: number, y: number): [number, number] => {
  return [x * GRID_SIZE_X, y * GRID_SIZE_Y];
};

export const checkCollision = (
  x: number,
  y: number,
  width: number,
  height: number,
  towerGrid: Map<string, string>,
): boolean => {
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      if (towerGrid.has(`${x + i},${y + j}`)) {
        return true;
      }
    }
  }
  return false;
};
