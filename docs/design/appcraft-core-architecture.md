# appcraft Core Architecture — Δ1

**Status:** draft for review · **Date:** 2026-07-26
**Scope:** the projection kernel and the extended composition schema. This is
appcraft's irreducible custom core; everything else is adopted methodology (Δ1
context) or OSS dependency (Δ2).

## 1. The spine

One primitive, at four scales:

> A **discriminant** selects an **active projection**. Inactive branches retain
> their own authored state. Derived state is materialised only for the active
> branch.

| Scale | Discriminant | Branches | Toolcraft equivalent |
|---|---|---|---|
| **Field** | variant tag (`kind`) | variant payloads | hand-rolled compound (`StyledModeField`) |
| **Collection** | selected item id | per-item detail state | layers, timeline tracks (bespoke) |
| **Panel** | active tab / active tool | per-tab / per-tool panel state | none — single panel only |
| **Viewmodel** | app mode / route | per-mode derived viewmodel graph | none |

Absorbing layers and timeline into this primitive means the core is *smaller* than
Toolcraft's while covering more.

## 2. The envelope / value split

The most important structural decision. Two distinct things must not be conflated:

- **The active value** — typed and validated by Zod `discriminatedUnion`. This is
  what app logic reads, what export serialises, what validation gates on.
- **The retention envelope** — appcraft-owned. Holds the discriminant plus every
  retained branch. This is what persists and what undo/redo tracks.

```ts
// appcraft-owned. Signable, checkable, library-agnostic.
interface Projection<K extends string, S> {
  active: K;
  branches: Partial<Record<K, S>>;   // retained; lazily initialised
  order?: K[];                       // open projections only (see §4)
}
```

Two consequences that fall out and are easy to get wrong:

1. **Inactive branches are exempt from validation.** If a range variant holds an
   invalid min/max while the field is in fixed mode, the document is still valid.
   Zod validates only the active variant — which is correct, and is *why* retained
   state must live in the envelope rather than inside the validated value.
2. **Export reads the active projection only.** Retained inactive branches must
   never leak into output. This becomes an invariant with a checker.

The envelope being appcraft-owned is what preserves enforceability: Zod, Jotai and
Immer stay implementation details *underneath* the facade, and appcraft's checkers
assert against the envelope, not against third-party internals.

## 3. Three-way field classification

Every field in a branch is tagged. The kernel's behaviour is identical at all four
scales; only the annotation differs per field.

| Class | Retained when inactive? | Persisted? | Example |
|---|---|---|---|
| **document** | yes | yes | committed geometry, active style values |
| **authored-inactive** | yes | yes | the fixed-mode value you typed before switching to range mode |
| **derived / presentational** | **no — evicted** | no | tessellation caches, preview renders, buffered drag values, per-branch undo depth, scroll position, which sub-tab was open |

This is the single documented refinement to strict "retain everything", and it
**preserves scale invariance** because it is a *per-field* classification, not a
per-scale mechanism. The projection engine always retains the first two classes and
always evicts the third — identically at field, collection, panel and viewmodel
scale.

Why it matters at scale: a 500-entity collection retaining document +
authored-inactive state costs low single-digit MB (trivial, and it *is* the
document). Retaining 500 sets of derived caches costs gigabytes. Eviction is also
simply the correct architecture for a canvas app — you never want 500 live preview
surfaces — so the rule is not a compromise.

Note the separation: entities still **render** from document data. Only the
heavyweight *edit-time* projection is lazy.

## 4. Closed vs open projections

Two kinds, distinguished by where branch keys come from:

- **Closed** — key set fixed by the schema. Field variants, panel tabs.
  Add/remove is meaningless; `order` unused.
- **Open** — key set comes from data. Collections. Adds `order`, plus
  add / remove / reorder / filter operations.

Same envelope, same read/write/select semantics, different key provenance. This is
the only structural addition needed to cover collections, and it is why
`splitAtom`-style keyed collections map cleanly onto the primitive.

## 5. Kernel operations

```
select(key)            // set active; never deletes other branches
readActive()           // branches[active] ?? init(active)
writeActive(patch)     // write into the active branch only
materialise(key)       // build derived state for a branch on activation
evictDerived(key)      // drop derived fields when a branch deactivates
// open projections only:
add(key, init) / remove(key) / reorder(order) / filter(predicate)
```

Retention is not a feature — it falls out of `select` never deleting. That part is
genuinely small (tens of lines). The cost is in the surrounding integration:
schema-driven lazy init, nested composition, persistence format, undo grouping, and
binding to controls. Realistically a few hundred lines of owned, tested code —
which is the correct place to spend, since it is exactly the part no library
provides.

**Why not XState:** history states would replace only the cheap kernel, leave all
the expensive integration untouched, add bridging work to the store and controls,
and put the spine inside a dependency that cannot be signed or checked.

## 6. Substrate (Δ2)

| Concern | Choice |
|---|---|
| Active-value typing + validation | **Zod** `discriminatedUnion` |
| Reactive store, derived graph, keyed collections, persistence | **Jotai** (`atomFamily`, `splitAtom`, `atomWithStorage`) |
| Undo/redo + history grouping | **Immer** patches + `jotai-history` |
| Controls / primitives / tokens / theming / a11y | **Astryx** + StyleX |
| Creative controls | built on Astryx primitives; OSS recipes optional per app |

