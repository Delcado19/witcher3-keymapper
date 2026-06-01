# Requirements Document

## Introduction

Das bestehende Witcher 3 Keymapper-Tool zeigt Tastenbelegungen als flache Liste an. Dieses Feature baut die Oberfläche zu einem geräte-zentrierten UI um: Statt einer Tabelle sieht der Nutzer ein interaktives SVG-Schema des jeweiligen Eingabegeräts (Tastatur, Maus, Gamepad), auf dem jede Taste farblich nach Quelle (Vanilla-Spiel vs. Mod) markiert ist. Konflikte werden direkt auf dem Schema hervorgehoben. Bestehende Funktionalität (Mappings-Liste, Filter, Konflikt-Liste, Remap-Dialog) bleibt vollständig erhalten und wird ins neue UI integriert.

Das Tool bleibt dependency-frei (Plain Node.js + Plain Browser-JS) und ist ausschließlich für lokalen Windows-Einsatz vorgesehen.

---

## Glossary

- **Keymapper**: Das gesamte Web-Tool (`server.js` + `public/`).
- **Input_Settings_Parser**: Die Serverkomponente, die `input.settings`-Dateien liest und schreibt (`parseInputSettings`, `remap` in `server.js`).
- **Conflict_Scanner**: Die Serverkomponente, die Tastenkonflikte erkennt (`findConflicts` in `server.js`).
- **Device_Registry**: Das Subsystem, das Geräteprofile aus `public/devices/` lädt und verwaltet.
- **Device_Detector**: Die Serverkomponente, die angeschlossene Hardware per PowerShell-PnP-Abfrage erkennt (`/api/devices`).
- **SVG_Renderer**: Die Client-Komponente, die ein Geräteprofil als interaktives SVG im Browser rendert.
- **Key_Colorizer**: Die Client-Komponente, die SVG-Tasten nach Binding-Quelle einfärbt.
- **Popover_Controller**: Die Client-Komponente, die Tasten-Popovers öffnet, befüllt und schließt.
- **Toast_Manager**: Die Client-Komponente, die nicht-blockierende Statusmeldungen anzeigt.
- **Geräte-Tab**: Ein Tab-Element in der UI, das einem Eingabegerät (Tastatur, Maus, Gamepad) entspricht.
- **Geräteprofil**: Eine JSON-Datei unter `public/devices/`, die Metadaten und Tastenlayout eines Geräts beschreibt.
- **SVG-Schema**: Eine SVG-Datei unter `public/devices/`, die das visuelle Layout eines Geräts darstellt.
- **IK_*-Bezeichner**: Witcher-3-interner Tastenname (z. B. `IK_A`, `IK_Pad_A_CROSS`).
- **Binding-Quelle**: Herkunft einer Tastenbelegung — entweder `"game/input.xml"` (Vanilla) oder ein Mod-Name (String aus `modSources`).
- **Konflikt**: Zwei oder mehr Commands, die in derselben Sektion auf dieselbe Taste gebunden sind.
- **Severity**: Schweregrad eines Konflikts — `"high"` oder `"medium"`.
- **VID:PID**: Vendor-ID und Product-ID eines USB-Geräts zur eindeutigen Hardware-Identifikation.
- **Backup**: Automatisch erstellte Sicherungskopie einer `input.settings`-Datei vor jedem Schreibvorgang.
- **Session**: Eine einzelne Browser-Sitzung ohne persistenten Zustand über Neuladen hinaus.
- **Toast**: Nicht-blockierende, zeitlich begrenzte Statusmeldung in der UI (ersetzt `alert()`).
- **Popover**: Schwebendes Informationspanel, das beim Klick auf eine SVG-Taste erscheint.
- **Progressive Disclosure**: UX-Prinzip: Details erst auf Anfrage zeigen, nicht sofort alles anzeigen.

---

## Requirements

### Requirement 1: Geräte-Tabs

