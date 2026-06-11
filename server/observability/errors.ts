import { defineErrorCatalog } from "evlog"

export const errorEvents = defineErrorCatalog("nuxt.agent", {
  AGENT_RUN_FAILED: {
    internal: { component: "agent" },
    message: "Agent run failed",
    status: 500,
  },
  TELEGRAM_WEBHOOK_FAILED: {
    internal: { component: "telegram" },
    message: "Telegram webhook failed",
    status: 500,
  },
})

declare module "evlog" {
  interface RegisteredErrorCatalogs {
    "nuxt.agent": typeof errorEvents
  }
}
