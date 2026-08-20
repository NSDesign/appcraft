import assert from "node:assert/strict";
import test from "node:test";

import { buildAdjacency, findDanglingReferences, findShortestCycle } from "./projection-graph.mjs";

test("acyclic graphs report no cycle", () => {
  assert.equal(
    findShortestCycle([
      { id: "panels.inspector", dependsOn: ["panels.tool"] },
      { id: "panels.tool", dependsOn: [] },
      { id: "document.layers", dependsOn: ["panels.tool"] },
    ]),
    undefined,
  );
});

test("a self reference is a cycle of length one", () => {
  assert.deepEqual(findShortestCycle([{ id: "a", dependsOn: ["a"] }]), ["a", "a"]);
});

test("the shortest cycle wins over a longer one sharing a node", () => {
  // a→b→a (2) and a→c→d→e→a (4). The short one must be reported.
  const cycle = findShortestCycle([
    { id: "a", dependsOn: ["b", "c"] },
    { id: "b", dependsOn: ["a"] },
    { id: "c", dependsOn: ["d"] },
    { id: "d", dependsOn: ["e"] },
    { id: "e", dependsOn: ["a"] },
  ]);

  assert.deepEqual(cycle, ["a", "b", "a"]);
});

test("equal-length cycles resolve deterministically, whatever the declaration order", () => {
  const forward = findShortestCycle([
    { id: "a", dependsOn: ["b"] },
    { id: "b", dependsOn: ["a"] },
    { id: "y", dependsOn: ["z"] },
    { id: "z", dependsOn: ["y"] },
  ]);
  const reversed = findShortestCycle([
    { id: "z", dependsOn: ["y"] },
    { id: "y", dependsOn: ["z"] },
    { id: "b", dependsOn: ["a"] },
    { id: "a", dependsOn: ["b"] },
  ]);

  assert.deepEqual(forward, ["a", "b", "a"]);
  assert.deepEqual(
    reversed,
    forward,
    "The same graph must report the same cycle regardless of declaration order.",
  );
});

test("a cycle reachable only through a long prefix is still found", () => {
  const cycle = findShortestCycle([
    { id: "entry", dependsOn: ["one"] },
    { id: "one", dependsOn: ["two"] },
    { id: "two", dependsOn: ["three"] },
    { id: "three", dependsOn: ["two"] },
  ]);

  // Reported from "three" rather than "two": the same cycle, canonicalised to the
  // lexicographically smallest shortest cycle so the report never depends on which
  // node the walk happened to reach first.
  assert.deepEqual(cycle, ["three", "two", "three"]);
});

test("references to undeclared nodes are reported, not treated as cycles", () => {
  const nodes = [
    { id: "panels.inspector", dependsOn: ["panels.missing"] },
    { id: "panels.tool", dependsOn: [] },
  ];

  assert.equal(findShortestCycle(nodes), undefined);
  assert.deepEqual(findDanglingReferences(nodes), [
    { from: "panels.inspector", to: "panels.missing" },
  ]);
});

test("an empty graph is acyclic", () => {
  assert.equal(findShortestCycle([]), undefined);
  assert.deepEqual(findDanglingReferences([]), []);
});

test("duplicate ids are rejected rather than silently merged", () => {
  assert.throws(
    () => buildAdjacency([{ id: "a" }, { id: "a" }]),
    /Duplicate projection node id "a"/,
  );
});

test("nodes without an id are rejected", () => {
  assert.throws(() => buildAdjacency([{ id: "" }]), /non-empty string id/);
});

test("repeated edges do not change the result", () => {
  assert.deepEqual(findShortestCycle([{ id: "a", dependsOn: ["b", "b"] }, { id: "b", dependsOn: ["a"] }]), [
    "a",
    "b",
    "a",
  ]);
});
