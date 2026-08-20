import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { coreVersionRange, createAppManifest, sanitisePackageName } from "./app-manifest.mjs";
import { runAppcraftCli } from "./cli.mjs";
import { defaultNameForTarget, parseCreateArgs } from "./create-options.mjs";
import { generateAppcraftApp } from "./generate.mjs";
import { detectLaunchingPackageManager, unsupportedManagerWarning } from "./package-manager.mjs";

async function withTempDir(run) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "appcraft-cli-test-"));
  try {
    return await run(dir);
  } finally {
    await fs.rm(dir, { force: true, recursive: true });
  }
}

function silentContext(overrides = {}) {
  const lines = [];
  return {
    lines,
    context: {
      env: {},
      interactive: false,
      // Present so the CLI treats itself as driven, and so nothing actually spawns.
      runCommand: async () => 0,
      stderr: { write: (line) => lines.push(line) },
      stdout: { write: (line) => lines.push(line) },
      ...overrides,
    },
  };
}

test("parseCreateArgs reads the flags the README documents", () => {
  const options = parseCreateArgs([
    "my-app",
    "--name",
    "custom",
    "--force",
    "--no-install",
    "--agent",
    "claude-code",
  ]);

  assert.equal(options.targetDir, "my-app");
  assert.equal(options.name, "custom");
  assert.equal(options.force, true);
  assert.equal(options.install, false);
  assert.deepEqual(options.agent, ["claude-code"]);
  assert.equal(options.skills, true);
});

test("parseCreateArgs rejects unknown flags rather than ignoring them", () => {
  assert.throws(() => parseCreateArgs(["--wat"]), /Unknown option --wat/);
  assert.throws(() => parseCreateArgs(["--name"]), /--name requires a value/);
  assert.throws(() => parseCreateArgs(["a", "b"]), /already set/);
});

test("package names are sanitised into something npm accepts", () => {
  assert.equal(sanitisePackageName("My App!"), "my-app");
  assert.equal(sanitisePackageName("  ..weird__name--  "), "weird__name");
  assert.equal(defaultNameForTarget("/tmp", "My Cool App"), "my-cool-app");
});

test("a pre-1.0 core version is pinned exactly, not caretted", () => {
  // ^0.1.0 permits 0.2.0, which under semver may break. A generated app must not
  // silently move to it.
  assert.equal(coreVersionRange("0.1.0"), "0.1.0");
  assert.equal(coreVersionRange("1.2.3"), "^1.2.3");
  assert.throws(() => coreVersionRange("not-a-version"), /unparseable core version/);
});

test("the generated manifest drops workspace-only fields and resolves the core range", () => {
  const manifest = createAppManifest(
    {
      name: "appcraft-starter",
      private: true,
      workspaces: ["nope"],
      dependencies: { "@nsdesign/appcraft-core": "*", other: "^1.0.0" },
    },
    { coreVersion: "0.1.0", name: "My App" },
  );

  assert.equal(manifest.name, "my-app");
  assert.equal(manifest.workspaces, undefined);
  assert.equal(manifest.dependencies["@nsdesign/appcraft-core"], "0.1.0");
  assert.equal(manifest.dependencies.other, "^1.0.0", "Unrelated dependencies pass through.");
});

test("a non-npm launcher warns rather than failing", () => {
  assert.equal(detectLaunchingPackageManager({ npm_config_user_agent: "pnpm/9.0.0 node/v22" })?.name, "pnpm");
  assert.match(unsupportedManagerWarning({ npm_config_user_agent: "pnpm/9.0.0" }) ?? "", /supports npm only/);
  assert.equal(unsupportedManagerWarning({ npm_config_user_agent: "npm/10.9.0" }), undefined);
  assert.equal(unsupportedManagerWarning({}), undefined);
});

test("generation produces a standalone app", async () => {
  await withTempDir(async (dir) => {
    const result = await generateAppcraftApp({ cwd: dir, name: "demo", targetDir: "demo" });
    const read = (file) => fs.readFile(path.join(result.targetDir, file), "utf8");

    const manifest = JSON.parse(await read("package.json"));
    assert.equal(manifest.name, "demo");
    assert.equal(manifest.workspaces, undefined);
    assert.notEqual(
      manifest.dependencies["@nsdesign/appcraft-core"],
      "*",
      "A star range resolves inside our workspace and installs nothing elsewhere.",
    );

    assert.match(await read("AGENTS.md"), /appcraft App Contract/);
    assert.match(await read("docs/agent-worklog.md"), /Mode: starter/);
    assert.ok(await read("docs/appcraft/verification.md"));
    assert.ok(await read(".agents/skills/projection-modeling/SKILL.md"));
    assert.ok(await read("e2e/appcraft-acceptance.ts"));
    assert.ok(await read("docs/appcraft/decision-contract.md"));
  });
});