**User Story:** Als Nutzer möchte ich die Tastenbelegungen nach Eingabegerät (Tastatur, Maus, Gamepad) getrennt betrachten, damit ich schnell den Überblick über ein bestimmtes Gerät bekomme.

#### Acceptance Criteria

1. THE Keymapper SHALL drei Geräte-Tabs bereitstellen: „Tastatur", „Maus" und „Gamepad".
2. WHEN ein Geräte-Tab aktiviert wird, THE SVG_Renderer SHALL das SVG-Schema des zugehörigen Geräts im Hauptbereich anzeigen.
3. WHEN ein Geräte-Tab aktiviert wird, THE Key_Colorizer SHALL ausschließlich die Bindings des aktiven Geräts auf dem Schema einfärben.
4. THE Keymapper SHALL den zuletzt aktiven Geräte-Tab für die Dauer der Session beibehalten.
5. THE Keymapper SHALL die Geräte-Tabs mit trapezförmiger/schräger Form im Witcher-3-Stil darstellen.
6. THE Keymapper SHALL den aktiven Tab visuell durch Gold-Akzent (`#d2a657`) und erhöhten Kontrast hervorheben.
7. WHEN kein Binding für ein Gerät vorhanden ist, THE Keymapper SHALL den zugehörigen Tab als deaktiviert kennzeichnen und eine erklärende Meldung im Tab-Inhalt anzeigen.

---

### Requirement 2: SVG-Geräteschemata (code-generiert)

**User Story:** Als Nutzer möchte ich ein realistisches, code-generiertes SVG-Schema meines Eingabegeräts sehen, damit ich Tastenbelegungen intuitiv auf dem vertrauten Gerät-Layout ablesen kann.

#### Acceptance Criteria

1. THE Device_Registry SHALL die folgenden sechs SVG-Schemata als statische Dateien unter `public/devices/` bereitstellen: ISO-DE 105 Full-Size (ROCCAT Vulcan 100 AIMO), ISO-DE 87 TKL, ANSI-US 104 Full-Size, ANSI-US 87 TKL, generische 5-Tasten-Maus, Xbox Controller.
2. THE SVG_Renderer SHALL jedes SVG-Schema vollständig per JavaScript-Code generieren, ohne manuell gezeichnete SVG-Dateien zu verwenden.
3. THE SVG_Renderer SHALL jede Taste im SVG mit dem zugehörigen `IK_*`-Bezeichner als `data-key`-Attribut versehen.
4. THE SVG_Renderer SHALL Tasten mit korrekten relativen Positionen und Größen gemäß dem jeweiligen Tastaturlayout (ISO-DE vs. ANSI-US, Full-Size vs. TKL) darstellen.
5. THE SVG_Renderer SHALL Sondertasten (Enter ISO-L-Form, Shift-Varianten, Numpad-Cluster) layoutkonform darstellen.
6. THE SVG_Renderer SHALL den Xbox Controller mit allen Buttons, Triggern, Schultertasten, Thumbsticks und D-Pad darstellen.
7. THE SVG_Renderer SHALL die generische Maus mit fünf Tasten (Links, Rechts, Mitte, Mouse4, Mouse5) und Scrollrad darstellen.
8. IF ein angefordertes SVG-Schema nicht geladen werden kann, THEN THE SVG_Renderer SHALL eine Fehlermeldung via Toast_Manager anzeigen und das zuletzt erfolgreich geladene Schema beibehalten.

---

### Requirement 3: Erweiterbare Geräte-Registry

**User Story:** Als Entwickler möchte ich neue Geräteprofile ohne Code-Änderungen hinzufügen können, damit das Tool leicht auf neue Hardware erweiterbar ist.

#### Acceptance Criteria

