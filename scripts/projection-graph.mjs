/**
 * Projection reference graph — the Δ1 checker.
 *
 * A projection node may read another node's discriminant: an inspector's
 * visibility depending on which tool is active, a detail surface depending on a
 * master selection. That reference graph must be acyclic, or activation never
 * settles. This mirrors the module dependency-graph checker one level up, and
 * carries over Toolcraft's good behaviour of reporting the **shortest** cycle
 * deterministically — a 12-node cycle report is not actionable; a 2-node one is.
 *
 * The graph extractor belongs to the schema route and lands with it. This module
 * is the analysis, which is testable today against fixtures and does not depend on
 * the schema existing.
 */

/**
 * @typedef {{ id: string, dependsOn?: readonly string[] }} ProjectionNode
 */

/**
 * Normalise a node list into an adjacency map with deterministic ordering.
 *
 * @param {readonly ProjectionNode[]} nodes
 * @returns {Map<string, string[]>}
 */
export function buildAdjacency(nodes) {
  const adjacency = new Map();

  for (const node of nodes) {
    if (typeof node?.id !== "string" || node.id === "") {
      throw new Error("Every projection node must declare a non-empty string id.");
    }
    if (adjacency.has(node.id)) {
      throw new Error(`Duplicate projection node id "${node.id}".`);
    }
    adjacency.set(node.id, [...new Set(node.dependsOn ?? [])].sort());
  }

  return adjacency;
}

/**
 * References to nodes that were never declared. Reported separately from cycles:
 * a dangling reference is a different defect and a different fix.
 *
 * @param {readonly ProjectionNode[]} nodes
 * @returns {{ from: string, to: string }[]}
 */
export function findDanglingReferences(nodes) {
  const adjacency = buildAdjacency(nodes);
  const dangling = [];

  for (const [id, targets] of [...adjacency].sort(([left], [right]) => left.localeCompare(right))) {
    for (const target of targets) {
      if (!adjacency.has(target)) {
        dangling.push({ from: id, to: target });
      }
    }
  }

  return dangling;
}

/**
 * The shortest cycle in the graph, or undefined when acyclic.
 *
 * Breadth-first from every node finds the shortest cycle through that node; the
 * global minimum is the shortest cycle in the graph. Ties break on the joined path
 * so the same graph always reports the same cycle — an unstable report turns a
 * real defect into a flaky check.
 *
 * Returned as the node sequence with the origin repeated at the end, e.g.
 * `["a", "b", "a"]`, so the cycle reads as a path. Among equally short cycles the
 * lexicographically smallest is reported, which also fixes *which rotation* of a
 * given cycle is shown — the report never depends on which node the walk reached
 * first.
 *
 * @param {readonly ProjectionNode[]} nodes
 * @returns {string[] | undefined}
 */
export function findShortestCycle(nodes) {
  const adjacency = buildAdjacency(nodes);
  /** @type {string[] | undefined} */
  let best;

  for (const origin of [...adjacency.keys()].sort()) {
    const cycle = findShortestCycleThrough(adjacency, origin);

    if (!cycle) {
      continue;
    }

    if (!best || cycle.length < best.length || (cycle.length === best.length && cycle.join(">") < best.join(">"))) {
      best = cycle;
    }
  }

  return best;
}

/**
 * @param {Map<string, string[]>} adjacency
 * @param {string} origin
 * @returns {string[] | undefined}
 */
function findShortestCycleThrough(adjacency, origin) {
  /** @type {Map<string, string>} */
  const cameFrom = new Map();
  const visited = new Set([origin]);
  /** @type {string[]} */
  let frontier = [origin];

  while (frontier.length > 0) {
    /** @type {string[]} */
    const next = [];

    // Sorted so the reconstructed path is stable across runs.
    for (const current of [...frontier].sort()) {
      for (const target of adjacency.get(current) ?? []) {
        if (target === origin) {
          return [...reconstructPath(cameFrom, origin, current), origin];
        }

        if (!adjacency.has(target) || visited.has(target)) {
          continue;
        }

        visited.add(target);
        cameFrom.set(target, current);
        next.push(target);
      }
    }

    frontier = next;
  }

  return undefined;
}

/**
 * @param {Map<string, string>} cameFrom
 * @param {string} origin
 * @param {string} node
 * @returns {string[]}
 */
function reconstructPath(cameFrom, origin, node) {
  const path = [node];
  let current = node;

  while (current !== origin) {
    const previous = cameFrom.get(current);
    if (previous === undefined) {
      break;
    }
    path.unshift(previous);
    current = previous;
  }

  return path;
}
