# Performance Architecture Audit & Execution Matrix
(Saved Snapshot: Phase 1-3 Overview)

This document diagnoses the mathematical and architectural limits of the `villaggio-terrace` simulation, providing an industry-leading execution matrix targeting WebGL bottlenecks, memory leaks, and parallel offloading.

## 1. Common Simulation Bottleneck Conditions
In highly dynamic React-Three-Fiber applications, bottlenecks consistently manifest through:
* **Draw Call Saturation**: Rendering unique `<mesh>` or `<group>` components per entity linearly increases CPU-to-GPU instructions overhead (O(N) growth).
* **DOM/Virtual-DOM React Reconciliation**: Rapidly updating huge state arrays causes React to diff thousands of node trees entirely on the main CPU thread.
* **Raycaster Latency**: Evaluating matrix hits across unoptimized meshes sequentially drains CPU cycles exclusively on interactive events (mouse over/clicks).
* **Garbage Collection (GC) Stutters**: Repeatedly allocating/discarding high-frequency volatile math classes (`new THREE.Vector3`) blocks the event loop periodically.

## 2. Our Specific Primary Bottlenecks & Impact
Utilizing structural metrics, our primary bottlenecks (ranked by impact) are:

### A. The Master `shapes` Array (Reconciliation Engine)
* **Impact**: Total Blocking Time (TBT) / Frame Drops
* **Condition**: The entire architectural structure lives in `store.ts` via Zustand. As room count increases past 5,000+, every deletion/addition forces a shallow clone of the parent array and triggers a catastrophic O(N) React render cascading down to every component.

### B. Discrete Component Hierarchies (Draw Calls)
* **Impact**: FPS / GPU Pipeline Stalls
* **Condition**: Nodes like `<ResidentialRoom>` and `<RoomMeshCSG>` generate unique draw calls instead of feeding mathematical instance buffers. A 2,000-room tower invokes 2,000+ geometric draw loops.

### C. Sweeping O(N) Collision Algorithms
* **Impact**: CPU Hitches on Interaction
* **Condition**: Functions like `checkPlacement` or `deleteShape` loop iteratively mapping states without a spatial indexing tree (QuadTree/Octree), costing exponential checks.

## 3. Memory Virtualization (IndexedDB)
**Resolution**: Moving to **IndexedDB Component Paging (Minecraft-style Chunk Loading)**. The global array of shapes maps back to IndexedDB. React *only* loads strict 'chunks' representing the immediate Frustum array geometry. Total UI Memory becomes physically O(1).

## 4. Hardware Acceleration (Three.js WebGPURenderer)
**Resolution**: Migrating to `WebGPURenderer` offloads pathfinding and AI into computational threads (WGSL Compute Shaders), entirely evading DOM logic latency limits.

## 5. Worker Optimization
**Resolution**: Relocate computational mathematical evaluations directly backwards into the unused capacities inside `src/worker/pool.ts` to un-block the rendering cascade loop entirely on user interactions.

---

## 🚀 Execution Tasks Matrix 
### Phase 1: IndexedDB Spatial Virtualization
- Implement Dexie/IndexedDB chunk caching protocol.
- Migrate store arrays into DB chunking system.
- Frustum stream mapping.

### Phase 2: WebGPURenderer Instance Porting
- Intialize WebGPURenderer bounds.
- Transfer SimulationNodes to unified InstancedMesh matrices.
- WGSL Logic migrations.

### Phase 3: Deep Worker Isolation
- Route placement evaluation mathematics into worker queues.
- Synchronize background collision checking out of DOM tree.
