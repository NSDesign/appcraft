# Plan — `npx @nsdesign/appcraft create` and the style-guide interview

**Status:** for review · **Date:** 2026-07-27
**Routes:** `enforcement`, `docs`, later `schema` / `surfaces` / `controls`

Two capabilities, planned together because the second runs inside the workflow the
first installs.

1. **Scaffolder.** `npx @nsdesign/appcraft create my-app` generates an app that
   carries appcraft's contract, skills and checkers, so the user opens it in Claude
   Code and prompts for the app they want.
2. **Style-guide interview.** After that first build prompt, the agent asks the
   user for the app's base style properties instead of silently taking defaults,
   writes an Astryx theme from the answers, then continues the build.

---

## 0. What Toolcraft actually does, and one correction

Read from `@pixel-point/toolcraft@0.0.15` (741 files), not inferred.

**Toolcraft does not support `npm create`.** It is invoked as
`npx @pixel-point/toolcraft create`. `npm create X` resolves to package `create-X`
and `npm create @scope/x` to `@scope/create-x`; neither exists for Toolcraft. We
adopt the same npx form — decided.

Package shape:

```
bin/toolcraft.mjs               → src/cli.mjs
bin/create-toolcraft-app.mjs    → src/cli.mjs with "create" prepended
src/*.mjs                       CLI: options, generation, transaction, integrity,
                                import rewriting, package.json synthesis
templates/starter/              240 files — the generated app
templates/runtime/              264 files — the signed runtime, copied in
templates/ui/                   184 files — the control library, copied in
toolcraft-skills/               the six skills
```

Dependencies: `@clack/prompts`, `cross-spawn`, `skills`.

Three properties worth carrying over, and one worth dropping:

- **Transactional generation.** Assemble in a sibling staging directory, validate
  there, promote with an atomic rename. A failed generation leaves no target and
  never half-migrates an existing folder. **Carry over.**
- **Skills installed into the agent, not just the repo.** `skills add <dir>` with
  `--agent`, `--global`, `--copy`. **Carry over** — it is why the workflow fires in
  Claude Code without the user configuring anything.
- **Templates assembled at pack time.** `prepack` copies the monorepo's real source
  into `templates/`, so the published template cannot drift from the framework it
  came from. **Carry over** — this is what makes the framework and the starter the
  same code.
- **Package-manager detection across npm and pnpm.** **Drop** — npm only (§6). The
  detection code stays, reduced to refusing clearly rather than guessing.
- **Templates carrying the whole control library.** 184 files of UI. **Drop** — Δ2
  replaces it with Astryx. Our `templates/ui` equivalent does not exist; the starter
  depends on `@astryxdesign/core` instead.

## 1. Repository shape

`NSDesign/appcraft` becomes the publisher. Today it is shaped like a generated
output; the change is to move the current tree down one level and add the CLI beside
it.

```
appcraft/
  packages/
    core/                @nsdesign/appcraft-core — the framework library
      src/{kernel,schema,store,surfaces,controls}
      src/index.ts       the public entry product code imports
    cli/                 published as @nsdesign/appcraft — the scaffolder
      bin/appcraft.mjs
      bin/create-appcraft-app.mjs
      src/*.mjs
      scripts/prepare-pack.mjs
      templates/         ← generated at pack time, gitignored
      appcraft-skills/   ← generated at pack time from /.agents/skills
  starter/               the generated app skeleton
    AGENTS.md  docs/  e2e/  src/app/  index.html  package.json …
  .agents/skills/        source of truth for the skills
  docs/                  design documents, contract, verification
  scripts/               the checkers
```

**Single source of truth, in both directions.** `prepare-pack.mjs` copies `starter/`
→ `templates/starter` and `.agents/skills` → `appcraft-skills/`. Nothing is authored
twice, and a `check:pack-parity` script asserts the copy is current so a stale
template cannot publish.

**The framework is depended on, not copied.** Unlike Toolcraft, which vendors 264
runtime files plus 184 UI files into every generated app, the starter carries a
`@nsdesign/appcraft-core` dependency. That is what makes `templates/ui` unnecessary
and keeps generated apps upgradeable rather than forked. The cost is that there is no
copied source to sign, so integrity signing stays a phase-two decision — and
vendoring later is still open, while un-vendoring would not be.

