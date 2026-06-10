# Witcher 3 Keymapper

Local, dependency-free web tool for inspecting and editing Witcher 3 `input.settings` files: key bindings, conflict scanning, and a device-centric view with interactive keyboard, mouse, and gamepad diagrams.

> Local use only. The server binds to `127.0.0.1` and additionally rejects any request whose `Host` header is not loopback (DNS-rebinding guard) and any cross-origin `POST` (CSRF guard). Reaching it through a different hostname or a reverse proxy is intentionally blocked.

## Start

```bash
npm start          # http://127.0.0.1:5177  (PORT can override this)
npm test           # dependency-free unit/property/render tests
node --check server.js
node --check public/app.js
```

There is no build step and no npm dependency install. Node 20 or newer is required.

## Configuration

Paths default to the local GOG install and can be relocated with environment variables — no code change needed:

- `W3_GAME_ROOT` - the Witcher 3 install root. All game/mod sub-paths (`input.xml`, the legacy layout files, and `Mods/`) are derived from it. Default: `F:\GOG Galaxy\Games\The Witcher 3 Wild Hunt GOTY`.
- `W3_INPUT_SETTINGS` - the `input.settings` the server reads and remaps. Default: the project copy next to `server.js`.
- `W3STRINGS_NG_EXE` / `W3STRINGS_EXE` - explicit decoder path (see Optional Tools).
- `PORT` - HTTP port (default `5177`).

## Optional Tools

- `tools/w3strings-ng/w3strings-ng.exe` or `tools/w3strings-ng/w3strings-ng` is the preferred open-source decoder for `.w3strings` files (author: Odashikonbu; source: `Odashikonbu/w3strings-rust`; license: GPL-3.0). If the binary is absent, set `W3STRINGS_NG_EXE` or make it available on `PATH`. Build source: `https://github.com/Odashikonbu/w3strings-rust`, package `cli-tools`, command `cargo build --release`. The older Nexus `w3strings.exe` is kept only as a compatibility fallback.

## Artwork

Social and preview images should be stored as `docs/assets/witcher3-keymapper-social-preview.png`. The app background is `public/assets/keymapper-background.png`: a generated, full-bleed 16:9 dark fantasy image used with `background-size: cover` and no tiling. The app header uses `public/assets/keymapper-header.png` directly as the complete banner artwork, including the title, separator rules, ornament marks, `Fine-tune every action.` tagline, and three red claw marks. It is rendered with `background-size: cover`, cropped as needed, and never tiled. The style in `public/styles.css` is tuned around blackened metal, fine gold lines, muted red accents, and reduced parchment tones.

## Language

The application UI is localized in English and German. It starts in `Auto`, which uses the browser language (`de*` -> German, all other languages -> English). The topbar language selector persists the choice in `localStorage`.

Action display names follow the same language. English is the default for GitHub users and for every non-German locale; German is used only when the UI language is German. Missing localized names fall back to English before the technical humanized key is shown.

Project documentation, code comments, identifiers, tests, and public handoff notes should be written in English. German text belongs only in the German UI translation table or in literal German keyboard labels such as `Ä`, `Ö`, `Ü`, and `ß`.

## CI

GitHub Actions runs on pushes and pull requests against `master` with Node 20 and 22:

- `node --check server.js`
- `node --check public/app.js`
- `npm test`

## Features

- **Device view** - tabs for keyboard and mouse/gamepad; each device renders a generated SVG diagram. Bound keys use a muted Witcher-style palette: vanilla movement, vanilla combat/actions, vanilla menus, top-five mods, other mods, conflicts, and unbound keys.
- **Conflict scanner** - treats keyboard, mouse, and gamepad as parallel vanilla input methods. It filters known benign Witcher 3 aliases such as tap/hold pairs, movement axis helpers, D-pad sword/oil/potion multiplexing, menu duplicates, and debug-only bindings.
- **Vanilla default supplement** - the project `input.settings` remains the primary file; missing stock actions are supplemented from the matching legacy layout file (`de*` -> `input_qwertz.ini`, `fr*` -> `input_azerty.ini`, otherwise `input_qwerty.ini`).
- **Layout mode** - mouse and gamepad overlays can be calibrated in the browser. Drag to move, use the bottom-right handle to resize. Overrides are stored per profile in browser `localStorage`.
- **Key popover** - click or press Enter/Space on a key to see actions, source, conflicts, and Change/Clear actions. Clear remaps that binding to `IK_None` and creates a backup.
- **Hardware detection on Windows** - detects connected USB HID devices (VID:PID) and the Windows input language, then preselects the matching keyboard profile. If no match is available, the UI falls back by language or shows a manual layout dropdown.
- **Load/save files** - load any `input.settings` into the current browser session. Save writes the current session content to a target path and creates a backup if the target exists.
- **Syntax validation** - project and uploaded files are checked for the expected Witcher `input.settings` shape before scanning.
- **Section sorting before save** - saved files are sorted deterministically within each section while keeping same-key rows stable.
- **Readable action names** - scans read vanilla and mod `input.xml`/`input_xml.txt`, mod localization CSVs, and optionally decoded `.w3strings`. A generated dictionary helps `w3strings-ng` resolve hashed string IDs.
- **Mappings list and conflict sidebar** - search, source/device filters, and linked highlighting between conflict keys in the SVG and sidebar entries.

## Cross-Platform Status

Automatic install and device detection is currently wired for the local Windows/GOG setup. Planned Linux/SteamOS/Wine support should auto-detect Steam libraries via app ID `292030`, Proton/Wine prefixes, Witcher file signatures, and layout fallback (`de*` -> QWERTZ, `fr*` -> AZERTY, otherwise QWERTY).

## HTTP API

| Route | Method | Purpose |
|---|---|---|
| `/api/scan?lang=en\|de` | GET | Validates and parses `input.settings`, returning commands, stats, syntax status, UI language, and conflicts. |
| `/api/remap` | POST | `{ actions, newKey, oldKey?, sections? }` - writes sorted bindings with a backup before every write. |
| `/api/load?lang=en\|de` | POST | `multipart/form-data` with `file` - validates and parses an uploaded `input.settings` for the current session only. |
| `/api/save` | POST | `{ targetPath, content, sort? }` - writes sorted content to a target file and backs up an existing target. |
| `/api/devices` | GET | `{ devices: [{vid,pid,name,type}], inputLanguage, uiLanguage }` - Windows PnP plus input language; empty on unsupported platforms or errors. |

All write paths create a byte-identical backup named with a timestamp suffix before writing.

## Device Registry

Profiles live under `public/devices/`:

- `index.json` - `{ "profiles": [ { id, vid, pid, type, fallback, fallbackLocales } ] }`
- `<id>/profile.json` - required fields: `id`, `name`, `type`, `layout`, `keys`. Each key has `ik`, `label`, `x/y/w/h`, and `shape`; artwork profiles may use `coord: "px"` for the 1672x1672 SVG coordinate system.

New devices can be added by adding a profile plus an `index.json` entry. Current layouts: ISO-DE 105/87, ANSI-US 104/87, 5-button mouse, and Xbox controller.

## Project Docs And AI Workflow

`AGENTS.md` is the entrypoint for AI coding tools. The feature specification is under `docs/specs/device-centric-ui/`. `AI_JOURNAL.md`, `CLAUDE.md`, and `.claude/` are local and gitignored.
