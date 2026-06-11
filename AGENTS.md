# Nuxt Agent

This project is a runnable ViteHub demo for the Nuxt ecosystem call.

Use ViteHub language when changing the app:

- Nuxt MCP tools are an MCP Capability.
- Nuxt docs are a Workspace Source mounted under `nuxt/`.
- Telegram voice input is handled by the `transcribe()` Capability.
- Usage telemetry is handled by the `usageTelemetry()` Capability.
- Runtime tracking is handled by the `nuxtObservability()` Capability and structured `evlog` events written to Vercel runtime logs.
- Durable demo side effects should go through the `record-demo-run` Workflow Definition.

Keep Nitro routes thin. Routes adapt host or chat webhooks into Agent Invocations; Agent behavior belongs in `server/agents/nuxt/config.ts` or reusable Capabilities.
