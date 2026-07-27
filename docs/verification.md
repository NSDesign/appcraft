# appcraft Verification

The Verification document for every task route in `AGENTS.md`. Read it immediately
before writing or running proof.

Toolcraft's rule holds unchanged and is the reason this document exists:
**prose is context, not execution proof.** A claim is discharged by output, never by
how carefully it is worded.

## Tiers

Classify **before** editing, by blast radius rather than line count. If uncertain,
move one tier higher — not automatically to the full gate.

| Tier | Trigger | Required |
|---|---|---|
| 0 | Docs and comments only | `npm run typecheck`, `npm run check:docs` |
| 1 | A single control or surface's visual state | Targeted unit test |
| 2 | Schema, bindings, persistence behaviour | `npm run verify:quick` |
| 3 | Kernel, retention, eviction, projection graph | `verify:quick` + the retention and eviction suites |
| 4 | Public API, architecture, dependencies, release | `npm run verify:final` |

## Commands

| Command | Checks |
|---|---|
| `npm run typecheck` | TypeScript, strict, across `src`, `e2e`, `scripts` |
| `npm run lint` | ESLint plus `eslint-plugin-boundaries` element and external rules |
| `npm run check:boundaries` | dependency-cruiser over the **module** graph of `src` and `e2e` |
| `npm run check:projection-graph` | The **projection reference** graph is acyclic; reports the shortest cycle |
| `npm run check:docs` | `AGENTS.md` and the decision contract have not drifted |
| `npm run check:worklog` | The latest decision-trail entry is complete, evidenced, and cites real rule ids |
| `npm run check:preflight` | The latest worklog attestation names a tier and matches the changed files |
| `npm run check:skills` | `.agents/skills` present and content-locked against `skills-lock.json` |
| `npm run test:scripts` | `node --test` over the checker unit tests |
| `npm run test:unit` | Vitest over `src` |
| `npm run test:browser` | Playwright over `e2e` |
| `npm run test:browser:perf` | The `browser perf:` scenarios only, single worker |
| `npm run verify:quick` | typecheck, lint, boundaries, unit |
| `npm run verify:final` | skills, docs, preflight, `verify:quick`, browser |

## What each layer can and cannot prove

The split matters, because most retention bugs pass a unit test.

- **Static checkers** prove structural claims: the kernel imports nothing, the module
  and projection graphs are acyclic, product code does not reach past the facade.
  They cannot prove that a value survived a switch.

  The two graphs are **not the same graph**. `check:boundaries` reads the module
  import graph; `check:projection-graph` reads the reference graph formed by
  projection nodes depending on each other's discriminants. A repository can pass one
  and fail the other, so neither substitutes for the other. The projection extractor
  lands with the schema route; until then the checker reports that it has no input,
  and the cycle analysis is proven against fixtures in
  `scripts/projection-graph.test.mjs`.
- **Unit tests** prove kernel semantics: `select` does not delete, `writeActive`
  writes one branch, `evictDerived` drops the right fields. They run against the
  envelope, so they cannot prove that the surface bound to a branch shows the
  retained value.
- **Browser tests** prove the session-observable invariants. Retention, eviction,
  export scope, validation scope, and panel-discriminant persistence are claims about
  what a user experiences across time, and only a session can discharge them.

Assigning an invariant to the wrong layer is how coverage becomes theatre. The
acceptance matrix in `e2e/appcraft-acceptance.ts` records the assignment, and
`e2e/appcraft-acceptance.spec.ts` rejects a row that claims a statically-checked
invariant as browser coverage.

## The browser suite

```
e2e/appcraft-acceptance.ts             the acceptance and performance matrices
e2e/appcraft-acceptance.spec.ts        the meta-gate over those matrices
e2e/appcraft-fixture.ts                fixture detection and the DOM contract
e2e/projection-observable-helpers.ts   retention, eviction, export, validation, persistence
e2e/surface-graph-helpers.ts           declared archetypes, master-detail, canvas discipline
e2e/performance-helpers.ts             frame probe, interaction measurement, budgets
e2e/projection-invariants.spec.ts      the Δ1 invariants in a session
e2e/surface-composition.spec.ts        the surface graph is the declaration
e2e/app-performance.spec.ts            activation and switch budgets
```

### The acceptance matrix

Every row names the contract rule it discharges, the test that discharges it, and the
helpers that test must use. `appcraft-acceptance.spec.ts` fails when a row points at
a test that does not exist, cites a rule the decision contract does not define,
requires a helper no module exports, or names a test that reaches its assertion
without the declared helper.

That last check is the point. A matrix whose rows can be satisfied by any passing
assertion measures nothing; requiring the observation path makes a row a statement
about *how* the invariant was proven.

### Fixture gating

The design is frozen ahead of the implementation, so the browser suite exists before
the app it drives. Specs needing a live page are skipped as a whole suite until
`src/app` provides an entry point, and Playwright's `webServer` is declared only when
that entry point exists.

**A skipped suite is not coverage.** It is reported as skipped, titled as skipped, and
must be recorded in the attestation's `skip` list with its reason. Reading a green run
as though those invariants were proven is exactly the failure `evidence-over-assertion`
names.

### The DOM contract

Browser tests observe through attributes the framework emits, never through internals:

| Attribute | Meaning |
|---|---|
| `data-appcraft-surface` | A declared surface instance; the value is its declaration id |
| `data-appcraft-archetype` | Which curated archetype the surface instantiates |
| `data-appcraft-projection` | A projection node; the value is its schema path |
| `data-appcraft-discriminant` | The control that sets the active key |
| `data-appcraft-branch` | A rendered branch; the value is its key |
| `data-appcraft-active-branch` | Present on the branch the discriminant selects |
| `data-appcraft-derived` | Derived output, which must exist only for active branches |
| `data-appcraft-product-output` | Product output — the only text a canvas surface may contain |

Because surfaces are declared, these attributes come from the framework rather than
from product code, which is what makes them safe to assert on. `check:boundaries`
forbids `e2e` from importing framework internals so this stays true.

## Skills

`.agents/skills` carries the workflow skills, content-hashed in `skills-lock.json`.
`check:skills` fails on a missing skill, on edited content that was not re-locked, and
on a skill present but unlocked.

A missing skill is **recorded, never silently skipped, and never a reason to lower a
tier.** If a host installs skills globally, `check:skills` accepts the fallback and
warns that the content is outside the lock's guarantee.

## Evidence

Verification claims in `docs/agent-worklog.md` carry the command and its result. A
tier-3 pass that reports retention as verified without the retention suite's output is
not a tier-3 pass.
