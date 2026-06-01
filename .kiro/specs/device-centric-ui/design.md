# Design: Geräte-zentriertes UI (device-centric-ui)

## Overview

Das Feature baut die bestehende Flat-List-Oberfläche des Witcher 3 Keymappers zu einem geräte-zentrierten UI um. Kernidee: Der Nutzer sieht ein interaktives SVG-Schema seines Eingabegeräts (Tastatur, Maus, Gamepad), auf dem jede Taste farblich nach Binding-Quelle markiert ist. Konflikte leuchten direkt auf dem Schema auf. Alle bestehenden Funktionen (Mappings-Liste, Filter, Remap-Dialog, Konflikt-Liste) bleiben erhalten und werden ins neue Layout integriert.

Das Tool bleibt vollständig dependency-frei (Plain Node.js + Plain Browser-JS, CommonJS auf dem Server, kein Build-Step).

### Kernentscheidungen (mit User abgestimmt)

- SVG-Schemata werden per JavaScript-Code generiert (kein manuelles SVG-Zeichnen)
- Geräte-Registry als JSON-Profildateien unter `public/devices/`
- Hybrid-Färbung: Vanilla + Top-5-Mods nach Binding-Anzahl + „Sonstige"
- Gamepad-Tab mit Xbox-Controller-Layout
- Sechs Layouts: ISO-DE 105, ISO-DE 87 TKL, ANSI-US 104, ANSI-US 87 TKL, generische 5-Tasten-Maus, Xbox Controller
- Kollisionsanzeige: rote/amber Markierung im SVG + Sidebar-Konflikt-Panel
- Tasten-Popover bei Klick: Actions, Quelle, Konflikte → „Ändern" / „Löschen"
- Load/Save: `/api/load` (POST, session-only), `/api/save` (POST, mit Backup)
- Hardware-Erkennung via PowerShell PnP + Windows-Eingabesprache (`/api/devices`)
- Sprach-basierter Fallback: `de-*` → `iso-de-105`, andere → `ansi-us-104`, keine Sprache → Dropdown
- `iso-de-105` ist primäres DE-Fallback (`fallback: true`, `fallbackLocales: ["de"]`); `iso-de-87` nur manuell wählbar
- Layout-Auswahl-Dropdown wenn weder VID:PID noch Sprache erkannt werden kann
- Witcher-3-Design: ornamentale Trennelemente, gesperrter Letter-Spacing, Textur, trapezförmige Tabs, innerer Glow, Toast statt `alert()`

---

## Architecture

Das System folgt dem bestehenden Muster: ein schlanker Node.js-HTTP-Server (`server.js`) liefert statische Dateien und JSON-APIs; die gesamte UI-Logik läuft im Browser (`public/app.js`).

```mermaid
graph TD
    subgraph Browser
        UI[index.html]
        APP[app.js]
        SVG_R[SVG_Renderer]
        KEY_C[Key_Colorizer]
        POP[Popover_Controller]
        TOAST[Toast_Manager]
        DEV_REG[Device_Registry Client]
    end

    subgraph Server [server.js]
        SCAN[/api/scan]
        REMAP[/api/remap]
        LOAD[/api/load]
        SAVE[/api/save]
        DEVICES[/api/devices]
        STATIC[Static Files]
        PARSER[Input_Settings_Parser]
        CONFLICT[Conflict_Scanner]
        DETECTOR[Device_Detector]
    end

    subgraph FS [Filesystem]
        INPUT[input.settings]
        BACKUP[*.bak]
        PROFILES[public/devices/]
        INDEX[public/devices/index.json]
    end

    UI --> APP
    APP --> SVG_R
    APP --> KEY_C
    APP --> POP
    APP --> TOAST
    APP --> DEV_REG
    DEV_REG -->|fetch index.json| STATIC
    DEV_REG -->|fetch profile.json| STATIC
    APP -->|GET /api/scan| SCAN
    APP -->|POST /api/remap| REMAP
    APP -->|POST /api/load| LOAD
    APP -->|POST /api/save| SAVE
    APP -->|GET /api/devices| DEVICES
    SCAN --> PARSER
    SCAN --> CONFLICT
    REMAP --> PARSER
    LOAD --> PARSER
    SAVE --> PARSER
    DEVICES --> DETECTOR
    PARSER --> INPUT
    PARSER --> BACKUP
    STATIC --> PROFILES
    STATIC --> INDEX
```

