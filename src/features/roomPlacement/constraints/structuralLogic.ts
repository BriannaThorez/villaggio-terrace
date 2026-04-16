import { STRUCTURAL_CONSTANTS } from "./spatialIndex";

const {
  GROUND_THRESHOLD,
  FLOOR_HEIGHT,
  CLUSTER_ADJACENCY_EPSILON,
  SUPPORT_EPSILON,
} = STRUCTURAL_CONSTANTS;

export interface SimpleNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
}

/**
 * Pure logic for identifying a structural cluster.
 */
export const getClusterLogic = (
  x: number,
  y: number,
  width: number,
  floorNodes: SimpleNode[],
): { x: number; width: number; id: string }[] => {
  const cluster: { x: number; width: number; id: string }[] = [
    { x, width, id: "target" },
  ];
  const queue = [{ x, width, id: "target" }];
  const processed = new Set<string>(["target"]);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currLeft = curr.x - curr.width / 2;
    const currRight = curr.x + curr.width / 2;

    for (const s of floorNodes) {
      if (processed.has(s.id)) continue;
      const sLeft = s.x - s.w / 2;
      const sRight = s.x + s.w / 2;

      if (
        sRight >= currLeft - CLUSTER_ADJACENCY_EPSILON &&
        sLeft <= currRight + CLUSTER_ADJACENCY_EPSILON
      ) {
        const node = { x: s.x, width: s.w, id: s.id };
        cluster.push(node);
        queue.push(node);
        processed.add(s.id);
      }
    }
  }

  return cluster;
};

/**
 * Pure logic for calculating max cantilever.
 */
export const getMaxCantileverLogic = (
  x: number,
  y: number,
  width: number,
  floorNodes: SimpleNode[],
  supportsBelow: SimpleNode[],
): number => {
  if (y < GROUND_THRESHOLD) return 0;

  const cluster = getClusterLogic(x, y, width, floorNodes);

  const groundedIntervals: [number, number][] = [];
  for (const node of cluster) {
    const nodeLeft = node.x - node.width / 2;
    const nodeRight = node.x + node.width / 2;

    for (const s of supportsBelow) {
      const sLeft = s.x - s.w / 2;
      const sRight = s.x + s.w / 2;

      if (
        sRight >= nodeLeft - SUPPORT_EPSILON &&
        sLeft <= nodeRight + SUPPORT_EPSILON
      ) {
        groundedIntervals.push([sLeft, sRight]);
      }
    }
  }

  if (groundedIntervals.length === 0) return Infinity;

  groundedIntervals.sort((a, b) => a[0] - b[0]);
  const mergedIntervals: [number, number][] = [];
  if (groundedIntervals.length > 0) {
    let [start, end] = groundedIntervals[0];
    for (let i = 1; i < groundedIntervals.length; i++) {
      const [nextStart, nextEnd] = groundedIntervals[i];
      if (nextStart <= end + SUPPORT_EPSILON) {
        end = Math.max(end, nextEnd);
      } else {
        mergedIntervals.push([start, end]);
        [start, end] = [nextStart, nextEnd];
      }
    }
    mergedIntervals.push([start, end]);
  }

  let maxClusterCantilever = 0;
  for (const node of cluster) {
    const nodeLeft = node.x - node.width / 2;
    const nodeRight = node.x + node.width / 2;

    let minNodeDistToSupport = Infinity;
    for (const [sLeft, sRight] of mergedIntervals) {
      const distLeft = Math.max(0, sLeft - nodeLeft);
      const distRight = Math.max(0, nodeRight - sRight);
      const dist = Math.max(0, nodeLeft - sRight, sLeft - nodeRight);
      minNodeDistToSupport = Math.min(minNodeDistToSupport, dist);

      if (
        sRight >= nodeLeft - SUPPORT_EPSILON &&
        sLeft <= nodeRight + SUPPORT_EPSILON
      ) {
        maxClusterCantilever = Math.max(maxClusterCantilever, distLeft, distRight);
      }
    }

    if (minNodeDistToSupport > 0 && minNodeDistToSupport !== Infinity) {
      let furthestPointDist = Infinity;
      for (const [sLeft, sRight] of mergedIntervals) {
        const d = Math.max(nodeRight - sRight, sLeft - nodeLeft);
        furthestPointDist = Math.min(furthestPointDist, d);
      }
      maxClusterCantilever = Math.max(maxClusterCantilever, furthestPointDist);
    }
  }

  return maxClusterCantilever;
};
