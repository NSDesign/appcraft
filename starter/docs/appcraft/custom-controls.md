# Custom Controls

For controls Astryx does not cover. Colour is the common case: Astryx ships **zero**
colour components, and a data-visualisation tool needs scales while a paint tool needs
swatches — which is exactly why colour is a seam rather than framework core.

## Before writing one

State plainly, in the worklog, why composition failed:

- Which Astryx components were considered, and what they could not do.
- Whether composing primitives (rather than replacing them) was tried.
- What accessibility behaviour you are now responsible for that Astryx would have
  provided.

`custom-control-justified` is an escape hatch. Escape hatches require an explanation
and stronger coverage, not silence.

## Building one

- Compose from Astryx primitives; do not start from a bare `<div>`. Focus management,
  keyboard interaction, and token wiring come free that way.
- Style with StyleX and theme tokens. `theme-tokens-not-literals` applies here more
  than anywhere — a custom control is where hard-coded hex values usually enter.
- If it has modes, declare them as a projection. A custom control is not an excuse to
  hand-roll variant state.
- Buffering and clamping live in the binding facade, not in the control.

## Coverage

A custom control needs browser coverage for the interaction it exists to provide, plus
the standard projection invariants if it carries branches. Unit-testing its render
output proves that it renders, which was never in doubt.
