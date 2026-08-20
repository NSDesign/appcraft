/**
 * Pack-time template assembly.
 *
 * The published package must be self-contained, but nothing may be authored twice.
 * `prepack` copies the repository's real `starter/` and `.agents/skills` into the
 * package, so a published template cannot drift from the source it came from —
 * there is no second copy to forget to update.
 *
 * `.gitignore` is packed as `gitignore` because npm strips the former from a
 * tarball; generation renames it back.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { copyDirectory, pathExists, removeDirectory } from "./copy-recursive.mjs";
import {
  APP_SCOPED_SCRIPTS,
  GITIGNORE_PACKED_NAME,
  ROUTE_REGISTRY,
  excludedFromGeneration,
} from "./paths.mjs";

export async function preparePackTemplates({ packageRoot, repoRoot }) {
  const templatesRoot = path.join(packageRoot, "templates");
  const skillsRoot = path.join(packageRoot, "appcraft-skills");
  const scriptsRoot = path.join(packageRoot, "appcraft-scripts");
  const routesFile = path.join(packageRoot, "appcraft-routes.json");

  await removeDirectory(templatesRoot);
  await removeDirectory(skillsRoot);
  await removeDirectory(scriptsRoot);
  await fs.rm(routesFile, { force: true });

  const starterFiles = await copyDirectory(
    path.join(repoRoot, "starter"),
    path.join(templatesRoot, "starter"),
    { exclude: excludedFromGeneration },
  );

  const gitignore = path.join(templatesRoot, "starter/.gitignore");
  if (await pathExists(gitignore)) {
    await fs.rename(gitignore, path.join(templatesRoot, `starter/${GITIGNORE_PACKED_NAME}`));
  }

  const skillFiles = await copyDirectory(path.join(repoRoot, ".agents/skills"), skillsRoot);

  // The contract checks a generated app carries. Copied by name rather than wholesale:
  // most of `scripts/` gates appcraft itself and means nothing inside an app.
  await fs.mkdir(scriptsRoot, { recursive: true });
  for (const script of APP_SCOPED_SCRIPTS) {
    await fs.copyFile(path.join(repoRoot, "scripts", script), path.join(scriptsRoot, script));
  }

  await fs.copyFile(path.join(repoRoot, ROUTE_REGISTRY), routesFile);

  return {
    routesFile,
    scriptFiles: APP_SCOPED_SCRIPTS.length,
    scriptsRoot,
    skillFiles,
    skillsRoot,
    starterFiles,
    templatesRoot,
  };
}
