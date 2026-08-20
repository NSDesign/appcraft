#!/usr/bin/env node
/**
 * check:skills — the skill fallback model, ADOPT+ from Toolcraft.
 *
 * Toolcraft keeps a `skills-lock.json` but its checker never reads it: the lock
 * records a hash of a package on the author's machine, so a skill can be edited
 * in-repo without any check noticing. appcraft locks the skill *content* that
 * actually ships and verifies it, which is the same discipline made checkable.
 *
 * Rules preserved from Toolcraft:
 *   - a missing skill is reported, never silently skipped;
 *   - a missing skill is never a reason to weaken verification.
 *
 * Usage:
 *   node scripts/check-skills.mjs           verify presence and content hashes
 *   node scripts/check-skills.mjs --write   rewrite skills-lock.json from disk
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = path.join(projectRoot, "skills-lock.json");
const repoSkillRoot = ".agents/skills";

/**
 * Fallback roots, in precedence order. The repo copy is authoritative; the rest
 * let an agent whose host installs skills globally satisfy the requirement
 * without vendoring a second copy.
 */
const fallbackSkillRoots = [
  path.join(projectRoot, ".claude/skills"),
  path.join(
    process.env.CLAUDE_HOME ? path.resolve(process.env.CLAUDE_HOME) : path.join(homedir(), ".claude"),
    "skills",
  ),
  path.join(
    process.env.CODEX_HOME ? path.resolve(process.env.CODEX_HOME) : path.join(homedir(), ".codex"),
    "skills",
  ),
  path.join(homedir(), ".cursor/skills"),
  path.join(
    process.env.XDG_CONFIG_HOME ? path.resolve(process.env.XDG_CONFIG_HOME) : path.join(homedir(), ".config"),
    "agents/skills",
  ),
];

function hashContent(contents) {
  // Newline-normalised so a checkout on another platform does not fail the gate.
  return createHash("sha256").update(contents.replace(/\r\n/g, "\n"), "utf8").digest("hex");
}

function readSkillFile(absolutePath) {
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : undefined;
}

function discoverRepoSkills() {
  const root = path.join(projectRoot, repoSkillRoot);
  if (!existsSync(root)) {
    return [];
  }

  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(path.join(root, name, "SKILL.md")))
    .sort();
}

function describe(contents) {
  const description = contents.match(/^description:\s*(.+)$/m)?.[1]?.trim();
  return description ?? "no description declared in front matter";
}

if (process.argv.includes("--write")) {
  const skills = {};

  for (const name of discoverRepoSkills()) {
    const source = `${repoSkillRoot}/${name}/SKILL.md`;
    skills[name] = {
      source,
      sourceType: "repo",
      contentHash: hashContent(readFileSync(path.join(projectRoot, source), "utf8")),
    };
  }

  writeFileSync(lockPath, `${JSON.stringify({ version: 1, algorithm: "sha256", skills }, null, 2)}\n`);
  console.log(`check:skills — wrote skills-lock.json for ${Object.keys(skills).length} skill(s).`);
  process.exit(0);
}

let lock;
try {
  lock = JSON.parse(readFileSync(lockPath, "utf8"));
} catch {
  console.error("check:skills FAILED — skills-lock.json is missing or unreadable.");
  process.exit(1);
}

if (lock.algorithm !== "sha256") {
  console.error(`check:skills FAILED — unsupported lock algorithm "${lock.algorithm}".`);
  process.exit(1);
}

const lockedNames = Object.keys(lock.skills ?? {}).sort();
if (lockedNames.length === 0) {
  console.error("check:skills FAILED — the lock declares no skills.");
  process.exit(1);
}

const missing = [];
const drifted = [];
const unlocked = discoverRepoSkills().filter((name) => !lockedNames.includes(name));

for (const name of lockedNames) {
  const entry = lock.skills[name];
  const contents = readSkillFile(path.join(projectRoot, entry.source));

  if (contents !== undefined) {
    const actual = hashContent(contents);
    if (actual !== entry.contentHash) {
      drifted.push({ actual, expected: entry.contentHash, name, source: entry.source });
    }
    continue;
  }

  // The locked copy is gone. A host-installed skill satisfies presence, but its
  // content is outside the repository and therefore outside the lock's guarantee.
  const fallback = fallbackSkillRoots
    .map((root) => path.join(root, name, "SKILL.md"))
    .find((candidate) => existsSync(candidate));

  if (fallback) {
    console.warn(`check:skills — "${name}" resolved outside the repository at ${fallback}; content is not locked.`);
    continue;
  }

  missing.push({ name, source: entry.source });
}

if (drifted.length > 0) {
  console.error("check:skills FAILED — locked skill content changed:");
  for (const entry of drifted) {
    console.error(`- ${entry.name} (${entry.source})`);
    console.error(`    expected ${entry.expected}`);
    console.error(`    actual   ${entry.actual}`);
  }
  console.error("");
  console.error("Re-lock deliberately with `node scripts/check-skills.mjs --write` and record the change in docs/agent-worklog.md.");
  process.exit(1);
}

if (unlocked.length > 0) {
  console.error(`check:skills FAILED — skills present but not locked: ${unlocked.join(", ")}`);
  console.error("Run `node scripts/check-skills.mjs --write` to lock them.");
  process.exit(1);
}

if (missing.length > 0) {
  console.error("check:skills FAILED — required skills are missing:");
  for (const entry of missing) {
    console.error(`- ${entry.name} (expected at ${entry.source})`);
  }
  console.error("");
  console.error("Install or restore them before implementation. If neither is possible, record the");
  console.error("gap in docs/agent-worklog.md under the pass's `skip` list with the reason, and keep");
  console.error("the verification tier unchanged — a missing skill never lowers the gate.");
  process.exit(1);
}

console.log(`check:skills OK — ${lockedNames.length} skill(s) present and content-locked:`);
for (const name of lockedNames) {
  const contents = readSkillFile(path.join(projectRoot, lock.skills[name].source));
  console.log(`- ${name}: ${contents ? describe(contents) : "resolved outside the repository"}`);
}