1. THE Device_Registry SHALL Geräteprofile als JSON-Dateien unter `public/devices/<profil-id>/profile.json` laden.
2. THE Device_Registry SHALL eine zentrale Index-Datei `public/devices/index.json` verwenden, die alle verfügbaren Profile auflistet.
3. WHEN ein neues Geräteprofil zur `index.json` hinzugefügt wird, THE Device_Registry SHALL es ohne Änderung an `server.js` oder `app.js` laden und anzeigen.
4. THE Device_Registry SHALL Geräteprofile per VID:PID-Schlüssel identifizieren (z. B. `"1E7D:307A"` für ROCCAT Vulcan 100 AIMO, `"1E7D:2E27"` für ROCCAT Kone Aimo).
5. IF kein Geräteprofil für eine erkannte VID:PID vorhanden ist, THEN THE Device_Registry SHALL auf das generische Fallback-Profil des passenden Gerätetyps (Tastatur/Maus/Gamepad) zurückfallen.
6. THE Device_Registry SHALL das Format eines Geräteprofils validieren und IF ein Pflichtfeld fehlt, THEN THE Device_Registry SHALL das fehlerhafte Profil überspringen und einen Fehler in der Browser-Konsole ausgeben.
7. FOR ALL Geräteprofile: Das Parsen eines validen Profils und das erneute Serialisieren SHALL ein äquivalentes Objekt ergeben (Round-Trip-Eigenschaft).

---

### Requirement 4: Tasten-Einfärbung nach Binding-Quelle

**User Story:** Als Nutzer möchte ich auf einen Blick sehen, welche Tasten vom Vanilla-Spiel und welche von welchem Mod belegt sind, damit ich Mod-Konflikte schnell identifizieren kann.

#### Acceptance Criteria

1. THE Key_Colorizer SHALL Tasten mit ausschließlich Vanilla-Bindings (`"game/input.xml"`) in der Vanilla-Farbe einfärben.
2. THE Key_Colorizer SHALL die fünf Mods mit den meisten Bindings ermitteln und jeder dieser Top-5-Mods eine eigene, distinkte Farbe zuweisen.
3. THE Key_Colorizer SHALL Tasten mit Bindings von Mods außerhalb der Top 5 in der Farbe „Sonstige Mods" einfärben.
4. THE Key_Colorizer SHALL unbelegte Tasten (`IK_None` oder kein Binding) in der neutralen Hintergrundfarbe darstellen.
5. WHEN eine Taste Bindings aus mehreren Quellen hat (Vanilla + Mod oder mehrere Mods), THE Key_Colorizer SHALL die Taste in der Konflikt-Farbe (Amber/Rot) einfärben.
6. THE Keymapper SHALL eine Legende anzeigen, die jeder verwendeten Farbe die zugehörige Quelle (Vanilla, Mod-Name, Sonstige, Unbelegt) zuordnet.
7. THE Key_Colorizer SHALL die Farbzuweisung der Top-5-Mods konsistent halten, solange sich die Scan-Daten nicht ändern.
8. FOR ALL Tasten: Die Farbe einer Taste SHALL ausschließlich durch die Binding-Quellen der aktuellen Scan-Daten bestimmt werden (keine persistente Farbzuweisung über Sessions hinweg).

---

### Requirement 5: Kollisionsanzeige auf dem Schema

**User Story:** Als Nutzer möchte ich Konflikte direkt auf dem Geräteschema sehen, damit ich sofort erkenne, welche physischen Tasten betroffen sind.

#### Acceptance Criteria