### Datenfluss beim Seitenstart

1. Browser lädt `index.html` → `app.js`
2. `app.js` ruft parallel `/api/scan` und `/api/devices` auf
3. `/api/devices` liefert `{ devices: [...], inputLanguage: "de-DE" | null }`
4. `Device_Registry` (Client) lädt `index.json`, ruft `matchDevice(vid, pid, registry, inputLanguage)` auf:
   - VID:PID-Treffer → Profil direkt laden
   - Kein Treffer + `inputLanguage` beginnt mit `"de-"` → `iso-de-105` laden
   - Kein Treffer + andere Sprache → `ansi-us-104` laden
   - Kein Treffer + keine Sprache → `showLayoutDropdown = true`, UI zeigt Dropdown
5. `SVG_Renderer` generiert SVG für das vorausgewählte Gerät (oder wartet auf Dropdown-Auswahl)
6. `Key_Colorizer` färbt Tasten anhand der Scan-Daten ein
7. Bestehende Mappings-Liste und Konflikt-Panel werden parallel gerendert

---

## Components and Interfaces

### Server-Komponenten

#### `Input_Settings_Parser` (erweitert)

Bestehende Funktionen (`parseInputSettings`, `remap`) bleiben unverändert. Neu:

```js
// POST /api/load — parst hochgeladene Datei, gibt Scan-Daten zurück (session-only)
function handleLoad(req, res)

// POST /api/save — schreibt Bindings in Zieldatei, erstellt Backup
function handleSave(req, res)
```

`/api/load` akzeptiert `multipart/form-data` mit einem `file`-Feld. Der Server parst die Datei im Speicher (kein Schreiben auf Disk), führt `buildScan()` auf den geparsten Daten aus und gibt das Scan-Ergebnis zurück. Der `defaults.inputSettings`-Pfad bleibt unverändert.

`/api/save` akzeptiert JSON `{ targetPath: string, content: string }`. Erstellt Backup falls Zieldatei existiert, schreibt dann.

#### `Device_Detector` (neu in `server.js`)

```js
// GET /api/devices — gibt erkannte Geräte + Eingabesprache zurück
function handleDevices(req, res)

// Intern: PowerShell PnP-Abfrage für USB-HID-Geräte
function detectDevicesWin32()  // → Promise<Array<{vid, pid, name, type}>>

// Intern: Windows-Eingabesprache per Get-WinUserLanguageList
function detectLayoutLanguageWin32()  // → Promise<string|null>  z.B. "de-DE"
```

**PowerShell-Befehl für Geräte:**
```powershell
Get-PnpDevice -Class HIDClass -Status OK |
  Select-Object FriendlyName, DeviceID |
  ConvertTo-Json
```

VID/PID werden aus `DeviceID` per Regex extrahiert: `VID_([0-9A-F]{4})&PID_([0-9A-F]{4})`.

**PowerShell-Befehl für Eingabesprache:**
```powershell
(Get-WinUserLanguageList)[0].LanguageTag
```

Gibt den BCP-47-Sprach-Tag der primären Windows-Eingabesprache zurück (z. B. `"de-DE"`, `"en-US"`). Bei Fehler oder leerem Ergebnis gibt `detectLayoutLanguageWin32()` `null` zurück.

Beide Abfragen werden parallel ausgeführt (`Promise.all`). Auf Nicht-Windows-Systemen (`process.platform !== 'win32'`) geben beide Funktionen sofort `[]` bzw. `null` zurück.

