---
name: projection-modeling
description: Use when declaring or changing a discriminant, a retention envelope, or a projection node at any scale.
---

# appcraft Projection Modeling

Δ1 is appcraft's irreducible custom core, and the only place where a mistake is
silent rather than loud. Use this skill for any change that adds, moves, or removes
a discriminant, a branch, or a field inside a branch.

## The spine

> A **discriminant** selects an **active projection**. Inactive branches retain their
> own authored state. Derived state is materialised only for the active branch.

The same envelope serves all four scales — field, collection, panel, viewmodel:

```ts
interface Projection<K extends string, S> {
  active: K;
  branches: Partial<Record<K, S>>;   // retained; lazily initialised
  order?: K[];                       // open projections only
}
```

## Process

1. **Separate the value from the envelope.** The active value is typed and validated
   by Zod `discriminatedUnion`; the retention envelope is appcraft-owned and holds
   the discriminant plus every retained branch. Conflating them is the failure this
   skill exists to prevent — validation would then reject a document because of a
   branch nobody is editing.
2. **Classify every field**: document, authored-inactive, or derived. The engine
   retains the first two and evicts the third, identically at every scale. Buffered
   drag values, tessellation caches, preview renders, scroll positions, and per-branch
   undo depth are derived.
3. **Pick closed or open.** Closed keys come from the schema (variants, tabs); open
   keys come from data (collections) and add `order` plus
   add / remove / reorder / filter.
4. **Check the reference graph.** A projection node may read another node's
   discriminant. That reference graph must stay acyclic
   (`projection-graph-acyclic`); the checker reports the shortest cycle.
5. **Write the tests with the declaration**, not after: switch away and back and
   assert the authored value survives; assert no derived cache is retained for an
   inactive branch; assert export contains no inactive branch; assert an invalid
   inactive branch does not block a valid document.

## appcraft Rule

`select` never deletes another branch. Retention is not a feature to implement — it
falls out of that one property, and any code that resets state on a discriminant
switch is a bug, not a design choice. Toolcraft's `StyledModeField` is the canonical
violation: it discards the fixed-mode value when the user switches to range mode.

A discriminant switch is its own undo entry, separate from the edits around it
(`undo-switch-separate-entry`); retention is what makes undoing a switch lossless
without a snapshot. Panel-scale discriminants persist across reload
(`panel-discriminant-persists`) — the discriminant is document class even though
everything it projects stays classified per field. Persisted envelopes carry a
`version` and migrate forward only.
