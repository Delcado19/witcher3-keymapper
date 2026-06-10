let scan = null;
let activeCommand = null;
let currentContent = "";

// DOM lookups are guarded so this module can be required under Node for unit/
// property tests of the pure helpers (matchDevice, colorizer); in the browser
// it behaves exactly as before.
const els = (typeof document !== "undefined") ? {
  paths: document.querySelector("#paths"),
  stats: document.querySelector("#stats"),
  search: document.querySelector("#search"),
  sourceFilter: document.querySelector("#sourceFilter"),
  deviceFilter: document.querySelector("#deviceFilter"),
  commands: document.querySelector("#commands"),
  conflicts: document.querySelector("#conflicts"),
  conflictCount: document.querySelector("#conflictCount"),
  resultCount: document.querySelector("#resultCount"),
  refresh: document.querySelector("#refresh"),
  languageSelect: document.querySelector("#languageSelect"),
  languageLabel: document.querySelector("#languageLabel"),
  loadFile: document.querySelector("#loadFile"),
  saveFile: document.querySelector("#saveFile"),
  loadInput: document.querySelector("#loadInput"),
  saveDialog: document.querySelector("#saveDialog"),
  saveForm: document.querySelector("#saveForm"),
  savePath: document.querySelector("#savePath"),
  saveText: document.querySelector("#saveText"),
  dialog: document.querySelector("#remapDialog"),
  remapTitle: document.querySelector("#remapTitle"),
  remapText: document.querySelector("#remapText"),
  newKey: document.querySelector("#newKey"),
  remapForm: document.querySelector("#remapForm"),
  deviceTabs: document.querySelector("#deviceTabs"),
  deviceSvg: document.querySelector("#deviceSvg"),
  deviceEmpty: document.querySelector("#deviceEmpty"),
  legend: document.querySelector("#legend"),
  layoutSelect: document.querySelector("#layoutSelect"),
  layoutSelectWrap: document.querySelector("#layoutSelectWrap"),
  layoutMode: document.querySelector("#layoutMode"),
  loadingBar: document.querySelector("#loadingBar")
} : {};

const I18N = {
  en: {
    language: "Language",
    load: "Load",
    save: "Save",
    reloadTop: "Reload",
    reloadBottom: "",
    reloadTitle: "Reload project input.settings from disk",
    chooseDevice: "Choose input device",
    keyboard: "Keyboard",
    controllers: "Mouse/Gamepad",
    mouse: "Mouse",
    gamepad: "Gamepad",
    layout: "Layout",
    chooseLayout: "Choose layout...",
    colorLegend: "Color legend",
    searchPlaceholder: "Search action, key, mod, or context",
    allSources: "All sources",
    allInputs: "All inputs",
    unbound: "Unbound",
    conflicts: "Conflicts",
    mappings: "Mappings",
    changeMapping: "Change mapping",
    newKey: "New key in Witcher format",
    newKeyPlaceholder: "e.g. IK_NumPad3",
    cancel: "Cancel",
    createBackupApply: "Create backup & apply",
    saveInputSettings: "Save input.settings",
    saveHelp: "Enter a target path. Existing files are backed up server-side.",
    targetPath: "Target path",
    targetPathPlaceholder: "C:\\Path\\to\\input.settings",
    createBackupSave: "Create backup & save",
    bindings: "Bindings",
    actions: "Actions",
    commands: "Commands",
    sections: "Sections",
    keys: "Keys",
    modActions: "Mod actions",
    syntax: "Syntax",
    syntaxError: "Error",
    results: "{count} results",
    noConflicts: "No conflicts found.",
    critical: "Critical",
    context: "Context",
    more: "more",
    inContexts: "in {count} gameplay contexts",
    sessionFile: "Session file: {name}",
    mods: "Mods",
    vanilla: "Vanilla",
    hardwareUnavailable: "Hardware detection unavailable",
    projectLabel: "Project input.settings",
    change: "Change",
    clear: "Clear",
    confirmClear: "Confirm clear",
    conflictIn: "Conflict in:",
    noKeyboardLayout: "No keyboard layout detected. Choose a layout.",
    noBindingsFor: "No bindings found for {device}.",
    profileLoadFailed: "Device profile could not be loaded.",
    noContent: "No file content loaded to save.",
    saveLoadedSession: "Saves the loaded session file \"{name}\".",
    saveProject: "Saves the current project input.settings content.",
    saveFailed: "Save failed",
    saved: "Saved: {path}",
    loaded: "Loaded: {name}",
    fileLoadFailed: "File could not be loaded",
    rescanFailed: "Could not rescan session remap",
    sessionChanged: "Session changed: {count} lines",
    sessionRemapFailed: "Session remap failed",
    remapFailed: "Remap failed",
    changedLines: "Changed {count} lines",
    backup: "Backup: {path}",
    syntaxOk: "{label}: syntax OK",
    syntaxErrorAt: "{label}: syntax error at {where} ({message})",
    line: "line {line}",
    file: "file",
    invalidSettings: "invalid input.settings",
    changeTitle: "Change {id}",
    changeText: "Changes all bindings for actions: {actions}",
    hold: "hold",
    clearFailed: "Clear failed",
    clearedBindings: "Cleared {count} binding(s)",
    svgFailed: "SVG generation failed: {message}",
    keyUnbound: "{label}: unbound",
    otherMods: "Other mods",
    conflict: "Conflict",
    vanillaMovement: "Vanilla: Movement",
    vanillaAction: "Vanilla: Combat/Actions",
    vanillaMenu: "Vanilla: Menus",
    error: "Error",
    needValidRemap: "Need at least one action and a valid IK_* target key.",
    noMatchingBindings: "No matching bindings were changed.",
    utf16beUnsupported: "UTF-16BE input.settings is not supported."
  },
  de: {
    language: "Sprache",
    load: "Laden",
    save: "Speichern",
    reloadTop: "Aktualisieren",
    reloadBottom: "",
    reloadTitle: "Projekt-input.settings neu von der Festplatte laden",
    chooseDevice: "Eingabegerät wählen",
    keyboard: "Tastatur",
    controllers: "Maus/Gamepad",
    mouse: "Maus",
    gamepad: "Gamepad",
    layout: "Layout",
    chooseLayout: "Layout wählen...",
    colorLegend: "Farblegende",
    searchPlaceholder: "Aktion, Taste, Mod oder Kontext suchen",
    allSources: "Alle Quellen",
    allInputs: "Alle Eingaben",
    unbound: "Unbelegt",
    conflicts: "Konflikte",
    mappings: "Belegungen",
    changeMapping: "Belegung ändern",
    newKey: "Neue Taste im Witcher-Format",
    newKeyPlaceholder: "z. B. IK_NumPad3",
    cancel: "Abbrechen",
    createBackupApply: "Backup erstellen & anwenden",
    saveInputSettings: "input.settings speichern",
    saveHelp: "Zielpfad eingeben. Bestehende Dateien werden serverseitig gesichert.",
    targetPath: "Zielpfad",
    targetPathPlaceholder: "C:\\Pfad\\zu\\input.settings",
    createBackupSave: "Backup erstellen & speichern",
    bindings: "Bindungen",
    actions: "Aktionen",
    commands: "Befehle",
    sections: "Sektionen",
    keys: "Tasten",
    modActions: "Mod-Aktionen",
    syntax: "Syntax",
    syntaxError: "Fehler",
    results: "{count} Treffer",
    noConflicts: "Keine Konflikte gefunden.",
    critical: "Kritisch",
    context: "Kontext",
    more: "weitere",
    inContexts: "in {count} Spielkontexten",
    sessionFile: "Session-Datei: {name}",
    mods: "Mods",
    vanilla: "Spiel",
    hardwareUnavailable: "Hardware-Erkennung nicht verfügbar",
    projectLabel: "Projekt-input.settings",
    change: "Ändern",
    clear: "Löschen",
    confirmClear: "Löschen bestätigen",
    conflictIn: "Konflikt in:",
    noKeyboardLayout: "Kein Tastaturlayout erkannt. Layout wählen.",
    noBindingsFor: "Keine Belegungen für {device} gefunden.",
    profileLoadFailed: "Geräteprofil konnte nicht geladen werden.",
    noContent: "Kein Dateiinhalt zum Speichern geladen.",
    saveLoadedSession: "Speichert die geladene Session-Datei \"{name}\".",
    saveProject: "Speichert den aktuellen Projekt-input.settings-Inhalt.",
    saveFailed: "Speichern fehlgeschlagen",
    saved: "Gespeichert: {path}",
    loaded: "Geladen: {name}",
    fileLoadFailed: "Datei konnte nicht geladen werden",
    rescanFailed: "Session-Remap konnte nicht neu gescannt werden",
    sessionChanged: "Session geändert: {count} Zeilen",
    sessionRemapFailed: "Session-Remap fehlgeschlagen",
    remapFailed: "Remap fehlgeschlagen",
    changedLines: "{count} Zeilen geändert",
    backup: "Backup: {path}",
    syntaxOk: "{label}: Syntax OK",
    syntaxErrorAt: "{label}: Syntaxfehler bei {where} ({message})",
    line: "Zeile {line}",
    file: "Datei",
    invalidSettings: "ungültige input.settings",
    changeTitle: "{id} ändern",
    changeText: "Ändert alle Belegungen für Aktionen: {actions}",
    hold: "halten",
    clearFailed: "Löschen fehlgeschlagen",
    clearedBindings: "{count} Bindung(en) gelöscht",
    svgFailed: "SVG-Erzeugung fehlgeschlagen: {message}",
    keyUnbound: "{label}: unbelegt",
    otherMods: "Sonstige Mods",
    conflict: "Konflikt",
    vanillaMovement: "Spiel: Bewegung",
    vanillaAction: "Spiel: Kampf/Aktionen",
    vanillaMenu: "Spiel: Menüs",
    error: "Fehler",
    needValidRemap: "Mindestens eine Aktion und eine gültige IK_*-Zieltaste sind nötig.",
    noMatchingBindings: "Keine passenden Bindungen wurden geändert.",
    utf16beUnsupported: "UTF-16BE input.settings wird nicht unterstützt."
  }
};

