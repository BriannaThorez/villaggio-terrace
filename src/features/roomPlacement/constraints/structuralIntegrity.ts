import type { SimulationNode } from "../../../entities/SimulationNodes";
import {
    FloorBucketIndex,
    STRUCTURAL_CONSTANTS,
} from "./spatialIndex";

const {
    GROUND_THRESHOLD,
    FLOOR_HEIGHT,
    SUPPORT_PROXIMITY,
    CLUSTER_ADJACENCY_EPSILON,
    SUPPORT_EPSILON,
} = STRUCTURAL_CONSTANTS;

/**
 * Identifies the contiguous cluster of structural nodes on the same level.
 * 
 * Performance: Uses FloorBucketIndex for O(1) floor lookup instead of
 * scanning all simulation nodes.
 */
const getCluster = (
    x: number,
    y: number,
    width: number,
    allShapes: SimulationNode[],
    index?: FloorBucketIndex
): { x: number; width: number; id?: string }[] => {
    const floorNodes = index
        ? index.getStructuralFloorNodes(y)
        : allShapes.filter(s =>
            (s.type === "structure" || s.type === "lobby" || ["residential", "commercial", "office", "utility"].includes(s.type)) &&
            Math.abs(s.position[1] - y) < 5
        );

    const cluster: { x: number; width: number; id?: string }[] = [{ x, width, id: "target" }];
    const queue = [{ x, width, id: "target" }];
    const processed = new Set<string>(["target"]);

    while (queue.length > 0) {
        const curr = queue.shift()!;
        const currLeft = curr.x - curr.width / 2;
        const currRight = curr.x + curr.width / 2;

        for (const s of floorNodes) {
            if (processed.has(s.id)) continue;
            const sLeft = s.position[0] - s.size[0] / 2;
            const sRight = s.position[0] + s.size[0] / 2;

            // Check for horizontal adjacency (touching or overlapping)
            if (sRight >= currLeft - CLUSTER_ADJACENCY_EPSILON && sLeft <= currRight + CLUSTER_ADJACENCY_EPSILON) {
                const node = { x: s.position[0], width: s.size[0], id: s.id };
                cluster.push(node);
                queue.push(node);
                processed.add(s.id);
            }
        }
    }

    return cluster;
};

/**
 * Calculates the maximum cantilever distance for a contiguous structural cluster.
 * 
 * Performance: Uses FloorBucketIndex to restrict support queries
 * to the floor directly below (O(bucket) instead of O(N)).
 */
export const getMaxCantilever = (
    x: number,
    y: number,
    width: number,
    allShapes: SimulationNode[],
    _targetType: string,
    index?: FloorBucketIndex
): number => {
    // Ground floor (first layer) has infinite support
    if (y < GROUND_THRESHOLD) return 0;

    const cluster = getCluster(x, y, width, allShapes, index);

    // Find all grounded supports (nodes on the level below that touch ANY node in the cluster)
    const groundedIntervals: [number, number][] = [];
    const supportsBelow = index
        ? index.getSupportNodes(y)
        : allShapes.filter(s =>
            !["text", "select"].includes(s.type) &&
            Math.abs(s.position[1] - (y - FLOOR_HEIGHT)) < SUPPORT_PROXIMITY
        );

    for (const node of cluster) {
        const nodeLeft = node.x - node.width / 2;
        const nodeRight = node.x + node.width / 2;

        for (const s of supportsBelow) {
            const sLeft = s.position[0] - s.size[0] / 2;
            const sRight = s.position[0] + s.size[0] / 2;

            if (sRight >= nodeLeft - SUPPORT_EPSILON && sLeft <= nodeRight + SUPPORT_EPSILON) {
                groundedIntervals.push([sLeft, sRight]);
            }
        }
    }

    if (groundedIntervals.length === 0) return Infinity; // No part of this cluster touches the floor below.

    // Merge grounded intervals to find continuous supported regions
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

    // Calculate max cantilever for the cluster
    let maxClusterCantilever = 0;

    for (const node of cluster) {
        const nodeLeft = node.x - node.width / 2;
        const nodeRight = node.x + node.width / 2;

        // Find distance from this node's furthest point to the nearest grounded interval
        let minNodeDistToSupport = Infinity;
        for (const [sLeft, sRight] of mergedIntervals) {
            const distLeft = Math.max(0, sLeft - nodeLeft);
            const distRight = Math.max(0, nodeRight - sRight);

            const dist = Math.max(0, nodeLeft - sRight, sLeft - nodeRight);
            minNodeDistToSupport = Math.min(minNodeDistToSupport, dist);

            // If we are actually sitting on this support, the 'cantilever' is the distance
            // from our edges to the support's internal edges.
            if (sRight >= nodeLeft - SUPPORT_EPSILON && sLeft <= nodeRight + SUPPORT_EPSILON) {
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

/**
 * Enforces the "Max 5 unit cantilever overhang" industry-leading structural constraint.
 */
export const checkStructuralIntegrity = (
    x: number,
    y: number,
    width: number,
    allShapes: SimulationNode[],
    _targetType: string,
    maxOverhang = 50.1, // 5 Cells (Industry Standard)
    index?: FloorBucketIndex
): { isValid: boolean; overhang: number } => {
    const cantilever = getMaxCantilever(x, y, width, allShapes, _targetType, index);
    return {
        isValid: cantilever <= maxOverhang,
        overhang: cantilever
    };
};
