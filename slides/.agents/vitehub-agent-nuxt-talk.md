# ViteHub Agent Nuxt Talk Context

## Goal

- Audience: colleagues at Nuxt.
- Date: Friday, June 19, 2026.
- Format: max 3 minutes.
- Task state: do not create slides yet. Use this file as context for a later deck.
- Required topics: driver, capabilities, workspace, invokers, provider agnostic design, capability list, and the Nuxt Agent demo.

## Core Message

ViteHub has two layers:

- **Server primitives**: portable definitions and runtime helpers for app/server work such as Env, Auth, KV, Database, Blob, Workspace/Sources, Queue, Workflow, Schedule, and Sandbox.
- **Agent Definitions**: model-backed server actors that compose a Driver, Capabilities, Workspace context, and Agent Invokers.

The first slide should establish this in 45 seconds or less, then the rest of the talk should focus on Agent Definitions.

The Nuxt demo shows that shape with real pieces:

- Nuxt MCP tools as the official knowledge boundary.
- Nuxt `llms.txt` mounted as a Workspace Source.
- Telegram chat and voice messages as the entry surface.
- Transcription, daily rate limiting, usage telemetry, and observability as capabilities.
- Vercel Workflow as the runtime wrapper for the demo.

## Source Facts

Nuxt Agent demo sources:

- [README.md](/Users/maxi/vitehub/nuxt-agent/README.md) says the demo uses Nuxt MCP, Nuxt `llms.txt`, Telegram chat/voice, daily rate limiting, Vercel AI Gateway telemetry, Vercel Workflow, and `evlog`.
- [server/agents/nuxt/config.ts](/Users/maxi/vitehub/nuxt-agent/server/agents/nuxt/config.ts) defines the Nuxt agent, runtime, instructions, model resolver, model execution settings, capabilities, and workspace.
- [server/agents/nuxt/workspace/AGENTS.md](/Users/maxi/vitehub/nuxt-agent/server/agents/nuxt/workspace/AGENTS.md) tells the demo agent to explain the Agent Definition, Workspace Source, transcription capability, rate-limit capability, usage telemetry, Telegram entry, and Vercel Workflow.
- [vite.config.ts](/Users/maxi/vitehub/nuxt-agent/vite.config.ts) wires `hubAgent`, `hubWorkspace`, `hubWorkflow`, Nitro, memory providers, and Vercel preset.
- [server/rate-limit/capability.ts](/Users/maxi/vitehub/nuxt-agent/server/rate-limit/capability.ts) implements daily rate limiting as a capability keyed by `identity: "invoker"`.
- [server/observability/capability.ts](/Users/maxi/vitehub/nuxt-agent/server/observability/capability.ts) implements observability as a capability plus model/call-settings instrumentation.

Upstream ViteHub sources:

- [/Users/maxi/vitehub/vitehub/AGENTS.md](/Users/maxi/vitehub/vitehub/AGENTS.md) frames ViteHub as server primitives for any host, with Agent Definitions, Capabilities, Workspaces, Sources, runtime invocation, storage, scheduling, inspection, and framework integration as reusable primitives.
- [/Users/maxi/vitehub/vitehub/docs/content/docs/server-primitives/index.md](/Users/maxi/vitehub/vitehub/docs/content/docs/server-primitives/index.md) says server primitives are ViteHub features usable without agents: stable app-code APIs for authentication, storage, runtime work, source files, schedules, isolated execution, and environment values.
- [/Users/maxi/vitehub/vitehub/docs/content/docs/server-primitives/definitions.md](/Users/maxi/vitehub/vitehub/docs/content/docs/server-primitives/definitions.md) says Definitions are portable declarations of work or state, discovered by file location, with stable Runtime Helpers and generated host output.
- [/Users/maxi/vitehub/vitehub/docs/content/docs/server-primitives/workflow.md](/Users/maxi/vitehub/vitehub/docs/content/docs/server-primitives/workflow.md) says Workflow owns durable orchestration with steps, waits, retries, resumable state, and inspectable run ids.
- [/Users/maxi/vitehub/vitehub/docs/content/docs/server-primitives/sandbox.md](/Users/maxi/vitehub/vitehub/docs/content/docs/server-primitives/sandbox.md) says Sandbox owns isolated command/code execution behind an explicit boundary.
- [/Users/maxi/vitehub/vitehub/docs/content/docs/server-primitives/database.md](/Users/maxi/vitehub/vitehub/docs/content/docs/server-primitives/database.md) says Database owns structured application data through discovered schema and stable runtime surfaces.
- [/Users/maxi/vitehub/vitehub/.agents/contexts/agents/CONTEXT.md](/Users/maxi/vitehub/vitehub/.agents/contexts/agents/CONTEXT.md) defines Agent, Agent Definition, Agent Driver, Agent Invocation, Agent Trigger, Agent Invoker, Agent Usage, and related terms.
- [/Users/maxi/vitehub/vitehub/.agents/contexts/capabilities/CONTEXT.md](/Users/maxi/vitehub/vitehub/.agents/contexts/capabilities/CONTEXT.md) defines Capability, Capability Lifecycle, Capability Driver Contribution, Chat Capability, MCP Capability, Transcription, Rate Limit Capability, and related terms.
- [/Users/maxi/vitehub/vitehub/.agents/contexts/workspace/CONTEXT.md](/Users/maxi/vitehub/vitehub/.agents/contexts/workspace/CONTEXT.md) defines Workspace, Workspace Store, Source, Source Instructions, Workspace Scope, Workspace Tools, and Workspace Session.
- [/Users/maxi/vitehub/vitehub/.agents/contexts/framework-integrations/CONTEXT.md](/Users/maxi/vitehub/vitehub/.agents/contexts/framework-integrations/CONTEXT.md) defines Definition, Discovered Definition, Discovery Identity, Vite Integration, Runtime Registry, Provider Output, Provider Selection, and Runtime Helper.
- [/Users/maxi/vitehub/vitehub/docs/content/docs/agents/index.md](/Users/maxi/vitehub/vitehub/docs/content/docs/agents/index.md) says Agents are model-backed server actors, Agent Definitions declare Agents, Agent Invocations run them, and Capabilities attach controlled abilities.
- [/Users/maxi/vitehub/vitehub/docs/content/docs/agents/agent-definitions.md](/Users/maxi/vitehub/vitehub/docs/content/docs/agents/agent-definitions.md) says an Agent Definition names an Agent and configures how it runs: instructions, model configuration, workspace context, capabilities, invocation hooks, and custom run behavior.
- [/Users/maxi/vitehub/vitehub/docs/content/docs/agents/invocations.md](/Users/maxi/vitehub/vitehub/docs/content/docs/agents/invocations.md) says an Agent Invocation starts with input, applies capabilities, runs the model or custom handler, records lifecycle events, and returns a result.
- [/Users/maxi/vitehub/vitehub/docs/content/docs/agents/triggers.md](/Users/maxi/vitehub/vitehub/docs/content/docs/agents/triggers.md) says Agent Triggers start Agent Invocations from routes, chat surfaces, schedules, or product events; triggers prepare input/context/run state and do not configure model execution.
- [/Users/maxi/vitehub/vitehub/docs/content/docs/agents/workspace-context.md](/Users/maxi/vitehub/vitehub/docs/content/docs/agents/workspace-context.md) says Workspace is the file boundary and Capabilities decide which model-facing tools are exposed; Source Instructions render into model instructions for visible sources.
- [/Users/maxi/vitehub/vitehub/docs/content/docs/agents/capabilities/index.md](/Users/maxi/vitehub/vitehub/docs/content/docs/agents/capabilities/index.md) says Capabilities can contribute requirements, instructions, tools, policy, metadata, triggers, and context values.
- [/Users/maxi/vitehub/vitehub/docs/content/docs/agents/capabilities/official-capabilities.md](/Users/maxi/vitehub/vitehub/docs/content/docs/agents/capabilities/official-capabilities.md) lists the public capability catalog by ability.
- [/Users/maxi/vitehub/vitehub/packages/agent/src/internal/agent-driver.ts](/Users/maxi/vitehub/vitehub/packages/agent/src/internal/agent-driver.ts) validates `defineAgent({ driver })` as exactly one of `driver.model`, `driver.harness`, or `driver.run`, while still normalizing legacy root `model` and root `run`.
- [/Users/maxi/vitehub/vitehub/packages/agent/src/invoker.ts](/Users/maxi/vitehub/vitehub/packages/agent/src/invoker.ts) validates Agent Invokers, profiles, input context invokers, and fallback anonymous/devtools invokers.
- [/Users/maxi/vitehub/vitehub/packages/agent/src/capabilities/index.ts](/Users/maxi/vitehub/vitehub/packages/agent/src/capabilities/index.ts) exports the current capability helper surface, including helpers beyond the public docs catalog.