function detectBrowserLanguage() {
  const lang = (typeof navigator !== "undefined" && (navigator.languages?.[0] || navigator.language)) || "";
  return lang.toLowerCase().startsWith("de") ? "de" : "en";
}

function getLanguageChoice() {
  if (typeof localStorage === "undefined") return "auto";
  return localStorage.getItem("witcher3-keymapper:language") || "auto";
}

function currentLanguage() {
  const choice = getLanguageChoice();
  return choice === "de" || choice === "en" ? choice : detectBrowserLanguage();
}

function t(key, params = {}) {
  const dict = I18N[currentLanguage()] || I18N.en;
  const template = Object.prototype.hasOwnProperty.call(dict, key)
    ? dict[key]
    : Object.prototype.hasOwnProperty.call(I18N.en, key) ? I18N.en[key] : key;
  return template.replace(/\{(\w+)}/g, (_, name) => String(params[name] ?? ""));
}

function languageQuery() {
  return `?lang=${encodeURIComponent(currentLanguage())}`;
}

function applyStaticTexts() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = currentLanguage();
  if (els.languageLabel) els.languageLabel.textContent = t("language");
  if (els.languageSelect) els.languageSelect.value = getLanguageChoice();
  els.languageSelect?.setAttribute("aria-label", t("language"));
  els.loadFile && (els.loadFile.textContent = t("load"));
  els.saveFile && (els.saveFile.textContent = t("save"));
  if (els.refresh) {
    els.refresh.title = t("reloadTitle");
    const bottom = t("reloadBottom");
    els.refresh.innerHTML = bottom
      ? `<span>${escapeHtml(t("reloadTop"))}</span><span>${escapeHtml(bottom)}</span>`
      : `<span>${escapeHtml(t("reloadTop"))}</span>`;
  }
  els.deviceTabs?.setAttribute("aria-label", t("chooseDevice"));
  els.deviceTabs?.querySelector('[data-device="keyboard"]') && (els.deviceTabs.querySelector('[data-device="keyboard"]').textContent = t("keyboard"));
  els.deviceTabs?.querySelector('[data-device="controllers"]') && (els.deviceTabs.querySelector('[data-device="controllers"]').textContent = t("controllers"));
  const layoutLabel = els.layoutSelectWrap?.querySelector("span");
  if (layoutLabel) layoutLabel.textContent = t("layout");
  els.layoutSelect?.setAttribute("aria-label", t("chooseLayout"));
  const emptyLayout = els.layoutSelect?.querySelector('option[value=""]');
  if (emptyLayout) emptyLayout.textContent = t("chooseLayout");
  els.layoutMode && (els.layoutMode.textContent = t("layout"));
  els.legend?.setAttribute("aria-label", t("colorLegend"));
  els.search?.setAttribute("placeholder", t("searchPlaceholder"));
  const deviceOptions = els.deviceFilter?.querySelectorAll("option");
  if (deviceOptions?.length) {
    deviceOptions[0].textContent = t("allInputs");
    deviceOptions[1].textContent = t("keyboard");
    deviceOptions[2].textContent = t("mouse");
    deviceOptions[3].textContent = t("gamepad");
    deviceOptions[4].textContent = t("unbound");
  }
  const panelHeads = document.querySelectorAll(".compact-panel .panelHead h2");
  if (panelHeads[0] && !scan) panelHeads[0].textContent = t("conflicts");
  if (panelHeads[1]) panelHeads[1].textContent = t("mappings");
  els.remapTitle && (els.remapTitle.textContent = t("changeMapping"));
  const remapLabel = els.dialog?.querySelector("label");
  if (remapLabel?.firstChild) remapLabel.firstChild.textContent = `${t("newKey")} `;
  if (els.newKey) els.newKey.placeholder = t("newKeyPlaceholder");
  const dialogButtons = els.dialog?.querySelectorAll("button");
  if (dialogButtons?.length) {
    dialogButtons[0].textContent = t("cancel");
    dialogButtons[1].textContent = t("createBackupApply");
  }
  const saveTitle = els.saveDialog?.querySelector("h2");
  if (saveTitle) saveTitle.textContent = t("saveInputSettings");
  if (els.saveText && !els.saveDialog?.open) els.saveText.textContent = t("saveHelp");
  const saveLabel = els.saveDialog?.querySelector("label");
  if (saveLabel?.firstChild) saveLabel.firstChild.textContent = `${t("targetPath")} `;
  if (els.savePath) els.savePath.placeholder = t("targetPathPlaceholder");
  const saveButtons = els.saveDialog?.querySelectorAll("button");
  if (saveButtons?.length) {
    saveButtons[0].textContent = t("cancel");
    saveButtons[1].textContent = t("createBackupSave");
  }
}

// Session state for the device-centric view (Tasks 11/12). Not persisted.
const state = {
  registry: [],
  devices: [],
  inputLanguage: null,
  activeDevice: "keyboard",
  keyboardProfileId: null,   // matched/chosen keyboard profile id
  showLayoutDropdown: false,
  profileCache: new Map(),   // id -> profile
  colorMap: new Map(),
  topMods: [],
  hasVanilla: false,
  hasOther: false,
  currentSvg: null,
  currentProfile: null,
  layoutMode: false,
  layoutDrag: null,
  sessionFile: null
};

async function load() {
  applyStaticTexts();
  showLoading(true);
  try {
    // Scan, hardware detection and the device registry load in parallel (design.md
    // "Datenfluss beim Seitenstart"). Devices/registry degrade gracefully.
    const [scanRes, devRes, registry] = await Promise.all([
      fetch(`/api/scan${languageQuery()}`),
      fetch("/api/devices").catch(() => null),
      state.registry.length ? Promise.resolve(state.registry) : loadRegistry().catch(() => [])
    ]);
    scan = await scanRes.json();
    if (!scanRes.ok) throw new Error(scan.error || "Scan failed");
    currentContent = scan.content || "";
    state.sessionFile = null;
    state.registry = Array.isArray(registry) ? registry : [];
    if (devRes && devRes.ok) {
      const dev = await devRes.json();
      state.devices = dev.devices || [];
      state.inputLanguage = dev.inputLanguage || null;
    } else if (devRes === null) {
      showToast(t("hardwareUnavailable"), "info");
    }
    resolveKeyboardProfile();
    render();
    await renderDeviceView();
    showSyntaxStatus(scan, t("projectLabel"));
  } finally {
    showLoading(false);
  }
}

// Pick the keyboard profile: an exact VID:PID hit on any detected device wins;
// otherwise fall back by input language; otherwise show the manual dropdown
// (Requirement 8.5–8.8). type is only a hint, so matchDevice keys on VID:PID.
function resolveKeyboardProfile() {
  let matched = null;
  for (const device of state.devices) {
    const hit = matchDevice(device.vid, device.pid, state.registry, null);
    if (hit && hit.type === "keyboard") { matched = hit; break; }
  }
  if (!matched) matched = matchDevice(null, null, state.registry, state.inputLanguage);
  if (matched) {
    state.keyboardProfileId = matched.id;
    state.showLayoutDropdown = false;
  } else {
    state.keyboardProfileId = null;
    state.showLayoutDropdown = true;
  }
}

function showLoading(on) {
  if (els.loadingBar) els.loadingBar.hidden = !on;
  if (typeof document !== "undefined") document.body.setAttribute("aria-busy", on ? "true" : "false");
}

