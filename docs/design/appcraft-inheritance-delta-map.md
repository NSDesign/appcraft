# Toolcraft → appcraft: Inheritance-and-Delta Map

**Status:** draft for review · **Date:** 2026-07-26

## Purpose

appcraft is an extension of Toolcraft's **agent methodology and app architecture**, not a
rewrite of its control library and not a control-authoring framework.

This map classifies every Toolcraft task route and enforcement mechanism so that
"we are extending Toolcraft" is a structural property of the plan rather than an
intention that has to be remembered.

## The two deltas

- **Δ1 — Architecture extension.** Toolcraft targets one canvas + one controls panel
  (+ optional timeline/layers). appcraft targets complex apps: multiple panels,
  master-detail, tabbed sections, cross-surface relationships, MVVM viewmodels.
  Δ1 is the irreducible custom core.
- **Δ2 — Dependency swap.** Astryx (+ StyleX, + other OSS, + thin custom built on
  Astryx primitives) replaces Toolcraft's home-rolled control library. Δ2 is
  mostly *subtractive* — it deletes custom code.

## Taxonomy

There is deliberately **no "inherit verbatim" category.** Every carried-over
mechanism must be re-derived and improved.

| Disposition | Meaning |
|---|---|
| **ADOPT+** | Mechanism carries over; rewritten for clarity or strengthened enforcement. Improvement is mandatory, not optional. |
| **EXTEND (Δ1)** | Architecture extension for complex apps. |
| **SWAP (Δ2)** | Dependency replaced with Astryx/OSS. |
| **ABSORB (Δ1)** | Toolcraft special case dissolves into the general projection primitive. Net code *reduction*. |
| **DELETE** | Mechanism no longer needed; obsoleted by a Δ2 choice. |
| **NEW** | Genuinely new; required because Δ1 opens design space that needs a matching checker. |

## Task routes

| Route | Disposition | Required rewrite / improvement |
|---|---|---|
| App assembly / composition | **EXTEND (Δ1)** | Composition surface becomes a declared **surface graph** (panels, regions, canvases) instead of a single controls panel. Preserve "declared, never hand-composed" as an invariant. |
| Reference study / audit / port | **ADOPT+** | Feature inventory extends to capture **relationships and projections**, not flat features. New mandatory field: does the reference *retain* state when a discriminant switches? Toolcraft never asks; the primitive depends on the answer. |
| Schema / defaults / persistence / actions | **EXTEND (Δ1)** | Schema gains variant fields, projection nodes, per-branch retention, and cross-surface actions. Persistence must serialise the retention envelope, not just the active value. |
| Control selection | **ADOPT+ / SWAP (Δ2)** | Selection *method* (group by product meaning, `appControlSectionInventory`) is kept and rewritten; the control *catalogue* becomes Astryx. |
| Custom controls | **ADOPT+ / SWAP (Δ2)** | Route already exists in Toolcraft. Substrate swaps to Astryx + StyleX + OSS. The compound/variant case (e.g. `StyledModeField`) becomes a **declared** field-scale projection instead of hand-rolled buffering/clamping/styling. |
| Renderer / canvas / visual technique | **ADOPT+** | Technique inventory and interaction-time animation suspension are kept. Fix Toolcraft's inconsistency: `renderer-technique-inventory` is levelled *default* where the same reasoning makes canvas-handles and layers *heuristic*. Re-derive levels from one consistent test. Light Δ1 only if an app needs multiple canvases/views. |
| Timeline / keyframes | **ABSORB (Δ1)** | Re-expressed as the projection primitive at collection scale (tracks = ordered keyed branches) rather than a bespoke feature. |
| Layers | **ABSORB (Δ1)** | Layers *are* the collection-scale primitive (list → detail, add/remove/reorder/filter). Bespoke in Toolcraft; a plain instance in appcraft. |
| Export / copy / media / background | **ADOPT+** | Protected export helpers + receipts kept. Export reads the **active projection only**; retained inactive branches must never leak into output. Light extension for multi-artifact export. |
| Debugging | **ADOPT+** | Method kept (failing test / repro before Plan docs). Failure catalogue extends: projection-graph cycles, cross-surface state desync, retention leaks into export. |
| Figma implementation | **ADOPT+ / SWAP (Δ2)** | Fidelity discipline kept verbatim in *spirit* (structure over appearance; never implement by eye). Two upgrades Toolcraft cannot do: Figma **variables/styles → StyleX theme tokens**, and Figma **component variants → declared variant fields** (Figma variants are already discriminant→projection, so a Figma file can seed the primitive). |

## Enforcement mechanisms

