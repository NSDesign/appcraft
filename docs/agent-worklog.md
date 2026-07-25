# appcraft Agent Worklog

Mode: seed

Replace `Mode: seed` with `Mode: framework` and add real decision-trail entries
before any delivery. `npm run check:preflight` fails while this file still declares
the seed state.

## Preflight attestations

Append one block per implementation pass, **before** editing:

```yaml
- pass: <short name>
  routes: [kernel]
  docs_read: [docs/design/appcraft-core-architecture.md, docs/decision-contract.md]
  tier: 3
  tier_reason: <changed surface and expected blast radius>
  run: [npm run verify:quick]
  skip: [browser acceptance — no surface rendered this pass]
```

## Decision trail

Each entry names the user-visible result, the contract rules applied, rejected
alternatives, evidence, and remaining risks. Prose is context, not execution proof.

### Seed — design freeze

- **Result:** framework contract, decision catalogue, boundary rules, and the two
  authoritative design documents committed. No implementation yet.
- **Rules applied:** `app-agnostic-core`, `layout-archetypes-only`,
  `retain-inactive-branches`, `evict-derived-state`, `panel-discriminant-persists`,
  `envelope-versioned`, `undo-switch-separate-entry`.
- **Rejected alternatives:** XState for the projection kernel (replaces only the
  cheap part, adds unsignable dependency, requires bridging); MobX-State-Tree (too
  opinionated); free-form declarative layout (breaks declared-not-composed);
  treating appcraft as a control-authoring framework (mischaracterisation — controls
  are one route of many).
- **Evidence:** none yet — design only. Tier 0.
- **Risks:** decision catalogue is seeded from analysis rather than observed
  failures; phase two must revise it from real agent behaviour.
