<template>
  <SlideWindow>
    <h1 class="slide-h1">Server primitives</h1>

    <div class="ed">
      <UTabs
        v-model="activeTab"
        :items="tabItems"
        :content="false"
        color="primary"
        variant="link"
        size="sm"
        :ui="tabsUi"
      >
        <template #leading="{ item }">
          <Glyph :name="item.glyph" class="tab-glyph" />
        </template>
      </UTabs>

      <div class="ed-body">
        <nav class="ed-tree">
          <button
            v-for="row in treeRows"
            :key="row.id"
            type="button"
            class="tree-item"
            :class="[`lvl${row.depth}`, { active: row.isFile && row.id === activePath, 'is-dir': !row.isFile }]"
            @click="onRowClick(row)"
          >
            <template v-if="row.isFile">
              <span class="ts-badge">TS</span>
            </template>
            <template v-else>
              <Glyph :name="row.open ? 'caret-down' : 'caret-right'" class="tree-caret" />
              <Glyph :name="row.open ? 'folder-open' : 'folder'" class="tree-folder" />
            </template>
            <span class="tree-label">{{ row.label }}</span>
          </button>
        </nav>

        <div class="ed-code">
          <div class="code-title">
            <span class="ts-badge">TS</span>
            <span>{{ activeFile.path }}</span>
          </div>
          <div class="shiki-wrap" v-html="highlighted" />
        </div>
      </div>
    </div>
  </SlideWindow>
</template>

<script setup lang="ts">
import { computed, ref, watch, watchEffect } from "vue"
import { createHighlighter, type Highlighter } from "shiki"
import UTabs from "@nuxt/ui/components/Tabs.vue"

const tabsUi = { root: "ed-tabs-root", list: "ed-tabs-list", indicator: "ed-tabs-indicator", trigger: "ed-tabs-trigger" }

type Primitive = { tab: string, label: string, path: string, code: string }

const files: Primitive[] = [
  {
    tab: "database",
    label: "Database",
    path: "server/databases/notes.ts",
    code: `import { defineDatabase } from "@vite-hub/database"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
})

export default defineDatabase({
  connection: { url: process.env.TURSO_DATABASE_URL },
  tables: { notes },
})`,
  },
  {
    tab: "kv",
    label: "KV",
    path: "server/kv/settings.ts",
    code: `import { H3 } from "h3"
import { kv } from "@vite-hub/kv"

export default new H3()
  .get("/settings", () => kv.get("settings"))
  .put("/settings", () => kv.set("settings", { darkMode: true }))
  .delete("/settings", () => kv.del("settings"))`,
  },
  {
    tab: "blob",
    label: "Blob",
    path: "server/blob/uploads.ts",
    code: `import { H3, readBody } from "h3"
import { blob } from "@vite-hub/blob"

export default new H3()
  .get("/uploads", () => blob.list({ limit: 10 }))
  .put("/uploads", async (event) => {
    const { name, data } = await readBody<{ name: string, data: string }>(event)
    return blob.put(name, data)
  })`,
  },
  {
    tab: "workflow",
    label: "Workflow",
    path: "server/workflows/welcome.ts",
    code: `import { defineWorkflow } from "@vite-hub/workflow"

export default defineWorkflow<{ email: string }>(async ({ id, payload, step }) => {
  const sent = await step?.do?.("send-email", {}, async () => {
    return { sentTo: payload.email }
  })

  return { id, sent }
})

// trigger it from a route or another primitive:
// await runWorkflow("welcome", { email })`,
  },
  {
    tab: "sandbox",
    label: "Sandbox",
    path: "server/sandboxes/run-code.ts",
    code: `import { defineSandbox } from "@vite-hub/sandbox"
import { execSync } from "node:child_process"

export default defineSandbox(async ({ command }: { command: string }) => {
  // untrusted command, isolated from the request process
  const output = execSync(command, { timeout: 5_000 }).toString()
  return { output }
})

// trigger it from a route:
// const result = await runSandbox("run-code", { command: "ls -la" })`,
  },
  {
    tab: "queue",
    label: "Queue",
    path: "server/queues/welcome-email.ts",
    code: `import { defineQueue } from "@vite-hub/queue"

export type WelcomeEmailPayload = {
  email: string
  template: "default" | "vip"
}

export default defineQueue<WelcomeEmailPayload>(async (job) => {
  console.log(\`Sending \${job.payload.template} email to \${job.payload.email}\`)
})

// enqueue it from a route (fire-and-forget):
// await deferQueue("welcome-email", { email, template: "vip" })`,
  },
  {
    tab: "agent",
    label: "Agent",
    path: "server/agents/support.ts",
    code: `import { defineAgent, getMessageText } from "@vite-hub/agent"

export default defineAgent({
  async run({ input }) {
    const message = getMessageText(input.messages.at(-1)!)
    const queue = /payment|refund/i.test(message) ? "billing" : "product"
    return { text: \`Routed to \${queue}\` }
  },
})`,
  },
  {
    tab: "config",
    label: "vite.config",
    path: "vite.config.ts",
    code: `import { defineConfig } from "vite"
import { vitehub } from "@vite-hub/vite"

export default defineConfig({
  plugins: [vitehub()],
})`,
  },
]

