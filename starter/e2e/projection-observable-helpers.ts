/**
 * Projection observables.
 *
 * Toolcraft's product observable answers one question: did the visible output
 * change? appcraft needs a second, harder one: *what did not change, and what was
 * thrown away?* Retention and eviction are only observable as the difference
 * between a branch's authored value (which must survive deactivation) and its
 * derived output (which must not). These helpers read both through the declared DOM
 * contract, so no test has to reach into framework internals to prove an invariant.
 */
import { expect, type Locator, type Page } from "@playwright/test";

import { appcraftDom, appcraftStorageKeyPrefix } from "./appcraft-fixture";

export type ProjectionRef = {
  /** Schema path of the projection node, matching `data-appcraft-projection`. */
  path: string;
};

export type ProjectionTimeoutOptions = {
  timeoutMs?: number;
};

const defaultTimeoutMs = 5000;

function projectionLocator(page: Page, projection: ProjectionRef): Locator {
  return page.locator(`[data-appcraft-projection="${projection.path}"]`);
}

function branchLocator(page: Page, projection: ProjectionRef, branchKey: string): Locator {
  return projectionLocator(page, projection).locator(
    `[data-appcraft-branch="${branchKey}"]`,
  );
}

/** The key the discriminant currently selects. */
export async function readActiveBranchKey(
  page: Page,
  projection: ProjectionRef,
  options: ProjectionTimeoutOptions = {},
): Promise<string> {
  const node = projectionLocator(page, projection);

  await expect(
    node,
    `Projection "${projection.path}" must be present in the surface graph.`,
  ).toBeVisible({ timeout: options.timeoutMs ?? defaultTimeoutMs });

  const active = await node.locator(`[${appcraftDom.activeBranch}]`).first().getAttribute(
    appcraftDom.branch,
  );

  if (active === null) {
    throw new Error(
      `Projection "${projection.path}" renders no branch marked ${appcraftDom.activeBranch}.`,
    );
  }

  return active;
}

/** Set the active key through the discriminant control, as a user would. */
export async function selectProjectionBranch(
  page: Page,
  projection: ProjectionRef,
  branchKey: string,
  options: ProjectionTimeoutOptions = {},
): Promise<void> {
  const discriminant = projectionLocator(page, projection)
    .locator(appcraftDom.discriminant)
    .first();

  await expect(
    discriminant,
    `Projection "${projection.path}" must expose a discriminant control; branches are never switched programmatically in a browser test.`,
  ).toBeVisible({ timeout: options.timeoutMs ?? defaultTimeoutMs });

  await discriminant.getByRole("option", { name: branchKey, exact: true }).click();

  await expect
    .poll(async () => readActiveBranchKey(page, projection, options), {
      message: `Selecting "${branchKey}" should make it the active branch of "${projection.path}".`,
      timeout: options.timeoutMs ?? defaultTimeoutMs,
    })
    .toBe(branchKey);
}

/**
 * Read a branch's authored value. Reads the rendered branch when it is active and
 * the persisted envelope when it is not — which is precisely the retention claim:
 * an inactive branch has no DOM, and its value must still be there.
 */
export async function readProjectionBranchValue(
  page: Page,
  projection: ProjectionRef,
  branchKey: string,
  options: ProjectionTimeoutOptions = {},
): Promise<unknown> {
  const branch = branchLocator(page, projection, branchKey);

  if ((await branch.count()) > 0) {
    return branch.first().inputValue();
  }

  const envelope = await readPersistedEnvelope(page, projection, options);
  const branches = envelope?.branches;

  return branches ? branches[branchKey] : undefined;
}

/** Author a value into the active branch. Fails if the branch is not active. */
export async function writeProjectionBranchValue(
  page: Page,
  projection: ProjectionRef,
  branchKey: string,
  value: string,
  options: ProjectionTimeoutOptions = {},
): Promise<void> {
  const activeKey = await readActiveBranchKey(page, projection, options);

  expect(
    activeKey,
    `Writes go to the active branch only (writeActive). Select "${branchKey}" before authoring into it.`,
  ).toBe(branchKey);

  const field = branchLocator(page, projection, branchKey).locator("input, textarea").first();

  await field.fill(value);
  await field.blur();
}

export type DerivedMarker = {
  branchKey: string;
  marker: string;
};

/** Every derived/presentational output currently materialised in a projection. */
export async function readDerivedMarkers(
  page: Page,
  projection: ProjectionRef,
): Promise<DerivedMarker[]> {
  return projectionLocator(page, projection)
    .locator(appcraftDom.derived)
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        branchKey: node.closest("[data-appcraft-branch]")?.getAttribute("data-appcraft-branch") ?? "",
        marker: node.getAttribute("data-appcraft-derived") ?? "",
      })),
    );
}

