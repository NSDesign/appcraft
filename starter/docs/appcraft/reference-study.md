# Reference Study

The route for "port this", "match this tool", or any request anchored to an existing
application.

## Process

1. **Inventory the features**, grouped by product meaning rather than by UI component
   type. "Everything that edits a layer" is a group; "all the sliders" is not.
2. **Inventory the relationships.** This is the half a flat feature list misses, and
   the half appcraft depends on. For each: what selects what?
3. **Ask the retention question of every discriminant** — *does the reference retain
   state when this switches?* Switch a mode, type a value, switch away, switch back.
   Record what happened.
4. Map each relationship onto a scale: field, collection, panel, or viewmodel.
5. Record what you will **not** port, and why.

## Why step 3 is mandatory

The reference's answer is a *finding*, not a specification. appcraft retains
regardless — `retain-inactive-branches` is an invariant. But knowing whether the
reference retained tells you whether users of that tool have been trained to expect
loss, which changes what you say in the UI, not what the engine does.

Toolcraft's own `StyledModeField` resets on mode change. A study that recorded "resets"
and then reproduced it would port a bug as a requirement.

## Screenshots

Use them for final visual QA only. A screenshot cannot show you a relationship, and a
relationship is what you are here to find.
