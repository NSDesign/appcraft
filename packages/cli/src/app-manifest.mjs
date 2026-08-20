/**
 * The generated app's `package.json`.
 *
 * The starter's manifest is a *workspace member*: private, named
 * `appcraft-starter`, and depending on `@nsdesign/appcraft-core` at `"*"`, which the
 * monorepo resolves locally. Every one of those is wrong for a standalone app — a
 * `"*"` range in particular would install whatever npm felt like, or nothing.
 */

/** npm's rules, applied so a folder name cannot produce an unpublishable manifest. */
export function sanitisePackageName(value) {
  const cleaned = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+/, "")
    .replace(/-+/g, "-")
    .replace(/-+$/, "");

  return cleaned.slice(0, 214);
}

/**
 * The contract gate, which exists only in a generated app.
 *
 * These scripts run `scripts/*.mjs`, and `scripts/` is assembled during generation —
 * the starter in this repository has no such folder, so its manifest must not claim
 * commands it cannot run. They are added here, where the standalone manifest is
 * built, for the same reason the workspace fields are removed here.
 */
const CONTRACT_GATE = {
  "check:preflight": "node scripts/check-preflight.mjs",
  "check:projection-graph": "node scripts/check-projection-graph.mjs",
  "check:style-guide": "node scripts/check-style-guide.mjs",
  "check:worklog": "node scripts/check-worklog.mjs",
};

const CONTRACT_GATE_ORDER = [
  "check:preflight",
  "check:worklog",
  "check:style-guide",
  "check:projection-graph",
];

/**
 * @param {object} starterManifest  the starter's package.json, parsed
 * @param {{ name: string, coreVersion: string }} options
 */
export function createAppManifest(starterManifest, options) {
  const name = sanitisePackageName(options.name);

  if (!name) {
    throw new Error(`Cannot derive a package name from ${JSON.stringify(options.name)}.`);
  }

  const dependencies = { ...(starterManifest.dependencies ?? {}) };

  if ("@nsdesign/appcraft-core" in dependencies) {
    dependencies["@nsdesign/appcraft-core"] = options.coreVersion;
  }

  const scripts = { ...(starterManifest.scripts ?? {}), ...CONTRACT_GATE };

  scripts["check:contract"] = CONTRACT_GATE_ORDER.map((name) => `npm run ${name}`).join(" && ");

  // The contract gate runs first: it is the cheapest, and a pass that skipped its
  // preflight should be told so before a browser starts.
  scripts["verify:final"] =
    "npm run check:contract && npm run verify:quick && npm run test:browser && npm run test:browser:perf";

  const manifest = {
    ...starterManifest,
    name,
    version: "0.1.0",
    private: true,
    description: `An appcraft application.`,
    scripts,
    dependencies,
  };

  // Workspace-only fields. A generated app is not part of our monorepo.
  delete manifest.workspaces;

  return manifest;
}

/**
 * The range a generated app should carry for the framework.
 *
 * A caret on a `0.x` version is not a safe range — `^0.1.0` permits `0.2.0`, and
 * appcraft is pre-1.0. Until 1.0 the generated app pins the exact version it was
 * generated against, which is also what makes a later upgrade a deliberate act.
 */
export function coreVersionRange(coreVersion) {
  const version = String(coreVersion ?? "").trim();

  if (!/^\d+\.\d+\.\d+/.test(version)) {
    throw new Error(`Refusing to write an unparseable core version: ${JSON.stringify(coreVersion)}`);
  }

  return version.startsWith("0.") ? version : `^${version}`;
}
