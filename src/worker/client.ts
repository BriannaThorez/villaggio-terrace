import { WorkerPoolClient } from "./pool";

let workerPool: WorkerPoolClient | null = null;

export const getWorkerPool = () => {
    if (!workerPool) {
        workerPool = new WorkerPoolClient({
            workerFactory: (role) => {
                const url = new URL("./worker.ts", import.meta.url);
                url.searchParams.set("role", role);
                return new Worker(url, {
                    type: "module",
                });
            },
            workerCount: Math.max(navigator.hardwareConcurrency || 4, 4),
            roles: ["layout", "layout", "routing", "analysis"],
        });
    }
    return workerPool;
};
