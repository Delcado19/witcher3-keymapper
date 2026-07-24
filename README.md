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

There is no build step and no npm dependency install. Node 20 or newer is required. On Windows, `start-keymapper.bat` starts the server and opens the app in your default browser.

## Configuration

Paths default to the local GOG install and can be relocated with environment variables — no code change needed:

- `W3_GAME_ROOT` - the Witcher 3 install root. All game/mod sub-paths (`input.xml`, the legacy layout files, and `Mods/`) are derived from it. Default: `F:\GOG Galaxy\Games\The Witcher 3 Wild Hunt GOTY`.
- `W3_INPUT_SETTINGS` - the `input.settings` the server reads and remaps. Default: the project copy next to `server.js`.
- `W3STRINGS_NG_EXE` / `W3STRINGS_EXE` - explicit decoder path (see Optional Tools).
- `PORT` - HTTP port (default `5177`).

## Optional Tools

- `tools/w3strings-ng/w3strings-ng.exe` or `tools/w3strings-ng/w3strings-ng` is the preferred open-source decoder for `.w3strings` files (author: Odashikonbu; source: `Odashikonbu/w3strings-rust`; license: GPL-3.0). If the binary is absent, set `W3STRINGS_NG_EXE` or make it available on `PATH`. Build source: `https://github.com/Odashikonbu/w3strings-rust`, package `cli-tools`, command `cargo build --release`. The older Nexus `w3strings.exe` is kept only as a compatibility fallback.

## Artwork

Social and preview images should be stored as `docs/assets/witcher3-keymapper-social-preview.png`. The app background is `public/assets/keymapper-background.png`: a generated, full-bleed 16:9 dark fantasy image used with `background-size: cover` and no tiling. The app header uses `public/assets/keymapper-header.png` directly as the complete banner artwork, including the title, separator rules, ornament marks, `Fine-tune every action.` tagline, and three red claw marks. The topbar carries the image's exact 2172x480 aspect ratio, so the banner spans the full window width (its height grows with the width) and is rendered with `background-size: cover` and no tiling — full-bleed with neither side letterboxing nor cropping. The style in `public/styles.css` is tuned around blackened metal, fine gold lines, muted red accents, and reduced parchment tones.

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

