/**
 * appcraft boundary rules.
 * Encodes the architecture invariants from AGENTS.md as machine checks.
 * Replaces Toolcraft's custom dependency-graph and import-boundary scripts.
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      comment:
        "Module acyclicity. NOT projection-graph-acyclic — that is a different graph (projection nodes referencing each other's discriminants) and is checked by scripts/check-projection-graph.mjs. A repository can pass one and fail the other.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "kernel-dependency-free",
      comment:
        "kernel-dependency-free: the kernel must not import store, surfaces, controls, or any runtime library. Tests are exempt — the constraint is on what the kernel ships, and a test needs a runner. A kernel test importing the store would still be caught, because vitest is the only exemption.",
      severity: "error",
      from: { path: "^packages/core/src/kernel", pathNot: "\\.test\\.tsx?$" },
      to: {
        pathNot: "^(packages/core/src/kernel|node_modules/(typescript|tslib))",
      },
    },
    {
      name: "kernel-tests-use-no-runtime-libs",
      comment:
        "The exemption above is narrow: kernel tests may import a test runner and the kernel, nothing else.",
      severity: "error",
      from: { path: "^packages/core/src/kernel/.*\\.test\\.tsx?$" },
      to: {
        pathNot: "^(packages/core/src/kernel|node_modules/(vitest|@vitest|typescript|tslib|chai|@types))",
      },
    },
    {
      // NOTE the trailing slash. "^src/app" also matches src/appcraft, so the
      // original pattern forbade the framework from importing its own internals —
      // invisible until real code existed, then it failed every kernel module.
      name: "app-uses-public-api-only",
      comment:
        "facade-owns-state: product code imports the appcraft public entry, never internals.",
      severity: "error",
      from: { path: "^starter/src/app/" },
      to: { path: "^packages/core/src/(kernel|store|schema|surfaces|controls)/" },
    },
    {
      name: "no-state-libs-in-product",
      comment:
        "facade-owns-state: Zod, Jotai and Immer must not leak into product code.",
      severity: "error",
      from: { path: "^starter/src/app/" },
      to: { dependencyTypes: ["npm"], path: "^(jotai|immer|zod)" },
    },
    {
      name: "schema-not-depend-on-surfaces",
      comment: "Schema is declarative; it must not depend on rendering surfaces.",
      severity: "error",
      from: { path: "^packages/core/src/schema" },
      to: { path: "^packages/core/src/(surfaces|controls)" },
    },
    {
      name: "e2e-uses-public-api-only",
      comment:
        "facade-owns-state: browser tests observe behaviour through the declared DOM contract and the public entry, never through framework internals. A test that reaches inside cannot prove an invariant a user could see.",
      severity: "error",
      from: { path: "^starter/e2e/" },
      to: { path: "^packages/core/src/(kernel|store|schema|surfaces|controls)/" },
    },
    {
      name: "no-orphans",
      severity: "warn",
      from: { orphan: true, pathNot: "\\.d\\.ts$" },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    reporterOptions: { text: { highlightFocused: true } },
  },
};
