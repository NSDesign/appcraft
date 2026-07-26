---
name: systematic-debugging
description: Use before fixing broken appcraft projections, surfaces, controls, tests, builds, or persistence.
---

# appcraft Systematic Debugging

Use this skill before fixing any appcraft failure. Write the failing test or the
minimal repro *before* the plan document, never after the fix.

## Process

1. Reproduce with the smallest command or browser action. Capture the output.
2. Read the full error, stack trace, failing assertion, or visual mismatch.
3. Locate the failure by layer: kernel envelope, composition schema, store facade,
   surface archetype, control binding, persistence, checker, or fixture app.
4. Compare against the design documents and the passing patterns already in the
   repository, then make **one** targeted fix and rerun the relevant verification.

## Failure catalogue

Toolcraft's catalogue extends with the failures Δ1 makes possible. Check these
before assuming a generic bug:

| Symptom | Likely cause |
|---|---|
| Value resets when a discriminant switches back | `select` deleting a branch, or state held outside the envelope |
| Memory grows with collection size | derived fields misclassified as document or authored-inactive |
| Blank surface after activation | `materialise` not rebuilding evicted derived state |
| Valid document rejected | inactive branch inside the validated value instead of the envelope |
| Export contains stale values | export reading the envelope rather than the active projection |
| Infinite render or stack overflow | cycle in the projection reference graph |
| Two surfaces disagree | cross-surface state desync — a surface holding a local copy instead of reading the facade |
| Reopening loses the active tab | panel-scale discriminant not persisted, or evicted with its derived state |
| Load fails on an older document | missing forward migration for the envelope `version` |

## appcraft Rule

Fix the cause at its own layer. Do not patch a symptom in a surface or control when
the envelope, classification, or facade is wrong, and do not weaken an assertion to
make a suite pass. If a checker is genuinely wrong, fix the checker and say so in the
worklog — evidence over assertion applies to the enforcement code too.
