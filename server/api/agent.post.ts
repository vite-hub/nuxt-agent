import { createMessage, runAgent } from "@vite-hub/agent"
import { defineEventHandler, readBody } from "h3"
import nuxtAgent from "../agents/nuxt/config"
import { withWorkflowRuntime } from "../runtime/workflow"

function createMemo() {
  const values = new Map<string, unknown>()
  return <T>(key: string, create: () => T): T => {
    if (!values.has(key)) values.set(key, create())
    return values.get(key) as T
  }
}

function waitUntil(work: Promise<unknown>): void {
  work.catch(error => console.error(error))
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ prompt?: string }>(event) || {}
  const prompt = body.prompt || "What can this Nuxt Agent do?"
  const runId = `api-${Date.now()}`

  return await withWorkflowRuntime({ event, waitUntil }, async () => {
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
})
