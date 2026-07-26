---
name: brainstorming
description: Use before adding or changing appcraft surfaces, schema, projections, or framework behaviour.
---

# appcraft Brainstorming

Use this skill before changing appcraft's kernel, composition schema, store facade,
surface archetypes, control bindings, or enforcement — and before specifying a
fixture app that exercises them.

## Process

1. Read `AGENTS.md`, then `docs/design/appcraft-core-architecture.md`, then
   `docs/decision-contract.md`. One document per read; never concatenate.
2. Name the product goal, the visible surfaces, the editable entities, and the
   relationships between them.
3. **Find the discriminants.** For every relationship, ask what selects the active
   branch: a variant tag, a selected item id, an active tab or tool, or an app mode.
   Each answer is the same primitive at a different scale.
4. Classify every field of every branch as **document**, **authored-inactive**, or
   **derived**. Nothing is unclassified; `field-classification-required` is an
   invariant.
5. Decide whether the projection is **closed** (keys fixed by schema) or **open**
   (keys from data, so `order` plus add/remove/reorder/filter apply).
6. Apply the scope litmus test — *would a different app need something else here?*
   Yes means it is a seam belonging to an app or starter kit, not to `src/appcraft`.
7. Choose the verification tier before planning, and record decisions plus rejected
   alternatives in `docs/agent-worklog.md`.

## appcraft Rule

Do not invent a bespoke mechanism for a relationship the primitive already covers.
Layers, timeline tracks, tabbed sections, and master-detail are instances of one
discriminant→projection primitive, not four features. Transport is the documented
exception: a playhead interpolates between two bracketing keys rather than selecting
one branch, so it is a derived sampler (`transport-not-a-projection`).

The local appcraft contract is the source of truth. Do not ask the user to confirm
decisions already settled by the prompt, `AGENTS.md`, or the design documents.
