import { createOpenAI, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai"
import { createTelegramAdapter } from "@chat-adapter/telegram"
import { defineAgent, defineCapability, type AgentChatFinishExtension, type AgentFinishEvent, type AgentRuntimeConfig, type AgentUsageRecord, workflow } from "@vite-hub/agent"
import { chat, getTranscriptionResults, mcp, transcribe, usageTelemetry, vercelAiGatewayPricing, type AgentUsagePricing } from "@vite-hub/agent/capabilities"
import { remoteMcpServer } from "@vite-hub/agent/mcp"
import { source } from "@vite-hub/workspace"
import { createGateway } from "ai"
import { finishNuxtRun, instrumentNuxtCallSettings, instrumentNuxtModel, nuxtObservability } from "../../observability/capability"
import { nuxtRateLimit } from "../../rate-limit/capability"
import { getServerEnv, getTelegramEnv } from "../../runtime/env"

const maxTranscriptionAudioBytes = 25 * 1024 * 1024
const chatExtensionId = "chat"
const usageTelemetryExtensionId = "usage-telemetry"
const usageRecordTranscriptionsKey = "__nuxtAgentTranscriptions"
const aiGatewayPricing = vercelAiGatewayPricing()

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

function formatUsageNumber(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-US").format(value)
    : undefined
}

function formatUsageSeconds(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "n/a"
  return `${(value / 1000).toFixed(value < 10_000 ? 2 : 1)}s`
}

function readFiniteNumber(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key]
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function getGenerationDurationMs(record: AgentUsageRecord, ai: Record<string, unknown> | undefined) {
  return readFiniteNumber(ai, "totalDurationMs")
    ?? readFiniteNumber(ai, "msToFinish")
    ?? record.latency?.durationMs
}

function formatUsageSpeed(record: AgentUsageRecord, ai: Record<string, unknown> | undefined) {
  const generationSpeed = readFiniteNumber(ai, "tokensPerSecond")
  if (generationSpeed !== undefined) return `${generationSpeed.toFixed(1)} tok/s`

  const recordedSpeed = record.latency?.tokensPerSecond
  if (typeof recordedSpeed === "number" && Number.isFinite(recordedSpeed)) return `${recordedSpeed.toFixed(1)} tok/s`

  const durationMs = getGenerationDurationMs(record, ai)
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs <= 0) return "n/a"

  const outputTokens = readFiniteNumber(ai, "outputTokens") ?? record.usage?.outputTokens
  if (typeof outputTokens !== "number" || !Number.isFinite(outputTokens)) return "n/a"

  return `${(outputTokens / (durationMs / 1000)).toFixed(1)} tok/s`
}

function formatTokenSummary(record: AgentUsageRecord) {
  const usage = record.usage
  const input = formatUsageNumber(usage?.inputTokens)
  const output = formatUsageNumber(usage?.outputTokens)
  const total = formatUsageNumber(usage?.totalTokens ?? (
    usage?.inputTokens !== undefined && usage.outputTokens !== undefined
      ? usage.inputTokens + usage.outputTokens
      : undefined
  ))
  const details = [input ? `${input} in` : undefined, output ? `${output} out` : undefined].filter(Boolean).join(", ")

  return `${total || "n/a"} total${details ? ` (${details})` : ""}`
}

function formatUsageCost(record: AgentUsageRecord) {
  const cost = record.cost
  if (!cost) return "n/a"

  const prefix = cost.estimated ? "~" : ""
  const amount = Number(cost.amount)
  if (!Number.isFinite(amount)) return `${prefix}${cost.amount} ${cost.currency}`

  const decimals = amount >= 1 ? 2 : amount >= 0.01 ? 4 : amount >= 0.0001 ? 6 : 8
  const formattedAmount = amount.toFixed(decimals).replace(/\.?0+$/, "")
  return `${prefix}$${formattedAmount} ${cost.currency}`
}

function addModelIdCandidate(ids: Set<string>, id: string | undefined) {
  if (!id) return
  ids.add(id)
  if (id.startsWith("openai/")) {
    ids.add(id.slice("openai/".length))
  }
  else {
    ids.add(`openai/${id}`)
  }
}

const nuxtUsagePricing: AgentUsagePricing = async (context) => {
  const modelIds = new Set<string>()
  addModelIdCandidate(modelIds, context.model?.id)
  addModelIdCandidate(modelIds, getServerEnv().aiGatewayModel)

  for (const modelId of modelIds) {
    const cost = await aiGatewayPricing({
      ...context,
      model: { ...context.model, id: modelId },
    })
    if (cost) return cost
  }
}

function formatNuxtUsageMessage(record: AgentUsageRecord, ai: Record<string, unknown> | undefined) {
  const generationDurationMs = getGenerationDurationMs(record, ai)
  const lines = [
    "**Usage**",
    `- Tokens: \`${formatTokenSummary(record)}\``,
    `- Generation: \`${formatUsageSeconds(generationDurationMs)}\``,
    `- Speed: \`${formatUsageSpeed(record, ai)}\``,
    `- Price: \`${formatUsageCost(record)}\``,
  ]

  if (record.model?.id) {
    lines.push(`- Model: \`${record.model.id}\``)
  }

  return lines.join("\n")
}

async function finishNuxtAgentRun(event: AgentFinishEvent<AgentRuntimeConfig>) {
  const ai = finishNuxtRun(event)
  if (event.error) return

  const usage = event.extensions.get<AgentUsageRecord>(usageTelemetryExtensionId)
  const chat = event.extensions.get<AgentChatFinishExtension>(chatExtensionId)
  if (!usage || !chat) return

  try {
    await chat.sendMessage({ markdown: formatNuxtUsageMessage(usage, ai) })
  }
  catch (error) {
    console.warn("[nuxt-agent] Failed to send usage telemetry chat message.", error)
  }
}

export default defineAgent({
  name: "nuxt",
  title: "Nuxt Agent",
  description: "Answers Nuxt questions through ViteHub Agent Definitions, MCP tools, Workspace Sources, Telegram voice input, telemetry, and Workflow.",
  runtime: workflow("nuxt-agent-demo-0610"),
  hooks: {
    "agent:finish": finishNuxtAgentRun,
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
      history: { maxMessages: 8, source: "thread" },
      identity({ adapter, author }) {
        return `${adapter}:${author.userId}`
      },
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
      pricing: nuxtUsagePricing,
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
