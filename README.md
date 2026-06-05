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

## Optionale Tools

- `tools/w3strings-ng/w3strings-ng.exe` bzw. `tools/w3strings-ng/w3strings-ng` — bevorzugter Open-Source-Decoder für `.w3strings` (Autor: Odashikonbu; Quelle: `Odashikonbu/w3strings-rust`; Lizenz: GPL-3.0). Falls die Binary fehlt, kann sie über `W3STRINGS_NG_EXE` gesetzt oder über `PATH` gefunden werden. Build aus `https://github.com/Odashikonbu/w3strings-rust`: `cli-tools`, `cargo build --release`. Der alte Nexus-`w3strings.exe` bleibt nur Fallback.

## Artwork

Social-/Preview-Banner sollten unter `docs/assets/witcher3-keymapper-social-preview.png` abgelegt werden. Der UI-Stil in `public/styles.css` ist auf dieses Banner abgestimmt: geschwärztes Metall, feine Goldlinien, gedämpfte rote Akzente und reduzierte Pergamenttöne.

## CI

GitHub Actions läuft auf Pushes und Pull Requests gegen `master` mit Node 20 und 22:

- `node --check server.js`
- `node --check public/app.js`
- `npm test`

## Funktionen

- **Geräteansicht** — Tabs für Tastatur/Maus/Gamepad; pro Gerät ein code-generiertes SVG-Schema. Belegte Tasten werden in einer gedeckten Witcher-artigen Palette eingefärbt: Vanilla-Bewegung (Salbei/Steel), Vanilla-Kampf/Aktionen (gealtertes Gold), Vanilla-Menüs (staubiges Violett), je Top-5-Mod eine eigene gedämpfte Farbe, „Sonstige Mods", Konflikte (gedämpft rot/amber, pulsierend). Tasten mit Vanilla-Anteil behalten ihre Vanilla-Kategorie, auch wenn zusätzlich eine Mod-Aktion auf derselben Taste liegt. Legende darunter.
- **Differenzierter Konflikt-Scanner** — behandelt Tastatur, Maus und Gamepad als parallele Vanilla-Eingabearten gemäß Witcher-3-Control-Schema. Vanilla-Doppelbelegungen fliegen raus; zusätzlich ignoriert der Scanner Tap/Hold-Paare, Keyboard-Bewegung plus `GI_Axis*`-Hilfsactions, D-Pad-Sword/Oil/Potion-Multiplexing, Menü-/Panel-Doppelbelegungen und Debug-only-Bindings. Gemeldet werden nur noch gleichzeitige, nicht aliasierte Mod-/Custom-vs.-Gameplay-Belegungen.
- **Vanilla-Default-Ergänzung** — die Projekt-`input.settings` bleibt die Hauptdatei; fehlende stock Actions werden zusätzlich aus der passenden Legacy-Layout-Datei gelesen (`de*` → `input_qwertz.ini`, `fr*` → `input_azerty.ini`, sonst `input_qwerty.ini`), damit Defaults wie WASD-/Ziffern-/F-Tasten nicht unter den Tisch fallen.
- **Layout-Modus** — Maus/Gamepad-Overlays per Button „Layout" im Browser kalibrieren: ziehen zum Verschieben, Griff rechts unten zum Skalieren. Währenddessen sind Popover/Remap-Klicks deaktiviert; Änderungen werden pro Profil im Browser-`localStorage` gespeichert.
- **Tasten-Popover** — Klick (oder Enter/Space) auf eine Taste zeigt Actions, Quelle und Konflikte; „Ändern" öffnet den Remap-Dialog, „Löschen" setzt die Bindung auf `IK_None` (mit Backup).
- **Hardware-Erkennung (Windows)** — erkennt angeschlossene USB-HID-Geräte (VID:PID) und die Windows-Eingabesprache und wählt automatisch das passende Tastaturprofil vor; sonst Sprach-Fallback (`de-*` → ISO-DE 105, sonst ANSI-US 104) bzw. manuelles Layout-Dropdown.
- **Datei laden/speichern** — eine beliebige `input.settings` kann per UI für die aktuelle Browser-Session geladen werden. Speichern schreibt den aktuellen Session-Inhalt an einen angegebenen Zielpfad und erstellt bei vorhandener Datei ein Backup.
- **Syntaxprüfung beim Laden** — Projektdatei und hochgeladene Session-Dateien werden vor dem Scan auf die erwartete `input.settings`-Form geprüft (`[Section]`, Metadaten wie `Version=55`, `IK_*=(Action=...)`, Witcher-Flags wie `Reprocess` erlaubt). Fehlerhafte Dateien werden mit Zeilendiagnose abgewiesen statt still unvollständig geparst.
- **Section-Sortierung vor dem Speichern** — gespeicherte Dateien werden innerhalb jeder Section deterministisch geordnet: Buchstaben, normale Zahlen `0`–`9`, Numpad, F-Tasten, Maus, Modifier/Navigation, Sonderzeichen, Gamepad, `IK_None`, danach unbekannte Keys alphabetisch. Mehrere Zeilen mit derselben Taste behalten ihre relative Reihenfolge. Projekt-Remaps und Session-Saves schreiben diese Normalform mit Backup.
- **Lesbare Action-Namen** — der Scan liest Vanilla- und Mod-`input.xml`/`input_xml.txt`-Metadaten, Mod-Lokalisierungs-CSV-Dateien (`localization/*.csv`, `*.w3strings.csv`) und optional dekodierte `.w3strings`. Bevorzugt wird das Open-Source-Rust-Tool `w3strings-ng` (`W3STRINGS_NG_EXE`, `tools/w3strings-ng/w3strings-ng(.exe)`, `tools/w3strings/w3strings-ng(.exe)` oder `PATH`); der alte Nexus-`w3strings.exe` bleibt Fallback (`W3STRINGS_EXE`, `tools/w3strings/w3strings(.exe)`, `PATH`, `C:\tmp\w3strings-encoder-0.4.1\w3strings.exe`). Vor dem Dekodieren wird ein Dictionary aus Input-XML-IDs, Display-Keys, Mod-CSV-Keys und `GetLocString*`-Keys aus `.ws`-Dateien erzeugt, damit `w3strings-ng` gehashte String-IDs wie `panel_groupname_fast_attack` oder `toggle_walk_run` auflösen kann. Dekodierte CSVs landen nur im gitignorierten `.cache/w3strings`. Treffer wie `PauseGameToggle` werden lokalisiert angezeigt; nicht auflösbare Keys werden humanisiert (`move_forward` → `Move Forward`, `ControlLayout_RunSprint` → `Run Sprint`). `.ws`-Dateien können auf Lokalisierungs-Keys geparst werden, liefern aber selbst keine übersetzten Texte.
- **Mappings-Liste & Konflikt-Sidebar** — Suche, Quellen-/Geräte-Filter; Klick auf eine Konflikt-Taste im Schema hebt den Sidebar-Eintrag hervor.

