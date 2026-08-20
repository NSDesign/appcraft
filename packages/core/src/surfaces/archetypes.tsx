/**
 * The curated archetypes.
 *
 * `surfaces-declared-not-composed`: product code declares which archetype it wants and
 * configures it. It never assembles a panel out of divs — the moment it does, the DOM
 * contract stops being emitted by the framework and every invariant above it stops
 * being checkable.
 *
 * These components own the `data-appcraft-*` attributes the browser suite observes.
 * That is deliberate: attributes emitted by product code could be forgotten, spelled
 * differently, or quietly dropped, and a suite asserting on them would be asserting on
 * the app's diligence rather than on the framework's behaviour.
 */
import type { ReactNode } from "react";

/** `layout-archetypes-only`. Adding to this list is an architecture change. */
export type Archetype = "canvas" | "inspector" | "master-detail" | "tabbed-section";

export type SurfaceProps = {
  /** Declaration id. Must be unique in the rendered graph. */
  id: string;
  archetype: Archetype;
  children: ReactNode;
};

export function Surface({ archetype, children, id }: SurfaceProps) {
  return (
    <section className={`ac-surface ac-${archetype}`} data-appcraft-archetype={archetype} data-appcraft-surface={id}>
      {children}
    </section>
  );
}

export type ProjectionNodeProps = {
  /** Schema path. The suite locates a projection by this value. */
  path: string;
  children: ReactNode;
};

export function ProjectionNode({ children, path }: ProjectionNodeProps) {
  return (
    <div className="ac-projection" data-appcraft-projection={path}>
      {children}
    </div>
  );
}

export type DiscriminantProps<K extends string> = {
  label: string;
  keys: readonly K[];
  active: K;
  onSelect: (key: K) => void;
};

/**
 * The control that sets the active key.
 *
 * Rendered as a listbox of options so a test — and a screen reader — can select a
 * branch by its name rather than by position. The browser suite drives this rather
 * than calling the store, because a projection whose discriminant is only reachable
 * programmatically has not been proven to work for a user.
 */
export function Discriminant<K extends string>({ active, keys, label, onSelect }: DiscriminantProps<K>) {
  return (
    <div aria-label={label} className="ac-discriminant" data-appcraft-discriminant role="listbox">
      {keys.map((key) => (
        <button
          aria-selected={key === active}
          className="ac-option"
          key={key}
          onClick={() => onSelect(key)}
          role="option"
          type="button"
        >
          {key}
        </button>
      ))}
    </div>
  );
}

export type BranchProps = {
  branchKey: string;
  active: boolean;
  children: ReactNode;
};

/**
 * A rendered branch.
 *
 * Only the active branch is rendered at all. That is the visible half of eviction: an
 * inactive branch has no DOM, no derived output, and no live preview surface — while
 * its authored value is still in the envelope, which is what retention means.
 */
export function Branch({ active, branchKey, children }: BranchProps) {
  if (!active) {
    return null;
  }

  return (
    <div
      className="ac-branch"
      data-appcraft-active-branch=""
      data-appcraft-branch={branchKey}
    >
      {children}
    </div>
  );
}

export type DerivedProps = {
  /** Field name, so the suite can tell which derived field was materialised. */
  field: string;
  children: ReactNode;
};

/** Derived output. Present only inside an active branch, by construction. */
export function Derived({ children, field }: DerivedProps) {
  return (
    <span className="ac-derived" data-appcraft-derived={field}>
      {children}
    </span>
  );
}

/** Product output — the only text a canvas surface may contain. */
export function ProductOutput({ children }: { children: ReactNode }) {
  return (
    <div className="ac-product" data-appcraft-product-output>
      {children}
    </div>
  );
}
