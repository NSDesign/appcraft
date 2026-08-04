/**
 * Three-way field classification.
 *
 * Every field in a branch is one of three classes. This is the single documented
 * refinement to strict "retain everything", and it is what preserves scale
 * invariance: the classification is *per field*, never per scale, so the engine
 * behaves identically at field, collection, panel and viewmodel scale.
 *
 * The economics are the reason it exists. A 500-entity collection retaining document
 * and authored-inactive state costs low single-digit megabytes — and that state *is*
 * the document. Retaining 500 sets of derived caches costs gigabytes. Eviction is
 * also simply correct for a canvas app: you never want 500 live preview surfaces.
 */

export type FieldClass =
  /** Committed state. Retained when inactive, persisted. */
  | "document"
  /** The value you typed before switching away. Retained when inactive, persisted. */
  | "authored-inactive"
  /** Caches, previews, buffered drags, scroll positions. Evicted, never persisted. */
  | "derived";

/**
 * Per-field classification for a branch shape. Every field must be classified —
 * `field-classification-required` is an invariant, and TypeScript enforces
 * exhaustiveness here so an unclassified field is a compile error rather than a
 * silent retention bug.
 */
export type FieldClassification<S> = { readonly [Field in keyof S]-?: FieldClass };

/** Fields the engine retains when a branch goes inactive. */
export function retainedFields<S>(classification: FieldClassification<S>): (keyof S)[] {
  return classKeys(classification, (fieldClass) => fieldClass !== "derived");
}

/** Fields the engine evicts when a branch goes inactive. */
export function derivedFields<S>(classification: FieldClassification<S>): (keyof S)[] {
  return classKeys(classification, (fieldClass) => fieldClass === "derived");
}

/**
 * Fields a persisted document may contain: document and authored-inactive only.
 * Derived state is never serialised, which is what keeps a saved document a
 * document rather than a snapshot of one session's caches.
 */
export function persistedFields<S>(classification: FieldClassification<S>): (keyof S)[] {
  return retainedFields(classification);
}

/**
 * Drop every derived field from a branch value. Returns a new object; the input is
 * never mutated, because undo history holds references to prior envelopes.
 */
export function stripDerived<S extends object>(
  value: S,
  classification: FieldClassification<S>,
): Partial<S> {
  const kept: Partial<S> = {};

  for (const field of retainedFields(classification)) {
    if (Object.prototype.hasOwnProperty.call(value, field)) {
      kept[field] = value[field];
    }
  }

  return kept;
}

/** Whether a value carries any field the classification marks derived. */
export function hasDerivedState<S extends object>(
  value: S,
  classification: FieldClassification<S>,
): boolean {
  return derivedFields(classification).some((field) =>
    Object.prototype.hasOwnProperty.call(value, field),
  );
}

function classKeys<S>(
  classification: FieldClassification<S>,
  predicate: (fieldClass: FieldClass) => boolean,
): (keyof S)[] {
  return (Object.keys(classification) as (keyof S)[]).filter((field) =>
    predicate(classification[field]),
  );
}
