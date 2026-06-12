import { createOpenAI, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai"
import { createTelegramAdapter } from "@chat-adapter/telegram"
import { defineAgent, defineCapability, workflow } from "@vite-hub/agent"
import { chat, getTranscriptionResults, mcp, transcribe, usageTelemetry, vercelAiGatewayPricing } from "@vite-hub/agent/capabilities"
import { remoteMcpServer } from "@vite-hub/agent/mcp"
import { source } from "@vite-hub/workspace"
import { createGateway } from "ai"
import { finishNuxtRun, instrumentNuxtCallSettings, instrumentNuxtModel, nuxtObservability } from "../../observability/capability"
import { nuxtRateLimit } from "../../rate-limit/capability"
import { getServerEnv, getTelegramEnv } from "../../runtime/env"

const maxTranscriptionAudioBytes = 25 * 1024 * 1024
const usageRecordTranscriptionsKey = "__nuxtAgentTranscriptions"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function attachTranscriptionsToUsageRecord() {
  return defineCapability({
    id: "telegram-transcription-reply",
    output(context) {
      context.output.render((result) => {
        if (!isRecord(result)) return result

        const transcriptions = getTranscriptionResults(context)
          .map(item => item.transcript.trim())
          .filter(Boolean)
        if (!transcriptions.length) return result

        return {
          ...result,
          [usageRecordTranscriptionsKey]: transcriptions,
        }
      })
    },
  })
}

export default defineAgent({
  name: "nuxt",
  title: "Nuxt Agent",
  description: "Answers Nuxt questions through ViteHub Agent Definitions, MCP tools, Workspace Sources, Telegram voice input, telemetry, and Workflow.",
  runtime: workflow("nuxt-agent-demo-0610"),
  hooks: {
    "agent:finish": finishNuxtRun,
  },
  instructions: async ({ fs }) => await fs.readFile("AGENTS.md"),
  model: () => {
    const env = getServerEnv()
    if (env.aiGatewayApiKey) {
      return createGateway({ apiKey: env.aiGatewayApiKey })(env.aiGatewayModel)
    }

    const openaiModel = env.aiGatewayModel.startsWith("openai/")
      ? env.aiGatewayModel.slice("openai/".length)
      : env.aiGatewayModel
    return createOpenAI({ apiKey: env.openaiApiKey })(openaiModel)
  },
  modelExecution: {
    stepLimit: 8,
    callSettings: {
      providerOptions: {
        openai: {
          reasoningEffort: "low",
        } satisfies OpenAILanguageModelResponsesOptions,
      },
    },
    instrumentation: {
      callSettings(context) {
        const { callSettings, run } = context
        const observedSettings = (instrumentNuxtCallSettings(context) || {}) as Record<string, unknown>
        const observedTelemetry = typeof observedSettings.experimental_telemetry === "object" && observedSettings.experimental_telemetry
          ? observedSettings.experimental_telemetry as Record<string, unknown>
          : {}

        return {
          ...callSettings,
          ...observedSettings,
          experimental_telemetry: {
            ...observedTelemetry,
            isEnabled: true,
            functionId: "nuxt-agent",
            metadata: {
              origin: run?.origin,
              runId: run?.runId,
              threadId: run?.threadId,
            },
          },
        }
      },
      model: instrumentNuxtModel,
    },
  },
  capabilities: [
    nuxtObservability(),
    nuxtRateLimit(),
    mcp({
      instructions: [
        "Nuxt MCP tools provide the official Nuxt.com knowledge boundary.",
        "Use `mcp_nuxt_list_documentation_pages` before `mcp_nuxt_get_documentation_page` when the exact docs path is unknown.",
        "Use module, blog, deployment, and changelog MCP tools for those specific Nuxt ecosystem questions.",
      ].join("\n"),
      servers: {
        nuxt: () => remoteMcpServer({
          url: getServerEnv().nuxtMcpUrl,
        }),
      },
    }),
    chat({
      adapters: {
        telegram: () => {
          const telegram = getTelegramEnv()
          return createTelegramAdapter({
            botToken: telegram.telegramBotToken,
            secretToken: telegram.telegramWebhookSecretToken,
          })
        },
      },
      concurrency: "queue",
      fallbackStreamingPlaceholderText: () => "Thinking",
      history: { maxMessages: 8, source: "thread" },
      identity({ adapter, author }) {
        return `${adapter}:${author.userId}`
      },
      stream: false,
      userName: "nuxt-agent",
      webhooks: {
        telegram: {
          secretToken: () => getTelegramEnv().telegramWebhookSecretToken,
        },
      },
    }),
    transcribe(() => {
      const env = getServerEnv()
      return {
        maxBytes: maxTranscriptionAudioBytes,
        model: createOpenAI({ apiKey: env.openaiApiKey }).transcription(env.openaiTranscriptionModel),
      }
    }),
    attachTranscriptionsToUsageRecord(),
    usageTelemetry({
      includeRaw: true,
      pricing: vercelAiGatewayPricing(),
    }),
  ],
  workspace: {
    store: { provider: "memory" },
    sources: {
      instructions: source.file("AGENTS.md"),
      nuxt: source.fetch({
        instructions: [
          "Use this source as the addressable official Nuxt documentation index.",
          "Prefer the Nuxt MCP tools for detailed docs, modules, blog posts, deployment providers, and changelog answers.",
        ],
        path: "nuxt/llms.txt",
        responseType: "text",
        url: new URL("/llms.txt", process.env.NUXT_DOCS_URL?.trim() || "https://nuxt.com"),
      }),
    },
  },
})
