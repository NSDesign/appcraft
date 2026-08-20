# Export

Copy, download, media, background, multi-artifact output.

## The invariant

**Export reads the active projection only.** Retained inactive branches are user
data — they are persisted, they are diffable, and they must never appear in output.

This is easy to get wrong in exactly one way: reaching for the envelope's `branches`
when building an export payload, because it is right there and it has everything. It
has too much. Use the active-value accessor.

## Coverage

The browser suite proves this by authoring a distinctive marker into one branch,
switching away, exporting, and asserting the marker is absent. Any new export path
needs the same shape of test — a leak is invisible until someone opens the file.

## Editor overlays

Handles, guides, and selection outlines are editor chrome. They must not appear in
exported output, and exporting must not disturb them on screen.

## Multiple artifacts

When an app exports several artifacts, each is a separate declared path with its own
coverage. Do not fan out from one exporter with a mode flag — a mode flag on an
exporter is a discriminant, and if it is one it should be declared as one.
