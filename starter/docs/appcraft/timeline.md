# Timeline

Two halves, and they are not the same mechanism. Conflating them is the documented
mistake this route exists to prevent.

## Structure — a projection ✔

- **Track list** → an open projection at collection scale.
- **Keys within a track** → an open projection at collection scale. Select a key, edit
  its value and easing in a detail surface.

Both get retention, eviction, ordering, and the archetypes for free.

## Transport — not a projection ✘

A playhead does **not select a branch**. It interpolates between the two keys
bracketing time `t`. Reading two branches at once contradicts the primitive's
read-one-active-branch semantics.

Transport is therefore a **derived sampler over the collection** — a separate concern
with its own evaluation, not a projection with a clever discriminant
(`transport-not-a-projection`).

## Why the distinction earns its keep

Model transport as a projection and you get a discriminant that must be "at" a key it
is usually between, retention semantics for a value nobody authored, and undo entries
for scrubbing. Every one of those is a bug you would then work around.

## Coverage

Structural behaviour uses the standard projection invariants. Transport needs its own
tests: sampling between keys, at a key exactly, before the first and after the last.