## First Slide: Two Layers

Goal: explain ViteHub as two layers in 45 seconds or less.

Slide title:

> ViteHub has two layers

Core visual:

- Left side: two stacked labels or columns.
- Top/first layer: `Server primitives`.
- Bottom/second layer: `Agent Definitions`.
- Right side: a code/tab mock inspired by the provided Nuxt tab screenshot.

Tab mock:

- Use a dark editor-like frame with top tabs.
- Tabs: `Sandbox`, `Workflow`, `Database`, `Workspace`, `Agent`.
- Active tab should be `Workflow` or `Sandbox` because those make the "server primitive" point fast.
- Side file tree examples:
  - `server/workflows/onboard-user.ts`
  - `server/sandboxes/release-notes.ts`
  - `server/db/schema.ts`
  - `server/agents/nuxt/config.ts`
- Code pane should show a tiny Definition + Runtime Helper split, not full real code.

Suggested visible code:

```ts
// server/workflows/onboard-user.ts
export default defineWorkflow(async ({ step }) => {
  await step.run('send-email', sendEmail)
})

// server/api/onboard.post.ts
return runWorkflow('onboard-user', body)
```

Speaker point:

> Server primitives give app code portable definitions and stable runtime helpers. Agent Definitions sit on top when the server actor is model-backed.

Do not over-explain:

- No deep list of every primitive.
- No host matrix.
- No dashboard/provider details.
- No code walkthrough.

45-second script:

> The useful frame for ViteHub is two layers. First, server primitives: things like Workflow, Sandbox, Database, KV, Blob, Workspace, Schedule, and Env. They are provider-agnostic definitions plus stable runtime helpers, so app code calls ViteHub APIs instead of wiring directly to one host. Second, Agent Definitions. Agents are model-backed server actors that can use those primitives through explicit capabilities. I only want this framing upfront; the rest of the talk is about the agent layer.

## Second Slide: Agent Definition Blocks

Goal: explain the Agent Definition as four blocks in about 35 seconds.

Slide title:

> An Agent Definition is four decisions

Core visual:

- Center: `defineAgent({ ... })` or `Agent Definition`.
- Four surrounding blocks:
  - `Driver`
  - `Capabilities`
  - `Workspace`
  - `Invokers`
- Each block gets one short line, not a paragraph.
- Use connector lines into the center.
- Add a tiny Nuxt demo mapping row at the bottom.

Block copy:

- `Driver`: `model | harness | run`
- `Capabilities`: `plugin-like abilities`
- `Workspace`: `sources, files, scopes`
- `Invokers`: `trusted caller identity`

Capability chips to show around or inside the Capability block:

- `chat`
- `mcp`
- `transcribe`
- `workspaceShell`
- `webSearch`
- `sandbox`
- `kv / blob / db`
- `access`
- `rateLimit`
- `usageTelemetry`

Capability analogy:

> Capabilities are to Agent Definitions what Better Auth plugins are to auth: composable abilities with their own config, lifecycle, policy, and runtime contributions.

Demo mapping:

```text
Nuxt demo = OpenAI/Gateway driver + Telegram/transcribe/MCP/rate-limit/telemetry capabilities + Nuxt docs source + Telegram invoker
```

Optional code hint:

```ts
export default defineAgent({
  driver,
  capabilities,
  workspace,
  invoker,
})
```

Speaker point:

> The Agent Definition is not "a prompt plus tools." It is the server-owned contract for execution, abilities, context, and trusted identity. Capabilities are the plugin layer.

35-second script:

> Once we are in the agent layer, the definition is basically four decisions. Driver is how the invocation runs. Capabilities are the plugin layer, similar to Better Auth plugins: chat, MCP, transcription, workspace shell, web search, sandbox, storage, access, rate limits, telemetry. Workspace is the file and source context it can inspect. Invokers are the trusted caller identity. In the Nuxt demo, that maps to a model driver, Telegram and Nuxt MCP capabilities, the Nuxt docs workspace source, and Telegram user identity.

