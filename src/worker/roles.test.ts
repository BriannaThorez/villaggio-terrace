import { getWorkerPool } from "./client";

async function verifyWorkerRoles() {
    const pool = getWorkerPool();
    console.log("Verifying Worker Pool Roles...");

    // Wait for workers to be ready
    await new Promise(r => setTimeout(r, 1000));

    const snapshot = pool.snapshot();
    console.log("Pool Snapshot:", snapshot);

    // Submit a health check (any worker can pick it up)
    const results = await Promise.all([
        pool.submit({ taskType: "worker/health-check", payload: {}, sceneRevision: 0, clientRevision: 0 }).promise,
        pool.submit({ taskType: "worker/health-check", payload: {}, sceneRevision: 0, clientRevision: 0 }).promise,
        pool.submit({ taskType: "worker/health-check", payload: {}, sceneRevision: 0, clientRevision: 0 }).promise,
        pool.submit({ taskType: "worker/health-check", payload: {}, sceneRevision: 0, clientRevision: 0 }).promise,
    ]);

    const rolesFound = new Set(results.map((r: any) => r.role));
    console.log("Roles performing health checks:", Array.from(rolesFound));

    if (rolesFound.has("layout") && rolesFound.has("routing")) {
        console.log("✅ Specialized roles verified!");
    } else {
        console.log("⚠️ Multiple roles not detected in first batch. This may happen if dispatch picks the same workers. Try more tasks.");
    }
}

verifyWorkerRoles().catch(console.error);
