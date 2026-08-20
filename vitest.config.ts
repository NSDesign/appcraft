import { defineConfig } from "vitest/config";

/**
 * Unit tests live beside the code they cover, inside each package's `src`.
 * `starter/e2e` is Playwright's and is excluded explicitly: a browser spec collected
 * by the unit runner would fail for the wrong reason, or worse, appear to pass
 * without a browser.
 */
export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "starter/e2e/**"],
    passWithNoTests: true,
    environment: "node",
  },
});
