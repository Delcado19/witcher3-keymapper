# AGENTS.md - Entry Point For AI Coding Tools

> Shared orientation for Claude, Codex, and other AI tools working in this repository. Read this before changing files.
> This file is committed project documentation. The private handoff log (`AI_JOURNAL.md`), `CLAUDE.md`, and `.claude/` are local and gitignored via `.git/info/exclude`.

## 0. Quick Orientation

1. **Current state:** read `AI_JOURNAL.md` in the repository root. The auto block shows branch and diff state; the curated log below it explains recent work and next steps.
2. **Structure and commands:** see sections 1 and 2 below.
3. **Setup and workflow facts:** Claude memory lives under `~/.claude/projects/C--Users-Delcado-Documents-Software-Projects-witcher3-keymapper/memory/` with `MEMORY.md` as the index.

## 1. Project And Structure

Small local web tool for inspecting and editing Witcher 3 `input.settings` files.

- `server.js` - Node HTTP server: file parser, conflict scanner, backup logic, remap API, localization selection.
- `public/index.html` - browser UI shell.
- `public/app.js` - client scan rendering, filters, conflict display, remap dialog, two-language UI table.
- `public/styles.css` - UI styling.
- `input.settings` - local working copy of the Witcher 3 keybinding file. This is user data, not source code, and is gitignored along with backups (`input.settings.<timestamp>.bak`).
- `.github/workflows/ci.yml` - GitHub Actions syntax checks and tests on Node 20/22.
- `tools/w3strings-ng/` - optional `.w3strings` decoder invoked as an external CLI tool, with GPL license notice.

## 2. Commands

- `npm start` - starts the app at `http://127.0.0.1:5177`.
- `npm test` - dependency-free unit/property/render tests.
- `node --check server.js` - server-side JavaScript syntax check.
- `node --check public/app.js` - client-side JavaScript syntax check.

There is no build step and no dependency installation. For parser/remap/localization changes, also start the app and call `/api/scan` against the real local files where practical. Never test destructive writes against the live Witcher 3 file without a backup.

### Coding Style

Use plain CommonJS in `server.js` and plain browser JavaScript in `public/app.js`. Keep the project dependency-free unless a dependency removes real complexity. Use 2-space indentation, `const` by default, and descriptive camelCase names. Keep parser and write behavior explicit; avoid clever string rewrites around `input.settings`.

### Language Policy

Public documentation, code comments, tests, identifiers, and handoff notes should be written in English. The application UI supports English and German through the translation table in `public/app.js`; German text should stay there, or in literal keyboard labels for German layouts. English is the default for GitHub users and for every non-German locale.

## 3. Git Context

- **Private GitHub repo:** `origin` -> `https://github.com/Delcado19/witcher3-keymapper.git`; branch `master` tracks `origin/master`.
- GitHub Actions runs on push/PR against `master`: `node --check server.js`, `node --check public/app.js`, and `npm test` under Node 20 and 22.
- Use short imperative commit messages, for example `Add conflict scanner filters`, `Fix UTF-16 input XML parsing`, `Backup input.settings before remap`.
- Branch convention when using branches: `fix/<short-name>` or `feat/<short-name>`.

## 4. Documentation Protocol For Every Code Change

Goal: every change should be understandable in code and in the handoff log.

1. **In-code comments with context:** add concise comments for non-obvious behavior, compatibility guards, fallbacks, migrations, public contracts, and issue-driven fixes. Do not add comments that restate obvious code.
2. **Update the handoff log:** add a top entry under `AI_JOURNAL.md` -> "Curated Log" with date, tool, changed files, rationale, verification, and open threads.
3. **Keep external docs in sync:** update README/specs/tests where relevant. Before commits or PRs, review `git diff` for documentation and comment drift.
4. **Memory:** durable, non-obvious facts belong in Claude memory when appropriate; do not duplicate them into the journal.

### Automation

A stop hook (`.claude/settings.local.json` -> `.claude/journal-update.ps1`) updates only the deterministic auto block in `AI_JOURNAL.md`. The human-readable curated documentation remains the responsibility of the active tool.

## 5. Safety And Configuration

This tool is for local use only. Keep the server bound to `127.0.0.1`. Preserve automatic backups before writing `input.settings`, and keep a clear distinction between the project copy and the live game file.

## 6. Roadmap

- **Device-centric UI:** mostly implemented. The backend provides source classification and device classes; the UI renders device diagrams, colors bindings, and links conflicts.
- **Cross-platform detection:** Linux/macOS support is not confirmed. The current core scope remains Windows.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
