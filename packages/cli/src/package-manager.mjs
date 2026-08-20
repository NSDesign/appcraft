/**
 * Package-manager handling.
 *
 * appcraft supports npm only. Toolcraft detects npm and pnpm and generates
 * flavoured commands for each; we deliberately do not, because generating commands
 * for a manager nobody tests means the first instruction a user reads after
 * scaffolding is untested. Detection is kept, but it exists to *say so plainly*
 * rather than to guess.
 */

export const SUPPORTED_PACKAGE_MANAGER = "npm";

/**
 * The manager that launched this process, from `npm_config_user_agent`.
 *
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ name: string, version?: string } | undefined}
 */
export function detectLaunchingPackageManager(env = process.env) {
  const agent = env["npm_config_user_agent"];

  if (!agent) {
    return undefined;
  }

  const [descriptor] = agent.split(" ");
  const [name, version] = (descriptor ?? "").split("/");

  return name ? (version ? { name, version } : { name }) : undefined;
}

/**
 * A warning when the CLI was launched through something other than npm, or
 * undefined when it was npm or could not be determined.
 *
 * Deliberately a warning and not an error: a pnpm user running `pnpm dlx` should
 * still get a working app, they should just know its commands are npm's.
 */
export function unsupportedManagerWarning(env = process.env) {
  const launcher = detectLaunchingPackageManager(env);

  if (!launcher || launcher.name === SUPPORTED_PACKAGE_MANAGER) {
    return undefined;
  }

  return (
    `Launched through ${launcher.name}, but appcraft supports npm only. ` +
    `The generated app and every command it prints assume npm; ${launcher.name} is untested here.`
  );
}

export function createRunScriptCommand(script) {
  return `npm run ${script}`;
}
