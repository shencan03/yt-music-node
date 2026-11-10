import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import MethodInfo from "./MethodInfo.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("MethodInfo", MethodInfo);
  },
} satisfies Theme;
