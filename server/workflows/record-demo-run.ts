import { defineWorkflow } from "@vite-hub/workflow"

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
  const recorded = await step?.do?.("record-demo-run", {}, async () => ({
    recordedAt: new Date().toISOString(),
    summary: `Recorded ${payload.topic || "nuxt-agent-demo"} from ${payload.origin || "agent"}.`,
  })) ?? {
    recordedAt: new Date().toISOString(),
    summary: `Recorded ${payload.topic || "nuxt-agent-demo"} from ${payload.origin || "agent"}.`,
  }

  return {
    ...recorded,
    payload,
    provider,
  }
})
