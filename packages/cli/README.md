# @nsdesign/appcraft

Create appcraft applications from the command line.

```bash
npx @nsdesign/appcraft create my-app
cd my-app
npm test
```

Then open the folder in Claude Code, Codex, Cursor, or another agent and describe the
app you want:

```text
Build a layer-based vector editor with a properties inspector.
```

The agent reads the generated `AGENTS.md`, routes the request, asks for your style
guide, and is gated by checks that live in your repository — not by this CLI at a
distance.

## What gets generated

- `AGENTS.md` — the app contract, with a routing table for product work.
- `docs/appcraft/*` — the route documents the contract sends an agent to.
- `.agents/skills/` — the workflow skills, so the process fires without configuration.
- `e2e/` — a Playwright suite that proves the projection invariants in a session.
- `docs/agent-worklog.md` — a fresh decision trail, in starter mode.

## Options

| Flag | Effect |
|---|---|
| `--name <name>` | Package name. Defaults to the directory name. |
| `--core-version <v>` | Version of `@nsdesign/appcraft-core` to depend on. |
| `--agent <name>` | Also install the skills into an agent. Repeatable. |
| `--yes`, `-y` | Accept defaults; never prompt. |
| `--force`, `-f` | Generate into a non-empty directory, merging rather than replacing. |
| `--no-install` | Skip dependency installation. |
| `--no-skills` | Do not copy the workflow skills into the app. |

## npm only

appcraft supports npm. Launching through another package manager warns and continues:
you get a working app, but every command it prints assumes npm.

## Generation is transactional

The app is assembled in a sibling staging directory, validated there, and promoted with
a single rename. A failed generation leaves no target rather than a half-written folder.

## Licence

MIT.
