# Control Selection

## Order of preference

1. **Astryx, as shipped.** Compose with props and `xstyle`. Codemods apply cleanly and
   upgrades stay close to free.
2. **Astryx primitives, composed into something new.** The right move for controls
   Astryx has no component for — colour in particular, since it ships none.
3. **Swizzled Astryx source.** `astryx swizzle` copies a component into the app so you
   own it. This is a **per-component fork**: upstream fixes and accessibility
   corrections stop arriving, and every upgrade becomes a merge you perform. Requires
   written justification under `custom-control-justified`.

`astryx-before-custom-control` is a default, not a suggestion. Run
`npx @astryxdesign/cli search <thing>` before concluding nothing fits.

## Grouping

Group controls by **product entity or workflow stage**, not by component type. A panel
organised as "all the sliders, then all the toggles" tells the user nothing about
their document.

## Compound and variant controls

A control with mutually exclusive modes is a declared field-scale projection
(`compound-controls-declared`), not a hand-rolled component with its own state. If you
find yourself writing buffering, clamping, or commit-on-release inside a control, that
logic belongs in the binding facade (`buffer-commit-in-facade`) — otherwise every
control reimplements it slightly differently and one of them resets on switch.