test("every command the CLI prints exists in the generated manifest", async () => {
  // The defect this catches: telling a user to run `npm run dev` when no dev script
  // was ever written. Found by running the CLI, not by any unit test.
  await withTempDir(async (dir) => {
    const { context, lines } = silentContext({ cwd: dir });
    await runAppcraftCli(["create", "demo", "--yes", "--no-install"], context);

    const manifest = JSON.parse(
      await fs.readFile(path.join(dir, "demo/package.json"), "utf8"),
    );
    const printed = [...lines.join("").matchAll(/npm run ([a-z:]+)/g)].map((match) => match[1]);

    assert.ok(printed.length > 0, "The CLI must print at least one npm script.");
    for (const script of printed) {
      assert.ok(
        script in manifest.scripts,
        `The CLI prints "npm run ${script}" but the generated app has no such script.`,
      );
    }
  });
});

test("the generated app is standalone — nothing reaches outside its own directory", async () => {
  await withTempDir(async (dir) => {
    const result = await generateAppcraftApp({ cwd: dir, name: "demo", targetDir: "demo" });

    const tsconfig = JSON.parse(
      await fs.readFile(path.join(result.targetDir, "tsconfig.json"), "utf8"),
    );
    assert.equal(
      tsconfig.extends,
      undefined,
      "Extending a parent config breaks the moment the app leaves the monorepo.",
    );

    const suite = await fs.readFile(
      path.join(result.targetDir, "e2e/appcraft-acceptance.spec.ts"),
      "utf8",
    );
    assert.doesNotMatch(
      suite,
      /repoRoot/,
      "A generated app has no repository above it to read a contract from.",
    );
  });
});

