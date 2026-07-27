/**
 * The acceptance-matrix gate.
 *
 * Toolcraft's strongest enforcement idea is not any individual browser test — it is
 * the meta-test that refuses to let a coverage matrix point at nothing. appcraft
 * keeps it and tightens it in three ways: rows must cite a rule id that really
 * exists in the decision contract, the helpers a row demands must really be exported
 * by the helper modules, and the Δ1 invariants that can only be observed in a
 * session must all be claimed by some row.
 *
 * This spec needs no browser and runs unconditionally, so the matrix stays checkable
 * before the fixture app exists.
 */
import { readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { appcraftAcceptance } from "./appcraft-acceptance";
import { appcraftArchetypes, projectRoot } from "./appcraft-fixture";

const currentFileName = basename(fileURLToPath(import.meta.url));
const e2eDir = dirname(fileURLToPath(import.meta.url));

/** Helper modules a row may draw from. */
const helperModules = [
  "performance-helpers.ts",
  "projection-observable-helpers.ts",
  "surface-graph-helpers.ts",
];

/**
 * Invariants that a static checker cannot discharge, because they are claims about
 * what a running session does over time. Every one must be claimed by a matrix row.
 * Sourced from core-architecture §8 plus the panel-persistence decision in §10.
 */
const browserObservableRules = [
  "retain-inactive-branches",
  "evict-derived-state",
  "export-active-projection-only",
  "inactive-branches-not-validated",
  "panel-discriminant-persists",
];

/**
 * Invariants discharged statically. Listing them here keeps the division explicit:
 * a graph cycle is found by reading the declaration, never by clicking.
 *
 * `projection-graph-acyclic` → `npm run check:projection-graph`
 * `kernel-dependency-free`   → `npm run check:boundaries` and the ESLint boundaries rules
 */
const staticallyCheckedRules = ["projection-graph-acyclic", "kernel-dependency-free"];

function stripJsComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readSiblingSpecSources(): { fileName: string; source: string }[] {
  return readdirSync(e2eDir)
    .filter((fileName) => /\.spec\.ts$/.test(fileName))
    .filter((fileName) => fileName !== currentFileName)
    .map((fileName) => ({
      fileName,
      source: stripJsComments(readFileSync(join(e2eDir, fileName), "utf8")),
    }));
}

function findNamedTestSource(testName: string): { fileName: string; body: string } | undefined {
  const startPattern = new RegExp(
    `(?:test|it)(?:\\.[\\w]+)?\\(\\s*(["'\`])${escapeRegExp(testName)}\\1`,
  );
  const nextPattern = /\n\s*(?:test|it)(?:\.[\w]+)?\(\s*["'`]/;

  for (const { fileName, source } of readSiblingSpecSources()) {
    const match = startPattern.exec(source);

    if (!match) {
      continue;
    }

    const afterStart = source.slice(match.index + 1);
    const nextIndex = afterStart.search(nextPattern);

    return {
      body: source.slice(match.index, nextIndex === -1 ? undefined : match.index + 1 + nextIndex),
      fileName,
    };
  }

  return undefined;
}

function readContractRuleIds(): string[] {
  const contract = readFileSync(join(projectRoot, "docs/decision-contract.md"), "utf8");
  const start = "appcraft-contract:decision-rule-list:start";
  const end = "appcraft-contract:decision-rule-list:end";
  const block = contract.slice(contract.indexOf(start) + start.length, contract.indexOf(end));

  return [...block.matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|/gm)].map((match) => match[1] ?? "");
}

function readExportedHelperNames(): Set<string> {
  const names = new Set<string>();

  for (const fileName of helperModules) {
    const source = readFileSync(join(e2eDir, fileName), "utf8");

    for (const match of source.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/gm)) {
      const name = match[1];
      if (name) {
        names.add(name);
      }
    }
  }

  return names;
}

test("acceptance matrix rows are declared once", () => {
  const ids = appcraftAcceptance.map((entry) => entry.id);
  const names = appcraftAcceptance.map((entry) => entry.browserTestName);

  expect(
    ids.filter((id, index) => ids.indexOf(id) !== index),
    "Matrix row ids must be unique; worklog evidence cites them.",
  ).toEqual([]);
  expect(
    names.filter((name, index) => names.indexOf(name) !== index),
    "Two rows must not claim the same test, or one row's coverage would silently stand in for another's.",
  ).toEqual([]);
});

test("acceptance matrix cites rules that exist in the decision contract", () => {
  const ruleIds = readContractRuleIds();

  expect(ruleIds.length, "The decision contract must parse to a non-empty rule list.").toBeGreaterThan(0);

  for (const entry of appcraftAcceptance) {
    expect(
      ruleIds,
      `Row "${entry.id}" cites rule "${entry.rule}", which is not in docs/decision-contract.md. Rules and coverage must not drift.`,
    ).toContain(entry.rule);
  }
});

test("acceptance matrix points at real tests that use the helpers they declare", () => {
  const exportedHelpers = readExportedHelperNames();

  for (const entry of appcraftAcceptance) {
    const found = findNamedTestSource(entry.browserTestName);

    expect(
      found,
      `Row "${entry.id}" must be backed by a test named "${entry.browserTestName}".`,
    ).toBeDefined();

    if (!found) {
      continue;
    }

    expect(
      entry.requiredHelpers.length,
      `Row "${entry.id}" must declare the helpers its test uses, or the row proves nothing about how the test reaches its assertion.`,
    ).toBeGreaterThan(0);

    for (const helper of entry.requiredHelpers) {
      expect(
        exportedHelpers,
        `Row "${entry.id}" requires helper "${helper}", which no helper module exports.`,
      ).toContain(helper);

      expect(
        found.body,
        `"${entry.browserTestName}" in ${found.fileName} must use ${helper}() — a row is satisfied by observing behaviour through the declared contract, not by any assertion that happens to pass.`,
      ).toContain(`${helper}(`);
    }
  }
});

test("every session-observable invariant is claimed by a matrix row", () => {
  const claimed = new Set(appcraftAcceptance.map((entry) => entry.rule));

  for (const rule of browserObservableRules) {
    expect(
      claimed,
      `"${rule}" can only be observed in a running session and must be claimed by an acceptance row.`,
    ).toContain(rule);
  }

  for (const rule of staticallyCheckedRules) {
    expect(
      claimed.has(rule),
      `"${rule}" is discharged by a static checker; claiming it here would report checker coverage as browser coverage.`,
    ).toBe(false);
  }
});

test("acceptance rows declare scales and archetypes the framework actually defines", () => {
  const scales = ["field", "collection", "panel", "viewmodel"];

  for (const entry of appcraftAcceptance) {
    expect(
      entry.scales.length,
      `Row "${entry.id}" must name the scales it holds at; the kernel is scale-invariant and coverage should say where it was proven.`,
    ).toBeGreaterThan(0);

    for (const scale of entry.scales) {
      expect(scales, `Row "${entry.id}" names unknown scale "${scale}".`).toContain(scale);
    }

    expect(
      entry.statement.trim().length,
      `Row "${entry.id}" must state what a reader can observe.`,
    ).toBeGreaterThan(0);
  }

  expect(
    [...appcraftArchetypes],
    "The curated archetype set is closed; adding one is an architecture change, not a coverage change.",
  ).toEqual(["canvas", "inspector", "master-detail", "tabbed-section"]);
});
