<script setup lang="ts">
/**
 * The line under each method heading on the API pages: whether it needs auth, which test suites
 * call it (from the generated coverage data) and the ytmusicapi name.
 */
import { computed } from "vue";
import coverage from "../data/coverage.json";

const props = defineProps<{
  name: string;
  /** "none": works signed out; "required": needs auth; "optional": more data when signed in */
  auth: "none" | "required" | "optional";
  /** ytmusicapi method name, when it isn't the snake_case form of `name` */
  upstream?: string;
  /** a write: changes the account */
  write?: boolean;
}>();

const suites = computed(() => (coverage as Record<string, string[]>)[props.name] ?? []);
const upstreamName = computed(
  () => props.upstream ?? props.name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`),
);
const authLabel = { none: "No auth", required: "Auth required", optional: "Auth optional" } as const;
const authTitle = {
  none: "Works without signing in.",
  required: "Needs a signed-in client (see Authentication).",
  optional: "Works signed out; returns account-specific data when signed in.",
} as const;
</script>

<template>
  <div class="method-info">
    <span :class="['chip', `auth-${auth}`]" :title="authTitle[auth]">{{ authLabel[auth] }}</span>
    <span v-if="write" class="chip write" title="Changes the account. Write requests are never retried.">Write</span>
    <span class="label">Tested:</span>
    <span v-for="suite in suites" :key="suite" class="chip suite" :title="`Called by the ${suite} test suite`">{{
      suite
    }}</span>
    <span v-if="suites.length === 0" class="chip untested">not tested</span>
    <span class="upstream" title="Name in ytmusicapi (Python)">ytmusicapi: <code>{{ upstreamName }}</code></span>
  </div>
</template>

<style scoped>
.method-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: -4px 0 16px;
  font-size: 12.5px;
  line-height: 1;
}
.chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  font-weight: 500;
  white-space: nowrap;
}
.auth-none {
  color: var(--vp-c-green-1);
  background: var(--vp-c-green-soft);
  border-color: transparent;
}
.auth-required {
  color: var(--vp-c-warning-1);
  background: var(--vp-c-warning-soft);
  border-color: transparent;
}
.auth-optional {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-color: transparent;
}
.write {
  color: var(--vp-c-danger-1);
  background: var(--vp-c-danger-soft);
  border-color: transparent;
}
.untested {
  color: var(--vp-c-danger-1);
}
.label {
  margin-left: 6px;
  color: var(--vp-c-text-3);
}
.upstream {
  margin-left: auto;
  color: var(--vp-c-text-3);
}
.upstream code {
  font-size: 12px;
}
@media (max-width: 640px) {
  .upstream {
    margin-left: 0;
    width: 100%;
    margin-top: 2px;
  }
}
</style>
