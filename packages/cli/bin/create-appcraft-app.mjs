#!/usr/bin/env node
import { runAppcraftCli } from "../src/cli.mjs";

// `npx create-appcraft-app` lands here, where "create" is the only sensible verb.
//
// Not `npm init @nsdesign/appcraft` — that resolves to `@nsdesign/create-appcraft`,
// a package we do not publish. The documented entry point is
// `npx @nsdesign/appcraft create`, which is also Toolcraft's form.
await runAppcraftCli(["create", ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: process.env,
});
