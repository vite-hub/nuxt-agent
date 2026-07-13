import type { AgentUsageRecord } from "@vite-hub/agent"

const numbers = new Intl.NumberFormat("en-US")

function number(value: number | undefined) {
  return value === undefined ? "n/a" : numbers.format(value)
}

export function formatUsageMessage(record: AgentUsageRecord) {
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
  const lines = [
    "**Usage**",
    `- Tokens: \`${number(total)} total (${number(record.usage?.inputTokens)} in, ${number(record.usage?.outputTokens)} out)\``,
    `- Generation: \`${duration}\``,
    `- Speed: \`${speed === undefined ? "n/a" : `${speed.toFixed(1)} tok/s`}\``,
    `- Price: \`${price}\``,
  ]

  if (record.model?.id) lines.push(`- Model: \`${record.model.id}\``)
  return lines.join("\n")
}
