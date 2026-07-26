// @ts-check
/**
 * appcraft lint configuration.
 *
 * Phase-one enforcement is bought, not built: `eslint-plugin-boundaries` states the
 * architecture invariants as element rules, and `dependency-cruiser` states the same
 * invariants over the resolved module graph. The overlap is deliberate — the linter
 * reports at the edit site while the cruiser reports over the whole graph and finds
 * cycles.
 */
import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/include": ["src/**/*", "e2e/**/*"],
      "boundaries/elements": [
        { type: "kernel", pattern: "src/appcraft/kernel/**/*" },
        { type: "schema", pattern: "src/appcraft/schema/**/*" },
        { type: "store", pattern: "src/appcraft/store/**/*" },
        { type: "surfaces", pattern: "src/appcraft/surfaces/**/*" },
        { type: "controls", pattern: "src/appcraft/controls/**/*" },
        { type: "app", pattern: "src/app/**/*" },
        { type: "e2e", pattern: "e2e/**/*" },
      ],
    },
    rules: {
      // kernel-dependency-free: the kernel is the signable, checkable core.
      "boundaries/element-types": [
        "error",
        {
          default: "allow",
          rules: [
            { from: ["kernel"], disallow: ["schema", "store", "surfaces", "controls", "app", "e2e"] },
            { from: ["schema"], disallow: ["surfaces", "controls", "app", "e2e"] },
            { from: ["store"], disallow: ["surfaces", "controls", "app", "e2e"] },
            { from: ["app"], disallow: ["kernel", "schema", "store", "surfaces", "controls"] },
            { from: ["e2e"], disallow: ["kernel", "schema", "store", "surfaces", "controls"] },
          ],
        },
      ],
      // facade-owns-state: third-party state libraries stay beneath the facade.
      "boundaries/external": [
        "error",
        {
          default: "allow",
          rules: [
            { from: ["kernel"], disallow: ["*"] },
            { from: ["app"], disallow: ["jotai", "jotai-*", "immer", "zod"] },
          ],
        },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["scripts/**/*.mjs", "*.js"],
    languageOptions: {
      sourceType: "module",
      globals: { console: "readonly", process: "readonly" },
    },
  },
  {
    files: ["*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { __dirname: "readonly", module: "writable", require: "readonly" },
    },
  },
);
