/**
 * Where the CLI finds the things it copies.
 *
 * Two layouts must both work, and conflating them is the classic scaffolder bug —
 * it works for the author and ships broken:
 *
 *   published  packages/cli/templates/starter  and  packages/cli/appcraft-skills
 *   in-repo    <repo>/starter                  and  <repo>/.agents/skills
 *
 * `prepack` copies the second into the first, so the published package is
 * self-contained and the repo checkout never needs a build step to be runnable.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The monorepo root when running from a checkout; meaningless when published. */
export const repoRoot = path.resolve(packageRoot, "../..");

const packagedStarter = path.join(packageRoot, "templates/starter");
const packagedSkills = path.join(packageRoot, "appcraft-skills");
const repoStarter = path.join(repoRoot, "starter");
const repoSkills = path.join(repoRoot, ".agents/skills");

/**
 * @returns {{ starter: string, skills: string, source: "packaged" | "repo" }}
 */
export function resolveTemplateSources() {
  if (existsSync(packagedStarter)) {
    return { skills: packagedSkills, source: "packaged", starter: packagedStarter };
  }

  if (existsSync(repoStarter)) {
    return { skills: repoSkills, source: "repo", starter: repoStarter };
  }

  throw new Error(
    `No starter template found. Looked in ${packagedStarter} and ${repoStarter}.`,
  );
}

/**
 * Files the starter carries that must not reach a generated app.
 *
 * `node_modules` and build output are obvious. The rest are workspace artefacts: a
 * generated app is standalone, so a lockfile from the monorepo would pin the wrong
 * tree, and `test-results` is somebody else's run.
 */
export const excludedFromGeneration = new Set([
  "node_modules",
  "dist",
  "coverage",
  "test-results",
  "playwright-report",
  "blob-report",
  ".playwright",
  "package-lock.json",
  ".DS_Store",
]);

/**
 * npm strips a `.gitignore` from a published tarball, so the starter's copy is
 * packed as `gitignore` and restored on generation. Without this a generated app
 * commits its own `node_modules`.
 */
export const GITIGNORE_PACKED_NAME = "gitignore";