1. WHEN ein Konflikt mit Severity `"high"` vorliegt, THE SVG_Renderer SHALL die betroffene Taste rot und pulsierend markieren.
2. WHEN ein Konflikt mit Severity `"medium"` vorliegt, THE SVG_Renderer SHALL die betroffene Taste amber-farbig und pulsierend markieren.
3. THE Keymapper SHALL ein Sidebar-Panel bereitstellen, das alle Konflikte mit Sektion, betroffenen Commands und den Mod-Quellen der kollidierenden Bindings auflistet.
4. THE Conflict_Scanner SHALL für jeden Konflikt die Binding-Quellen (Vanilla oder Mod-Name) der beteiligten Commands zurückgeben.
5. WHEN der Nutzer auf eine konfliktbehaftete Taste im SVG klickt, THE Popover_Controller SHALL den Konflikt-Eintrag im Sidebar-Panel hervorheben.
6. THE Keymapper SHALL Konflikte im Sidebar-Panel nach Severity absteigend sortieren (`"high"` vor `"medium"`).
7. IF keine Konflikte vorhanden sind, THEN THE Keymapper SHALL im Sidebar-Panel eine entsprechende Meldung anzeigen.

---

### Requirement 6: Tasten-Interaktion (Popover, Hover, Keyboard)

**User Story:** Als Nutzer möchte ich durch Klick oder Hover auf eine Taste Details zu ihrer Belegung sehen und direkt Änderungen vornehmen können, damit ich nicht in einer separaten Liste suchen muss.

#### Acceptance Criteria

1. WHEN der Nutzer auf eine SVG-Taste klickt, THE Popover_Controller SHALL ein Popover mit den aktuellen Actions, der Binding-Quelle (Vanilla/Mod-Name) und vorhandenen Konflikten für diese Taste anzeigen.
2. THE Popover_Controller SHALL im Popover eine Schaltfläche „Ändern" bereitstellen, die den bestehenden Remap-Dialog für die betreffende Taste öffnet.
3. THE Popover_Controller SHALL im Popover eine Schaltfläche „Löschen" bereitstellen, die nach Bestätigung das Binding auf `IK_None` setzt und zuvor ein Backup erstellt.
4. WHEN der Nutzer mit der Maus über eine SVG-Taste fährt, THE SVG_Renderer SHALL einen Tooltip mit dem Action-Namen und der Binding-Quelle anzeigen.
5. THE SVG_Renderer SHALL jede interaktive SVG-Taste mit `tabindex="0"` versehen, sodass sie per Tastatur erreichbar ist.
6. WHEN eine SVG-Taste den Fokus hat und der Nutzer Enter oder Space drückt, THE Popover_Controller SHALL das Popover für diese Taste öffnen.
7. WHEN der Nutzer Escape drückt oder außerhalb des Popovers klickt, THE Popover_Controller SHALL das Popover schließen.
8. THE Popover_Controller SHALL sicherstellen, dass zu jedem Zeitpunkt höchstens ein Popover geöffnet ist.
9. THE SVG_Renderer SHALL für jede interaktive Taste ein `aria-label`-Attribut mit Tastenname und Binding-Zusammenfassung setzen.

---

### Requirement 7: Datei laden und speichern (Load/Save)

**User Story:** Als Nutzer möchte ich eine beliebige `input.settings`-Datei laden und das Ergebnis an einem selbst gewählten Ort speichern können, damit ich verschiedene Konfigurationen vergleichen und sicher bearbeiten kann.

#### Acceptance Criteria

