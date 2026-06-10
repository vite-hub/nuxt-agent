import { remoteMcpServer } from "@vite-hub/agent/mcp"
import { defineWorkspace, source } from "@vite-hub/workspace"

function nuxtMcpServer() {
  return remoteMcpServer({
    type: "http",
    url: process.env.NUXT_MCP_URL?.trim() || "https://nuxt.com/mcp",
  })
}

export default defineWorkspace({
  store: { provider: "memory" },
  sources: {
    nuxt: source.mcpResources({
      mount: "nuxt",
      server: nuxtMcpServer,
    }),
  },
})
