/**
 * Directory copying with an exclusion filter, and the small filesystem helpers the
 * generation transaction needs.
 */
import { constants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

export async function pathExists(target) {
  try {
    await fs.access(target, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function removeDirectory(target) {
  await fs.rm(target, { force: true, recursive: true });
}

/**
 * Copy `from` into `to`, skipping excluded names at any depth.
 *
 * @param {string} from
 * @param {string} to
 * @param {{ exclude?: Set<string>, rename?: Record<string, string> }} [options]
 * @returns {Promise<number>} files written
 */
export async function copyDirectory(from, to, options = {}) {
  const exclude = options.exclude ?? new Set();
  const rename = options.rename ?? {};
  let written = 0;

  await fs.mkdir(to, { recursive: true });

  for (const entry of await fs.readdir(from, { withFileTypes: true })) {
    if (exclude.has(entry.name)) {
      continue;
    }

    const source = path.join(from, entry.name);
    const target = path.join(to, rename[entry.name] ?? entry.name);

    if (entry.isDirectory()) {
      written += await copyDirectory(source, target, options);
    } else if (entry.isSymbolicLink()) {
      // Copy the target's contents rather than the link. A symlink into the
      // monorepo would dangle the moment the generated app is moved.
      const stats = await fs.stat(source);
      if (stats.isDirectory()) {
        written += await copyDirectory(source, target, options);
      } else {
        await fs.copyFile(source, target);
        written += 1;
      }
    } else {
      await fs.copyFile(source, target);
      written += 1;
    }
  }

  return written;
}

/**
 * Entries that do not make a directory "occupied".
 *
 * The overwhelmingly common way to start an app is to create the repository first,
 * clone it, then scaffold into the clone. Everything listed here is something that
 * flow leaves behind before a single line of the app exists. Generation merges over
 * all of it without destroying anything, so refusing on their account only teaches
 * the user to reach for `--force` — the one flag that *can* overwrite real work.
 */
export const IGNORED_WHEN_TESTING_EMPTINESS = new Set([
  ".DS_Store",
  ".git",
  ".gitattributes",
  ".github",
  ".gitignore",
  "LICENCE",
  "LICENSE",
  "README.md",
]);

/** Whether a directory holds anything a user would mind losing. */
export async function directoryHasMeaningfulEntries(target) {
  if (!(await pathExists(target))) {
    return false;
  }

  const stats = await fs.stat(target);
  if (!stats.isDirectory()) {
    return true;
  }

  const entries = await fs.readdir(target);
  return entries.some((entry) => !IGNORED_WHEN_TESTING_EMPTINESS.has(entry));
}