**API-Antwort** (`/api/devices`):
```json
{
  "devices": [
    { "vid": "1E7D", "pid": "307A", "name": "ROCCAT Vulcan 100 AIMO", "type": "keyboard" }
  ],
  "inputLanguage": "de-DE"
}
```

`inputLanguage` ist `null`, wenn die Sprache nicht ermittelt werden konnte.

### Client-Komponenten

#### `Device_Registry` (neu, `public/app.js` oder eigenes Modul)

```js
// Lädt index.json, gibt alle Profile zurück
async function loadRegistry()  // → Array<ProfileMeta>

// Lädt ein einzelnes Profil
async function loadProfile(profileId)  // → Profile

// Mappt VID:PID auf Profil-ID; berücksichtigt Eingabesprache für Fallback-Auswahl
function matchDevice(vid, pid, registry, inputLanguage)  // → ProfileMeta | null
```

**Fallback-Logik in `matchDevice`:**

1. VID:PID-Treffer in der Registry → direkt das passende Profil zurückgeben
2. Kein Treffer + `inputLanguage` beginnt mit `"de-"` (z. B. `"de-DE"`, `"de-AT"`, `"de-CH"`) → Profil mit `"id": "iso-de-105"` bevorzugen (`fallback: true`, `fallbackLocales: ["de"]`)
3. Kein Treffer + andere Sprache (z. B. `"en-US"`) → Profil mit `"id": "ansi-us-104"` zurückgeben (`fallback: true`, `fallbackLocales: ["en"]`)
4. Kein Treffer + `inputLanguage` ist `null` oder leer → `null` zurückgeben (UI zeigt Layout-Auswahl-Dropdown)

#### `SVG_Renderer` (neu, `public/app.js`)

```js
// Generiert SVG-Element für ein Geräteprofil
function renderDeviceSvg(profile)  // → SVGElement

// Generiert Tastatur-SVG (ISO/ANSI)
function renderKeyboardSvg(profile)  // → SVGElement

// Generiert Maus-SVG
function renderMouseSvg(profile)  // → SVGElement

// Generiert Gamepad-SVG
function renderGamepadSvg(profile)  // → SVGElement

// Aktualisiert Farben/Glow auf bestehendem SVG
function applyColoring(svgEl, colorMap)  // → void

// Markiert Konflikttasten
function applyConflicts(svgEl, conflicts)  // → void
```

#### `Key_Colorizer` (neu, `public/app.js`)

```js
// Berechnet Farb-Map: IK_* → Farbe
function buildColorMap(commands, conflicts)  // → Map<string, string>

// Ermittelt Top-5-Mods nach Binding-Anzahl
function computeTopMods(commands)  // → Array<{source, count, color}>

// Gibt Legende zurück
function buildLegend(topMods, hasOther, hasVanilla)  // → Array<{label, color}>
```

#### `Popover_Controller` (neu, `public/app.js`)

```js
// Öffnet Popover für eine Taste
function openPopover(ikKey, anchorEl, scanData)  // → void

// Schließt aktives Popover
function closePopover()  // → void
```

#### `Toast_Manager` (neu, `public/app.js`)

```js
// Zeigt Toast-Nachricht
function showToast(message, type)  // type: 'success' | 'error' | 'info'
```

---

## Data Models

### Geräteprofil (`public/devices/<id>/profile.json`)

```json
{
  "id": "iso-de-105",
  "name": "ISO-DE 105 Full-Size",
  "type": "keyboard",
  "layout": "iso-de",
  "size": "full",
  "vid": "1E7D",
  "pid": "307A",
  "fallback": false,
  "keys": [
    {
      "ik": "IK_Escape",
      "label": "Esc",
      "row": 0,
      "col": 0,
      "x": 0,
      "y": 0,
      "w": 1,
      "h": 1,
      "shape": "rect"
    }
  ]
}
```

Pflichtfelder: `id`, `name`, `type`, `layout`, `keys`. Optionale Felder: `vid`, `pid`, `fallback`, `size`.

