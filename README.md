# Nuxt Agent

A Nitro v3 demo app for defining a ViteHub Agent that uses:

- Nuxt's MCP server as executable MCP tools.
- Nuxt's MCP resources as a ViteHub Workspace Source.
- Telegram chat and voice messages.
- Vercel AI Gateway usage telemetry.
- Vercel Workflow via `workflow()`.

## Setup

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

Create a Telegram bot with BotFather, then set:

```sh
pnpm set-telegram-webhook
```

The Telegram webhook is `POST /api/telegram`.
