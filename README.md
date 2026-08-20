# appcraft

An agent-oriented framework for building **complex** applications.

appcraft extends the Toolcraft methodology — a signed entry contract, task routing,
verification tiering, and evidence-over-assertion enforcement — from single-panel
tools to applications with multiple related surfaces.

## What it is

- **A methodology**, inherited from Toolcraft and rewritten: contract-first agent
  workflow, route-scoped documentation, pre-classified verification tiers,
  machine-checked evidence.
- **An architecture**, extended: multiple surfaces, master-detail, tabbed sections,
  and a single scale-invariant relationship primitive.

## What it is not

- Not a control library. Controls come from [Astryx](https://astryx.atmeta.com)
  and StyleX.
- Not a control-authoring framework. Custom controls are one route among many.
- Not application-specific. Nothing in `src/appcraft` may depend on the needs of a
  single app.

## The spine

> A **discriminant** selects an **active projection**. Inactive branches retain
> their authored state. Derived state is materialised only for the active branch.

One primitive at four scales — field, collection, panel, viewmodel. Variant
controls, layer lists, master-detail panels, and viewmodel graphs are all instances
of it. Absorbing them makes the core smaller than the single-purpose features it
replaces.

## Documents

- `AGENTS.md` — the active project contract. Read first.
- `docs/design/appcraft-core-architecture.md` — the kernel and composition schema.
- `docs/design/appcraft-inheritance-delta-map.md` — what is inherited, extended,
  swapped, absorbed, deleted, or new relative to Toolcraft.
- `docs/decision-contract.md` — rule ids and levels.
- `docs/verification.md` — tiers, commands, and what each verification layer can
  actually prove.

## Verification

```
npm run verify:quick    typecheck, lint, boundaries, unit
npm run test:browser    Playwright, including the acceptance-matrix gate
npm run verify:final    the full gate
```

`e2e/appcraft-acceptance.ts` declares which contract rule each browser test
discharges and which helpers it must use to do so; `e2e/appcraft-acceptance.spec.ts`
fails when a row points at a test that does not exist, cites a rule the contract does
not define, or names a test that reaches its assertion without the declared helper.

`.agents/skills` carries the workflow skills, content-hashed in `skills-lock.json`
and verified by `npm run check:skills`.

## Status

Design frozen; implementation not started. Build order is field scale → collection
scale → panel scale → viewmodel scale.

The enforcement surface is live ahead of the implementation: the acceptance and
performance matrices are checked on every run, while the specs that need a live page
are skipped until `src/app` renders a surface graph. Skipped is reported as skipped —
those invariants are not yet proven.

## Licence

MIT.
