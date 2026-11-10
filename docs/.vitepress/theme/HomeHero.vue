<script setup lang="ts">
/** Home page header: name, one-paragraph pitch, install command, links. The default slot holds a code sample. */
import { ref } from "vue";
import { withBase } from "vitepress";

const install = "npm install yt-music-node";
const copied = ref(false);

async function copy() {
  try {
    await navigator.clipboard.writeText(install);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    // clipboard unavailable (insecure context); the command is still selectable
  }
}
</script>

<template>
  <section class="home-hero">
    <div class="text">
      <p class="eyebrow">Unofficial YouTube Music API for Node.js</p>
      <h1>yt-music-node</h1>
      <p class="lead">
        Search the catalog, read artists, albums, lyrics and charts, and manage your own playlists, library and
        uploads. Typed results, no dependencies.
      </p>

      <div class="install">
        <code><span class="prompt">$</span> {{ install }}</code>
        <button type="button" :aria-label="copied ? 'Copied' : 'Copy install command'" @click="copy">
          {{ copied ? "Copied" : "Copy" }}
        </button>
      </div>

      <div class="actions">
        <a class="btn primary" :href="withBase('/guide/getting-started')">Get started</a>
        <a class="btn" :href="withBase('/api/')">API reference</a>
      </div>
    </div>

    <div class="code">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.home-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 40px;
  padding: 48px 0 56px;
  border-bottom: 1px solid var(--vp-c-divider);
}
@media (min-width: 960px) {
  .home-hero {
    grid-template-columns: minmax(0, 4fr) minmax(0, 6fr);
    gap: 48px;
    align-items: center;
    padding: 80px 0 72px;
  }
}
.eyebrow {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}
h1 {
  margin: 0;
  font-size: 40px;
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
}
@media (min-width: 640px) {
  h1 {
    font-size: 48px;
  }
}
.lead {
  margin: 16px 0 0;
  max-width: 34em;
  font-size: 17px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}
.install {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  max-width: 400px;
  margin-top: 28px;
  padding: 8px 8px 8px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}
.vp-doc .install code {
  padding: 0;
  background: none;
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow-x: auto;
}
.prompt {
  color: var(--vp-c-text-3);
  user-select: none;
}
.install button {
  flex: none;
  padding: 4px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  transition: color 0.2s, border-color 0.2s;
}
.install button:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
}
.vp-doc .btn {
  display: inline-block;
  padding: 0 18px;
  line-height: 38px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: border-color 0.2s, background-color 0.2s;
}
.vp-doc .btn:hover {
  border-color: var(--vp-c-text-3);
}
.vp-doc .btn.primary {
  border-color: var(--vp-button-brand-border);
  color: var(--vp-button-brand-text);
  background: var(--vp-button-brand-bg);
}
.vp-doc .btn.primary:hover {
  border-color: var(--vp-button-brand-hover-border);
  color: var(--vp-button-brand-hover-text);
  background: var(--vp-button-brand-hover-bg);
}
.code :deep(div[class*="language-"]) {
  margin: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
}
</style>
