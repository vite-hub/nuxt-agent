import { createHash } from "node:crypto"
import { rateLimit } from "@vite-hub/agent/capabilities"
import { auditEvents } from "../observability/audit"
import { evlog } from "../observability/evlog"
import { getServerEnv } from "../runtime/env"

import type { AgentCapabilityRuntimeContext, AgentRuntimeConfig } from "@vite-hub/agent"
import type { RateLimitDecision, RateLimitEvent, RateLimitStore, RateLimitStoreInput, RateLimitStoreResult } from "@vite-hub/agent/capabilities"

interface RateLimitEntry {
  count: number
  dayKey: string
}

interface RateLimitAuditResult {
  identityHash: string
  limit: number
  remaining: number
  used: number
}

const buckets = new Map<string, RateLimitEntry>()
let cleanupCursor = 0

function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10)
}

function dayResetAt(day: string): number {
  return Date.parse(`${day}T00:00:00.000Z`) + 86_400_000
}

function hashIdentity(identity: string): string {
  return createHash("sha256").update(identity).digest("hex")
}

function cleanupOldBuckets(day: string) {
  cleanupCursor += 1
  if (cleanupCursor % 100 !== 0) return

  for (const [key, entry] of buckets) {
    if (entry.dayKey !== day) buckets.delete(key)
  }
}

function bucketState(input: RateLimitStoreInput): { day: string, identityHash: string, key: string, resetAt: number, used: number } {
  const day = dayKey(input.now)
  const identityHash = hashIdentity(input.identity)
  const key = `${day}:${identityHash}`
  const entry = buckets.get(key)
  const used = entry?.dayKey === day ? entry.count : 0

  return {
    day,
    identityHash,
    key,
    resetAt: dayResetAt(day),
    used,
  }
}

function result(input: RateLimitStoreInput, used: number, allowed: boolean): RateLimitStoreResult {
  return {
    allowed,
    limit: input.limit,
    remaining: Math.max(0, input.limit - used),
    resetAt: dayResetAt(dayKey(input.now)),
    used,
  }
}

function createNuxtRateLimitStore(): RateLimitStore {
  return {
    check(input) {
      const state = bucketState(input)
      return result(input, state.used, state.used < input.limit)
    },
    consume(input) {
      const state = bucketState(input)
      const used = state.used + 1
      buckets.set(state.key, { count: used, dayKey: state.day })
      cleanupOldBuckets(state.day)
      return {
        ...result(input, used, used <= input.limit),
        resetAt: state.resetAt,
      }
    },
  }
}

function auditResult(decision: RateLimitDecision): RateLimitAuditResult {
  return {
    identityHash: hashIdentity(decision.identity),
    limit: decision.limit,
    remaining: decision.remaining,
    used: decision.used,
  }
}

function logRateLimitConsumed(context: AgentCapabilityRuntimeContext<AgentRuntimeConfig>, decision: RateLimitDecision) {
  const result = auditResult(decision)
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

function logRateLimitRejected(context: AgentCapabilityRuntimeContext<AgentRuntimeConfig>, decision: RateLimitDecision) {
  const result = auditResult(decision)
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

function rateLimitEnabled(): boolean {
  return getServerEnv().nuxtAgentDailyMessageLimit > 0
}

export function nuxtRateLimit() {
  const capability = rateLimit({
    id: "nuxtRateLimit",
    identity: "invoker",
    limit: () => getServerEnv().nuxtAgentDailyMessageLimit,
    message: decision => `You've reached the daily limit of ${decision.limit} messages. Try again tomorrow.`,
    onAllowed(event: RateLimitEvent) {
      logRateLimitConsumed(event.context, event.decision)
    },
    onRejected(event: RateLimitEvent) {
      logRateLimitRejected(event.context, event.decision)
    },
    store: createNuxtRateLimitStore(),
    window: "1d",
  })

  return {
    ...capability,
    async input(context: AgentCapabilityRuntimeContext<AgentRuntimeConfig>) {
      if (!rateLimitEnabled()) return
      await capability.input?.(context)
    },
  }
}