1. THE Keymapper SHALL eine `/api/load`-Route (POST) bereitstellen, die eine hochgeladene `input.settings`-Datei für die aktuelle Session parst und zurückgibt, ohne den serverseitigen Standardpfad zu ändern.
2. THE Keymapper SHALL eine `/api/save`-Route (POST) bereitstellen, die die aktuellen Bindings in eine vom Client angegebene Zieldatei schreibt.
3. WHEN `/api/save` aufgerufen wird und die Zieldatei bereits existiert, THE Input_Settings_Parser SHALL vor dem Überschreiben automatisch ein Backup der Zieldatei erstellen.
4. THE Keymapper SHALL in der UI einen „Laden"-Button bereitstellen, der einen Datei-Picker für `*.settings`-Dateien öffnet.
5. THE Keymapper SHALL in der UI einen „Speichern"-Button bereitstellen, der einen Datei-Picker für den Zielort öffnet.
6. WHEN eine Datei erfolgreich geladen wurde, THE Toast_Manager SHALL eine Erfolgsmeldung mit dem Dateinamen anzeigen.
7. WHEN eine Datei erfolgreich gespeichert wurde, THE Toast_Manager SHALL eine Erfolgsmeldung mit Zieldatei und Backup-Pfad anzeigen.
8. IF beim Laden eine Datei kein gültiges `input.settings`-Format hat, THEN THE Input_Settings_Parser SHALL einen Fehler zurückgeben und THE Toast_Manager SHALL eine Fehlermeldung anzeigen.
9. WHILE eine Datei geladen oder gespeichert wird, THE Keymapper SHALL einen Lade-Indikator anzeigen.
10. THE Keymapper SHALL sicherstellen, dass eine per Load geladene Datei ausschließlich für die aktuelle Session gilt und nach einem Neuladen der Seite nicht mehr aktiv ist.

---

### Requirement 8: Hardware-Erkennung (`/api/devices`)

**User Story:** Als Nutzer möchte ich, dass das Tool mein angeschlossenes Eingabegerät automatisch erkennt und das passende Geräteprofil vorauswählt, damit ich nicht manuell das richtige Layout suchen muss.

#### Acceptance Criteria

1. THE Keymapper SHALL eine `/api/devices`-Route (GET) bereitstellen, die angeschlossene Eingabegeräte zurückgibt.
2. THE Device_Detector SHALL angeschlossene USB-HID-Geräte per PowerShell-PnP-Abfrage (`Get-PnpDevice`) ermitteln.
3. THE Device_Detector SHALL zusätzlich zur PnP-Abfrage die aktive Windows-Eingabesprache per `Get-WinUserLanguageList` ermitteln und als `inputLanguage`-Feld (z. B. `"de-DE"`) in der `/api/devices`-Antwort zurückgeben.
4. THE Device_Detector SHALL die erkannten Geräte auf Geräteprofile in der Device_Registry mappen, indem VID:PID-Schlüssel verglichen werden.
5. WHEN ein bekanntes Gerät erkannt wird (z. B. ROCCAT Vulcan 100 AIMO VID `1E7D`, PID `307A`), THE Keymapper SHALL das zugehörige Geräteprofil automatisch vorauswählen.
6. WHEN kein bekanntes VID:PID-Gerät erkannt wird UND die ermittelte Eingabesprache mit `de-` beginnt (z. B. `de-DE`, `de-AT`, `de-CH`), THE Device_Detector SHALL das Fallback-Profil `iso-de-105` (Full-Size) bevorzugen.
7. WHEN kein bekanntes VID:PID-Gerät erkannt wird UND die ermittelte Eingabesprache nicht mit `de-` beginnt oder keine Sprache ermittelt werden kann, THE Device_Detector SHALL das Fallback-Profil `ansi-us-104` verwenden.
8. IF kein VID:PID-Treffer vorliegt und keine Eingabesprache ermittelt werden kann, THEN THE Keymapper SHALL in der UI ein Layout-Auswahl-Dropdown (ISO-DE / ANSI-US) anzeigen, damit der Nutzer das Tastaturlayout manuell wählen kann.
9. IF die PowerShell-Abfrage fehlschlägt oder nicht verfügbar ist, THEN THE Device_Detector SHALL einen leeren Geräte-Array zurückgeben und THE Toast_Manager SHALL eine nicht-blockierende Hinweismeldung anzeigen.
10. THE Device_Detector SHALL ausschließlich auf Windows ausgeführt werden; auf anderen Betriebssystemen SHALL THE Device_Detector einen leeren Array zurückgeben.

---

### Requirement 9: Witcher-3-Design und UX

**User Story:** Als Nutzer möchte ich eine Oberfläche im Witcher-3-Stil mit klarer UX, damit das Tool zum Spielkontext passt und angenehm zu bedienen ist.