**Migration cost (done, pass 3).** `src/appcraft` → `packages/core/src`;
`src/app`, `e2e`, and the generated-app half of `docs/` → `starter/`. The checkers
and design docs stay at the root. `.dependency-cruiser.cjs`, `eslint.config.js`,
`tsconfig.json`, `vitest.config.ts` and `playwright.config.ts` need their paths
updated, and the starter gets its own copies. This is mechanical but touches every
config, so it wants its own pass and its own tier-4 attestation.

## 2. The CLI

```bash
npx @nsdesign/appcraft create my-app          # interactive
npx @nsdesign/appcraft create my-app --yes    # scripted
npx @nsdesign/appcraft create --no-skills --no-install
```

Flags follow Toolcraft's, which agents and users already know: `--name`, `--yes`,
`--force`, `--no-install`, `--no-skills`, `--agent <name>`, `--global`, `--copy`,
`--all`.

Steps, in order:

1. Resolve options; prompt for anything missing via `@clack/prompts`.
2. Generate transactionally into a staging sibling; validate there with
   `check:docs`, `check:skills` and the starter's own typecheck; promote by rename.
3. Install dependencies with npm. The CLI reads `npm_config_user_agent` only to
   detect a *different* manager and say so plainly — npm is the supported manager
   (§6), and silently generating pnpm- or bun-flavoured commands we do not test would
   be worse than declining.
4. `astryx init` in the generated app — it installs `@astryxdesign/core`, sets up
   theming, and adds agent docs, so we do not reimplement any of that.
5. `skills add <appcraft-skills> --agent claude-code` (unless `--no-skills`).
6. Print next steps: `cd my-app`, `npm run dev`, and the suggested first prompt.

**Deliberately not built now:** signed integrity manifests and import rewriting.
Toolcraft needs both because it copies a runtime into every app; appcraft's starter
depends on published packages instead, so there is no copied source to sign until we
decide to vendor one. Phase two, per the enforcement rollout.

## 3. What the generated app must carry

This is where the review found the real gap. The current routing table has seven
**architecture-layer** routes — `kernel`, `schema`, `store`, `surfaces`, `controls`,
`enforcement`, `docs` — which route work *on the framework*. A user who has just run
`create` types "build me an app that…", and there is no row for that. Nine of the
delta map's eleven **task** routes have no row: reference study, control selection,
renderer technique, timeline, layers, export/media, debugging, Figma implementation,
app assembly.

The generated app therefore needs its own routing table on the task axis. Both
tables must come from **one route registry** (`docs/routes.json`), with `AGENTS.md`
tables generated from it — the delta map requires this explicitly so the two cannot
drift, and it is the last ADOPT+ improvement still outstanding on the routing
mechanism.

Proposed generated-app routes, each mapping to design-doc sections and the skills:

| Route id | Fires on | Scale |
|---|---|---|
| `app-assembly` | "build an app that…", adding a surface | panel |
| `reference-study` | "port this", "match this tool" | — |
| `app-schema` | entities, fields, variants, persistence | field/collection |
| `style-guide` | first build prompt; theme changes | — |
| `control-selection` | choosing Astryx components for a section | field |
| `custom-control` | a control Astryx does not cover | field |
| `collections` | layers, lists, ordering, filtering | collection |
| `timeline` | tracks and keys (structure), transport (sampler) | collection |
| `renderer` | canvas output, visual technique | — |
| `export` | copy, download, media, background | — |
| `debugging` | any failure | — |

`style-guide` is a route, not only a skill, so `check:preflight` can require it to be
declared on the pass that first writes a theme.

## 4. The style-guide interview

Runs **in the agent, after the first build prompt** — decided. Sequenced between
`brainstorming` and `writing-plans`: the app's purpose is known, so the questions can
be informed by it, and no code has been written yet.

### 4.1 It delegates to Astryx

Astryx already documents and tooled this; we do not reimplement it. From
`@astryxdesign/cli@0.1.8` and `astryx docs theme`:

