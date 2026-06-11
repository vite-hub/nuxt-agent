import { createMessage, runAgent } from "@vite-hub/agent"
import { defineEventHandler, getHeader, readBody } from "h3"
import nuxtAgent from "../agents/nuxt/config"
import { auditEvents } from "../observability/audit"
import { errorEvents } from "../observability/errors"
import { evlog } from "../observability/evlog"
import { waitUntil } from "../runtime/wait-until"
import { withWorkflowRuntime } from "../runtime/workflow"

function createMemo() {
  const values = new Map<string, unknown>()
  return <T>(key: string, create: () => T): T => {
    if (!values.has(key)) values.set(key, create())
    return values.get(key) as T
  }
}

export default defineEventHandler(async (event) => {
  const startedAt = Date.now()
  const body = await readBody<{ prompt?: string }>(event) || {}
  const prompt = body.prompt || "What can this Nuxt Agent do?"
  const runId = `api-${Date.now()}`
  const requestId = getHeader(event, "x-vercel-id")

  evlog.audit(auditEvents.API_AGENT_REQUESTED({
    actor: evlog.actor,
    target: { id: runId },
  }), {
    prompt_length: prompt.length,
    request_id: requestId,
    run_id: runId,
  })

  try {
    const result = await withWorkflowRuntime({ event, waitUntil }, async () => {
      return await runAgent(nuxtAgent, {
        memo: createMemo(),
        run: { origin: "api", runId },
        runtime: process.env.VERCEL ? "vercel" : "vite",
        waitUntil,
      }, {
        messages: [
          createMessage({
            role: "user",
            text: prompt,
          }),
        ],
      })
    })

    evlog.audit(auditEvents.API_AGENT_QUEUED({
      actor: evlog.actor,
      target: { id: runId },
    }), {
      ms: Date.now() - startedAt,
      request_id: requestId,
      run_id: runId,
    })

    return result
  } catch (error) {
    evlog.error(errorEvents.API_AGENT_FAILED({
      cause: error instanceof Error ? error : undefined,
      internal: { requestId },
    }), error, {
      ms: Date.now() - startedAt,
      request_id: requestId,
      run_id: runId,
    })
    throw error
  }
})
