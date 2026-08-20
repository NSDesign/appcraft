#!/usr/bin/env node
import { runAppcraftCli } from "../src/cli.mjs";

await runAppcraftCli(process.argv.slice(2), { cwd: process.cwd(), env: process.env });
