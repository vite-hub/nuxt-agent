import type { AgentUsageRecord } from "@vite-hub/agent"
import { renderMarkdownTemplate } from "@vite-hub/markdown-template"
import usageTemplate from "./usage.md?raw"

const numbers = new Intl.NumberFormat("en-US")

function number(value: number | undefined) {
  return value === undefined ? "n/a" : numbers.format(value)
}

export async function formatUsageMessage(record: AgentUsageRecord) {
  const total = record.usage?.totalTokens ?? (
    record.usage?.inputTokens !== undefined && record.usage.outputTokens !== undefined
      ? record.usage.inputTokens + record.usage.outputTokens
      : undefined
  )
  const duration = record.latency?.durationMs === undefined ? "n/a" : `${(record.latency.durationMs / 1000).toFixed(1)}s`
  const speed = record.latency?.tokensPerSecond ?? (
    record.usage?.outputTokens !== undefined && record.latency?.durationMs
      ? record.usage.outputTokens / (record.latency.durationMs / 1000)
      : undefined
  )
  const price = record.cost
    ? `${record.cost.estimated ? "~" : ""}$${record.cost.amount} ${record.cost.currency}`
    : "n/a"
  return renderMarkdownTemplate(usageTemplate, {
    data: {
      duration,
      input: number(record.usage?.inputTokens),
      model: record.model?.id,
      output: number(record.usage?.outputTokens),
      price,
      speed: speed === undefined ? "n/a" : `${speed.toFixed(1)} tok/s`,
      total: number(total),
    },
  })
}