function render() {
  const fileLabel = state.sessionFile
    ? t("sessionFile", { name: state.sessionFile.name })
    : scan.paths.inputSettings;
  els.paths.textContent = `${fileLabel} | ${t("mods")}: ${scan.paths.modsDir}`;
  els.stats.innerHTML = [
    [t("bindings"), scan.stats.bindings],
    [t("actions"), scan.stats.actions],
    [t("commands"), scan.stats.commands],
    [t("sections"), scan.stats.sections],
    [t("keys"), scan.stats.keys],
    [t("modActions"), scan.stats.modActions],
    [t("syntax"), scan.syntax?.valid ? "OK" : t("syntaxError")]
  ].map(([label, value]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join("");

  const currentSource = els.sourceFilter.value;
  const sources = [...new Set(scan.commands.map((item) => item.source))].sort();
  els.sourceFilter.innerHTML = `<option value="">${escapeHtml(t("allSources"))}</option>${sources.map((source) => {
    return `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`;
  }).join("")}`;
  els.sourceFilter.value = currentSource;

  renderConflicts();
  renderCommands();
}

// Witcher 3 repeats the same bindings across many context sections (Boat,
// Combat, Exploration, *_Replacer_Ciri …), so the per-section scanner reports
// the *same* logical conflict dozens of times. Group identical conflicts
// (same key + same command set) into one entry that lists the affected sections,
// instead of showing raw line numbers — much shorter and not "doppelt/dreifach".
function groupConflicts(conflicts) {
  const map = new Map();
  for (const c of conflicts) {
    // A conflict is "about" its non-vanilla command(s) overlapping a key. The set
    // of vanilla commands sharing that key varies by context section (Combat adds
    // LockAndGuard, *_Replacer_Ciri drops Focus, …), which used to fragment one
    // physical key overload into several rows keyed by the exact command set.
    // Group by key + the non-vanilla offender(s) so those context variants
    // collapse into one reviewable entry; merge in the vanilla companions seen in
    // any context so the row still lists everything sharing the key.
    const sources = c.sources || [];
    const offenders = c.commands.filter((_, i) => sources[i] !== "game/input.xml");
    const signatureCommands = offenders.length ? offenders : c.commands;
    const sig = `${c.key}|${[...signatureCommands].sort().join(",")}`;
    const existing = map.get(sig);
    if (!existing) {
      map.set(sig, {
        key: c.key, keyLabel: c.keyLabel,
        commands: [...c.commands], sources: [...sources],
        severity: c.severity, sections: [c.section]
      });
    } else {
      c.commands.forEach((cmd, i) => {
        if (!existing.commands.includes(cmd)) {
          existing.commands.push(cmd);
          existing.sources.push(sources[i] || "unknown");
        }
      });
      if (!existing.sections.includes(c.section)) existing.sections.push(c.section);
      if (c.severity === "high") existing.severity = "high";
    }
  }
  return [...map.values()].sort((a, b) =>
    (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1) ||
    b.sections.length - a.sections.length);
}

function renderConflicts() {
  const groups = groupConflicts(scan.conflicts);
  els.conflictCount.textContent = `${t("conflicts")} (${groups.length})`;
  if (!groups.length) {
    els.conflicts.innerHTML = `<div class="empty muted">${escapeHtml(t("noConflicts"))}</div>`;
    return;
  }
  // data-conflict-key lets the SVG popover scroll to & highlight the entry
  // (Requirement 5.5); sources[] shows vanilla vs. mod per command (Req 5.3).
  els.conflicts.innerHTML = groups.slice(0, 120).map((grp) => {
    const commandList = grp.commands.map((name, i) => {
      const src = grp.sources[i] || "unknown";
      return `<span class="compact-token" title="${escapeHtml(src)}">${escapeHtml(name)} <span>${escapeHtml(shortSource(src))}</span></span>`;
    }).join("");
    // Show how many gameplay contexts share this overload instead of listing the
    // cryptic section names (Boat, *_Replacer_Ciri, …), which read as separate
    // problems even though it is one physical key overload.
    const contextNote = grp.sections.length > 1 ? t("inContexts", { count: grp.sections.length }) : "";
    const severity = grp.severity === "high" ? t("critical") : t("context");
    return `
    <article class="conflict ${grp.severity}" data-conflict-key="${escapeHtml(grp.key)}" tabindex="0">
      <div class="compact-key">
        <strong>${escapeHtml(grp.keyLabel)}</strong>
        <span>${escapeHtml(severity)}</span>
      </div>
      <div class="compact-main">${commandList}</div>
      ${contextNote ? `<div class="compact-meta">${escapeHtml(contextNote)}</div>` : ""}
    </article>`;
  }).join("");
}

function shortSource(src) {
  return src === "game/input.xml" ? t("vanilla") : src;
}

function renderCommands() {
  const q = els.search.value.trim().toLowerCase();
  const source = els.sourceFilter.value;
  const device = els.deviceFilter.value;

  const filtered = scan.commands.filter((command) => {
    if (source && command.source !== source) return false;
    if (device && !command.keys.some((key) => key.device === device)) return false;
    if (!q) return true;
    const haystack = [
      command.id,
      command.displayName,
      command.source,
      command.actions.join(" "),
      command.keys.map((key) => `${key.key} ${key.label}`).join(" "),
      command.bindings.map((binding) => binding.section).join(" ")
    ].join(" ").toLowerCase();
    return haystack.includes(q);
  });

  els.resultCount.textContent = t("results", { count: filtered.length });
  els.commands.innerHTML = filtered.map((command) => {
    const keys = command.keys.length ? command.keys : [{ label: t("unbound"), device: "unbound", key: "IK_None" }];
    const title = commandTitleText(command);
    const sourceLine = commandSourceLine(command);
    const actions = commandActionsLine(command);
    return `
      <article class="command">
        <div class="compact-main">
          <div class="commandTitle">${escapeHtml(title)}</div>
          <span class="source">${escapeHtml(sourceLine)}</span>
          ${actions ? `<div class="compact-meta" title="${escapeHtml(command.actions.join(", "))}">${escapeHtml(actions)}</div>` : ""}
        </div>
        <div class="compact-keys">${keys.map((key) => keyChip(key)).join("")}</div>
        <button class="compact-action" data-remap="${escapeHtml(command.id)}">${escapeHtml(t("change"))}</button>
      </article>
    `;
  }).join("");

  document.querySelectorAll("[data-remap]").forEach((button) => {
    button.addEventListener("click", () => openRemap(button.dataset.remap));
  });
}

// A real, human-readable name exists when it is game-localized ("localized") or
// supplied by our curated map ("curated", Step 2.2). Humanized technical ids are
// suppressed in favour of the raw command id.
function hasResolvedName(command) {
  return command.displayNameSource === "localized" || command.displayNameSource === "curated";
}

function commandTitleText(command) {
  return hasResolvedName(command) && command.displayName ? command.displayName : command.id;
}

function commandSourceLine(command) {
  const source = shortSource(command.source);
  return hasResolvedName(command) && command.id !== command.displayName
    ? `${command.id} · ${source}`
    : source;
}

function commandActionsLine(command) {
  const actions = uniqueInformativeActions(command);
  if (!actions.length) return "";
  return actions.length > 2 ? `${actions.slice(0, 2).join(", ")} +${actions.length - 2}` : actions.join(", ");
}

function uniqueInformativeActions(command) {
  return [...new Set(command.actions || [])]
    .filter((action) => action && action !== command.id && action !== command.displayNameKey);
}

function keyChip(key) {
  const hold = key.state === "Duration" ? ` ${t("hold")} ${key.idleTime || ""}s` : "";
  return `<span class="chip ${key.device}" title="${escapeHtml(key.key || "")}">${escapeHtml(key.label)}${escapeHtml(hold)}</span>`;
}

function openRemap(commandId) {
  activeCommand = scan.commands.find((command) => command.id === commandId);
  if (!activeCommand) return;
  els.remapTitle.textContent = t("changeTitle", { id: activeCommand.id });
  els.remapText.textContent = t("changeText", { actions: activeCommand.actions.join(", ") });
  els.newKey.value = "";
  els.dialog.showModal();
}

if (typeof document !== "undefined") {
  els.remapForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (event.submitter?.value === "cancel") {
      els.dialog.close();
      return;
    }
    if (!activeCommand) return;
    if (state.sessionFile) {
      await remapSessionContent(activeCommand.actions, els.newKey.value);
      els.dialog.close();
      return;
    }
    const response = await fetch("/api/remap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actions: activeCommand.actions, newKey: els.newKey.value })
    });
    const result = await response.json();
    if (!response.ok) {
      // Toast instead of alert() (Task 8 / Requirement 9.6).
      showToast(result.error || t("remapFailed"), "error");
      return;
    }
    els.dialog.close();
    showToast(`${t("changedLines", { count: result.changed })} · ${t("backup", { path: result.backup })}`, "success");
    await load();
  });

  els.search.addEventListener("input", renderCommands);
  els.sourceFilter.addEventListener("change", renderCommands);
  els.deviceFilter.addEventListener("change", renderCommands);
  els.refresh.addEventListener("click", load);
  els.loadFile?.addEventListener("click", () => els.loadInput?.click());
  els.loadInput?.addEventListener("change", handleLoadFile);
  els.saveFile?.addEventListener("click", openSaveDialog);
  els.saveForm?.addEventListener("submit", handleSaveFile);
  els.languageSelect?.addEventListener("change", () => {
    localStorage.setItem("witcher3-keymapper:language", els.languageSelect.value);
    load().catch((error) => showToast(error.message || t("fileLoadFailed"), "error"));
  });

  // Device tabs: switch active device, keep choice for the session (no storage).
  els.deviceTabs?.addEventListener("click", (event) => {
    const tab = event.target.closest(".device-tab");
    if (!tab || tab.disabled) return;
    state.activeDevice = tab.dataset.device;
    closePopover();
    renderDeviceView();
  });

  // Manual layout choice when no device/language could pre-select one (Req 8.8).
  els.layoutSelect?.addEventListener("change", () => {
    const id = els.layoutSelect.value;
    if (!id) return;
    state.keyboardProfileId = id;
    state.showLayoutDropdown = false;
    state.activeDevice = "keyboard";
    renderDeviceView();
  });

  els.layoutMode?.addEventListener("click", () => {
    if (state.activeDevice === "keyboard") return;
    state.layoutMode = !state.layoutMode;
    closePopover();
    renderDeviceView();
  });
}