- **Device view** - tabs for keyboard and mouse/gamepad. The keyboard renders a generated SVG diagram with bound keys coloured in a muted Witcher-style palette: vanilla movement, vanilla combat/actions, vanilla menus, top-five mods, other mods, conflicts, and unbound keys. Mouse and gamepad render the device photo (`device.png`) with each control's bound action(s) parked in side columns and tied to the control by a 90-degree leader line - the in-game "Controller Scheme" look. Each label shows the readable action name as its primary line with the physical button (LB/RT/A/B/X/Y, etc.) as a small dimmed caption above it; only real localized/curated action names are shown, so raw engine ids and "+N" counters stay out of the diagram (the full per-control list, including internal helpers, remains one click away in the key popover); a control bound *only* to an unresolved mod/engine action still shows that humanized name so it does not look like a free button, and the caption colour is brightened so dark categories and unbound controls stay legible on the dark stage. Each label sits at its control's anchor height (overlapping neighbours are pushed down by a minimum pitch and the column is recentred on the anchor band), so the lines stay short and the columns stay compact instead of being spread across the full device height. The mouse and gamepad sit side by side on a clean near-black "Controller Scheme" stage (like the in-game Options > Controller Scheme screen) so the labels read clearly instead of fighting the page artwork. Each device's column is sized proportional to its diagram width, so both render at one shared unit scale. Because on-screen photo width also depends on each device's text-column budget, the mouse narrows its left column (`leader.colLeft`, short labels) while keeping the right column wide (`leader.colRight`, long labels like "Schnellzugriff-Gegenstand benutzen") and bumps its own `artworkSize` in `profile.json`, so its photo stays prominent without clipping the long labels; the gamepad keeps the wide symmetric default for its longer German action names. Anchor and line colour follow the same palette; conflicts glow red.
- **Conflict scanner** - treats keyboard, mouse, and gamepad as parallel vanilla input methods. It filters known benign Witcher 3 aliases such as tap/hold pairs, movement axis helpers, D-pad sword/oil/potion multiplexing, menu duplicates, and debug-only bindings. The same physical overload repeated across context sections (Combat, Boat, the `*_Replacer_Ciri` variants, …) is collapsed into one entry per key + mod action and shown as "in N gameplay contexts" instead of listing the raw section names.
- **Vanilla default supplement** - the project `input.settings` remains the primary file; missing stock actions are supplemented from the matching legacy layout file (`de*` -> `input_qwertz.ini`, `fr*` -> `input_azerty.ini`, otherwise `input_qwerty.ini`).
- **Controller-scheme anchors** - mouse/gamepad schemes use a free-form coordinate model in `public/devices/*/profile.json`: a fixed `canvas` (the viewBox), an `art` rect (the PNG box in canvas units), and per key an anchor `ax`/`ay` (a percentage of the PNG, so it tracks the image when the PNG moves or resizes) plus a label position `lx`/`ly` (canvas units). The 90-degree leader line is re-derived from the anchor and label on every render, so it can never detach. The legacy auto-layout (`leader` column widths, `side`, `minPitch`) is retired to a one-shot seed (`scripts/seed-leader-layout.js`) that produced these coordinates from the previous committed render.
- **Layout editor** - on the Mouse/Gamepad tab, "Edit layout" turns the scheme into a direct-manipulation editor: drag the PNG to move it, drag its corner handle to resize, drag any anchor dot (`ax`/`ay`) or any label (`lx`/`ly`), double-click a label to rename its button caption (RB/LT/X/A/START/R3/Back, etc.), and use A-/A+ to scale the label font (`fontSize`). Dragging snaps to a fine grid and to smart alignment guides against other controls' anchors/labels and the canvas/PNG centres (hold **Shift** to bypass snapping). There is no separate save button: leaving edit mode ("Done") applies the layout by writing the edited `profile.json` back to disk via `POST /api/profile` (backed up under `.cache/`); "Reset" reverts to the saved file.
- **Key popover** - click or press Enter/Space on a key to see actions, source, conflicts, and Change/Clear actions. A conflict is shown as "double-bound in N separate game situations" (the game situations are mutually exclusive, so it is one physical key overload, not a cross-context clash) and names the actual **cause** - the non-vanilla command - while the vanilla companions that only share the key context-sensitively are marked "context-only, normally fine". The conflicts panel highlights the same cause token. Clear remaps that binding to `IK_None` and creates a backup. Clicking a key with no binding opens a searchable command picker so you can assign a command to that free key directly from the device scheme (it reuses the remap dialog with the key prefilled).
- **Remap preview** - the Change dialog is titled with the readable command name ("Change Heavy attack"), not the raw bundled action ids, and shows, before you apply, which keys will be rewritten. A bundled command can have hundreds of bindings on the same key (Interaction has 1178), so the preview collapses them to the **distinct current keys** - one row per key with its device and a count ("E ×576", "Gamepad A/Cross ×568") - instead of a wall of the same token; the raw binding count moves to a muted footnote. This also makes it visible that a keyboard remap rewrites the command's gamepad/mouse bindings too. The footnote count still matches what the server rewrites (it includes `IK_None` slots, since remapping matches by action across all sections). It intentionally does not predict conflicts; the authoritative conflict view is the automatic re-scan after applying.
- **Press-a-key capture** - in the Change dialog, "Press a key" captures the next keypress and fills the new-key field with the matching `IK_*` token instead of typing it by hand (`KEYCODE_TO_IK` in `app.js`, spellings verified against the real `input.settings`). Keyboard only by design: a browser cannot reliably report mouse buttons or gamepad inputs, so mouse/gamepad targets keep manual entry or the device picker.
- **Hardware detection on Windows** - detects connected USB HID devices (VID:PID) and the Windows input language, then preselects the matching keyboard profile. If no match is available, the UI falls back by language or shows a manual layout dropdown.
- **Load/save files** - load any `input.settings` into the current browser session. Save writes the current session content to a target path and creates a backup if the target exists.
- **Syntax validation** - project and uploaded files are checked for the expected Witcher `input.settings` shape before scanning.
- **Section sorting before save** - saved files are sorted deterministically within each section while keeping same-key rows stable.
- **Readable action names** - scans read vanilla and mod `input.xml`/`input_xml.txt`, mod localization CSVs, and optionally decoded `.w3strings`. A generated dictionary helps `w3strings-ng` resolve hashed string IDs. A curated map (`CURATED_DISPLAY_NAMES` in `server.js`) provides English/German names for vanilla actions that have no localization key in the game (for example `MoveFwd`, `SpecialAttackLight`, `OilSteel`), taken verbatim from the in-game controls screens where possible. Such names are tagged `displayNameSource: "curated"`. The curated map covers stable **vanilla** ids only — the tool must work for any mod set, so mod commands are handled generically: real names come from the mod's own localization (CSV/`.w3strings`) when shipped, otherwise a clean humanized fallback (camelCase split, prefix strip, and a letter-to-digit split so ids like `UseItem10` read as "Use Item 10"). Engine alias variants that share a function with an already-named command (for example `FastMenu`/`HoldFastMenu` with `RadialMenu`, or `SprintGallop` with `GallopCanter`) are folded into the canonical command's row instead (`ALIAS_COMMAND_CANONICAL` in `server.js`), so the list shows one row rather than a near-duplicate. This is display-only: the merge keeps every binding (only relocated, never dropped) and does not touch conflict detection.
- **Mappings list and conflicts** - the device diagram is the primary overview; a slim one-line summary (bindings, conflicts, commands, mod actions, syntax) sits above it and the conflicts list is a collapsible panel, since the diagram already glows the conflicted keys. Below the diagram, search and source/device filters drive the command list, with linked highlighting between conflict keys in the SVG and list entries. Console-only debug bindings (`Debug_*`, `SCN_DBG_*`) are hidden from the list since they are not player keybindings.
- **Hide engine bindings** - vanilla engine plumbing players never rebind (gamepad stick/mouse axis proxies `GI_*`, combo multiplexers `ComboDigit*`, radial-menu selection internals, a few internal panel ids, the vanilla abort/modifier helpers `Alternate`/`ThrowCastAbort`/`VehicleItemActionAbort`, and the Ciri-only mirror actions `Ciri*`) is tagged `engineInternal` server-side and hidden from the list by default. A "Show engine bindings" toggle in the filter row brings them back. This is display-only and keyboard list-only: the bindings stay in the file and on the device diagram, and the conflict scanner is unaffected.
- **Ciri stays in sync with Geralt** - the playable-as-Ciri sections (`*_Replacer_Ciri`) reuse Geralt's shared actions verbatim, so remapping movement/interaction already moves both. The few Ciri-only actions that carry their own id (`CiriDodge`, `CiriDash`, `CiriSpecialAttack`, `CiriAttackHeavy`, `CiriDrawWeapon`, `CiriHolsterWeapon`, …) are mapped to their Geralt twin (`CIRI_TWIN_ACTION` in `server.js`); a remap of the Geralt action drags the Ciri twin along, so Ciri keeps the same keys. Forward-only by design — the Ciri rows are hidden, so there is nothing to remap in the other direction.

