---
name: writing-plans
description: Use before appcraft code changes once the surface graph and projection model are clear.
---

# appcraft Writing Plans

Use this skill before editing framework or fixture code from a clear appcraft spec
or user request.

## Plan Content

Write a concise implementation plan that names:

1. **Routes.** Every task route from the `AGENTS.md` routing table that the change
   touches — `kernel`, `schema`, `store`, `surfaces`, `controls`, `enforcement`,
   `docs` — using the smallest set that covers the changed surface.
2. **Files** under `packages/core/src/*`, `starter/src/app`, `starter/e2e`, `scripts`, or `docs`.
3. **Projection model.** Which discriminants change, whether each projection is
   closed or open, and the class of every field the change adds or moves.
4. **Envelope impact.** Whether the persisted shape changes; if so, the `version`
   bump and the forward-only migration.
5. **Coverage** required by the selected tier: unit suites, the retention and
   eviction suites for tier 3, and the `e2e` specs named in
   `starter/e2e/appcraft-acceptance.ts` for anything that renders.
6. **Commands** to run before completion.

## appcraft Rule

Write the preflight attestation into `docs/agent-worklog.md` **before** editing
implementation files — routes, docs read, tier, tier reason, commands to run, and
checks deliberately skipped with the reason. `npm run check:preflight` cross-checks
the declared routes against the files actually changed, so a plan that understates
its blast radius fails the gate rather than passing quietly.

Build the primitive one scale at a time — field, then collection, then panel, then
viewmodel — reusing the same kernel. Staged validation, not a fragmented
abstraction. Never move framework behaviour into product code, and never introduce
a second state paradigm alongside the facade.
