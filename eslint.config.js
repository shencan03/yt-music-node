import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules", "docs/reference", "docs/.vitepress/dist", "docs/.vitepress/cache"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // InnerTube responses are untyped, deeply nested JSON; parsers port Python code that relies on
      // dynamic access, so `any` is allowed at those boundaries (see src/nav.ts).
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["bin/**/*.js", "scripts/**"],
    languageOptions: { globals: { process: "readonly", console: "readonly" } },
  },
);
