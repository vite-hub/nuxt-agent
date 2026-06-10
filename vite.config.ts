import { hubAgent } from "@vite-hub/agent/vite"
import { hubWorkflow } from "@vite-hub/workflow/vite"
import { hubWorkspace } from "@vite-hub/workspace/vite"
import { nitro } from "nitro/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    hubAgent({ route: false }),
    hubWorkspace({
      store: { provider: "memory" },
    }),
    hubWorkflow(),
    nitro({
      compatibilityDate: "2026-06-10",
      preset: "vercel",
      serverDir: true,
    }),
  ],
  server: {
    watch: {
      ignored: ["**/.vitehub/**"],
    },
  },
  workflow: {
    provider: "vercel",
  },
  workspace: {
    store: { provider: "memory" },
  },
})
