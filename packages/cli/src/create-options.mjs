/**
 * Argument parsing and interactive resolution for `appcraft create`.
 *
 * Flags follow Toolcraft's where they mean the same thing, because agents and users
 * already know them. Where they differ, appcraft is narrower rather than cleverer.
 */
import path from "node:path";

import { sanitisePackageName } from "./app-manifest.mjs";

export const DEFAULT_PROJECT_NAME = "my-appcraft-app";

export const CREATE_HELP = `appcraft create — scaffold an appcraft application.

Usage
  npx @nsdesign/appcraft create [directory] [options]

Options
  --name <name>        Package name. Defaults to the directory name.
  --core-version <v>   Version of @nsdesign/appcraft-core to depend on.
  --agent <name>       Also install the skills into an agent via the skills CLI.
                       Repeatable. Skills are always copied into the app itself.
  --yes, -y            Accept defaults; never prompt.
  --force, -f          Generate into a non-empty directory.
  --no-install         Skip dependency installation.
  --no-skills          Do not copy the workflow skills into the app.
  --help, -h           Show this message.

Examples
  npx @nsdesign/appcraft create my-app
  npx @nsdesign/appcraft create . --yes
  npx @nsdesign/appcraft create my-app --agent claude-code
`;

function readOptionValue(argv, index, optionName) {
  const value = argv[index + 1];

  if (!value || value.startsWith("-")) {
    throw new Error(`${optionName} requires a value.`);
  }

  return value;
}

export function parseCreateArgs(argv) {
  const options = {
    agent: [],
    coreVersion: undefined,
    force: false,
    help: false,
    install: true,
    name: undefined,
    skills: true,
    targetDir: undefined,
    yes: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case "--help":
      case "-h":
        options.help = true;
        continue;
      case "--force":
      case "-f":
        options.force = true;
        continue;
      case "--yes":
      case "-y":
        options.yes = true;
        continue;
      case "--no-install":
        options.install = false;
        continue;
      case "--no-skills":
        options.skills = false;
        continue;
      case "--name":
        options.name = readOptionValue(argv, index, "--name");
        index += 1;
        continue;
      case "--core-version":
        options.coreVersion = readOptionValue(argv, index, "--core-version");
        index += 1;
        continue;
      case "--agent":
      case "-a":
        options.agent.push(readOptionValue(argv, index, arg));
        index += 1;
        continue;
      default:
        break;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option ${arg}. Run \`appcraft create --help\`.`);
    }

    if (options.targetDir !== undefined) {
      throw new Error(`Unexpected argument ${arg}: a target directory is already set.`);
    }

    options.targetDir = arg;
  }

  return options;
}

/** The package name implied by a target directory, before any prompting. */
export function defaultNameForTarget(cwd, targetDir) {
  const resolved = path.resolve(cwd, targetDir ?? ".");
  return sanitisePackageName(path.basename(resolved)) || DEFAULT_PROJECT_NAME;
}

/**
 * Fill in whatever the flags did not supply.
 *
 * Non-interactive by default when stdin is not a TTY, which is what makes the CLI
 * usable from an agent, a CI job, or a pipe without `--yes` being mandatory.
 */
export async function resolveCreateOptions(parsed, context = {}) {
  const cwd = path.resolve(context.cwd ?? process.cwd());
  const interactive = parsed.yes !== true && (context.interactive ?? Boolean(process.stdin.isTTY));

  let targetDir = parsed.targetDir;
  let name = parsed.name;

  if (interactive && context.prompt) {
    if (targetDir === undefined) {
      targetDir = await context.prompt({
        defaultValue: DEFAULT_PROJECT_NAME,
        message: "Where should the app be created?",
        name: "targetDir",
      });
    }

    if (name === undefined) {
      name = await context.prompt({
        defaultValue: defaultNameForTarget(cwd, targetDir),
        message: "Package name",
        name: "name",
      });
    }
  }

  return {
    ...parsed,
    cwd,
    interactive,
    name: name ?? defaultNameForTarget(cwd, targetDir),
    targetDir: targetDir ?? ".",
  };
}
