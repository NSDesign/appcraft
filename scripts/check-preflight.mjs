#!/usr/bin/env node
/**
 * check:preflight — appcraft's improvement over Toolcraft.
 *
 * Toolcraft's preflight relies on instruction following alone and has no
 * independent verification. This asserts that the most recent worklog
 * attestation exists, declares a tier and reason, and that its declared routes
 * are consistent with the files actually changed.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const ROUTE_PATHS = {
  kernel: /^src\/appcraft\/kernel\//,
  schema: /^src\/appcraft\/schema\//,
  store: /^src\/appcraft\/store\//,
  surfaces: /^src\/appcraft\/surfaces\//,
  controls: /^src\/appcraft\/controls\//,
  enforcement: /^(scripts\/|\.dependency-cruiser|eslint|package\.json|tsconfig)/,
  docs: /^(docs\/|AGENTS\.md)/,
};

let worklog;
try {
  worklog = readFileSync("docs/agent-worklog.md", "utf8");
} catch {
  console.error("check:preflight FAILED — docs/agent-worklog.md is missing.");
  process.exit(1);
}

if (/^Mode:\s*seed\s*$/m.test(worklog)) {
  console.error(
    "check:preflight FAILED — worklog still declares 'Mode: seed'. Replace it with a real decision trail.",
  );
  process.exit(1);
}

const passes = [...worklog.matchAll(/^-\s+pass:\s*(.+)$/gm)];
if (passes.length === 0) {
  console.error("check:preflight FAILED — no preflight attestation found.");
  process.exit(1);
}

// Inspect the last attestation block.
const lastIndex = worklog.lastIndexOf("- pass:");
const lastBlock = worklog.slice(lastIndex);

const tier = lastBlock.match(/^\s+tier:\s*([0-4])\s*$/m);
if (!tier) {
  console.error("check:preflight FAILED — last attestation declares no tier (0-4).");
  process.exit(1);
}
if (!/^\s+tier_reason:\s*\S/m.test(lastBlock)) {
  console.error("check:preflight FAILED — last attestation declares no tier_reason.");
  process.exit(1);
}

const declared = (lastBlock.match(/^\s+routes:\s*\[(.*?)\]/m)?.[1] ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

let changed = [];
try {
  changed = execSync("git diff --name-only HEAD", { encoding: "utf8" })
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
} catch {
  console.log("check:preflight — no git history to compare; attestation shape OK.");
  process.exit(0);
}

const required = Object.entries(ROUTE_PATHS)
  .filter(([, re]) => changed.some((f) => re.test(f)))
  .map(([route]) => route);

const missing = required.filter((r) => !declared.includes(r));
if (missing.length) {
  console.error(
    `check:preflight FAILED — changed files require routes not declared in the attestation: ${missing.join(", ")}`,
  );
  process.exit(1);
}

console.log(
  `check:preflight OK — tier ${tier[1]}, routes [${declared.join(", ")}] consistent with ${changed.length} changed file(s).`,
);