const tabItems = files.map(f => ({ label: f.label, value: f.tab, glyph: "file-code" }))

const activePath = ref(files[0].path)
const activeFile = computed(() => files.find(f => f.path === activePath.value) ?? files[0])

const activeTab = computed({
  get: () => activeFile.value.tab,
  set: (tab: string) => {
    const next = files.find(f => f.tab === tab)
    if (next) activePath.value = next.path
  },
})

// ---- nested file tree ----
type TreeNode = { id: string, label: string, isFile: boolean, children: TreeNode[] }

function buildTree(): TreeNode[] {
  const root: TreeNode[] = []
  for (const file of files) {
    const parts = file.path.split("/")
    let level = root
    let acc = ""
    parts.forEach((name, i) => {
      acc += (acc ? "/" : "") + name
      const isFile = i === parts.length - 1
      let node = level.find(n => n.id === acc)
      if (!node) {
        node = { id: acc, label: name, isFile, children: [] }
        level.push(node)
      }
      level = node.children
    })
  }
  return root
}

const tree = buildTree()

function collectFolderIds(nodes: TreeNode[], out: string[] = []): string[] {
  for (const n of nodes) {
    if (!n.isFile) {
      out.push(n.id)
      collectFolderIds(n.children, out)
    }
  }
  return out
}

const expanded = ref<string[]>(collectFolderIds(tree))

type Row = { id: string, label: string, isFile: boolean, depth: number, open: boolean }

function flatten(nodes: TreeNode[], depth = 0, out: Row[] = []): Row[] {
  for (const n of nodes) {
    const open = !n.isFile && expanded.value.includes(n.id)
    out.push({ id: n.id, label: n.label, isFile: n.isFile, depth, open })
    if (open) flatten(n.children, depth + 1, out)
  }
  return out
}

const treeRows = computed(() => flatten(tree))

function onRowClick(row: Row) {
  if (row.isFile) {
    activePath.value = row.id
    return
  }
  expanded.value = expanded.value.includes(row.id)
    ? expanded.value.filter(id => id !== row.id)
    : [...expanded.value, row.id]
}

// keep the active file's folders open
watch(activePath, (path) => {
  const parts = path.split("/")
  const ancestors: string[] = []
  for (let i = 1; i < parts.length; i++) ancestors.push(parts.slice(0, i).join("/"))
  const missing = ancestors.filter(a => !expanded.value.includes(a))
  if (missing.length) expanded.value = [...expanded.value, ...missing]
})

// ---- syntax highlighting (Slidev Shiki) ----
const codeLang = computed(() => (activeFile.value.path.endsWith(".json") ? "json" : "typescript"))

const highlighted = ref("")
let highlighterPromise: Promise<Highlighter> | null = null

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["vitesse-dark"],
      langs: ["typescript", "json"],
    })
  }
  return highlighterPromise
}

watchEffect(async () => {
  const code = activeFile.value.code
  const lang = codeLang.value
  const hl = await getHighlighter()
  highlighted.value = hl.codeToHtml(code, { lang, theme: "vitesse-dark" })
})
</script>
