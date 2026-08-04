/**
 * The projection envelope — appcraft's spine.
 *
 *   A discriminant selects an active projection. Inactive branches retain their own
 *   authored state. Derived state is materialised only for the active branch.
 *
 * One primitive at four scales. This module is field scale, but nothing here is
 * field-specific: the same envelope carries a variant control, a layer list, a
 * tabbed panel and a viewmodel graph. Later scales add key provenance and ordering,
 * not new semantics.
 *
 * Everything is pure. Operations return a new envelope and never mutate the input,
 * because undo history holds references to prior envelopes — mutating one would
 * rewrite the past.
 *
 * The envelope is appcraft-owned and dependency-free. Zod, Jotai and Immer sit
 * *beneath* the facade, so the checkers assert against this shape rather than
 * against a third party's internals.
 */
import { type FieldClassification, hasDerivedState, stripDerived } from "./field-class";

/**
 * The retention envelope. Distinct from the *active value*, which is what app logic
 * reads, what export serialises, and what validation gates on.
 *
 * Conflating the two is the failure this separation exists to prevent: if retained
 * branches lived inside the validated value, a range branch holding an invalid
 * min/max would reject the whole document while the user is editing a fixed value.
 */
export interface Projection<K extends string, S> {
  /** The discriminant: which branch is active. */
  readonly active: K;
  /** Retained branches, lazily initialised. Inactive branches keep their state. */
  readonly branches: Readonly<Partial<Record<K, S>>>;
  /** Key order. Open projections only (collection scale); unused when closed. */
  readonly order?: readonly K[];
  /** Envelope format version. Migrations run forward on load. */
  readonly version: number;
}

/** Builds a branch's initial value. Called lazily, on first read of that branch. */
export type BranchInitialiser<K extends string, S> = (key: K) => S;

export const CURRENT_ENVELOPE_VERSION = 1;

/**
 * A closed projection: the key set is fixed by the schema, so add and remove are
 * meaningless. Field variants and panel tabs are closed. Collections are open and
 * arrive at collection scale.
 */
export function createProjection<K extends string, S>(
  active: K,
  branches: Partial<Record<K, S>> = {},
): Projection<K, S> {
  return { active, branches: { ...branches }, version: CURRENT_ENVELOPE_VERSION };
}

/**
 * Set the active key.
 *
 * **Retention is not implemented here — it falls out of this function never
 * deleting.** That is the whole mechanism, and it is why any code that resets state
 * on a discriminant switch is a bug rather than a design choice.
 *
 * Derived state is *not* evicted here either. Use `activate` for the composed
 * transition; `select` stays minimal so a caller that wants only the discriminant
 * moved can have exactly that.
 */
export function select<K extends string, S>(
  projection: Projection<K, S>,
  key: K,
): Projection<K, S> {
  if (projection.active === key) {
    return projection;
  }

  return { ...projection, active: key };
}

/** The active branch's value, initialising it on first read. */
export function readActive<K extends string, S>(
  projection: Projection<K, S>,
  init: BranchInitialiser<K, S>,
): S {
  return readBranch(projection, projection.active, init);
}

/**
 * Any branch's value, active or not. Reading a retained inactive branch is the
 * point of the envelope: an inactive branch has no rendered surface and its value
 * must still be there.
 */
export function readBranch<K extends string, S>(
  projection: Projection<K, S>,
  key: K,
  init: BranchInitialiser<K, S>,
): S {
  const existing = projection.branches[key];
  return existing === undefined ? init(key) : existing;
}

/**
 * Write into the active branch only. No operation writes another branch — a write
 * that could land on an inactive branch would make retention unprovable, because a
 * surviving value could no longer be distinguished from a value written behind the
 * user's back.
 */
export function writeActive<K extends string, S>(
  projection: Projection<K, S>,
  patch: Partial<S>,
  init: BranchInitialiser<K, S>,
): Projection<K, S> {
  const current = readActive(projection, init);

  return {
    ...projection,
    branches: { ...projection.branches, [projection.active]: { ...current, ...patch } },
  };
}

/**
 * Build derived state for a branch. Called on activation, never on deactivation:
 * derived output is rebuilt rather than restored, which is what makes eviction
 * safe.
 */
export function materialise<K extends string, S extends object>(
  projection: Projection<K, S>,
  key: K,
  init: BranchInitialiser<K, S>,
  build: (branch: S, key: K) => Partial<S>,
): Projection<K, S> {
  const branch = readBranch(projection, key, init);

  return {
    ...projection,
    branches: { ...projection.branches, [key]: { ...branch, ...build(branch, key) } },
  };
}

/**
 * Drop a branch's derived fields, keeping document and authored-inactive state.
 *
 * A branch that has never been initialised stays uninitialised — evicting it would
 * materialise an empty branch as a side effect of throwing state away, which is the
 * opposite of what the caller asked for.
 */
export function evictDerived<K extends string, S extends object>(
  projection: Projection<K, S>,
  key: K,
  classification: FieldClassification<S>,
): Projection<K, S> {
  const branch = projection.branches[key];

  if (branch === undefined || !hasDerivedState(branch, classification)) {
    return projection;
  }

  return {
    ...projection,
    branches: { ...projection.branches, [key]: stripDerived(branch, classification) as S },
  };
}

/**
 * The composed transition: evict the outgoing branch's derived state, move the
 * discriminant, and materialise the incoming branch.
 *
 * This is the operation a surface performs when the user switches. It is deliberately
 * *composed* rather than built in, so each half stays independently testable and the
 * retention claim can be checked without the eviction claim getting in the way.
 */
export function activate<K extends string, S extends object>(
  projection: Projection<K, S>,
  key: K,
  options: {
    classification: FieldClassification<S>;
    init: BranchInitialiser<K, S>;
    build?: (branch: S, key: K) => Partial<S>;
  },
): Projection<K, S> {
  if (projection.active === key) {
    return projection;
  }

  const evicted = evictDerived(projection, projection.active, options.classification);
  const selected = select(evicted, key);

  return options.build
    ? materialise(selected, key, options.init, options.build)
    : selected;
}

/** Keys with a retained branch. Ordered for deterministic reporting and diffing. */
export function retainedKeys<K extends string, S>(projection: Projection<K, S>): K[] {
  return (Object.keys(projection.branches) as K[]).sort();
}

/**
 * The persistable envelope: document and authored-inactive fields only.
 *
 * The discriminant persists — at panel scale that is the invariant that reopening an
 * app restores the last active tab or tool. What it projects is still classified per
 * field, so derived state rebuilds on activation rather than loading from storage.
 */
export function toPersistable<K extends string, S extends object>(
  projection: Projection<K, S>,
  classification: FieldClassification<S>,
): Projection<K, S> {
  const branches: Partial<Record<K, S>> = {};

  for (const key of retainedKeys(projection)) {
    const branch = projection.branches[key];
    if (branch !== undefined) {
      branches[key] = stripDerived(branch, classification) as S;
    }
  }

  return { active: projection.active, branches, version: projection.version };
}

/**
 * The active value, and only the active value.
 *
 * `export-active-projection-only` in one function. Retained inactive branches are
 * user data and are persisted, but they are never output — a caller that reaches for
 * `branches` when building an export has already made the mistake.
 */
export function toExport<K extends string, S>(
  projection: Projection<K, S>,
  init: BranchInitialiser<K, S>,
): { kind: K; value: S } {
  return { kind: projection.active, value: readActive(projection, init) };
}
