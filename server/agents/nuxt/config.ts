import { createOpenAI } from "@ai-sdk/openai"
import { createTelegramAdapter } from "@chat-adapter/telegram"
import { defineAgent, workflow } from "@vite-hub/agent"
import { chat, mcp, transcribe, usageTelemetry, vercelAiGatewayPricing, workspaceShell } from "@vite-hub/agent/capabilities"
import { remoteMcpServer } from "@vite-hub/agent/mcp"
import { createGateway } from "ai"
import { demoWorkflow } from "../../capabilities/demo-workflow"
import { getServerEnv, getTelegramEnv } from "../../runtime/env"

const maxTranscriptionAudioBytes = 25 * 1024 * 1024

function nuxtMcpServer() {
  return remoteMcpServer({
    type: "http",
    url: getServerEnv().nuxtMcpUrl,
  })
}

export default defineAgent({
  title: "Nuxt Agent",
  description: "Answers Nuxt questions through ViteHub Agent Definitions, MCP tools, Workspace Sources, Telegram voice input, telemetry, and Workflow.",
  runtime: workflow("nuxt-agent"),
  instructions: [
    "You are the Nuxt Agent demo for ViteHub.",
    "Prefer the mounted Workspace Source under `nuxt/` for Nuxt documentation evidence. Use workspace shell search before answering specific Nuxt API questions.",
    "Use the Nuxt MCP tools when a task needs executable MCP behavior or the Workspace Source does not contain enough evidence.",
    "When users ask what this demo shows, explain the Agent Definition, MCP Capability, MCP Resource Workspace Source, transcription Capability, usage telemetry, Telegram chat entry, and Vercel Workflow.",
    "Keep answers compact and cite the source path or MCP tool you used when possible.",
  ],
  model: () => {
    const env = getServerEnv()
    return createGateway({ apiKey: env.aiGatewayApiKey })(env.aiGatewayModel)
  },
  modelExecution: {
    stepLimit: 8,
    callSettings: {
      temperature: 0.2,
    },
    instrumentation: {
      callSettings({ callSettings, run }) {
        return {
          ...callSettings,
          experimental_telemetry: {
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
    },
  },
  capabilities: [
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
      fallbackStreamingPlaceholderText: "Reading Nuxt sources...",
      history: { maxMessages: 8, source: "thread" },
      userName: "nuxt-agent",
      webhooks: {
        telegram: {
          path: "/api/telegram",
          secretToken: process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN,
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
    workspaceShell({ mode: "read" }),
    mcp({
      servers: {
        nuxt: nuxtMcpServer,
      },
    }),
    demoWorkflow(),
    usageTelemetry({
      pricing: vercelAiGatewayPricing(),
    }),
  ],
  workspace: "nuxt",
})
