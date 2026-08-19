#!/usr/bin/env node
/**
 * postpack — remove the staged template copies.
 *
 * `prepack` copies `starter/` and `.agents/skills/` into this package so the tarball
 * is self-contained. Left behind afterwards, those copies are worse than clutter:
 * `resolveTemplateSources()` checks the packaged location **first**, so a stale
 * `templates/starter` in a checkout silently shadows the real `starter/`. A developer
 * edits `starter/`, runs the CLI, and generates from a copy frozen at whenever
 * someone last ran `npm pack` — with nothing to indicate it.
 *
 * That is how a `.gitkeep` deleted from `starter/` kept appearing in generated apps.
 *
 * The tarball is already written by the time this runs, so removing the staging is
 * safe: it restores the checkout to the state `resolveTemplateSources()` documents
 * as "in-repo".
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { removeDirectory } from "../src/copy-recursive.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

for (const staged of ["templates", "appcraft-skills"]) {
  await removeDirectory(path.join(packageRoot, staged));
}

console.log("postpack — removed staged template copies.");
