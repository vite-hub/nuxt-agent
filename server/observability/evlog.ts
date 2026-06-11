import type { AuditInput, EvlogError, RequestLogger } from "evlog"
import type { AILogger, AILoggerOptions, AIMetadata } from "evlog/ai"
import { auditRedactPreset, createLogger, initLogger } from "evlog"
import { createAILogger } from "evlog/ai"

type EvlogLevel = "info" | "warn" | "error"
type EvlogFields = Record<string, unknown>

const component = "nuxt-agent"
const actor = { id: component, type: "system" } as const
const runLoggers = new Map<string, { ai?: AILogger, log: RequestLogger }>()

initLogger({
  _suppressDrainWarning: true,
  env: {
    environment: process.env.NODE_ENV || "development",
    service: component,
  },
  redact: auditRedactPreset,
  silent: true,
})

function hashString(value: string) {
  let hash = 5381
  for (let index = 0; index < value.length; index++) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index)
  }
  return (hash >>> 0).toString(36)
}

function safeId(value: unknown) {
  return typeof value === "string" && value ? hashString(value) : undefined
}

function getRunId(value: unknown) {
  return typeof value === "string" && value ? value : undefined
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    const maybeEvlogError = error as EvlogError
    return {
      code: maybeEvlogError.code,
      internal: maybeEvlogError.internal,
      message: error.message,
      name: error.name,
      stack: error.stack,
      status: maybeEvlogError.status,
    }
  }

  return { message: String(error) }
}

function stringify(entry: EvlogFields) {
  try {
    return JSON.stringify(entry, (_key, value) => typeof value === "bigint" ? value.toString() : value)
  } catch (error) {
    return JSON.stringify({
      component,
      error: serializeError(error),
      event: entry.event,
      level: entry.level,
      timestamp: entry.timestamp,
    })
  }
}

function loggerForRun(runId: string) {
  let state = runLoggers.get(runId)
  if (!state) {
    state = {
      log: createLogger({
        component,
        run_id: runId,
      }),
    }
    runLoggers.set(runId, state)
  }
  return state
}

function attachToRunLogger(level: EvlogLevel, event: string, fields: EvlogFields) {
  const runId = getRunId(fields.run_id)
  if (!runId) return

  const state = loggerForRun(runId)
  if (level === "error") {
    state.log.error(event, fields)
    return
  }
  if (level === "warn") {
    state.log.warn(event, fields)
    return
  }
  state.log.info(event, fields)
}

function write(level: EvlogLevel, event: string, fields: EvlogFields = {}) {
  const entry = {
    component,
    event,
    level,
    message: event,
    timestamp: new Date().toISOString(),
    ...fields,
  }

  attachToRunLogger(level, event, entry)
  const line = stringify(entry)

  if (level === "error") {
    console.error(line)
    return
  }
  if (level === "warn") {
    console.warn(line)
    return
  }
  console.log(line)
}

export const evlog = {
  actor,
  ai(runId: unknown, fields?: EvlogFields, options?: AILoggerOptions) {
    const id = getRunId(runId)
    if (!id) return undefined

    const state = loggerForRun(id)
    state.log.set({
      component,
      run_id: id,
      ...fields,
    })
    state.ai ||= createAILogger(state.log, options)
    return state.ai
  },
  audit(input: AuditInput, fields?: EvlogFields) {
    write("info", input.action, {
      ...fields,
      audit: input,
    })
  },
  emitRun(runId: unknown, fields?: EvlogFields) {
    const id = getRunId(runId)
    if (!id) return

    const state = loggerForRun(id)
    write("info", "nuxt.agent.RUN_EMITTED", {
      ...fields,
      run_id: id,
    })
    state.log.emit({
      _forceKeep: true,
      component,
      run_id: id,
      ...fields,
    })
    runLoggers.delete(id)
  },
  error(error: EvlogError, cause: unknown, fields?: EvlogFields) {
    const code = error.code || "nuxt.agent.UNKNOWN_ERROR"
    write("error", code, {
      ...fields,
      audit: {
        action: code,
        actor,
        outcome: "failure",
      },
      catalog_error: serializeError(error),
      error: serializeError(error),
      error_code: code,
      original_error: serializeError(cause),
    })
  },
  getAIMetadata(runId: unknown): AIMetadata | undefined {
    const id = getRunId(runId)
    if (!id) return undefined
    return runLoggers.get(id)?.ai?.getMetadata()
  },
  info(event: string, fields?: EvlogFields) {
    write("info", event, fields)
  },
  safeId,
  warn(event: string, fields?: EvlogFields) {
    write("warn", event, fields)
  },
}