Rejected: MobX-State-Tree (too opinionated), Zustand (Jotai fits the graph better;
do not run both), TanStack Form / RHF (only if genuine validation-heavy forms appear
— `splitAtom` covers canvas collections with one paradigm instead of two).

## 7. Extended composition schema

Toolcraft: one canvas + one controls panel, product supplies
`ToolcraftAppComposition`. appcraft generalises to a declared **surface graph**
while keeping the non-negotiable invariant: **surfaces are declared, never
hand-composed.**

```
defineAppcraft({
  schema,      // document schema, including projection nodes
  surfaces,    // panels, regions, canvases, inspectors — declared
  layout,      // archetype composition (see open decision)
  bindings,    // surface ↔ schema path, incl. discriminant sources
  actions,     // cross-surface commands
})
```

Master-detail is not a new mechanism: it is the primitive at **panel scale**, where
one surface supplies the discriminant and another projects the active branch. Tabbed
sections are a closed projection at panel scale. Layers and timeline tracks are open
projections at collection scale.

**Recommendation — curated archetypes, not free-form layout.** Authors pick
`master-detail`, `tabbed-section`, `canvas`, `inspector` and configure them. Fully
data-driven layout is maximally expressive but reopens the design space that
Toolcraft's quality depends on closing. Archetypes preserve "declared, never
hand-composed."

## 8. New enforcement (Δ1)

Every new expressive capability needs a matching checker.

| Invariant | Checker |
|---|---|
| Projection reference graph is acyclic | **NEW** — mirrors the module dependency-graph checker one level up. Report the shortest cycle deterministically. |
| Inactive branches retain authored state | Unit + acceptance: switch discriminant away and back, assert value survives. |
| Derived state evicted on deactivation | Assert no derived cache retained for inactive branches. |
| Export reads active projection only | Assert retained inactive branches never appear in output. |
| Inactive branches never gate validation | Assert an invalid inactive branch does not block a valid document. |

## 9. Build order

Commit to the unified primitive as a concept; build it one scale at a time. Staged
validation, not fragmented abstraction.

1. **Field scale** — smallest surface to prove the envelope, the retention rule, the
   three-way classification, and the checker. Validate against a re-declared
   `StyledModeField` (which, notably, currently *violates* the retention rule by
   resetting on mode change — appcraft fixes it).
2. **Collection scale** — add `order` + add/remove/reorder/filter. Validate by
   absorbing layers.
3. **Panel scale** — surface graph + archetypes. Validate with master-detail and
   tabbed sections.
4. **Viewmodel scale** — derived viewmodel graph per mode.

## 10. Resolved decisions

**Layout — curated archetypes. Confirmed.** Authors pick `master-detail`,
`tabbed-section`, `canvas`, `inspector` and configure them. Free-form declarative
layout is rejected: it reopens the design space that Toolcraft's quality depends on
closing, and breaks "declared, never hand-composed".

**Undo across a discriminant switch — two entries. Confirmed.** A switch is its own
undo entry; subsequent edits are separate entries. This composes well with
retention: undoing a switch restores the discriminant, and the branch state is
already intact, so no snapshot is required. Retention makes undo of a switch
lossless and cheap.

**Keyframes — structure yes, transport no.** Refined during review:

- Track list → open projection at collection scale. ✔
- Keys within a track → open projection at collection scale (select a key, edit its
  value and easing in a detail surface). ✔
- **Playhead / transport → NOT the primitive.** A playhead does not *select* a
  branch; it *interpolates between the two keys bracketing time `t`*. Reading two
  branches at once contradicts the primitive's read-one-active-branch semantics.
  Transport is therefore a separate derived sampler over the collection, not a
  projection.

Consequence: timeline absorption into the primitive is real but partial. The
structural half collapses into the collection scale; the evaluation half stays its
own concern.

**Persistence — expose branches explicitly, versioned.** Recommended and adopted:

- Authored-inactive state *is* user data. If persistence hid it, a user who typed a
  fixed value, switched to range, saved and reloaded would silently lose it —
  breaking the retention invariant across sessions.
- Explicit branches are inspectable and diffable, which lets verification receipts
  assert on retention directly.
- Costs a more verbose format and early commitment to a shape. Mitigated by an
  envelope `version` field (needed for migrations regardless) and by the existing
  invariant that derived state is never serialised — so a persisted document
  contains only **document** and **authored-inactive** classes.

**Panel-scale discriminant persistence — restore state. Confirmed as invariant.**
Reopening an app restores the last active tab/tool. The discriminant is persisted;
its derived state is still evicted and rebuilt on activation. This makes the
discriminant itself **document** class even at panel scale, while everything it
projects stays classified per field. Checker: reload restores the active
discriminant, and derived caches rebuild rather than persist.

**Envelope version migrations — forward-only. Confirmed.** Documents written by a
newer appcraft version are not required to open in an older one. Migrations run
forward on load; the `version` field gates them.

## 11. Remaining open questions

None blocking field-scale implementation. Next questions arise at collection scale
(filter predicate persistence) and panel scale (archetype nesting depth limits).
