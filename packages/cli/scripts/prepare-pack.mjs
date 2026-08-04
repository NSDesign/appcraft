#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

import { preparePackTemplates } from "../src/prepare-pack-templates.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "../..");

const result = await preparePackTemplates({ packageRoot, repoRoot });

console.log(
  `prepare-pack — staged ${result.starterFiles} starter file(s) and ${result.skillFiles} skill file(s).`,
);
