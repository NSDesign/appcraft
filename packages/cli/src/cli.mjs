/**
 * The `appcraft` command.
 *
 * One verb for now. Toolcraft's CLI grew `create` first and everything else after;
 * appcraft starts the same way rather than inventing a command surface before there
 * is a second thing to do.
 */
import { spawn } from "node:child_process";
import path from "node:path";

import { CREATE_HELP, parseCreateArgs, resolveCreateOptions } from "./create-options.mjs";
import { generateAppcraftApp } from "./generate.mjs";
import { createRunScriptCommand, unsupportedManagerWarning } from "./package-manager.mjs";

const HELP = `appcraft — build complex applications with an agent.

Usage
  npx @nsdesign/appcraft <command> [options]

Commands
  create [directory]   Scaffold an appcraft application.

Run \`appcraft create --help\` for the create options.
`;

function write(context, line = "") {
  (context.stdout ?? process.stdout).write(`${line}\n`);
}

function writeError(context, line) {
  (context.stderr ?? process.stderr).write(`${line}\n`);
}

async function runCommand(command, args, options, context) {
  if (context.runCommand) {
    return context.runCommand(command, args, options);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(code) : reject(new Error(`${command} exited with ${code}`)),
    );
  });
}

async function runCreate(argv, context) {
  const parsed = parseCreateArgs(argv);

  if (parsed.help) {
    write(context, CREATE_HELP.trimEnd());
    return 0;
  }

  const warning = unsupportedManagerWarning(context.env ?? process.env);
  if (warning) {
    writeError(context, `warning: ${warning}`);
  }

  const options = await resolveCreateOptions(parsed, context);
  const result = await generateAppcraftApp({
    cwd: options.cwd,
    force: options.force,
    name: options.name,
    skills: options.skills,
    targetDir: options.targetDir,
    ...(options.coreVersion ? { coreVersion: options.coreVersion } : {}),
  });

  write(context, "");
  write(context, `Created ${result.packageName} at ${result.targetDir}`);

  if (options.install) {
    write(context, "");
    write(context, "Installing dependencies...");
    await runCommand("npm", ["install"], { cwd: result.targetDir }, context);
  }

  // Skills are copied into the app by generation. `--agent` additionally installs
  // them into the agent's own location, which is what makes them available outside
  // this folder. Failure here is reported and never fatal: a missing skill is
  // recorded, never silently skipped, and never a reason to weaken the app.
  for (const agent of options.skills ? options.agent : []) {
    write(context, `Installing skills into ${agent}...`);
    try {
      await runCommand(
        "npx",
        ["-y", "skills", "add", path.join(result.targetDir, ".agents/skills"), "--agent", agent],
        { cwd: result.targetDir },
        context,
      );
    } catch (error) {
      writeError(
        context,
        `warning: could not install skills into ${agent} (${error.message}). ` +
          `They are still present in .agents/skills; record the gap in docs/agent-worklog.md.`,
      );
    }
  }

  // Print only commands the generated app can actually run. A scaffolder whose very
  // first instruction fails has spent the user's trust before they wrote a line.
  write(context, "");
  write(context, "Next steps:");
  if (result.relativeTargetDir !== ".") {
    write(context, `  cd ${result.relativeTargetDir}`);
  }
  if (!options.install) {
    write(context, "  npm install");
  }
  // The gate drives a real browser, and Playwright does not install one with the
  // dependencies. Printing `npm test` without this is printing a command that fails.
  write(context, "  npx playwright install --with-deps   # the gate drives a browser");
  write(context, `  ${createRunScriptCommand("test")}    # the verification gate`);
  write(context, "");
  write(context, "Then open the folder in your agent and describe the app you want, e.g.");
  write(context, '  "Build a layer-based vector editor with a properties inspector."');
  write(context, "");
  write(context, "The agent reads AGENTS.md, routes the request, and asks for your style");
  write(context, "guide before it writes any code.");

  return 0;
}

/**
 * @param {string[]} argv
 * @param {object} [context]  injection seam for tests: cwd, env, stdout, runCommand
 * @returns {Promise<number>} exit code
 */
export async function runAppcraftCli(argv, context = {}) {
  const [command, ...rest] = argv;

  try {
    if (!command || command === "--help" || command === "-h" || command === "help") {
      write(context, HELP.trimEnd());
      return 0;
    }

    if (command === "--version" || command === "-v") {
      write(context, await readVersion());
      return 0;
    }

    if (command === "create") {
      return await runCreate(rest, context);
    }

    writeError(context, `Unknown command "${command}". Run \`appcraft --help\`.`);
    return finish(context, 1);
  } catch (error) {
    writeError(context, `appcraft: ${error instanceof Error ? error.message : String(error)}`);
    return finish(context, 1);
  }
}

/** Set the process exit code unless a test is driving the CLI in-process. */
function finish(context, code) {
  if (!context.runCommand && code !== 0) {
    process.exitCode = code;
  }
  return code;
}

async function readVersion() {
  const { readFile } = await import("node:fs/promises");
  const { packageRoot } = await import("./paths.mjs");
  const manifest = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
  return manifest.version;
}
