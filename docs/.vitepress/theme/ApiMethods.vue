<script setup lang="ts">
/**
 * A table of methods built from the method pages' frontmatter, so it never drifts from the pages.
 * `<ApiMethods area="browsing" />` lists one area; `<ApiMethods />` lists every area under a heading.
 */
import { computed } from "vue";
import { withBase } from "vitepress";
import { API_AREAS } from "../api-areas";
import { data as methods } from "./api.data";
import AuthBadge from "./AuthBadge.vue";

const props = defineProps<{ area?: string }>();

const groups = computed(() =>
  API_AREAS.filter((a) => !props.area || a.slug === props.area).map((a) => ({
    ...a,
    methods: methods.filter((m) => m.area === a.slug),
  })),
);

/** `code` spans in summaries */
function inline(text: string): string {
  const escaped = text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  return escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
}
</script>

<template>
  <div v-for="group in groups" :key="group.slug" class="api-methods">
    <h2 v-if="!area" :id="group.slug" tabindex="-1">
      <a :href="withBase(`/api/${group.slug}/`)">{{ group.title }}</a>
      <a class="header-anchor" :href="`#${group.slug}`" :aria-label="`Permalink to ${group.title}`">&#8203;</a>
    </h2>
    <table>
      <thead>
        <tr>
          <th>Method</th>
          <th>What it does</th>
          <th>Access</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in group.methods" :key="m.url">
          <td>
            <a :href="withBase(m.url)"><code>{{ m.title }}</code></a>
          </td>
          <td v-html="inline(m.summary)" />
          <td><AuthBadge :auth="m.auth" :write="m.write" short /></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* same column widths in every area's table */
.api-methods table {
  display: table;
  width: 100%;
  table-layout: fixed;
}
.api-methods th:nth-child(1) {
  width: 38%;
}
.api-methods th:nth-child(3) {
  width: 160px;
}
.api-methods td:first-child code {
  overflow-wrap: anywhere;
  white-space: normal;
}
.api-methods h2 a:first-child {
  color: inherit;
  text-decoration: none;
}
</style>