| Mechanism | Disposition | Required rewrite / improvement |
|---|---|---|
| Entry contract + preflight | **ADOPT+** | **Biggest improvement target.** Toolcraft's preflight has no independent verification — it is pure prompt engineering. appcraft adds an **attestable preflight**: a machine-checkable record (routes matched, docs read, tier chosen) written before edits, plus a checker asserting the record is consistent with the changed surface. Also: shrink and single-source docs so "one document per read" becomes natural rather than imposed. |
| Task routing table | **ADOPT+** | Rows added for the new architecture. Generate the table from a single route registry so `AGENTS.md` and `workflow.md` cannot drift. |
| Edit surface + signed integrity | **ADOPT+** | Mechanism kept. Signable surface now includes **swizzled Astryx source** (Astryx supports ejecting component source to own — directly compatible with source-in-repo signing). Replace filename-family blocklists for shadow configs with a check on the **resolved** build config. |
| Decision contract (taxonomy) | **ADOPT+ / EXTEND (Δ1)** | Keep invariant/default/heuristic/escape-hatch/recommendation. Improvement: **generate** the doc rule tables from the catalogue so drift is impossible rather than merely detected. Re-derive every level from one test — *checkable without product knowledge → invariant; requires product knowledge → heuristic*. Extend catalogue with Δ1 rules (retention invariant, projection-graph acyclicity, three-way field classification). Mine from observed failures, do not guess. |
| Import boundary (AST) | **ADOPT+** | Now guards the appcraft facade over the OSS state libraries. Improvement: replace the blunt `*Control`-suffix pattern match (false positives) with a **generated registry** of forbidden exports derived from the runtime's public API surface. |
| CSS style boundary | **DELETE (Δ2)** | StyleX compiles to atomic, scoped CSS; global-selector violations become structurally impossible. Whole checker removed. |
| Module dependency graph | **ADOPT+ / SWAP (Δ2)** | Keep the invariant (product modules acyclic); buy the implementation from dependency-cruiser + eslint-plugin-boundaries instead of a custom script. Retain Toolcraft's good behaviour: report the **shortest** cycle deterministically. |
| Projection graph acyclicity | **NEW (Δ1)** | The one genuinely new checker. Projection nodes may reference other nodes (a surface's visibility depending on another surface's discriminant); that reference graph must be acyclic. Mirrors the module-graph checker one level up. |
| Evidence / receipts | **ADOPT+** | Keep source-hash-bound receipts, the exactly-once runtime evidence marker, and restricted exemptions. Improvement: **dependency-scoped invalidation** — hash only the inputs that can affect a given verification domain, instead of the whole tree, so an unrelated edit does not void a valid perf receipt. |
| Verification tier classifier | **ADOPT+** | Keep pre-commitment (tier chosen before editing) and "blast radius, not line count; if uncertain go one tier higher, not to the full gate." Improvement: a tool **proposes** a tier from changed-file paths; the agent confirms or raises. Reduces guesswork and removes the retroactive-justification incentive entirely. |
| Worklog / decision trail | **ADOPT+** | Keep the gate. Improvement: **structured entries** (front-matter fields for request, decision, rejected alternatives, evidence, tier) so checks verify semantic completeness rather than "does this still look like the starter." |
| Skill fallback model | **ADOPT+ / SWAP (Δ2)** | Keep hash-locking and the rule that a missing skill is recorded, never silently skipped and never a reason to weaken verification. Astryx's own MCP/CLI becomes the control-layer doc source of truth, so appcraft authors *less* agent documentation. |

## What the map proves

1. **Δ1 unifies.** Layers, timeline tracks and the controls panel stop being three
   hand-built features and become three instances of one primitive. appcraft's
   architecture core is *simpler* than Toolcraft's despite being more capable —
   the primitive pays for itself by deleting special cases.
2. **Δ2 subtracts.** The Astryx swap removes the home-rolled control library *and*
   three chunks of custom enforcement (CSS boundary → StyleX; dependency-graph and
   import scripts → OSS linters; control docs → Astryx MCP). "Least custom code" is
   a structural consequence, not an aspiration.
3. **The custom core is one locus.** Roughly seven of eleven routes and five of
   twelve enforcement mechanisms carry over as improved methodology. Irreducible
   custom work concentrates in **Δ1: the projection primitive, the extended
   composition schema, and its one new checker.**

## Enforcement rollout (phased)

Enforcement is itself scale-invariant to rollout.

1. **Day one, near-free (OSS config):** dependency-cruiser + eslint-plugin-boundaries;
   StyleX (deletes the CSS checker); Vitest + Playwright; TS strict; editable-surface
   list in `AGENTS.md`. ~60% of Toolcraft's enforcement value, almost no custom code.
2. **Phase two, once 2–3 real apps exist:** decision-contract catalogue *mined from
   observed failures*; integrity signing (cheap, swizzle-compatible).
3. **Phase three, when agents do real verification work:** receipts, attestable
   preflight, tier classifier — most custom, most valuable, only meaningful once
   there is enough surface that skipping is tempting.

Rationale: Toolcraft's rules were mined from real failures across many generated
apps. Guessing invariants before watching agents break anything risks constraining
the wrong things. Earning them by evidence is also what both Toolcraft and Astryx
already practise.

## Scope litmus test

Before naming any specific control, library, or entity shape, ask:
**would a different app need something else here?**

- **Yes → it is a seam, not a feature.** It belongs in an app, or in an optional
  starter kit, consumed through the inherited custom-controls route. (Colour fails
  this test: a data-viz tool needs scales, not swatches.)
- **No → it is core.** (The projection primitive passes: every app needs it
  identically.)

## Decisions resolved

- **Layout — curated archetypes.** Confirmed. Master-detail region, tabbed section,
  canvas, inspector. Free-form declarative layout rejected; it breaks "declared,
  never hand-composed".
- **Timeline absorption — partial.** Confirmed with refinement. Track and key
  *structure* absorb into the collection-scale primitive; **playhead/transport does
  not** (it interpolates between two bracketing keys rather than selecting one
  branch, contradicting the primitive's semantics). Update the Timeline route from
  **ABSORB** to **ABSORB (structure) + ADOPT+ (transport)**.
- **Persistence — explicit versioned branches.** Confirmed. Serialised documents
  contain document + authored-inactive classes only; derived state never persists.

- **Panel-scale discriminant persistence — restore state.** Confirmed as an
  invariant: reopening an app restores the last active tab/tool. The discriminant
  persists; its derived state is still evicted and rebuilt.
- **Envelope version migrations — forward-only.** Confirmed.

## Open decisions

- **Range/multi-thumb slider:** confirm whether Astryx `Slider` supports it before
  widening any OSS footprint.
