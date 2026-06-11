import { defineAuditCatalog } from "evlog"

export const auditEvents = defineAuditCatalog("nuxt.agent", {
  AGENT_RUN_COMPLETED: { target: "agent_run" },
  AGENT_RUN_STARTED: { target: "agent_run" },
  TELEGRAM_AGENT_COMPLETED: { target: "webhook" },
  TELEGRAM_AGENT_STARTED: { target: "webhook" },
  TELEGRAM_WEBHOOK_IGNORED: { target: "webhook" },
  TELEGRAM_WEBHOOK_RECEIVED: { target: "webhook" },
  USAGE_TELEMETRY_MESSAGE_SENT: { target: "agent_run" },
})

declare module "evlog" {
  interface RegisteredAuditCatalogs {
    "nuxt.agent": typeof auditEvents
  }
}
