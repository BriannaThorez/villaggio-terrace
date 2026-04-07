import { useSimulationStore } from '../../../shared/utils/store';

export interface NavPath {
    points: [number, number, number][];
    currentIndex: number;
}

export const calculatePath = (
    start: [number, number, number],
    end: [number, number, number],
    currentFloor: number,
    targetFloor: number
): NavPath => {
    const points: [number, number, number][] = [];

    // If on the same floor, just move horizontally
    if (currentFloor === targetFloor) {
        points.push([end[0], start[1], start[2]]);
    } else {
        // Need to find an elevator or lobby to change floors
        // For now, let's assume elevators are at fixed X or we just teleport for this MVP
        // Better: Move to 'lobby' center (x=0?), then change Y, then move to end X
        points.push([0, start[1], start[2]]); // Move to central spine
        points.push([0, end[1], start[2]]);   // Vertical move
        points.push([end[0], end[1], start[2]]); // Final horizontal move
    }

    return { points, currentIndex: 0 };
};
