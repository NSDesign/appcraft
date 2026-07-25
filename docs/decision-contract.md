# appcraft Decision Contract

Rule ids, levels, and enforcement expectations. `AGENTS.md` and this file must list
the same ids; `npm run check:docs` fails on drift.

## Levels

| Level | Meaning | Required handling |
|---|---|---|
| **invariant** | Cannot be violated | Follow it; a checker or test fails if broken |
| **default** | Normal choice | Use unless the spec proves a reason not to |
| **heuristic** | Product-dependent | Decide from product behaviour **and test the choice** |
| **escape-hatch** | Allowed exception | Explain why; add stronger coverage |
| **recommendation** | Style guidance | Follow unless product behaviour requires otherwise |

**How levels are derived** (one consistent test, fixing an inconsistency in
Toolcraft's catalogue): if the rule is checkable *without* product knowledge it is an
**invariant**; if evaluating it *requires* product knowledge it is a **heuristic**.

## Rules

[//]: # (appcraft-contract:decision-rule-list:start)

| Rule id | Level | Statement |
|---|---|---|
| `surfaces-declared-not-composed` | invariant | Product code declares surfaces; the framework owns composition, bootstrap, routes, and global styles. |
| `facade-owns-state` | invariant | All state reads and writes pass through the appcraft facade. Zod, Jotai, Immer must not leak into product code. |
| `kernel-dependency-free` | invariant | `src/appcraft/kernel` imports nothing from store, surfaces, controls, Astryx, Jotai, or React. |
| `retain-inactive-branches` | invariant | A discriminant switch never deletes another branch's document or authored-inactive fields. |
| `evict-derived-state` | invariant | Derived state is dropped for inactive branches and rebuilt on activation. It is never persisted. |
| `field-classification-required` | invariant | Every branch field is classified document, authored-inactive, or derived. |
| `export-active-projection-only` | invariant | Export reads the active projection. Retained inactive branches never appear in output. |
| `inactive-branches-not-validated` | invariant | An invalid inactive branch does not block a valid document. |
| `projection-graph-acyclic` | invariant | The projection reference graph contains no cycles. The shortest cycle is reported deterministically. |
| `panel-discriminant-persists` | invariant | Reopening an app restores the last active tab or tool. Derived state still rebuilds. |
| `envelope-versioned` | invariant | Persisted envelopes carry a `version`. Migrations are forward-only. |
| `undo-switch-separate-entry` | invariant | A discriminant switch is its own undo entry, separate from subsequent edits. |
| `app-agnostic-core` | invariant | Nothing in `src/appcraft` is specific to a single application. Apply the scope litmus test. |
| `layout-archetypes-only` | invariant | Surfaces compose from curated archetypes (master-detail, tabbed-section, canvas, inspector). Free-form declarative layout is not permitted. |
| `astryx-before-custom-control` | default | Use Astryx components before authoring a custom control. |
| `compound-controls-declared` | default | A compound or variant control is declared as a field-scale projection, not hand-rolled. |
| `buffer-commit-in-facade` | default | Buffering, clamping, and commit-on-release live in the binding facade, not in individual controls. |
| `transport-not-a-projection` | default | Playhead and transport evaluation is a derived sampler across branches, not a projection. Track and key structure are projections. |
| `figma-structure-source-of-truth` | invariant | When a Figma URL is supplied, read node, layer, component, variant, text, variable, style, and asset structure via MCP. Never implement from a screenshot or by eye. |
| `figma-variables-to-tokens` | default | Map Figma variables and styles onto StyleX theme tokens rather than literal values. |
| `verification-tier-preclassified` | invariant | Classify the verification tier before editing, by blast radius rather than line count. |
| `preflight-attested` | invariant | Write the preflight attestation before editing implementation files. |
| `worklog-decision-trail` | invariant | Maintain a decision trail. Prose is context, not execution proof. |
| `evidence-over-assertion` | invariant | Verification claims are backed by test or runtime output, never by source spelling or prose. |
| `collection-filter-scope` | heuristic | Whether a collection's filter state persists is product-dependent. Decide, then test. |
| `archetype-nesting-depth` | heuristic | How deeply archetypes nest is product-dependent. Decide, then test. |
| `custom-control-justified` | escape-hatch | Authoring a novel primitive instead of composing Astryx requires a written justification and stronger coverage. |

[//]: # (appcraft-contract:decision-rule-list:end)

## Notes

- The three `figma-*` and `transport-*` rules were added during design review; both
  correct mischaracterisations caught in analysis rather than in code.
- The catalogue is deliberately short. Phase two expands it from **observed
  failures**, not speculation.
