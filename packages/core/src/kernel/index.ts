/**
 * The kernel's public surface.
 *
 * Dependency-free by invariant (`kernel-dependency-free`): nothing here imports the
 * store, surfaces, controls, Astryx, Jotai, Zod, Immer or React. That is what keeps
 * the spine signable and checkable while the libraries underneath stay replaceable.
 */
export {
  CURRENT_ENVELOPE_VERSION,
  activate,
  createProjection,
  evictDerived,
  materialise,
  readActive,
  readBranch,
  retainedKeys,
  select,
  toExport,
  toPersistable,
  writeActive,
  type BranchInitialiser,
  type Projection,
} from "./projection";

export {
  derivedFields,
  hasDerivedState,
  persistedFields,
  retainedFields,
  stripDerived,
  type FieldClass,
  type FieldClassification,
} from "./field-class";
