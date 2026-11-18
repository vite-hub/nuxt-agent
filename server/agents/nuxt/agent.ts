import { createOpenAI } from "@ai-sdk/openai"
import { defineAgent } from "vite-hub/agent"
import { mcp, rateLimit, transcribe } from "vite-hub/agent/capabilities"
import { telegram } from "vite-hub/agent/channels"
import { remoteMcpServer } from "vite-hub/agent/mcp"
import { useServerEnv } from "vite-hub/env"
import { openai } from "vite-hub/gateways"
import { languageModel } from "vite-hub/gateways/ai-sdk"
import { createRateLimiter } from "vite-hub/rate-limit"
import { memoryRateLimitDriver } from "vite-hub/rate-limit/drivers/memory"
import { fetch as fetchSource } from "vite-hub/workspace"
import { formatUsageMessage } from "./usage"

export default defineAgent({
  hooks: {
    async "agent:finish"(event) {
      const usage = event.invocation.usage
      if (usage) return event.reply(await formatUsageMessage(usage))
    },
  },
  workspace: {
    sources: {
      nuxt: fetchSource({
        responseType: "text",
        url: new URL("https://nuxt.com/llms.txt"),
        workspacePath: "nuxt/llms.txt",
      }),
    },
  },
  messages: {
    concurrency: "queue",
    userName: "nuxt-agent",
  },
  channels: {
    // Reads TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET_TOKEN.
    telegram: telegram({ mode: "webhook" }),
  },
  // A model Driver: the Codex binary (about 300 MB) does not fit in a Vercel Function. openai() reads OPENAI_API_KEY.
  driver: { model: languageModel(openai(), "gpt-5.6-terra", { api: "responses" }) },
  capabilities: [
    rateLimit({
      limiter: createRateLimiter({
        driver: memoryRateLimitDriver(),
        limit: 20,
        name: "nuxt-agent-messages",
        window: "1d",
      }),
      message: decision => `You've reached the daily limit of ${decision.limit} messages. Try again tomorrow.`,
    }),
    mcp({
      servers: {
        nuxt: remoteMcpServer({ url: "https://nuxt.com/mcp" }),
      },
    }),
    transcribe(() => ({
      model: createOpenAI({ apiKey: useServerEnv().openai.apiKey.unseal() }).transcription("gpt-4o-transcribe"),
    })),
  ],
})
