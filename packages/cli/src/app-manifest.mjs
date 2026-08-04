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

  const manifest = {
    ...starterManifest,
    name,
    version: "0.1.0",
    private: true,
    description: `An appcraft application.`,
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