## Cross-Platform Status

Automatic install and device detection is currently wired for the local Windows/GOG setup. Planned Linux/SteamOS/Wine support should auto-detect Steam libraries via app ID `292030`, Proton/Wine prefixes, Witcher file signatures, and layout fallback (`de*` -> QWERTZ, `fr*` -> AZERTY, otherwise QWERTY).

## HTTP API

| Route | Method | Purpose |
|---|---|---|
| `/api/scan?lang=en\|de` | GET | Validates and parses `input.settings`, returning commands, stats, syntax status, UI language, and conflicts. |
| `/api/remap` | POST | `{ actions, newKey, oldKey?, sections? }` - writes sorted bindings with a backup before every write. |
| `/api/load?lang=en\|de` | POST | `multipart/form-data` with `file` - validates and parses an uploaded `input.settings` for the current session only. |
| `/api/save` | POST | `{ targetPath, content, sort? }` - writes sorted content to a target file and backs up an existing target. |
| `/api/profile` | POST | `{ id, profile }` - the layout editor persists an edited `public/devices/<id>/profile.json`. The id is validated and path-contained to `public/devices`, the target must already exist, and the previous file is backed up under `.cache/profile-backups/`. Cross-origin and non-loopback requests are rejected like the other write endpoints. |
| `/api/devices` | GET | `{ devices: [{vid,pid,name,type}], inputLanguage, uiLanguage }` - Windows PnP plus input language; empty on unsupported platforms or errors. |

All write paths create a byte-identical backup before writing. `input.settings` and the save target use a single rolling backup (`<file>.bak`, overwritten each write) so a session of edits does not litter the folder with one timestamped file per change; the trade-off is a single undo step (the state before the latest change). Profile saves keep their own backups under `.cache/profile-backups/`.

## Device Registry

Profiles live under `public/devices/`:

- `index.json` - `{ "profiles": [ { id, vid, pid, type, fallback, fallbackLocales } ] }`
- `<id>/profile.json` - required fields: `id`, `name`, `type`, `layout`, `keys`. Keyboard profiles position each key with `ik`, `label`, `x/y/w/h`, and `shape`. Mouse/gamepad (artwork) profiles instead carry `canvas`, `art`, and an `artwork` PNG, with each key holding `ik`, `label`, `ax/ay` (anchor, % of the PNG), and `lx/ly` (label position in canvas units); an optional per-profile `fontSize` scales the labels. These are authored by the in-app layout editor.

New devices can be added by adding a profile plus an `index.json` entry. Current layouts: ISO-DE 105/87, ANSI-US 104/87, 5-button mouse, and Xbox controller.

## Project Docs And AI Workflow

`AGENTS.md` is the entrypoint for AI coding tools. The feature specification is under `docs/specs/device-centric-ui/`. `AI_JOURNAL.md`, `CLAUDE.md`, and `.claude/` are local and gitignored.

## License

[MIT](./LICENSE).
