# Nuxt Agent

A Nitro v3 demo app for defining a ViteHub Agent that uses:

- Nuxt's MCP server as executable MCP tools.
- Nuxt's public `llms.txt` as a ViteHub Workspace Source.
- Telegram chat and voice messages.
- Daily agent message rate limiting.
- Vercel AI Gateway usage telemetry.
- Vercel Workflow via `workflow()`.
- Structured `evlog` events in Vercel runtime logs.

## Setup

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

Telegram is configured outside the app. The bot webhook should point at the generated ViteHub Chat Webhook Route:

```text
POST /api/_vitehub/agents/nuxt/webhooks/telegram
```

## Logs

Tail raw Vercel logs:

```sh
pnpm logs:raw
```
