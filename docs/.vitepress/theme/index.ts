import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import ApiMethods from "./ApiMethods.vue";
import AuthBadge from "./AuthBadge.vue";
import HomeHero from "./HomeHero.vue";
import MethodInfo from "./MethodInfo.vue";
import { data as methods } from "./api.data";
import "./custom.css";

/**
 * Methods used to be sections of one page per area (`/api/browsing#getartist`). Send those links,
 * and `/api/raw#request`-style ones, to the method's own page.
 */
function redirectOldAnchor(go: (to: string) => Promise<void>, base: string): void {
  const { pathname, hash } = window.location;
  if (!hash) return;
  const match = new RegExp(`^${base}api/(\\w+)/?$`).exec(pathname);
  if (!match) return;
  const target = methods.find((m) => m.area === match[1] && m.title.toLowerCase() === hash.slice(1).toLowerCase());
  if (target) void go(`${base}${target.url.slice(1)}`);
}

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router, siteData }) {
    app.component("MethodInfo", MethodInfo);
    app.component("ApiMethods", ApiMethods);
    app.component("AuthBadge", AuthBadge);
    app.component("HomeHero", HomeHero);
    if (typeof window === "undefined") return;
    const base = siteData.value.base;
    const check = () => redirectOldAnchor(router.go, base);
    const previous = router.onAfterRouteChange;
    router.onAfterRouteChange = async (to) => {
      await previous?.(to);
      check();
    };
    window.addEventListener("load", check, { once: true });
  },
} satisfies Theme;
