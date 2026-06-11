# Nuxt Agent

A Nitro v3 demo app for defining a ViteHub Agent that uses:

- Nuxt's MCP server as executable MCP tools.
- Nuxt's public `llms.txt` as a ViteHub Workspace Source.
- Telegram chat and voice messages.
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

Tail structured Nuxt Agent events from Vercel:

```sh
pnpm logs
```

Filter a single run:

```sh
pnpm logs -- --run-id telegram-123-456
```

Useful filters:

```sh
pnpm logs -- --event nuxt.agent.AGENT_RUN_COMPLETED
pnpm logs -- --level error
pnpm logs:raw
```

Every structured log includes `component: "nuxt-agent"` plus `run_id` when available. Telegram chat/user identifiers are hashed before logging.
