/**
 * appcraft boundary rules.
 * Encodes the architecture invariants from AGENTS.md as machine checks.
 * Replaces Toolcraft's custom dependency-graph and import-boundary scripts.
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      comment: "projection-graph-acyclic / module acyclicity. Shortest cycle reported.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "kernel-dependency-free",
      comment:
        "kernel-dependency-free: the kernel must not import store, surfaces, controls, or any runtime library.",
      severity: "error",
      from: { path: "^src/appcraft/kernel" },
      to: {
        pathNot:
          "^(src/appcraft/kernel|node_modules/(typescript|tslib))",
      },
    },
    {
      name: "app-uses-public-api-only",
      comment:
        "facade-owns-state: product code imports the appcraft public entry, never internals.",
      severity: "error",
      from: { path: "^src/app" },
      to: { path: "^src/appcraft/(kernel|store|schema|surfaces|controls)/" },
    },
    {
      name: "no-state-libs-in-product",
      comment:
        "facade-owns-state: Zod, Jotai and Immer must not leak into product code.",
      severity: "error",
      from: { path: "^src/app" },
      to: { dependencyTypes: ["npm"], path: "^(jotai|immer|zod)" },
    },
    {
      name: "schema-not-depend-on-surfaces",
      comment: "Schema is declarative; it must not depend on rendering surfaces.",
      severity: "error",
      from: { path: "^src/appcraft/schema" },
      to: { path: "^src/appcraft/(surfaces|controls)" },
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
