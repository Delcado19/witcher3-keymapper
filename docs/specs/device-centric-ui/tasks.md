# Tasks: Device-Centric UI

## Completed

- [x] Add device registry and profile JSON files for ISO-DE, ANSI-US, mouse, and gamepad layouts.
- [x] Add server routes for scan, remap, load, save, and devices.
- [x] Add syntax validation for loaded `input.settings` files.
- [x] Add vanilla default supplementation from layout-specific legacy files.
- [x] Add device matching by VID/PID and language fallback.
- [x] Render interactive SVG diagrams for keyboard, mouse, and gamepad profiles.
- [x] Add key colorization by vanilla category, mod source, conflict severity, and unbound state.
- [x] Add conflict sidebar grouping and SVG-to-sidebar highlighting.
- [x] Add popovers with Change and Clear actions.
- [x] Add session-only file loading and explicit target save.
- [x] Add section sorting before persistent writes.
- [x] Add readable action names from input XML, mod CSV localization, and optional `.w3strings` decoding.
- [x] Add `w3strings-ng` dictionary support for hashed string IDs.
- [x] Add English/German UI localization with English as the default for non-German locales.
- [x] Add tests for localization preference (`de` -> German with English fallback, non-`de` -> English only).

## Current Verification

Run these before considering a code change complete:

```bash
node --check server.js
node --check public/app.js
npm test
```

For parser, remap, save, or localization changes, also smoke-test `/api/scan?lang=en` and `/api/scan?lang=de` against the real local files when practical.

## Open Follow-Ups

- Visually review the browser UI after significant layout or localization changes.
- Identify any remaining vanilla action keys that cannot be resolved from available `.w3strings` or XML resources.
- Add future Linux/SteamOS/Wine auto-detection only after explicit scope approval.

## Maintenance Notes

- Keep code comments and documentation in English.
- Keep German UI text inside the `I18N.de` table.
- Keep literal German keyboard labels in ISO-DE profiles unchanged.
- Keep the project dependency-free unless a dependency removes real complexity.
