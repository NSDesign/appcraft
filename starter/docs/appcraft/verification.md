# Verification

**Prose is context, not execution proof.** A claim is discharged by output, never by
how carefully it is worded.

## Tiers

Classify **before** editing, by blast radius rather than line count. If uncertain, go
one tier higher — not straight to the full gate.

| Tier | Trigger | Required |
|---|---|---|
| 0 | Docs and comments only | `npm run typecheck` |
| 1 | A single control or surface's visual state | Targeted unit test |
| 2 | Schema, bindings, persistence behaviour | `npm run verify:quick` |
| 3 | Projections, retention, eviction | `verify:quick` + the retention and eviction suites |
| 4 | Public surfaces, architecture, dependencies, release | `npm run verify:final` |

## What each layer can and cannot prove

Most retention bugs pass a unit test. That is why the split matters.

- **Static checks** prove structure: product code does not reach past the facade, the
  projection graph is acyclic, no hard-coded style literals. They cannot prove a value
  survived a switch.
- **Unit tests** prove kernel semantics against the envelope. They cannot prove the
  *surface* bound to a branch shows the retained value.
- **Browser tests** prove the session-observable invariants — retention, eviction,
  export scope, validation scope, discriminant persistence. Only a session can.

Assigning an invariant to the wrong layer is how coverage becomes theatre.

## The browser suite

`e2e/appcraft-acceptance.ts` declares which contract rule each browser test discharges
and which helpers it must use. `e2e/appcraft-acceptance.spec.ts` fails when a row
points at a test that does not exist, cites a rule the contract does not define,
requires a helper no module exports, or names a test that reaches its assertion
without the declared helper.

That last check is the point: a matrix satisfiable by any passing assertion measures
nothing.

Observe through the DOM contract, never through internals:

| Attribute | Meaning |
|---|---|
| `data-appcraft-surface` | A declared surface instance; the value is its declaration id |
| `data-appcraft-archetype` | Which curated archetype the surface instantiates |
| `data-appcraft-projection` | A projection node; the value is its schema path |
| `data-appcraft-discriminant` | The control that sets the active key |
| `data-appcraft-branch` | A rendered branch; the value is its key |
| `data-appcraft-active-branch` | Present on the branch the discriminant selects |
| `data-appcraft-derived` | Derived output, which must exist only for active branches |
| `data-appcraft-product-output` | The only text a canvas surface may contain |

## Skipped is not covered

A skipped suite is reported as skipped and recorded in the attestation's `skip` list
with its reason. Reading a green run as though those invariants were proven is exactly
the failure this document exists to prevent.
