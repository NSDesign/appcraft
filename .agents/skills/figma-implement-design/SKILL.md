---
name: figma-implement-design
description: Use to translate inspected Figma structure into a production-ready appcraft application.
---

# appcraft Figma Implementation

Use this skill after Figma context has been inspected and the task is to build or
update an appcraft application from that design.

## Process

1. Map Figma sections, components, and visual entities onto the surface graph, then
   onto schema paths and bindings — not onto hand-written layout.
2. Compose from curated archetypes only: `master-detail`, `tabbed-section`,
   `canvas`, `inspector` (`layout-archetypes-only`).
3. Use **Astryx** components before authoring anything custom. Astryx ships no colour
   components, so creative and colour controls compose React Aria or thin custom
   built on Astryx primitives — and only where the design actually requires them.
4. Turn each Figma variant set into a declared field-scale projection with retained
   branches, rather than a hand-rolled compound control with its own buffering,
   clamping, and styling.
5. Keep application UI out of product output surfaces; render product output there
   only.
6. Add unit and `e2e` coverage for every visible entity and every projection the
   design introduces.

## appcraft Rule

Build through the declared composition — `defineAppcraft({ schema, surfaces, layout,
bindings, actions })`. Do not recreate panels, regions, inspectors, tab bars, or
collection lists by hand: surfaces are declared, never hand-composed
(`surfaces-declared-not-composed`).

Nothing entering `packages/core/src` may be specific to the app being built. Apply the
scope litmus test to every extraction — if a different app would need something else
there, it belongs to the app or to an optional starter kit, consumed through the
controls route.