`shape`-Werte: `"rect"` (Standard), `"iso-enter"` (L-förmige ISO-Enter-Taste), `"wide"` (breite Taste wie Backspace/Shift).

### `index.json` (`public/devices/index.json`)

```json
{
  "profiles": [
    {
      "id": "iso-de-105",
      "vid": "1E7D", "pid": "307A",
      "type": "keyboard",
      "fallback": true,
      "fallbackLocales": ["de"]
    },
    {
      "id": "iso-de-87",
      "vid": null, "pid": null,
      "type": "keyboard",
      "fallback": false,
      "fallbackLocales": []
    },
    {
      "id": "ansi-us-104",
      "vid": null, "pid": null,
      "type": "keyboard",
      "fallback": true,
      "fallbackLocales": ["en"]
    },
    {
      "id": "ansi-us-87",
      "vid": null, "pid": null,
      "type": "keyboard",
      "fallback": false,
      "fallbackLocales": []
    },
    {
      "id": "mouse-5btn",
      "vid": null, "pid": null,
      "type": "mouse",
      "fallback": true,
      "fallbackLocales": []
    },
    {
      "id": "xbox-ctrl",
      "vid": null, "pid": null,
      "type": "gamepad",
      "fallback": true,
      "fallbackLocales": []
    }
  ]
}
```

**Semantik der neuen Felder:**

- `fallback: true` — Profil darf als Fallback verwendet werden, wenn kein VID:PID-Treffer vorliegt
- `fallbackLocales: ["de"]` — Profil wird bevorzugt, wenn `inputLanguage` mit einem der angegebenen Sprach-Präfixe beginnt
- `iso-de-105` ist das primäre DE-Fallback (Full-Size, 105 Tasten); `iso-de-87` ist kein automatisches Fallback mehr (nur manuell wählbar)
- `ansi-us-104` ist das EN-Fallback für alle nicht-deutschen Sprachen

### Erweitertes Scan-Ergebnis (Server → Client)

Das bestehende `buildScan()`-Ergebnis wird um `sources` in den Konflikten erweitert:

```js
// Konflikt-Objekt (erweitert)
{
  section: string,
  key: string,
  keyLabel: string,
  severity: "high" | "medium",
  commands: string[],
  lines: number[],
  sources: string[]   // NEU: Binding-Quellen je Command (parallel zu commands[])
}
```

### Session-State (Client)

```js
{
  scan: ScanResult | null,          // aktuelles Scan-Ergebnis
  activeDevice: "keyboard" | "mouse" | "gamepad",
  activeProfileId: string,
  loadedFilePath: string | null,    // null = Standard-Pfad
  colorMap: Map<string, string>,    // IK_* → CSS-Farbe
  topMods: Array<{source, color}>,
  openPopoverKey: string | null,
  showLayoutDropdown: boolean       // true wenn matchDevice null zurückgibt
}
```

Wenn `showLayoutDropdown` `true` ist, zeigt die UI ein Dropdown mit den manuell wählbaren Tastaturlayouts (mindestens ISO-DE / ANSI-US). Nach Auswahl wird das entsprechende Fallback-Profil geladen und `showLayoutDropdown` auf `false` gesetzt.

### IK_*-zu-Position-Mapping (im Profil)

Jede Taste im Profil hat `x`, `y`, `w`, `h` in Einheiten (1 Einheit = 1 Standard-Tastenbreite ≈ 54px). Der `SVG_Renderer` multipliziert mit einem konfigurierbaren `unitSize`-Faktor. Sondertasten (ISO-Enter, breite Shift-Tasten) nutzen `shape: "iso-enter"` mit einem vordefinierten Pfad-Generator.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Geräteprofil Round-Trip

*Für alle* validen Geräteprofile gilt: `JSON.parse(JSON.stringify(profile))` ergibt ein Objekt, das strukturell äquivalent zum Original ist (alle Pflichtfelder `id`, `name`, `type`, `layout`, `keys` bleiben erhalten und unverändert).

