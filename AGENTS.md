# appcraft — Framework Repository Contract

Treat this `AGENTS.md` as the active project contract. This repository contains the
**appcraft framework itself**, not a generated app.

appcraft extends Toolcraft's agent methodology and app architecture to complex
applications. It is **not** a control library and **not** a control-authoring
framework. Two deltas define it:

- **Δ1 — architecture extension.** Multiple surfaces, master-detail, tabbed
  sections, the discriminant→projection primitive at four scales, MVVM viewmodels.
  This is the irreducible custom core.
- **Δ2 — dependency swap.** Astryx + StyleX + OSS replace a home-rolled control
  library. Mostly subtractive.

## Required preflight

Before planning or editing kernel, schema, store, surfaces, controls, enforcement,
or docs:

1. Read `docs/design/appcraft-core-architecture.md` in full.
2. Read `docs/decision-contract.md`.
3. Select every task route in the routing table below that matches the surface you
   intend to change.
4. Read each matched route's Plan documents **before** writing a spec or plan.
5. Read Implementation documents **immediately before** editing code.
6. Read Verification documents **immediately before** writing or running proof.
7. Write a preflight attestation (below) **before** editing implementation files.

Open exactly one listed document per tool or terminal read. Do not concatenate
documents, routes, or phases into a single output. Never continue from truncated
output — finish the read, then proceed.

Do not edit implementation files until the preflight is complete and attested.

## Preflight attestation (improvement over Toolcraft)

Toolcraft's preflight has no independent verification; it relies on instruction
following alone. appcraft makes it checkable.

Before editing, append to `docs/agent-worklog.md`:

```yaml
- pass: <short name>
  routes: [<route ids matched>]
  docs_read: [<paths>]
  tier: <0-4>
  tier_reason: <changed surface and expected blast radius>
  run: [<commands and browser checks>]
  skip: [<checks not needed this pass, and why>]
```

`npm run check:preflight` asserts that the most recent attestation exists, names a
tier, and that its `routes` are consistent with the files actually changed. A
mismatch fails.

## Task routing

| Route id | Surface | Plan | Implementation | Verification |
|---|---|---|---|---|
| `kernel` | projection envelope, retention, eviction | `docs/design/appcraft-core-architecture.md` §1–5 | `docs/decision-contract.md` | `docs/verification.md` |
| `schema` | composition schema, Zod integration, bindings | core-architecture §2, §7 | `docs/decision-contract.md` | `docs/verification.md` |
| `store` | Jotai facade, undo grouping, persistence | core-architecture §2, §6 | `docs/decision-contract.md` | `docs/verification.md` |
| `surfaces` | archetypes, layout, master-detail, tabs | core-architecture §7 | `docs/decision-contract.md` | `docs/verification.md` |
| `controls` | Astryx binding layer, compound/variant controls | core-architecture §6 | `docs/decision-contract.md` | `docs/verification.md` |
| `enforcement` | checkers, boundaries, receipts | `docs/design/appcraft-inheritance-delta-map.md` | `docs/decision-contract.md` | `docs/verification.md` |
| `docs` | contract and design documents | — | — | `npm run check:docs` |

Use the smallest route set covering the changed surface.

## Architecture invariants

1. **Surfaces are declared, never hand-composed.** Product code supplies a
   declaration; the framework owns composition, bootstrap, and global styles.
2. **The retention envelope is appcraft-owned.** All reads and writes pass through
   the appcraft facade. Zod, Jotai and Immer are implementation details beneath it
   and must not leak into product code.
3. **Inactive branches retain authored state.** A discriminant switch never deletes
   another branch's document or authored-inactive fields.
4. **Derived state is evicted for inactive branches** and rebuilt on activation.
   It is never persisted.
5. **Export reads the active projection only.** Retained inactive branches must
   never appear in output.
6. **Inactive branches never gate validation.** An invalid inactive branch does not
   block a valid document.
7. **The projection reference graph is acyclic.** Checked by
   `npm run check:projection-graph` — a different graph from the module graph
   `check:boundaries` covers, and a repository can pass one and fail the other. The
   extractor that reads projection nodes out of a declared schema lands with the
   schema route; until then the checker reports that it has no input rather than
   passing on an empty graph.
8. **Panel-scale discriminants persist.** Reopening an app restores the last active
   tab/tool; derived state still rebuilds.