## Four Core Concepts

### Driver

The Agent Driver is the Agent Definition boundary that selects and configures how an Agent Invocation is driven.

- Current explicit shape: one `driver` object with exactly one key: `model`, `harness`, or `run`.
- Model-backed drivers can configure model instructions and `execution` settings such as step limits, call settings, workspace fallback, and instrumentation.
- Harness-backed drivers sit behind ViteHub's Agent Harness Driver Contract; AI SDK harnesses are an implementation detail.
- Custom-run-backed drivers call developer code directly.
- Demo mapping: the Nuxt demo currently uses legacy top-level `model`, `instructions`, and `modelExecution`; upstream normalizes that to the model-driver concept. It also uses `runtime: workflow("nuxt-agent-demo-0610")` for the Vercel Workflow-backed demo runtime.

Talk line:

> Driver answers: how does this agent actually run?

### Capabilities

Capabilities are user-shareable Agent abilities attached through `defineAgent({ capabilities })`.

- They can contribute requirements, model-facing instructions, tools, policy, metadata, triggers, commands, and typed invocation context values.
- The key distinction: a server primitive is app-code authority; a Capability is model-facing authority.
- Capability Driver Contributions are filtered by the selected Agent Driver. Model tools and prompt text are not blindly passed to every driver shape.
- Demo capabilities: observability, rate limit, Nuxt MCP, Telegram chat, transcription, transcription-to-usage record, usage telemetry.
- The important point: capabilities stay scoped and composable instead of becoming one global agent config object.

Talk line:

> Capabilities answer: what can this agent do around the model?

### Workspace

Workspace is the named persistent file-tree boundary for an Agent.

- It gives an Agent file-tree state it can inspect, mutate when allowed, snapshot, and sync into execution runtimes.
- It can be backed by memory, local files, GitHub, Cloudflare artifacts, Vercel Blob, or other stores.
- It contains Sources: named read-only addressable origins such as local files, fetched files, GitHub roots, globs, markdown, MCP resources, and custom source loaders.
- Source Instructions are developer-authored guidance for visible Sources. ViteHub can render them into model instructions through `{{ workspace.sources }}` or append them.
- The Workspace is only the file boundary; Capabilities decide which model-facing Workspace tools are exposed.
- Demo mapping: memory store, `AGENTS.md` as instructions source, `nuxt/llms.txt` fetched from Nuxt.com as the official docs index. The Nuxt MCP Capability remains executable tool behavior, not a Workspace Source.

Talk line:

> Workspace answers: what context can the agent inspect as files?

### Invokers

Agent Invokers are trusted caller identities for one Agent Invocation.

- Type shape: `{ id, kind, label?, meta? }`.
- Useful for access scope, rate limiting, audit, routing, prompt behavior, and per-surface behavior.
- They are not Auth Users, Agent Triggers, Access Roles, or model-facing user profiles.
- ViteHub can use input context, configured invoker profiles, or anonymous/devtools fallbacks.
- Demo mapping: Telegram chat identifies users as `telegram:${author.userId}`; the rate-limit capability uses `identity: "invoker"`.

Talk line:

> Invokers answer: who started this run, and through which surface?

## Provider Agnostic Angle

Use provider agnostic as a concrete swap story, not a slogan:

- Model: demo uses Vercel AI Gateway when configured, otherwise OpenAI directly through AI SDK.
- Framework integration: Vite discovers Agent Definitions and generates runtime registries/provider output.
- Runtime/host: this demo runs through Nitro on Vercel with Workflow, but Agent runtime behavior should stay behind ViteHub language.
- State: demo uses memory provider; docs show durable Agent State Providers such as SQLite/libSQL and Cloudflare Agent State.
- Workspace store: memory/local/GitHub/Cloudflare/Vercel Blob are different stores behind the same workspace idea.
- Entry surfaces: Telegram is just one Chat Platform Adapter/webhook route; other Agent Trigger Consumers can call the same Agent Definition.
- Provider Selection belongs in integration options when it changes generated output, bindings, imports, or deployment behavior; application code should keep using stable ViteHub import paths/runtime helpers.

Talk line:

> The promise is not “no providers.” It is “provider choices are edges, not the core agent shape.”

## Capability Inventory

Public capability catalog in the docs:

