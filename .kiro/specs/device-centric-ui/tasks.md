# Implementation Plan: Device-Centric UI

## Overview

Umbau des bestehenden Flat-List-UIs zu einem geräte-zentrierten Layout mit interaktiven SVG-Schemata,
Tasten-Einfärbung nach Binding-Quelle, Konflikt-Highlighting, Tasten-Popovers und Witcher-3-Styling.
Alle bestehenden Funktionen (Mappings-Liste, Filter, Remap-Dialog, Konflikt-Liste) bleiben erhalten.

Sprache: Plain Browser-JS (CommonJS auf dem Server), kein Build-Step, keine neuen npm-Pakete.

---

## Tasks

- [x] 1. Geräte-Registry: JSON-Profildateien und index.json anlegen
  - Verzeichnis `public/devices/` erstellen
  - `public/devices/index.json` mit den sechs Profil-Einträgen anlegen (iso-de-105, iso-de-87, ansi-us-104, ansi-us-87, mouse-5btn, xbox-ctrl); jeder Eintrag enthält `fallback` und `fallbackLocales`:
    - `iso-de-105`: `"fallback": true, "fallbackLocales": ["de"]` — primäres DE-Fallback (Full-Size)
    - `iso-de-87`: `"fallback": false, "fallbackLocales": []` — nur manuell wählbar, kein automatisches Fallback
    - `ansi-us-104`: `"fallback": true, "fallbackLocales": ["en"]` — EN-Fallback für alle nicht-deutschen Sprachen
    - `ansi-us-87`: `"fallback": false, "fallbackLocales": []` — nur manuell wählbar
    - `mouse-5btn`: `"fallback": true, "fallbackLocales": []`
    - `xbox-ctrl`: `"fallback": true, "fallbackLocales": []`
  - Für jedes Profil ein Unterverzeichnis `public/devices/<id>/` anlegen
  - `public/devices/iso-de-105/profile.json` mit vollständigem ISO-DE-105-Tastenlayout (alle 105 Tasten mit `ik`, `label`, `x`, `y`, `w`, `h`, `shape`) anlegen; VID `1E7D`, PID `307A` eintragen
  - `public/devices/iso-de-87/profile.json` mit ISO-DE-87-TKL-Layout anlegen
  - `public/devices/ansi-us-104/profile.json` mit ANSI-US-104-Layout anlegen
  - `public/devices/ansi-us-87/profile.json` mit ANSI-US-87-TKL-Layout anlegen
  - `public/devices/mouse-5btn/profile.json` mit 5-Tasten-Maus-Layout anlegen
  - `public/devices/xbox-ctrl/profile.json` mit Xbox-Controller-Layout (alle Buttons, Trigger, Schultertasten, Thumbsticks, D-Pad) anlegen
  - Pflichtfelder je Profil: `id`, `name`, `type`, `layout`, `keys`; optionale Felder: `vid`, `pid`, `fallback`, `fallbackLocales`, `size`
  - `shape`-Werte: `"rect"` (Standard), `"iso-enter"` (ISO-Enter), `"wide"` (breite Tasten)
  - _Requirements: 2.1, 3.1, 3.2, 3.4_

