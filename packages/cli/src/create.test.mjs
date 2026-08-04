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
