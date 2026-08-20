#!/usr/bin/env node
/**
 * check:worklog — makes the worklog gate real.
 *
 * `AGENTS.md` states that the worklog must carry a decision trail and that prose is
 * context rather than execution proof. Until this script existed, nothing enforced
 * it: the entire decision trail could be deleted and the gate still passed. That is
 * exactly Toolcraft's weakness — an unverifiable instruction — reproduced inside the
 * mechanism built to fix it.
 *
 * Delta-map improvement (worklog / decision trail, ADOPT+): checks verify *semantic
 * completeness* rather than "does this still look like the starter". The strongest
 * of these is that cited rule ids must exist in the decision contract, which binds
 * the trail to the catalogue instead of letting it drift into free prose.
 *
 * Only the most recent entry is checked in full. Earlier entries are history; a
 * later rule rename must not retroactively invalidate a pass that was honest when it
 * was written.
 */
import { readFileSync } from "node:fs";

const REQUIRED_FIELDS = [
  { label: "Result", pattern: /^\s*[-*]\s+\*\*Result:?\*\*/m },
  { label: "Rules applied", pattern: /^\s*[-*]\s+\*\*Rules applied:?\*\*/m },
  { label: "Rejected alternatives", pattern: /^\s*[-*]\s+\*\*Rejected alternatives:?\*\*/m },
  { label: "Evidence", pattern: /^\s*[-*]\s+\*\*Evidence:?\*\*/m },
  { label: "Risks", pattern: /^\s*[-*]\s+\*\*Risks:?\*\*/m },
];

function fail(message, ...detail) {
  console.error(`check:worklog FAILED — ${message}`);
  for (const line of detail) {
    console.error(line);
  }
  process.exit(1);
}

let worklog;
try {
  worklog = readFileSync("docs/agent-worklog.md", "utf8");
} catch {
  fail("docs/agent-worklog.md is missing.");
}

const trailIndex = worklog.indexOf("## Decision trail");
if (trailIndex === -1) {
  fail(
    "no '## Decision trail' section.",
    "Each pass records the user-visible result, the contract rules applied, rejected",
    "alternatives, evidence, and remaining risks.",
  );
}

const trail = worklog.slice(trailIndex);
const entries = [...trail.matchAll(/^###\s+(.+)$/gm)];

if (entries.length === 0) {
  fail("the decision trail contains no '### ' entries.");
}

const lastEntry = entries[entries.length - 1];
const entryTitle = lastEntry[1].trim();
const entryBody = trail.slice(lastEntry.index);

const missing = REQUIRED_FIELDS.filter((field) => !field.pattern.test(entryBody));
if (missing.length > 0) {
  fail(
    `the most recent decision-trail entry ("${entryTitle}") is missing: ${missing
      .map((field) => field.label)
      .join(", ")}.`,
    "",
    "Every entry names all five. An entry without rejected alternatives records what was",
    "done but not why it was the choice, which is the part a later reader needs.",
  );
}

// Evidence must point at something that ran. "Verified" is not evidence.
const evidenceBlock = entryBody.slice(entryBody.search(/^\s*[-*]\s+\*\*Evidence:?\*\*/m));
const evidenceEnd = evidenceBlock.search(/^\s*[-*]\s+\*\*Risks:?\*\*/m);
const evidence = evidenceEnd === -1 ? evidenceBlock : evidenceBlock.slice(0, evidenceEnd);

const citesCommand = /`[^`]*(npm |npx |node |playwright|vitest|tsc)[^`]*`/.test(evidence);
const declaresNoEvidence = /\bnone\b|\bnot applicable\b|\bdesign only\b/i.test(evidence);

if (!citesCommand && !declaresNoEvidence) {
  fail(
    `the Evidence in "${entryTitle}" names no command that produced it.`,
    "",
    "Prose is context, not execution proof. Cite the command in backticks with its result,",
    "or state plainly that the pass produced no evidence (for example a docs-only tier 0 pass).",
  );
}

// Rule ids cited in the trail must exist in the catalogue.
let contract;
try {
  contract = readFileSync("docs/decision-contract.md", "utf8");
} catch {
  fail("docs/decision-contract.md is missing, so cited rule ids cannot be verified.");
}

const START = "appcraft-contract:decision-rule-list:start";
const END = "appcraft-contract:decision-rule-list:end";
const catalogue = contract.slice(contract.indexOf(START) + START.length, contract.indexOf(END));
const ruleIds = new Set([...catalogue.matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|/gm)].map((match) => match[1]));

if (ruleIds.size === 0) {
  fail("no rule ids parsed from docs/decision-contract.md.");
}

const rulesBlock = entryBody.slice(entryBody.search(/^\s*[-*]\s+\*\*Rules applied:?\*\*/m));
const rulesEnd = rulesBlock.search(/^\s*[-*]\s+\*\*Rejected alternatives:?\*\*/m);
const rulesApplied = rulesEnd === -1 ? rulesBlock : rulesBlock.slice(0, rulesEnd);

const cited = [...rulesApplied.matchAll(/`([a-z][a-z0-9-]*-[a-z0-9-]+)`/g)].map((match) => match[1]);

if (cited.length === 0) {
  fail(
    `"${entryTitle}" cites no contract rule ids under Rules applied.`,
    "",
    "Name the rules the pass was decided under, in backticks, as they appear in",
    "docs/decision-contract.md.",
  );
}

const unknown = [...new Set(cited.filter((id) => !ruleIds.has(id)))];
if (unknown.length > 0) {
  fail(
    `"${entryTitle}" cites rule ids that are not in the decision contract: ${unknown.join(", ")}.`,
    "",
    "Either the id is wrong or the catalogue is missing a rule the pass actually relied on.",
  );
}

console.log(
  `check:worklog OK — "${entryTitle}" is complete, ${
    citesCommand ? "evidence names a command" : "evidence is declared absent"
  }, ${cited.length} cited rule id(s) all exist.`,
);
