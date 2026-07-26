/**
 * The Δ1 invariants, discharged in a browser.
 *
 * Unit tests can prove that `select` does not delete a branch. Only a session
 * proves that the surface bound to that branch shows the retained value again, that
 * the derived output was actually thrown away rather than hidden, and that a reload
 * restores the discriminant without restoring what it projects.
 *
 * The suite is skipped as a whole until a fixture app exists, so no browser is
 * launched for tests that could not pass anyway. Skipped is reported as skipped —
 * it is never counted as coverage.
 */
import { expect, test } from "@playwright/test";

import { fixtureSuiteTitle, hasFixtureApp } from "./appcraft-fixture";
import {
  expectExportExcludesInactiveBranches,
  expectNoDerivedStateForBranch,
  readActiveBranchKey,
  readDerivedMarkers,
  readExportedDocument,
  readPersistedEnvelope,
  readProjectionBranchValue,
  readValidationState,
  seedPersistedEnvelope,
  selectProjectionBranch,
  writeProjectionBranchValue,
} from "./projection-observable-helpers";

const fixtureSuite: (title: string, body: () => void) => void = hasFixtureApp()
  ? test.describe
  : test.describe.skip;

/**
 * The field-scale projection the fixture must expose: the re-declaration of
 * Toolcraft's `StyledModeField`, which resets on mode change and is therefore the
 * canonical violation of `retain-inactive-branches`.
 */
const modeField = { path: "style.mode" };

/** The panel-scale projection: a tabbed section whose discriminant persists. */
const panelTabs = { path: "panels.inspector" };

fixtureSuite(fixtureSuiteTitle("projection invariants"), () => {
  test("browser: inactive branches retain authored state across a discriminant switch", async ({
    page,
  }) => {
    await page.goto("/");

    await selectProjectionBranch(page, modeField, "fixed");
    await writeProjectionBranchValue(page, modeField, "fixed", "42");

    await selectProjectionBranch(page, modeField, "range");
    await writeProjectionBranchValue(page, modeField, "range", "7");

    expect(
      await readProjectionBranchValue(page, modeField, "fixed"),
      "The fixed-mode value authored before the switch is authored-inactive state and must survive deactivation.",
    ).toBe("42");

    await selectProjectionBranch(page, modeField, "fixed");

    expect(
      await readProjectionBranchValue(page, modeField, "fixed"),
      "Switching back must restore the authored value, not re-initialise the branch.",
    ).toBe("42");
  });

  test("browser: derived state is evicted for inactive branches and rebuilt on activation", async ({
    page,
  }) => {
    await page.goto("/");

    await selectProjectionBranch(page, modeField, "fixed");

    const activeMarkers = await readDerivedMarkers(page, modeField);
    expect(
      activeMarkers.filter((marker) => marker.branchKey === "fixed").length,
      "The active branch must materialise its derived output.",
    ).toBeGreaterThan(0);

    await selectProjectionBranch(page, modeField, "range");
    await expectNoDerivedStateForBranch(page, modeField, "fixed");

    await selectProjectionBranch(page, modeField, "fixed");

    const rebuiltMarkers = await readDerivedMarkers(page, modeField);
    expect(
      rebuiltMarkers.filter((marker) => marker.branchKey === "fixed"),
      "Reactivating a branch must rebuild its derived state.",
    ).toEqual(activeMarkers.filter((marker) => marker.branchKey === "fixed"));
  });

  test("browser: export reads the active projection only", async ({ page }) => {
    await page.goto("/");

    await selectProjectionBranch(page, modeField, "fixed");
    await writeProjectionBranchValue(page, modeField, "fixed", "retained-inactive-marker");

    await selectProjectionBranch(page, modeField, "range");
    await writeProjectionBranchValue(page, modeField, "range", "active-marker");

    const exported = await readExportedDocument(page, async () => {
      await page.getByRole("button", { name: "Export" }).click();
    });

    expectExportExcludesInactiveBranches(exported, modeField, ["retained-inactive-marker"]);

    expect(
      JSON.stringify(exported ?? null).includes("active-marker"),
      "Export must contain the active projection's value.",
    ).toBe(true);
  });

  test("browser: an invalid inactive branch does not gate a valid document", async ({ page }) => {
    await page.goto("/");

    // Author an invalid range (min above max), then leave the branch.
    await selectProjectionBranch(page, modeField, "range");
    await writeProjectionBranchValue(page, modeField, "range", "90:10");

    await selectProjectionBranch(page, modeField, "fixed");
    await writeProjectionBranchValue(page, modeField, "fixed", "42");

    const validation = await readValidationState(page);

    expect(
      validation.blocked,
      "Zod validates the active variant only; a retained invalid branch must not block a valid document.",
    ).toBe(false);
    expect(
      validation.messages,
      "No validation error should be reported for an inactive branch.",
    ).toEqual([]);
  });

  test("browser: reload restores the panel discriminant and rebuilds derived state", async ({
    page,
  }) => {
    await page.goto("/");

    await selectProjectionBranch(page, panelTabs, "geometry");
    await selectProjectionBranch(page, panelTabs, "appearance");

    await page.reload();

    expect(
      await readActiveBranchKey(page, panelTabs),
      "Panel-scale discriminants are document class: reopening restores the last active tab or tool.",
    ).toBe("appearance");

    await expectNoDerivedStateForBranch(page, panelTabs, "geometry");
  });

  test("browser: persisted envelopes carry a version and migrate forward", async ({ page }) => {
    await seedPersistedEnvelope(page, modeField, {
      active: "fixed",
      branches: { fixed: "42" },
      version: 1,
    });

    await page.goto("/");

    const envelope = await readPersistedEnvelope(page, modeField);

    expect(
      typeof envelope?.version,
      "A persisted envelope must carry a version so migrations can gate on it.",
    ).toBe("number");
    expect(
      envelope?.branches?.["fixed"],
      "A forward migration must carry authored-inactive state across the version bump; losing it breaks retention across sessions.",
    ).toBe("42");
  });

  test("browser: a discriminant switch is its own undo entry", async ({ page }) => {
    await page.goto("/");

    await selectProjectionBranch(page, modeField, "fixed");
    await writeProjectionBranchValue(page, modeField, "fixed", "42");

    await selectProjectionBranch(page, modeField, "range");
    await writeProjectionBranchValue(page, modeField, "range", "7");

    const undo = page.getByRole("button", { name: "Undo" });

    // First undo reverses the edit, not the switch.
    await undo.click();
    expect(await readActiveBranchKey(page, modeField)).toBe("range");

    // Second undo reverses the switch, and retention makes it lossless.
    await undo.click();
    expect(await readActiveBranchKey(page, modeField)).toBe("fixed");
    expect(
      await readProjectionBranchValue(page, modeField, "fixed"),
      "Undoing a switch needs no snapshot: the branch state was never discarded.",
    ).toBe("42");
  });
});
