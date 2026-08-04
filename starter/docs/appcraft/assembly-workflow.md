# Assembly Workflow

The route for "build an app that…" and for adding or wiring a surface.

## Order

1. **Understand the product.** What is the visible output? What can the user edit?
   What are the relationships between the things on screen?
2. **Run the style guide** (`style-guide` route) if this is the first build request.
   Ask before choosing a palette or a typeface.
3. **Find the discriminants.** For each relationship, ask what selects the active
   branch — a variant tag, a selected item id, an active tab, an app mode. Each answer
   is the same primitive at a different scale.
4. **Declare the schema** (`app-schema` route), classifying every field.
5. **Declare the surfaces.** Pick archetypes and configure them; never hand-compose.
6. **Bind and verify.** Coverage per the tier you pre-classified.

## Declaring surfaces

```ts
defineAppcraft({
  schema,      // document schema, including projection nodes
  surfaces,    // panels, regions, canvases, inspectors — declared
  layout,      // archetype composition
  bindings,    // surface ↔ schema path, including discriminant sources
  actions,     // cross-surface commands
})
```

Four archetypes, and no others: `master-detail`, `tabbed-section`, `canvas`,
`inspector`. Free-form layout is not permitted — it reopens the design space the
archetypes exist to close.

**Master-detail is not a mechanism.** It is the primitive at panel scale: one surface
supplies the discriminant, another projects the active branch. Tabbed sections are a
closed projection at the same scale. Recognising this is the difference between
configuring one thing and building three.

## The scope test

Before adding anything to the app's shared layer, ask: *would a different app need
something else here?* Yes means it belongs to this app, not to a shared abstraction.
