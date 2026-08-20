#!/usr/bin/env node
/**
 * check:starter-docs — every document the generated contract routes an agent to must
 * actually ship inside the starter.
 *
 * App-axis document validation is deliberately off in the registry, because those
 * paths resolve inside a generated app rather than here. That left a real gap: the
 * starter's AGENTS.md could route an agent to files the starter does not carry, and
 * nothing would notice until a user followed the link. This closes it by resolving
 * the same paths against `starter/`.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { loadRegistry, projectRoot, routeDocuments } from "./routes.mjs";

const starterRoot = path.join(projectRoot, "starter");

let registry;
try {
  registry = loadRegistry();
} catch (error) {
  console.error(`check:starter-docs FAILED — ${error.message}`);
  process.exit(1);
}

const documents = routeDocuments(registry, "app");

if (documents.length === 0) {
  console.error("check:starter-docs FAILED — no app-axis route documents declared.");
  process.exit(1);
}

const missing = documents.filter((document) => !existsSync(path.join(starterRoot, document)));

if (missing.length > 0) {
  console.error("check:starter-docs FAILED — the app contract routes to documents the starter does not ship:");
  for (const document of missing) {
    console.error(`- starter/${document}`);
  }
  console.error("");
  console.error("Either write the document or change the route in docs/routes.json.");
  process.exit(1);
}

// A document that exists but says nothing is the same failure wearing a filename.
const empty = documents.filter((document) => {
  const body = readFileSync(path.join(starterRoot, document), "utf8");
  return body.replace(/^#.*$/gm, "").trim().length < 200;
});

if (empty.length > 0) {
  console.error("check:starter-docs FAILED — routed documents are effectively empty:");
  for (const document of empty) {
    console.error(`- starter/${document}`);
  }
  process.exit(1);
}

console.log(`check:starter-docs OK — ${documents.length} routed document(s) present in the starter.`);