async function handleLoadFile() {
  const file = els.loadInput?.files?.[0];
  if (!file) return;
  showLoading(true);
  try {
    const buffer = await file.arrayBuffer();
    const content = decodeInputSettingsBuffer(buffer);
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`/api/load${languageQuery()}`, { method: "POST", body: form });
    const result = await response.json();
    if (!response.ok) {
      showToast(result.error || t("fileLoadFailed"), "error");
      return;
    }
    scan = result;
    currentContent = content;
    state.sessionFile = { name: file.name };
    resolveKeyboardProfile();
    render();
    await renderDeviceView();
    showSyntaxStatus(scan, file.name);
    showToast(t("loaded", { name: file.name }), "success");
  } catch (error) {
    showToast(error.message || t("fileLoadFailed"), "error");
  } finally {
    showLoading(false);
    if (els.loadInput) els.loadInput.value = "";
  }
}

function showSyntaxStatus(scanData, label) {
  const syntax = scanData?.syntax;
  if (!syntax) return;
  if (syntax.valid) {
    showToast(t("syntaxOk", { label }), "success");
    return;
  }
  const first = syntax.errors?.[0];
  const where = first?.lineNumber ? t("line", { line: first.lineNumber }) : t("file");
  showToast(t("syntaxErrorAt", { label, where, message: first?.message || t("invalidSettings") }), "error");
}

function decodeInputSettingsBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    throw new Error(t("utf16beUnsupported"));
  }
  return new TextDecoder("utf-8").decode(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
    ? bytes.subarray(3)
    : bytes);
}

function openSaveDialog() {
  if (!currentContent) {
    showToast(t("noContent"), "error");
    return;
  }
  if (els.saveText) {
    els.saveText.textContent = state.sessionFile
      ? t("saveLoadedSession", { name: state.sessionFile.name })
      : t("saveProject");
  }
  els.savePath.value = state.sessionFile?.name || scan?.paths?.inputSettings || "input.settings";
  els.saveDialog.showModal();
}

async function handleSaveFile(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    els.saveDialog.close();
    return;
  }
  const targetPath = els.savePath.value.trim();
  if (!targetPath) return;
  showLoading(true);
  try {
    const response = await fetch("/api/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetPath, content: currentContent, sort: true })
    });
    const result = await response.json();
    if (!response.ok) {
      showToast(result.error || t("saveFailed"), "error");
      return;
    }
    els.saveDialog.close();
    const backup = result.backup ? ` · ${t("backup", { path: result.backup })}` : "";
    showToast(`${t("saved", { path: result.saved })}${backup}`, "success");
  } finally {
    showLoading(false);
  }
}

async function remapSessionContent(actions, newKey, oldKey = "", sections = null) {
  showLoading(true);
  try {
    const result = remapInputSettingsText(currentContent, actions, newKey, oldKey, sections);
    const form = new FormData();
    form.append("file", new Blob([result.content], { type: "text/plain" }), state.sessionFile?.name || "input.settings");
    const response = await fetch(`/api/load${languageQuery()}`, { method: "POST", body: form });
    const nextScan = await response.json();
    if (!response.ok) {
      showToast(nextScan.error || t("rescanFailed"), "error");
      return;
    }
    currentContent = result.content;
    scan = nextScan;
    render();
    await renderDeviceView();
    showToast(t("sessionChanged", { count: result.changed }), "success");
  } catch (error) {
    showToast(error.message || t("sessionRemapFailed"), "error");
  } finally {
    showLoading(false);
  }
}

// Client-side remap mirrors the server's line-oriented contract for uploaded
// session files. /api/remap intentionally stays bound to the local project file,
// so uploads need this guard to avoid writing the wrong input.settings.
function remapInputSettingsText(text, actions, newKey, oldKey = "", sections = null) {
  const actionSet = new Set(Array.isArray(actions) ? actions.filter(Boolean) : []);
  const targetKey = String(newKey || "").trim();
  const old = String(oldKey || "").trim();
  const sectionSet = Array.isArray(sections) ? new Set(sections) : null;
  if (!actionSet.size || !/^IK_[A-Za-z0-9_]+$/.test(targetKey)) {
    throw new Error(t("needValidRemap"));
  }

  let currentSection = "";
  let changed = 0;
  const lines = String(text || "").split(/\r?\n/);
  const next = lines.map((line) => {
    const trimmed = line.trim();
    const sectionMatch = trimmed.match(/^\[(.+)]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      return line;
    }
    const bindingMatch = trimmed.match(/^(IK_[^=]+)=\((.+)\)$/);
    if (!bindingMatch) return line;
    const actionMatch = bindingMatch[2].match(/Action=([^,\)]+)/);
    if (!actionMatch || !actionSet.has(actionMatch[1])) return line;
    if (old && bindingMatch[1] !== old) return line;
    if (sectionSet && !sectionSet.has(currentSection)) return line;
    changed += 1;
    return line.replace(/^(\s*)IK_[^=]+=/, `$1${targetKey}=`);
  });
  if (!changed) throw new Error(t("noMatchingBindings"));
  return { content: next.join("\n"), changed };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

/* =====================================================================
 * Device-centric UI — Wave 9–14 integration (Tasks 9,10,11,12,14).
 * Wires the building blocks into the page: tabs, hardware pre-selection,
 * colouring, conflicts, key popovers and conflict-sidebar linking.
 * ===================================================================== */

function deviceLabel(device) {
  if (device === "keyboard") return t("keyboard");
  if (device === "controllers") return t("controllers");
  return device === "mouse" ? t("mouse") : t("gamepad");
}

function deviceHasBindings(device) {
  if (device === "controllers") return deviceHasBindings("mouse") || deviceHasBindings("gamepad");
  return scan.commands.some((c) => c.keys.some((k) => k.device === device && k.key !== "IK_None"));
}

function activeProfileId() {
  if (state.activeDevice === "mouse") return "mouse-5btn";
  if (state.activeDevice === "gamepad") return "xbox-ctrl";
  return state.keyboardProfileId;
}

function activeProfileIds() {
  if (state.activeDevice === "controllers") return ["mouse-5btn", "xbox-ctrl"];
  return [activeProfileId()].filter(Boolean);
}

async function getProfile(id) {
  if (!id) return null;
  if (state.profileCache.has(id)) return applyLayoutOverrides(state.profileCache.get(id));
  const profile = await loadProfile(id);
  if (profile) state.profileCache.set(id, profile);
  return profile ? applyLayoutOverrides(profile) : null;
}

// Colour map + legend flags are derived once per scan and reused across tab
// switches (Requirement 4.7/4.8 determinism).
function rebuildColorMap() {
  state.colorMap = buildColorMap(scan.commands, scan.conflicts);
  state.topMods = computeTopMods(scan.commands);
  state.hasVanilla = scan.commands.some((c) => c.source === "game/input.xml");
  const top5 = new Set(state.topMods.map((m) => m.source));
  state.hasOther = scan.commands.some((c) => c.source !== "game/input.xml" && !top5.has(c.source));
}

