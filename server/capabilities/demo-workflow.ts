import { jsonSchema } from "ai"
import { defineCapability } from "@vite-hub/agent/capability-runtime"
import { getWorkflowRun, runWorkflow } from "@vite-hub/workflow"
import { ensureWorkflowRuntime } from "../runtime/workflow"

interface StartDemoWorkflowInput {
  note?: string
  topic?: string
}

function validateInput(input: unknown) {
  if (input === undefined || input === null) return { value: {} }
  if (typeof input !== "object" || Array.isArray(input)) {
    return { issues: ["Input must be an object."] }
  }
  const record = input as Record<string, unknown>
  return {
    value: {
      note: typeof record.note === "string" ? record.note : undefined,
      topic: typeof record.topic === "string" ? record.topic : undefined,
    } satisfies StartDemoWorkflowInput,
  }
}

const startDemoWorkflowInputSchema = jsonSchema<StartDemoWorkflowInput>({
  additionalProperties: false,
  properties: {
    note: {
      description: "Optional note to store with the workflow run.",
      type: "string",
    },
    topic: {
      description: "Optional topic for the workflow run.",
      type: "string",
    },
  },
  type: "object",
})

export function demoWorkflow() {
  return defineCapability({
    id: "demo-workflow",
    instructions: [
      "Use `start_demo_workflow` when the user asks to demonstrate Vercel Workflow, durable work, background work, or ViteHub workflow primitives.",
      "Report the returned workflow run id and status succinctly.",
    ].join("\n"),
    resolve(context) {
      context.tools.add({
        start_demo_workflow: {
          description: "Start the Vercel-backed record-demo-run Workflow Definition for this Nuxt Agent demo.",
          inputSchema: startDemoWorkflowInputSchema,
          name: "start_demo_workflow",
          execute: async (input: unknown) => {
            const parsed = validateInput(input)
            if ("issues" in parsed) throw new Error((parsed.issues || []).join("\n"))
            const request = parsed.value
            ensureWorkflowRuntime()
            const run = await runWorkflow("record-demo-run", {
              note: request.note,
              origin: context.run?.origin || "agent",
              requestedAt: new Date().toISOString(),
              runId: context.run?.runId,
              threadId: context.run?.threadId,
              topic: request.topic || "nuxt-agent-demo",
            })
            return await getWorkflowRun("record-demo-run", run.id)
          },
        },
      })
    },
  })
}