**Validates: Requirements 3.7**

---

### Property 2: DE-Sprache wählt iso-de-105

*Für alle* Sprach-Tags der Form `"de-XX"` (z. B. `"de-DE"`, `"de-AT"`, `"de-CH"`, `"de-LU"`) gilt: Wenn kein VID:PID-Treffer vorliegt, gibt `matchDevice(null, null, registry, inputLanguage)` das Profil mit `id === "iso-de-105"` zurück.

**Validates: Requirements 8.6**

---

### Property 3: Nicht-DE-Sprache wählt ansi-us-104

*Für alle* nicht-leeren Sprach-Tags, die nicht mit `"de-"` beginnen (z. B. `"en-US"`, `"fr-FR"`, `"pl-PL"`), gilt: Wenn kein VID:PID-Treffer vorliegt, gibt `matchDevice(null, null, registry, inputLanguage)` das Profil mit `id === "ansi-us-104"` zurück.

**Validates: Requirements 8.7**

---

**Property Reflection:** Property 2 und Property 3 sind komplementär und nicht redundant — sie decken die beiden Hälften der Fallback-Entscheidung ab. Property 1 ist unabhängig von 2 und 3. Kein Konsolidierungsbedarf.

---

## Error Handling

| Fehlerfall | Verhalten |
|---|---|
| `/api/devices` schlägt fehl | Leeres `{ devices: [], inputLanguage: null }`, Toast „Hardware-Erkennung nicht verfügbar" |
| `detectLayoutLanguageWin32` schlägt fehl | `inputLanguage: null` in der Antwort, kein 500 |
| `matchDevice` gibt `null` zurück | `showLayoutDropdown = true`, UI zeigt Dropdown |
| Profil-Validierung schlägt fehl | Profil überspringen, `console.error`, nächstes Profil laden |
| SVG-Generierung schlägt fehl | Toast (error), vorheriges SVG beibehalten |
| `/api/load` mit ungültigem Format | HTTP 400 mit `{ error: "..." }`, Toast (error) |
| Backup-Erstellung schlägt fehl | Schreibvorgang abbrechen, HTTP 500 |

---

## Testing Strategy

### Dual-Testing-Ansatz

**Unit-Tests** (spezifische Beispiele und Fehlerfälle):
- `matchDevice` mit bekanntem VID:PID → korrektes Profil
- `matchDevice` mit `inputLanguage: null` → `null` (Dropdown-Trigger)
- `buildColorMap` mit leerem Commands-Array → alle Tasten neutral
- `findConflicts` mit `IK_None`-Bindings → keine Konflikte
- Backup-Dateiname entspricht ISO-8601-Muster

**Property-Tests** (universelle Eigenschaften, min. 100 Iterationen je Test):

Bibliothek: Einfache `for`-Schleifen über generierte Testdaten in `test/` — dependency-frei, kein Build-Step nötig.

| Property | Tag | Iterationen |
|---|---|---|
| Geräteprofil Round-Trip | `Feature: device-centric-ui, Property 1: profile round-trip` | 100 |
| DE-Sprache → iso-de-105 | `Feature: device-centric-ui, Property 2: de-language fallback` | 100 |
| Nicht-DE-Sprache → ansi-us-104 | `Feature: device-centric-ui, Property 3: non-de-language fallback` | 100 |

**Integrations-Tests** (1–2 Beispiele, nicht für PBT geeignet):
- `/api/devices`-Antwort enthält `inputLanguage`-Feld (string oder null)
- Backup-Datei ist byte-identisch mit Original vor dem Schreibvorgang

**Nicht durch PBT abgedeckt** (IaC, UI-Rendering, Konfiguration):
- SVG-Rendering-Korrektheit → Snapshot-Tests
- CSS-Styling und Witcher-3-Design → visuelle Inspektion
- PowerShell-Abfrage-Verhalten → Integrations-Test auf Windows
