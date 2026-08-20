# Debugging

Write the failing test or the minimal reproduction **before** the plan, never after
the fix.

## Process

1. Reproduce with the smallest command or browser action. Capture the output.
2. Read the full error, stack trace, failing assertion, or visual mismatch.
3. Locate the failure by layer: schema, bindings, surfaces, controls, renderer,
   persistence, or the framework itself.
4. Make **one** targeted fix and rerun the relevant verification.

## Failure catalogue

Check these before assuming a generic bug.

| Symptom | Likely cause |
|---|---|
| Value resets when a discriminant switches back | Code resetting on switch, or state held outside the envelope |
| Memory grows with collection size | Derived fields misclassified as document or authored-inactive |
| Blank surface after activation | Derived state evicted but not rebuilt on activation |
| Valid document rejected | An inactive branch inside the validated value |
| Export contains stale values | Export reading the envelope rather than the active projection |
| Infinite render or stack overflow | A cycle in the projection reference graph |
| Two surfaces disagree | A surface holding a local copy instead of reading the facade |
| Reopening loses the active tab | Panel discriminant not persisted, or evicted with its derived state |
| Load fails on an older document | Missing forward migration for the envelope `version` |
| Colours ignore the theme | Hard-coded literals; `theme-tokens-not-literals` |

## The rule

Fix the cause at its own layer. Do not patch a symptom in a surface when the schema,
classification, or facade is wrong, and never weaken an assertion to make a suite
pass. If a check is genuinely wrong, fix the check and say so in the worklog —
evidence over assertion applies to the enforcement code too.