- [x] 2. Server: `/api/load`, `/api/save` und `/api/devices` implementieren
  - [x] 2.1 `/api/load` (POST, `multipart/form-data`) in `server.js` implementieren
    - Rohen Request-Body einlesen, `file`-Feld aus Multipart-Daten extrahieren (ohne externe Bibliothek)
    - Datei im Speicher parsen (`parseInputSettings` auf Buffer-Inhalt), `buildScan()`-äquivalentes Ergebnis zurückgeben
    - Serverseitigen `defaults.inputSettings`-Pfad nicht verändern
    - Bei ungültigem Format: `400` mit `{ error: "..." }` zurückgeben
    - _Requirements: 7.1, 7.8_
  - [x] 2.2 `/api/save` (POST, JSON `{ targetPath, content }`) in `server.js` implementieren
    - Zieldatei auf Existenz prüfen; falls vorhanden, Backup mit `timestamp()`-Suffix erstellen
    - Inhalt in Zieldatei schreiben
    - Antwort: `{ saved: targetPath, backup: backupPath | null }`
    - Falls Backup-Erstellung fehlschlägt: Schreibvorgang abbrechen, `500` zurückgeben
    - _Requirements: 7.2, 7.3, 12.1, 12.2, 12.3_
  - [x] 2.3 `handleDevices` / `detectDevicesWin32` / `detectLayoutLanguageWin32` in `server.js` implementieren
    - `GET /api/devices` Route registrieren
    - Auf `process.platform !== 'win32'`: sofort `{ devices: [], inputLanguage: null }` zurückgeben
    - `detectDevicesWin32()`: PowerShell-Befehl `Get-PnpDevice -Class HIDClass -Status OK | Select-Object FriendlyName,DeviceID | ConvertTo-Json` via `child_process.execFile` ausführen; VID/PID per Regex `VID_([0-9A-F]{4})&PID_([0-9A-F]{4})` aus `DeviceID` extrahieren; Gerätetyp aus `FriendlyName` ableiten (Heuristik: enthält „keyboard" → `"keyboard"`, „mouse" → `"mouse"`, sonst `"gamepad"`)
    - `detectLayoutLanguageWin32()`: PowerShell-Befehl `(Get-WinUserLanguageList)[0].LanguageTag` ausführen; gibt BCP-47-Sprach-Tag zurück (z. B. `"de-DE"`); bei Fehler oder leerem Ergebnis `null` zurückgeben (kein 500)
    - Beide Abfragen parallel via `Promise.all([detectDevicesWin32(), detectLayoutLanguageWin32()])` ausführen
    - API-Antwort: `{ devices: [...], inputLanguage: string | null }`
    - Bei Fehler der Geräteabfrage: `devices: []` zurückgeben (kein 500)
    - _Requirements: 8.1, 8.2, 8.3, 8.6, 8.7_
  - [x] 2.4 `findConflicts` um `sources`-Feld erweitern
    - Für jeden Konflikt-Eintrag `sources: string[]` parallel zu `commands[]` befüllen (Binding-Quelle je Command aus `modSources`-Map)
    - Bestehende Signatur und Rückgabestruktur ansonsten unverändert lassen
    - _Requirements: 5.4, 13.5_

- [x] 3. Checkpoint — Serverseitige Syntax und API-Routen prüfen
  - `node --check server.js` ausführen und alle Fehler beheben
  - Sicherstellen, dass `/api/scan`, `/api/remap`, `/api/load`, `/api/save`, `/api/devices` alle registriert sind