| `defineTheme` config | Parameters | Generates |
|---|---|---|
| `color` | `accent` (hex), `neutralStyle` (warm/cool/neutral), `contrast` (standard/high) | `--color-accent`, `--color-background-*`, `--color-text-*`, `--color-border` |
| `typography.scale` | `base` (px), `ratio` | `--text-heading-*-size/weight/leading`, `--text-body-*` |
| `typography.body` / `heading` / `code` | `family`, `fallbacks`, `url`, `weight` | `--font-family-body/heading/code` |
| `radius` | `base` (px), `multiplier` (0–2) | `--radius-inner/element/container/page/chat` |
| `motion` | `fast`/`medium` (ms), `ratio`, `easing` | `--duration-*` |

Also available and used: `extends` from seven published themes (neutral, butter,
chocolate, gothic, matcha, stone, y2k), `[light, dark]` value tuples, and
`astryx theme build` to compile a `defineTheme` file to static CSS + JS + `.d.ts`.

The colour config derives a full palette from one accent hex via HCT, which is why
the interview can be short and still produce a coherent result.

### 4.2 The questions

Seven, each with a default that is a real answer, so "default to everything" is one
keystroke and never a silent choice.

| # | Question | Options | Writes |
|---|---|---|---|
| 1 | Start from a base theme? | `neutral` (default) · butter · chocolate · gothic · matcha · stone · y2k · none | `extends` |
| 2 | Accent colour | hex, or keep the base theme's | `color.accent` |
| 3 | Neutral temperature | neutral (default) · warm · cool | `color.neutralStyle` |
| 4 | Contrast | standard (default) · high | `color.contrast` |
| 5 | Body typeface | base theme's (default) · a named family + fallbacks | `typography.body` |
| 6 | Heading typeface | same as body (default) · a named family | `typography.heading` |
| 7 | Base font size and scale ratio | 16 px / 1.2 (default) | `typography.scale` |

Radius and motion are **not** asked. They are visible but rarely what a user has an
opinion about on first contact, and the base theme's values are coherent with its
palette; the skill mentions that `astryx docs theme` covers them for anyone who
wants to change them later. Asking eleven questions to get seven useful answers is
how an interview becomes a thing users skip.

Accessibility is checked rather than asked: if a chosen accent fails contrast against
the derived background, say so and offer the corrected value — a question the user
cannot be expected to answer but the tool can.

### 4.3 What it produces

- `src/app/theme.ts` — a `defineTheme` call, only the tokens that differ from the
  base, so the file reads as the delta the user actually chose.
- `docs/style-guide.md` — the answers in prose, including the ones left at default,
  so a later pass knows what was decided rather than merely inherited.
- `astryx theme build` output, wired into the app shell.
- A worklog decision-trail entry citing `figma-variables-to-tokens` when a Figma file
  seeded any answer.

### 4.4 Enforcement

A capability with no checker is a suggestion. Three, all cheap:

1. `check:style-guide` — if `src/app/theme.ts` exists, `docs/style-guide.md` must
   exist and record every one of the seven properties, default or chosen.
2. A new contract rule `theme-tokens-not-literals` (level: invariant) — product code
   must not hard-code colour, font-family or font-size literals; it reads Astryx
   tokens. Checkable without product knowledge, so invariant by the contract's own
   derivation test. Enforced by an ESLint rule over `src/app`.
3. An e2e row asserting the rendered app uses the declared accent, so "the theme was
   written" and "the theme is in effect" are not confused.

Rule 2 is the one that matters: without it the interview produces a theme the app
then ignores, which is worse than not asking.

## 5. Sequencing

The scaffolder is not useful until there is something to scaffold. Field-scale
implementation stays first.

| # | Pass | Tier | Blocked by |
|---|---|---|---|
| 1 | Field-scale kernel + `StyledModeField` fixture | 3 | — |
| 2 | Route registry; generate both `AGENTS.md` tables from it | 2 | — |
| 3 | Monorepo restructure into `packages/` + `starter/` | 4 | 1 |
| 4 | CLI: options, transactional generate, install, skills | 2 | 3 |
| 5 | `style-guide` skill + route + `docs/style-guide.md` | 2 | 2 |
| 6 | `check:style-guide`, `theme-tokens-not-literals`, e2e row | 2 | 5 |
| 7 | Publish `@nsdesign/appcraft`, verify `npx` end to end | 4 | 4, 6 |

