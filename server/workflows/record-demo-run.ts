import { defineWorkflow } from "@vite-hub/workflow"
import { evlog } from "../observability/evlog"

export interface RecordDemoRunPayload {
  note?: string
  origin?: string
  requestedAt?: string
  runId?: string
  threadId?: string
  topic?: string
}

export interface RecordDemoRunResult {
  recordedAt: string
  summary: string
  payload: RecordDemoRunPayload
  provider: string
}

export default defineWorkflow<RecordDemoRunPayload, RecordDemoRunResult>(async ({ payload, provider, step }) => {
  const startedAt = Date.now()
  evlog.info("nuxt.agent.WORKFLOW_STARTED", {
    origin: payload.origin || "agent",
    provider,
    run_id: payload.runId,
    thread_id_hash: evlog.safeId(payload.threadId),
    topic: payload.topic || "nuxt-agent-demo",
  })

  const recorded = await step?.do?.("record-demo-run", {}, async () => ({
    recordedAt: new Date().toISOString(),
    summary: `Recorded ${payload.topic || "nuxt-agent-demo"} from ${payload.origin || "agent"}.`,
  })) ?? {
    recordedAt: new Date().toISOString(),
    summary: `Recorded ${payload.topic || "nuxt-agent-demo"} from ${payload.origin || "agent"}.`,
  }

  evlog.info("nuxt.agent.WORKFLOW_RECORDED", {
    ms: Date.now() - startedAt,
    origin: payload.origin || "agent",
    provider,
    run_id: payload.runId,
    thread_id_hash: evlog.safeId(payload.threadId),
    topic: payload.topic || "nuxt-agent-demo",
  })

  return {
    ...recorded,
    payload,
    provider,
  }
})
