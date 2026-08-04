/**
 * Performance coverage.
 *
 * The meta-test runs unconditionally and needs no browser: it asserts every
 * declared scenario is backed by a real named test that reads its declared
 * workload. The measured tests are fixture-gated like the rest of the suite.
 */
import { readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { appcraftPerformance } from "./appcraft-acceptance";
import { fixtureSuiteTitle, hasFixtureApp } from "./appcraft-fixture";
import {
  expectScenarioPerformanceBudget,
  getPerformanceWorkload,
  measureInteraction,
} from "./performance-helpers";
import { selectProjectionBranch } from "./projection-observable-helpers";

const currentFileName = basename(fileURLToPath(import.meta.url));
const e2eDir = dirname(fileURLToPath(import.meta.url));

const fixtureSuite: (title: string, body: () => void) => void = hasFixtureApp()
  ? test.describe
  : test.describe.skip;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripJsComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function findNamedTestSource(testName: string): string | undefined {
  const startPattern = new RegExp(
    `(?:test|it)(?:\\.[\\w]+)?\\(\\s*(["'\`])${escapeRegExp(testName)}\\1`,
  );
  const nextPattern = /\n\s*(?:test|it)(?:\.[\w]+)?\(\s*["'`]/;

  for (const fileName of readdirSync(e2eDir).filter((entry) => /\.spec\.ts$/.test(entry))) {
    const source = stripJsComments(readFileSync(join(e2eDir, fileName), "utf8"));
    const match = startPattern.exec(source);

    if (!match) {
      continue;
    }

    const afterStart = source.slice(match.index + 1);
    const nextIndex = afterStart.search(nextPattern);

    return source.slice(match.index, nextIndex === -1 ? undefined : match.index + 1 + nextIndex);
  }

  return undefined;
}

test("browser perf: performance matrix points at real tests that read the declared workload", () => {
  expect(
    appcraftPerformance.scenarios.length,
    "The performance matrix must declare at least one scenario.",
  ).toBeGreaterThan(0);

  for (const scenario of appcraftPerformance.scenarios) {
    const source = findNamedTestSource(scenario.browserTestName);

    expect(
      source,
      `${scenario.id} must be backed by a browser test named "${scenario.browserTestName}".`,
    ).toBeDefined();

    if (!source) {
      continue;
    }

    expect(
      source,
      `${scenario.id} must size its fixture from getPerformanceWorkload(appcraftPerformance, "${scenario.id}") so the measurement cannot pass on a toy input.`,
    ).toMatch(
      new RegExp(
        `getPerformanceWorkload\\s*\\(\\s*appcraftPerformance\\s*,\\s*(["'\`])${escapeRegExp(scenario.id)}\\1`,
      ),
    );

    expect(
      source,
      `${scenario.id} must assert its declared budget with expectScenarioPerformanceBudget.`,
    ).toMatch(
      new RegExp(
        `expectScenarioPerformanceBudget\\s*\\([\\s\\S]*?appcraftPerformance\\s*,\\s*(["'\`])${escapeRegExp(scenario.id)}\\1`,
      ),
    );

    expect(
      source,
      `${scenario.id} must measure a real interaction with measureInteraction, not a synthetic timer.`,
    ).toContain("measureInteraction");
  }
});

test("browser perf: performance scenarios are declared once and named distinctly", () => {
  const ids = appcraftPerformance.scenarios.map((scenario) => scenario.id);
  const names = appcraftPerformance.scenarios.map((scenario) => scenario.browserTestName);

  expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
  expect(currentFileName, "The performance meta-test must live beside the specs it scans.").toBe(
    "app-performance.spec.ts",
  );
});

fixtureSuite(fixtureSuiteTitle("projection performance"), () => {
  test("browser perf: activating a branch in a large collection stays within budget", async ({
    page,
  }) => {
    const workload = getPerformanceWorkload(appcraftPerformance, "collection-branch-activation");
    const collection = { path: "document.layers" };

    await page.goto(`/?seed=layers&count=${workload.branchCount}`);

    const result = await measureInteraction(page, async () => {
      await selectProjectionBranch(page, collection, `layer-${workload.branchCount - 1}`);
    });

    expectScenarioPerformanceBudget(result, appcraftPerformance, "collection-branch-activation");
  });

  test("browser perf: switching a panel discriminant stays within budget", async ({ page }) => {
    const workload = getPerformanceWorkload(appcraftPerformance, "panel-discriminant-switch");
    const panel = { path: "panels.inspector" };

    await page.goto(`/?seed=tabs&count=${workload.branchCount}`);

    const result = await measureInteraction(page, async () => {
      await selectProjectionBranch(page, panel, "appearance");
    });

    expectScenarioPerformanceBudget(result, appcraftPerformance, "panel-discriminant-switch");
  });
});
