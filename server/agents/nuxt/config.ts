import { createOpenAI, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai"
import { createTelegramAdapter } from "@chat-adapter/telegram"
import { defineAgent, workflow, type AgentUsageRecord } from "@vite-hub/agent"
import { access, chat, formatUsageTelemetryChatMessage, mcp, transcribe, usageTelemetry, vercelAiGatewayPricing, type AccessChatContext, type UsageTelemetryChatCallbackContext } from "@vite-hub/agent/capabilities"
import { remoteMcpServer } from "@vite-hub/agent/mcp"
import { source } from "@vite-hub/workspace"
import { createGateway } from "ai"
import { demoWorkflow } from "../../capabilities/demo-workflow"
import { auditEvents } from "../../observability/audit"
import { finishNuxtRun, instrumentNuxtCallSettings, instrumentNuxtModel, nuxtObservability } from "../../observability/capability"
import { evlog } from "../../observability/evlog"
import { getServerEnv, getTelegramEnv } from "../../runtime/env"

const maxTranscriptionAudioBytes = 25 * 1024 * 1024
const nuxtAgentInstructions = [
  "# Nuxt Agent",
  "You are the Nuxt Agent demo for ViteHub.",
  "Answer Nuxt questions with the same official knowledge boundary as the Nuxt.com agent: docs, modules, blog posts, deployment providers, and changelog.",
  "Use the Nuxt MCP tools first for documentation, modules, blog posts, deployment providers, and release/changelog questions.",
  "For pasted errors or troubleshooting, search Nuxt documentation first, then use the most specific MCP tool for the area involved.",
  "Use the mounted Workspace Source under `nuxt/` as the addressable source index for official Nuxt documentation links.",
  "When users ask what this demo shows, explain the Agent Definition, Nuxt docs Workspace Source, transcription Capability, usage telemetry, Telegram chat entry, and Vercel Workflow.",
  "Keep answers compact and cite the source path or MCP tool you used when possible.",
  "For documentation-backed answers, include a compact `Sources:` line with Markdown links to the original Nuxt docs URLs or Nuxt.com pages.",
  "Format final answers as Markdown. Use short lists, links, inline code, and fenced code blocks when useful. Do not output HTML.",
].join("\n\n")

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function recordFrom(parent: unknown, key: string): Record<string, unknown> | undefined {
  if (!isRecord(parent)) return undefined
  const value = parent[key]
  return isRecord(value) ? value : undefined
}

function chatIdentityLogFields(context: AccessChatContext) {
  const message = recordFrom(context.input, "message")
  const thread = recordFrom(context.input, "thread")
  return {
    from_id_hash: evlog.safeId(context.identity?.id),
    message_id_hash: evlog.safeId(message?.id),
    provider: context.provider,
    text_length: typeof message?.text === "string" ? message.text.length : undefined,
    thread_id_hash: evlog.safeId(thread?.id),
  }
}

function authorizeTelegramChat(context: AccessChatContext) {
  if (context.provider !== "telegram") return true

  evlog.audit(auditEvents.TELEGRAM_WEBHOOK_RECEIVED({
    actor: evlog.actor,
    target: { id: evlog.safeId(context.identity?.id) || "telegram" },
  }), chatIdentityLogFields(context))

  const allowedUserIds = getServerEnv().telegramAllowedUserIds
  const allowed = !allowedUserIds.length || (context.identity?.id ? allowedUserIds.includes(context.identity.id) : false)
  if (allowed) return true

  evlog.audit(auditEvents.TELEGRAM_WEBHOOK_IGNORED({
    actor: evlog.actor,
    target: { id: evlog.safeId(context.identity?.id) || "telegram" },
  }), {
    reason: "disallowed_user",
    ...chatIdentityLogFields(context),
  })

  return false
}

function textFrom(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function toolNameFrom(value: Record<string, unknown>): string | undefined {
  return textFrom(value.toolName) || textFrom(value.name)
}

function isToolPart(value: Record<string, unknown>): boolean {
  const type = textFrom(value.type)
  return type === "dynamic-tool"
    || !!type?.startsWith("tool-")
    || "toolCallId" in value
    || "toolName" in value
}

function isSourcePart(value: Record<string, unknown>): boolean {
  const type = textFrom(value.type)
  return !!type?.includes("source") || "sourceType" in value
}

function shortSourceLabel(value: Record<string, unknown>): string | undefined {
  const title = textFrom(value.title)
  const url = textFrom(value.url)
  if (!url) return title

  try {
    const parsed = new URL(url)
    return title || `${parsed.hostname}${parsed.pathname}`.replace(/\/$/, "")
  }
  catch {
    return title || url
  }
}

function collectUsageActivity(value: unknown, tools = new Set<string>(), sources = new Set<string>(), depth = 0) {
  if (depth > 6 || value === null || value === undefined) return { tools, sources }
  if (Array.isArray(value)) {
    for (const item of value) collectUsageActivity(item, tools, sources, depth + 1)
    return { tools, sources }
  }
  if (!isRecord(value)) return { tools, sources }

  if (isToolPart(value)) {
    const name = toolNameFrom(value)
    if (name) tools.add(name)
  }
  if (isSourcePart(value)) {
    const label = shortSourceLabel(value)
    if (label) sources.add(label)
  }

  collectUsageActivity(value.content, tools, sources, depth + 1)
  collectUsageActivity(value.parts, tools, sources, depth + 1)
  collectUsageActivity(value.sources, tools, sources, depth + 1)
  collectUsageActivity(value.providerMetadata, tools, sources, depth + 1)
  collectUsageActivity(value.steps, tools, sources, depth + 1)

  return { tools, sources }
}

function sourceLabelsFromTools(tools: Set<string>): string[] {
  const labels = new Set<string>()
  for (const tool of tools) {
    if (tool.startsWith("mcp_nuxt_")) labels.add("Nuxt MCP")
    if (tool === "materialize_sources" || tool.startsWith("workspace_") || tool === "shell") labels.add("Workspace Source")
    if (tool === "web_search" || tool === "openai.web_search") labels.add("Web Search")
  }
  return [...labels]
}

function formatUsageList(values: string[], max = 4): string {
  if (!values.length) return "`none`"
  const visible = values.slice(0, max).map(value => `\`${value}\``).join(", ")
  const remaining = values.length - max
  return `\`${values.length}\` ${visible}${remaining > 0 ? `, +${remaining} more` : ""}`
}

function tokensPerSecond(record: AgentUsageRecord, context: UsageTelemetryChatCallbackContext): number | undefined {
  if (record.latency?.tokensPerSecond !== undefined) return record.latency.tokensPerSecond
  const durationMs = record.latency?.durationMs ?? context.durationMs
  const tokens = record.usage?.outputTokens ?? record.usage?.totalTokens
  if (!durationMs || !tokens) return
  return tokens / (durationMs / 1000)
}

function formatNuxtUsageTelemetryChatMessage(record: AgentUsageRecord, context: UsageTelemetryChatCallbackContext) {
  const lines = formatUsageTelemetryChatMessage(record, context).split("\n")
  if (!lines.some(line => line.startsWith("- Speed:"))) {
    const speed = tokensPerSecond(record, context)
    if (speed !== undefined) lines.push(`- Speed: \`${speed.toFixed(1)} tok/s\``)
  }

  const activity = collectUsageActivity(record.raw)
  const tools = [...activity.tools].sort()
  const sources = [...new Set([...sourceLabelsFromTools(activity.tools), ...activity.sources])].sort()
  lines.push(`- Tools checked: ${formatUsageList(tools)}`)
  lines.push(`- Sources checked: ${formatUsageList(sources)}`)
  return lines.join("\n")
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
    access({
      chat: {
        resolve: authorizeTelegramChat,
      },
    }),
    nuxtObservability(),
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
      stream: false,
      userName: "nuxt-agent",
      webhooks: {
        telegram: {},
      },
    }),
    transcribe(() => {
      const env = getServerEnv()
      return {
        maxBytes: maxTranscriptionAudioBytes,
        model: createOpenAI({ apiKey: env.openaiApiKey }).transcription(env.openaiTranscriptionModel),
      }
    }),
    demoWorkflow(),
    usageTelemetry({
      chat: {
        async onUsage(record, context) {
          const markdown = formatNuxtUsageTelemetryChatMessage(record, context)
          const usage = record.usage
          await context.sendMessage({
            markdown,
          })
          evlog.audit(auditEvents.USAGE_TELEMETRY_MESSAGE_SENT({
            actor: evlog.actor,
            target: { id: context.run?.runId || "usage" },
          }), {
            cost_amount: record.cost?.amount,
            cost_currency: record.cost?.currency,
            duration_ms: context.durationMs,
            input_tokens: usage?.inputTokens,
            model: record.model?.id,
            origin: context.run?.origin,
            output_tokens: usage?.outputTokens,
            provider: context.provider,
            run_id: context.run?.runId,
            thread_id_hash: evlog.safeId(context.run?.threadId),
            total_tokens: usage?.totalTokens,
          })
        },
      },
      includeRaw: true,
      pricing: vercelAiGatewayPricing(),
    }),
  ],
  workspace: {
    sources: {
      instructions: source.file({
        content: nuxtAgentInstructions,
        workspacePath: "AGENTS.md",
      }),
      nuxt: source.fetch({
        path: "nuxt/llms.txt",
        responseType: "text",
        url: new URL("/llms.txt", process.env.NUXT_DOCS_URL?.trim() || "https://nuxt.com"),
      }),
    },
  },
})
