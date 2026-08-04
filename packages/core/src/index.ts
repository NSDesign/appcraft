/**
 * `@nsdesign/appcraft-core` — the framework's public entry.
 *
 * Product code imports from here, never from a subpath inside the package
 * (`app-uses-public-api-only`).
 *
 * **Two levels, one name.** The kernel and the store both have a `select`: the kernel's
 * takes an envelope, the store's takes a store. Product code wants the store's, so that
 * is what this entry exports. The kernel's envelope primitives remain available on
 * `@nsdesign/appcraft-core/kernel` for framework-level work — which is the honest
 * layering rather than a rename that would make one of them read oddly at its own level.
 */
export {
  CURRENT_ENVELOPE_VERSION,
  activate,
  createProjection,
  derivedFields,
  evictDerived,
  hasDerivedState,
  materialise,
  persistedFields,
  readActive,
  readBranch,
  retainedFields,
  retainedKeys,
  stripDerived,
  toExport,
  toPersistable,
  writeActive,
  type BranchInitialiser,
  type FieldClass,
  type FieldClassification,
  type Projection,
} from "./kernel/index";

export * from "./store/index";
export * from "./surfaces/index";
