import { SimulationNode } from "../../../entities/SimulationNodes";

/**
 * Identifies the contiguous cluster of structural nodes on the same level.
 */
const getCluster = (
    x: number,
    y: number,
    width: number,
    allShapes: SimulationNode[]
): { x: number; width: number; id?: string }[] => {
    const floorNodes = allShapes.filter(s =>
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

        floorNodes.forEach(s => {
            if (processed.has(s.id)) return;
            const sLeft = s.position[0] - s.size[0] / 2;
            const sRight = s.position[0] + s.size[0] / 2;

            // Check for horizontal adjacency (touching or overlapping)
            // We use a small epsilon (1.0) to allow for minor floating point gaps in snapping
            if (sRight >= currLeft - 1.0 && sLeft <= currRight + 1.0) {
                const node = { x: s.position[0], width: s.size[0], id: s.id };
                cluster.push(node);
                queue.push(node);
                processed.add(s.id);
            }
        });
    }

    return cluster;
};

/**
 * Calculates the maximum cantilever distance for a contiguous structural cluster.
 */
export const getMaxCantilever = (
    x: number,
    y: number,
    width: number,
    allShapes: SimulationNode[],
    targetType: string
): number => {
    // Ground floor (first layer) has infinite support
    if (y < 10) return 0;

    const floorBelowY = y - 40;
    const cluster = getCluster(x, y, width, allShapes);

    // Find all grounded supports (nodes on the level below that touch ANY node in the cluster)
    const groundedIntervals: [number, number][] = [];
    const supportsBelow = allShapes.filter(s =>
        !["text", "select"].includes(s.type) &&
        Math.abs(s.position[1] - floorBelowY) < 10
    );

    cluster.forEach(node => {
        const nodeLeft = node.x - node.width / 2;
        const nodeRight = node.x + node.width / 2;

        supportsBelow.forEach(s => {
            const sLeft = s.position[0] - s.size[0] / 2;
            const sRight = s.position[0] + s.size[0] / 2;

            if (sRight >= nodeLeft - 0.1 && sLeft <= nodeRight + 0.1) {
                groundedIntervals.push([sLeft, sRight]);
            }
        });
    });

    if (groundedIntervals.length === 0) return Infinity; // No part of this cluster touches the floor below.

    // Merge grounded intervals to find continuous supported regions
    groundedIntervals.sort((a, b) => a[0] - b[0]);
    const mergedIntervals: [number, number][] = [];
    if (groundedIntervals.length > 0) {
        let [start, end] = groundedIntervals[0];
        for (let i = 1; i < groundedIntervals.length; i++) {
            const [nextStart, nextEnd] = groundedIntervals[i];
            if (nextStart <= end + 0.1) {
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

    cluster.forEach(node => {
        const nodeLeft = node.x - node.width / 2;
        const nodeRight = node.x + node.width / 2;

        // Find distance from this node's furthest point to the nearest grounded interval
        let minNodeDistToSupport = Infinity;
        mergedIntervals.forEach(([sLeft, sRight]) => {
            // Distance from a point p to an interval [L, R] is max(0, L-p, p-R)
            // But we want the max distance of any part of our node to the support.
            // Specifically, if the node is outside the support, it's the distance from its furthest edge.
            const distLeft = Math.max(0, sLeft - nodeLeft);
            const distRight = Math.max(0, nodeRight - sRight);

            // If the node spans multiple intervals, we only care about the nearest touching one.
            // But if it's completely unsupported, it's the distance to the absolute nearest ground.
            const dist = Math.max(0, nodeLeft - sRight, sLeft - nodeRight);
            minNodeDistToSupport = Math.min(minNodeDistToSupport, dist);

            // If we are actually sitting on this support, the 'cantilever' is the distance 
            // from our edges to the support's internal edges.
            if (sRight >= nodeLeft - 0.1 && sLeft <= nodeRight + 0.1) {
                maxClusterCantilever = Math.max(maxClusterCantilever, distLeft, distRight);
            }
        });

        if (minNodeDistToSupport > 0 && minNodeDistToSupport !== Infinity) {
            // If this node is entirely floating, its overhang includes its own width
            // plus the distance to the nearest supported neighbor.
            // A simpler way: distance from the FURTHEST edge of this node to the nearest support.
            let furthestPointDist = Infinity;
            mergedIntervals.forEach(([sLeft, sRight]) => {
                const d = Math.max(nodeRight - sRight, sLeft - nodeLeft);
                furthestPointDist = Math.min(furthestPointDist, d);
            });
            maxClusterCantilever = Math.max(maxClusterCantilever, furthestPointDist);
        }
    });

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
    targetType: string,
    maxOverhang = 50.1 // 5 Cells (Industry Standard)
): { isValid: boolean; overhang: number } => {
    const cantilever = getMaxCantilever(x, y, width, allShapes, targetType);
    return {
        isValid: cantilever <= maxOverhang,
        overhang: cantilever
    };
};
