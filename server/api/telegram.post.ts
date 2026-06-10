import { createMessage, runAgent } from "@vite-hub/agent"
import { createError, defineEventHandler, getHeader, readBody } from "h3"
import nuxtAgent from "../agents/nuxt/config"
import { getTelegramEnv, getTelegramWebhookSecretToken } from "../runtime/env"
import {
  createTelegramAgentMessage,
  getTelegramMessage,
  sendTelegramChatAction,
  sendTelegramMessage,
  type TelegramUpdate,
} from "../runtime/telegram"
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

function resultText(result: unknown): string {
  if (typeof result === "string") return result
  if (result && typeof result === "object" && "text" in result && typeof (result as { text?: unknown }).text === "string") {
    return (result as { text: string }).text
  }
  return "I finished the request, but did not produce a text response."
}

export default defineEventHandler(async (event) => {
  const expectedSecret = getTelegramWebhookSecretToken()
  const receivedSecret = getHeader(event, "x-telegram-bot-api-secret-token")
  if (receivedSecret !== expectedSecret) {
    throw createError({ statusCode: 401, statusMessage: "Invalid Telegram webhook secret." })
  }

  const telegram = getTelegramEnv()
  const update = await readBody<TelegramUpdate>(event)
  if (!update) return { ignored: true, ok: true }
  const message = getTelegramMessage(update)
  if (!message) return { ignored: true, ok: true }

  const agentMessage = createTelegramAgentMessage(message, telegram.telegramBotToken, createMessage)
  if (!agentMessage) return { ignored: true, ok: true }

  const runId = `telegram-${update.update_id}-${message.message_id}`
  await sendTelegramChatAction(telegram.telegramBotToken, message.chat.id).catch(() => {})

  const result = await withWorkflowRuntime({ event, waitUntil }, async () => {
    return await runAgent(nuxtAgent, {
      memo: createMemo(),
      run: {
        channelId: String(message.chat.id),
        messageId: String(message.message_id),
        origin: "telegram",
        runId,
        threadId: String(message.chat.id),
      },
      runtime: process.env.VERCEL ? "vercel" : "vite",
      waitUntil,
    }, {
      context: {
        telegram: {
          updateId: update.update_id,
        },
      },
      messages: [agentMessage],
    })
  })

  await sendTelegramMessage(telegram.telegramBotToken, message.chat.id, resultText(result))
  return { ok: true }
})