#### Acceptance Criteria

1. THE Keymapper SHALL die bestehenden CSS-Variablen (`--bg`, `--panel`, `--accent`, `--danger`, `--ok` etc.) beibehalten und um neue Variablen für Witcher-3-spezifische Stile erweitern.
2. THE Keymapper SHALL ornamentale Trennelemente (SVG oder CSS) zwischen Hauptbereichen verwenden.
3. THE Keymapper SHALL für Überschriften gesperrten Letter-Spacing (`letter-spacing: 0.08em` oder mehr) verwenden.
4. THE Keymapper SHALL einen subtilen Textur-/Rauscheffekt im Hintergrund darstellen (CSS oder SVG-Filter, kein externes Bild).
5. THE SVG_Renderer SHALL SVG-Tasten mit einem inneren Glow-Effekt darstellen, der die Binding-Farbe widerspiegelt.
6. THE Toast_Manager SHALL alle Statusmeldungen als nicht-blockierende Toasts anzeigen; `alert()` und `confirm()` SHALL nicht verwendet werden.
7. WHILE eine asynchrone Operation (Laden, Speichern, Scan) läuft, THE Keymapper SHALL einen sichtbaren Lade-Indikator anzeigen.
8. THE Keymapper SHALL für alle interaktiven Elemente sichtbare Fokus-Ringe bereitstellen, die den WCAG-2.1-Anforderungen für Fokus-Sichtbarkeit entsprechen.
9. THE Keymapper SHALL für alle Text-Hintergrund-Kombinationen ein Kontrastverhältnis von mindestens 4,5:1 einhalten.
10. THE Keymapper SHALL für alle interaktiven SVG-Elemente und Schaltflächen `aria-label`-Attribute setzen.
11. THE Keymapper SHALL Progressive Disclosure anwenden: Detailinformationen (Popover, Konflikt-Details) werden erst auf Nutzeranfrage angezeigt.

---

### Requirement 10: Integration bestehender Funktionalität

**User Story:** Als Nutzer möchte ich alle bisherigen Funktionen (Mappings-Liste, Filter, Konflikt-Liste, Remap-Dialog) weiterhin nutzen können, damit ich durch das neue UI keine Funktionalität verliere.

#### Acceptance Criteria

1. THE Keymapper SHALL die bestehende Mappings-Liste mit Suche, Quellen-Filter und Geräte-Filter im neuen UI beibehalten.
2. THE Keymapper SHALL die bestehende Konflikt-Liste im neuen UI beibehalten und mit der SVG-Konfliktanzeige verknüpfen.
3. THE Keymapper SHALL den bestehenden Remap-Dialog unverändert beibehalten und sowohl aus der Mappings-Liste als auch aus dem Tasten-Popover aufrufbar machen.
4. THE Keymapper SHALL die bestehende `/api/scan`-Route (GET) und `/api/remap`-Route (POST) unverändert beibehalten.
5. WHEN der Nutzer ein Remap über den Remap-Dialog abschließt, THE Keymapper SHALL die SVG-Ansicht und die Mappings-Liste automatisch aktualisieren.
6. THE Keymapper SHALL die Statistik-Anzeige (Bindings, Aktionen, Befehle, Sektionen, Tasten, Mod-Actions) im neuen UI beibehalten.

---

### Requirement 11: Input-Settings-Parser (Korrektheitseigenschaften)

**User Story:** Als Entwickler möchte ich sicherstellen, dass der Parser für `input.settings`-Dateien korrekt und robust ist, damit keine Daten verloren gehen oder verfälscht werden.

#### Acceptance Criteria

