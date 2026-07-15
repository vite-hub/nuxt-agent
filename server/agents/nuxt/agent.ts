import { createOpenAI } from "@ai-sdk/openai"
import { createTelegramAdapter } from "@chat-adapter/telegram"
import { defineAgent } from "@vite-hub/agent"
import { mcp, observability, rateLimit, transcribe, type AgentObservabilityFinishExtension } from "@vite-hub/agent/capabilities"
import { telegram } from "@vite-hub/agent/channels"
import { codexDriver } from "@vite-hub/agent/harness/codex"
import { remoteMcpServer } from "@vite-hub/agent/mcp"
import { fetch as fetchSource } from "@vite-hub/workspace"
import { useServerEnv } from "#vitehub/env/server"
import { formatUsageMessage } from "./usage"

export default defineAgent({
  hooks: {
    "agent:finish"(event) {
      if (event.error) return
      const usage = event.extensions.get<AgentObservabilityFinishExtension>("observability")?.usage
      if (usage) return event.reply(formatUsageMessage(usage))
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
    telegram: telegram({
      adapter: () => {
        const { telegram } = useServerEnv()
        return createTelegramAdapter({
          botToken: telegram.botToken.unseal(),
          secretToken: telegram.webhookSecretToken.unseal(),
        })
      },
      webhooks: { secretToken: () => useServerEnv().telegram.webhookSecretToken.unseal() },
    }),
  },
  driver: codexDriver({ model: "gpt-5.6-terra", reasoningEffort: "high" }),
  capabilities: [
    observability(),
    rateLimit({
      limit: 20,
      message: decision => `You've reached the daily limit of ${decision.limit} messages. Try again tomorrow.`,
      window: "1d",
    }),
    mcp({
      servers: {
        nuxt: remoteMcpServer({ url: "https://nuxt.com/mcp" }),
      },
    }),
    transcribe(() => ({
      model: createOpenAI({ apiKey: useServerEnv().openaiApiKey.unseal() }).transcription("gpt-4o-transcribe"),
    })),
  ],
})