async function renderDeviceView() {
  if (!els.deviceSvg) return;
  rebuildColorMap();
  updateTabState();

  const isKeyboard = state.activeDevice === "keyboard";
  els.layoutSelectWrap?.classList.toggle("hidden", !(isKeyboard && state.showLayoutDropdown));
  els.layoutMode?.classList.toggle("hidden", isKeyboard);
  els.layoutMode?.classList.toggle("is-active", state.layoutMode && !isKeyboard);
  els.layoutMode?.setAttribute("aria-pressed", String(state.layoutMode && !isKeyboard));
  if (isKeyboard && state.layoutMode) state.layoutMode = false;
  if (isKeyboard && state.showLayoutDropdown && !state.keyboardProfileId) {
    showDeviceEmpty(t("noKeyboardLayout"));
    return;
  }
  if (!deviceHasBindings(state.activeDevice)) {
    showDeviceEmpty(t("noBindingsFor", { device: deviceLabel(state.activeDevice) }));
    return;
  }

  const profiles = (await Promise.all(activeProfileIds().map((id) => getProfile(id)))).filter(Boolean);
  if (!profiles.length) { showDeviceEmpty(t("profileLoadFailed")); return; }

  const rendered = profiles.map((profile) => ({ profile, svg: renderDeviceSvg(profile) })).filter((item) => item.svg);
  if (!rendered.length) return; // SVG failed -> toast already shown, keep previous view

  const host = state.activeDevice === "controllers" ? document.createElement("div") : null;
  if (host) host.className = "controller-layouts";

  for (const { profile, svg } of rendered) {
    applyColoring(svg, state.colorMap, scan);
    applyConflicts(svg, scan.conflicts);
    attachKeyInteractions(svg);
    attachLayoutEditor(svg, profile);
    if (host) {
      const frame = document.createElement("div");
      frame.className = `controller-layout controller-${profile.type}`;
      frame.appendChild(svg);
      host.appendChild(frame);
    }
  }

  els.deviceEmpty.classList.add("hidden");
  els.deviceSvg.innerHTML = "";
  els.deviceSvg.appendChild(host || rendered[0].svg);
  state.currentProfile = profiles.length === 1 ? profiles[0] : null;
  state.currentSvg = rendered.length === 1 ? rendered[0].svg : host;
  renderLegend();
}

function showDeviceEmpty(message) {
  els.deviceSvg.innerHTML = "";
  els.deviceEmpty.textContent = message;
  els.deviceEmpty.classList.remove("hidden");
  els.legend.innerHTML = "";
}

function updateTabState() {
  els.deviceTabs.querySelectorAll(".device-tab").forEach((tab) => {
    const device = tab.dataset.device;
    const has = deviceHasBindings(device);
    tab.disabled = !has;
    tab.classList.toggle("is-disabled", !has);
    const active = device === state.activeDevice;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
}

function renderLegend() {
  const items = buildLegend(state.topMods, state.hasOther, state.hasVanilla);
  els.legend.innerHTML = items.map((item) =>
    `<span class="legend-item"><span class="legend-swatch" style="--sw:${item.color}"></span>${escapeHtml(localizeLegendLabel(item.label))}</span>`
  ).join("");
}

function localizeLegendLabel(label) {
  const labels = {
    "Vanilla: Movement": t("vanillaMovement"),
    "Vanilla: Combat/Actions": t("vanillaAction"),
    "Vanilla: Menus": t("vanillaMenu"),
    "Other mods": t("otherMods"),
    "Conflict": t("conflict"),
    "Unbound": t("unbound")
  };
  return labels[label] || label;
}

// Task 10: hover tooltip (native SVG <title>) + keyboard activation.
function attachKeyInteractions(svg) {
  svg.querySelectorAll("[data-key]").forEach((g) => {
    const ik = g.getAttribute("data-key");
    let title = g.querySelector("title");
    if (!title) {
      title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      g.appendChild(title);
    }
    title.textContent = g.getAttribute("aria-label") || ik;
    g.addEventListener("click", (event) => {
      if (state.layoutMode) { event.preventDefault(); event.stopPropagation(); return; }
      openPopover(ik, g);
    });
    g.addEventListener("keydown", (event) => {
      if (state.layoutMode) return;
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openPopover(ik, g); }
    });
  });
}

function layoutStorageKey(profileId) {
  return `witcher3-keymapper:layout:${profileId}`;
}

function applyLayoutOverrides(profile) {
  if (typeof localStorage === "undefined") return profile;
  try {
    const raw = localStorage.getItem(layoutStorageKey(profile.id));
    if (!raw) return profile;
    const overrides = JSON.parse(raw);
    const copy = { ...profile, keys: profile.keys.map((key) => ({ ...key })) };
    for (const key of copy.keys) {
      if (overrides[key.ik]) Object.assign(key, overrides[key.ik]);
    }
    return copy;
  } catch (error) {
    console.warn("Layout overrides could not be loaded", error);
    return profile;
  }
}

function saveLayoutOverride(profile, key) {
  if (typeof localStorage === "undefined") return;
  try {
    const storageKey = layoutStorageKey(profile.id);
    const overrides = JSON.parse(localStorage.getItem(storageKey) || "{}");
    overrides[key.ik] = { x: key.x, y: key.y, w: key.w, h: key.h, coord: key.coord };
    localStorage.setItem(storageKey, JSON.stringify(overrides));
  } catch (error) {
    console.warn("Layout override could not be saved", error);
  }
}

function attachLayoutEditor(svg, profile) {
  if (!state.layoutMode || state.activeDevice === "keyboard") return;
  svg.classList.add("layout-editing");
  svg.querySelectorAll("[data-key]").forEach((g) => {
    const ik = g.getAttribute("data-key");
    const key = profile.keys.find((item) => item.ik === ik);
    const shape = g.querySelector(".key-shape");
    if (!key || !shape) return;
    const handle = svgNode("rect", { class: "layout-resize", width: 14, height: 14, rx: 2 });
    g.appendChild(handle);
    positionResizeHandle(key, handle);
    g.addEventListener("pointerdown", (event) => startLayoutDrag(event, svg, profile, key, g, shape, handle, "move"));
    handle.addEventListener("pointerdown", (event) => startLayoutDrag(event, svg, profile, key, g, shape, handle, "resize"));
  });
}

function positionResizeHandle(key, handle) {
  const scale = key.coord === "px" ? 0.01 : 1;
  handle.setAttribute("x", (key.x + key.w) * scale * UNIT - 7);
  handle.setAttribute("y", (key.y + key.h) * scale * UNIT - 7);
}

function svgPoint(svg, event) {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const ctm = svg.getScreenCTM();
  return ctm ? point.matrixTransform(ctm.inverse()) : { x: 0, y: 0 };
}

function startLayoutDrag(event, svg, profile, key, g, shape, handle, mode) {
  event.preventDefault();
  event.stopPropagation();
  const start = svgPoint(svg, event);
  state.layoutDrag = { svg, profile, key, g, shape, handle, mode, start, base: { x: key.x, y: key.y, w: key.w, h: key.h } };
  svg.addEventListener("pointermove", onLayoutDrag);
  svg.addEventListener("pointerup", endLayoutDrag, { once: true });
  svg.addEventListener("pointerleave", endLayoutDrag, { once: true });
}

function onLayoutDrag(event) {
  const drag = state.layoutDrag;
  if (!drag) return;
  const current = svgPoint(drag.svg, event);
  const coordScale = drag.key.coord === "px" ? 100 : 1;
  const dx = ((current.x - drag.start.x) / UNIT) * coordScale;
  const dy = ((current.y - drag.start.y) / UNIT) * coordScale;
  if (drag.mode === "resize") {
    const minSize = drag.key.coord === "px" ? 12 : 0.2;
    drag.key.w = Math.max(minSize, drag.base.w + dx);
    drag.key.h = Math.max(minSize, drag.base.h + dy);
  } else {
    drag.key.x = drag.base.x + dx;
    drag.key.y = drag.base.y + dy;
  }
  updateKeyGeometry(drag.key, drag.g, drag.shape, drag.handle);
}

function endLayoutDrag() {
  const drag = state.layoutDrag;
  if (!drag) return;
  drag.svg.removeEventListener("pointermove", onLayoutDrag);
  saveLayoutOverride(drag.profile, drag.key);
  state.layoutDrag = null;
}

function updateKeyGeometry(key, g, shape, handle) {
  const scale = key.coord === "px" ? 0.01 : 1;
  const x = key.x * scale * UNIT;
  const y = key.y * scale * UNIT;
  const w = key.w * scale * UNIT;
  const h = key.h * scale * UNIT;
  if (shape.tagName === "circle" || shape.tag === "circle") {
    shape.setAttribute("cx", x + w / 2);
    shape.setAttribute("cy", y + h / 2);
    shape.setAttribute("r", Math.max(Math.min(w, h) / 2 - GAP, 1));
  } else {
    shape.setAttribute("x", x);
    shape.setAttribute("y", y);
    shape.setAttribute("width", Math.max(w, 1));
    shape.setAttribute("height", Math.max(h, 1));
  }
  const text = g.querySelector(".key-label");
  text?.setAttribute("x", x + w / 2);
  text?.setAttribute("y", y + h / 2);
  positionResizeHandle(key, handle);
}

/* ---------------- Task 9: Popover_Controller ---------------- */
let popoverEl = null;

function closePopover() {
  if (popoverEl) { popoverEl.remove(); popoverEl = null; }
  document.removeEventListener("keydown", onPopoverKeydown);
  document.removeEventListener("click", onOutsideClick, true);
}

function onPopoverKeydown(event) { if (event.key === "Escape") closePopover(); }
function onOutsideClick(event) {
  if (popoverEl && !popoverEl.contains(event.target) && !event.target.closest("[data-key]")) closePopover();
}

function openPopover(ik, anchorEl) {
  closePopover(); // at most one popover open (Requirement 6.8)
  const cmds = scan.commands.filter((c) => c.keys.some((k) => k.key === ik));
  const conflicts = scan.conflicts.filter((cf) => cf.key === ik);
  const label = anchorEl.querySelector(".key-label")?.textContent || ik;

  const pop = document.createElement("div");
  pop.className = "popover";
  pop.setAttribute("role", "dialog");
  const body = cmds.length
    ? cmds.map((c) => `
        <div class="pop-row">
          <div>
            <div class="commandTitle">${escapeHtml(commandTitleText(c))}</div>
            <span class="source">${escapeHtml(commandSourceLine(c))}</span>
            ${commandActionsLine(c) ? `<div class="compact-meta">${escapeHtml(commandActionsLine(c))}</div>` : ""}
          </div>
          <div class="pop-actions">
            <button data-act="remap" data-cmd="${escapeHtml(c.id)}">${escapeHtml(t("change"))}</button>
            <button data-act="clear" data-cmd="${escapeHtml(c.id)}" class="danger">${escapeHtml(t("clear"))}</button>
          </div>
        </div>`).join("")
    : `<p class="muted">${escapeHtml(t("unbound"))}</p>`;
  const conflictNote = conflicts.length
    ? `<div class="pop-conflict">${escapeHtml(t("conflictIn"))} ${escapeHtml([...new Set(conflicts.map((c) => c.section))].join(", "))}</div>`
    : "";
  pop.innerHTML = `<div class="pop-head"><strong>${escapeHtml(label)}</strong><span class="muted">${escapeHtml(ik)}</span></div>${body}${conflictNote}`;
  document.body.appendChild(pop);
  positionPopover(pop, anchorEl);
  popoverEl = pop;

  pop.querySelectorAll('[data-act="remap"]').forEach((b) =>
    b.addEventListener("click", () => { closePopover(); openRemap(b.dataset.cmd); }));
  pop.querySelectorAll('[data-act="clear"]').forEach((b) =>
    b.addEventListener("click", () => confirmClear(b, ik, b.dataset.cmd)));

  if (conflicts.length) highlightConflicts(ik);

  document.addEventListener("keydown", onPopoverKeydown);
  // Defer so the opening click itself doesn't immediately close the popover.
  setTimeout(() => document.addEventListener("click", onOutsideClick, true), 0);
}

function positionPopover(pop, anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  pop.style.top = `${window.scrollY + rect.bottom + 8}px`;
  pop.style.left = `${window.scrollX + rect.left}px`;
  requestAnimationFrame(() => {
    const pr = pop.getBoundingClientRect();
    if (pr.right > window.innerWidth - 8) {
      pop.style.left = `${Math.max(8, window.innerWidth - pr.width - 8)}px`;
    }
  });
}

// Inline two-step confirm instead of confirm() (Requirement 6.3 / 9.6).
function confirmClear(button, ik, commandId) {
  if (button.dataset.confirm !== "1") {
    button.dataset.confirm = "1";
    button.textContent = t("confirmClear");
    return;
  }
  clearBinding(ik, commandId);
}

async function clearBinding(ik, commandId) {
  const command = scan.commands.find((c) => c.id === commandId);
  if (!command) return;
  if (state.sessionFile) {
    closePopover();
    await remapSessionContent(command.actions, "IK_None", ik);
    return;
  }
  showLoading(true);
  try {
    // oldKey restricts the null-out to THIS key, not every binding of the action.
    const res = await fetch("/api/remap", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ actions: command.actions, newKey: "IK_None", oldKey: ik })
    });
    const result = await res.json();
    if (!res.ok) { showToast(result.error || t("clearFailed"), "error"); return; }
    closePopover();
    showToast(`${t("clearedBindings", { count: result.changed })} · ${t("backup", { path: result.backup })}`, "success");
    await load();
  } finally {
    showLoading(false);
  }
}