test("the packaged layout resolves a core version without the monorepo", async () => {
  // The first real `npm pack` run failed here: resolveCoreVersion looked for
  // packages/core/package.json, which exists in a checkout and never in the tarball.
  // Nothing in the repo path could have caught it.
  const { resolveTemplateSources } = await import("./paths.mjs");
  const sources = resolveTemplateSources();

  if (sources.source === "packaged") {
    await withTempDir(async (dir) => {
      const result = await generateAppcraftApp({ cwd: dir, name: "packaged", targetDir: "packaged" });
      const manifest = JSON.parse(
        await fs.readFile(path.join(result.targetDir, "package.json"), "utf8"),
      );
      assert.match(manifest.dependencies["@nsdesign/appcraft-core"], /^\d+\.\d+\.\d+/);
    });
    return;
  }

  // Running from a checkout: assert the packaged branch has a source of truth to read.
  const manifest = JSON.parse(
    await fs.readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.match(
    manifest.version,
    /^\d+\.\d+\.\d+/,
    "The packaged branch falls back to the CLI's own version, so it must be a real one.",
  );
});

test("no .gitkeep placeholder reaches a generated app", async () => {
  // A .gitkeep exists to hold an empty directory in git. Once the directory has real
  // files it is dead weight, and shipping one into every generated app hands the user
  // a placeholder describing *our* fixture. This kept reappearing after it was deleted
  // from the starter, because a stale packages/cli/templates left by `npm pack`
  // shadows starter/ in resolveTemplateSources — which is what postpack now prevents.
  await withTempDir(async (dir) => {
    const result = await generateAppcraftApp({ cwd: dir, name: "demo", targetDir: "demo" });
    const entries = await fs.readdir(result.targetDir, {
      recursive: true,
      withFileTypes: true,
    });
    const placeholders = entries
      .filter((entry) => entry.isFile() && entry.name === ".gitkeep")
      .map((entry) => path.relative(result.targetDir, path.join(entry.parentPath, entry.name)));

    assert.deepEqual(
      placeholders,
      [],
      `A generated app must carry no .gitkeep; found ${placeholders.join(", ")}`,
    );
  });
});

test("the app's worklog is fresh, not the framework's history", async () => {
  await withTempDir(async (dir) => {
    const result = await generateAppcraftApp({ cwd: dir, name: "demo", targetDir: "demo" });
    const worklog = await fs.readFile(path.join(result.targetDir, "docs/agent-worklog.md"), "utf8");

    assert.doesNotMatch(
      worklog,
      /Mode: framework|monorepo-restructure|field-scale-kernel/,
      "Shipping the framework's decision trail would satisfy the app's worklog gate for free.",
    );
  });
});

test("generation refuses a non-empty directory unless forced", async () => {
  await withTempDir(async (dir) => {
    const target = path.join(dir, "occupied");
    await fs.mkdir(target, { recursive: true });
    await fs.writeFile(path.join(target, "keep.txt"), "mine");

    await assert.rejects(
      generateAppcraftApp({ cwd: dir, name: "demo", targetDir: "occupied" }),
      /is not empty/,
    );

    assert.equal(await fs.readFile(path.join(target, "keep.txt"), "utf8"), "mine");

    await generateAppcraftApp({ cwd: dir, force: true, name: "demo", targetDir: "occupied" });
    assert.equal(
      await fs.readFile(path.join(target, "keep.txt"), "utf8"),
      "mine",
      "--force merges; it must not delete files the user already had.",
    );
  });
});

test("a failed generation leaves no target and no staging directory", async () => {
  await withTempDir(async (dir) => {
    await assert.rejects(
      // An unusable name fails after staging has begun.
      generateAppcraftApp({ cwd: dir, name: "!!!", targetDir: "doomed" }),
      /package name/i,
    );

    const entries = await fs.readdir(dir);
    assert.deepEqual(
      entries,
      [],
      `A failed generation must leave nothing behind; found ${entries.join(", ")}`,
    );
  });
});

test("the CLI reports the next steps a user actually needs", async () => {
  await withTempDir(async (dir) => {
    const { context, lines } = silentContext({ cwd: dir });
    const code = await runAppcraftCli(["create", "demo", "--yes", "--no-install"], context);
    const output = lines.join("");

    assert.equal(code, 0);
    assert.match(output, /Created demo/);
    assert.match(output, /cd demo/);
    assert.match(output, /npm install/, "Install was skipped, so it must be in the next steps.");
    assert.match(output, /npm run test/, "Only commands the generated app can actually run.");
  });
});

test("unknown commands fail rather than silently doing nothing", async () => {
  const { context, lines } = silentContext();
  assert.equal(await runAppcraftCli(["destroy"], context), 1);
  assert.match(lines.join(""), /Unknown command "destroy"/);
});

test("help works without a target directory", async () => {
  const { context, lines } = silentContext();
  assert.equal(await runAppcraftCli(["create", "--help"], context), 0);
  assert.match(lines.join(""), /--core-version/);
});

// ---------------------------------------------------------------------------
// Regressions from the first real use of `npx @nsdesign/appcraft create`.
// Every test below names a defect that shipped in 0.1.0 and was found by running
// the CLI against an empty GitHub repository, not by any test that existed then.
// ---------------------------------------------------------------------------

test("a clone holding only .git is not 'not empty'", async () => {
  // The ordinary way to start: create the repo, clone it, scaffold into the clone.
  // 0.1.0 refused it and told the user to pass --force, which is the one flag that
  // can overwrite real work.
  await withTempDir(async (dir) => {
    const target = path.join(dir, "cloned");
    await fs.mkdir(path.join(target, ".git"), { recursive: true });
    await fs.writeFile(path.join(target, ".git/HEAD"), "ref: refs/heads/main\n");
    await fs.writeFile(path.join(target, "README.md"), "# cloned\n");

    await generateAppcraftApp({ cwd: dir, name: "demo", targetDir: "cloned" });

    assert.ok(await pathExistsForTest(path.join(target, "AGENTS.md")));
    assert.equal(
      await fs.readFile(path.join(target, ".git/HEAD"), "utf8"),
      "ref: refs/heads/main\n",
      "Generation must not disturb the clone it was invited into.",
    );
  });
});

test("a README and licence the user already chose are left alone", async () => {
  await withTempDir(async (dir) => {
    const target = path.join(dir, "app");
    await fs.mkdir(target, { recursive: true });
    await fs.writeFile(path.join(target, "README.md"), "# mine\n");
    await fs.writeFile(path.join(target, "LICENSE"), "my licence\n");

    await generateAppcraftApp({ cwd: dir, name: "demo", targetDir: "app" });

    assert.equal(await fs.readFile(path.join(target, "README.md"), "utf8"), "# mine\n");
    assert.equal(await fs.readFile(path.join(target, "LICENSE"), "utf8"), "my licence\n");
  });
});

test("an app with no README or licence is given both", async () => {
  await withTempDir(async (dir) => {
    await generateAppcraftApp({ cwd: dir, name: "demo", targetDir: "demo" });

    const readme = await fs.readFile(path.join(dir, "demo/README.md"), "utf8");
    const licence = await fs.readFile(path.join(dir, "demo/LICENSE"), "utf8");
    const manifest = JSON.parse(await fs.readFile(path.join(dir, "demo/package.json"), "utf8"));

    assert.match(readme, /^# demo$/m);
    assert.match(licence, /MIT License/);
    assert.equal(
      manifest.license,
      "MIT",
      "The manifest names a licence; the repository must carry its text.",
    );
  });
});

test("the generated .gitignore keeps node_modules out of the user's first commit", async () => {
  // `create` installs by default, so node_modules exists before the user's first
  // `git add`. 0.1.0 shipped a two-line ignore file that did not mention it — while
  // the comment explaining the whole pack-as-`gitignore` mechanism said the point of
  // it was that "a generated app [does not] commit its own node_modules".
  await withTempDir(async (dir) => {
    await generateAppcraftApp({ cwd: dir, name: "demo", targetDir: "demo" });

    const ignored = await fs.readFile(path.join(dir, "demo/.gitignore"), "utf8");
    for (const entry of ["node_modules", "dist", "test-results", "playwright-report"]) {
      assert.match(ignored, new RegExp(`^${entry}`, "m"), `.gitignore must cover ${entry}.`);
    }
  });
});

test("--no-skills does what its help text says", async () => {
  // The flag documented "do not copy the workflow skills into the app" but only ever
  // suppressed the separate --agent install; generation copied them regardless.
  await withTempDir(async (dir) => {
    const { context } = silentContext({ cwd: dir });
    await runAppcraftCli(["create", "demo", "--yes", "--no-install", "--no-skills"], context);

    assert.equal(
      await pathExistsForTest(path.join(dir, "demo/.agents/skills")),
      false,
      "--no-skills must not copy skills into the app.",
    );
  });
});

test("the contract gate AGENTS.md names is present and runnable", async () => {
  // AGENTS.md routes the style-guide gate to `npm run check:style-guide`. In 0.1.0 no
  // generated app had that script, or a scripts/ directory at all: the contract's own
  // enforcement did not ship with the contract.
  await withTempDir(async (dir) => {
    await generateAppcraftApp({ cwd: dir, name: "demo", targetDir: "demo" });

    const appRoot = path.join(dir, "demo");
    const manifest = JSON.parse(await fs.readFile(path.join(appRoot, "package.json"), "utf8"));
    const contract = await fs.readFile(path.join(appRoot, "AGENTS.md"), "utf8");

    for (const script of [...contract.matchAll(/npm run ([a-z][a-z:-]*)/g)].map((m) => m[1])) {
      assert.ok(
        script in manifest.scripts,
        `AGENTS.md tells the agent to run "npm run ${script}", which the app does not define.`,
      );
    }

    for (const [name, command] of Object.entries(manifest.scripts)) {
      const script = command.match(/^node (scripts\/[\w.-]+)$/)?.[1];
      if (script) {
        assert.ok(
          await pathExistsForTest(path.join(appRoot, script)),
          `Script "${name}" runs ${script}, which was not generated.`,
        );
      }
    }
  });
});

test("the shipped registry describes app routes only", async () => {
  // A framework route id in an app's attestation would read as diligence while naming
  // work the app cannot do.
  await withTempDir(async (dir) => {
    await generateAppcraftApp({ cwd: dir, name: "demo", targetDir: "demo" });

    const registry = JSON.parse(
      await fs.readFile(path.join(dir, "demo/docs/routes.json"), "utf8"),
    );

    assert.deepEqual(Object.keys(registry.axes), ["app"]);
    assert.ok(registry.routes.length > 0);
    assert.ok(
      registry.routes.every((route) => route.axis === "app"),
      "A generated app must not carry framework routes.",
    );
  });
});

test("the performance budgets are not run against a contended browser", async () => {
  // `npm test` on a freshly generated app failed: test:browser ran every spec at
  // Playwright's default worker count, and the frame-gap budgets lose to the
  // contention. The perf script existed with --workers=1 precisely because they are
  // meant to run alone; nothing made the general run skip them.
  await withTempDir(async (dir) => {
    await generateAppcraftApp({ cwd: dir, name: "demo", targetDir: "demo" });

    const { scripts } = JSON.parse(
      await fs.readFile(path.join(dir, "demo/package.json"), "utf8"),
    );

    assert.match(scripts["test:browser"], /--grep-invert "browser perf:"/);
    assert.match(scripts["test:browser:perf"], /--workers=1/);
    assert.match(
      scripts["verify:final"],
      /test:browser:perf/,
      "Excluding the budgets from the general run must not drop them from the gate.",
    );
  });
});

test("the CLI prints the browser install the gate depends on", async () => {
  await withTempDir(async (dir) => {
    const { context, lines } = silentContext({ cwd: dir });
    await runAppcraftCli(["create", "demo", "--yes", "--no-install"], context);

    assert.match(
      lines.join(""),
      /playwright install/,
      "`npm test` drives a browser; telling the user to run it without saying so prints a command that fails.",
    );
  });
});

async function pathExistsForTest(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}
