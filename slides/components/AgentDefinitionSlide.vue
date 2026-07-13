<template>
  <SlideWindow>
    <h1 class="slide-h1">Agent definitions</h1>

    <div class="agent-stage">
      <div class="diagram">
        <div class="node node-driver">
          <div class="node-head"><Glyph name="lightning" /><strong>Driver</strong></div>
          <p>What runs it — a model, harness, or your code.</p>
        </div>

        <div class="vline" />

        <div class="diagram-mid">
          <div class="node node-cap">
            <div class="node-head"><Glyph name="puzzle-piece" /><strong>Capabilities</strong></div>
            <p>plugin-like abilities (like Better Auth plugins)</p>
          </div>

          <div class="hline" />

          <div class="agent-center">
<pre><span class="fn">defineAgent</span>({
  <span class="k-driver">driver</span>,
  <span class="k-cap">capabilities</span>,
  <span class="k-ws">workspace</span>,
  <span class="k-inv">invoker</span>,
})</pre>
          </div>

          <div class="hline" />

          <div class="node node-ws">
            <div class="node-head"><Glyph name="folder" /><strong>Workspace</strong></div>
            <p>sources, files, scopes</p>
          </div>
        </div>

        <div class="vline" />

        <div class="node node-inv">
          <div class="node-head"><Glyph name="users-three" /><strong>Invokers</strong></div>
          <p>trusted caller identity</p>
        </div>
      </div>

      <div class="cap-chips is-cap">
        <UBadge v-for="c in caps" :key="c" :label="c" color="neutral" variant="outline" class="chip2" />
      </div>
    </div>

    <div class="win-foot">
      <Glyph name="star" class="foot-star" />
      <span>Capabilities are to agents what <span class="accent">Better Auth plugins</span> are to auth.</span>
    </div>
  </SlideWindow>
</template>

<script setup lang="ts">
import UBadge from "@nuxt/ui/components/Badge.vue"

const row1 = ["chat", "MCP", "transcribe", "workspaceShell", "webSearch"]
const row2 = ["sandbox", "storage", "access", "rateLimit", "telemetry"]
</script>
