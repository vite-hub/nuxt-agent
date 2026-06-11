import type { AgentCapabilityRuntimeContext, AgentInvoker, AgentRuntimeConfig } from "@vite-hub/agent"
import { createHash } from "node:crypto"
import { defineCapability } from "@vite-hub/agent"
import { createError } from "h3"
import { auditEvents } from "../observability/audit"
import { evlog } from "../observability/evlog"
import { getServerEnv } from "../runtime/env"

interface RateLimitEntry {
  count: number
  dayKey: string
}

interface RateLimitResult {
  identityHash: string
  limit: number
  remaining: number
  used: number
}

const buckets = new Map<string, RateLimitEntry>()
let cleanupCursor = 0

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function invokerIdentity(invoker: AgentInvoker): string {
  return `${invoker.kind}:${invoker.id}`
}

function hashIdentity(identity: string): string {
  return createHash("sha256").update(identity).digest("hex")
}

function cleanupOldBuckets(dayKey: string) {
  cleanupCursor += 1
  if (cleanupCursor % 100 !== 0) return

  for (const [key, entry] of buckets) {
    if (entry.dayKey !== dayKey) buckets.delete(key)
  }
}

function consume(identity: string, limit: number): RateLimitResult {
  const dayKey = today()
  const identityHash = hashIdentity(identity)
  const key = `${dayKey}:${identityHash}`
  const entry = buckets.get(key)
  const used = (entry?.dayKey === dayKey ? entry.count : 0) + 1

  buckets.set(key, { count: used, dayKey })
  cleanupOldBuckets(dayKey)

  return {
    identityHash,
    limit,
    remaining: Math.max(0, limit - used),
    used,
  }
}

function logRateLimitConsumed(context: AgentCapabilityRuntimeContext<AgentRuntimeConfig>, result: RateLimitResult) {
  evlog.audit(auditEvents.RATE_LIMIT_CONSUMED({
    actor: evlog.actor,
    target: { id: context.run?.runId || result.identityHash },
  }), {
    identity_hash: result.identityHash,
    limit: result.limit,
    origin: context.run?.origin,
    remaining: result.remaining,
    run_id: context.run?.runId,
    thread_id_hash: evlog.safeId(context.run?.threadId),
    used: result.used,
  })
}

function logRateLimitRejected(context: AgentCapabilityRuntimeContext<AgentRuntimeConfig>, result: RateLimitResult) {
  evlog.audit(auditEvents.RATE_LIMIT_REJECTED({
    actor: evlog.actor,
    target: { id: context.run?.runId || result.identityHash },
  }), {
    identity_hash: result.identityHash,
    limit: result.limit,
    origin: context.run?.origin,
    remaining: result.remaining,
    run_id: context.run?.runId,
    thread_id_hash: evlog.safeId(context.run?.threadId),
    used: result.used,
  })
}

export function nuxtRateLimit() {
  return defineCapability({
    id: "nuxt-rate-limit",
    input(context: AgentCapabilityRuntimeContext<AgentRuntimeConfig>) {
      const limit = getServerEnv().nuxtAgentDailyMessageLimit
      if (limit <= 0) return

      const result = consume(invokerIdentity(context.invoker), limit)
      context.context.set("nuxtRateLimit", result)
      context.finish.provide(() => result)

      if (result.used > result.limit) {
        logRateLimitRejected(context, result)
        throw createError({
          statusCode: 429,
          message: `You've reached the daily limit of ${result.limit} messages. Try again tomorrow.`,
        })
      }

      logRateLimitConsumed(context, result)
    },
  })
}