1. FOR ALL validen `input.settings`-Dateien: Das Parsen und anschließende Serialisieren SHALL eine Datei erzeugen, die beim erneuten Parsen ein äquivalentes Eintrags-Array ergibt (Round-Trip-Eigenschaft).
2. FOR ALL Einträge: Der geparste `key`-Wert SHALL dem `IK_*`-Bezeichner in der Originaldatei entsprechen.
3. FOR ALL Einträge: Die `lineNumber` SHALL der tatsächlichen 1-basierten Zeilennummer in der Quelldatei entsprechen.
4. WHEN eine Datei mit UTF-16LE-BOM geparst wird, THE Input_Settings_Parser SHALL dieselben Einträge liefern wie beim Parsen der äquivalenten UTF-8-Datei ohne BOM.
5. IF eine Zeile kein gültiges Binding-Format hat, THEN THE Input_Settings_Parser SHALL die Zeile überspringen, ohne die übrigen Einträge zu beeinflussen.
6. FOR ALL Remap-Operationen: Die Anzahl der geänderten Zeilen SHALL der Anzahl der Bindings entsprechen, die den angegebenen Actions und dem optionalen `oldKey`-Filter entsprechen.

---

### Requirement 12: Backup-Logik (Korrektheitseigenschaften)

**User Story:** Als Nutzer möchte ich, dass vor jedem Schreibvorgang automatisch ein Backup erstellt wird, damit ich Änderungen jederzeit rückgängig machen kann.

#### Acceptance Criteria

1. WHEN ein Remap oder Save-Vorgang ausgeführt wird, THE Input_Settings_Parser SHALL vor dem Schreiben eine Backup-Datei mit dem Muster `<originalpfad>.<timestamp>.bak` erstellen.
2. THE Input_Settings_Parser SHALL sicherstellen, dass die Backup-Datei byte-identisch mit der Originaldatei vor dem Schreibvorgang ist.
3. IF das Erstellen der Backup-Datei fehlschlägt, THEN THE Input_Settings_Parser SHALL den Schreibvorgang abbrechen und einen Fehler zurückgeben.
4. FOR ALL Backup-Dateinamen: Der Timestamp-Teil SHALL dem ISO-8601-Format entsprechen (Sonderzeichen durch `-` ersetzt) und monoton steigend sein, sodass Backups lexikografisch sortierbar sind.
5. THE Input_Settings_Parser SHALL niemals zwei Backups mit identischem Timestamp-Suffix erstellen.

---

### Requirement 13: Konflikt-Erkennung (Korrektheitseigenschaften)

**User Story:** Als Entwickler möchte ich sicherstellen, dass der Konflikt-Scanner korrekt und vollständig arbeitet, damit keine Konflikte übersehen oder fälschlicherweise gemeldet werden.

#### Acceptance Criteria

1. FOR ALL Eintrags-Arrays: Ein Konflikt SHALL genau dann gemeldet werden, wenn mindestens zwei verschiedene Commands in derselben Sektion auf dieselbe Taste (nicht `IK_None`) gebunden sind.
2. FOR ALL Konflikte: Die `commands`-Liste SHALL alle und nur die Commands enthalten, die in der betreffenden Sektion auf die betreffende Taste gebunden sind.
3. THE Conflict_Scanner SHALL `IK_None`-Bindings bei der Konflikt-Erkennung ignorieren.
4. FOR ALL Konflikte: Die `severity` SHALL `"high"` sein, wenn `riskyKey` für die Taste und Commands `true` zurückgibt, andernfalls `"medium"`.
5. FOR ALL Konflikte: Die `sources`-Liste SHALL für jeden beteiligten Command die Binding-Quelle (Vanilla oder Mod-Name) enthalten.
6. FOR ALL Eintrags-Arrays: Das Hinzufügen eines Eintrags mit `IK_None` SHALL die Anzahl der gemeldeten Konflikte nicht verändern.
7. FOR ALL Eintrags-Arrays: Das Entfernen aller Bindings einer Taste in einer Sektion auf einen einzigen Command SHALL den Konflikt für diese Taste/Sektion-Kombination auflösen.