- [x] 4. Client: `Device_Registry`-Modul in `public/app.js` implementieren
  - `loadRegistry()` — lädt `public/devices/index.json` per `fetch`, gibt `Array<ProfileMeta>` zurück
  - `loadProfile(profileId)` — lädt `public/devices/<profileId>/profile.json` per `fetch`, gibt `Profile` zurück
  - `matchDevice(vid, pid, registry, inputLanguage)` — Fallback-Logik in vier Stufen:
    1. Exakter VID:PID-Treffer in der Registry → passendes Profil zurückgeben
    2. Kein Treffer + `inputLanguage` beginnt mit `"de-"` (z. B. `"de-DE"`, `"de-AT"`, `"de-CH"`) → Profil mit `fallbackLocales` enthält `"de"` bevorzugen (= `iso-de-105`)
    3. Kein Treffer + andere nicht-leere Sprache → Profil mit `fallbackLocales` enthält `"en"` (= `ansi-us-104`)
    4. Kein Treffer + `inputLanguage` ist `null` oder leer → `null` zurückgeben
  - Profil-Validierung: Pflichtfelder `id`, `name`, `type`, `layout`, `keys` prüfen; bei fehlendem Feld Profil überspringen und `console.error` ausgeben
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 8.6, 8.7, 8.8_
  - [x]* 4.1 Property-Test: Device_Registry Round-Trip
    - **Property 1: Geräteprofil Round-Trip**
    - **Validates: Requirements 3.7** — Für alle validen Profile: `JSON.parse(JSON.stringify(profile))` ergibt äquivalentes Objekt
  - [x]* 4.2 Property-Tests: matchDevice Fallback-Logik
    - **Property 2: DE-Sprache wählt iso-de-105**
    - Für alle Sprach-Tags der Form `"de-XX"` (z. B. `"de-DE"`, `"de-AT"`, `"de-CH"`, `"de-LU"`): `matchDevice(null, null, registry, inputLanguage)` gibt Profil mit `id === "iso-de-105"` zurück
    - **Validates: Requirements 8.6**
    - **Property 3: Nicht-DE-Sprache wählt ansi-us-104**
    - Für alle nicht-leeren Sprach-Tags, die nicht mit `"de-"` beginnen (z. B. `"en-US"`, `"fr-FR"`, `"pl-PL"`): `matchDevice(null, null, registry, inputLanguage)` gibt Profil mit `id === "ansi-us-104"` zurück
    - **Validates: Requirements 8.7**

- [x] 5. Client: `SVG_Renderer` für Tastatur-Layouts implementieren
  - `renderKeyboardSvg(profile)` — iteriert über `profile.keys`, erzeugt `<rect>`- bzw. `<path>`-Elemente (ISO-Enter als L-Pfad, breite Tasten als `<rect>` mit angepasster Breite)
  - Koordinaten: `x * unitSize`, `y * unitSize`, `w * unitSize`, `h * unitSize` (Standard `unitSize = 54`)
  - Jede Taste erhält `data-key="<ik>"`, `tabindex="0"`, `aria-label="<label>: unbelegt"` (wird später durch Colorizer aktualisiert)
  - Tasten-Label als `<text>`-Element zentriert in der Taste
  - SVG-Viewbox aus Profil-Ausdehnung berechnen
  - `renderDeviceSvg(profile)` — delegiert an `renderKeyboardSvg`, `renderMouseSvg` oder `renderGamepadSvg` je nach `profile.type`
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 6.5, 6.9_

- [x] 6. Client: `SVG_Renderer` für Maus und Gamepad implementieren
  - `renderMouseSvg(profile)` — generiert Maus-Silhouette mit 5 Tasten (Links, Rechts, Mitte, Mouse4, Mouse5) und Scrollrad-Indikator; alle Tasten mit `data-key`, `tabindex`, `aria-label`
  - `renderGamepadSvg(profile)` — generiert Xbox-Controller-Silhouette mit allen Buttons (A/B/X/Y), Triggern (LT/RT), Schultertasten (LB/RB), Thumbsticks (L3/R3), D-Pad (4 Richtungen), Start/Back; alle Elemente mit `data-key`, `tabindex`, `aria-label`
  - `applyColoring(svgEl, colorMap)` — setzt `fill` und `filter: drop-shadow(0 0 4px <farbe>)` (innerer Glow) auf jedes `[data-key]`-Element; aktualisiert `aria-label` mit Binding-Zusammenfassung
  - `applyConflicts(svgEl, conflicts)` — setzt CSS-Klasse `conflict-high` (rot, pulsierend) bzw. `conflict-medium` (amber, pulsierend) auf betroffene Tasten
  - IF SVG-Generierung fehlschlägt: `showToast(message, 'error')` aufrufen, vorheriges SVG beibehalten
  - _Requirements: 2.6, 2.7, 2.8, 5.1, 5.2, 9.5_

