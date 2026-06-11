import { getWorkflowRun, runWorkflow } from "@vite-hub/workflow"
import { defineEventHandler, getHeader, readBody } from "h3"
import { auditEvents } from "../../observability/audit"
import { errorEvents } from "../../observability/errors"
import { evlog } from "../../observability/evlog"
import { waitUntil } from "../../runtime/wait-until"
import { withWorkflowRuntime } from "../../runtime/workflow"
import type { RecordDemoRunPayload } from "../../workflows/record-demo-run"

export default defineEventHandler(async (event) => {
  const startedAt = Date.now()
  const requestId = getHeader(event, "x-vercel-id")
  const payload = await readBody<RecordDemoRunPayload>(event) || {}

  evlog.audit(auditEvents.WORKFLOW_REQUESTED({
    actor: evlog.actor,
    target: { id: payload.runId || payload.topic || "record-demo-run" },
  }), {
    origin: payload.origin || "api",
    request_id: requestId,
    run_id: payload.runId,
    thread_id_hash: evlog.safeId(payload.threadId),
    topic: payload.topic || "manual-api-demo",
  })

  try {
    const result = await withWorkflowRuntime({ event, waitUntil }, async () => {
      const run = await runWorkflow("record-demo-run", {
        ...payload,
        origin: payload.origin || "api",
        requestedAt: payload.requestedAt || new Date().toISOString(),
        topic: payload.topic || "manual-api-demo",
      })
      return await getWorkflowRun("record-demo-run", run.id)
    })

    evlog.audit(auditEvents.WORKFLOW_COMPLETED({
      actor: evlog.actor,
      target: { id: result.id },
    }), {
      ms: Date.now() - startedAt,
      origin: payload.origin || "api",
      provider: result.provider,
      request_id: requestId,
      run_id: payload.runId,
      status: result.status,
      thread_id_hash: evlog.safeId(payload.threadId),
      workflow_run_id: result.id,
    })

    return result
  } catch (error) {
    evlog.error(errorEvents.WORKFLOW_RUN_FAILED({
      cause: error instanceof Error ? error : undefined,
      internal: { requestId },
    }), error, {
      ms: Date.now() - startedAt,
      origin: payload.origin || "api",
      request_id: requestId,
      run_id: payload.runId,
      thread_id_hash: evlog.safeId(payload.threadId),
    })
    throw error
  }
})
