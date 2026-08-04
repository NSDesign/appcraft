/**
 * Surface-graph composition.
 *
 * Δ1's expressive claim is that master-detail, tabbed sections, layer lists and
 * inspectors are one primitive at different scales rather than four features. The
 * matching risk is that an author reaches past the declaration and composes a panel
 * by hand, at which point the primitive stops being enforced and the invariants
 * above it stop being checkable. These tests assert the declaration is what
 * rendered.
 */
import { expect, test } from "@playwright/test";

import { fixtureSuiteTitle, hasFixtureApp } from "./appcraft-fixture";
import { readActiveBranchKey, selectProjectionBranch } from "./projection-observable-helpers";
import {
  expectArchetypeInstance,
  expectDeclaredArchetypesOnly,
  expectNoAppUiInCanvasSurfaces,
  readSurfaceGraph,
} from "./surface-graph-helpers";

const fixtureSuite: (title: string, body: () => void) => void = hasFixtureApp()
  ? test.describe
  : test.describe.skip;

const layerCollection = { path: "document.layers" };

fixtureSuite(fixtureSuiteTitle("surface composition"), () => {
  test("browser: every rendered surface is a declared archetype instance", async ({ page }) => {
    await page.goto("/");

    await expectDeclaredArchetypesOnly(page);

    const graph = await readSurfaceGraph(page);
    const ids = graph.map((surface) => surface.id);

    expect(
      ids.filter((id, index) => ids.indexOf(id) !== index),
      "Surface ids come from the declaration and must be unique; duplicates mean a surface was rendered twice rather than declared twice.",
    ).toEqual([]);
  });

  test("browser: master-detail projects the branch selected by its master surface", async ({
    page,
  }) => {
    await page.goto("/");

    const masterDetail = await expectArchetypeInstance(page, "master-detail");

    expect(
      masterDetail.projections,
      "A master-detail surface must render the projection whose discriminant its master region supplies.",
    ).toContain(layerCollection.path);

    await selectProjectionBranch(page, layerCollection, "layer-2");

    expect(
      await readActiveBranchKey(page, layerCollection),
      "Selecting in the master region must change which branch the detail region projects — the panel-scale form of the same primitive.",
    ).toBe("layer-2");
  });

  test("browser: canvas surfaces render product output without app UI", async ({ page }) => {
    await page.goto("/");

    await expectArchetypeInstance(page, "canvas");
    await expectNoAppUiInCanvasSurfaces(page);
  });
});
