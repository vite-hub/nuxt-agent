# Nuxt Agent

A Nitro v3 demo app for defining a ViteHub Agent that uses:

- Nuxt's MCP server as executable MCP tools.
- Nuxt's public `llms.txt` as a ViteHub Workspace Source.
- Telegram chat and voice messages.
- Daily agent message rate limiting.
- Usage telemetry.
- An OpenAI model as the Agent Driver.
- The ViteHub Console at console.vitehub.dev.

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

Each Telegram reply runs inside the webhook request (`workflow: false`), up to the 60 second Vercel function limit.

ViteHub serves the Telegram webhook at `POST /api/_vitehub/agents/nuxt/webhooks/telegram`. Point the bot at it once per URL. The first command prints the plan, the second applies it:

```sh
pnpm vitehub channels sync --stage production --url https://vitehub-nuxt-agent.vercel.app --agent nuxt --channel telegram
pnpm vitehub channels sync --stage production --url https://vitehub-nuxt-agent.vercel.app --agent nuxt --channel telegram \
  --apply --confirm-origin https://vitehub-nuxt-agent.vercel.app
```
