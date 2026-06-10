import { runWithWorkflowRuntimeEvent, setWorkflowRuntimeConfig, setWorkflowRuntimeRegistry } from "@vite-hub/workflow/runtime/state"
import type { WorkflowDefinition } from "@vite-hub/workflow"

let configured = false

export function ensureWorkflowRuntime(): void {
  if (configured) return
  setWorkflowRuntimeConfig({ provider: "vercel" })
  setWorkflowRuntimeRegistry({
    "record-demo-run": async () => await import("../workflows/record-demo-run") as unknown as { default: WorkflowDefinition },
  })
  configured = true
}

export async function withWorkflowRuntime<T>(event: unknown, run: () => Promise<T> | T): Promise<T> {
  ensureWorkflowRuntime()
  return await runWithWorkflowRuntimeEvent(event, run)
}
