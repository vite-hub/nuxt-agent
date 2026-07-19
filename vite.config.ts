import { hubAgent } from "@vite-hub/agent/vite"
import { env, hubEnv } from "@vite-hub/env/vite"
import { hubRateLimit } from "@vite-hub/rate-limit/vite"
import { hubWorkflow } from "@vite-hub/workflow/vite"
import { hubWorkspace } from "@vite-hub/workspace/vite"
import { nitro } from "nitro/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    hubEnv(),
    hubRateLimit({ provider: "memory" }),
    hubAgent(),
    hubWorkflow({ provider: "openworkflow" }),
    hubWorkspace(),
    nitro({
      compatibilityDate: "2026-06-10",
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
  env: {
    server: {
      openaiApiKey: env({ secret: true }),
      telegram: {
        botToken: env({ secret: true }),
        webhookSecretToken: env({ secret: true }),
      },
    },
  },
})
