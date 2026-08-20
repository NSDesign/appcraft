#!/usr/bin/env node
/**
 * check:preflight — appcraft's improvement over Toolcraft.
 *
 * Toolcraft's preflight relies on instruction following alone and has no
 * independent verification. This asserts that the most recent worklog
 * attestation exists, declares a tier and reason, and that its declared routes
 * are consistent with the files actually changed.
 */
import path from "node:path";

import {
  changedFiles,
  isStarterMode,
  readWorklog,
  reportStarterMode,
  resolveAppRoot,
} from "./app-context.mjs";
import { loadRegistry, requiredRoutes } from "./routes.mjs";

const appRoot = resolveAppRoot();

// Route-to-path mapping comes from docs/routes.json, not from a copy kept here.
// It used to be a literal in this file, which is precisely the drift the delta map
// asks for a single registry to design out.
let registry;
try {
  registry = loadRegistry(path.join(appRoot, "docs/routes.json"));
} catch (error) {
  console.error(`check:preflight FAILED — ${error.message}`);
  process.exit(1);
}

const found = readWorklog(appRoot);
if (!found) {
  console.error("check:preflight FAILED — docs/agent-worklog.md is missing.");
  process.exit(1);
}

const worklog = found.text;

// Dormant until the worklog says the app is being built rather than scaffolded.
// This used to test for `Mode: seed`, a string generation never writes — so the
// placeholder it was meant to catch always passed straight through.
if (isStarterMode(worklog)) {
  reportStarterMode("check:preflight");
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

const changed = changedFiles(appRoot);
if (changed === undefined) {
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
