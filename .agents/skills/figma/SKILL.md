---
name: figma
description: Use when an appcraft task includes a Figma URL, node ID, or design-to-code requirement.
---

# appcraft Figma Workflow

Use this skill when the user supplies a Figma URL or node ID, or asks to implement or
match a Figma design.

## Process

1. Inspect the Figma file through the available Figma MCP or design context tooling.
2. Read the actual nodes, layers, components, **component variants**, variables,
   styles, assets, and layout structure.
3. Translate structure into appcraft declarations:
   - Figma **variables and styles** → StyleX theme tokens, not literal values.
   - Figma **component variants** → declared variant fields. A Figma variant set is
     already a discriminant selecting a projection, so the file seeds the primitive
     directly; read the variant properties as the discriminant and each combination
     as a branch.
   - Figma **frames and sections** → surface archetypes (master-detail,
     tabbed-section, canvas, inspector), never hand-composed layout.
4. Use screenshots for final visual QA only, never as the source of truth.

## appcraft Rule

Do not implement a Figma task from a screenshot or by eye when Figma context is
available (`figma-structure-source-of-truth`). Structure over appearance: matching
pixels while inventing the underlying relationships produces a design that cannot be
maintained and a projection model that does not match what the designer expressed.

If the Figma MCP is unavailable, record that in the worklog and stop — a missing tool
is recorded, never silently worked around and never a reason to weaken verification.
