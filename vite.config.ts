import { nitro } from "nitro/vite"
import { defineConfig } from "vite"
import { vitehub } from "vite-hub"
import { env } from "vite-hub/env"

export default defineConfig({
  plugins: [
    vitehub({
      host: "vercel",
      // Agent State (thread subscriptions, queued messages) stays in the memory of each Vercel Function instance, as
      // before. For state that survives cold starts, set VITEHUB_AGENT_STATE_URL to a hosted libSQL URL and remove this.
      agent: { providers: { state: { driver: "memory" } } },
      // Each Telegram reply runs inside the webhook request, up to maxDuration below.
      workflow: false,
      // Open the deployed app at console.vitehub.dev. The Console signs each call; the app keeps its public key in a
      // VITEHUB_CONSOLE_KEY_* variable. `vite dev` serves the Operations endpoint to this machine only.
      console: true,
      env: {
        server: {
          // The openai() gateway of the Agent Driver declares this key as optional. Voice transcription needs it too.
          openai: { apiKey: env({ secret: true, source: env.source("OPENAI_API_KEY") }) },
        },
      },
    }),
    nitro({
      compatibilityDate: "2026-06-10",
      serverDir: true,
      vercel: {
        functions: {
          environment: {
            // Public key of the console.vitehub.dev link "Nuxt Agent". Not a secret: it only checks signatures.
            VITEHUB_CONSOLE_KEY_CONSOLE_A3B10329: "sukHZhfsqSauxMqS0v01GuB-twe8U3WN53N40GhV9bk",
          },
          maxDuration: 60,
          runtime: "nodejs22.x",
        },
      },
    }),
  ],
})