## Cross-Platform-Status

Aktuell ist die automatische Installations-/Geräteerkennung Windows/GOG-lokal verdrahtet. Für Linux/SteamOS/Wine ist geplant: Steam-Libraries über App-ID `292030`, Proton-/Wine-Prefixe (`compatdata`, `$WINEPREFIX`, `~/.wine`, Lutris/Bottles/Heroic) und dort die Witcher-Dateisignaturen (`input.xml`, `legacy/base/input_*.ini`, `Mods/`, `Documents/The Witcher 3/input.settings`) automatisch erkennen. Layout-Fallback: `de*` → QWERTZ, `fr*` → AZERTY, sonst QWERTY.

## HTTP-API

| Route | Methode | Zweck |
|---|---|---|
| `/api/scan` | GET | Prüft und parst `input.settings`, liefert Commands, Stats, Syntaxstatus und Konflikte (inkl. `sources[]` je Konflikt). |
| `/api/remap` | POST | `{ actions, newKey, oldKey?, sections? }` — schreibt Bindings sortiert (Backup vor jedem Schreiben). |
| `/api/load` | POST | `multipart/form-data` mit `file` — prüft und parst eine hochgeladene `input.settings` **nur für die Session** (kein Disk-Write). |
| `/api/save` | POST | `{ targetPath, content, sort? }` — schreibt sortiert in eine Zieldatei (Backup, falls vorhanden; `sort:false` nur für explizite Debug-/Sonderfälle). |
| `/api/devices` | GET | `{ devices: [{vid,pid,name,type}], inputLanguage }` — Windows-PnP + Eingabesprache; auf Nicht-Windows/Fehler leer. |

Alle Schreibpfade erzeugen vorher ein byte-identisches Backup `…<timestamp>.bak`.

## Geräte-Registry

Profile liegen unter `public/devices/`:

- `index.json` — `{ "profiles": [ { id, vid, pid, type, fallback, fallbackLocales } ] }`
- `<id>/profile.json` — Pflichtfelder `id, name, type, layout, keys`; jede Taste mit `ik` (Witcher-`IK_*`-Name), `label`, `x/y/w/h`, `shape` (`rect` | `wide` | `pill` | `circle` | `dpad-*` | `label` | `iso-enter`); optional `artwork` für ein SVG-Gerätebild unter den klickbaren Overlays. Artwork-Profile können pro Taste `coord: "px"` nutzen, dann beziehen sich `x/y/w/h` direkt auf das 1672x1672-SVG-Pixelkoordinatensystem.

Neue Geräte lassen sich allein durch Hinzufügen eines Profils + `index.json`-Eintrags ergänzen (kein Code-Change). Vorhandene Layouts: ISO-DE 105/87, ANSI-US 104/87, 5-Tasten-Maus, Xbox-Controller.

## Projektdoku & KI-Workflow

`AGENTS.md` (Repo-Doku, Befehle, Doku-Protokoll) ist der Einstieg für KI-Tools. Die Feature-Spezifikation liegt unter `docs/specs/device-centric-ui/` (requirements/design/tasks). `AI_JOURNAL.md`, `CLAUDE.md` und `.claude/` sind lokal & gitignored.
