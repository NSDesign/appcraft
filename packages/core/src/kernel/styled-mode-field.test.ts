/**
 * Field-scale validation: `StyledModeField`, re-declared.
 *
 * The design document names this as the fixture the field scale is proven against,
 * because Toolcraft's version is the canonical violation of the retention rule — it
 * resets on mode change, so a user who types a fixed value, switches to range, and
 * switches back finds their value gone. Toolcraft hand-rolls the buffering, clamping
 * and styling per compound control; nothing in it enforces retention, so nothing
 * catches the reset.
 *
 * Here the same control is *declared* as a field-scale projection, and retention is
 * not implemented at all: it falls out of `select` never deleting. These tests are
 * the regression that would have caught the original.
 *
 * The fixture is app-shaped on purpose and lives in a test file on purpose.
 * `app-agnostic-core` forbids app-specific requirements in `src/appcraft`; a fixture
 * exercises the framework, it never sources requirements for it.
 */
import { describe, expect, it } from "vitest";

import type { FieldClassification } from "./field-class";
import {
  activate,
  createProjection,
  readActive,
  readBranch,
  toExport,
  toPersistable,
  writeActive,
  type BranchInitialiser,
  type Projection,
} from "./projection";

/** The discriminant: which value mode the field is in. */
type Mode = "fixed" | "range" | "incremental";

type ModeBranch = {
  /** What the user typed. Survives deactivation — this is the whole point. */
  readonly entry: string;
  /** Buffered mid-drag value. Derived: rebuilt from `entry`, never retained. */
  readonly dragBuffer?: string;
  /** Formatted display string. Derived. */
  readonly formatted?: string;
};

const classification: FieldClassification<ModeBranch> = {
  dragBuffer: "derived",
  entry: "authored-inactive",
  formatted: "derived",
};

const init: BranchInitialiser<Mode, ModeBranch> = (mode) => ({
  entry: mode === "range" ? "0:100" : "0",
});

/** Stands in for the formatting and clamping Toolcraft hand-rolls per control. */
const build = (branch: ModeBranch, mode: Mode): Partial<ModeBranch> => ({
  formatted: mode === "range" ? `[${branch.entry}]` : branch.entry,
});

function switchMode(
  projection: Projection<Mode, ModeBranch>,
  mode: Mode,
): Projection<Mode, ModeBranch> {
  return activate(projection, mode, { build, classification, init });
}

describe("StyledModeField, re-declared as a field-scale projection", () => {
  it("does not lose the fixed value when the user switches to range and back", () => {
    // The exact sequence Toolcraft's StyledModeField gets wrong.
    let field = createProjection<Mode, ModeBranch>("fixed");
    field = writeActive(field, { entry: "42" }, init);

    field = switchMode(field, "range");
    field = writeActive(field, { entry: "10:20" }, init);

    field = switchMode(field, "fixed");

    expect(
      readActive(field, init).entry,
      "Toolcraft resets here. Retention makes the reset impossible: select never deletes.",
    ).toBe("42");
  });

  it("keeps all three modes' entries independently", () => {
    let field = createProjection<Mode, ModeBranch>("fixed");
    field = writeActive(field, { entry: "42" }, init);
    field = writeActive(switchMode(field, "range"), { entry: "10:20" }, init);
    field = writeActive(switchMode(field, "incremental"), { entry: "+5" }, init);

    expect(readBranch(field, "fixed", init).entry).toBe("42");
    expect(readBranch(field, "range", init).entry).toBe("10:20");
    expect(readBranch(field, "incremental", init).entry).toBe("+5");
  });

  it("throws away the drag buffer on deactivation and rebuilds formatting on return", () => {
    let field = createProjection<Mode, ModeBranch>("fixed");
    field = writeActive(field, { dragBuffer: "41.7", entry: "42" }, init);

    field = switchMode(field, "range");

    expect(
      field.branches["fixed"]?.dragBuffer,
      "A buffered mid-drag value is derived: meaningless once the branch is not being edited.",
    ).toBeUndefined();
    expect(field.branches["fixed"]?.entry).toBe("42");

    field = switchMode(field, "fixed");

    expect(readActive(field, init).formatted).toBe("42");
  });

  it("an invalid inactive branch does not appear in the value a validator sees", () => {
    // min above max: invalid as a range, and irrelevant while fixed is active.
    let field = writeActive(
      createProjection<Mode, ModeBranch>("range"),
      { entry: "90:10" },
      init,
    );
    field = writeActive(switchMode(field, "fixed"), { entry: "42" }, init);

    const active = toExport(field, init);

    expect(active.kind).toBe("fixed");
    expect(
      JSON.stringify(active),
      "Validation gates on the active value. The invalid range branch is retained, not validated.",
    ).not.toContain("90:10");
    expect(
      readBranch(field, "range", init).entry,
      "…and it is still there, because the user typed it.",
    ).toBe("90:10");
  });

  it("survives a save and reload, which is where hiding retained state would show", () => {
    let field = writeActive(createProjection<Mode, ModeBranch>("fixed"), { entry: "42" }, init);
    field = writeActive(switchMode(field, "range"), { entry: "10:20" }, init);

    // A save/load round trip through the persisted form.
    const reloaded = JSON.parse(
      JSON.stringify(toPersistable(field, classification)),
    ) as Projection<Mode, ModeBranch>;

    expect(reloaded.active, "The discriminant is document class and persists.").toBe("range");
    expect(
      readBranch(reloaded, "fixed", init).entry,
      "Authored-inactive state is user data. Hiding it from persistence would silently lose the fixed value across sessions.",
    ).toBe("42");
    expect(
      JSON.stringify(reloaded),
      "Derived state rebuilds on activation and is never persisted.",
    ).not.toContain("formatted");
  });
});
