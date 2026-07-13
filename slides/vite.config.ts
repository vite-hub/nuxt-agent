import { defineConfig } from "vite"
import ui from "@nuxt/ui/vite"

const nuxtUI = ui({
  components: false,
  colorMode: false,
  router: false,
  dts: false,
  ui: {
    colors: {
      primary: "green",
      neutral: "slate",
    },
  },
})

export default defineConfig({
  plugins: (Array.isArray(nuxtUI) ? nuxtUI : [nuxtUI]).filter(
    (plugin) => !plugin.name.startsWith("@tailwindcss/vite"),
  ),
})
