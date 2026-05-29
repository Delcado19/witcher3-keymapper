# AGENTS.md — Einstiegspunkt für KI-Tools (Claude, Codex, u.a.)

> Gemeinsamer Orientierungspunkt für alle KI-Tools in diesem Repo. **Erst lesen, dann arbeiten.**
> Diese Datei ist committet (Projekt-Doku). Das private Handoff-Log (`AI_JOURNAL.md`),
> `CLAUDE.md` und `.claude/` sind lokal & gitignored (via `.git/info/exclude`).

## 0. Sofort-Orientierung (nicht das ganze Repo scannen!)

1. **Aktueller Stand:** `AI_JOURNAL.md` (Root, lokal) — oben der auto-generierte Arbeitsstand (Stop-Hook), darunter das kuratierte Handoff-Log (neueste zuerst). Dort steht, woran zuletzt gearbeitet wurde und was als Nächstes ansteht.
2. **Struktur & Befehle:** siehe unten (Abschnitte 1–2).
3. **Setup/Workflow-Fakten:** Claude-Memory unter `~/.claude/projects/C--Users-Delcado-Documents-Software-Projects-witcher3-keymapper/memory/` (Index: `MEMORY.md`).

## 1. Projekt & Struktur

Kleines, lokales Web-Tool zum Inspizieren und Bearbeiten von Witcher 3 `input.settings`-Dateien (Tastenbelegung + Konflikt-Scanner).

- `server.js` — Node-HTTP-Server: Datei-Parser, Konflikt-Scanner, Backup-Logik, Remap-API.
- `public/index.html` — Browser-UI-Shell.
- `public/app.js` — Client-seitiges Scan-Rendering, Filter, Konflikt-Anzeige, Remap-Dialog.
- `public/styles.css` — UI-Styling.
- `input.settings` — **lokale** Arbeitskopie der Witcher-3-Keybinding-Datei. **Nutzerdaten, kein Quellcode** → gitignored, ebenso die Backups (`input.settings.<timestamp>.bak`).

## 2. Befehle

- `npm start` — startet die App unter `http://127.0.0.1:5177`.
- `node --check server.js` — prüft Server-seitige JS-Syntax.
- `node --check public/app.js` — prüft Client-seitige JS-Syntax.

Kein Build-Step, keine Dependency-Installation nötig. Bei Parser-/Remap-Änderungen zusätzlich App starten und `/api/scan` gegen die echten lokalen Dateien aufrufen. **Nie** destruktive Edits gegen die Live-Witcher-3-Datei ohne vorheriges Backup testen.

### Coding-Style
Plain CommonJS in `server.js`, plain Browser-JS in `public/app.js`. Dependency-frei halten, außer eine Dependency entfernt echte Komplexität. 2-Space-Indent, `const` als Default (`let` nur bei Reassignment), beschreibende camelCase-Namen. Parser-/Schreib-Verhalten explizit halten; keine cleveren String-Rewrites rund um `input.settings`.

## 3. Git-Kontext

- **Eigenständiges, lokales Repo** — kein Fork, kein konfigurierter Upstream/Remote. Keine Push-Restriktionen.
- Kurze, imperative Commit-Messages, z.B. `Add conflict scanner filters`, `Fix UTF-16 input XML parsing`, `Backup input.settings before remap`.
- Branch-Konvention (falls Branches genutzt werden): `fix/<kurz>` bzw. `feat/<kurz>`.
- Falls später ein Remote ergänzt wird: diesen Abschnitt aktualisieren.

## 4. Doku-Protokoll — bei JEDER Code-Änderung einhalten

Ziel: jede Änderung ist im Code *und* im Handoff-Log nachvollziehbar; jedes KI-Tool findet sich nach einer Unterbrechung sofort zurecht.

1. **In-Code-Kommentar mit Kontext-Bezug:** Bei nicht-offensichtlichem Verhalten, Kompat-Guards (z.B. UTF-16/BOM-Encoding), Fallbacks, Migrationen, öffentlichen Verträgen und issue-/quellengetriebenen Fixes einen knappen Kommentar setzen — *warum* der Code existiert. Keine Noise-Kommentare. (Entspricht der globalen AI-Coding-Policy.)
2. **Handoff-Log fortschreiben:** In `AI_JOURNAL.md` unter „Kuratiertes Log" einen Eintrag oben ergänzen: Datum · Tool · was geändert · Dateien · Begründung · **offene Threads / nächste Schritte**.
3. **Externe Doku syncen:** README/CHANGELOG/Tests — wo relevant. Engine dafür: **`docs-sync`-Agent** (gleicht den `git diff` gegen Doku/Kommentare ab). Vor Commits/PRs aufrufen.
4. **Memory:** Nicht-offensichtliche, dauerhafte Fakten in die Claude-Memory (siehe oben), nicht ins Journal duplizieren.

### Automatik
Ein **Stop-Hook** (`.claude/settings.local.json` → `.claude/journal-update.ps1`) aktualisiert nach jedem Turn **deterministisch** den AUTO-Block in `AI_JOURNAL.md` (Branch + Diff-Stat). Das ist nur ein Stand-Schnappschuss — die *inhaltliche* Doku (Punkte 1–4) bleibt Aufgabe des arbeitenden Tools.

## 5. Sicherheit & Konfiguration

Tool ist nur für lokalen Gebrauch. Server an `127.0.0.1` gebunden lassen. Automatische Backups vor jedem Schreiben in `input.settings` erhalten; klar zwischen Projekt-Kopie und Live-Spieldatei unterscheiden.
