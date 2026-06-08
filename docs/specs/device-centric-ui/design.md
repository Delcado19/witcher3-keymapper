# Design: Device-Centric UI

## Overview

The device-centric UI turns the original flat mapping list into a workbench where the user can inspect Witcher 3 bindings directly on keyboard, mouse, and gamepad diagrams. The app remains dependency-free: a small Node HTTP server serves static files and JSON APIs, while all UI behavior runs in plain browser JavaScript.

## Goals

- Render physical input devices from JSON profiles under `public/devices/`.
- Color each key by binding source: vanilla movement, vanilla combat/actions, vanilla menus, top mods, other mods, conflicts, and unbound keys.
- Keep the existing mappings list, source/device filters, conflict sidebar, and remap dialog.
- Support session-only loading of arbitrary `input.settings` files without changing the project copy.
- Preserve local safety: automatic backups before writes and server binding to `127.0.0.1`.
- Localize the app UI in English and German. English is the default for non-German locales and for GitHub users.

## Data Flow

1. `index.html` loads `public/app.js`.
2. The client chooses a UI language from `localStorage` or browser language (`de*` -> German, otherwise English).
3. The client requests `/api/scan?lang=<en|de>`, `/api/devices`, and `/devices/index.json`.
4. The server parses `input.settings`, supplements vanilla defaults from the layout-specific legacy file, loads localized action display names for the requested UI language, and returns scan data.
5. The client matches detected hardware by VID/PID where possible; otherwise it falls back by input language to ISO-DE or ANSI-US.
6. The SVG renderer builds the active device view and the colorizer applies key colors and conflict classes.
7. The mappings list and conflict sidebar render from the same scan result.

## Server Components

- `parseInputSettingsText()` validates and parses Witcher `input.settings` text.
- `buildScan(input?, requestedLanguage?)` returns paths, content, syntax state, stats, `inputLanguage`, `uiLanguage`, commands, conflicts, and unlisted actions.
- `loadLocalizationMap(modsDir, languageTag)` loads mod CSV localization and optional decoded `.w3strings`.
- `preferredLocalizationCodes(languageTag)` intentionally returns `["de", "en"]` only for German UI, and `["en"]` for every other UI language to avoid mixed German/English action names.
- `/api/load?lang=<en|de>` parses uploads in memory and does not write to disk.
- `/api/save` writes caller-provided content to a target path with a backup.
- `/api/devices` detects Windows HID devices and the active Windows input language, degrading to empty results on unsupported platforms.

## Client Components

- `I18N` in `public/app.js` stores English and German UI strings.
- `applyStaticTexts()` updates HTML shell text, ARIA labels, placeholders, dialog labels, and topbar controls.
- `matchDevice()` maps VID/PID or language fallback to a profile.
- `renderDeviceSvg()` dispatches to keyboard, mouse, or gamepad renderers.
- `buildColorMap()` produces the deterministic `IK_* -> color` map.
- `openPopover()` shows commands, sources, conflicts, and Change/Clear actions for a key.
- `remapSessionContent()` mirrors the server remap contract for uploaded session files.

## Device Profiles

Profiles live under `public/devices/<id>/profile.json` and use this shape:

```json
{
  "id": "iso-de-105",
  "name": "ISO-DE 105",
  "type": "keyboard",
  "layout": "iso-de",
  "keys": [
    { "ik": "IK_W", "label": "W", "x": 2, "y": 2.5, "w": 1, "h": 1, "shape": "rect" }
  ]
}
```

Required fields are `id`, `name`, `type`, `layout`, and `keys`. Key shapes include `rect`, `wide`, `pill`, `circle`, `dpad-*`, `label`, and `iso-enter`. Artwork-backed profiles can set `coord: "px"` so `x/y/w/h` map to the source SVG coordinate space.

## Localization Rules

- Code comments, documentation, tests, and identifiers stay English.
- UI text is translated through `I18N`.
- German UI may show German action names when localized resources provide them.
- English UI must not fall back to German action names. If English resources are missing, action names are humanized from technical IDs.
- Literal German keyboard labels such as `Ä`, `Ö`, `Ü`, and `ß` remain in ISO-DE profile JSON because they are physical key labels.

## Safety

The tool is local-only. Write routes create backups before changing files. Uploaded files are session-only until the user explicitly saves to a target path.
