/**
 * The appcraft browser acceptance matrix.
 *
 * Toolcraft declares its acceptance matrix per generated app, because every
 * Toolcraft invariant is a product invariant. appcraft's Δ1 invariants belong to
 * the framework — retention, eviction, export scope, validation scope, projection
 * acyclicity and panel-discriminant persistence hold identically in every app — so
 * the matrix is declared here, next to the tests that discharge it, and a fixture
 * app supplies only the surfaces it is exercised through.
 *
 * Each row names the contract rule it discharges, the browser test that discharges
 * it, and the helpers that test must use. `appcraft-acceptance.spec.ts` fails if a
 * row points at a test that does not exist or at a test that reaches its assertion
 * without the declared helper — the mechanism that stops a matrix from being
 * satisfied by a test that asserts nothing.
 */

export type AppcraftProjectionScale = "field" | "collection" | "panel" | "viewmodel";

export type AppcraftAcceptanceKind =
  | "export"
  | "persistence"
  | "projection"
  | "surface"
  | "validation";

export type AppcraftAcceptanceEntry = {
  /** Stable row id, used in worklog evidence. */
  id: string;
  /** Rule id from `docs/decision-contract.md`. Verified to exist. */
  rule: string;
  kind: AppcraftAcceptanceKind;
  /** Scales the row is claimed to hold at. The kernel is scale-invariant. */
  scales: readonly AppcraftProjectionScale[];
  /** What a reader should be able to observe in a browser. */
  statement: string;
  /** Exact `test("…")` name in a sibling spec. */
  browserTestName: string;
  /** Helper identifiers the named test must reference. */
  requiredHelpers: readonly string[];
};

export const appcraftAcceptance: readonly AppcraftAcceptanceEntry[] = [
  {
    id: "retention-across-switch",
    rule: "retain-inactive-branches",
    kind: "projection",
    scales: ["field", "collection", "panel"],
    statement:
      "Switching a discriminant away and back restores the value authored in the original branch.",
    browserTestName: "browser: inactive branches retain authored state across a discriminant switch",
    requiredHelpers: [
      "selectProjectionBranch",
      "readProjectionBranchValue",
      "writeProjectionBranchValue",
    ],
  },
  {
    id: "derived-evicted",
    rule: "evict-derived-state",
    kind: "projection",
    scales: ["field", "collection", "panel"],
    statement:
      "Deactivating a branch drops its derived output; activating it rebuilds rather than reveals.",
    browserTestName: "browser: derived state is evicted for inactive branches and rebuilt on activation",
    requiredHelpers: ["selectProjectionBranch", "readDerivedMarkers", "expectNoDerivedStateForBranch"],
  },
  {
    id: "export-active-only",
    rule: "export-active-projection-only",
    kind: "export",
    scales: ["field", "collection", "panel", "viewmodel"],
    statement: "Export output contains the active projection and no retained inactive branch.",
    browserTestName: "browser: export reads the active projection only",
    requiredHelpers: ["writeProjectionBranchValue", "selectProjectionBranch", "readExportedDocument"],
  },
  {
    id: "inactive-not-validated",
    rule: "inactive-branches-not-validated",
    kind: "validation",
    scales: ["field"],
    statement:
      "A branch left in an invalid state does not block committing or saving while another branch is active.",
    browserTestName: "browser: an invalid inactive branch does not gate a valid document",
    requiredHelpers: ["writeProjectionBranchValue", "selectProjectionBranch", "readValidationState"],
  },
  {
    id: "panel-discriminant-restored",
    rule: "panel-discriminant-persists",
    kind: "persistence",
    scales: ["panel"],
    statement:
      "Reloading restores the last active tab or tool, while its derived state rebuilds rather than being restored from storage.",
    browserTestName: "browser: reload restores the panel discriminant and rebuilds derived state",
    requiredHelpers: ["selectProjectionBranch", "readActiveBranchKey", "expectNoDerivedStateForBranch"],
  },
  {
    id: "envelope-versioned",
    rule: "envelope-versioned",
    kind: "persistence",
    scales: ["field", "collection", "panel", "viewmodel"],
    statement:
      "A persisted envelope carries a version, and a document written by an older version opens after a forward migration.",
    browserTestName: "browser: persisted envelopes carry a version and migrate forward",
    requiredHelpers: ["readPersistedEnvelope", "seedPersistedEnvelope"],
  },
  {
    id: "surfaces-declared",
    rule: "surfaces-declared-not-composed",
    kind: "surface",
    scales: ["panel"],
    statement:
      "Every rendered surface is a declared archetype instance; no surface is composed ad hoc in product code.",
    browserTestName: "browser: every rendered surface is a declared archetype instance",
    requiredHelpers: ["readSurfaceGraph", "expectDeclaredArchetypesOnly"],
  },
  {
    id: "master-detail-projection",
    rule: "layout-archetypes-only",
    kind: "surface",
    scales: ["panel"],
    statement:
      "Master-detail is the primitive at panel scale: one surface supplies the discriminant, another projects the active branch.",
    browserTestName: "browser: master-detail projects the branch selected by its master surface",
    requiredHelpers: ["expectArchetypeInstance", "selectProjectionBranch", "readActiveBranchKey"],
  },
  {
    id: "undo-switch-separate",
    rule: "undo-switch-separate-entry",
    kind: "projection",
    scales: ["field", "collection", "panel"],
    statement:
      "A discriminant switch followed by an edit produces two undo entries, and undoing the switch is lossless.",
    browserTestName: "browser: a discriminant switch is its own undo entry",
    requiredHelpers: ["selectProjectionBranch", "writeProjectionBranchValue", "readProjectionBranchValue"],
  },
];

export type AppcraftPerformanceBudget = {
  /** Worst acceptable single frame gap during the measured interaction. */
  maxFrameGapMs: number;
  /** Worst acceptable long task. */
  maxLongTaskMs: number;
  /** Worst acceptable wall-clock duration for the interaction itself. */
  maxDurationMs: number;
};

export type AppcraftPerformanceScenario = {
  id: string;
  /** What the scenario stresses, in projection terms. */
  statement: string;
  /** Exact `test("…")` name in a sibling spec. */
  browserTestName: string;
  /**
   * The load the scenario must apply. Declared here so a browser test cannot
   * quietly measure a toy input and report a pass.
   */
  workload: { branchCount: number; scale: AppcraftProjectionScale };
  budget: AppcraftPerformanceBudget;
};

export const appcraftPerformance: {
  scenarios: readonly AppcraftPerformanceScenario[];
} = {
  scenarios: [
    {
      id: "collection-branch-activation",
      statement:
        "Activating a branch in a large open projection materialises one branch's derived state, not every branch's.",
      browserTestName: "browser perf: activating a branch in a large collection stays within budget",
      workload: { branchCount: 500, scale: "collection" },
      budget: { maxDurationMs: 200, maxFrameGapMs: 50, maxLongTaskMs: 100 },
    },
    {
      id: "panel-discriminant-switch",
      statement:
        "Switching a panel-scale discriminant evicts the outgoing branch's derived state and materialises the incoming one without a stall.",
      browserTestName: "browser perf: switching a panel discriminant stays within budget",
      workload: { branchCount: 12, scale: "panel" },
      budget: { maxDurationMs: 150, maxFrameGapMs: 50, maxLongTaskMs: 100 },
    },
  ],
};
