/**
 * `@nsdesign/appcraft-core` — the framework's public entry.
 *
 * Product code imports from here, never from a subpath inside the package.
 * `app-uses-public-api-only` is the rule, and it is what lets the internals move
 * (schema, store, surfaces, controls are all still to come) without breaking a
 * generated app.
 *
 * The CLI is a separate package, `@nsdesign/appcraft`. This one is the library the
 * generated app depends on.
 */
export * from "./kernel/index";
