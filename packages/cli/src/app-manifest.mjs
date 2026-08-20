/**
 * The generated app's `package.json`.
 *
 * The starter's manifest is a *workspace member*: private, named
 * `appcraft-starter`, and depending on `@nsdesign/appcraft-core` at `"*"`, which the
 * monorepo resolves locally. Every one of those is wrong for a standalone app — a
 * `"*"` range in particular would install whatever npm felt like, or nothing.
 *
 * Two more fields describe the scaffold rather than the product, and this is where
 * that distinction is drawn: the app being built is not "an appcraft application"
 * any more than a house is a scaffold, and its licence is its owner's decision. The
 * starter carries appcraft's own MIT because the starter is part of appcraft;
 * copying it into someone's product would have every app ever generated grant rights
 * its author never agreed to.
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
 * @param {{ name: string, coreVersion: string, license?: string }} options
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
    license: normaliseLicence(options.license),
    scripts,
    dependencies,
  };

  // Workspace-only fields. A generated app is not part of our monorepo.
  delete manifest.workspaces;

  // The starter's description is a description *of the starter*. Leaving it would
  // hand every generated app the same sentence about the tool that made it; an
  // absent description is a prompt to write one, which is what it should be.
  delete manifest.description;

  return manifest;
}

/**
 * npm's value for "no rights granted" is `UNLICENSED`, and that is the only honest
 * default: the user has not chosen a licence, so appcraft must not choose one for
 * them. `--license` records the choice when they have made it.
 */
export function normaliseLicence(license) {
  const value = String(license ?? "").trim();
  return value === "" ? "UNLICENSED" : value;
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
