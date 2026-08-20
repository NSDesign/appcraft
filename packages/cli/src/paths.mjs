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
const packagedScripts = path.join(packageRoot, "appcraft-scripts");
const packagedRoutes = path.join(packageRoot, "appcraft-routes.json");
const repoStarter = path.join(repoRoot, "starter");
const repoSkills = path.join(repoRoot, ".agents/skills");
const repoScripts = path.join(repoRoot, "scripts");
const repoRoutes = path.join(repoRoot, "docs/routes.json");

/**
 * @returns {{
 *   starter: string,
 *   skills: string,
 *   scripts: string,
 *   routes: string,
 *   source: "packaged" | "repo",
 * }}
 */
export function resolveTemplateSources() {
  if (existsSync(packagedStarter)) {
    return {
      routes: packagedRoutes,
      scripts: packagedScripts,
      skills: packagedSkills,
      source: "packaged",
      starter: packagedStarter,
    };
  }

  if (existsSync(repoStarter)) {
    return {
      routes: repoRoutes,
      scripts: repoScripts,
      skills: repoSkills,
      source: "repo",
      starter: repoStarter,
    };
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

/**
 * The checks a generated app carries, and the registry they read.
 *
 * appcraft's pitch is that an app is "gated by checks that live in your repository —
 * not by this CLI at a distance". That is only true if the checks are actually in the
 * repository: `AGENTS.md` routes the style-guide gate to `npm run check:style-guide`,
 * and until these shipped, no generated app had such a script.
 *
 * The list is an allowlist rather than "copy scripts/", because most of this
 * repository's checks gate appcraft itself — skills locks, route generation, starter
 * docs — and mean nothing inside an app.
 */
export const APP_SCOPED_SCRIPTS = [
  "app-context.mjs",
  "check-preflight.mjs",
  "check-projection-graph.mjs",
  "check-style-guide.mjs",
  "check-worklog.mjs",
  "projection-graph.mjs",
  "routes.mjs",
];

/** The route registry, which `check:preflight` reads to map changed files to routes. */
export const ROUTE_REGISTRY = "docs/routes.json";
