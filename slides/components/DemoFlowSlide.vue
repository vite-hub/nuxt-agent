<template>
  <section class="deck-slide">
      <div>
        <div class="deck-kicker">Nuxt Agent demo</div>
        <h1 class="deck-title">From config file to Telegram answer</h1>
      </div>

      <div class="demo-grid">
        <div class="deck-panel demo-code">
          <div class="tabbar">
            <div class="tab active"><span class="tab-dot" /> server/agents/nuxt/config.ts</div>
            <div class="tab"><span class="tab-dot" /> webhook route</div>
          </div>
          <pre class="code-pane"><span class="kw">export default</span> <span class="fn">defineAgent</span>({
  <span class="var">runtime</span>: <span class="fn">workflow</span>(<span class="str">'nuxt-agent-demo'</span>),
  <span class="var">model</span>: <span class="fn">gatewayOrOpenAI</span>(),
  <span class="var">capabilities</span>: [
    <span class="fn">chat</span>({ <span class="var">adapters</span>: { <span class="var">telegram</span> } }),
    <span class="fn">transcribe</span>(),
    <span class="fn">mcp</span>({ <span class="var">servers</span>: { <span class="var">nuxt</span> } }),
    <span class="fn">rateLimit</span>({ <span class="var">identity</span>: <span class="str">'invoker'</span> }),
    <span class="fn">observability</span>()
  ],
  <span class="var">workspace</span>: {
    <span class="var">sources</span>: { <span class="var">nuxt</span>: <span class="fn">source.fetch</span>(<span class="str">'/llms.txt'</span>) }
  }
})</pre>
        </div>

        <div class="demo-side">
          <div class="demo-flow">
            <div v-for="node in nodes" :key="node.title" class="flow-node">
              <b>{{ node.title }}</b>
              <span>{{ node.copy }}</span>
            </div>
          </div>

          <div class="telemetry-box">
            <h3>Answer closes the loop</h3>
            <div class="metric-list">
              <div class="metric"><span>Tokens</span><strong>input + output</strong></div>
              <div class="metric"><span>Speed</span><strong>tok/s</strong></div>
              <div class="metric"><span>Price</span><strong>AI Gateway</strong></div>
              <div class="metric"><span>Model</span><strong>selected driver</strong></div>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-line">Slide 3 / 3 · now switch to the live demo</div>
  </section>
</template>

<script setup lang="ts">
const nodes = [
  {
    title: "Vite discovery",
    copy: "Agent definition becomes runtime registry and generated routes.",
  },
  {
    title: "Telegram webhook",
    copy: "Chat capability adapts voice/chat into an Agent Invocation.",
  },
  {
    title: "Capabilities",
    copy: "Transcription, MCP tools, rate limit, observability, usage telemetry.",
  },
  {
    title: "Workspace + MCP",
    copy: "Nuxt llms.txt source and Nuxt MCP keep the answer inside official context.",
  },
]
</script>
