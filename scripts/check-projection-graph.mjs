#!/usr/bin/env node
/**
 * check:projection-graph — the Δ1 checker (`projection-graph-acyclic`).
 *
 * Not the same thing as the module dependency graph. `check:boundaries` proves
 * that *files* do not import in a cycle; this proves that *projection nodes* do not
 * reference each other in a cycle. A repository can pass one and fail the other.
 *
 * The extractor that reads projection nodes out of a declared schema belongs to the
 * schema route and lands with it. Until then this reports that it has no input —
 * explicitly, rather than passing on an empty graph and reading as green. The
 * analysis itself is covered by `scripts/projection-graph.test.mjs`.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { resolveAppRoot } from "./app-context.mjs";
import { findDanglingReferences, findShortestCycle } from "./projection-graph.mjs";

const projectRoot = resolveAppRoot();

/**
 * Where a declared graph is read from. A JSON array of
 * `{ id, dependsOn }` — the shape the schema route will emit.
 */
const graphPath = path.join(projectRoot, "src/appcraft/schema/projection-graph.json");

if (!existsSync(graphPath)) {
  console.log(
    "check:projection-graph — no declared projection graph at src/appcraft/schema/projection-graph.json.",
  );
  console.log("  Nothing to check yet: the extractor lands with the schema route.");
  process.exit(0);
}

let nodes;
try {
  nodes = JSON.parse(readFileSync(graphPath, "utf8"));
} catch (error) {
  console.error(`check:projection-graph FAILED — ${graphPath} is unreadable: ${error.message}`);
  process.exit(1);
}

if (!Array.isArray(nodes)) {
  console.error("check:projection-graph FAILED — the declared graph must be an array of nodes.");
  process.exit(1);
}

let dangling;
let cycle;
try {
  dangling = findDanglingReferences(nodes);
  cycle = findShortestCycle(nodes);
} catch (error) {
  console.error(`check:projection-graph FAILED — ${error.message}`);
  process.exit(1);
}

if (dangling.length > 0) {
  console.error("check:projection-graph FAILED — references to undeclared projection nodes:");
  for (const edge of dangling) {
    console.error(`- ${edge.from} → ${edge.to}`);
  }
  process.exit(1);
}

if (cycle) {
  console.error(
    `check:projection-graph FAILED — projection-graph-acyclic violated. Shortest cycle (${cycle.length - 1} node(s)):`,
  );
  console.error(`  ${cycle.join(" → ")}`);
  console.error("");
  console.error(
    "A projection may read another projection's discriminant, but the reference graph must be acyclic:",
  );
  console.error("activation of one branch would otherwise depend on itself and never settle.");
  process.exit(1);
}

console.log(
  `check:projection-graph OK — ${nodes.length} projection node(s), no cycles, no dangling references.`,
);
