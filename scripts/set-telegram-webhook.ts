import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function loadEnvFile(path: string) {
  let contents = ""
  try {
    contents = readFileSync(path, "utf8")
  }
  catch {
    return
  }

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const index = trimmed.indexOf("=")
    if (index === -1) continue
    const name = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "")
    process.env[name] ||= value
  }
}

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable ${name}.`)
  return value
}

loadEnvFile(resolve(".env"))
loadEnvFile(resolve(".env.local"))

const token = required("TELEGRAM_BOT_TOKEN")
const appUrl = required("PUBLIC_APP_URL").replace(/\/+$/, "")
const secretToken = required("TELEGRAM_WEBHOOK_SECRET_TOKEN")
const webhookUrl = `${appUrl}/api/_vitehub/agents/nuxt/webhooks/telegram`

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  body: JSON.stringify({
    allowed_updates: ["message"],
    secret_token: secretToken,
    url: webhookUrl,
  }),
  headers: { "content-type": "application/json" },
  method: "POST",
})
const data = await response.json() as { description?: string, ok?: boolean }
if (!response.ok || !data.ok) {
  throw new Error(data.description || `setWebhook failed with ${response.status}.`)
}

console.log(`Telegram webhook set to ${webhookUrl}`)
