import type { App } from "vue"
import ui from "@nuxt/ui/vue-plugin"

export default ({ app }: { app: App }) => {
  app.use(ui)
}
