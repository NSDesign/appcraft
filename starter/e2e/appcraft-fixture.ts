/**
 * Fixture-app detection and the shared DOM contract the e2e suite asserts against.
 *
 * appcraft's design is frozen and its implementation starts at field scale, so the
 * browser suite exists before the fixture app it drives. Rather than assert nothing
 * or fake a pass, every spec that needs a live page is gated on `hasFixtureApp()`
 * and skips with an explicit reason. The acceptance and performance meta-tests run
 * unconditionally, because they check the matrix against the test sources and need
 * no browser at all.
 *
 * `evidence-over-assertion` applies to this file: a skipped test is recorded as
 * skipped, never reported as coverage.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The app root. Everything the suite reads resolves from here — a generated app
 * has no parent repository to reach into. */
export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * A runnable fixture needs the page **and** any one of the entry modules — not all of
 * them. The first version of this used `.every`, which demanded `main.tsx` and
 * `main.ts` simultaneously and therefore skipped the suite forever, reporting green.
 * A gate that can only ever say "skip" is worse than no gate.
 */
const fixturePage = "index.html";
const fixtureEntryPoints = ["src/app/main.tsx", "src/app/main.ts", "src/app/main.jsx"];

export function hasFixtureApp(): boolean {
  return (
    existsSync(join(projectRoot, fixturePage)) &&
    fixtureEntryPoints.some((entry) => existsSync(join(projectRoot, entry)))
  );
}

export const fixtureSkipReason =
  "No fixture app yet — appcraft implementation starts at field scale (core-architecture §9). " +
  "This spec is skipped, not satisfied; it runs as soon as src/app renders a surface graph.";

/**
 * Suite title that says plainly, in the test report, that the suite did not run.
 * A reader scanning output should never have to infer whether a green run covered
 * these invariants.
 */
export function fixtureSuiteTitle(name: string): string {
  return hasFixtureApp() ? name : `${name} — skipped, no fixture app`;
}

/**
 * The DOM contract. Surfaces are declared, so the framework — not product code —
 * emits these attributes, which is what makes them safe to assert on.
 */
export const appcraftDom = {
  /** A declared surface instance. Carries `data-appcraft-archetype`. */
  surface: "[data-appcraft-surface]",
  /** The archetype a surface instantiates. */
  archetype: "data-appcraft-archetype",
  /** A projection node. Value is the projection's schema path. */
  projection: "[data-appcraft-projection]",
  /** The control or region that sets a projection's active key. */
  discriminant: "[data-appcraft-discriminant]",
  /** A rendered branch. Value is the branch key. */
  branch: "data-appcraft-branch",
  /** Present on the branch currently selected by the discriminant. */
  activeBranch: "data-appcraft-active-branch",
  /** Marks derived/presentational output, which must exist only for active branches. */
  derived: "[data-appcraft-derived]",
  /** Product output, the only text permitted inside a canvas surface. */
  productOutput: "[data-appcraft-product-output]",
} as const;

/** The curated archetypes. Free-form layout is not permitted. */
export const appcraftArchetypes = [
  "canvas",
  "inspector",
  "master-detail",
  "tabbed-section",
] as const;

export type AppcraftArchetype = (typeof appcraftArchetypes)[number];

/** Storage key prefix for persisted envelopes, asserted by the persistence specs. */
export const appcraftStorageKeyPrefix = "appcraft:envelope:";
