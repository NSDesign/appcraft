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

```yaml
- pass: enforcement-truth-fixes
  routes: [enforcement, docs]
  docs_read:
    - AGENTS.md
    - docs/design/appcraft-inheritance-delta-map.md
    - docs/decision-contract.md
    - docs/verification.md
  tier: 2
  tier_reason: >
    Adds two checkers and corrects two false enforcement claims. Blast radius is the
    gate itself: every later pass is measured by it. Not tier 3 — no kernel, schema
    or store code exists to affect. Not tier 0 — this changes what passes and fails.
  run:
    - npm test
    - node --test scripts/projection-graph.test.mjs
  skip:
    - >
      The twelve fixture-dependent browser specs, unchanged from the previous pass:
      src/app still has no entry point.
```

```yaml
- pass: plan-decisions-recorded
  routes: [docs]
  docs_read:
    - docs/plans/scaffolder-and-style-guide.md
    - docs/decision-contract.md
  tier: 0
  tier_reason: >
    Plan document only. No implementation file, checker or config changes, so nothing
    the gate measures moves. Recorded rather than skipped because the decisions settled
    here bind passes 4 and 7.
  run:
    - npm run check:docs
    - npm run check:worklog
    - npm test
  skip:
    - >
      Nothing additional beyond the standing fixture-gated browser specs; this pass
      touches no code.
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

### Enforcement truth — worklog gate and projection-graph checker

- **Result:** two places where the repository claimed enforcement it did not have are
  now enforced, and one plan document covering the scaffolder and the style-guide
  interview.
  - `scripts/check-worklog.mjs` — `AGENTS.md` stated that `npm run test` fails if the
    worklog is missing its decision trail. It did not: deleting the entire trail
    passed the gate. The checker now requires the most recent entry to carry all five
    fields, to cite the command that produced its evidence (or state plainly that the
    pass produced none), and to cite only rule ids that exist in the decision
    contract. Earlier entries are history and are not re-checked.
  - `scripts/check-projection-graph.mjs` + `scripts/projection-graph.mjs` —
    `.dependency-cruiser.cjs` labelled its `no-circular` rule
    "projection-graph-acyclic", which was a false attribution: that rule reads the
    module import graph, not the reference graph formed by projection nodes depending
    on each other's discriminants. The delta map calls this "the one genuinely new
    checker" and it was a comment. Shortest-cycle detection with deterministic
    tie-breaking is now implemented and unit-tested; the extractor lands with the
    schema route, and until then the checker reports that it has no input rather than
    passing on an empty graph.
  - `docs/plans/scaffolder-and-style-guide.md` — the reviewed plan.
- **Rules applied:** `projection-graph-acyclic`, `worklog-decision-trail`,
  `evidence-over-assertion`, `verification-tier-preclassified`.
- **Rejected alternatives:**
  - *Deleting the two claims instead of implementing them.* Cheaper and honest, but
    both are load-bearing: the projection graph checker is the one new mechanism Δ1
    contributes, and the worklog gate is what stops the decision trail decaying into
    prose. Removing them would have made the repository honest and weaker.
  - *A projection-graph checker that passes on an empty graph.* It would have read as
    green in every run until the schema route lands, which is exactly the theatre
    `evidence-over-assertion` names. It reports "no input" instead.
  - *Checking every decision-trail entry rather than the latest.* A rule rename would
    then retroactively fail passes that were honest when written, which punishes
    keeping history.
  - *Putting the cycle analysis in `src/appcraft/kernel`.* It is enforcement, not
    runtime, and `kernel-dependency-free` should not be spent on a checker. It sits in
    `scripts/` with `node --test` coverage, following Toolcraft's precedent.
- **Evidence:**
  - `npm test` — exit 0. `check:skills` 7 locked; `check:docs` 27 rule ids;
    `check:worklog` OK; `check:preflight` tier 2; `check:boundaries` no violations;
    `check:projection-graph` reports no input; `test:scripts` 10 passed;
    `test:browser` 7 passed, 12 skipped.
  - Negative tests run by hand against a scratch fixture: deleting the decision trail,
    omitting Rejected alternatives, evidence with no command, a typo'd rule id, and a
    trail citing no ids — each fails with the specific reason. An entry declaring
    "none yet — design only" passes, so a genuine docs-only pass is not forced to
    invent evidence.
  - `node --test scripts/projection-graph.test.mjs` — 10 passed, covering self-cycles,
    shortest-wins, declaration-order independence, dangling references, and duplicate
    ids.
- **Risks:**
  - The projection-graph checker has no real input until the schema route lands. Its
    analysis is proven against fixtures; its *extraction* is not written, and the
    declared input path (`src/appcraft/schema/projection-graph.json`) is a guess that
    the schema route may change.
  - `check:worklog` inspects the latest entry only. A pass that appends a complete
    entry while leaving an earlier one hollow is not caught, by design.
  - Three review findings are recorded but not fixed: the routing table covers only
    architecture-layer routes and cannot route an app build; the decision-contract
    tables are still detect-only rather than generated; and `check-contract-docs.mjs`
    only flags an unknown rule id when it shares a first hyphen-segment with a real
    one. All three are scheduled in the plan.

### Plan decisions — package name, publishing, package manager, Astryx direction

- **Result:** four open questions in the scaffolder plan settled and three new ones
  recorded in their place.
  - **Settled.** Package name `@nsdesign/appcraft` — the npm username is `nsdesign`
    and npm reserves the scope matching a username, so nothing needs claiming; first
    publish still needs `--access public`. Publishing via GitHub Actions with OIDC
    trusted publishing rather than a stored token, which the linked GitHub account of
    the same name makes available and which Astryx itself uses. npm as the only
    supported package manager. Composition over swizzling as the working direction for
    building on Astryx primitives.
  - **Opened.** The three Astryx pinning questions — whether a stability or 1.0
    commitment exists, whether codemods cover swizzled source, and whether the
    `defineTheme` token surface moves across minors — plus the composition-versus-
    swizzle *policy* fork, which was not captured anywhere before.
- **Rules applied:** `astryx-before-custom-control` and `custom-control-justified`
  (the levels the contract already gives these are exactly the composition-first
  position, so the direction needed recording rather than deciding);
  `envelope-versioned` (the same reasoning that versions a persisted envelope argues
  for recording the Astryx version beside the style-guide answers).
- **Rejected alternatives:**
  - *Supporting pnpm and bun because Toolcraft supports pnpm.* Generating commands for
    a manager we do not test is worse than declining: the first instruction a user
    reads after scaffolding would be untested. The CLI detects and refuses instead.
  - *Treating swizzling as equivalent to composition and deciding later.* It is a
    per-component fork — upstream fixes and accessibility corrections stop arriving,
    and every upgrade becomes a merge. Naming the cost now is what makes the escape
    hatch a decision rather than a drift.
  - *Resolving the Astryx pinning questions by reasoning.* They are empirical. The
    hypothesis (pin exact, record the generated-against version) is written down as a
    hypothesis, not a finding.
- **Evidence:** `npm test` — exit 0; `check:docs` 27 rule ids, `check:worklog` OK on
  this entry, 10 script tests, 7 browser meta-gates, 12 fixture-gated specs skipped.
  Tier 0 pass: the evidence is that nothing regressed, not that anything new was proven.
- **Risks:**
  - The npm scope reservation is inferred from npm's username rule, not verified by
    logging in — this sandbox has no npm credentials. Confirm before pass 7.
  - The three Astryx questions gate the style-guide feature's durability, and none is
    answered. If the token surface moves across minors, themes built today may render
    differently later; recording the Astryx version in `docs/style-guide.md` is a
    cheap hedge that does not remove the risk.
