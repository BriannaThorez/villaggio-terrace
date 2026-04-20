import type { SimulationNode } from "../../../shared/utils/store";

// ═══════════════════════════════════════════════════════════
// Industry-Leading Floor Bucket Spatial Index
// ═══════════════════════════════════════════════════════════
// Replaces O(N) full-array scans with O(1) bucket lookups
// for all structural constraint and collision queries.
// ═══════════════════════════════════════════════════════════

/** Architectural constants for the spatial partitioning grid */
export const STRUCTURAL_CONSTANTS = {
  /** Y-position below which a room is considered ground-level (no overhang check) */
  GROUND_THRESHOLD: 10,
  /** Vertical distance between structural floors */
  FLOOR_HEIGHT: 40,
  /** Proximity threshold for structural support detection */
  SUPPORT_PROXIMITY: 10,
  /** Epsilon for cluster adjacency (generous, allows 1-cell floating point slack) */
  CLUSTER_ADJACENCY_EPSILON: 1.0,
  /** Epsilon for support detection (tight, requires near-contact) */
  SUPPORT_EPSILON: 0.1,
  /** Epsilon for AABB collision detection */
  COLLISION_EPSILON: 0.1,
} as const;

/** Types that participate in structural graph calculations */
const STRUCTURAL_TYPES = new Set([
  "structure",
  "lobby",
  "residential",
  "commercial",
  "office",
  "utility",
  "elevator",
  "empty_floor",
]);

/** Types excluded from collision checks */
const NON_COLLIDABLE_TYPES = new Set(["text", "select"]);

/**
 * Computes the floor bucket key for a given Y position.
 * Nodes on the same floor share a bucket.
 */
const floorBucketKey = (y: number): number =>
  Math.round(y / STRUCTURAL_CONSTANTS.FLOOR_HEIGHT);

/**
 * FloorBucketIndex: O(1) spatial lookup for floor-aligned queries.
 *
 * Instead of scanning every node in the simulation, queries are
 * restricted to nodes sharing the same Y-bucket (floor level).
 *
 * Re-created on shapes array change via useMemo in consumers.
 */
export class FloorBucketIndex {
  private buckets = new Map<number, SimulationNode[]>();
  private structuralBuckets = new Map<number, SimulationNode[]>();

  constructor(shapes: SimulationNode[]) {
    for (const shape of shapes) {
      if (NON_COLLIDABLE_TYPES.has(shape.type)) continue;

      const key = floorBucketKey(shape.position[1]);

      // General bucket (all collidable shapes)
      let bucket = this.buckets.get(key);
      if (!bucket) {
        bucket = [];
        this.buckets.set(key, bucket);
      }
      bucket.push(shape);

      // Structural-only bucket (for integrity checks)
      if (STRUCTURAL_TYPES.has(shape.type)) {
        let sBucket = this.structuralBuckets.get(key);
        if (!sBucket) {
          sBucket = [];
          this.structuralBuckets.set(key, sBucket);
        }
        sBucket.push(shape);
      }
    }
  }

  /** Returns all collidable nodes on the same floor as the given Y. */
  getFloorNodes(y: number): SimulationNode[] {
    return this.buckets.get(floorBucketKey(y)) ?? [];
  }

  /** Returns only structural nodes on the same floor as the given Y. */
  getStructuralFloorNodes(y: number): SimulationNode[] {
    return this.structuralBuckets.get(floorBucketKey(y)) ?? [];
  }

  /** Returns nodes on the floor directly below the given Y. */
  getSupportNodes(y: number): SimulationNode[] {
    const belowY = y - STRUCTURAL_CONSTANTS.FLOOR_HEIGHT;
    return this.buckets.get(floorBucketKey(belowY)) ?? [];
  }
}
