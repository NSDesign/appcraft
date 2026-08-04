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

```yaml
- pass: field-scale-kernel
  routes: [kernel, enforcement, docs]
  docs_read:
    - AGENTS.md
    - docs/design/appcraft-core-architecture.md
    - docs/decision-contract.md
    - docs/verification.md
  tier: 3
  tier_reason: >
    The projection envelope, retention, three-way field classification and eviction —
    the spine every later scale reuses. Tier 3 by the table: kernel, retention,
    eviction. Not tier 4 because the public entry point is not yet declared and no
    dependency changes; the kernel stays dependency-free. Routes widened mid-pass from
    [kernel] to include enforcement and docs: the first real code exposed two bugs in
    .dependency-cruiser.cjs that blocked the pass, and check:preflight caught the
    understated declaration rather than letting it through.
  run:
    - npm run test:unit
    - npm run verify:quick
    - npm test
  skip:
    - >
      The twelve fixture-dependent browser specs. This pass proves the kernel, not a
      rendered surface; src/app still has no entry point. Retention and eviction are
      proven at unit level here and remain unproven in a session until the fixture app
      lands.
```

```yaml
- pass: route-registry
  routes: [enforcement, docs]
  docs_read:
    - AGENTS.md
    - docs/design/appcraft-inheritance-delta-map.md
    - docs/decision-contract.md
    - docs/plans/scaffolder-and-style-guide.md
  tier: 2
  tier_reason: >
    One registry becomes the source for the AGENTS.md routing table and for
    check:preflight's route matching, which currently hardcodes its own path patterns.
    Blast radius is the gate: getting the registry wrong mis-routes every later pass.
    Not tier 3 — no kernel, retention or eviction code is touched.
  run:
    - npm run check:routes
    - npm run verify:quick
    - npm test
  skip:
    - >
      The twelve fixture-dependent browser specs, unchanged: no fixture app renders yet.
    - >
      Existence checks for the app-axis routes' documents. They are paths inside a
      generated app, and the starter does not exist until pass 3.
```

```yaml
- pass: monorepo-restructure
  routes: [kernel, schema, store, surfaces, controls, starter, enforcement, docs]
  docs_read:
    - AGENTS.md
    - docs/plans/scaffolder-and-style-guide.md
    - docs/decision-contract.md
    - docs/verification.md
  tier: 4
  tier_reason: >
    Architecture and dependency change. Every path in every config moves, the package
    boundary between the published library and the generated app is drawn for the
    first time, and npm workspaces are introduced. Tier 4 by the table: architecture
    and dependencies. Full gate. Every framework route is declared because every one of
    them moved: check:preflight rejected a narrower declaration listing only kernel.
  run:
    - npm run verify:quick
    - npm test
  skip:
    - >
      The twelve fixture-dependent browser specs, unchanged: the starter now exists as
      a package but still renders no surface graph. They move with the suite and stay
      skipped until pass 5 fills src/app.
```

```yaml
- pass: cli-scaffolder
  routes: [starter, enforcement, docs]
  docs_read:
    - AGENTS.md
    - docs/plans/scaffolder-and-style-guide.md
    - docs/decision-contract.md
    - docs/verification.md
  tier: 4
  tier_reason: >
    Adds a second published package and the artefact users actually run. A generation
    bug ships broken apps to every user, and the starter documents this pass adds are
    what the generated contract routes agents to. Tier 4 by the table: public API,
    architecture, dependencies, release.
  run:
    - npm run test:scripts
    - npm run verify:quick
    - npm test
    - node packages/cli/bin/appcraft.mjs create <tmp> --yes --no-install
  skip:
    - >
      The twelve fixture-dependent browser specs, unchanged: src/app still renders no
      surface graph. The generated app inherits the same skip until pass 5.
    - >
      Publishing to npm. No credentials in this environment, and the scope is
      unconfirmed. Generation is proven by running the CLI against a temporary
      directory and asserting on the result instead.
```

