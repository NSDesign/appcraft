# Figma Implementation

## Structure is the source of truth

Read the file through the Figma MCP or design-context tooling: nodes, layers,
components, **component variants**, variables, styles, assets, layout. Never implement
from a screenshot or by eye when that context is available
(`figma-structure-source-of-truth`).

If the tooling is unavailable, record that in the worklog and stop. A missing tool is
recorded, never silently worked around.

## The three mappings

| Figma | appcraft |
|---|---|
| Variables and styles | StyleX theme tokens, not literal values (`figma-variables-to-tokens`) |
| **Component variants** | Declared variant fields |
| Frames and sections | Surface archetypes |

The middle row is the one worth pausing on. **A Figma variant set is already a
discriminant selecting a projection.** The variant properties are the discriminant;
each combination is a branch. A Figma file can therefore seed the primitive directly —
read the variants and you have the projection model the designer already expressed.

## Fidelity

Match structure, then appearance. Matching pixels while inventing the underlying
relationships produces a design that cannot be maintained and a projection model that
does not match what the designer meant.

Screenshots are for final visual QA only.