/**
 * Assert a branch holds no materialised derived state. Used both after
 * deactivation (eviction) and after reload (rebuild, never restore).
 */
export async function expectNoDerivedStateForBranch(
  page: Page,
  projection: ProjectionRef,
  branchKey: string,
): Promise<void> {
  const markers = await readDerivedMarkers(page, projection);

  expect(
    markers.filter((entry) => entry.branchKey === branchKey),
    `Derived state must be evicted for inactive branch "${branchKey}" of "${projection.path}" and rebuilt on activation, never retained.`,
  ).toEqual([]);

  const envelope = await readPersistedEnvelope(page, projection);
  const persistedBranch = envelope?.branches?.[branchKey];

  if (persistedBranch !== undefined) {
    expect(
      await readPersistedDerivedKeys(page, projection, branchKey),
      `Derived state is never persisted; envelope for "${projection.path}" branch "${branchKey}" must contain document and authored-inactive fields only.`,
    ).toEqual([]);
  }
}

export type PersistedEnvelope = {
  active?: string;
  branches?: Record<string, unknown>;
  order?: string[];
  version?: number;
};

/** Read the persisted retention envelope for a projection. */
export async function readPersistedEnvelope(
  page: Page,
  projection: ProjectionRef,
  _options: ProjectionTimeoutOptions = {},
): Promise<PersistedEnvelope | undefined> {
  const raw = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    `${appcraftStorageKeyPrefix}${projection.path}`,
  );

  if (raw === null) {
    return undefined;
  }

  return JSON.parse(raw) as PersistedEnvelope;
}

/** Seed a persisted envelope before load, for forward-migration coverage. */
export async function seedPersistedEnvelope(
  page: Page,
  projection: ProjectionRef,
  envelope: PersistedEnvelope,
): Promise<void> {
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: `${appcraftStorageKeyPrefix}${projection.path}`,
      value: JSON.stringify(envelope),
    },
  );
}

async function readPersistedDerivedKeys(
  page: Page,
  projection: ProjectionRef,
  branchKey: string,
): Promise<string[]> {
  const derivedMarkers = await readDerivedMarkers(page, projection);
  const derivedFieldNames = new Set(derivedMarkers.map((entry) => entry.marker).filter(Boolean));
  const envelope = await readPersistedEnvelope(page, projection);
  const branch = envelope?.branches?.[branchKey];

  if (typeof branch !== "object" || branch === null) {
    return [];
  }

  return Object.keys(branch).filter((field) => derivedFieldNames.has(field));
}

export type ValidationState = {
  blocked: boolean;
  messages: string[];
};

/**
 * Whether the document is currently blocked from committing, and why. An invalid
 * inactive branch must never appear here — Zod validates the active variant only.
 */
export async function readValidationState(page: Page): Promise<ValidationState> {
  const messages = await page.locator("[data-appcraft-validation-error]").allInnerTexts();
  const blocked = await page
    .locator("[data-appcraft-commit][disabled], [data-appcraft-commit][aria-disabled='true']")
    .count();

  return {
    blocked: blocked > 0,
    messages: messages.map((message) => message.replace(/\s+/g, " ").trim()).filter(Boolean),
  };
}

/** Trigger the fixture's export action and read the produced document. */
export async function readExportedDocument(
  page: Page,
  exportAction: () => Promise<void>,
): Promise<unknown> {
  await page.evaluate(() => {
    (window as Window & { __appcraftExport?: unknown }).__appcraftExport = undefined;
  });

  await exportAction();

  const exported = await page.evaluate(
    () => (window as Window & { __appcraftExport?: unknown }).__appcraftExport,
  );

  expect(
    exported,
    "The fixture must publish its export payload on window.__appcraftExport so the suite can assert on the exported document rather than on a file it cannot read.",
  ).toBeDefined();

  return exported;
}

/**
 * Assert an exported document carries the active projection only. Retained
 * inactive branches are user data, but they are not output.
 */
export function expectExportExcludesInactiveBranches(
  exported: unknown,
  projection: ProjectionRef,
  inactiveValues: readonly string[],
): void {
  const serialised = JSON.stringify(exported ?? null);

  for (const value of inactiveValues) {
    expect(
      serialised.includes(value),
      `Export of "${projection.path}" leaked the retained inactive value ${JSON.stringify(value)}. Export reads the active projection only.`,
    ).toBe(false);
  }
}
