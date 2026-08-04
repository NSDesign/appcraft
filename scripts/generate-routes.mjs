#!/usr/bin/env node
/**
 * check:routes / routes:generate.
 *
 * The delta map's improvement on Toolcraft's task routing table: **generate** the
 * document from the registry so drift is impossible, rather than detecting drift
 * after someone has already edited one copy and not the other.
 *
 *   node scripts/generate-routes.mjs          verify AGENTS.md matches the registry
 *   node scripts/generate-routes.mjs --write  regenerate it
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  loadRegistry,
  projectRoot,
  readGeneratedBlock,
  renderGeneratedBlock,
  replaceGeneratedBlock,
  routesForAxis,
} from "./routes.mjs";

/** Documents that carry a generated block, and the axis each renders. */
const targets = [{ axis: "framework", file: "AGENTS.md" }];

let registry;
try {
  registry = loadRegistry();
} catch (error) {
  console.error(`check:routes FAILED — ${error.message}`);
  process.exit(1);
}

const write = process.argv.includes("--write");
let drifted = false;

for (const target of targets) {
  const file = path.join(projectRoot, target.file);
  const document = readFileSync(file, "utf8");
  const expected = renderGeneratedBlock(registry, target.axis);

  if (write) {
    writeFileSync(file, replaceGeneratedBlock(document, expected));
    console.log(`check:routes — regenerated the ${target.axis} table in ${target.file}.`);
    continue;
  }

  const actual = readGeneratedBlock(document);

  if (actual === undefined) {
    console.error(
      `check:routes FAILED — ${target.file} has no generated route block. Run \`npm run routes:generate\`.`,
    );
    drifted = true;
    continue;
  }

  if (actual !== expected) {
    console.error(
      `check:routes FAILED — the route table in ${target.file} does not match docs/routes.json.`,
    );
    console.error("  Edit the registry, then run `npm run routes:generate`. Do not edit the table.");
    drifted = true;
  }
}

if (drifted) {
  process.exit(1);
}

if (!write) {
  const counts = Object.keys(registry.axes)
    .map((axis) => `${routesForAxis(registry, axis).length} ${axis}`)
    .join(", ");
  console.log(`check:routes OK — ${counts} routes, generated tables match the registry.`);
}