- `chat`
- `entry`
- `workspaceShell`
- `webSearch`
- `transcribe`
- `mcp`
- `kv`, `blob`, `db`
- `sandbox`
- `access`
- `llmRoute`, `llmGate`
- `rateLimit`

Additional exported helpers visible in `packages/agent/src/capabilities/index.ts`:

- `chatSummary`
- `chatTitle`
- `inputCommands`
- `fetch`
- `memory`
- `schedule`
- `skills`
- `usageTelemetry`
- `audioBytes`
- `getTranscriptionResults`
- `memoryRateLimitStore`
- `normalizeAgentUsage`
- `staticModelPricing`
- `vercelAiGatewayPricing`

Demo-highlighted subset:

- `chat`: Telegram adapter and webhook.
- `transcribe`: Telegram voice input.
- `mcp`: Nuxt official docs/tools boundary.
- `rateLimit`: daily message limit keyed by invoker.
- `usageTelemetry`: token, duration, speed, price, model summary.
- Custom `defineCapability`: observability and attaching transcriptions to usage records.

## Proposed 3-Minute Deck

Keep this to 3 slides.

1. **ViteHub Has Two Layers**
   - Server primitives: provider-agnostic definitions and runtime helpers for Workflow, Sandbox, Database, KV, Blob, Workspace, Schedule, Env.
   - Agent Definitions: model-backed actors that compose drivers, capabilities, workspace context, and invokers.
   - Visual: dark tabbed code component inspired by the provided Nuxt screenshot.
   - Timebox: 45 seconds max.

2. **Agent Definition Is Four Decisions**
   - Driver: how it runs.
   - Capabilities: plugin-like abilities, similar to Better Auth plugins.
   - Workspace: what it can inspect.
   - Invokers: who started it.
   - Visual: central Agent Definition with four connected blocks.

3. **Nuxt Agent Demo Flow**
   - `server/agents/nuxt/config.ts` -> Vite discovery -> generated Telegram webhook -> Agent Invocation.
   - Telegram voice/chat -> generated chat webhook -> Agent Trigger -> Agent Invoker -> Capability Lifecycle -> model driver + Nuxt MCP + Workspace Source -> answer + usage telemetry.
   - End with the live demo.

## Draft Speaker Script

Target timing: about 45 seconds for slide 1, 45 seconds for slide 2, 45-60 seconds for slide 3, then the live demo.

Slide 1:

> The useful frame for ViteHub is two layers. First, server primitives: things like Workflow, Sandbox, Database, KV, Blob, Workspace, Schedule, and Env. They are provider-agnostic definitions plus stable runtime helpers, so app code calls ViteHub APIs instead of wiring directly to one host. Second, Agent Definitions. Agents are model-backed server actors that can use those primitives through explicit capabilities. I only want this framing upfront; the rest of the talk is about the agent layer.

Slide 2:

> Once we are in the agent layer, the definition is basically four decisions. Driver is how the invocation runs. Capabilities are the plugin layer, similar to Better Auth plugins: chat, MCP, transcription, workspace shell, web search, sandbox, storage, access, rate limits, telemetry. Workspace is the file and source context it can inspect. Invokers are the trusted caller identity. In the Nuxt demo, that maps to a model driver, Telegram and Nuxt MCP capabilities, the Nuxt docs workspace source, and Telegram user identity.

Slide 3:

> The demo starts as a normal discovered agent file: `server/agents/nuxt/config.ts`. ViteHub discovers it, builds the agent registry, and generates the Telegram webhook. A Telegram message becomes an Agent Invocation with a trusted Agent Invoker. Capabilities prepare input, tools, policy, and telemetry. The model answers using Nuxt MCP and the mounted Nuxt docs source. Then finish hooks send the answer and usage summary. That is what I’ll show live.

## Later Slide Notes

- Do not use Nuxt or ViteHub logos unless sourced from official assets.
- Prefer editable shapes/text over screenshots for the architecture slides.
- For slide 1, recreate the provided tabbed-code visual as editable shapes and text, not as the screenshot bitmap.
- A live demo screenshot can be added later if the local or deployed demo is running.
- Keep the capability inventory readable by grouping it; do not put every capability in equal visual weight.
- Mention the driver caveat if showing code: this repo currently uses top-level `model`/`instructions`/`modelExecution`; package docs show explicit `driver`.
