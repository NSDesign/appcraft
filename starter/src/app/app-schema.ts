/**
 * The app's projection declarations.
 *
 * Three projections at three scales, which is the point of the fixture: the same
 * envelope, the same retention and eviction rules, at field, collection and panel
 * scale. If the kernel were only scale-invariant in the documentation, this file is
 * where that would show.
 *
 * Every field is classified — `field-classification-required`. An unclassified field
 * would be a compile error, because `FieldClassification<S>` requires all of them.
 */
import type { FieldClassification, ProjectionDefinition } from "@nsdesign/appcraft-core";

/* ------------------------------------------------------------------ field scale */

/**
 * The re-declared `StyledModeField`. Toolcraft's version resets on mode change; this
 * one cannot, because nothing here resets anything.
 */
export type ModeKey = "fixed" | "range" | "incremental";

export type ModeBranch = {
  /** What the user typed. Survives deactivation. */
  entry: string;
  /** Formatted for display. Rebuilt on activation, never retained. */
  formatted?: string;
};

const modeClassification: FieldClassification<ModeBranch> = {
  entry: "authored-inactive",
  formatted: "derived",
};

export const modeField: ProjectionDefinition<ModeKey, ModeBranch> = {
  active: "fixed",
  build: (branch, key) => ({ formatted: key === "range" ? `[${branch.entry}]` : branch.entry }),
  classification: modeClassification,
  init: (key) => ({ entry: key === "range" ? "0:100" : "0" }),
  keys: ["fixed", "range", "incremental"],
  path: "style.mode",
};

/**
 * A range is invalid when min exceeds max. Only the **active** branch is validated —
 * `inactive-branches-not-validated` — so a retained invalid range must never block a
 * document whose fixed branch is active.
 */
export function isBranchValid(key: ModeKey, branch: ModeBranch): boolean {
  if (key !== "range") {
    return branch.entry.trim() !== "";
  }

  const [min, max] = branch.entry.split(":").map((part) => Number(part.trim()));
  return Number.isFinite(min) && Number.isFinite(max) && (min as number) <= (max as number);
}

/* ------------------------------------------------------- collection scale */

export type LayerBranch = {
  name: string;
  /** Rendered preview. Derived: one live surface, never five hundred. */
  preview?: string;
};

const layerClassification: FieldClassification<LayerBranch> = {
  name: "document",
  preview: "derived",
};

/** Open projection: keys come from data, so the count is a runtime concern. */
export function layerCollection(count: number): ProjectionDefinition<string, LayerBranch> {
  const keys = Array.from({ length: count }, (_, index) => `layer-${index}`);

  return {
    active: keys[0] ?? "layer-0",
    build: (branch) => ({ preview: `preview(${branch.name})` }),
    classification: layerClassification,
    init: (key) => ({ name: key.replace("layer-", "Layer ") }),
    keys,
    path: "document.layers",
  };
}

/* ------------------------------------------------------------ panel scale */

export type PanelBranch = {
  /** Which sub-section was open. Derived: rebuilt, never restored. */
  scroll?: string;
  /** The tab's own label. Document class. */
  title: string;
};

const panelClassification: FieldClassification<PanelBranch> = {
  scroll: "derived",
  title: "document",
};

/**
 * `panel-discriminant-persists`: reopening restores the last active tab. The
 * discriminant is document class even at panel scale, while what it projects stays
 * classified per field — so `scroll` still rebuilds rather than loading from storage.
 */
export function inspectorPanel(count = 2): ProjectionDefinition<string, PanelBranch> {
  const all = ["geometry", "appearance", "metadata", "export"];
  const keys = Array.from({ length: Math.max(2, count) }, (_, index) => all[index % all.length] + (index >= all.length ? `-${index}` : ""));

  return {
    active: keys[0] ?? "geometry",
    build: (branch) => ({ scroll: `top(${branch.title})` }),
    classification: panelClassification,
    init: (key) => ({ title: key }),
    keys,
    path: "panels.inspector",
    persist: true,
  };
}
