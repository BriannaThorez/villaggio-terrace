import { initWorkerRuntime } from "./runtime";
import { registerFoundationWorkerTasks } from "./workerTasks";

registerFoundationWorkerTasks();

initWorkerRuntime({
  role: "default",
  supportedRoles: ["default", "layout", "routing", "analysis", "export"],
  capabilities: [
    "cooperative-cancellation",
    "stale-result-rejection",
    "multi-worker-coordination",
    "request-versioning",
  ],
  maxConcurrentTasks: 2,
});
