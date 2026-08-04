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

import { loadRegistry, requiredRoutes } from "./routes.mjs";

// Route-to-path mapping comes from docs/routes.json, not from a copy kept here.
// It used to be a literal in this file, which is precisely the drift the delta map
// asks for a single registry to design out.
let registry;
try {
  registry = loadRegistry();
} catch (error) {
  console.error(`check:preflight FAILED — ${error.message}`);
  process.exit(1);
}

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
  // Tracked modifications plus new files. `git diff` alone misses untracked paths,
  // which would let a pass that only adds files declare no routes at all — the
  // easiest way to slip past the gate, and the most likely shape for a new surface.
  const tracked = execSync("git diff --name-only HEAD", { encoding: "utf8" });
  const untracked = execSync("git ls-files --others --exclude-standard", { encoding: "utf8" });

  changed = [...new Set(`${tracked}\n${untracked}`.split("\n").map((s) => s.trim()).filter(Boolean))];
} catch {
  console.log("check:preflight — no git history to compare; attestation shape OK.");
  process.exit(0);
}

const required = requiredRoutes(registry, changed);

// A declared route that no registry route defines is a typo, and would otherwise
// look like diligence: the attestation names more routes, so it reads as safer.
const known = new Set(registry.routes.map((route) => route.id));
const unknown = declared.filter((route) => !known.has(route));
if (unknown.length) {
  console.error(
    `check:preflight FAILED — attestation declares routes not in docs/routes.json: ${unknown.join(", ")}`,
  );
  process.exit(1);
}

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
