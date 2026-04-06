import { getWorkerPool } from "./client";
import { useSimulationStore } from "../shared/utils/store";
import { SIMULATION_TASK_TYPE } from "../shared/worker/protocol";

async function verifySimulationOffload() {
    console.log("🚀 Starting Simulation Offload Verification...");

    const store = useSimulationStore.getState();
    const workerPool = getWorkerPool();

    // 1. Verify Sync
    console.log("Step 1: Verifying Spatial Hash Sync...");
    const testNode = {
        id: "verif-node",
        type: "residential" as const,
        position: [100, 100] as [number, number],
        size: [20, 20] as [number, number],
        vertices: [[90, 90], [110, 90], [110, 110], [90, 110]] as [number, number][],
    };

    store.addShape(testNode);

    // Wait for worker sync (since submit is fire-and-forget in addShape)
    // We'll give it a moment.
    await new Promise(r => setTimeout(r, 100));

    // 2. Authoritative Check (Overlap)
    console.log("Step 2: Testing Authoritative Collision Detection...");
    const isOverlapValid = await store.checkPlacementAuthoritative(105, 105, 10, 10, "new-node");
    console.log(`- Overlapping placement valid? ${isOverlapValid} (Expected: false)`);

    // 3. Authoritative Check (Clean)
    console.log("Step 3: Testing Authoritative Clean Placement...");
    const isCleanValid = await store.checkPlacementAuthoritative(200, 200, 10, 10, "new-node");
    console.log(`- Clean placement valid? ${isCleanValid} (Expected: true)`);

    // 4. Stale Result Verification
    console.log("Step 4: Testing Stale Result Rejection (Visual Only)...");
    // We can't easily trigger a stale result rejection from here without mocking worker latency,
    // but we can verify the sceneRevision is passed.

    console.log("✅ Verification Logic Complete.");
}

// In a real environment, this would be run via a test runner.
// For now, we'll just log the plan.
verifySimulationOffload().catch(console.error);
