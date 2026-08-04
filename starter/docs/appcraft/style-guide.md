# Style Guide

Runs on the **first build request**, before implementation. The user is asked for the
app's base style properties rather than having them chosen silently.

## Offer the picker first

`tools/style-guide/index.html` — open it in a browser, or serve it from GitHub Pages.
It renders a live specimen of the archetypes you are about to compose (master-detail,
canvas, inspector) in the theme being chosen, in light and dark, and emits a
`defineTheme` snippet plus a `style-guide.json`. The user pastes either back.

Most people cannot judge a hex value or a scale ratio from its name. Asking in
conversation is the fallback for someone who already knows what they want, not the
default.

The picker approximates Astryx's palette derivation in OKLCH so a choice can be judged
quickly. `astryx theme build` produces the authoritative values via HCT — close, not
identical. Say so rather than presenting the preview as final.

## The questions

Seven. Every one has a real default, so "all defaults" is one answer.

| # | Question | Options | Writes |
|---|---|---|---|
| 1 | Base theme | `neutral` (default) · butter · chocolate · gothic · matcha · stone · y2k · none | `extends` |
| 2 | Accent colour | a hex, or the base theme's | `color.accent` |
| 3 | Neutral temperature | neutral (default) · warm · cool | `color.neutralStyle` |
| 4 | Contrast | standard (default) · high | `color.contrast` |
| 5 | Body typeface | the base theme's (default) · a family + fallbacks | `typography.body` |
| 6 | Heading typeface | same as body (default) · a family | `typography.heading` |
| 7 | Base font size and scale ratio | 16 px / 1.2 (default) | `typography.scale` |

| 8 | Corner radius | 4 px (default) | `radius.base` |

**Motion is not asked** — the base theme's
durations are coherent with its palette, and a user forming an opinion about easing on
first contact is rare enough that asking costs more than it returns.

Astryx derives a full palette from one accent hex via HCT, which is why seven
questions suffice.

## What it produces

- `src/app/theme.ts` — a `defineTheme` call carrying **only** what differs from the
  base, so the file reads as the delta the user actually chose.
- `docs/style-guide.md` — the answers in prose, **including those left at default**,
  plus the Astryx version they were chosen against. A later rebuild must be able to
  tell "the user chose this" from "the token meaning changed underneath it".
- Compiled CSS via `astryx theme build`, wired into the app shell.

## Accessibility is checked, not asked

If a chosen accent fails contrast against the derived background, say so and offer the
corrected value. That is a question the user cannot be expected to answer and the tool
can.

## The rule

`theme-tokens-not-literals` is an invariant. App code reads Astryx tokens; it never
hard-codes a colour, font-family or font-size. Without it the interview produces a
theme the app then ignores, which is worse than not asking.