Passes 2 and 5 do not depend on the restructure and can run early; 3 is the
disruptive one and wants to land alone.

## 6. Settled

- **Package name — `@nsdesign/appcraft`.** The npm account username is `nsdesign`,
  and npm reserves the scope matching a username, so `@nsdesign` needs no claiming.
  First publish still needs `--access public`: scoped packages default to private and
  the first publish otherwise fails asking for a paid plan.
- **Publishing — GitHub Actions with OIDC trusted publishing.** The npm account is
  linked to the GitHub account of the same name, so the release workflow can mint a
  short-lived token per run instead of storing a long-lived `NPM_TOKEN` secret. This
  is how Astryx publishes its own packages — their npm metadata shows the publisher as
  GitHub Actions with a trusted-publisher OIDC config. It also means provenance
  attestation comes free, which matters for a package whose whole pitch is
  verifiability.
- **Package manager — npm only.** Not pnpm, yarn, or bun. The CLI still reads
  `npm_config_user_agent`, but only to fail helpfully if launched through another
  manager, rather than to generate flavoured commands. The starter ships no lockfile
  and the install step generates `package-lock.json`.
- **Astryx usage — composition, not swizzling** (working direction, see below).

## 7. Open questions

### Astryx version pinning

Astryx is `0.1.8` and pre-1.0, so under semver a **minor bump may break** —
`^0.1.8` permits `0.2.0` and is not a safe range. Astryx clearly expects churn: the
CLI ships `astryx upgrade` with codemods and `--from`/`--to`, error codes
`ERR_VERSION_DETECT` and `ERR_INVALID_VERSION`, and an `astryx doctor` with a
CI-friendly exit code.

Three questions, in the order they should be researched:

1. **Is there a published stability or 1.0 commitment?** This decides pin-exact
   versus trust-a-caret, and nothing else can be settled before it.
2. **Do codemods cover swizzled source, or only unswizzled call sites?** This is the
   actual price of the composition-versus-swizzle decision below, and it is currently
   assumed rather than known.
3. **Does `defineTheme`'s token surface change across minors?** A theme built under
   one Astryx version and silently rebuilt under another is the failure mode that
   would quietly break the style-guide feature — the tokens would still compile, and
   the app would just look different.

Working hypothesis, to be confirmed rather than assumed: **pin exact in the starter,
and record the generated-against version in the app** so `astryx upgrade --from` has a
truthful starting point.

### Composition versus swizzling

Astryx offers two ways to build on its primitives, with very different long-run costs:

- **Compose** — use components as shipped, styled through props and `xstyle`.
  Codemods apply cleanly and upgrades are close to free.
- **Swizzle** — `astryx swizzle` copies a component's source into the repository so
  you own it. Full control, but it is **a per-component fork**: upstream fixes,
  accessibility corrections and behaviour changes stop arriving for that component,
  and every Astryx upgrade becomes a merge you perform. Not a fork of Astryx as a
  whole — only of the components you eject — but the maintenance shape is a fork's.

**Direction: compose.** Swizzling is the escape hatch, not the default. This is
already how the contract is levelled — `astryx-before-custom-control` is a *default*
and `custom-control-justified` is an *escape-hatch* requiring written justification
and stronger coverage.

The open part is **policy, not architecture**: which creative controls justify
ejecting, and who carries the upgrade cost when they do. Colour is the obvious
pressure point, since Astryx ships zero colour components — but that argues for
composing new controls *on top of* Astryx primitives rather than swizzling existing
ones, which is a different move and cheaper.

The delta map already anticipated the architecture side: *"Signable surface now
includes swizzled Astryx source."* So if swizzling is chosen for a given control, the
integrity mechanism is ready for it. Question 2 above is what prices the decision.

### Consequence for the style-guide interview

If question 3 resolves badly — tokens moving across minors — the interview needs to
record the Astryx version alongside the answers in `docs/style-guide.md`, so a later
rebuild can tell "the user chose this" from "the token meaning changed underneath it".
Cheap to add now, expensive to reconstruct later, so the field goes in regardless.
