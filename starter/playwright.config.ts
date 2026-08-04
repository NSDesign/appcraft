import { defineConfig, devices } from "@playwright/test";

import { hasFixtureApp } from "./e2e/appcraft-fixture";

const port = Number(process.env["APPCRAFT_TEST_PORT"] ?? 4317);
const baseURL = `http://127.0.0.1:${port}`;

/**
 * The web server is declared only when a fixture app exists. appcraft's design is
 * frozen ahead of its implementation, so the acceptance and performance meta-tests
 * must be runnable now; starting a dev server for an app that has no entry point
 * would fail the whole suite for a reason unrelated to what it checks. The
 * fixture-gated specs skip with an explicit reason until `src/app` renders.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env["CI"]),
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "retain-on-failure",
  },
  ...(hasFixtureApp()
    ? {
        webServer: {
          command: `npm exec -- vite dev --host 127.0.0.1 --port ${port} --strictPort`,
          reuseExistingServer: false,
          timeout: 60_000,
          url: baseURL,
        },
      }
    : {}),
});
