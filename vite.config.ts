import { hubAgent } from "@vite-hub/agent/vite"
import { hubWorkflow } from "@vite-hub/workflow/vite"
import { hubWorkspace } from "@vite-hub/workspace/vite"
import { nitro } from "nitro/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    hubAgent({ route: false, webhooks: true }),
    hubWorkspace({
      store: { provider: "memory" },
    }),
    hubWorkflow(),
    nitro({
      compatibilityDate: "2026-06-10",
      noExternals: [
        "@vite-hub/agent",
        "@vite-hub/source",
        "@vite-hub/workflow",
      ],
      preset: "vercel",
      serverDir: true,
      vercel: {
        functions: {
          maxDuration: 60,
          runtime: "nodejs22.x",
        },
      },
    }),
  ],
  ssr: {
    noExternal: [
      "@vite-hub/agent",
      "@vite-hub/source",
      "@vite-hub/workflow",
      "@vite-hub/workspace",
    ],
  },
  server: {
    watch: {
      ignored: ["**/.vitehub/**"],
    },
  },
  workflow: false,
  workspace: {
    store: { provider: "memory" },
  },
})
