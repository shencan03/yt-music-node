<script setup lang="ts">
/** Whether a method needs a signed-in client, and whether it changes the account. */
import type { AuthMode } from "../api-areas";

defineProps<{ auth?: AuthMode; write?: boolean; short?: boolean }>();

const label = {
  none: { long: "No sign-in needed", short: "No sign-in" },
  optional: { long: "Sign-in optional: more data when signed in", short: "Sign-in optional" },
  required: { long: "Sign-in required", short: "Sign-in required" },
} as const;
const title = {
  none: "Works without signing in.",
  optional: "Works signed out; returns account-specific data when signed in.",
  required: "Needs a signed-in client. See Authentication.",
} as const;
</script>

<template>
  <span class="auth-badges">
    <span v-if="auth" :class="['chip', `auth-${auth}`]" :title="title[auth]">{{ short ? label[auth].short : label[auth].long }}</span>
    <span v-if="write" class="chip write" title="Changes your account. Write requests are never retried.">{{
      short ? "Write" : "Changes your account"
    }}</span>
  </span>
</template>

<style scoped>
.auth-badges {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  vertical-align: middle;
}
.chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
}
.auth-none {
  color: var(--vp-c-green-1);
  background: var(--vp-c-green-soft);
}
.auth-optional {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}
.auth-required {
  color: var(--vp-c-warning-1);
  background: var(--vp-c-warning-soft);
}
.write {
  color: var(--vp-c-danger-1);
  background: var(--vp-c-danger-soft);
}
</style>
