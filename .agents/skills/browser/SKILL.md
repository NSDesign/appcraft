---
name: browser
description: Use to verify appcraft surfaces in a real local browser after implementation.
---

# appcraft Browser Verification

Use this skill after implementing behaviour that affects visible surfaces: panels,
archetypes, master-detail, tabbed sections, canvases, inspectors, control bindings,
persistence, or export.

## Process

1. Run the fixture app with `npm run dev`.
2. Open the local URL in a real browser.
3. Verify the surfaces the change touched, then verify the projection invariants
   that no unit test can prove end to end:
   - switch a discriminant away and back, and confirm the authored value survives;
   - confirm derived output rebuilds on activation rather than persisting;
   - reload the page and confirm the active tab or tool is restored;
   - export and confirm no inactive branch appears in the output.
4. Run `npm run test:browser` for the Playwright suite in `e2e/`.
5. For final delivery, run the commands required by the tier in `AGENTS.md`.

## appcraft Rule

Browser verification is part of the contract. A typecheck, a lint pass, or a unit
run alone is not enough for anything a user can see. Retention and eviction are
cross-cutting behaviours that only a real session proves — a unit test can show that
`select` preserves a branch, but only the browser shows that the surface bound to it
renders the preserved value after a reload.

Every browser claim must be backed by test output. If a check could not run, record
it in the attestation's `skip` list with the reason; never report it as passing.
