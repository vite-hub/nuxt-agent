import { defineEventHandler } from "h3"

export default defineEventHandler(() => ({
  name: "nuxt-agent",
  endpoints: {
    agent: "POST /api/agent",
    telegram: "POST /api/telegram",
    workflow: "POST /api/workflows/record-demo-run",
  },
}))
