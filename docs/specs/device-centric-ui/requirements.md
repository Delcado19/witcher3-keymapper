# Requirements: Device-Centric UI

## Requirement 1: Device Profiles

The keymapper shall load device profiles from `public/devices/index.json` and `public/devices/<id>/profile.json`. Invalid profiles shall be skipped without breaking the page. The registry shall support exact VID/PID matches and language fallback profiles.

## Requirement 2: SVG Rendering

The keymapper shall render keyboard, mouse, and gamepad profiles as interactive SVG diagrams. Every key shall expose `data-key`, keyboard focus, an ARIA label, and click/keyboard activation.

## Requirement 3: Coloring

The keymapper shall color keys by binding source and conflict state. Vanilla bindings shall be split into movement, combat/actions, and menus. Top mod colors shall be deterministic for identical scan data. Conflict severity shall override normal source colors.

## Requirement 4: Conflict Display

The keymapper shall preserve the conflict sidebar and link it to the SVG view. Clicking a conflicting key shall highlight and scroll to the matching sidebar entry. Conflict entries shall include commands, sources, severity, and affected sections.

## Requirement 5: Remap And Clear

The keymapper shall keep remap behavior available from the mappings list and from key popovers. Clearing a key shall remap only the selected key/action combination to `IK_None`. All persistent writes shall create a backup first.

## Requirement 6: Load And Save

The keymapper shall allow loading any `input.settings` file into the current browser session. Uploaded files shall be parsed and scanned in memory without changing the server default path. Saving shall write the current session content to a user-provided target path with backup.

## Requirement 7: Syntax Validation

The keymapper shall validate loaded files before scanning. Valid files may contain section headers, metadata assignments, `IK_*=(Action=...)` bindings, and Witcher valueless flags such as `Reprocess`. Invalid files shall return actionable diagnostics.

## Requirement 8: Hardware And Layout Detection

On Windows, the keymapper shall detect USB HID devices and the active input language. Exact VID/PID matches win. Without a device match, `de*` input languages shall select ISO-DE and other non-empty languages shall select ANSI-US. If no language is known, the UI shall show a manual layout dropdown.

## Requirement 9: Localization

The keymapper shall provide English and German UI text. Auto mode shall use the browser language: German for `de*`, English for all other languages. A manual language selector shall persist in `localStorage`.

Action display names shall use the same UI language as the app. English is the default and shall not fall back to German localized resources. German may fall back to English, then to a humanized technical key.

Public documentation, code comments, tests, identifiers, and handoff notes shall be English. German text is allowed only in the German translation table and in literal German keyboard labels.

## Requirement 10: Local Safety

The server shall bind only to `127.0.0.1`. The app shall clearly distinguish the project `input.settings`, session-loaded content, and any explicit save target. Write operations shall not modify live game files unless the user explicitly targets them.

## Requirement 11: Property Checks

Tests shall cover device fallback by language, deterministic coloring, profile round trips, conflict filtering, syntax validation, save sorting, and localization preference rules.
