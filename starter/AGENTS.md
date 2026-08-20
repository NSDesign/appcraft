# appcraft App Contract

Treat this `AGENTS.md` as the active project contract. This folder is an
**application built with appcraft**, not the framework itself. The framework is
`@nsdesign/appcraft-core`; you consume it, you do not edit it.

appcraft is not a control library and not a control-authoring framework. Controls
come from [Astryx](https://astryx.atmeta.com) and StyleX; custom controls are one
route among many.

## The spine

> A **discriminant** selects an **active projection**. Inactive branches retain their
> authored state. Derived state is materialised only for the active branch.

One primitive at four scales — field, collection, panel, viewmodel. A variant
control, a layer list, a master-detail panel and a per-mode viewmodel are the same
mechanism. Before inventing a mechanism for a relationship, check whether the
primitive already covers it.

## Required preflight

Before planning or editing:

1. Read this contract in full.
2. Select every task route below that matches what you are being asked to build.
3. Read each matched route's Plan documents **before** writing a spec or plan.
4. Read Implementation documents **immediately before** editing code.
5. Read Verification documents **immediately before** writing or running proof.
6. Write a preflight attestation into `docs/agent-worklog.md` **before** editing.

Open exactly one listed document per read. Never continue from truncated output.

## Task routing

Generated from the appcraft route registry. Editing this table has no effect.

<!-- appcraft:routes:start -->
<!-- Generated from the appcraft route registry (docs/routes.json). Do not edit by hand. -->

| Route id | Fires on | Scale | Plan | Implementation | Verification |
|---|---|---|---|---|---|
| `app-assembly` | "build an app that…", adding or wiring a surface | panel | docs/appcraft/assembly-workflow.md | docs/appcraft/schema-reference.md | docs/appcraft/verification.md |
| `style-guide` | base style properties, theme tokens, typography, colour | — | docs/appcraft/style-guide.md | docs/appcraft/style-guide.md | npm run check:style-guide |
| `reference-study` | "port this", "match this tool" — audit before building | — | docs/appcraft/reference-study.md | docs/appcraft/schema-reference.md | docs/appcraft/verification.md |
| `app-schema` | entities, fields, variants, defaults, persistence | field | docs/appcraft/schema-reference.md | docs/appcraft/schema-reference.md | docs/appcraft/verification.md |
| `control-selection` | choosing Astryx components for a section | field | docs/appcraft/control-selection.md | docs/appcraft/control-selection.md | docs/appcraft/verification.md |
| `custom-control` | a control Astryx does not cover — colour, creative primitives | field | docs/appcraft/custom-controls.md | docs/appcraft/custom-controls.md | docs/appcraft/verification.md |
| `collections` | layers, lists, ordering, filtering | collection | docs/appcraft/collections.md | docs/appcraft/collections.md | docs/appcraft/verification.md |
| `timeline` | tracks and keys (projection); transport (derived sampler) | collection | docs/appcraft/timeline.md | docs/appcraft/timeline.md | docs/appcraft/verification.md |
| `renderer` | canvas output, visual technique, interaction-time animation | — | docs/appcraft/renderer-technique.md | docs/appcraft/renderer-technique.md | docs/appcraft/performance.md |
| `export` | copy, download, media, background, multi-artifact output | — | docs/appcraft/setup-export.md | docs/appcraft/setup-export.md | docs/appcraft/verification.md |
| `figma-implementation` | building or matching a design from Figma context | — | docs/appcraft/figma.md | docs/appcraft/figma.md | docs/appcraft/verification.md |
| `debugging` | any failure: test, build, visual, retention, export | — | docs/appcraft/debugging.md | docs/appcraft/debugging.md | docs/appcraft/verification.md |

<!-- appcraft:routes:end -->

Use the smallest route set covering the work.

**Style guide comes first.** On the first build request, the `style-guide` route runs
before implementation: you are asked for the app's base style properties — base theme,
accent colour, neutral temperature, contrast, base/heading/body typefaces, base size
and scale ratio, corner radius — and every answer may be left at its default. Heading
and body typefaces inherit the base unless set.

Offer `tools/style-guide/index.html` first: it previews the choice on a live specimen
of the archetypes and emits the theme. Asking in conversation is the fallback.

The answers become `src/app/theme.ts` and `docs/style-guide.md`, which records **every**
property including those left at default, plus the Astryx version they were chosen
against. `npm run check:style-guide` fails on an incomplete record. Do not pick a
palette or a typeface on the user's behalf without asking.

## Invariants

1. **Surfaces are declared, never hand-composed.** Supply a declaration; the
   framework owns composition, bootstrap, routing, and global styles.
2. **State passes through the appcraft facade.** Zod, Jotai and Immer are
   implementation details beneath it and must not appear in app code.
3. **Inactive branches retain authored state.** A discriminant switch never deletes
   another branch's document or authored-inactive fields.
4. **Derived state is evicted for inactive branches** and rebuilt on activation.
   It is never persisted.
5. **Export reads the active projection only.**
6. **Inactive branches never gate validation.**
7. **The projection reference graph is acyclic.**
8. **Panel-scale discriminants persist.** Reopening restores the last active tab or
   tool; derived state still rebuilds.
9. **Theme tokens, not literals.** App code reads Astryx tokens; it does not hard-code
   colour, font-family or font-size values.

## Layout

Compose from curated archetypes only: `master-detail`, `tabbed-section`, `canvas`,
`inspector`. Free-form declarative layout is not permitted — it reopens the design
space the archetypes exist to close.

## Verification

Classify the tier **before** editing, by blast radius rather than line count. If
uncertain, go one tier higher rather than straight to the full gate.

| Tier | Trigger | Required |
|---|---|---|
| 0 | Docs and comments only | Targeted typecheck |
| 1 | A single control or surface's visual state | Targeted unit test |
| 2 | Schema, bindings, persistence behaviour | `npm run verify:quick` |
| 3 | Projections, retention, eviction | `verify:quick` + retention and eviction suites |
| 4 | Public surfaces, architecture, dependencies, release | `npm run verify:final` |

`e2e/` proves what no unit test can: that the surface bound to a branch shows the
retained value, that derived output rebuilds rather than persists, and that a reload
restores the discriminant. A skipped suite is reported as skipped and recorded in the
attestation's `skip` list — it is never counted as coverage.

## Worklog

`docs/agent-worklog.md` carries the decision trail. Each entry names the user-visible
result, the contract rules applied, rejected alternatives, evidence, and remaining
risks. **Prose is context, not execution proof** — a verification claim cites the
command that produced it.

`npm run check:contract` enforces this — preflight attestation, decision trail, style
guide record, projection graph — and it is **dormant while the worklog says
`Mode: starter`**. A scaffold nobody has worked on has nothing to attest. Replace that
line with `Mode: product` when the first product pass begins; from then on every pass
must attest before editing and record its decision before the gate will pass.
