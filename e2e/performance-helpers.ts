/**
 * Performance probes.
 *
 * Retention makes appcraft cheap only if eviction actually happens: a 500-entity
 * collection retaining document and authored-inactive state costs low single-digit
 * megabytes, while 500 sets of live derived caches cost gigabytes. That makes
 * activation cost the framework's characteristic performance question, and these
 * probes measure it the way a user experiences it — frame gaps and long tasks during
 * a real interaction, not a synthetic timer around a function call.
 */
import { expect, type Page } from "@playwright/test";

import type { AppcraftPerformanceBudget, AppcraftPerformanceScenario } from "./appcraft-acceptance";

export type FrameProbeResult = {
  longTaskCount: number;
  longTaskMaxMs: number;
  maxFrameGapMs: number;
  sampleCount: number;
};

export type InteractionResult = FrameProbeResult & {
  durationMs: number;
};

export type InteractionOptions = {
  settleFrames?: number;
};

type ProbeState = {
  active: boolean;
  longTaskCount: number;
  longTaskMaxMs: number;
  maxFrameGapMs: number;
  observer?: PerformanceObserver;
  rafId: number;
  sampleCount: number;
};

type ProbeWindow = Window & {
  __appcraftFrameProbe?: ProbeState;
  __appcraftStopFrameProbe?: () => FrameProbeResult;
};

export async function startFrameProbe(page: Page): Promise<() => Promise<FrameProbeResult>> {
  await page.evaluate(() => {
    const win = window as ProbeWindow;

    if (win.__appcraftFrameProbe?.active) {
      cancelAnimationFrame(win.__appcraftFrameProbe.rafId);
    }

    let lastFrame = performance.now();
    const probe: ProbeState = {
      active: true,
      longTaskCount: 0,
      longTaskMaxMs: 0,
      maxFrameGapMs: 0,
      rafId: 0,
      sampleCount: 0,
    };
    win.__appcraftFrameProbe = probe;

    try {
      probe.observer = new PerformanceObserver((list) => {
        if (!probe.active) {
          return;
        }

        for (const entry of list.getEntries()) {
          probe.longTaskCount += 1;
          probe.longTaskMaxMs = Math.max(probe.longTaskMaxMs, entry.duration);
        }
      });
      probe.observer.observe({ entryTypes: ["longtask"] });
    } catch {
      // Some contexts do not expose longtask entries. Frame gaps still catch jank.
    }

    const tick = (now: number) => {
      if (!probe.active) {
        return;
      }

      probe.maxFrameGapMs = Math.max(probe.maxFrameGapMs, now - lastFrame);
      probe.sampleCount += 1;
      lastFrame = now;
      probe.rafId = requestAnimationFrame(tick);
    };

    probe.rafId = requestAnimationFrame(tick);

    win.__appcraftStopFrameProbe = () => {
      probe.active = false;
      cancelAnimationFrame(probe.rafId);
      probe.observer?.disconnect();

      return {
        longTaskCount: probe.longTaskCount,
        longTaskMaxMs: probe.longTaskMaxMs,
        maxFrameGapMs: probe.maxFrameGapMs,
        sampleCount: probe.sampleCount,
      };
    };
  });

  return async () =>
    page.evaluate(
      () =>
        (window as ProbeWindow).__appcraftStopFrameProbe?.() ?? {
          longTaskCount: 0,
          longTaskMaxMs: 0,
          maxFrameGapMs: 0,
          sampleCount: 0,
        },
    );
}

export async function waitForAnimationFrames(page: Page, count: number): Promise<void> {
  await page.evaluate(
    (frames) =>
      new Promise<void>((resolve) => {
        let remaining = frames;

        const step = () => {
          remaining -= 1;
          if (remaining <= 0) {
            resolve();
            return;
          }
          requestAnimationFrame(step);
        };

        requestAnimationFrame(step);
      }),
    Math.max(1, count),
  );
}

export async function measureInteraction(
  page: Page,
  action: () => Promise<void>,
  options: InteractionOptions = {},
): Promise<InteractionResult> {
  const stopProbe = await startFrameProbe(page);
  const startedAt = await page.evaluate(() => performance.now());

  await action();

  const endedAt = await page.evaluate(() => performance.now());
  await waitForAnimationFrames(page, options.settleFrames ?? 3);

  const frameProbe = await stopProbe();

  return { durationMs: endedAt - startedAt, ...frameProbe };
}

export function getPerformanceScenario(
  performance: { scenarios: readonly AppcraftPerformanceScenario[] },
  scenarioId: string,
): AppcraftPerformanceScenario {
  const scenario = performance.scenarios.find((entry) => entry.id === scenarioId);

  if (!scenario) {
    throw new Error(`Unknown performance scenario "${scenarioId}".`);
  }

  return scenario;
}

/**
 * Read the declared workload. Tests must size their fixture from this rather than
 * from a literal, so a scenario cannot be made to pass by measuring a toy input.
 */
export function getPerformanceWorkload(
  performance: { scenarios: readonly AppcraftPerformanceScenario[] },
  scenarioId: string,
): AppcraftPerformanceScenario["workload"] {
  return getPerformanceScenario(performance, scenarioId).workload;
}

export function expectScenarioPerformanceBudget(
  result: InteractionResult,
  performance: { scenarios: readonly AppcraftPerformanceScenario[] },
  scenarioId: string,
): void {
  expectPerformanceBudget(result, getPerformanceScenario(performance, scenarioId).budget, scenarioId);
}

export function expectPerformanceBudget(
  result: InteractionResult,
  budget: AppcraftPerformanceBudget,
  label: string,
): void {
  expect(
    result.sampleCount,
    `${label}: the frame probe collected no samples, so the measurement proves nothing.`,
  ).toBeGreaterThan(0);
  expect(result.durationMs, `${label}: interaction duration exceeded budget.`).toBeLessThanOrEqual(
    budget.maxDurationMs,
  );
  expect(result.maxFrameGapMs, `${label}: dropped frames exceeded budget.`).toBeLessThanOrEqual(
    budget.maxFrameGapMs,
  );
  expect(result.longTaskMaxMs, `${label}: a long task exceeded budget.`).toBeLessThanOrEqual(
    budget.maxLongTaskMs,
  );
}