```yaml
- pass: style-guide-route
  routes: [starter, enforcement, docs]
  docs_read:
    - AGENTS.md
    - docs/plans/scaffolder-and-style-guide.md
    - docs/decision-contract.md
    - starter/docs/appcraft/style-guide.md
  tier: 2
  tier_reason: >
    Adds the style-guide skill, an interactive picker shipped into every generated
    app, and the checkers that stop the interview producing a theme the app ignores.
    No kernel or projection code is touched, so not tier 3; it does change what the
    gate proves, so not tier 0.
  run:
    - npm run check:style-guide
    - npm run verify:quick
    - npm test
  skip:
    - >
      The twelve fixture-dependent browser specs. The fixture app is a separate pass:
      it needs the whole Δ2 substrate (React, Vite, Astryx, StyleX) and bundling it
      here would make two changes at once.
    - >
      Rendering the picker in a browser. Chromium in this environment does not match
      the pinned Playwright build, so the page is verified structurally and by its
      extracted output rather than by screenshot.
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

### Field-scale kernel — the projection envelope

- **Result:** the spine exists. `src/appcraft/kernel` implements the retention
  envelope, the three-way field classification, eviction, materialisation,
  persistence and export — dependency-free, pure, and covered by 25 unit tests.
  - `projection.ts` — `createProjection`, `select`, `readActive`, `readBranch`,
    `writeActive`, `materialise`, `evictDerived`, the composed `activate`,
    `toPersistable`, `toExport`.
  - `field-class.ts` — document / authored-inactive / derived, with the
    classification typed as `{ [Field in keyof S]-?: FieldClass }` so an unclassified
    field is a compile error rather than a silent retention bug.
  - `styled-mode-field.test.ts` — the re-declaration the design document names as
    field-scale validation. Toolcraft's version resets on mode change; here retention
    is not implemented at all, it falls out of `select` never deleting.
- **Rules applied:** `retain-inactive-branches`, `evict-derived-state`,
  `field-classification-required`, `export-active-projection-only`,
  `inactive-branches-not-validated`, `envelope-versioned`,
  `panel-discriminant-persists`, `kernel-dependency-free`, `app-agnostic-core`,
  `facade-owns-state`, `verification-tier-preclassified`, `evidence-over-assertion`.
- **Rejected alternatives:**
  - *Building eviction into `select`.* Convenient, but it would fuse the retention
    claim to the eviction claim so neither could be tested without the other. `select`
    stays minimal and `activate` composes the transition.
  - *Mutating the envelope in place.* Undo history holds references to prior
    envelopes; mutating one rewrites the past. Every operation returns a new envelope.
  - *A `StyledModeField` fixture module in `src/appcraft`.* `app-agnostic-core` forbids
    app-specific code in the framework. It lives inside the test file, where a fixture
    exercises the framework rather than sourcing requirements for it.
  - *Implementing the open-projection operations now.* `add`/`remove`/`reorder`/
    `filter` are collection scale. `order` is present in the envelope type because it
    is the same envelope, but the operations arrive with the scale that needs them —
    staged validation, not fragmented abstraction.
  - *Declaring the kernel done at 25 green tests.* A suite that cannot fail proves
    nothing, so the invariants were mutation-tested (below).
- **Enforcement bugs found by the first real code:** `.dependency-cruiser.cjs` had two
  defects that were invisible while `src/` was empty.
  1. `app-uses-public-api-only` matched `^src/app`, which also matches
     `src/appcraft` — the rule forbade the framework from importing its own internals
     and failed every kernel module. Fixed to `^src/app/`.
  2. `kernel-dependency-free` failed kernel *tests* for importing vitest. The
     constraint belongs on what the kernel ships, not on its tests, so tests are
     exempt — and a companion rule `kernel-tests-use-no-runtime-libs` keeps the
     exemption narrow enough that a test importing the store is still caught.
- **Evidence:**
  - `npm run test:unit` — 25 passed across 3 files.
  - **Mutation tests**, each reverted after: making `select` delete other branches
    (the Toolcraft bug) fails 7 tests including both retention tests and four of the
    five StyledModeField tests; making `evictDerived` a no-op fails 4; making
    `toExport` leak the envelope fails 2. Each mutation is caught by exactly the tests
    that claim to cover it.
  - **Boundary probes**, each reverted: a kernel module importing the store, a kernel
    test importing the store, and product code reaching into kernel internals are all
    still rejected after the rule fixes.
  - `npm run check:boundaries` — no violations, 20 modules, 41 dependencies.
  - `npm test` — exit 0.
  - `check:preflight` rejected this pass's first attestation for declaring
    `routes: [kernel]` while the boundary fix touched enforcement. The gate worked on
    its author.
- **Risks:**
  - Retention and eviction are proven at unit level only. The browser specs that would
    prove them in a session remain skipped — no fixture app renders yet, and a unit
    test cannot show that the surface bound to a branch displays the retained value.
  - `materialise` takes a `build` callback rather than reading a declared derived
    spec. That is right for field scale and may not survive collection scale, where
    building 500 branches' derived state on demand needs a declaration the engine can
    schedule, not a callback the caller supplies.
  - `toPersistable` drops `order` because closed projections do not use it. Collection
    scale must revisit that line, or reordering will not survive a reload.

### Route registry — one source for the tables and the checkers

- **Result:** `docs/routes.json` is the single route registry, and the `AGENTS.md`
  routing table is now **generated** from it rather than maintained beside it.
  - `scripts/routes.mjs` — load, validate, match changed files to routes, render.
  - `scripts/generate-routes.mjs` — `npm run check:routes` compares, `routes:generate`
    rewrites. Editing the table by hand has no effect and fails the gate.
  - `scripts/check-preflight.mjs` now reads its route-to-path mapping from the
    registry; it previously held a literal copy, which was the same drift the registry
    exists to remove. It also rejects an attestation naming a route the registry does
    not define — a typo that would otherwise read as extra diligence.
  - **Two axes.** Seven *framework* routes (work on appcraft, matched by file path)
    and twelve *application* routes (work inside a generated app, matched by intent).
    The framework axis alone could never route "build me an app that…", which is the
    first thing a user types after `create`.
- **Rules applied:** `preflight-attested`, `verification-tier-preclassified`,
  `evidence-over-assertion`, `worklog-decision-trail`, `app-agnostic-core`
  (app-axis routes describe product work and carry no framework paths),
  `transport-not-a-projection` (the timeline route names the split explicitly).
- **Rejected alternatives:**
  - *Detecting drift instead of generating.* The delta map is specific: generate, so
    drift is impossible rather than merely reported. A detector still permits a window
    where the two disagree and someone reads the wrong one.
  - *One flat route list.* Framework and application routes answer different questions
    — "which part of appcraft" versus "what kind of product work". Flattening them
    would put `kernel` and `debugging` in one table and make the smallest-covering-set
    rule meaningless.
  - *Giving app-axis routes file patterns too.* Their files live in a generated app,
    not here. A pattern that matched nothing would look like coverage.
  - *Generating the starter's table now.* The starter does not exist until pass 3. The
    registry carries the app axis ready; the generator gains a second target then.
- **Evidence:**
  - `node --test scripts/routes.test.mjs` — 13 passed, including that
    `src/appcraft/schema/…` routes to `schema` and not to an `src/app` prefix match,
    the bug that broke the boundary rules in the previous pass.
  - **Gate probes**, each reverted: a hand-edited table fails `check:routes`; a
    registry edit without regeneration fails; a registry pointing at a missing
    document fails validation; an attestation naming `kernal` fails `check:preflight`.
  - `npm test` — exit 0. 23 script tests, 25 unit tests, 7 browser meta-gates.
- **Risks:**
  - The twelve app-axis routes are proposed from the delta map's task table, not mined
    from observed agent behaviour. Phase two should revise them from real failures;
    the registry makes that a data edit rather than a documentation exercise.
  - App-axis routes point at documents (`docs/appcraft/*.md`) that do not exist yet.
    Validation is deliberately disabled for that axis, so a wrong path there will not
    be caught until the starter carries those files.
  - `check:routes` covers `AGENTS.md` only. When the starter arrives it must be added
    to `targets`, or its table can drift silently.

### Monorepo restructure — the publisher shape

- **Result:** the repository is now an npm-workspaces monorepo, and the package
  boundary between the published library and the generated app is drawn.
  - `packages/core` — `@nsdesign/appcraft-core`, the framework library, with
    `src/index.ts` as the public entry product code imports.
  - `starter/` — the app the CLI will generate, carrying its own `AGENTS.md`,
    `package.json`, `playwright.config.ts`, `src/app`, and the `e2e` suite.
  - Root — workspaces, the checkers, the design documents, and `tsconfig.base.json`
    shared by both packages.
  - `starter/AGENTS.md` renders the **application** route axis from the same registry
    that renders the framework axis into the root contract, closing the risk recorded
    last pass that `check:routes` covered one document only.
- **Two published names, decided this pass.** `@nsdesign/appcraft` is the CLI — what a
  user types. `@nsdesign/appcraft-core` is the library a generated app imports. The
  plan had used one name for both, which cannot work. The split mirrors
  `@astryxdesign/cli` and `@astryxdesign/core`, and for the same reason: the thing you
  run and the thing you depend on release on different cadences.
- **Rules applied:** `app-agnostic-core` (the framework package holds nothing
  app-specific; the starter holds nothing framework-specific), `facade-owns-state`
  (`src/index.ts` is the entry, and the boundary rules enforce it),
  `kernel-dependency-free`, `verification-tier-preclassified`,
  `evidence-over-assertion`, `preflight-attested`.
- **Rejected alternatives:**
  - *Copying the framework source into every generated app*, as Toolcraft does with
    its 264-file runtime and 184-file UI. It is what makes their integrity signing
    possible, but it forks the framework into every app and Δ2's whole argument is
    least-custom-code. The starter depends on a published package instead. If signing
    is wanted later, vendoring is a decision we can still take; the reverse is not.
  - *Keeping `e2e` at the root.* The Δ1 invariants are framework-level, but proving
    them needs an app to render, and every generated app should carry the specs rather
    than trust the framework was tested once elsewhere. The suite moved with the
    starter; the root delegates through the workspace.
  - *One `starter/` path pattern in the registry.* It would conflate product code with
    the test suite — the same collision class as `src/app` matching `src/appcraft`.
    `starter/src/` routes to `starter`, `starter/e2e/` to `enforcement`.
  - *Per-package vitest and eslint configs.* One root config each covers both
    packages. The starter keeps its own Playwright config because it must run
    standalone once generated; nothing else must.
- **Evidence:**
  - `npm test` — exit 0 after the move. 24 script tests, 25 unit tests, 7 browser
    meta-gates, 12 fixture-gated specs skipped, no boundary violations across 22
    modules.
  - `check:preflight` rejected the first attestation, which declared
    `[kernel, enforcement, docs]`; a restructure touches every framework route and the
    gate said so. Declaring all eight was the fix, not widening the checker.
  - Route matching re-verified by hand after repointing:
    `packages/core/src/kernel/…` → `kernel`, `starter/src/app/…` → `starter`,
    `starter/e2e/…` → `enforcement`.
  - The registry initially left `starter/src/app` matching **no** route, which
    `check:preflight` would have read as "no route required" rather than as a gap. A
    `starter` route was added.
- **Risks:**
  - `packages/cli` does not exist yet; the layout anticipates it. Pass 4 must confirm
    that `prepare-pack` can assemble templates from `starter/` without a second copy
    of anything.
  - The starter declares `"@nsdesign/appcraft-core": "*"`, which the workspace
    resolves locally. A published starter needs a real version range, and the CLI must
    write it — a `*` escaping into a generated app would install nothing.
  - `starter/AGENTS.md` points at `docs/appcraft/*.md` documents that do not exist.
    App-axis document validation is off by design, so the generated contract currently
    routes agents to files the starter does not carry. Pass 4 must ship them.

### CLI scaffolder — `npx @nsdesign/appcraft create`

- **Result:** the scaffolder exists and works. `packages/cli` publishes as
  `@nsdesign/appcraft`, generating a standalone app that carries the contract, the
  route documents, the skills, the e2e suite, and a fresh worklog.
  - Transactional generation: staged in a sibling directory, validated, promoted by a
    single rename. A failure leaves no target.
  - `prepare-pack` copies `starter/` and `.agents/skills` into the package at pack
    time, so a published template cannot drift from its source and nothing is authored
    twice.
  - The starter now ships the fourteen `docs/appcraft/*` documents its own contract
    routes agents to, plus its own `decision-contract.md`.
  - `check:starter-docs` asserts every app-axis routed document exists in the starter
    and is not effectively empty — closing the gap left open in pass 3, where app-axis
    document validation was off by design and nothing caught a dangling route.
- **Rules applied:** `evidence-over-assertion`, `preflight-attested`,
  `verification-tier-preclassified`, `worklog-decision-trail`, `app-agnostic-core`,
  `astryx-before-custom-control` and `custom-control-justified` (both documented in
  the starter's control-selection and custom-controls routes),
  `transport-not-a-projection` (the timeline document states the split),
  `theme-tokens-not-literals` (stated in the starter contract and the style-guide
  document), `figma-structure-source-of-truth`.
- **Four defects that only running the CLI could find.** The thirteen unit tests
  passed while every one of these was live:
  1. The generated `tsconfig.json` extended `../tsconfig.base.json`, which exists in
     the monorepo and nowhere else. `npm run typecheck` failed immediately in a
     generated app.
  2. `e2e/appcraft-acceptance.spec.ts` read the decision contract from `repoRoot` —
     the directory *above* the app. A generated app has no repository above it.
  3. The manifest declared no `dev` script while the CLI told the user to run
     `npm run dev`. A scaffolder whose first instruction fails has spent the user's
     trust before they write a line.
  4. The starter relied on workspace-hoisted `@types/node`, `typescript` and
     `@playwright/test`; standalone, none resolved.
  Each is fixed, and three new regression tests now assert the class of failure rather
  than the instance: every printed `npm run <script>` must exist in the generated
  manifest, the generated tsconfig must not `extend`, and the suite must not mention
  `repoRoot`.
- **Rejected alternatives:**
  - *Depending on the `skills` npm package*, as Toolcraft does. Generation copies the
    skills into `.agents/skills` unconditionally, and `--agent` shells out to `npx
    skills add` only when asked. That removes a hard dependency and keeps the common
    path working when the network does not.
  - *Deleting the target directory under `--force`.* It merges instead, so a `.git`
    directory and anything the user already had survive.
  - *Caret-ranging the framework dependency.* `^0.1.0` permits `0.2.0`, and appcraft is
    pre-1.0 where a minor may break. Pre-1.0 versions are pinned exactly; a test
    asserts it.
  - *Staging in the OS temp directory.* `rename` is atomic only within a filesystem,
    and temp is often on another. Staging is a sibling of the target.
  - *Printing `npm run dev` anyway and adding a stub script.* A script that starts
    nothing is worse than not offering it. The CLI prints `npm run test`, which works.
- **A fifth defect, caught by the worklog gate on this very entry.** The starter's new
  contract states `theme-tokens-not-literals` as an invariant, and this pass relied on
  it — but the rule had never been added to the framework's own catalogue.
  `check:worklog` rejected the entry for citing an id the contract does not define.
  The rule is now in `docs/decision-contract.md`, levelled invariant by the
  catalogue's own derivation test: it is checkable without product knowledge.
- **Evidence:**
  - `node --test packages/cli/src/create.test.mjs` — 16 passed.
  - **The CLI was run end to end**, not just unit-tested:
    `node packages/cli/bin/appcraft.mjs create my-tool --yes --no-install` produced 37
    files. `npm install` then `npm test` inside that generated app passed: 7 browser
    meta-gates, 12 fixture-gated specs skipped — the same result the framework gets.
  - `npm test` at the root — exit 0. 24 script tests, 16 CLI tests, 25 unit tests,
    7 browser meta-gates, no boundary violations across 39 modules.
- **Risks:**
  - **A generated app cannot `npm install` today.** `@nsdesign/appcraft-core` is
    unpublished, so the dependency 404s. The end-to-end run above only completed after
    repointing that dependency at the local package. This is pass 7's work, not a
    defect, but until then the CLI produces an app nobody else can install.
  - `prepare-pack` has never run in a real `npm pack`. The packaged layout is asserted
    by `resolveTemplateSources` and exercised only through the repo path; the packaged
    path is untested until pass 7.
  - The starter still renders no surface graph, so the twelve invariant specs skip in
    every generated app exactly as they do here. A user's first `npm test` is green
    with twelve invariants unproven, which the contract states but a hurried reader
    will miss.

### Style-guide route — an interactive picker, and the checkers that make it matter

- **Result:** the first build request now agrees the app's style rather than assuming
  it, and the agreement is enforced.
  - `.agents/skills/style-guide/SKILL.md` — the eighth skill. Runs after the user
    describes the app and before any code is written.
  - `starter/tools/style-guide/index.html` — a self-contained interactive picker,
    shipped into every generated app. Eight dials; a live specimen rendering the
    appcraft archetypes (master-detail, canvas, inspector) in the theme being chosen;
    independent light/dark preview; emits a `defineTheme` snippet, a JSON payload, and
    a downloadable `style-guide.json`.
  - `scripts/check-style-guide.mjs` — if `src/app/theme.ts` exists, `docs/style-guide.md`
    must record all eight properties and the Astryx version they were chosen against.
  - `theme-tokens-not-literals` enforced by an ESLint `no-restricted-syntax` block over
    `starter/src/app`: hex literals, colour functions, `fontFamily` and `fontSize`
    literals are errors.
- **Rules applied:** `theme-tokens-not-literals`, `figma-variables-to-tokens`,
  `evidence-over-assertion`, `verification-tier-preclassified`, `preflight-attested`,
  `worklog-decision-trail`, `layout-archetypes-only` (the specimen renders the curated
  archetypes and nothing else).
- **Rejected alternatives:**
  - *A generic component gallery as the preview.* It would preview the tokens without
    previewing the decision. The specimen renders the archetypes the user is about to
    compose, so the question being answered is visible.
  - *Giving the picker its own visual identity.* The chrome is deliberately achromatic
    — the only saturated colour on screen is the accent being chosen. A tool that
    imposes its own hue makes every preview a lie.
  - *Reproducing Astryx's HCT derivation.* Not feasible without the library, and
    pretending otherwise would be worse than approximating openly. The picker derives
    in OKLCH and states plainly that `astryx theme build` is authoritative.
  - *Asking motion.* The base theme's durations are coherent with its palette, and a
    user forming an opinion about easing on first contact is rare enough that asking
    costs more than it returns. Eleven questions to get eight useful answers is how an
    interview becomes a thing users skip.
  - *Bundling the fixture app into this pass.* Unskipping the twelve browser specs
    needs the whole Δ2 substrate — React, Vite, Astryx, StyleX. Two changes at once.
  - *Recording only the answers the user changed.* A default that was chosen and a
    question that was never asked look identical afterwards. The record carries all
    eight, and `check:style-guide` fails without them.
- **Evidence:**
  - Colour derivation tested by extracting the module and running it under node:
    hex → OKLCH → hex round-trips with **zero** channel drift across seven colours
    including pure black and white; warm and cool neutrals differ; standard and high
    contrast differ; a pale accent (`#FFE066`) correctly flips its foreground to dark.
  - `node --check` on the extracted module — syntax clean.
  - `check:style-guide` negative-tested across four states: theme without a record,
    partial record (named the five missing properties), complete record without an
    Astryx version, and complete. Each failed or passed as intended.
  - The ESLint rule reported all three violations in a probe file — hex, family, size.
  - `npm test` — exit 0. 24 script tests, 16 CLI tests, 25 unit tests, 7 browser
    meta-gates, 39 modules clean.
- **Risks:**
  - **The picker has never been rendered in a browser.** Chromium in this environment
    does not match the pinned Playwright build, so it is verified structurally and
    through its extracted maths. Layout and interaction bugs would not have been
    caught. It needs a real look before anyone relies on it.
  - The OKLCH approximation will diverge from Astryx's HCT output. The page says so,
    but a user comparing the preview to the built theme will still see a difference.
  - `check:style-guide` matches property names as substrings of the record, so a
    document mentioning "contrast" in prose satisfies that row without recording a
    decision. It catches omission, not evasion.
  - The eight properties are drawn from Astryx `0.1.8`. If the `defineTheme` surface
    moves, the picker and the skill drift together and nothing detects it.
