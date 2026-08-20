#!/usr/bin/env node
/**
 * check:style-guide — the interview must leave a record, and the record must be
 * complete.
 *
 * The failure this exists to prevent is subtle: an agent asks the eight questions,
 * writes a theme, and records only the answers the user *changed*. A later reader
 * then cannot tell a deliberate default from a question nobody asked — and the whole
 * point of asking was to make the choice explicit.
 *
 * Runs against the starter here, and against the app itself once generated — the
 * same file in both places, shipped into a generated app alongside the contract it
 * enforces. Pass the root to check as the first argument; it defaults to the
 * directory holding `scripts/`.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { resolveAppRoot } from "./app-context.mjs";

/** The nine properties the style-guide route agrees. Names as the skill states them. */
const REQUIRED_PROPERTIES = [
  "base theme",
  "accent",
  "neutral",
  "contrast",
  "base typeface",
  "heading",
  "body",
  "scale",
  "radius",
];

const appRoot = resolveAppRoot();
const themeFile = path.join(appRoot, "src/app/theme.ts");
const recordFile = path.join(appRoot, "docs/style-guide.md");

if (!existsSync(themeFile)) {
  console.log(
    "check:style-guide — no src/app/theme.ts yet, so the style-guide route has not run. Nothing to check.",
  );
  process.exit(0);
}

if (!existsSync(recordFile)) {
  console.error(
    "check:style-guide FAILED — src/app/theme.ts exists but docs/style-guide.md does not.",
  );
  console.error("A theme with no recorded answers cannot be revisited or explained.");
  process.exit(1);
}

const record = readFileSync(recordFile, "utf8").toLowerCase();
const missing = REQUIRED_PROPERTIES.filter((property) => !record.includes(property));

if (missing.length > 0) {
  console.error(
    `check:style-guide FAILED — docs/style-guide.md does not record: ${missing.join(", ")}.`,
  );
  console.error("");
  console.error("Record every property, including the ones left at default. A default that was");
  console.error("chosen and a question that was never asked look identical afterwards otherwise.");
  process.exit(1);
}

if (!/astryx/.test(record) || !/\d+\.\d+\.\d+/.test(record)) {
  console.error(
    "check:style-guide FAILED — docs/style-guide.md does not name the Astryx version the answers were chosen against.",
  );
  console.error("Astryx is pre-1.0; its token surface may move, and a later rebuild must be able");
  console.error("to tell a changed choice from a changed token meaning.");
  process.exit(1);
}

console.log(
  `check:style-guide OK — ${REQUIRED_PROPERTIES.length} properties recorded, Astryx version named.`,
);
