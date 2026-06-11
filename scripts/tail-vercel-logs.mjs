import { spawn } from "node:child_process"

const args = process.argv.slice(2)
const options = {
  debug: args.includes("--debug"),
  event: readOption("--event"),
  level: readOption("--level"),
  runId: readOption("--run-id"),
  target: readOption("--target") || process.env.VERCEL_LOG_TARGET || "nuxt-agent-two.vercel.app",
}

function readOption(name) {
  const index = args.indexOf(name)
  if (index === -1) return undefined
  return args[index + 1]
}

function parseMaybeJson(value) {
  if (typeof value !== "string") return undefined
  try {
    return JSON.parse(cleanText(value))
  } catch {
    return undefined
  }
}

function cleanText(value) {
  return value
    .replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
}

function matches(entry) {
  if (entry.component !== "nuxt-agent") return false
  if (options.runId && entry.run_id !== options.runId) return false
  if (options.event && entry.event !== options.event) return false
  if (options.level && entry.level !== options.level) return false
  return true
}

function entryFromRow(row) {
  if (!row || typeof row !== "object") return undefined
  return typeof row.message === "string" ? parseMaybeJson(row.message) : row.message
}

function entryFromPlainLine(line) {
  const jsonText = jsonTextFromPlainLine(line)
  return jsonText ? parseMaybeJson(jsonText) : undefined
}

function jsonTextFromPlainLine(line) {
  const clean = cleanText(line)
  const index = clean.indexOf("{")
  if (index === -1) return undefined
  const end = clean.lastIndexOf("}")
  if (end <= index) return undefined
  return clean.slice(index, end + 1)
}

function printEntry(entry, row = {}) {
  if (!entry || typeof entry !== "object" || !matches(entry)) return false

  console.log(JSON.stringify({
    ...entry,
    vercel: {
      deployment: row.deploymentId,
      request: row.requestPath,
      source: row.source,
      status: row.responseStatusCode,
      timestamp: row.timestampInMs ? new Date(row.timestampInMs).toISOString() : undefined,
    },
  }))
  return true
}

function rawJsonMatches(jsonText) {
  if (!jsonText.includes('"component":"nuxt-agent"')) return false
  if (options.runId && !jsonText.includes(`"run_id":"${options.runId}"`)) return false
  if (options.event && !jsonText.includes(`"event":"${options.event}"`)) return false
  if (options.level && !jsonText.includes(`"level":"${options.level}"`)) return false
  return true
}

function printRawLineMatch(line) {
  const clean = cleanText(line)
  if (!rawJsonMatches(clean)) return false
  const start = clean.indexOf("{")
  const end = clean.lastIndexOf("}")
  console.log(start !== -1 && end > start ? clean.slice(start, end + 1) : clean)
  return true
}

function debugSkipped(line, entry) {
  if (!options.debug || !line.trim()) return
  if (entry && typeof entry === "object") {
    process.stderr.write(`[skipped component=${entry.component} event=${entry.event} run_id=${entry.run_id}] ${line}\n`)
    return
  }
  process.stderr.write(`[unparsed] ${line}\n`)
}

const child = spawn("vercel", ["logs", options.target, "--no-color"], {
  env: { ...process.env, NO_COLOR: "1" },
  stdio: ["ignore", "pipe", "pipe"],
})

function createLogConsumer() {
  let buffer = ""
  return (chunk) => {
    buffer += chunk
    const lines = buffer.split(/\r?\n|\r/)
    buffer = lines.pop() || ""
    for (const line of lines) {
      if (printRawLineMatch(line)) continue
      const row = parseMaybeJson(line)
      if (row) {
        const entry = entryFromRow(row)
        if (!printEntry(entry, row)) debugSkipped(line, entry)
        continue
      }
      const entry = entryFromPlainLine(line)
      if (!printEntry(entry)) {
        const jsonText = jsonTextFromPlainLine(line)
        if (jsonText && rawJsonMatches(jsonText)) {
          console.log(jsonText)
          continue
        }
        debugSkipped(line, entry)
      }
    }
  }
}

child.stdout.setEncoding("utf8")
child.stderr.setEncoding("utf8")
child.stdout.on("data", createLogConsumer())
child.stderr.on("data", createLogConsumer())

child.on("exit", code => process.exit(code || 0))

process.on("SIGINT", () => {
  child.kill("SIGINT")
})
