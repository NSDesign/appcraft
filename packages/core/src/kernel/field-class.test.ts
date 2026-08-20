import { describe, expect, it } from "vitest";

import {
  derivedFields,
  hasDerivedState,
  persistedFields,
  retainedFields,
  stripDerived,
  type FieldClassification,
} from "./field-class";

type Branch = {
  committed: number;
  authored: string;
  preview: string;
  cache: number[];
};

const classification: FieldClassification<Branch> = {
  committed: "document",
  authored: "authored-inactive",
  preview: "derived",
  cache: "derived",
};

describe("field classification", () => {
  it("retains document and authored-inactive, evicts derived", () => {
    expect(retainedFields(classification).sort()).toEqual(["authored", "committed"]);
    expect(derivedFields(classification).sort()).toEqual(["cache", "preview"]);
  });

  it("persists exactly what it retains — derived state is never serialised", () => {
    expect(persistedFields(classification).sort()).toEqual(retainedFields(classification).sort());
  });

  it("strips derived fields without mutating the input", () => {
    const branch: Branch = { authored: "7", cache: [1, 2], committed: 42, preview: "png" };
    const stripped = stripDerived(branch, classification);

    expect(stripped).toEqual({ authored: "7", committed: 42 });
    expect(branch).toEqual({ authored: "7", cache: [1, 2], committed: 42, preview: "png" });
  });

  it("keeps a retained field explicitly set to undefined, and omits an absent one", () => {
    // A field the user cleared is not the same as a field that was never written.
    const cleared = { authored: undefined, committed: 42 } as unknown as Branch;
    const stripped = stripDerived(cleared, classification);

    expect(Object.prototype.hasOwnProperty.call(stripped, "authored")).toBe(true);
    expect(stripDerived({ committed: 42 } as Branch, classification)).toEqual({ committed: 42 });
  });

  it("detects derived state only when a derived field is actually present", () => {
    expect(hasDerivedState({ authored: "7", committed: 42 } as Branch, classification)).toBe(false);
    expect(hasDerivedState({ committed: 42, preview: "png" } as Branch, classification)).toBe(true);
  });
});
