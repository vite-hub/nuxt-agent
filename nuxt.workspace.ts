import { defineWorkspace, source } from "@vite-hub/workspace"

export default defineWorkspace({
  store: { provider: "memory" },
  sources: {
    nuxt: source.fetch({
      path: "nuxt/llms.txt",
      responseType: "text",
      url: new URL("/llms.txt", process.env.NUXT_DOCS_URL?.trim() || "https://nuxt.com"),
    }),
  },
})
