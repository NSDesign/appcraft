#!/usr/bin/env node
import { runAppcraftCli } from "../src/cli.mjs";

// `npm init @nsdesign/appcraft` and `npx create-appcraft-app` both land here, where
// "create" is the only sensible verb.
await runAppcraftCli(["create", ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: process.env,
});
