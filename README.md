# Nuxt Agent

A Nitro v3 demo app for defining a ViteHub Agent that uses:

- Nuxt's MCP server as executable MCP tools.
- Nuxt's public `llms.txt` as a ViteHub Workspace Source.
- Telegram chat and voice messages.
- Daily agent message rate limiting.
- Usage telemetry.
- Durable workflow execution by default.

The agent definition lives in `server/agents/nuxt/agent.ts`, with colocated prompt instructions in `server/agents/nuxt/instructions.md`.

## Setup

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

## Local CLI

Run the app in one terminal:

```sh
pnpm dev
```

Then run a local Nuxt Agent chat with the dev context:

```sh
pnpm nuxt:dev --prompt "What is useAsyncData?"
```

Telegram is configured outside the app. The bot webhook should point at the generated ViteHub Chat Webhook Route:

```text
POST /api/_vitehub/agents/nuxt/webhooks/telegram
```
