# Collections

Layers, lists, ordering, filtering. The primitive at **collection scale**.

## Open projections

A collection is an **open** projection: its keys come from data rather than from the
schema. That adds `order` and four operations to the same envelope:

```
add(key, init)    remove(key)    reorder(order)    filter(predicate)
```

Everything else is identical to field scale. Selection is the discriminant, per-item
detail state is the branches, and the retention and eviction rules are unchanged.

## Why eviction matters most here

A 500-entity collection retaining document and authored-inactive state costs low
single-digit megabytes — and that state *is* the document. Retaining 500 sets of
derived caches costs gigabytes. Eviction is also simply correct: you never want 500
live preview surfaces.

Note the separation: entities still **render** from document data. Only the
heavyweight edit-time projection is lazy.

## Master-detail

A list surface supplies the discriminant; a detail surface projects the active branch.
Declare it as the `master-detail` archetype. Do not build a list and a panel and wire
them together by hand — the invariants above stop being checkable the moment you do.

## Open question, decide and test

Whether a collection's **filter state persists** is product-dependent
(`collection-filter-scope`). A filter a user set deliberately probably should; a search
box they typed in probably should not. Decide, record the decision, and test it.
