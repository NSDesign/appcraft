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
import { execSync } from "node:child_process";
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
  APP_SCOPED_SCRIPTS,
  GITIGNORE_PACKED_NAME,
  ROUTE_REGISTRY,
  excludedFromGeneration,
  packageRoot,
  resolveTemplateSources,
} from "./paths.mjs";

/** Files whose presence proves generation produced a usable app, not an empty shell. */
const REQUIRED_OUTPUTS = [
  "AGENTS.md",
  "package.json",
  "docs/agent-worklog.md",
  "docs/routes.json",
  "e2e",
  "scripts/check-style-guide.mjs",
];

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
 *   skills?: boolean,
 *   license?: string,
 *   author?: string,
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
    if (options.skills !== false) {
      await copyDirectory(sources.skills, path.join(stagingDir, ".agents/skills"));
    }

    // 3. The contract checks, and the registry they read. `AGENTS.md` routes the
    //    style-guide gate to `npm run check:style-guide`; without these the command
    //    it names does not exist, and the contract is unenforced exactly where it is
    //    supposed to bite.
    await fs.mkdir(path.join(stagingDir, "scripts"), { recursive: true });
    for (const script of APP_SCOPED_SCRIPTS) {
      await fs.copyFile(
        path.join(sources.scripts, script),
        path.join(stagingDir, "scripts", script),
      );
    }

    await writeJson(
      path.join(stagingDir, ROUTE_REGISTRY),
      appAxisRegistry(await readJson(sources.routes)),
    );

    // 4. A standalone manifest.
    const starterManifest = await readJson(path.join(stagingDir, "package.json"));
    const coreVersion = options.coreVersion ?? (await resolveCoreVersion(sources));
    await writeJson(
      path.join(stagingDir, "package.json"),
      createAppManifest(starterManifest, {
        coreVersion: coreVersionRange(coreVersion),
        license: options.license,
        name: options.name,
      }),
    );

    // 5. A fresh worklog. The starter's records how the *framework* was built, which
    //    would read as this app's history and satisfy the worklog gate without the
    //    user writing a word.
    await fs.writeFile(path.join(stagingDir, "docs/agent-worklog.md"), starterWorklog());

    // 6. The app's own front matter — its README, and its licence if it declared
    //    one. Both belong to the product being built rather than to the scaffold, so
    //    neither describes appcraft and neither is written over something the
    //    repository already has: a repo created on GitHub with a README and a licence
    //    chosen is the ordinary starting point, and those are the user's answers.
    if (!(await pathExists(path.join(targetDir, "README.md")))) {
      await fs.writeFile(path.join(stagingDir, "README.md"), appReadme(options.name));
    }

    // Only MIT is written out, and only when the app asked for it. Any other SPDX id
    // is recorded in the manifest and left for the user to supply the text — writing
    // a licence we cannot reproduce exactly would be worse than writing none.
    if (
      /^mit$/i.test(options.license ?? "") &&
      !(await pathExists(path.join(targetDir, "LICENSE")))
    ) {
      await fs.writeFile(
        path.join(stagingDir, "LICENSE"),
        mitLicence(options.author ?? gitConfiguredAuthor(cwd)),
      );
    }

    await validateStaged(stagingDir);

    // 7. Promote. Everything above this line is discardable; nothing below can fail
    //    halfway.
    //
    // Merge whenever the target already exists, not only under `--force`. A clone
    // holding nothing but `.git` is a legitimate target, and `rename` onto it fails
    // with ENOTEMPTY — so keying the merge on the flag rather than on the directory
    // turned the most ordinary starting point into a crash.
    if (await pathExists(targetDir)) {
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

/**
 * The framework version a generated app should depend on.
 *
 * The two layouts answer this differently, and conflating them is why the first
 * packaged run failed: `packages/core/package.json` exists in a checkout and never in
 * the published tarball.
 *
 *   packaged  the CLI's own version — the two packages are released together, so it is
 *             the truthful answer and needs nothing outside the tarball
 *   repo      the library's manifest, so a checkout generates against local source
 */
async function resolveCoreVersion(sources) {
  if (sources.source === "packaged") {
    const manifest = await readJson(path.join(packageRoot, "package.json"));

    if (manifest.version) {
      return manifest.version;
    }
  }

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

/**
 * The registry as a generated app should see it: application routes only.
 *
 * Framework routes describe work on appcraft itself. Shipping them would let an app's
 * preflight attestation declare `kernel` or `store` and pass — an id that reads as
 * diligence while naming work the app cannot do.
 */
function appAxisRegistry(registry) {
  return {
    ...registry,
    axes: { app: registry.axes.app },
    routes: registry.routes.filter((route) => route.axis === "app"),
  };
}

/**
 * The app's README — about the app, not about appcraft.
 *
 * The distinction matters more than it looks. What `create` produces is a scaffold;
 * what the user is about to build is a product, and the README is the product's front
 * door. A README that opens by explaining the tool that generated it describes the
 * scaffolding rather than the building, and the first thing the user has to do is
 * delete it.
 *
 * So: their name, a line for them to write, and the commands they will actually run.
 * How the app is built is one short section at the bottom pointing at `AGENTS.md`,
 * which is where the contract already lives and where an agent already reads.
 */
function appReadme(name) {
  return `# ${name}

<!-- One sentence on what this app does. This file is yours; replace as you go. -->

## Develop

\`\`\`bash
npm install
npx playwright install --with-deps   # first run only; the tests drive a real browser
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build     # typecheck, then build for production
npm run preview   # serve the production build locally
\`\`\`

## Verify

\`\`\`bash
npm test          # the full gate
npm run verify:quick   # typecheck only, for the inner loop
\`\`\`

If this machine already provides a Chromium that Playwright did not install — a CI
image, a sandbox, a distribution package — point the suite at it rather than
downloading another:

\`\`\`bash
APPCRAFT_CHROMIUM=/path/to/chromium npm test
\`\`\`

## Layout

\`\`\`
src/app/     The app: schema, entry point, theme.
e2e/         Specs proving the app's projection invariants in a browser.
docs/        This app's documentation, including its decision trail.
\`\`\`

## How this app is built

Scaffolded with [appcraft](https://www.npmjs.com/package/@nsdesign/appcraft), which
supplies the build setup, the verification gate, and a contract for working on this
app with a coding agent. That contract is \`AGENTS.md\`; the routes it sends an agent
to are under \`docs/appcraft/\`, and \`scripts/\` holds the checks that enforce it.

Open this folder in an agent and describe what you want built — it reads
\`AGENTS.md\` and follows from there.
`;
}

/**
 * MIT, for an app whose author asked for it.
 *
 * Never written by default. appcraft is MIT; the app someone builds with it is not,
 * unless they say so. Generating this file unasked would have every app ever
 * scaffolded grant rights its author never agreed to — and with a blank copyright
 * line, grant them on behalf of nobody.
 */
function mitLicence(holder, year = new Date().getFullYear()) {
  const name = String(holder ?? "").trim() || "<copyright holder>";

  return `MIT License

Copyright (c) ${year} ${name}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}

/** The git-configured name, when there is one, for a generated copyright line. */
function gitConfiguredAuthor(cwd) {
  try {
    return execSync("git config user.name", {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
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
