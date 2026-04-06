import { initWorkerRuntime } from "./runtime";
import {
  registerFoundationWorkerTasks,
  registerLayoutTasks,
  registerRoutingTasks,
  registerAnalysisTasks,
} from "./workerTasks";
import { getWorkerRuntimeState } from "./runtime";

initWorkerRuntime({
  capabilities: [
    "cooperative-cancellation",
    "stale-result-rejection",
    "multi-worker-coordination",
    "request-versioning",
  ],
  maxConcurrentTasks: 2,
});

const { role } = getWorkerRuntimeState();

registerFoundationWorkerTasks();

if (role === "layout" || role === "default") {
  registerLayoutTasks();
}

if (role === "routing" || role === "default") {
  registerRoutingTasks();
}

if (role === "analysis" || role === "default") {
  registerAnalysisTasks();
}
