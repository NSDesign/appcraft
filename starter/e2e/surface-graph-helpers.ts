/**
 * Surface-graph helpers.
 *
 * Toolcraft targets one canvas and one controls panel, so its browser helpers guard
 * a single surface: keep app UI out of the canvas. appcraft targets a graph of
 * surfaces, so the equivalent guard is structural — every rendered surface must be a
 * declared archetype instance, and the graph they form must be a tree of archetypes
 * rather than markup someone composed by hand.
 */
import { expect, type Page } from "@playwright/test";

import { appcraftArchetypes, appcraftDom, type AppcraftArchetype } from "./appcraft-fixture";

export type SurfaceNode = {
  archetype: string;
  /** Archetype of the nearest enclosing surface, or undefined at the root. */
  parentArchetype: string | undefined;
  /** Depth from the root surface, used for the archetype-nesting heuristic. */
  depth: number;
  /** `data-appcraft-surface` value: the surface id from the declaration. */
  id: string;
  /** Projection paths this surface renders, if any. */
  projections: string[];
};

/** Read the rendered surface graph through the declared DOM contract. */
export async function readSurfaceGraph(page: Page): Promise<SurfaceNode[]> {
  await expect(
    page.locator(appcraftDom.surface).first(),
    "The fixture must render at least one declared surface.",
  ).toBeVisible();

  return page.locator(appcraftDom.surface).evaluateAll((nodes) =>
    nodes.map((node) => {
      const parent = node.parentElement?.closest("[data-appcraft-surface]") ?? undefined;

      let depth = 0;
      let ancestor = parent;
      while (ancestor) {
        depth += 1;
        ancestor = ancestor.parentElement?.closest("[data-appcraft-surface]") ?? undefined;
      }

      return {
        archetype: node.getAttribute("data-appcraft-archetype") ?? "",
        depth,
        id: node.getAttribute("data-appcraft-surface") ?? "",
        parentArchetype: parent?.getAttribute("data-appcraft-archetype") ?? undefined,
        projections: Array.from(node.querySelectorAll("[data-appcraft-projection]"))
          .filter((projection) => projection.closest("[data-appcraft-surface]") === node)
          .map((projection) => projection.getAttribute("data-appcraft-projection") ?? ""),
      };
    }),
  );
}

/**
 * Assert every surface instantiates a curated archetype and carries a declaration
 * id. A surface with no archetype is hand-composed markup wearing a surface
 * attribute, which is the failure `layout-archetypes-only` exists to catch.
 */
export async function expectDeclaredArchetypesOnly(page: Page): Promise<void> {
  const graph = await readSurfaceGraph(page);
  const allowed: readonly string[] = appcraftArchetypes;

  const undeclared = graph.filter((surface) => !allowed.includes(surface.archetype));

  expect(
    undeclared.map((surface) => `${surface.id || "<unnamed>"}: ${surface.archetype || "<none>"}`),
    `Surfaces compose from curated archetypes only (${allowed.join(", ")}). Free-form declarative layout is not permitted.`,
  ).toEqual([]);

  const unnamed = graph.filter((surface) => surface.id.trim() === "");

  expect(
    unnamed.length,
    "Every surface must carry its declaration id; an anonymous surface cannot be traced back to the declaration that produced it.",
  ).toBe(0);
}

/**
 * Assert an archetype instance is present, optionally as a child of another. Used
 * by the master-detail coverage, where the relationship is the point: one surface
 * supplies the discriminant, another projects the active branch.
 */
export async function expectArchetypeInstance(
  page: Page,
  archetype: AppcraftArchetype,
  options: { within?: AppcraftArchetype } = {},
): Promise<SurfaceNode> {
  const graph = await readSurfaceGraph(page);
  const candidates = graph.filter((surface) => surface.archetype === archetype);

  expect(
    candidates.length,
    `Expected a "${archetype}" surface in the rendered graph.`,
  ).toBeGreaterThan(0);

  if (options.within === undefined) {
    const first = candidates[0];
    if (!first) {
      throw new Error(`No "${archetype}" surface after a non-empty candidate check.`);
    }
    return first;
  }

  const nested = candidates.find((surface) => surface.parentArchetype === options.within);

  expect(
    nested,
    `Expected a "${archetype}" surface nested inside a "${options.within}" surface.`,
  ).toBeDefined();

  if (!nested) {
    throw new Error(`No "${archetype}" surface inside "${options.within}".`);
  }

  return nested;
}

/**
 * Product output is the only text a canvas surface may contain. Kept from
 * Toolcraft's canvas discipline, generalised to any canvas archetype in the graph.
 */
export async function expectNoAppUiInCanvasSurfaces(page: Page): Promise<void> {
  const canvases = page.locator('[data-appcraft-surface][data-appcraft-archetype="canvas"]');

  await expect(
    canvases.locator(
      ["button", "input", "textarea", "select", '[role="button"]', '[role="menu"]', '[role="dialog"]'].join(
        ", ",
      ),
    ),
    "A canvas surface renders product output; controls belong to inspector or tabbed-section surfaces.",
  ).toHaveCount(0);

  const unclassified = await canvases.evaluateAll((roots, productOutputSelector) => {
    const found: string[] = [];

    for (const root of roots) {
      for (const element of [root, ...Array.from(root.querySelectorAll("*"))]) {
        const directText = Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent?.trim() ?? "")
          .filter(Boolean)
          .join(" ")
          .trim();

        if (directText && !element.closest(productOutputSelector)) {
          found.push(directText);
        }
      }
    }

    return found;
  }, appcraftDom.productOutput);

  expect(
    unclassified,
    `Canvas text must be product output marked with ${appcraftDom.productOutput}; app copy, CTAs, and helper text are forbidden.`,
  ).toEqual([]);
}