9. **The kernel has no dependencies.** `src/appcraft/kernel` must not import the
   store, surfaces, controls, Astryx, Jotai, or React.

## Scope litmus test

Before naming any specific control, library, or entity shape, ask: **would a
different app need something else here?**

- **Yes → it is a seam, not a feature.** It belongs to an app or an optional starter
  kit, consumed through the controls route. Colour pickers fail this test: a
  data-visualisation tool needs scales, not swatches.
- **No → it is core.** The projection primitive passes: every app needs it
  identically.

Nothing in `src/appcraft` may be specific to any single application. ShapeStudio and
similar apps are test fixtures that exercise the framework, never sources of core
requirements.

## Repository structure

```
src/appcraft/kernel/     projection envelope + operations (dependency-free)
src/appcraft/schema/     composition schema, Zod variant integration
src/appcraft/store/      Jotai facade, undo grouping, persistence
src/appcraft/surfaces/   layout archetypes
src/appcraft/controls/   Astryx binding layer
src/app/                 demo/fixture app surface
e2e/                     Playwright suite, acceptance matrix, DOM contract
.agents/skills/          workflow skills, content-locked by skills-lock.json
docs/design/             authoritative design documents
docs/                    contract, decision contract, verification, worklog
scripts/                 checkers
```

Boundary rules are enforced by `dependency-cruiser` and `eslint-plugin-boundaries`;
see `.dependency-cruiser.cjs` and `eslint.config.js`. `e2e` observes behaviour through
the DOM contract in `e2e/appcraft-fixture.ts` and is forbidden from importing
framework internals.

## Skills

`.agents/skills` carries the workflow skills. `npm run check:skills` verifies each is
present and matches its hash in `skills-lock.json`; re-lock deliberately with
`npm run skills:lock` and say so in the worklog. A missing skill is recorded in the
attestation's `skip` list — never silently skipped, and never a reason to lower a
verification tier.

Load `projection-modeling` before any change to a discriminant, a branch, or a field
inside a branch. It is the Δ1 skill, and Δ1 is where mistakes are silent rather than
loud.

## Verification tiers

Classify every pass **before** editing. Choose by blast radius, not line count. If
uncertain, move one tier higher — not automatically to the full gate.

| Tier | Trigger | Required |
|---|---|---|
| 0 | Docs and comments only | Targeted typecheck |
| 1 | Single control or surface visual state | Targeted unit test |
| 2 | Schema, bindings, persistence behaviour | `npm run verify:quick` |
| 3 | Kernel, retention, eviction, projection graph | `verify:quick` + retention and eviction suites |
| 4 | Public API, architecture, dependencies, release | Full gate: `npm run verify:final` |

Retention, eviction, export scope, validation scope, and panel-discriminant
persistence are **session-observable**: a unit test proves the kernel semantics, and
only `npm run test:browser` proves the surface bound to a branch behaves that way. The
acceptance matrix in `e2e/appcraft-acceptance.ts` records which layer discharges which
invariant, and `docs/verification.md` explains what each layer can and cannot prove.

The browser suite skips its fixture-dependent specs until `src/app` renders a surface
graph. A skipped suite is reported as skipped and belongs in the attestation's `skip`
list; it is never counted as coverage.

## Worklog gate

`docs/agent-worklog.md` must carry a decision trail. Each entry names the
user-visible result, the contract rules applied, rejected alternatives, evidence,
and remaining risks. Prose is context, not execution proof — verification claims
must be backed by test output.

`npm run check:worklog` enforces this on the **most recent** entry: all five fields
present, Evidence naming the command that produced it (or stating plainly that the
pass produced none), and every cited rule id existing in `docs/decision-contract.md`.
Earlier entries are history and are not re-checked — a later rule rename must not
retroactively invalidate a pass that was honest when written.
`npm run check:preflight` separately fails while the worklog still declares the seed
state.

## Enforcement rollout

Phase one (now): TypeScript strict, ESLint boundaries, dependency-cruiser, Vitest,
Playwright with a checked acceptance matrix, content-locked skills, and StyleX (which
makes global-selector violations structurally impossible and removes the need for a
CSS boundary checker).

Phase two (after 2–3 real apps): decision-contract catalogue expanded from observed
failures; integrity signing of framework surfaces.

Phase three (when agents perform real verification): source-hash-bound receipts with
dependency-scoped invalidation, automated tier proposal, Playwright acceptance.

Rules are earned by evidence, not guessed in advance.
