import assert from "node:assert/strict";
import test from "node:test";

import {
  loadRegistry,
  renderAxisTable,
  readGeneratedBlock,
  renderGeneratedBlock,
  replaceGeneratedBlock,
  requiredRoutes,
  routesForAxis,
  validateRegistry,
} from "./routes.mjs";

const registry = loadRegistry();

test("the shipped registry is structurally valid", () => {
  assert.deepEqual(validateRegistry(registry), []);
});

test("both axes are populated", () => {
  assert.ok(routesForAxis(registry, "framework").length >= 7);
  assert.ok(
    routesForAxis(registry, "app").length >= 10,
    "The app axis is what routes a user's first prompt after `create`; a thin one cannot.",
  );
});

test("every framework route maps at least one path pattern", () => {
  for (const route of routesForAxis(registry, "framework")) {
    assert.ok(
      (route.paths ?? []).length > 0,
      `Framework route "${route.id}" declares no paths, so check:preflight can never require it.`,
    );
  }
});

test("changed files map to the routes that own them", () => {
  assert.deepEqual(requiredRoutes(registry, ["src/appcraft/kernel/projection.ts"]), ["kernel"]);
  assert.deepEqual(requiredRoutes(registry, ["docs/verification.md"]), ["docs"]);
  assert.deepEqual(requiredRoutes(registry, ["e2e/appcraft-acceptance.ts"]), ["enforcement"]);
  assert.deepEqual(requiredRoutes(registry, ["scripts/check-skills.mjs"]), ["enforcement"]);
  assert.deepEqual(
    requiredRoutes(registry, ["src/appcraft/kernel/projection.ts", "AGENTS.md"]),
    ["docs", "kernel"],
  );
});

test("src/appcraft is not mistaken for src/app", () => {
  // The prefix bug that broke the boundary rules would break routing the same way.
  assert.deepEqual(requiredRoutes(registry, ["src/appcraft/schema/index.ts"]), ["schema"]);
});

test("an unrelated file requires no route", () => {
  assert.deepEqual(requiredRoutes(registry, ["LICENSE", "some/other/file.txt"]), []);
});

test("app-axis routes carry no path patterns — they route intent, not files", () => {
  for (const route of routesForAxis(registry, "app")) {
    assert.equal(
      (route.paths ?? []).length,
      0,
      `App route "${route.id}" declares paths, but it applies inside a generated app, not here.`,
    );
  }
});

test("validation rejects duplicate ids, bad ids, unknown axes and broken patterns", () => {
  const base = { axes: { framework: { validateDocuments: false } } };

  assert.ok(
    validateRegistry({ ...base, routes: [{ axis: "framework", id: "a", surface: "x" }, { axis: "framework", id: "a", surface: "x" }] })
      .some((problem) => problem.includes("Duplicate")),
  );
  assert.ok(
    validateRegistry({ ...base, routes: [{ axis: "framework", id: "Bad_Id", surface: "x" }] })
      .some((problem) => problem.includes("kebab-case")),
  );
  assert.ok(
    validateRegistry({ ...base, routes: [{ axis: "nope", id: "a", surface: "x" }] })
      .some((problem) => problem.includes("unknown axis")),
  );
  assert.ok(
    validateRegistry({ ...base, routes: [{ axis: "framework", id: "a", paths: ["("], surface: "x" }] })
      .some((problem) => problem.includes("invalid path pattern")),
  );
  assert.ok(
    validateRegistry({ ...base, routes: [{ axis: "framework", id: "a", surface: "  " }] })
      .some((problem) => problem.includes("describe its surface")),
  );
});

test("a framework route pointing at a missing document is rejected", () => {
  const problems = validateRegistry({
    axes: { framework: { validateDocuments: true } },
    routes: [{ axis: "framework", id: "a", plan: "docs/does-not-exist.md", surface: "x" }],
  });

  assert.ok(problems.some((problem) => problem.includes("does not exist")));
});

test("rendering is deterministic and escapes table delimiters", () => {
  assert.equal(renderAxisTable(registry, "framework"), renderAxisTable(registry, "framework"));

  const table = renderAxisTable(
    { axes: { framework: {} }, routes: [{ axis: "framework", id: "a", surface: "x | y" }] },
    "framework",
  );
  assert.ok(table.includes("x \\| y"), "An unescaped pipe would silently split the row.");
});

test("the app table gains a scale column, the framework table does not", () => {
  assert.ok(renderAxisTable(registry, "app").includes("Scale"));
  assert.ok(!renderAxisTable(registry, "framework").includes("Scale"));
});

test("a generated block round-trips through replace and read", () => {
  const block = renderGeneratedBlock(registry, "framework");
  const document = `# Doc\n\n<!-- appcraft:routes:start -->\nstale\n<!-- appcraft:routes:end -->\n\ntail\n`;
  const updated = replaceGeneratedBlock(document, block);

  assert.equal(readGeneratedBlock(updated), block);
  assert.ok(updated.startsWith("# Doc"));
  assert.ok(updated.endsWith("tail\n"));
  assert.ok(!updated.includes("stale"));
});

test("replacing without markers fails loudly rather than appending", () => {
  assert.throws(() => replaceGeneratedBlock("# Doc\n", "block"), /missing the/);
});