- [x] 7. Client: `Key_Colorizer` implementieren
  - `computeTopMods(commands)` — zählt Bindings je `source`, sortiert absteigend, gibt Top-5 zurück; weist jeder Mod eine distinkte Farbe aus einer festen Palette zu (z.B. 5 Farben: `#4e9af1`, `#a78bfa`, `#34d399`, `#fb923c`, `#f472b6`)
  - `buildColorMap(commands, conflicts)` — iteriert über alle Commands; Vanilla → `#d2a657`; Top-5-Mod → Mod-Farbe; Sonstige → `#6b7280`; Konflikt (Taste in `conflicts`) → `#ef4444` (high) oder `#f59e0b` (medium); unbelegt → `var(--panel)` (neutral)
  - `buildLegend(topMods, hasOther, hasVanilla)` — gibt Array `{ label, color }` zurück für Legende
  - Farbzuweisung der Top-5-Mods bleibt stabil solange `commands`-Array unverändert (deterministisch nach Sortierung)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_
  - [x]* 7.1 Property-Test: Colorizer-Konsistenz
    - **Property 2: Farb-Determinismus**
    - **Validates: Requirements 4.7, 4.8** — Für alle Commands-Arrays: `buildColorMap` liefert bei zweimaligem Aufruf mit denselben Daten identische Maps

- [x] 8. Client: `Toast_Manager` implementieren
  - `showToast(message, type)` — erstellt `<div class="toast toast-<type>">` und hängt es an `document.body`
  - Toast erscheint unten rechts, fährt per CSS-Transition ein, verschwindet nach 4 s automatisch
  - Mehrere Toasts stapeln sich vertikal
  - `alert()` und `confirm()` aus `app.js` entfernen und durch `showToast` bzw. Popover-Bestätigung ersetzen
  - _Requirements: 9.6, 7.6, 7.7, 8.6_

- [x] 9. Client: `Popover_Controller` implementieren
  - `openPopover(ikKey, anchorEl, scanData)` — baut Popover-HTML mit: Tastenname, Actions-Liste, Binding-Quelle (Vanilla/Mod-Name), Konflikt-Hinweis falls vorhanden, Schaltflächen „Ändern" und „Löschen"
  - „Ändern"-Button ruft bestehende `openRemap(commandId)` auf
  - „Löschen"-Button: zeigt Inline-Bestätigung (kein `confirm()`), ruft dann `/api/remap` mit `newKey: "IK_None"` auf, erstellt Backup, aktualisiert UI
  - `closePopover()` — entfernt aktives Popover aus DOM
  - Zu jedem Zeitpunkt höchstens ein Popover offen (vorheriges schließen vor neuem Öffnen)
  - Escape-Taste und Klick außerhalb schließen Popover
  - Klick auf konfliktbehaftete Taste: Konflikt-Eintrag im Sidebar-Panel hervorheben (`scrollIntoView` + CSS-Klasse)
  - _Requirements: 6.1, 6.2, 6.3, 6.7, 6.8_

- [x] 10. Client: Hover-Tooltip und Keyboard-Navigation für SVG-Tasten
  - `mouseenter`-Handler auf `[data-key]`-Elementen: zeigt nativen `title`-Tooltip oder Custom-Tooltip mit Action-Name und Binding-Quelle
  - `keydown`-Handler auf `[data-key]`-Elementen: Enter oder Space → `openPopover()`
  - `focus`-Handler: visuellen Fokus-Ring sicherstellen (CSS `outline` nicht entfernen)
  - _Requirements: 6.4, 6.5, 6.6, 9.8_

