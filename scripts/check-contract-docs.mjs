#!/usr/bin/env node
/**
 * check:docs — asserts AGENTS.md and docs/decision-contract.md do not drift.
 * Every rule id in the contract catalogue must be referenced by an invariant or
 * route in AGENTS.md, and vice versa for ids AGENTS.md cites.
 */
import { readFileSync } from "node:fs";

const contract = readFileSync("docs/decision-contract.md", "utf8");
const agents = readFileSync("AGENTS.md", "utf8");

const START = "appcraft-contract:decision-rule-list:start";
const END = "appcraft-contract:decision-rule-list:end";
const block = contract.slice(
  contract.indexOf(START) + START.length,
  contract.indexOf(END),
);
if (!block.trim()) {
  console.error("check:docs FAILED — rule list markers missing or empty.");
  process.exit(1);
}

const ids = [...block.matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|/gm)].map((m) => m[1]);
if (ids.length === 0) {
  console.error("check:docs FAILED — no rule ids parsed from catalogue.");
  process.exit(1);
}

const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
if (duplicates.length) {
  console.error(`check:docs FAILED — duplicate rule ids: ${[...new Set(duplicates)].join(", ")}`);
  process.exit(1);
}

// Rule ids cited in AGENTS.md must exist in the catalogue.
const citedInAgents = [...agents.matchAll(/`([a-z]+(?:-[a-z0-9]+){2,})`/g)]
  .map((m) => m[1])
  .filter((c) => !c.includes("/") && !c.endsWith(".md"));
const unknown = citedInAgents.filter(
  (c) => ids.includes(c) === false && /^[a-z]+(-[a-z0-9]+)+$/.test(c) && ids.some((id) => id.split("-")[0] === c.split("-")[0]),
);
if (unknown.length) {
  console.error(`check:docs FAILED — AGENTS.md cites unknown rule ids: ${[...new Set(unknown)].join(", ")}`);
  process.exit(1);
}

console.log(`check:docs OK — ${ids.length} rule ids, no drift detected.`);
