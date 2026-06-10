import type { AudioPart, Message } from "@vite-hub/agent"

export interface TelegramFile {
  file_id: string
  file_path?: string
  file_size?: number
}

export interface TelegramAudio {
  file_id: string
  file_name?: string
  file_size?: number
  mime_type?: string
}

export interface TelegramMessage {
  audio?: TelegramAudio
  caption?: string
  chat: {
    id: number | string
  }
  date?: number
  from?: {
    first_name?: string
    id: number
    username?: string
  }
  message_id: number
  text?: string
  voice?: TelegramAudio
}

export interface TelegramUpdate {
  edited_message?: TelegramMessage
  message?: TelegramMessage
  update_id: number
}

interface TelegramApiResult<T> {
  ok: boolean
  result?: T
  description?: string
}

export function getTelegramMessage(update: TelegramUpdate): TelegramMessage | undefined {
  return update.message || update.edited_message
}

async function telegramApi<T>(token: string, method: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  })
  const data = await response.json() as TelegramApiResult<T>
  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Telegram ${method} failed with ${response.status}.`)
  }
  return data.result as T
}

export async function sendTelegramMessage(token: string, chatId: TelegramMessage["chat"]["id"], text: string): Promise<void> {
  const chunks = text.match(/[\s\S]{1,3900}/g) || ["Done."]
  for (const chunk of chunks) {
    await telegramApi(token, "sendMessage", {
      chat_id: chatId,
      disable_web_page_preview: true,
      text: chunk,
    })
  }
}

export async function sendTelegramChatAction(token: string, chatId: TelegramMessage["chat"]["id"], action = "typing"): Promise<void> {
  await telegramApi(token, "sendChatAction", {
    action,
    chat_id: chatId,
  })
}

async function getTelegramFile(token: string, fileId: string): Promise<TelegramFile> {
  return await telegramApi<TelegramFile>(token, "getFile", { file_id: fileId })
}

async function fetchTelegramFileBytes(token: string, fileId: string): Promise<Uint8Array> {
  const file = await getTelegramFile(token, fileId)
  if (!file.file_path) throw new Error("Telegram did not return a file path for the audio message.")
  const response = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`)
  if (!response.ok) throw new Error(`Failed to download Telegram audio: ${response.status} ${response.statusText}.`)
  return new Uint8Array(await response.arrayBuffer())
}

function audioPartForMessage(message: TelegramMessage, token: string): AudioPart | undefined {
  const audio = message.voice || message.audio
  if (!audio) return undefined
  return {
    fetchData: () => fetchTelegramFileBytes(token, audio.file_id),
    fetchMetadata: {
      telegramFileId: audio.file_id,
    },
    mediaType: audio.mime_type || "audio/ogg",
    name: audio.file_name || `telegram-${message.message_id}.ogg`,
    size: audio.file_size,
    type: "audio",
  }
}

export function createTelegramAgentMessage(message: TelegramMessage, token: string, createMessage: (options: {
  createdAt?: Date
  id?: string
  metadata?: Record<string, unknown>
  parts?: Array<AudioPart | string>
  role: "user"
  text?: string
}) => Message): Message | undefined {
  const text = message.text || message.caption || ""
  const audio = audioPartForMessage(message, token)
  if (!text && !audio) return undefined

  return createMessage({
    createdAt: message.date ? new Date(message.date * 1000) : new Date(),
    id: `telegram-${message.message_id}`,
    metadata: {
      telegram: {
        chatId: String(message.chat.id),
        fromId: message.from?.id,
        username: message.from?.username,
      },
    },
    parts: audio ? [audio] : undefined,
    role: "user",
    text,
  })
}