- [x] 11. Client: Geräte-Tabs und Tab-UI implementieren
  - Drei Tab-Elemente in `index.html` anlegen: „Tastatur", „Maus", „Gamepad" (trapezförmige Form via CSS `clip-path` oder `transform: skewX`)
  - Aktiver Tab: Gold-Akzent `#d2a657`, erhöhter Kontrast
  - Tab-Wechsel: `activeDevice`-State aktualisieren, SVG neu rendern, Colorizer neu anwenden
  - Session-State `activeDevice` für Dauer der Session beibehalten (kein `localStorage`)
  - Falls kein Binding für ein Gerät vorhanden: Tab als `disabled` kennzeichnen, erklärende Meldung im Tab-Inhalt anzeigen
  - Legende unterhalb des SVG rendern (aus `buildLegend()`)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 12. Client: Hardware-Erkennung und automatische Profil-Vorauswahl
  - Beim Seitenstart parallel `/api/scan` und `/api/devices` aufrufen
  - `/api/devices`-Antwort hat Format `{ devices, inputLanguage }`; `matchDevice(vid, pid, registry, inputLanguage)` mit viertem Parameter aufrufen
  - Passendes Profil laden und als aktives Profil setzen; SVG rendern
  - Falls `matchDevice` `null` zurückgibt (kein VID:PID-Treffer und keine Eingabesprache): `state.showLayoutDropdown = true` setzen, Layout-Auswahl-Dropdown anzeigen (ISO-DE / ANSI-US); nach Dropdown-Auswahl entsprechendes Profil laden und `showLayoutDropdown = false` setzen
  - Falls `/api/devices` Fehler zurückgibt: `showToast('Hardware-Erkennung nicht verfügbar', 'info')`, Fallback-Profil laden
  - _Requirements: 8.3, 8.4, 8.5, 8.6, 8.8_

- [ ] 13. Client: Load/Save-UI implementieren
  - „Laden"-Button in `index.html` hinzufügen; öffnet `<input type="file" accept=".settings">` per `.click()`
  - Datei-Auswahl → `FormData` mit `file`-Feld → POST `/api/load` → Scan-Daten in `state.scan` speichern → UI neu rendern
  - „Speichern"-Button: öffnet `<input type="file" accept=".settings" nwsaveas>` (oder Fallback: Prompt für Pfad-Eingabe) → POST `/api/save` mit `{ targetPath, content }`
  - Lade-Indikator (`aria-busy`, CSS-Spinner oder Overlay) während asynchroner Operationen anzeigen
  - Erfolgs- und Fehler-Toasts via `showToast`
  - Geladene Datei gilt nur für aktuelle Session (kein Persistieren)
  - _Requirements: 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 9.7_

- [x] 14. Client: Konflikt-Sidebar und SVG-Konflikt-Verknüpfung
  - Bestehende Konflikt-Liste (`#conflicts`) ins neue Layout als Sidebar-Panel integrieren
  - Konflikte nach Severity absteigend sortieren (`"high"` vor `"medium"`)
  - Jeder Konflikt-Eintrag zeigt: Sektion, betroffene Commands, Mod-Quellen (`sources`-Feld aus erweitertem Scan)
  - Falls keine Konflikte: Meldung „Keine Konflikte gefunden" anzeigen
  - Klick auf konfliktbehaftete SVG-Taste → zugehörigen Sidebar-Eintrag hervorheben und in Sicht scrollen
  - _Requirements: 5.3, 5.5, 5.6, 5.7, 10.2_

- [ ] 15. Checkpoint — Kernfunktionalität integriert prüfen
  - `node --check public/app.js` ausführen und alle Fehler beheben
  - Sicherstellen, dass Seitenstart, Tab-Wechsel, SVG-Rendering, Colorizer, Popover und Toast fehlerfrei durchlaufen
  - Sicherstellen, dass bestehende Mappings-Liste, Suche, Filter und Remap-Dialog weiterhin funktionieren

