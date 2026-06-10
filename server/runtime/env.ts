export interface ServerEnv {
  aiGatewayApiKey: string
  aiGatewayModel: string
  appUrl?: string
  nuxtMcpUrl: string
  openaiApiKey: string
  openaiTranscriptionModel: string
  telegramBotToken?: string
  telegramWebhookSecretToken?: string
}

function readRequired(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable ${name}.`)
  return value
}

function readOptional(name: string): string | undefined {
  return process.env[name]?.trim() || undefined
}

function readPublicAppUrl(): string | undefined {
  const explicit = readOptional("PUBLIC_APP_URL")
  if (explicit) return explicit.replace(/\/+$/, "")

  const vercelUrl = readOptional("VERCEL_PROJECT_PRODUCTION_URL") || readOptional("VERCEL_URL")
  return vercelUrl ? `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")}` : undefined
}

export function getServerEnv(): ServerEnv {
  return {
    aiGatewayApiKey: readRequired("AI_GATEWAY_API_KEY"),
    aiGatewayModel: readOptional("AI_GATEWAY_MODEL") || "openai/gpt-5-mini",
    appUrl: readPublicAppUrl(),
    nuxtMcpUrl: readOptional("NUXT_MCP_URL") || "https://nuxt.com/mcp",
    openaiApiKey: readRequired("OPENAI_API_KEY"),
    openaiTranscriptionModel: readOptional("OPENAI_TRANSCRIPTION_MODEL") || "gpt-4o-transcribe",
    telegramBotToken: readOptional("TELEGRAM_BOT_TOKEN"),
    telegramWebhookSecretToken: readOptional("TELEGRAM_WEBHOOK_SECRET_TOKEN"),
  }
}

export function getTelegramEnv(): Required<Pick<ServerEnv, "telegramBotToken" | "telegramWebhookSecretToken">> {
  return {
    telegramBotToken: readRequired("TELEGRAM_BOT_TOKEN"),
    telegramWebhookSecretToken: readRequired("TELEGRAM_WEBHOOK_SECRET_TOKEN"),
  }
}

export function getTelegramWebhookSecretToken(): string {
  return readRequired("TELEGRAM_WEBHOOK_SECRET_TOKEN")
}
