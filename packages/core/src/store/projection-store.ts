/**
 * The store facade.
 *
 * Everything above this line reads and writes projections through appcraft; the
 * reactive library sits *beneath* it. Today that library is React's own state — a
 * deliberate staging choice, not a rejection of Jotai. The facade is what makes the
 * swap cheap: when `atomFamily` and `splitAtom` arrive they land here, and no surface,
 * control or app changes.
 *
 * `facade-owns-state` is the rule this file exists to satisfy.
 */
import {
  type BranchInitialiser,
  type FieldClassification,
  type Projection,
  activate,
  createProjection,
  readActive,
  readBranch,
  toExport,
  toPersistable,
  writeActive,
} from "../kernel/index";

export type ProjectionDefinition<K extends string, S extends object> = {
  /** Schema path. Also the DOM contract's `data-appcraft-projection` value. */
  path: string;
  active: K;
  keys: readonly K[];
  classification: FieldClassification<S>;
  init: BranchInitialiser<K, S>;
  /** Derived state, rebuilt on activation. Omit for projections with none. */
  build?: (branch: S, key: K) => Partial<S>;
  /**
   * Persist the envelope. Panel-scale discriminants must
   * (`panel-discriminant-persists`); a transient field projection need not.
   */
  persist?: boolean;
};

const STORAGE_PREFIX = "appcraft:envelope:";

function storageKey(path: string): string {
  return `${STORAGE_PREFIX}${path}`;
}

/**
 * Load a persisted envelope, or start fresh.
 *
 * Derived state is never persisted, so a loaded branch is document and
 * authored-inactive fields only — exactly what `toPersistable` wrote. Anything else in
 * storage came from a version we do not understand, and starting fresh beats
 * pretending to read it.
 */
export function loadProjection<K extends string, S extends object>(
  definition: ProjectionDefinition<K, S>,
): Projection<K, S> {
  const fresh = createProjection<K, S>(definition.active);

  if (!definition.persist || typeof localStorage === "undefined") {
    return fresh;
  }

  const raw = localStorage.getItem(storageKey(definition.path));
  if (raw === null) {
    return fresh;
  }

  try {
    const stored = JSON.parse(raw) as Projection<K, S>;
    const active = definition.keys.includes(stored.active) ? stored.active : definition.active;

    return { ...fresh, active, branches: stored.branches ?? {} };
  } catch {
    return fresh;
  }
}

export function saveProjection<K extends string, S extends object>(
  definition: ProjectionDefinition<K, S>,
  projection: Projection<K, S>,
): void {
  if (!definition.persist || typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(
    storageKey(definition.path),
    JSON.stringify(toPersistable(projection, definition.classification)),
  );
}

/**
 * A single undo entry.
 *
 * `undo-switch-separate-entry`: a discriminant switch is its own entry, distinct from
 * the edits around it. Retention is what makes undoing a switch lossless — the branch
 * state was never discarded, so no snapshot is needed beyond the envelope itself.
 */
export type HistoryEntry<K extends string, S extends object> = {
  kind: "select" | "write";
  projection: Projection<K, S>;
};

export type ProjectionStore<K extends string, S extends object> = {
  definition: ProjectionDefinition<K, S>;
  projection: Projection<K, S>;
  history: HistoryEntry<K, S>[];
};

export function createStore<K extends string, S extends object>(
  definition: ProjectionDefinition<K, S>,
): ProjectionStore<K, S> {
  const loaded = loadProjection(definition);
  const materialised = definition.build
    ? activate(
        { ...loaded, active: firstOtherKey(definition, loaded.active) },
        loaded.active,
        { build: definition.build, classification: definition.classification, init: definition.init },
      )
    : loaded;

  return { definition, history: [], projection: materialised };
}

/** Any key other than `key`, so `activate` sees a real transition on first render. */
function firstOtherKey<K extends string, S extends object>(
  definition: ProjectionDefinition<K, S>,
  key: K,
): K {
  const other = definition.keys.find((candidate) => candidate !== key);
  return other ?? key;
}

export function select<K extends string, S extends object>(
  store: ProjectionStore<K, S>,
  key: K,
): ProjectionStore<K, S> {
  if (store.projection.active === key) {
    return store;
  }

  const next = activate(store.projection, key, {
    classification: store.definition.classification,
    init: store.definition.init,
    ...(store.definition.build ? { build: store.definition.build } : {}),
  });

  saveProjection(store.definition, next);

  return {
    ...store,
    history: [...store.history, { kind: "select", projection: store.projection }],
    projection: next,
  };
}

export function write<K extends string, S extends object>(
  store: ProjectionStore<K, S>,
  patch: Partial<S>,
): ProjectionStore<K, S> {
  const written = writeActive(store.projection, patch, store.definition.init);
  const next = store.definition.build
    ? {
        ...written,
        branches: {
          ...written.branches,
          [written.active]: {
            ...readActive(written, store.definition.init),
            ...store.definition.build(readActive(written, store.definition.init), written.active),
          },
        },
      }
    : written;

  saveProjection(store.definition, next);

  return {
    ...store,
    history: [...store.history, { kind: "write", projection: store.projection }],
    projection: next,
  };
}

/** Step back one entry. A switch and an edit are separate steps, never merged. */
export function undo<K extends string, S extends object>(
  store: ProjectionStore<K, S>,
): ProjectionStore<K, S> {
  const previous = store.history.at(-1);

  if (!previous) {
    return store;
  }

  saveProjection(store.definition, previous.projection);

  return { ...store, history: store.history.slice(0, -1), projection: previous.projection };
}

export function readActiveBranch<K extends string, S extends object>(
  store: ProjectionStore<K, S>,
): S {
  return readActive(store.projection, store.definition.init);
}

export function readBranchValue<K extends string, S extends object>(
  store: ProjectionStore<K, S>,
  key: K,
): S {
  return readBranch(store.projection, key, store.definition.init);
}

/** `export-active-projection-only` in one call. */
export function exportActive<K extends string, S extends object>(
  store: ProjectionStore<K, S>,
): { kind: K; value: S } {
  return toExport(store.projection, store.definition.init);
}
