/**
 * Where a contract check is running, and whether there is yet anything to check.
 *
 * The same checks gate two different things: appcraft's own development in this
 * repository, and every app appcraft generates. They are authored once here and
 * copied into a generated app at generation time — exactly as the skills are — so
 * each one must resolve its inputs from where it finds itself rather than from a
 * layout baked in when it was written.
 *
 * The second job is knowing when to stay quiet. A freshly generated app has had no
 * pass, no decision, and no theme; running the full gate against it would fail for
 * the one reason that proves nothing — that the user has not started yet. A gate
 * that is red before the first edit trains people to ignore it.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * The root to check: the first non-flag argument, else the directory holding
 * `scripts/`. In this repository that is the repo root; in a generated app it is the
 * app root. Both are correct without either knowing about the other.
 */
export function resolveAppRoot(argv = process.argv.slice(2)) {
  const explicit = argv.find((argument) => !argument.startsWith("-"));
  return explicit ? path.resolve(explicit) : path.resolve(scriptDir, "..");
}

/**
 * A contract document, wherever this layout keeps it. The repository holds them at
 * `docs/`; a generated app holds the route documents under `docs/appcraft/` so the
 * user's own docs and appcraft's cannot collide.
 */
export function resolveContractDoc(root, name) {
  for (const candidate of [path.join(root, "docs", name), path.join(root, "docs/appcraft", name)]) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

export function readWorklog(root) {
  const file = path.join(root, "docs/agent-worklog.md");
  return existsSync(file) ? { file, text: readFileSync(file, "utf8") } : undefined;
}

/**
 * Whether the worklog still describes the scaffold rather than an app.
 *
 * This single line is the switch that arms the contract gate, and the generated
 * worklog says so in its own body. Keying off the mode rather than off changed
 * files is deliberate: immediately after `create` into a fresh clone every scaffold
 * file is untracked, so "has anything changed" reads as "everything has", and the
 * gate would fire before the user had typed a character.
 */
export function isStarterMode(worklogText) {
  return /^Mode:\s*starter\s*$/m.test(worklogText ?? "");
}

/**
 * Report that a check is dormant, and say exactly what wakes it. Exits 0: a scaffold
 * that has not been worked on has not violated anything.
 */
export function reportStarterMode(check) {
  console.log(`${check} — starter mode, so there is nothing to check yet.`);
  console.log(
    "Replace `Mode: starter` with `Mode: product` in docs/agent-worklog.md to arm the contract gate.",
  );
  process.exit(0);
}

/**
 * Tracked modifications plus new files, relative to the root. `undefined` when there
 * is no git history to compare — a state a checker must handle rather than crash on.
 *
 * `git diff` alone misses untracked paths, which would let a pass that only adds
 * files declare no routes at all — the easiest way to slip past the gate, and the
 * most likely shape for a new surface.
 */
export function changedFiles(root) {
  try {
    const options = { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] };
    const tracked = execSync("git diff --name-only HEAD", options);
    const untracked = execSync("git ls-files --others --exclude-standard", options);

    return [...new Set(`${tracked}\n${untracked}`.split("\n").map((line) => line.trim()).filter(Boolean))];
  } catch {
    return undefined;
  }
}
