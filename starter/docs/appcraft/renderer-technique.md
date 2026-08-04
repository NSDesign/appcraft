# Renderer Technique

For canvas output and visual technique.

## Declare the technique before writing it

Name the passes, what each consumes, where it executes, and what invalidates it. A
renderer whose invalidation is implicit will either over-render or show stale output,
and you will not be able to tell which from the code.

## Interaction-time behaviour

Suspend expensive animation during interaction. A drag that competes with a running
animation loop produces jank that looks like a performance problem in the wrong place
entirely.

## The canvas is product output

A canvas surface renders product output and nothing else. No buttons, inputs,
dialogs, CTA copy, helper text, or upload prompts — those belong to inspector or
tabbed-section surfaces. Text inside a canvas must be marked
`data-appcraft-product-output`, which is what lets the browser suite tell product
output from app chrome that leaked in.

Editor overlays — handles, guides, selection outlines — are the exception, and they
are visual geometry rather than controls.

## Derived state

Tessellations, preview renders, and offscreen buffers are `derived` class. They are
evicted when their branch deactivates and rebuilt on activation. Do not cache them
outside the envelope to "avoid the rebuild" — that is how a 500-layer document runs
out of memory.
