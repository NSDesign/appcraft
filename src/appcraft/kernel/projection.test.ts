import { describe, expect, it } from "vitest";

import type { FieldClassification } from "./field-class";
import {
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
} from "./projection";

type Key = "fixed" | "range" | "incremental";

type Branch = {
  value: string;
  /** Rebuilt on activation; never retained, never persisted. */
  preview?: string;
};

const classification: FieldClassification<Branch> = {
  preview: "derived",
  value: "authored-inactive",
};

const init: BranchInitialiser<Key, Branch> = (key) => ({ value: `initial-${key}` });
const build = (branch: Branch): Partial<Branch> => ({ preview: `preview(${branch.value})` });

describe("the envelope", () => {
  it("carries a version so migrations can gate on it", () => {
    expect(createProjection<Key, Branch>("fixed").version).toBe(CURRENT_ENVELOPE_VERSION);
  });

  it("initialises branches lazily — an untouched branch holds nothing", () => {
    const projection = createProjection<Key, Branch>("fixed");

    expect(retainedKeys(projection)).toEqual([]);
    expect(readActive(projection, init)).toEqual({ value: "initial-fixed" });
    expect(
      retainedKeys(projection),
      "Reading must not write. A read that materialised a branch would make retention untestable.",
    ).toEqual([]);
  });
});

describe("retention", () => {
  it("survives a switch away and back", () => {
    let projection = createProjection<Key, Branch>("fixed");
    projection = writeActive(projection, { value: "42" }, init);

    projection = select(projection, "range");
    projection = writeActive(projection, { value: "7" }, init);

    expect(
      readBranch(projection, "fixed", init).value,
      "The value authored before the switch is authored-inactive state and must survive.",
    ).toBe("42");

    projection = select(projection, "fixed");

    expect(readActive(projection, init).value).toBe("42");
  });

  it("survives every branch being visited in turn", () => {
    let projection = createProjection<Key, Branch>("fixed");

    for (const [key, value] of [
      ["fixed", "1"],
      ["range", "2"],
      ["incremental", "3"],
    ] as const) {
      projection = writeActive(select(projection, key), { value }, init);
    }

    expect(retainedKeys(projection)).toEqual(["fixed", "incremental", "range"]);
    expect(readBranch(projection, "fixed", init).value).toBe("1");
    expect(readBranch(projection, "range", init).value).toBe("2");
    expect(readBranch(projection, "incremental", init).value).toBe("3");
  });

  it("select never deletes another branch", () => {
    const authored = writeActive(createProjection<Key, Branch>("fixed"), { value: "42" }, init);
    const switched = select(authored, "range");

    expect(Object.keys(switched.branches)).toContain("fixed");
  });

  it("writes land on the active branch only", () => {
    let projection = writeActive(createProjection<Key, Branch>("fixed"), { value: "42" }, init);
    projection = writeActive(select(projection, "range"), { value: "7" }, init);

    expect(readBranch(projection, "fixed", init).value).toBe("42");
  });

  it("returns the same envelope when selecting the already-active key", () => {
    const projection = createProjection<Key, Branch>("fixed");
    expect(select(projection, "fixed")).toBe(projection);
  });

  it("never mutates a prior envelope, so undo history stays intact", () => {
    const before = writeActive(createProjection<Key, Branch>("fixed"), { value: "42" }, init);
    const after = writeActive(before, { value: "99" }, init);

    expect(readBranch(before, "fixed", init).value).toBe("42");
    expect(readBranch(after, "fixed", init).value).toBe("99");
    expect(after).not.toBe(before);
  });
});

describe("eviction", () => {
  it("drops derived fields and keeps authored ones", () => {
    let projection = writeActive(createProjection<Key, Branch>("fixed"), { value: "42" }, init);
    projection = materialise(projection, "fixed", init, build);

    expect(readActive(projection, init).preview).toBe("preview(42)");

    projection = evictDerived(projection, "fixed", classification);

    expect(readActive(projection, init).preview).toBeUndefined();
    expect(readActive(projection, init).value).toBe("42");
  });

  it("leaves an uninitialised branch uninitialised", () => {
    const projection = createProjection<Key, Branch>("fixed");

    expect(
      retainedKeys(evictDerived(projection, "range", classification)),
      "Evicting must not materialise a branch as a side effect of throwing state away.",
    ).toEqual([]);
  });

  it("is a no-op when a branch holds no derived state", () => {
    const projection = writeActive(createProjection<Key, Branch>("fixed"), { value: "42" }, init);
    expect(evictDerived(projection, "fixed", classification)).toBe(projection);
  });

  it("rebuilds on activation rather than restoring", () => {
    let projection = writeActive(createProjection<Key, Branch>("fixed"), { value: "42" }, init);
    projection = materialise(projection, "fixed", init, build);

    projection = activate(projection, "range", { build, classification, init });

    expect(
      projection.branches["fixed"]?.preview,
      "The outgoing branch's derived state must be evicted on deactivation.",
    ).toBeUndefined();
    expect(readActive(projection, init).preview).toBe("preview(initial-range)");

    projection = activate(projection, "fixed", { build, classification, init });

    expect(readActive(projection, init)).toEqual({ preview: "preview(42)", value: "42" });
  });

  it("activate is a no-op for the already-active branch, so derived state is not churned", () => {
    let projection = writeActive(createProjection<Key, Branch>("fixed"), { value: "42" }, init);
    projection = materialise(projection, "fixed", init, build);

    expect(activate(projection, "fixed", { build, classification, init })).toBe(projection);
  });
});

describe("persistence", () => {
  it("keeps the discriminant and every retained branch, minus derived state", () => {
    let projection = writeActive(createProjection<Key, Branch>("fixed"), { value: "42" }, init);
    projection = materialise(projection, "fixed", init, build);
    projection = activate(projection, "range", { build, classification, init });
    projection = writeActive(projection, { value: "7" }, init);

    const persisted = toPersistable(projection, classification);

    expect(persisted.active).toBe("range");
    expect(persisted.version).toBe(CURRENT_ENVELOPE_VERSION);
    expect(persisted.branches["fixed"]).toEqual({ value: "42" });
    expect(
      JSON.stringify(persisted),
      "Derived state is never serialised; a persisted document holds document and authored-inactive fields only.",
    ).not.toContain("preview");
  });
});

describe("export", () => {
  it("reads the active projection only", () => {
    let projection = writeActive(
      createProjection<Key, Branch>("fixed"),
      { value: "retained-inactive-marker" },
      init,
    );
    projection = writeActive(select(projection, "range"), { value: "active-marker" }, init);

    const exported = toExport(projection, init);

    expect(exported.kind).toBe("range");
    expect(exported.value.value).toBe("active-marker");
    expect(
      JSON.stringify(exported),
      "Retained inactive branches are user data, but they are never output.",
    ).not.toContain("retained-inactive-marker");
  });
});
