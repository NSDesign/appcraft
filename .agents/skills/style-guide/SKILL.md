---
name: style-guide
description: Use on the first build request, before implementation, to agree the app's base style properties instead of choosing them silently.
---

# appcraft Style Guide

Run this **after** the user describes the app and **before** you write code. The app's
purpose is known by then, so the questions can be informed by it; nothing has been
built, so the answers cost nothing to apply.

Do not pick a palette or a typeface on the user's behalf without asking.

## Two ways to collect the answers

Offer the visual tool first. Most people cannot judge a hex value or a scale ratio
from its name.

1. **The picker** — `tools/style-guide/index.html`. Open it in a browser (or serve it
   from GitHub Pages). It renders a live specimen of the appcraft archetypes —
   master-detail, canvas, inspector — in the theme being chosen, in light and dark,
   and emits a `defineTheme` snippet plus a `style-guide.json`. Ask the user to paste
   either back.
2. **In conversation** — the same nine properties, asked directly. Faster for a user
   who already knows what they want.

Either way the recorded answers are identical. The picker is a nicer way to reach
them, not a different decision.

## The nine properties

| Property | Options | Astryx config |
|---|---|---|
| Base theme | `neutral` (default) · butter · chocolate · gothic · matcha · stone · y2k · none | `extends` |
| Accent colour | a hex, or the base theme's | `color.accent` |
| Neutral temperature | neutral (default) · warm · cool | `color.neutralStyle` |
| Contrast | standard (default) · high | `color.contrast` |
| Base typeface | the base theme's (default) · a family | fills both below |
| Heading typeface | **inherits the base** (default) · a family | `typography.heading` |
| Body typeface | **inherits the base** (default) · a family | `typography.body` |
| Base size and ratio | 16 px / 1.2 (default) | `typography.scale` |
| Corner radius | 4 px (default) | `radius` |

Every one has a real default, so "keep the defaults" is a single answer.

**Typefaces cascade.** Set the base once and heading and body both take it; override
either without repeating yourself. Astryx has no "base" family — it is a convenience of
the interview, so the emitted theme carries the **resolved** `typography.body` and
`typography.heading` rather than a fallback chain a later reader has to reconstruct.

Offer the catalogue rather than asking for a name from memory. A misremembered family
falls back silently and the preview then lies about the choice.

**Motion is not asked.** The base theme's durations are coherent with its palette, and
a user forming an opinion about easing on first contact is rare enough that asking
costs more than it returns. `astryx docs motion` covers it for anyone who wants it.

## Process

1. Read `docs/appcraft/style-guide.md`.
2. Offer the picker. If the user prefers to answer directly, ask the nine in one
   message rather than one at a time.
3. Check the accent's contrast against the derived background. If it fails, say so and
   offer the corrected value — that is a question the user cannot answer and the tool
   can.
4. Write `src/app/theme.ts` as a `defineTheme` call carrying **only** what differs from
   the base theme.
5. Write `docs/style-guide.md` recording every property — **including those left at
   default** — and the `@astryxdesign/core` version they were chosen against.
6. Run `astryx theme build` and wire the output into the app shell.
7. Continue the build.

## appcraft Rule

`theme-tokens-not-literals` is an invariant. Product code reads Astryx tokens; it never
hard-codes a colour, font-family or font-size. Without it the interview produces a
theme the app then ignores, which is worse than not asking — the user answered
questions that changed nothing.

Record the Astryx version with the answers. Astryx is pre-1.0 and its token surface may
move; a later reader must be able to tell "the user chose this" from "the token meaning
changed underneath it".
