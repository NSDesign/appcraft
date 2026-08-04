/**
 * The route registry, loaded and validated.
 *
 * Toolcraft maintains its routing table by hand in two documents, which is exactly
 * the drift the delta map asks appcraft to design out: "generate the table from a
 * single route registry so `AGENTS.md` and `workflow.md` cannot drift."
 *
 * Three consumers read this module — the table generator, `check:preflight`'s
 * changed-file matching, and (from pass 3) the starter's own contract. None of them
 * keeps its own copy.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const registryPath = path.join(projectRoot, "docs/routes.json");

/**
 * @typedef {{
 *   id: string,
 *   axis: string,
 *   surface: string,
 *   scale?: string,
 *   plan?: string,
 *   implementation?: string,
 *   verification?: string,
 *   paths?: string[],
 *   skills?: string[],
 * }} Route
 */

export function loadRegistry(file = registryPath) {
  const registry = JSON.parse(readFileSync(file, "utf8"));
  const problems = validateRegistry(registry);

  if (problems.length > 0) {
    throw new Error(`Invalid route registry:\n- ${problems.join("\n- ")}`);
  }

  return registry;
}

/** Structural problems, as a list rather than a throw, so a checker can report all. */
export function validateRegistry(registry) {
  const problems = [];
  const axes = registry?.axes ?? {};
  const routes = Array.isArray(registry?.routes) ? registry.routes : undefined;

  if (!routes) {
    return ["`routes` must be an array."];
  }

  const seen = new Set();

  for (const route of routes) {
    if (typeof route?.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(route.id)) {
      problems.push(`Route id ${JSON.stringify(route?.id)} must be lower-case kebab-case.`);
      continue;
    }
    if (seen.has(route.id)) {
      problems.push(`Duplicate route id "${route.id}".`);
    }
    seen.add(route.id);

    if (!Object.prototype.hasOwnProperty.call(axes, route.axis)) {
      problems.push(`Route "${route.id}" declares unknown axis "${route.axis}".`);
    }
    if (typeof route.surface !== "string" || route.surface.trim() === "") {
      problems.push(`Route "${route.id}" must describe its surface.`);
    }

    for (const pattern of route.paths ?? []) {
      try {
        new RegExp(pattern);
      } catch (error) {
        problems.push(`Route "${route.id}" has an invalid path pattern ${pattern}: ${error.message}`);
      }
    }

    // A framework route's documents must exist; an app route's live in a generated
    // app and cannot be resolved from here.
    if (axes[route.axis]?.validateDocuments) {
      for (const field of ["plan", "implementation", "verification"]) {
        const value = route[field];
        if (typeof value === "string" && value.endsWith(".md") && !existsSync(path.join(projectRoot, value))) {
          problems.push(`Route "${route.id}" points ${field} at ${value}, which does not exist.`);
        }
      }
    }
  }

  return problems;
}

/**
 * Documents an axis's routes point at, deduplicated. App-axis documents live inside a
 * generated app, so they are resolved against the starter rather than the repo root.
 */
export function routeDocuments(registry, axis) {
  const documents = new Set();

  for (const route of routesForAxis(registry, axis)) {
    for (const field of ["plan", "implementation", "verification"]) {
      const value = route[field];
      if (typeof value === "string" && value.endsWith(".md")) {
        documents.add(value);
      }
    }
  }

  return [...documents].sort();
}

export function routesForAxis(registry, axis) {
  return registry.routes.filter((route) => route.axis === axis);
}

/** Every path pattern, compiled, keyed by route id. Used by check:preflight. */
export function routePathMatchers(registry) {
  return registry.routes
    .filter((route) => (route.paths ?? []).length > 0)
    .map((route) => ({
      id: route.id,
      patterns: route.paths.map((pattern) => new RegExp(pattern)),
    }));
}

/** Route ids a changed file set requires, sorted. */
export function requiredRoutes(registry, changedFiles) {
  return routePathMatchers(registry)
    .filter(({ patterns }) =>
      changedFiles.some((file) => patterns.some((pattern) => pattern.test(file))),
    )
    .map(({ id }) => id)
    .sort();
}

function cell(value) {
  return value === undefined || value === "" ? "—" : String(value).replaceAll("|", "\\|");
}

/** Render one axis as a Markdown table. Deterministic: registry order is the order. */
export function renderAxisTable(registry, axis) {
  const routes = routesForAxis(registry, axis);
  const withScale = routes.some((route) => route.scale);

  const header = withScale
    ? ["Route id", "Fires on", "Scale", "Plan", "Implementation", "Verification"]
    : ["Route id", "Surface", "Plan", "Implementation", "Verification"];

  const rows = routes.map((route) => {
    const base = [`\`${route.id}\``, cell(route.surface)];
    if (withScale) {
      base.push(cell(route.scale));
    }
    return [...base, cell(route.plan), cell(route.implementation), cell(route.verification)];
  });

  return [
    `| ${header.join(" | ")} |`,
    `|${header.map(() => "---").join("|")}|`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

export const GENERATED_START = "<!-- appcraft:routes:start -->";
export const GENERATED_END = "<!-- appcraft:routes:end -->";

/**
 * The generated block for a document, including the warning that editing it is
 * pointless. Generation is what makes drift impossible rather than merely detected.
 */
export function renderGeneratedBlock(registry, axis) {
  return [
    GENERATED_START,
    `<!-- Generated from docs/routes.json by scripts/generate-routes.mjs. Do not edit by hand. -->`,
    "",
    renderAxisTable(registry, axis),
    "",
    GENERATED_END,
  ].join("\n");
}

/** Replace the generated block in a document. Throws if the markers are missing. */
export function replaceGeneratedBlock(document, block) {
  const start = document.indexOf(GENERATED_START);
  const end = document.indexOf(GENERATED_END);

  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      `Document is missing the ${GENERATED_START} / ${GENERATED_END} markers.`,
    );
  }

  return document.slice(0, start) + block + document.slice(end + GENERATED_END.length);
}

export function readGeneratedBlock(document) {
  const start = document.indexOf(GENERATED_START);
  const end = document.indexOf(GENERATED_END);

  if (start === -1 || end === -1 || end < start) {
    return undefined;
  }

  return document.slice(start, end + GENERATED_END.length);
}
