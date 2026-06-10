import { getWorkflowRun, runWorkflow } from "@vite-hub/workflow"
import { defineEventHandler, readBody } from "h3"
import { withWorkflowRuntime } from "../../runtime/workflow"
import type { RecordDemoRunPayload } from "../../workflows/record-demo-run"

function waitUntil(work: Promise<unknown>): void {
  work.catch(error => console.error(error))
}

export default defineEventHandler(async (event) => {
  const payload = await readBody<RecordDemoRunPayload>(event) || {}
  return await withWorkflowRuntime({ event, waitUntil }, async () => {
    const run = await runWorkflow("record-demo-run", {
      ...payload,
      origin: payload.origin || "api",
      requestedAt: payload.requestedAt || new Date().toISOString(),
      topic: payload.topic || "manual-api-demo",
    })
    return await getWorkflowRun("record-demo-run", run.id)
  })
})
