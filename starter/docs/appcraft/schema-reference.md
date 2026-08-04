# Schema Reference

The document schema declares entities, fields, variants, defaults, and persistence.
It is data, not code: the framework reads it to build surfaces, bindings, validation
and the retention envelope.

## Fields

Every field has a type, a default, and a **class**:

| Class | Retained when inactive? | Persisted? | Examples |
|---|---|---|---|
| `document` | yes | yes | committed geometry, active style values |
| `authored-inactive` | yes | yes | the fixed value typed before switching to range |
| `derived` | **no — evicted** | no | previews, caches, buffered drags, scroll position |

`field-classification-required` is an invariant. An unclassified field is a retention
bug waiting to happen: the engine cannot know whether to keep it.

## Variants are projections

A field with mutually exclusive modes is a **field-scale projection**, not a union you
hand-roll:

```ts
mode: variant({
  discriminant: "kind",
  branches: {
    fixed: { value: number({ default: 0 }) },
    range: { min: number({ default: 0 }), max: number({ default: 100 }) },
  },
})
```

Switching `kind` does not clear the other branch. Do not add code that resets on
switch — that is the bug the primitive exists to make impossible.

## Validation

Only the **active** variant is validated. A range branch holding `min > max` while
`fixed` is active does not block the document. If validation is rejecting a document
because of a branch nobody is editing, retained state has leaked into the validated
value; fix the declaration, not the validator.

## Persistence

Persisted documents carry `version` and contain document and authored-inactive fields
only. Migrations run forward on load; a document written by a newer version is not
required to open in an older one.

Panel-scale discriminants persist: reopening restores the last active tab or tool.
What that tab *projects* is still classified per field, so its derived state rebuilds.
