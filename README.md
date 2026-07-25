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

## Status

Design frozen; implementation not started. Build order is field scale → collection
scale → panel scale → viewmodel scale.

## Licence

MIT.
