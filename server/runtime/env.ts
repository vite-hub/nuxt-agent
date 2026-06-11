export interface ServerEnv {
  aiGatewayApiKey?: string
  aiGatewayModel: string
  nuxtMcpUrl: string
  openaiApiKey: string
  openaiTranscriptionModel: string
  telegramAllowedUserIds: string[]
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

export function getServerEnv(): ServerEnv {
  return {
    aiGatewayApiKey: readOptional("AI_GATEWAY_API_KEY"),
    aiGatewayModel: readOptional("AI_GATEWAY_MODEL") || "openai/gpt-5.5",
    nuxtMcpUrl: readOptional("NUXT_MCP_URL") || "https://nuxt.com/mcp",
    openaiApiKey: readRequired("OPENAI_API_KEY"),
    openaiTranscriptionModel: readOptional("OPENAI_TRANSCRIPTION_MODEL") || "gpt-4o-transcribe",
    telegramAllowedUserIds: parseList(readOptional("TELEGRAM_ALLOWED_USER_IDS")),
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

function parseList(value: string | undefined): string[] {
  return value?.split(",").map(item => item.trim()).filter(Boolean) || []
}
