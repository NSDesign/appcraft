# Performance

## Measure the interaction, not the function

A synthetic timer around a call proves the call is fast. Users experience frame gaps
and long tasks during a real interaction, which is what `e2e/performance-helpers.ts`
measures.

## Declare the workload

`e2e/appcraft-acceptance.ts` declares each scenario's workload — branch count and
scale — and the meta-gate requires the test to read it. Without that, a scenario
"passes" against a toy input and the budget means nothing.

## The characteristic question

Retention is cheap only if eviction actually happens, which makes **activation cost**
appcraft's characteristic performance question:

- Activating a branch in a large collection must materialise **one** branch's derived
  state, not every branch's.
- Switching a panel discriminant must evict the outgoing branch and materialise the
  incoming one without a stall.

If activation cost grows with collection size, something is being retained that should
have been evicted — check the field classification before optimising anything.

## Budgets

Budgets are declared per scenario and asserted with
`expectScenarioPerformanceBudget`. A budget nobody derived from a measurement is a
guess; re-derive them against a real fixture rather than inheriting the starter's.
