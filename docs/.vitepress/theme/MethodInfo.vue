<script setup lang="ts">
/**
 * The line under the title of a method page: sign-in and write badges, from the page's frontmatter
 * (`auth`, `write`). Sign-in-required methods link to the authentication guide.
 */
import { computed } from "vue";
import { useData, withBase } from "vitepress";
import type { MethodFrontmatter } from "../api-areas";
import AuthBadge from "./AuthBadge.vue";

const { frontmatter } = useData();
const fm = computed(() => frontmatter.value as MethodFrontmatter);
</script>

<template>
  <div v-if="fm.auth" class="method-info">
    <AuthBadge :auth="fm.auth" :write="fm.write" />
    <a v-if="fm.auth !== 'none'" class="hint" :href="withBase('/authentication/')">How to sign in</a>
  </div>
</template>

<style scoped>
.method-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: -8px 0 20px;
}
.hint {
  font-size: 13px;
  color: var(--vp-c-text-2);
}
.hint:hover {
  color: var(--vp-c-brand-1);
}
</style>
