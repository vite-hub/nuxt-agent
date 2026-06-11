import type {
  AgentCallSettingsInstrumentationContext,
  AgentCapabilityRuntimeContext,
  AgentFinishEvent,
  AgentModelInstrumentationContext,
  AgentRunInput,
  AgentRunMetadata,
  AgentRuntimeConfig,
} from "@vite-hub/agent"
import { defineCapability } from "@vite-hub/agent"
import { createEvlogIntegration } from "evlog/ai"
import { auditEvents } from "./audit"
import { errorEvents } from "./errors"
import { evlog } from "./evlog"

interface RunLifecycleArgs {
  input?: AgentRunInput
  result?: unknown
  run?: AgentRunMetadata
}

function messagesFromInput(input: unknown) {
  return (input as { messages?: unknown[] } | undefined)?.messages
}

function resultKind(result: unknown) {
  return result && typeof result === "object" && Symbol.asyncIterator in result ? "stream" : typeof result
}

function runFields(run?: AgentRunMetadata) {
  return {
    channel_id_hash: evlog.safeId(run?.channelId),
    message_id_hash: evlog.safeId(run?.messageId),
    origin: run?.origin,
    run_id: run?.runId,
    thread_id_hash: evlog.safeId(run?.threadId),
  }
}

function nuxtAi(run?: AgentRunMetadata) {
  return evlog.ai(run?.runId, {
    model: "vercel-ai-gateway",
    ...runFields(run),
  }, {
    toolInputs: {
      maxLength: 1200,
    },
  })
}

export function nuxtObservability() {
  return defineCapability({
    id: "nuxt-observability",
    input(context: AgentCapabilityRuntimeContext<AgentRuntimeConfig>) {
      logNuxtRunStarted({ input: context.input.get(), run: context.run })
    },
  })
}

export function instrumentNuxtModel({ model, run }: AgentModelInstrumentationContext) {
  return nuxtAi(run)?.wrap(model as never) || model
}

export function instrumentNuxtCallSettings({ callSettings, run }: AgentCallSettingsInstrumentationContext) {
  const ai = nuxtAi(run)
  if (!ai) return

  const telemetry = typeof callSettings.experimental_telemetry === "object" && callSettings.experimental_telemetry
    ? callSettings.experimental_telemetry as { integrations?: unknown, [key: string]: unknown }
    : {}
  const integrations = Array.isArray(telemetry.integrations)
    ? telemetry.integrations
    : telemetry.integrations ? [telemetry.integrations] : []

  return {
    experimental_telemetry: {
      ...telemetry,
      integrations: [...integrations, createEvlogIntegration(ai)],
      isEnabled: true,
    },
  }
}

export function logNuxtRunStarted({ input, run }: RunLifecycleArgs) {
  const messages = messagesFromInput(input)

  evlog.audit(auditEvents.AGENT_RUN_STARTED({
    actor: evlog.actor,
    target: { id: run?.runId || "unknown" },
  }), {
    history_message_count: Array.isArray(messages) ? messages.length : 0,
    ...runFields(run),
  })
}

export function logNuxtRunCompleted({ result, run }: RunLifecycleArgs) {
  const ai = evlog.getAIMetadata(run?.runId)

  evlog.audit(auditEvents.AGENT_RUN_COMPLETED({
    actor: evlog.actor,
    target: { id: run?.runId || "unknown" },
  }), {
    ai,
    result_kind: resultKind(result),
    ...runFields(run),
  })

  evlog.emitRun(run?.runId, {
    ai,
    status: 200,
    thread_id_hash: evlog.safeId(run?.threadId),
  })
}

export function logNuxtRunFailed(error: unknown, run?: AgentRunMetadata) {
  const ai = evlog.getAIMetadata(run?.runId)

  evlog.error(errorEvents.AGENT_RUN_FAILED({
    cause: error instanceof Error ? error : undefined,
    internal: {
      origin: run?.origin,
      threadIdHash: evlog.safeId(run?.threadId),
    },
  }), error, {
    ai,
    ...runFields(run),
  })

  evlog.emitRun(run?.runId, {
    ai,
    status: 500,
    thread_id_hash: evlog.safeId(run?.threadId),
  })
}

export function finishNuxtRun(event: AgentFinishEvent<AgentRuntimeConfig>) {
  if (event.error) {
    logNuxtRunFailed(event.error, event.invocation.run)
    return
  }

  logNuxtRunCompleted({
    result: event.result,
    run: event.invocation.run,
  })
}
