import { defineEventHandler } from "h3"

export default defineEventHandler(() => ({
  name: "nuxt-agent",
  endpoints: {
    agent: "POST /api/agent",
    telegram: "POST /api/_vitehub/agents/nuxt/webhooks/telegram",
    workflow: "POST /api/workflows/record-demo-run",
  },
}))
