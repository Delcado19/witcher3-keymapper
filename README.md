# Witcher 3 Keymapper

Lokales, dependency-freies Web-Tool zum Inspizieren und Bearbeiten von Witcher-3-`input.settings`-Dateien: Tastenbelegungen, Konflikt-Scanner und eine geräte-zentrierte Ansicht (interaktives Tastatur-/Maus-/Gamepad-Schema mit farblicher Markierung nach Binding-Quelle).

> Nur für lokalen Gebrauch. Der Server bindet ausschließlich an `127.0.0.1`.

## Starten

```bash
npm start          # http://127.0.0.1:5177  (PORT überschreibbar)
npm test           # dependency-freie Unit-/Property-/Render-Tests
node --check server.js
node --check public/app.js
```

Kein Build-Step, keine npm-Dependencies (nur Node ≥ 20).

## Funktionen

- **Geräteansicht** — Tabs für Tastatur/Maus/Gamepad; pro Gerät ein code-generiertes SVG-Schema. Belegte Tasten werden eingefärbt: Vanilla (Gold), je Top-5-Mod eine eigene Farbe, „Sonstige Mods", Konflikte (rot/amber, pulsierend). Legende darunter.
- **Layout-Modus** — Maus/Gamepad-Overlays per Button „Layout" im Browser kalibrieren: ziehen zum Verschieben, Griff rechts unten zum Skalieren. Währenddessen sind Popover/Remap-Klicks deaktiviert; Änderungen werden pro Profil im Browser-`localStorage` gespeichert.
- **Tasten-Popover** — Klick (oder Enter/Space) auf eine Taste zeigt Actions, Quelle und Konflikte; „Ändern" öffnet den Remap-Dialog, „Löschen" setzt die Bindung auf `IK_None` (mit Backup).
- **Hardware-Erkennung (Windows)** — erkennt angeschlossene USB-HID-Geräte (VID:PID) und die Windows-Eingabesprache und wählt automatisch das passende Tastaturprofil vor; sonst Sprach-Fallback (`de-*` → ISO-DE 105, sonst ANSI-US 104) bzw. manuelles Layout-Dropdown.
- **Mappings-Liste & Konflikt-Sidebar** — Suche, Quellen-/Geräte-Filter; Klick auf eine Konflikt-Taste im Schema hebt den Sidebar-Eintrag hervor.

## HTTP-API

| Route | Methode | Zweck |
|---|---|---|
| `/api/scan` | GET | Parst `input.settings`, liefert Commands, Stats und Konflikte (inkl. `sources[]` je Konflikt). |
| `/api/remap` | POST | `{ actions, newKey, oldKey?, sections? }` — schreibt Bindings (Backup vor jedem Schreiben). |
| `/api/load` | POST | `multipart/form-data` mit `file` — parst eine hochgeladene `input.settings` **nur für die Session** (kein Disk-Write). |
| `/api/save` | POST | `{ targetPath, content }` — schreibt in eine Zieldatei (Backup, falls vorhanden). |
| `/api/devices` | GET | `{ devices: [{vid,pid,name,type}], inputLanguage }` — Windows-PnP + Eingabesprache; auf Nicht-Windows/Fehler leer. |

Alle Schreibpfade erzeugen vorher ein byte-identisches Backup `…<timestamp>.bak`.

## Geräte-Registry

Profile liegen unter `public/devices/`:

- `index.json` — `{ "profiles": [ { id, vid, pid, type, fallback, fallbackLocales } ] }`
- `<id>/profile.json` — Pflichtfelder `id, name, type, layout, keys`; jede Taste mit `ik` (Witcher-`IK_*`-Name), `label`, `x/y/w/h`, `shape` (`rect` | `wide` | `pill` | `circle` | `dpad-*` | `label` | `iso-enter`); optional `artwork` für ein SVG-Gerätebild unter den klickbaren Overlays. Artwork-Profile können pro Taste `coord: "px"` nutzen, dann beziehen sich `x/y/w/h` direkt auf das 1672x1672-SVG-Pixelkoordinatensystem.

Neue Geräte lassen sich allein durch Hinzufügen eines Profils + `index.json`-Eintrags ergänzen (kein Code-Change). Vorhandene Layouts: ISO-DE 105/87, ANSI-US 104/87, 5-Tasten-Maus, Xbox-Controller.

## Projektdoku & KI-Workflow

`AGENTS.md` (Repo-Doku, Befehle, Doku-Protokoll) ist der Einstieg für KI-Tools. Die Feature-Spezifikation liegt unter `.kiro/specs/device-centric-ui/` (requirements/design/tasks). `AI_JOURNAL.md`, `CLAUDE.md` und `.claude/` sind lokal & gitignored.
