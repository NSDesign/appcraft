# appcraft Agent Worklog

Mode: framework

## Preflight attestations

Append one block per implementation pass, **before** editing.

```yaml
- pass: repo-structure-parity
  routes: [enforcement, docs]
  docs_read:
    - AGENTS.md
    - docs/design/appcraft-core-architecture.md
    - docs/design/appcraft-inheritance-delta-map.md
    - docs/decision-contract.md
  tier: 2
  tier_reason: >
    Adds the verification surface (e2e, Playwright, skills) and the configs that run
    it. No kernel, schema, store, surfaces or controls code exists yet, so the blast
    radius is the gate itself rather than framework behaviour. Raised from tier 0
    because the change alters what every later pass is measured by; not tier 4
    because no public API is defined.
  run:
    - npm run typecheck
    - npm run lint
    - npm run check:boundaries
    - npm run test:unit
    - npm run check:skills
    - npm run check:docs
    - npm run test:browser
  skip:
    - >
      The twelve fixture-dependent browser specs. They are skipped by the suite, not
      satisfied: src/app has no entry point, so no session exists to observe. They run
      unchanged as soon as the field-scale fixture renders a surface graph.
    - >
      npm run test:browser:perf — the same gate; both scenarios sit inside the
      fixture-gated suite.
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

### Repo structure parity — `e2e` and `.agents`

- **Result:** appcraft now carries the two directories Toolcraft's repository
  structure depends on, rewritten for Δ1 rather than copied.
  - `.agents/skills/` — seven workflow skills. Six carry over from Toolcraft
    (`brainstorming`, `writing-plans`, `systematic-debugging`, `browser`, `figma`,
    `figma-implement-design`), each re-derived for appcraft's routes, the surface
    graph, and the Astryx/StyleX substrate. One is new: `projection-modeling`, the
    Δ1 skill, because the primitive is the one place where a mistake is silent.
  - `e2e/` — a declared acceptance matrix, a meta-gate over it, three helper modules
    (projection observables, surface graph, performance), and specs for the Δ1
    invariants, surface composition, and activation budgets.
  - Supporting surface: `playwright.config.ts`, `vitest.config.ts`,
    `eslint.config.js`, `skills-lock.json`, `scripts/check-skills.mjs`, and
    `docs/verification.md` — which every route in `AGENTS.md` already pointed at and
    which did not exist.
- **Rules applied:** `evidence-over-assertion` (a skipped suite is reported as
  skipped, never counted); `verification-tier-preclassified`;
  `surfaces-declared-not-composed` and `layout-archetypes-only` (the surface-graph
  helpers assert the declaration is what rendered); `retain-inactive-branches`,
  `evict-derived-state`, `export-active-projection-only`,
  `inactive-branches-not-validated`, `panel-discriminant-persists`,
  `envelope-versioned`, `undo-switch-separate-entry` (each claimed by a matrix row);
  `facade-owns-state` (`e2e` may not import framework internals).
- **Improvements over the Toolcraft originals**, per the delta map's ADOPT+ rule that
  carried-over mechanisms must be strengthened rather than inherited verbatim:
  - Toolcraft's `skills-lock.json` records a hash of a package on the author's
    machine, and its checker never reads the lock — so a skill can be edited in-repo
    with nothing noticing. appcraft locks the content that actually ships and verifies
    it, reporting drift, absence, and unlocked skills separately.
  - Toolcraft's acceptance meta-test verifies that a row names a real test. appcraft
    additionally verifies that the row cites a rule the decision contract defines,
    that every helper it demands is really exported, and that no row claims a
    statically-checked invariant as browser coverage.
  - The matrices record the *scale* at which each invariant is claimed, which makes
    scale-invariance a checkable property rather than a stated intention.
- **Rejected alternatives:**
  - *Porting Toolcraft's e2e files.* They assert Toolcraft's canvas-and-one-panel
    contract (`data-toolcraft-canvas-handle`, discrete-slider markers, segmented-cell
    padding). Δ2 deletes the control library those tests guard and Δ1 replaces the
    single canvas with a surface graph, so a port would have encoded the shape
    appcraft exists to move past.
  - *Declaring the acceptance matrix in `src/app`, as Toolcraft does.* Toolcraft's
    invariants are per-app; appcraft's Δ1 invariants are framework-level and hold
    identically in every app, so the matrix belongs beside the tests. Putting it in
    `src/app` would make framework coverage depend on a fixture, which
    `app-agnostic-core` forbids.
  - *Writing browser specs that pass today by asserting something trivial.* Rejected
    under `evidence-over-assertion`; the suite skips instead, and the skip is recorded.
  - *A body-level `test.skip(...)` for the fixture gate.* Playwright sets up the
    `page` fixture before the body runs, so a body-level skip still launches a browser
    and fails when none is installed. The gate is applied at suite level.
  - *Copying Toolcraft's port-resolution scripts.* They solve a dev-server problem
    appcraft does not have yet; the config declares `webServer` only when a fixture
    entry point exists.
- **Adjacent fix, outside the requested scope but blocking it:** `npm run lint` and
  `npm run test:unit` could not run at all — the repository had no `eslint.config.js`
  and no Vitest config, so `verify:quick`, `verify:final` and `npm test` failed before
  reaching any check. Both are added; the Vitest config excludes `e2e` so Playwright
  specs are never collected by the unit runner.
- **Evidence:**
  - `npm run typecheck` — exit 0.
  - `npm run lint` — exit 0, no findings.
  - `npm run check:boundaries` — `no dependency violations found (13 modules, 30 dependencies cruised)`.
  - `npm run test:unit` — no test files, exit 0 (no `src` implementation yet).
  - `npm run check:skills` — 7 skills present and content-locked.
  - `npm run check:docs` — rule ids parsed, no drift.
  - `npm run test:browser` — 7 passed, 12 skipped. The 7 are the acceptance and
    performance meta-gates; the 12 are the fixture-gated specs listed under `skip`.
- **Risks:**
  - The DOM contract in `e2e/appcraft-fixture.ts` is designed ahead of the framework
    that must emit it. Field-scale implementation is its first real test and the
    attribute names may need to change; the helpers are the only place that depends on
    them, so the cost is contained.
  - The two performance budgets are estimates, not measurements. They exist so a
    scenario cannot be satisfied by a toy input, and must be re-derived from a real
    fixture at collection scale before they mean anything.
  - Twelve invariant specs are currently unproven. Anyone reading a green run should
    read this `skip` list alongside it.
