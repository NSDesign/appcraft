/**
 * Transactional generation.
 *
 * Assemble the app in a sibling staging directory, validate it there, then promote
 * it with a single rename. A failed generation therefore leaves **no target** rather
 * than a half-written folder someone has to recognise as broken and delete — which
 * is the failure mode that makes a scaffolder untrustworthy the first time it hits
 * a full disk or a bad template.
 *
 * The sibling matters: `rename` is atomic only within a filesystem, and a staging
 * directory in the OS temp dir can easily be on another one.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { createAppManifest, coreVersionRange } from "./app-manifest.mjs";
import {
  copyDirectory,
  directoryHasMeaningfulEntries,
  pathExists,
  removeDirectory,
} from "./copy-recursive.mjs";
import {
  GITIGNORE_PACKED_NAME,
  excludedFromGeneration,
  resolveTemplateSources,
} from "./paths.mjs";

/** Files whose presence proves generation produced a usable app, not an empty shell. */
const REQUIRED_OUTPUTS = ["AGENTS.md", "package.json", "docs/agent-worklog.md", "e2e"];

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function writeJson(file, value) {
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Validate the staged app before promoting it. Cheap structural checks only — the
 * expensive ones are the generated app's own `npm test`, which the user runs.
 */
async function validateStaged(stagingDir) {
  const missing = [];

  for (const required of REQUIRED_OUTPUTS) {
    if (!(await pathExists(path.join(stagingDir, required)))) {
      missing.push(required);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Generated app is missing: ${missing.join(", ")}`);
  }

  const manifest = await readJson(path.join(stagingDir, "package.json"));

  for (const [name, range] of Object.entries(manifest.dependencies ?? {})) {
    if (range === "*" || range === "workspace:*") {
      throw new Error(
        `Dependency "${name}" would be written as ${JSON.stringify(range)}. ` +
          `That resolves inside our workspace and installs nothing in a generated app.`,
      );
    }
  }

  if (manifest.workspaces) {
    throw new Error("Generated app must not declare workspaces.");
  }
}

/**
 * @param {{
 *   cwd: string,
 *   targetDir: string,
 *   name: string,
 *   force?: boolean,
 *   coreVersion?: string,
 * }} options
 */
export async function generateAppcraftApp(options) {
  const cwd = path.resolve(options.cwd);
  const targetDir = path.resolve(cwd, options.targetDir ?? ".");
  const sources = resolveTemplateSources();

  if (!options.force && (await directoryHasMeaningfulEntries(targetDir))) {
    throw new Error(
      `${path.relative(cwd, targetDir) || "."} is not empty. Pass --force to generate into it anyway.`,
    );
  }

  const stagingDir = path.join(
    path.dirname(targetDir),
    `.${path.basename(targetDir)}.appcraft-staging`,
  );

  await removeDirectory(stagingDir);

  try {
    // 1. The starter, minus everything that belongs to the monorepo rather than the app.
    await copyDirectory(sources.starter, stagingDir, {
      exclude: excludedFromGeneration,
      rename: { [GITIGNORE_PACKED_NAME]: ".gitignore" },
    });

    // 2. The skills, so the workflow fires in the agent without configuration.
    await copyDirectory(sources.skills, path.join(stagingDir, ".agents/skills"));

    // 3. A standalone manifest.
    const starterManifest = await readJson(path.join(stagingDir, "package.json"));
    const coreVersion = options.coreVersion ?? (await resolveCoreVersion(sources));
    await writeJson(
      path.join(stagingDir, "package.json"),
      createAppManifest(starterManifest, {
        coreVersion: coreVersionRange(coreVersion),
        name: options.name,
      }),
    );

    // 4. A fresh worklog. The starter's records how the *framework* was built, which
    //    would read as this app's history and satisfy the worklog gate without the
    //    user writing a word.
    await fs.writeFile(path.join(stagingDir, "docs/agent-worklog.md"), starterWorklog());

    await validateStaged(stagingDir);

    // 5. Promote. Everything above this line is discardable; nothing below can fail
    //    halfway.
    if (options.force && (await pathExists(targetDir))) {
      await mergeInto(stagingDir, targetDir);
    } else {
      await fs.mkdir(path.dirname(targetDir), { recursive: true });
      await fs.rename(stagingDir, targetDir);
    }
  } finally {
    await removeDirectory(stagingDir);
  }

  const manifest = await readJson(path.join(targetDir, "package.json"));

  return {
    packageName: manifest.name,
    relativeTargetDir: path.relative(cwd, targetDir) || ".",
    targetDir,
    templateSource: sources.source,
  };
}

/**
 * `--force` into an existing folder. Copies over the top rather than renaming, so a
 * `.git` directory and any unrelated files the user already had are preserved.
 */
async function mergeInto(stagingDir, targetDir) {
  await copyDirectory(stagingDir, targetDir);
}

/** The framework version a generated app should depend on. */
async function resolveCoreVersion(sources) {
  // Published: the CLI and the library are released together, so the CLI's own
  // version is the truthful answer. In-repo: read the library's manifest.
  const candidates = [
    path.resolve(sources.starter, "../packages/core/package.json"),
    path.resolve(sources.starter, "../../packages/core/package.json"),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      const manifest = await readJson(candidate);
      if (manifest.version) {
        return manifest.version;
      }
    }
  }

  throw new Error(
    "Could not determine the @nsdesign/appcraft-core version to depend on. " +
      "Pass --core-version explicitly.",
  );
}

function starterWorklog() {
  return `# Agent Worklog

Mode: starter

Replace \`Mode: starter\` with \`Mode: product\` and add a real decision trail before
delivery. The worklog gate fails while this file still describes the starter.

## Preflight attestations

Append one block per pass, **before** editing.

\`\`\`yaml
- pass: <short name>
  routes: [<route ids from AGENTS.md>]
  docs_read: [<paths>]
  tier: <0-4>
  tier_reason: <changed surface and expected blast radius>
  run: [<commands>]
  skip: [<checks not needed this pass, and why>]
\`\`\`

## Decision trail

Each entry names the user-visible result, the contract rules applied, rejected
alternatives, evidence, and remaining risks. Prose is context, not execution proof —
a verification claim cites the command that produced it.
`;
}