// Task 14: clicking a conflicting key highlights & scrolls the sidebar entry.
function highlightConflicts(ik) {
  els.conflicts.querySelectorAll(".conflict.highlight").forEach((el) => el.classList.remove("highlight"));
  const matches = els.conflicts.querySelectorAll(`[data-conflict-key="${ik}"]`);
  matches.forEach((el, i) => {
    el.classList.add("highlight");
    if (i === 0) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

/* =====================================================================
 * Device-centric UI — Wave 4–8 building blocks (Tasks 4,5,6,7,8).
 * These are pure/standalone helpers; wiring into the page (tabs, hardware
 * pre-selection, load/save UI) follows in Tasks 11–13. Pure helpers are
 * exported for Node tests at the bottom of this file.
 * ===================================================================== */

// --- Shared colour palette (Task 7 / Requirement 4) ---
const COLORS = {
  vanilla: "#b68a3a",        // fallback for uncategorised game/input.xml rows
  vanillaMovement: "#597f70", // movement, camera, horse/boat steering
  vanillaAction: "#c09749",   // combat, interaction, signs, quick actions
  vanillaMenu: "#6f6f8f",     // menus, panels, quest/map/HUD shortcuts
  other: "#586068",          // mods outside the top 5
  high: "#b94a3c",           // high-severity conflict
  medium: "#b87932",         // medium-severity conflict / multi-source key
  unbound: "#262522"         // neutral / no binding
};
const MOD_PALETTE = ["#4f6f86", "#7b678e", "#6f7f56", "#a0603d", "#8f5964"];
const VANILLA_CATEGORY_META = {
  movement: { label: "Vanilla: Movement", color: COLORS.vanillaMovement },
  action: { label: "Vanilla: Combat/Actions", color: COLORS.vanillaAction },
  menu: { label: "Vanilla: Menus", color: COLORS.vanillaMenu }
};
const VANILLA_CATEGORY_PRIORITY = ["menu", "movement", "action"];
const VANILLA_MENU_ACTIONS = new Set([
  "FastMenu", "HoldFastMenu", "HubMenu", "IngameMenu", "ShowEntryInPanel",
  "PanelMap", "PanelMapPC", "PanelJour", "PanelChar", "PanelInv", "PanelAlch",
  "PanelMeditation", "PanelCraft", "PanelCrafting", "PanelBestiary",
  "PanelGlossary", "PanelGwintDeckEditor", "PanelFakeHud", "GotoGlossary",
  "HoldToSeeMap", "HoldToSeeQuests", "HoldToSeeCharStats", "HoldToSeeEssentials",
  "TrackQuest", "HighlightObjective", "ToggleHud", "OpenMeditation",
  "MeditationAbort", "OnShowControlsHelp"
]);
const VANILLA_MOVEMENT_ACTIONS = new Set([
  "MoveFwd", "MoveBck", "MoveLft", "MoveRght",
  "GI_AxisLeftX", "GI_AxisLeftY", "GI_AxisRightX", "GI_AxisRightY",
  "GI_MouseDampX", "GI_MouseDampY", "Sprint", "SprintToggle",
  "Jump", "JumpRoll", "ExplorationInteraction", "DiveDown",
  "BoatDismount", "HorseDismount", "HorseJump", "Follow",
  "GallopCanter", "GI_Accelerate", "VehicleItemActionAbort"
]);
const VANILLA_ACTION_ACTIONS = new Set([
  "Alternate", "AltQuenCasting", "AttackHeavy", "AttackLight",
  "AttackWithAlternateHeavy", "AttackWithAlternateLight", "SpecialAttackHeavy",
  "SpecialAttackLight", "SpecialAttackWithAlternateHeavy", "SpecialAttackWithAlternateLight",
  "CastSign", "CastSignHold", "Focus", "LockAndGuard", "RadialMenu",
  "ThrowItem", "ThrowItemHold", "VehicleItemAction", "VehicleItemActionHold",
  "SteelSword", "SilverSword", "SwordSheathe", "SwordSheatheSteel",
  "SwordSheatheSilver", "OilSteel", "OilSilver", "OilSteelKB", "OilSilverKB",
  "DrinkPotion1", "DrinkPotion1Hold", "DrinkPotion2", "DrinkPotion2Hold",
  "DrinkPotion3", "DrinkPotion3Hold", "DrinkPotion4", "DrinkPotion4Hold",
  "DrinkPotionUpperHold", "DrinkPotionLowerHold", "SelectAard", "SelectYrden",
  "SelectIgni", "SelectQuen", "SelectAxii", "Interaction", "Interact",
  "InteractHold", "ExplorationInteraction", "ItemsPadUse", "ItemsPadUp",
  "ItemsPadDown", "ItemsPadLeft", "ItemsPadRight", "Use", "UseDevice",
  "UseItem", "UseItem1", "UseItem2", "Open", "Close", "Take", "Container",
  "GatherHerbs", "Talk", "MountHorse", "EnterBoat", "EnterBoatFromSwimming",
  "Finish", "Finisher", "PlaceTrophy", "BuryBody", "CbtRoll"
]);

/* ---------------- Task 4: Device_Registry ---------------- */
const REQUIRED_PROFILE_FIELDS = ["id", "name", "type", "layout", "keys"];

// Validate a device profile: all required fields present and keys is an array
// (Requirement 3.6). Invalid profiles are skipped by the caller.
function validateProfile(profile) {
  if (!profile || typeof profile !== "object") return false;
  if (!Array.isArray(profile.keys)) return false;
  return REQUIRED_PROFILE_FIELDS.every((field) => field in profile);
}

// Load the registry index. Tolerates both the new { profiles: [...] } shape and
// a bare array, so older index.json files still work (Requirement 3.2).
async function loadRegistry() {
  const res = await fetch("/devices/index.json");
  if (!res.ok) throw new Error("Device registry could not be loaded");
  const data = await res.json();
  return Array.isArray(data) ? data : (data.profiles || []);
}

async function loadProfile(profileId) {
  const res = await fetch(`/devices/${profileId}/profile.json`);
  if (!res.ok) throw new Error(`Device profile "${profileId}" not found`);
  const profile = await res.json();
  if (!validateProfile(profile)) {
    console.error(`Device profile "${profileId}" is invalid: required field missing`);
    return null;
  }
  return profile;
}

// Map a detected device to a profile. Four-stage fallback (Requirement 8.6–8.8):
//   1. exact VID:PID hit
//   2. de-* input language -> profile whose fallbackLocales include "de" (iso-de-105)
//   3. any other non-empty language -> fallbackLocales include "en" (ansi-us-104)
//   4. no language -> null (UI shows a manual layout dropdown)
function matchDevice(vid, pid, registry, inputLanguage) {
  if (vid && pid) {
    const v = String(vid).toUpperCase();
    const p = String(pid).toUpperCase();
    const hit = registry.find((entry) =>
      entry.vid && entry.pid &&
      String(entry.vid).toUpperCase() === v &&
      String(entry.pid).toUpperCase() === p);
    if (hit) return hit;
  }
  const lang = String(inputLanguage || "").toLowerCase();
  if (lang.startsWith("de-") || lang === "de") {
    const de = registry.find((entry) => entry.fallback && (entry.fallbackLocales || []).includes("de"));
    if (de) return de;
  }
  if (lang) {
    const en = registry.find((entry) => entry.fallback && (entry.fallbackLocales || []).includes("en"));
    if (en) return en;
  }
  return null;
}

/* ---------------- Task 7: Key_Colorizer ---------------- */

// Top 5 mod sources by binding count, each assigned a distinct palette colour.
// Deterministic: sorted by count desc then source name, so identical scan data
// always yields the same assignment (Requirement 4.7, 4.8).
function computeTopMods(commands) {
  const counts = new Map();
  for (const command of commands) {
    if (command.source === "game/input.xml") continue; // vanilla is not a mod
    const n = (command.keys && command.keys.length) || 0;
    counts.set(command.source, (counts.get(command.source) || 0) + n);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([source, count], index) => ({ source, count, color: MOD_PALETTE[index] }));
}

function vanillaCategoryForAction(action, allowPatternFallback = false) {
  if (VANILLA_MENU_ACTIONS.has(action) ||
    (allowPatternFallback && (/^Panel/.test(action) || /Menu|Glossary|Meditation|Hud|Quest|EntryInPanel/.test(action)))) {
    return "menu";
  }
  if (VANILLA_MOVEMENT_ACTIONS.has(action) ||
    (allowPatternFallback && (/^GI_(Axis|Mouse)/.test(action) || /Move|Sprint|Jump|Dive|Horse|Boat|Dismount|Accelerate/.test(action)))) {
    return "movement";
  }
  if (VANILLA_ACTION_ACTIONS.has(action) ||
    (allowPatternFallback && /Attack|Sign|Sword|Potion|Oil|Item|Interact|Focus|Guard|Radial|Use|Cast|Select/.test(action))) {
    return "action";
  }
  return null;
}

function vanillaCategoryForCommand(command) {
  const allowPatternFallback = command.source === "game/input.xml";
  const categories = new Set((command.actions || [command.id])
    .map((action) => vanillaCategoryForAction(action, allowPatternFallback)));
  categories.delete(null);
  if (!categories.size && command.source !== "game/input.xml") return null;
  if (!categories.size) return "action";
  for (const category of VANILLA_CATEGORY_PRIORITY) {
    if (categories.has(category)) return category;
  }
  return null;
}

function dominantVanillaCategory(categories) {
  for (const category of VANILLA_CATEGORY_PRIORITY) {
    if (categories.has(category)) return category;
  }
  return null;
}

// Build IK_* -> colour map from scan commands + conflicts (Requirement 4.1–4.5).
function buildColorMap(commands, conflicts) {
  const topMods = computeTopMods(commands);
  const modColor = new Map(topMods.map((mod) => [mod.source, mod.color]));

  const ikSources = new Map(); // IK_* -> Set(source)
  const ikVanillaCategories = new Map(); // IK_* -> Set("movement" | "action" | "menu")
  for (const command of commands) {
    const vanillaCategory = vanillaCategoryForCommand(command);
    for (const key of command.keys || []) {
      if (!key.key || key.key === "IK_None") continue;
      if (!ikSources.has(key.key)) ikSources.set(key.key, new Set());
      ikSources.get(key.key).add(command.source);
      if (vanillaCategory) {
        if (!ikVanillaCategories.has(key.key)) ikVanillaCategories.set(key.key, new Set());
        ikVanillaCategories.get(key.key).add(vanillaCategory);
      }
    }
  }

  const conflictSev = new Map(); // IK_* -> "high" | "medium"
  for (const conflict of conflicts || []) {
    if (conflict.key === "IK_None") continue;
    if (conflictSev.get(conflict.key) !== "high") conflictSev.set(conflict.key, conflict.severity);
  }

  const map = new Map();
  for (const [ik, sources] of ikSources) {
    if (conflictSev.has(ik)) {
      map.set(ik, conflictSev.get(ik) === "high" ? COLORS.high : COLORS.medium);
      continue;
    }
    // The referenced Witcher control chart groups stock bindings by movement,
    // actions/combat and menus. Mixed vanilla/mod keys keep their vanilla
    // category colour unless the server-side scanner marks a real conflict.
    const vanillaCategories = ikVanillaCategories.get(ik);
    if (vanillaCategories?.size) {
      const category = dominantVanillaCategory(vanillaCategories);
      map.set(ik, VANILLA_CATEGORY_META[category]?.color || COLORS.vanilla);
      continue;
    }
    if (sources.size > 1) { map.set(ik, COLORS.other); continue; }
    const only = [...sources][0];
    if (only === "game/input.xml") map.set(ik, COLORS.vanilla);
    else if (modColor.has(only)) map.set(ik, modColor.get(only));
    else map.set(ik, COLORS.other);
  }
  return map;
}

function buildLegend(topMods, hasOther, hasVanilla) {
  const items = [];
  if (hasVanilla) {
    items.push(...VANILLA_CATEGORY_PRIORITY.map((category) => VANILLA_CATEGORY_META[category]));
  }
  for (const mod of topMods) items.push({ label: mod.source, color: mod.color });
  if (hasOther) items.push({ label: "Other mods", color: COLORS.other });
  items.push({ label: "Conflict", color: COLORS.high });
  items.push({ label: "Unbound", color: COLORS.unbound });
  return items;
}

/* ---------------- Tasks 5 & 6: SVG_Renderer ---------------- */
const UNIT = 54;  // px per key unit
const PAD = 8;    // viewBox padding
const RADIUS = 8; // key corner radius
const GAP = 5;    // visual gap between adjacent keys (px), so rounding is visible

function svgNode(tag, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
}

// Device profiles can use rect/pill/circle/dpad-* shapes. Keyboard keys stay
// rectangular, while mouse/gamepad controls need device-like geometry.
function buildKeyEl(key, profileType = "keyboard") {
  const coordScale = key.coord === "px" ? 0.01 : 1;
  const g = svgNode("g", {
    class: `key shape-${key.shape || "rect"}`,
    "data-key": key.ik,
    tabindex: "0",
    role: "button"
  });
  g.setAttribute("aria-label", t("keyUnbound", { label: key.label || key.ik }));
  const x = key.x * coordScale * UNIT;
  const y = key.y * coordScale * UNIT;
  const w = key.w * coordScale * UNIT;
  const h = key.h * coordScale * UNIT;
  let shape;
  if (profileType === "keyboard") {
    shape = svgNode("rect", {
      x: x + GAP, y: y + GAP,
      width: Math.max(w - 2 * GAP, 1), height: Math.max(h - 2 * GAP, 1),
      rx: RADIUS,
      class: "key-shape"
    });
  } else if (key.shape === "circle") {
    const r = Math.max(Math.min(w, h) / 2 - GAP, 1);
    shape = svgNode("circle", {
      cx: x + w / 2, cy: y + h / 2, r,
      class: "key-shape"
    });
  } else {
    const isDpad = String(key.shape || "").startsWith("dpad-");
    const isArtworkOverlay = key.shape === "main" || key.shape === "side";
    const isPill = key.shape === "pill" || key.shape === "wide";
    const inset = isDpad || isArtworkOverlay ? 0 : GAP;
    shape = svgNode("rect", {
      x: x + inset, y: y + inset,
      width: Math.max(w - 2 * inset, 1), height: Math.max(h - 2 * inset, 1),
      rx: isPill ? Math.max(h / 2 - GAP, 1) : isDpad ? 7 : isArtworkOverlay ? 6 : RADIUS,
      class: "key-shape"
    });
  }
  g.appendChild(shape);
  const text = svgNode("text", {
    x: x + w / 2,
    y: y + h / 2,
    class: "key-label", "text-anchor": "middle", "dominant-baseline": "central"
  });
  text.textContent = key.label || "";
  g.appendChild(text);
  return g;
}

function deviceExtent(profile) {
  if (profile.size && profile.size.w) return { w: profile.size.w, h: profile.size.h };
  return {
    w: Math.max(...profile.keys.map((k) => k.x + k.w)),
    h: Math.max(...profile.keys.map((k) => k.y + k.h))
  };
}

// pad widens the viewBox so a device backdrop (e.g. the gamepad body) has room
// around the keys instead of clipping them.
function buildDeviceSvg(profile, extraClass, pad = PAD) {
  const { w, h } = deviceExtent(profile);
  const svg = svgNode("svg", {
    class: `device-svg ${extraClass}`,
    viewBox: `0 0 ${w * UNIT + pad * 2} ${h * UNIT + pad * 2}`,
    role: "group"
  });
  svg.setAttribute("aria-label", profile.name);
  const root = svgNode("g", { transform: `translate(${pad} ${pad})` });
  svg.appendChild(root);
  if (profile.artwork) {
    root.appendChild(svgNode("image", {
      class: "device-artwork",
      href: profile.artwork,
      x: 0,
      y: 0,
      width: w * UNIT,
      height: h * UNIT,
      preserveAspectRatio: "xMidYMid meet"
    }));
  }
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debugOverlay")) {
    root.appendChild(buildDebugGrid(w, h, Boolean(profile.artwork)));
  }
  for (const key of profile.keys) root.appendChild(buildKeyEl(key, profile.type));
  return { svg, root };
}

function buildDebugGrid(w, h, pixelLabels = false) {
  const grid = svgNode("g", { class: "debug-grid" });
  for (let x = 0; x <= w; x += 1) {
    grid.appendChild(svgNode("line", { x1: x * UNIT, y1: 0, x2: x * UNIT, y2: h * UNIT }));
    const t = svgNode("text", { x: x * UNIT + 3, y: 14 });
    t.textContent = pixelLabels ? String(x * 100) : String(x);
    grid.appendChild(t);
  }
  for (let y = 0; y <= h; y += 1) {
    grid.appendChild(svgNode("line", { x1: 0, y1: y * UNIT, x2: w * UNIT, y2: y * UNIT }));
    const t = svgNode("text", { x: 3, y: y * UNIT + 14 });
    t.textContent = pixelLabels ? String(y * 100) : String(y);
    grid.appendChild(t);
  }
  return grid;
}

function renderKeyboardSvg(profile) {
  return buildDeviceSvg(profile, "keyboard-svg").svg;
}

function renderMouseSvg(profile) {
  if (profile.artwork) return buildDeviceSvg(profile, "mouse-svg artwork-svg", 0).svg;
  const pad = 20;
  const { svg, root } = buildDeviceSvg(profile, "mouse-svg", pad);
  const { w, h } = deviceExtent(profile);
  const W = w * UNIT, H = h * UNIT, m = pad - 6;
  const body = svgNode("rect", {
    class: "device-body", x: -m, y: -m, width: W + 2 * m, height: H + 2 * m,
    rx: W / 2 + m, ry: W / 2 + m
  });
  root.insertBefore(body, root.firstChild);
  return svg;
}

function renderGamepadSvg(profile) {
  if (profile.artwork) return buildDeviceSvg(profile, "gamepad-svg artwork-svg", 0).svg;
  const pad = 46;
  const { svg, root } = buildDeviceSvg(profile, "gamepad-svg", pad);
  const { w, h } = deviceExtent(profile);
  const W = w * UNIT, H = h * UNIT, m = pad - 10;
  // Controller silhouette keeps the shoulder/trigger row outside the main grips
  // while the sticks and face buttons sit inside a broader center body.
  const body = svgNode("path", {
    class: "device-body",
    d: [
      `M ${m} ${H * 0.22}`,
      `C ${W * 0.08} ${H * 0.15}, ${W * 0.18} ${-m}, ${W * 0.34} ${m}`,
      `L ${W * 0.66} ${m}`,
      `C ${W * 0.82} ${-m}, ${W * 0.92} ${H * 0.15}, ${W - m} ${H * 0.22}`,
      `C ${W + m * 1.5} ${H * 0.33}, ${W + m * 1.2} ${H + m * 0.9}, ${W * 0.76} ${H + m}`,
      `C ${W * 0.62} ${H + m * 0.65}, ${W * 0.38} ${H + m * 0.65}, ${W * 0.24} ${H + m}`,
      `C ${-m * 1.2} ${H + m * 0.9}, ${-m * 1.5} ${H * 0.33}, ${m} ${H * 0.22}`,
      "Z"
    ].join(" ")
  });
  root.insertBefore(body, root.firstChild);
  return svg;
}

// Dispatch by profile.type; on failure show a toast and keep the previous SVG
// (Requirement 2.8).
function renderDeviceSvg(profile) {
  try {
    if (profile.type === "mouse") return renderMouseSvg(profile);
    if (profile.type === "gamepad") return renderGamepadSvg(profile);
    return renderKeyboardSvg(profile);
  } catch (error) {
    showToast(t("svgFailed", { message: error.message }), "error");
    return null;
  }
}

function summarizeKey(ik, label, scanData) {
  if (!scanData) return t("keyUnbound", { label });
  const cmds = scanData.commands.filter((c) => c.keys.some((k) => k.key === ik));
  if (!cmds.length) return t("keyUnbound", { label });
  const sources = [...new Set(cmds.map((c) => c.source))];
  return `${label}: ${cmds.map((c) => c.id).join(", ")} (${sources.join(", ")})`;
}

// Colour each key via a CSS custom property the shape reads as its fill, and add
// an inner glow that mirrors the binding colour (Requirement 9.5). Also refreshes
// each key's aria-label with a binding summary (Requirement 6.9).
function applyColoring(svgEl, colorMap, scanData) {
  if (!svgEl) return;
  svgEl.querySelectorAll("[data-key]").forEach((g) => {
    const ik = g.getAttribute("data-key");
    const color = colorMap.get(ik) || COLORS.unbound;
    g.style.setProperty("--key-fill", color);
    g.classList.toggle("bound", colorMap.has(ik));
    const label = g.querySelector(".key-label")?.textContent || ik;
    g.setAttribute("aria-label", summarizeKey(ik, label, scanData));
  });
}

// Mark conflicting keys (Requirement 5.1, 5.2); pulsing styling lands in Task 17.
function applyConflicts(svgEl, conflicts) {
  if (!svgEl) return;
  const sev = new Map();
  for (const conflict of conflicts || []) {
    if (conflict.key === "IK_None") continue;
    if (sev.get(conflict.key) !== "high") sev.set(conflict.key, conflict.severity);
  }
  svgEl.querySelectorAll("[data-key]").forEach((g) => {
    const ik = g.getAttribute("data-key");
    g.classList.remove("conflict-high", "conflict-medium");
    if (sev.has(ik)) g.classList.add(sev.get(ik) === "high" ? "conflict-high" : "conflict-medium");
  });
}

/* ---------------- Task 8: Toast_Manager ---------------- */
// Non-blocking status messages (Requirement 9.6); replaces alert()/confirm().
function showToast(message, type = "info") {
  let host = document.querySelector("#toastHost");
  if (!host) {
    host = document.createElement("div");
    host.id = "toastHost";
    host.className = "toast-host";
    document.body.appendChild(host);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "status");
  toast.textContent = message;
  host.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

if (typeof document !== "undefined") {
  applyStaticTexts();
  load().catch((error) => {
    document.body.innerHTML = `<main><h1>${escapeHtml(t("error"))}</h1><p>${escapeHtml(error.message)}</p></main>`;
  });
}

// Node-only export for unit/property tests of the pure helpers (no DOM needed).
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    validateProfile, loadRegistry, loadProfile, matchDevice,
    computeTopMods, buildColorMap, buildLegend, COLORS, MOD_PALETTE,
    renderDeviceSvg, renderKeyboardSvg, renderMouseSvg, renderGamepadSvg,
    applyColoring, applyConflicts, remapInputSettingsText, groupConflicts
  };
}