- [ ] 16. Integration bestehender Funktionalität sicherstellen
  - Mappings-Liste (`#commands`) mit Suche, Quellen-Filter und Geräte-Filter im neuen Layout beibehalten
  - Remap-Dialog aus Mappings-Liste und aus Tasten-Popover aufrufbar halten
  - Nach erfolgreichem Remap: SVG-Ansicht und Mappings-Liste automatisch aktualisieren (`load()` erneut aufrufen)
  - Statistik-Anzeige (Bindings, Aktionen, Befehle, Sektionen, Tasten, Mod-Actions) beibehalten
  - `/api/scan` und `/api/remap` unverändert lassen
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 17. Witcher-3-Styling in `public/styles.css` und `public/index.html`
  - Bestehende CSS-Variablen (`--bg`, `--panel`, `--accent`, `--danger`, `--ok`) beibehalten; neue Variablen ergänzen: `--gold: #d2a657`, `--conflict-high: #ef4444`, `--conflict-medium: #f59e0b`, `--glow-size: 6px`
  - Ornamentale Trennelemente zwischen Hauptbereichen (CSS `::before`/`::after` mit SVG-Daten-URI oder Border-Muster)
  - Überschriften: `letter-spacing: 0.08em` oder mehr
  - Hintergrund-Textur: `background-image: url("data:image/svg+xml,...")` mit subtilen Noise-Punkten (SVG `feTurbulence`-Filter oder CSS-Gradient-Muster), kein externes Bild
  - Trapezförmige Tabs: `clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)` oder `transform: perspective(...)` 
  - Pulsier-Animation für Konflikt-Tasten: `@keyframes pulse` mit `opacity` oder `filter`-Variation
  - Fokus-Ringe für alle interaktiven Elemente: `outline: 2px solid var(--gold)`, `outline-offset: 2px` (WCAG 2.1)
  - Kontrastverhältnis ≥ 4,5:1 für alle Text-Hintergrund-Kombinationen sicherstellen
  - Toast-Styling: feste Position unten rechts, Slide-in-Animation, Typ-Farben (success/error/info)
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.8, 9.9, 9.10, 9.11_

- [ ] 18. Abschluss-Checkpoint — Alle Tests und Syntax-Prüfungen
  - `node --check server.js` und `node --check public/app.js` ausführen
  - Sicherstellen, dass alle sechs Geräteprofile und `index.json` vorhanden und valide JSON sind
  - Sicherstellen, dass kein `alert()` oder `confirm()` mehr in `app.js` vorhanden ist
  - Alle Anforderungen aus Requirements 1–10 gegen die implementierten Komponenten abgleichen
  - Alle offenen Threads und nächste Schritte in `AI_JOURNAL.md` dokumentieren

---

## Notes

- Tasks mit `*` sind optional und können für ein schnelles MVP übersprungen werden
- Jeder Task referenziert spezifische Requirements für Rückverfolgbarkeit
- Die Geräte-Registry (Task 1) ist Voraussetzung für SVG_Renderer (Tasks 5–6) und Device_Registry-Client (Task 4)
- Server-Erweiterungen (Task 2) sind unabhängig von Client-Tasks und können parallel entwickelt werden
- `unitSize = 54` (px pro Tasteneinheit) ist ein guter Startwert; kann später per CSS-Variable anpassbar gemacht werden
- Für den Save-Button auf Windows ohne Electron: Pfad-Eingabe via `<input type="text">` im Dialog ist die pragmatischste Lösung (kein nativer Datei-Speichern-Dialog im Browser ohne File System Access API)
- Property-Tests (Tasks 4.1, 7.1) können mit einfachen `for`-Schleifen über generierte Testdaten in einer separaten `test/`-Datei implementiert werden — kein Test-Framework nötig, da dependency-frei

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2"] },
    { "wave": 2, "tasks": ["3", "4", "5", "7", "8"] },
    { "wave": 3, "tasks": ["4.1", "4.2", "6", "9", "10", "11", "12", "13"] },
    { "wave": 4, "tasks": ["14", "15"] },
    { "wave": 5, "tasks": ["16", "17"] },
    { "wave": 6, "tasks": ["18"] }
  ]
}
```
