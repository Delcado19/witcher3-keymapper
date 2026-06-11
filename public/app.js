let scan = null;
let activeCommand = null;
let currentContent = "";

// DOM lookups are guarded so this module can be required under Node for unit/
// property tests of the pure helpers (matchDevice, colorizer); in the browser
// it behaves exactly as before.
const els = (typeof document !== "undefined") ? {
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
  remapPreview: document.querySelector("#remapPreview"),
  remapForm: document.querySelector("#remapForm"),
  deviceTabs: document.querySelector("#deviceTabs"),
  deviceSvg: document.querySelector("#deviceSvg"),
  deviceEmpty: document.querySelector("#deviceEmpty"),
  legend: document.querySelector("#legend"),
  layoutSelect: document.querySelector("#layoutSelect"),
  layoutSelectWrap: document.querySelector("#layoutSelectWrap"),
  layoutMode: document.querySelector("#layoutMode"),
  editorBar: document.querySelector("#editorBar"),
  editorFontDown: document.querySelector("#editorFontDown"),
  editorFontUp: document.querySelector("#editorFontUp"),
  editorGrid: document.querySelector("#editorGrid"),
  editorReset: document.querySelector("#editorReset"),
  editorHint: document.querySelector("#editorHint"),
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
    editLayout: "Edit layout",
    editLayoutDone: "Done editing",
    editorSave: "Save",
    editorReset: "Reset",
    editorHint: "Drag the PNG, anchors, or labels. Double-click a label to rename. Shift bypasses snap. “Done” applies.",
    editorDirty: "{count} unsaved",
    editLabelPrompt: "Button caption for {ik}:",
    assignSearch: "Bind a command to this key…",
    assignNoMatch: "No matching command.",
    editorResetDone: "Reverted to the saved layout.",
    editorSaveDone: "Saved {count} layout(s).",
    editorSaveFailed: "Could not save {id}: {message}",
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
    remapPreviewSummary: "Affects {count} binding(s) in {sections} context(s)",
    remapPreviewEmpty: "No current bindings to change",
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
    editLayout: "Layout bearbeiten",
    editLayoutDone: "Fertig",
    editorSave: "Speichern",
    editorReset: "Zurücksetzen",
    editorHint: "PNG, Anker oder Beschriftungen ziehen. Doppelklick auf eine Beschriftung zum Umbenennen. Shift umgeht das Raster. Fertig übernimmt.",
    editorDirty: "{count} ungespeichert",
    editLabelPrompt: "Tastenbeschriftung für {ik}:",
    assignSearch: "Befehl auf diese Taste legen…",
    assignNoMatch: "Kein passender Befehl.",
    editorResetDone: "Auf gespeichertes Layout zurückgesetzt.",
    editorSaveDone: "{count} Layout(s) gespeichert.",
    editorSaveFailed: "{id} konnte nicht gespeichert werden: {message}",
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
    remapPreviewSummary: "Betrifft {count} Belegung(en) in {sections} Kontext(en)",
    remapPreviewEmpty: "Keine aktuellen Belegungen zu ändern",
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
  els.layoutMode && (els.layoutMode.textContent = state.layoutMode ? t("editLayoutDone") : t("editLayout"));
  updateEditorBar();
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
  layoutMode: false,           // leader-layout editor active (controllers tab only)
  leaderDrag: null,            // in-flight editor drag descriptor
  editGrid: true,              // snap dragged coords to a grid while editing
  dirtyProfiles: new Set(),    // ids with unsaved editor changes
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
  renderRemapPreview();
  els.dialog.showModal();
}

// Pure preview of which bindings a remap would rewrite. remap() matches purely by
// action across every section (including IK_None "unbound" slots), so the affected
// set is exactly command.bindings and `total` equals the server's `changed` count
// (verified against SpecialAttackLight: 8 bindings = 8 rewritten lines). It does
// NOT predict conflicts on purpose: the authoritative conflict view is the
// re-scan after apply, not a cruder client-side check (Step 3 / AGENTS scanner
// is the single source of truth).
function buildRemapPreview(command, newKey) {
  const bindings = Array.isArray(command?.bindings) ? command.bindings : [];
  const target = String(newKey || "").trim();
  const sectionsMap = new Map();
  for (const binding of bindings) {
    if (!sectionsMap.has(binding.section)) sectionsMap.set(binding.section, []);
    sectionsMap.get(binding.section).push(binding.key);
  }
  const sections = [...sectionsMap.entries()].map(([section, keys]) => ({ section, keys }));
  return {
    total: bindings.length,
    sectionCount: sections.length,
    sections,
    newKey: /^IK_[A-Za-z0-9_]+$/.test(target) ? target : ""
  };
}

function renderRemapPreview() {
  if (!els.remapPreview) return;
  if (!activeCommand) { els.remapPreview.innerHTML = ""; return; }
  const preview = buildRemapPreview(activeCommand, els.newKey?.value);
  if (!preview.total) {
    els.remapPreview.innerHTML = `<p class="remap-preview-summary">${escapeHtml(t("remapPreviewEmpty"))}</p>`;
    return;
  }
  const arrow = preview.newKey ? ` → ${escapeHtml(preview.newKey)}` : "";
  const summary = escapeHtml(t("remapPreviewSummary", { count: preview.total, sections: preview.sectionCount }));
  const rows = preview.sections.map((section) =>
    `<li><span class="remap-preview-section">${escapeHtml(section.section)}</span>: ${escapeHtml(section.keys.join(", "))}</li>`
  ).join("");
  els.remapPreview.innerHTML = `<p class="remap-preview-summary">${summary}${arrow}</p><ul class="remap-preview-list">${rows}</ul>`;
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

  // Live-update the affected-bindings preview as the user types the target key.
  els.newKey?.addEventListener("input", renderRemapPreview);
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
    if (state.activeDevice !== "controllers") return;
    const wasEditing = state.layoutMode;
    state.layoutMode = !state.layoutMode;
    els.layoutMode.setAttribute("aria-pressed", state.layoutMode ? "true" : "false");
    closePopover();
    // No explicit Save button: leaving edit mode ("Fertig") applies the layout to disk.
    if (wasEditing && state.dirtyProfiles.size) saveLeaderLayouts();
    renderDeviceView();
  });
  els.editorGrid?.addEventListener("change", () => { state.editGrid = els.editorGrid.checked; });
  els.editorFontDown?.addEventListener("click", () => adjustEditorFont(-2));
  els.editorFontUp?.addEventListener("click", () => adjustEditorFont(2));
  els.editorReset?.addEventListener("click", resetLeaderLayouts);
}

// Show/hide the editor toolbar with the edit toggle, reflect dirty state on Save, and
// keep the toggle's label/pressed-state in sync (called from renderDeviceView too).
function updateEditorBar() {
  if (!els.editorBar) return;
  const on = state.layoutMode && state.activeDevice === "controllers";
  els.editorBar.classList.toggle("hidden", !on);
  els.layoutMode && els.layoutMode.setAttribute("aria-pressed", state.layoutMode ? "true" : "false");
  if (els.layoutMode) els.layoutMode.textContent = state.layoutMode ? t("editLayoutDone") : t("editLayout");
  const dirty = state.dirtyProfiles.size > 0;
  if (els.editorReset) els.editorReset.textContent = t("editorReset");
  if (els.editorHint) els.editorHint.textContent = dirty ? t("editorDirty", { count: state.dirtyProfiles.size }) : t("editorHint");
}

// Nudge the active profiles' default label size. fontScale multiplies the CSS sizes
// (applied per-tspan in applyLeaderLabels) so the whole label block scales together.
function adjustEditorFont(delta) {
  let changed = false;
  for (const profile of activeProfileIds().map((id) => state.profileCache.get(id)).filter(isEditableProfile)) {
    const base = profile.fontSize || LEADER_BASE_FONT;
    const next = clamp(round2(base + delta), 10, 48);
    if (next !== base) { profile.fontSize = next; markProfileDirty(profile.id); changed = true; }
  }
  if (changed) renderDeviceView();
}

// Throw away unsaved edits by re-fetching the committed profile.json from the server.
async function resetLeaderLayouts() {
  for (const id of [...state.dirtyProfiles]) {
    state.profileCache.delete(id);
    await getProfile(id); // re-fetch fresh copy into the cache
  }
  state.dirtyProfiles.clear();
  renderDeviceView();
  showToast(t("editorResetDone"), "info");
}

// Persist every edited profile back to its committed profile.json via the guarded
// write endpoint (see server.js POST /api/profile).
async function saveLeaderLayouts() {
  const ids = [...state.dirtyProfiles];
  if (!ids.length) return;
  let ok = 0;
  for (const id of ids) {
    const profile = state.profileCache.get(id);
    if (!profile) continue;
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, profile })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.dirtyProfiles.delete(id);
      ok++;
    } catch (error) {
      showToast(t("editorSaveFailed", { id, message: error.message }), "error");
    }
  }
  updateEditorBar();
  if (ok) showToast(t("editorSaveDone", { count: ok }), "info");
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
  // Return the cached instance directly (no copy): the layout editor mutates this
  // object live during a drag, and persistence is server-side (POST /api/profile),
  // not the old per-browser localStorage overlay.
  if (state.profileCache.has(id)) return state.profileCache.get(id);
  const profile = await loadProfile(id);
  if (profile) state.profileCache.set(id, profile);
  return profile || null;
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
  // The leader-layout editor only applies to the artwork controller schemes (mouse/
  // gamepad), so the toggle shows on that tab and is force-off everywhere else.
  const editable = state.activeDevice === "controllers";
  els.layoutMode?.classList.toggle("hidden", !editable);
  if (!editable) state.layoutMode = false;
  updateEditorBar();
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
    if (profile.artwork) applyLeaderLabels(svg, profile, scan);
    attachKeyInteractions(svg);
    attachLeaderEditor(svg, profile);
    if (host) {
      const frame = document.createElement("div");
      frame.className = `controller-layout controller-${profile.type}`;
      // Size each device's column proportional to its viewBox width so mouse and gamepad
      // render at the SAME unit scale side by side (same font px, same line pitch). The
      // wide gamepad gets proportionally more room than the small mouse instead of being
      // squeezed into an equal half (which cramped its 16 labels and left the mouse half
      // empty). flex-basis:0 + this grow makes each column's width strictly proportional.
      const vbW = svg.viewBox?.baseVal?.width
        || parseFloat((svg.getAttribute("viewBox") || "0 0 1 1").split(/\s+/)[2]) || 1;
      frame.style.flexGrow = String(vbW);
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

// Convert a pointer event to SVG user-space (= canvas) coordinates.
function svgPoint(svg, event) {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const ctm = svg.getScreenCTM();
  return ctm ? point.matrixTransform(ctm.inverse()) : { x: 0, y: 0 };
}

/* ---------------- Leader-layout editor ----------------
   Direct-manipulation editor for the mouse/gamepad controller schemes. Operates on
   the EXPLICIT coordinate model (profile.canvas/art + per-key ax/ay/lx/ly); edits
   mutate the cached profile live and persist via POST /api/profile. Four drag targets:
   move/resize the PNG (art rect), move an anchor (ax/ay, % of art) and move a label
   (lx/ly, canvas units). The leader line is re-derived from those each redraw, so it
   can never detach. Snap-to-grid + smart guides layer on in onLeaderDrag. */
const EDIT_GRID = 4;          // canvas-unit grid for snap-to-grid (fine, so anchors can sit on a button centre)
const ART_MIN = 60;           // smallest allowed PNG box edge
const SNAP_SCREEN_PX = 3;     // smart-guide engage distance (screen px); smaller = tighter

// Editor only applies to seeded artwork profiles (explicit model present).
function isEditableProfile(profile) {
  return !!(profile && profile.artwork && profile.canvas && profile.art);
}

function attachLeaderEditor(svg, profile) {
  if (!state.layoutMode || !isEditableProfile(profile)) return;
  svg.classList.add("layout-editing");
  drawEditHandles(svg, profile, computeLeaderLayout(profile));
}

// (Re)attach the editor affordances onto the freshly built scene: the PNG is the
// move target, a corner square resizes it, each anchor dot and each label is draggable.
// Called after every redraw because the scene's children are rebuilt each drag tick.
function drawEditHandles(svg, profile, layout) {
  const rootEl = svg.querySelector("g");
  if (!rootEl) return;
  const img = rootEl.querySelector(".device-artwork");
  if (img) {
    img.classList.add("edit-art");
    img.addEventListener("pointerdown", (e) => startLeaderDrag(e, svg, profile, { type: "art-move" }));
  }
  const a = layout.art;
  const handle = svgNode("rect", { class: "edit-handle edit-art-resize", x: a.x + a.w - 9, y: a.y + a.h - 9, width: 18, height: 18, rx: 3 });
  handle.addEventListener("pointerdown", (e) => startLeaderDrag(e, svg, profile, { type: "art-resize" }));
  rootEl.appendChild(handle);
  rootEl.querySelectorAll("[data-key]").forEach((g) => {
    const ik = g.getAttribute("data-key");
    const dot = g.querySelector(".key-shape");
    if (dot) {
      dot.classList.add("edit-anchor");
      dot.addEventListener("pointerdown", (e) => startLeaderDrag(e, svg, profile, { type: "anchor", ik }));
    }
    const text = g.querySelector(".leader-label");
    if (text) {
      text.classList.add("edit-label");
      text.addEventListener("pointerdown", (e) => startLeaderDrag(e, svg, profile, { type: "label", ik }));
      text.addEventListener("dblclick", (e) => { e.preventDefault(); e.stopPropagation(); promptLabelText(profile, ik); });
    }
  });
}

// Rebuild the scene in place (image + keys + coloring + labels + edit handles). The
// svg-level pointer listeners survive because only rootEl's children are replaced.
function redrawEditing(svg, profile) {
  const rootEl = svg.querySelector("g");
  if (!rootEl) return;
  rootEl.textContent = "";
  const layout = computeLeaderLayout(profile);
  buildLeaderSceneInto(rootEl, layout, profile);
  applyColoring(svg, state.colorMap, scan);
  applyConflicts(svg, scan.conflicts);
  applyLeaderLabels(svg, profile, scan);
  drawEditHandles(svg, profile, layout);
}

function startLeaderDrag(event, svg, profile, target) {
  if (!state.layoutMode) return;
  event.preventDefault();
  event.stopPropagation();
  const key = target.ik ? profile.keys.find((k) => k.ik === target.ik) : null;
  const start = svgPoint(svg, event);
  const base = {};
  if (target.type === "art-move" || target.type === "art-resize") {
    base.x = profile.art.x; base.y = profile.art.y; base.w = profile.art.w; base.h = profile.art.h;
  } else if (target.type === "anchor" && key) {
    base.ax = key.ax; base.ay = key.ay;
  } else if (target.type === "label" && key) {
    base.lx = key.lx; base.ly = key.ly;
  }
  state.leaderDrag = { svg, profile, target, key, start, base, moved: false };
  try { svg.setPointerCapture(event.pointerId); } catch (_) { /* jsdom/stub: no capture */ }
  svg.addEventListener("pointermove", onLeaderDrag);
  svg.addEventListener("pointerup", endLeaderDrag, { once: true });
}

// Round to the snap grid unless Shift is held (Pixaroma-style bypass).
function snap(value, bypass) {
  return state.editGrid && !bypass ? Math.round(value / EDIT_GRID) * EDIT_GRID : value;
}

// Alignment targets for smart guides: every OTHER control's anchor + label X/Y, plus
// the canvas and PNG centers — the lines a dragged element can snap onto.
function collectSnapTargets(layout, excludeIk) {
  const xs = [], ys = [];
  for (const k of layout.keys) {
    if (k.key.ik === excludeIk) continue;
    xs.push(k.anchorX, k.lx);
    ys.push(k.anchorY, k.ly);
  }
  xs.push(layout.canvas.w / 2, layout.art.x + layout.art.w / 2);
  ys.push(layout.canvas.h / 2, layout.art.y + layout.art.h / 2);
  return { xs, ys };
}

// Nearest target within `dist`, or null. `dist` is in canvas units (screen px / scale).
function nearestSnap(value, targets, dist) {
  let best = null, bestD = dist;
  for (const t of targets) {
    const d = Math.abs(value - t);
    if (d <= bestD) { bestD = d; best = t; }
  }
  return best;
}

function onLeaderDrag(event) {
  const drag = state.leaderDrag;
  if (!drag) return;
  const p = svgPoint(drag.svg, event);
  const bypass = event.shiftKey;
  const dx = p.x - drag.start.x;
  const dy = p.y - drag.start.y;
  const { target, key, base } = drag;
  // Smart-guide threshold in screen px, converted to canvas units via the live scale so
  // the snap zone feels the same regardless of how small the side-by-side device renders.
  const ctm = drag.svg.getScreenCTM && drag.svg.getScreenCTM();
  const snapDist = SNAP_SCREEN_PX / ((ctm && ctm.a) || 1);
  const layout = computeLeaderLayout(drag.profile);   // other elements are unaffected mid-drag
  const targets = bypass ? { xs: [], ys: [] } : collectSnapTargets(layout, key && key.ik);
  const guides = [];
  // Apply grid snap first, then let a nearby alignment target override it and record a guide.
  const guideX = (val) => { const s = nearestSnap(val, targets.xs, snapDist); if (s != null) { guides.push({ axis: "x", value: s }); return s; } return val; };
  const guideY = (val) => { const s = nearestSnap(val, targets.ys, snapDist); if (s != null) { guides.push({ axis: "y", value: s }); return s; } return val; };

  if (target.type === "art-move") {
    let x = snap(base.x + dx, bypass), y = snap(base.y + dy, bypass);
    // snap the PNG's CENTER to alignment lines, then back out to its top-left.
    const cx = guideX(x + base.w / 2), cy = guideY(y + base.h / 2);
    x = cx - base.w / 2; y = cy - base.h / 2;
    drag.profile.art.x = round2(x); drag.profile.art.y = round2(y);
  } else if (target.type === "art-resize") {
    drag.profile.art.w = Math.max(ART_MIN, snap(base.w + dx, bypass));
    drag.profile.art.h = Math.max(ART_MIN, snap(base.h + dy, bypass));
  } else if (target.type === "anchor" && key) {
    const a = drag.profile.art;
    const x = guideX(snap(a.x + (base.ax / 100) * a.w + dx, bypass));
    const y = guideY(snap(a.y + (base.ay / 100) * a.h + dy, bypass));
    key.ax = clamp(round2(((x - a.x) / a.w) * 100), 0, 100);
    key.ay = clamp(round2(((y - a.y) / a.h) * 100), 0, 100);
  } else if (target.type === "label" && key) {
    key.lx = round2(guideX(snap(base.lx + dx, bypass)));
    key.ly = round2(guideY(snap(base.ly + dy, bypass)));
  }
  drag.moved = true;
  redrawEditing(drag.svg, drag.profile);
  drawGuides(drag.svg, layout, guides);
}

// Draw the live alignment guides (full-canvas dashed lines) on top of the scene.
function drawGuides(svg, layout, guides) {
  if (!guides.length) return;
  const rootEl = svg.querySelector("g");
  if (!rootEl) return;
  for (const gd of guides) {
    rootEl.appendChild(gd.axis === "x"
      ? svgNode("line", { class: "leader-guide", x1: gd.value, y1: 0, x2: gd.value, y2: layout.canvas.h })
      : svgNode("line", { class: "leader-guide", x1: 0, y1: gd.value, x2: layout.canvas.w, y2: gd.value }));
  }
}

function endLeaderDrag() {
  const drag = state.leaderDrag;
  if (!drag) return;
  drag.svg.removeEventListener("pointermove", onLeaderDrag);
  state.leaderDrag = null;
  // Final redraw with no guides so the last tick's alignment lines don't linger.
  redrawEditing(drag.svg, drag.profile);
  if (drag.moved) markProfileDirty(drag.profile.id);
}

const round2 = (n) => Math.round(n * 100) / 100;
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

function markProfileDirty(id) {
  state.dirtyProfiles.add(id);
  updateEditorBar();
}

// Replace a control's button caption (RB/LT/X/A/START/R3/…). Inline prompt is
// adequate for a local authoring tool; the label is free text.
function promptLabelText(profile, ik) {
  const key = profile.keys.find((k) => k.ik === ik);
  if (!key) return;
  const next = window.prompt(t("editLabelPrompt", { ik }), key.label || "");
  if (next == null) return;            // cancelled
  key.label = next.trim();
  markProfileDirty(profile.id);
  renderDeviceView();
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
    : `<div class="assign">
         <p class="muted">${escapeHtml(t("unbound"))}</p>
         <input class="assign-search" type="search" placeholder="${escapeHtml(t("assignSearch"))}" aria-label="${escapeHtml(t("assignSearch"))}">
         <div class="assign-list" role="listbox"></div>
       </div>`;
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

  if (!cmds.length) wireAssignPicker(pop, ik); // free key: offer to bind a command

  if (conflicts.length) highlightConflicts(ik);

  document.addEventListener("keydown", onPopoverKeydown);
  // Defer so the opening click itself doesn't immediately close the popover.
  setTimeout(() => document.addEventListener("click", onOutsideClick, true), 0);
}

// Free-key popover: a searchable command picker so a physical key with no binding
// (e.g. M4) can be assigned a command straight from the device scheme. Picking a command
// reuses the remap dialog with this key prefilled, so the apply/backup/rescan path is shared.
function wireAssignPicker(pop, ik) {
  const search = pop.querySelector(".assign-search");
  const list = pop.querySelector(".assign-list");
  if (!list) return;
  const all = [...scan.commands].sort((a, b) => commandTitleText(a).localeCompare(commandTitleText(b)));
  const render = (q) => {
    const query = (q || "").trim().toLowerCase();
    const matches = all.filter((c) =>
      !query || commandTitleText(c).toLowerCase().includes(query) || c.id.toLowerCase().includes(query)
    ).slice(0, 50);
    list.innerHTML = matches.map((c) =>
      `<button class="assign-item" data-cmd="${escapeHtml(c.id)}">` +
      `<span class="assign-name">${escapeHtml(commandTitleText(c))}</span>` +
      `<span class="assign-id">${escapeHtml(c.id)}</span></button>`
    ).join("") || `<p class="muted assign-empty">${escapeHtml(t("assignNoMatch"))}</p>`;
    list.querySelectorAll(".assign-item").forEach((b) =>
      b.addEventListener("click", () => assignKeyToCommand(ik, b.dataset.cmd)));
  };
  render("");
  search && search.addEventListener("input", () => render(search.value));
}

function assignKeyToCommand(ik, commandId) {
  closePopover();
  openRemap(commandId);
  if (els.newKey) { els.newKey.value = ik; renderRemapPreview(); }
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
  if (profile.artwork) return renderLeaderDevice(profile, "mouse-svg artwork-svg");
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
  if (profile.artwork) return renderLeaderDevice(profile, "gamepad-svg artwork-svg");
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

// Leader-line artwork devices (mouse/gamepad): the PNG sits between two label
// columns and every control's bound action(s) are parked in a column, tied to the
// control by an orthogonal (90°) leader line — the in-game "Controller Scheme"
// look, instead of stamping labels onto the device. Anchors come from ax/ay
// (percent of the PNG) in the profile; applyLeaderLabels fills the action text
// once scan data is known.
// Geometry is in viewBox units ≈ on-screen px. The horizontal line length is
// `gap + (ax%)·art.w` (independent of `col`), so `gap` — not `col` — is the lever
// for short lines; `col` is purely the action-text width budget and is kept wide
// enough that long names ("Schnellzugriff-Gegenstand benutzen") don't clip at the
// SVG edge. `minPitch` is the min vertical gap between two labels so a stacked
// head + action block never overlaps its neighbour.
//
// PER-PROFILE OVERRIDES (fixes "die maus ist jetzt viel zu klein"): the side-by-side
// devices are sized by viewBox width, and on-screen photo width ≈ art.w / Σ(viewBox
// widths) — so a wide empty text budget shrinks the device. The mouse only carries
// short labels (Left/Right/Wheel + ~1 action word), so it overrides `col` to a narrow
// value and bumps its own art.w (in profile.json), making the photo prominent instead
// of lost in whitespace. The gamepad keeps the wide budget for its long German action
// names. Render reads `profile.leader.<field> ?? LEADER.<field>`.
const LEADER = { col: 420, gap: 28, pad: 28, mark: 8, minPitch: 72, maxLines: 2, lineH: 26 };
// Default label font metrics (mirror styles.css .leader-action / .leader-head). The
// editor's fontSize override is expressed relative to LEADER_BASE_FONT (the primary
// action line); the head caption + line pitch scale proportionally.
const LEADER_BASE_FONT = 24;
const LEADER_HEAD_FONT = 24; // button caption (RB/A/X/M4…) — same size as the action font

// Resolve a leader geometry field, letting each profile override the global default
// (e.g. the mouse uses a much narrower text column than the gamepad).
function leaderOpt(profile, field) {
  const ov = profile && profile.leader;
  return ov && ov[field] != null ? ov[field] : LEADER[field];
}

// Place each label as close to its control's anchor height as possible, then push
// overlapping neighbours down by minPitch and recenter the column on the anchor band
// so lines stay short and balanced. Replaces the old even-index spread that dumped a
// few labels across the full device height (dead space + long, fanned-out lines).
// `keys` must already be sorted by ay ascending. Returns one labelY per key.
function layoutLabelColumn(keys, devY, artH, minPitch) {
  const ideal = keys.map((k) => devY + (k.ay / 100) * artH);
  const y = ideal.slice();
  for (let i = 1; i < y.length; i++) {
    if (y[i] < y[i - 1] + minPitch) y[i] = y[i - 1] + minPitch;
  }
  // The push-down only moves labels DOWN, biasing the column low. Shift the whole
  // column up by the mean displacement so labels straddle their anchors symmetrically.
  if (y.length) {
    let mean = 0;
    for (let i = 0; i < y.length; i++) mean += y[i] - ideal[i];
    mean /= y.length;
    for (let i = 0; i < y.length; i++) y[i] -= mean;
  }
  return y;
}

// Gap (viewBox units) between a label's text edge and where its leader line attaches,
// so the line never touches the glyphs. Matched to the old fixed ±8 column inset.
const LABEL_GAP = 8;

// Pure geometry for a leader-line device. Returns canvas/art rects and per-key
// {anchorX, anchorY, lx, ly, sign, textAnchor} in canvas units — no DOM, so it is
// reusable for rendering, for the layout editor's hit-testing, and for seeding.
//
// Two branches, never mixed (the advisor's "don't run two positioning systems live"):
//   - EXPLICIT (profile.canvas + profile.art): the editor's authored output. Every
//     label position is stored (lx/ly), so render is a pure read and a dragged label
//     can't be clobbered by a re-run of the auto-layout.
//   - LEGACY (no canvas): the original auto-layout. Used to RENDER un-seeded profiles
//     and, run once, to SEED the explicit model (computeLeaderSeed writes it back).
function computeLeaderLayout(profile) {
  if (profile.canvas && profile.art) {
    const art = { ...profile.art };
    const keys = profile.keys.map((key) => {
      const anchorX = art.x + (key.ax / 100) * art.w;
      const anchorY = art.y + (key.ay / 100) * art.h;
      const lx = key.lx, ly = key.ly;
      // Which side the label sits on is derived from its position, so dragging a
      // label across the device flips the leader attach edge + text alignment for free.
      const sign = (anchorX - lx) >= 0 ? 1 : -1;
      return { key, anchorX, anchorY, lx, ly, sign, textAnchor: sign > 0 ? "end" : "start" };
    });
    return { canvas: { ...profile.canvas }, art, keys };
  }

  const art = profile.artworkSize || { w: 800, h: 560 };
  // Text-column width is resolved PER SIDE: a device may carry short labels on one
  // side and long ones on the other (the mouse has 1-word actions left, but
  // "Schnellzugriff-Gegenstand benutzen" right). A single narrow col would clip the
  // long side, so colLeft/colRight default to `col`, and a profile can widen just the
  // side that needs it without bloating the empty side (which would shrink the photo).
  const col = leaderOpt(profile, "col");
  const colLeft = leaderOpt(profile, "colLeft") ?? col;
  const colRight = leaderOpt(profile, "colRight") ?? col;
  const minPitch = leaderOpt(profile, "minPitch");
  const { gap, pad, lineH } = LEADER;
  const x0 = pad + colLeft + gap;             // device left edge
  const totalW = pad + colLeft + gap + art.w + gap + colRight + pad;
  const sides = { left: [], right: [] };
  for (const key of profile.keys) sides[key.side === "right" ? "right" : "left"].push(key);
  sides.left.sort((a, b) => a.ay - b.ay);
  sides.right.sort((a, b) => a.ay - b.ay);

  // First pass with the device top at `pad`; measure how far the anchor-bound labels
  // reach above/below the device, then size the canvas and offset everything to fit.
  const devY0 = pad;
  const colY = {
    left: layoutLabelColumn(sides.left, devY0, art.h, minPitch),
    right: layoutLabelColumn(sides.right, devY0, art.h, minPitch)
  };
  const allY = [...colY.left, ...colY.right];
  const labelReach = 1.5 * lineH;             // a stacked label reaches ~1.5 lines above/below its y
  const top = allY.length ? Math.min(devY0, ...allY.map((v) => v - labelReach)) : devY0;
  const bottom = allY.length ? Math.max(devY0 + art.h, ...allY.map((v) => v + labelReach)) : devY0 + art.h;
  const offset = pad - top;                   // shift so the highest element sits at `pad`
  const devY = devY0 + offset;
  const totalH = (bottom - top) + 2 * pad;

  const keys = [];
  for (const side of ["left", "right"]) {
    const sideKeys = sides[side];
    const labelEndX = side === "left" ? pad + colLeft : totalW - pad - colRight;
    sideKeys.forEach((key, i) => {
      const anchorX = x0 + (key.ax / 100) * art.w;
      const anchorY = devY + (key.ay / 100) * art.h;
      const ly = colY[side][i] + offset;
      // lx is the text edge; the leader attaches LABEL_GAP closer to the device, which
      // reproduces the old labelEndX exactly (textX = labelEndX ∓ LABEL_GAP).
      const lx = side === "left" ? labelEndX - LABEL_GAP : labelEndX + LABEL_GAP;
      keys.push({ key, anchorX, anchorY, lx, ly, sign: side === "left" ? 1 : -1, textAnchor: side === "left" ? "end" : "start" });
    });
  }
  return { canvas: { w: totalW, h: totalH }, art: { x: x0, y: devY, w: art.w, h: art.h }, keys };
}

// Build the image + per-key (leader line, anchor dot, label) into rootEl from a
// precomputed layout. Split out of renderLeaderDevice so the layout editor can redraw
// the scene in place on every drag (the svg-level pointer listener stays attached
// because only rootEl's children are rebuilt, not the svg).
function buildLeaderSceneInto(rootEl, layout, profile) {
  const { art, keys } = layout;
  const { mark } = LEADER;
  rootEl.appendChild(svgNode("image", {
    class: "device-artwork", href: profile.artwork,
    x: art.x, y: art.y, width: art.w, height: art.h, preserveAspectRatio: "xMidYMid meet"
  }));
  for (const { key, anchorX, anchorY, lx, ly, sign, textAnchor } of keys) {
    const attachX = lx + LABEL_GAP * sign;
    const g = svgNode("g", { class: `key leader-key side-${sign > 0 ? "left" : "right"}`, "data-key": key.ik, tabindex: "0", role: "button" });
    g.setAttribute("aria-label", t("keyUnbound", { label: key.label || key.ik }));
    // Horizontal from the label, then a single 90° bend straight down/up to the control
    // (vertical sits exactly over the anchor) — the in-game controller-scheme look.
    g.appendChild(svgNode("polyline", {
      class: "leader-line",
      points: `${attachX},${ly} ${anchorX},${ly} ${anchorX},${anchorY}`
    }));
    // the anchor dot doubles as the .key-shape applyColoring/applyConflicts drive
    g.appendChild(svgNode("circle", { class: "key-shape", cx: anchorX, cy: anchorY, r: mark }));
    const text = svgNode("text", { class: "key-label leader-label", x: lx, y: ly, "text-anchor": textAnchor });
    if (key.fontSize) text.setAttribute("font-size", key.fontSize);
    const head = svgNode("tspan", { class: "leader-head", x: lx });
    head.textContent = key.label || key.ik;
    text.appendChild(head);
    g.appendChild(text);
    rootEl.appendChild(g);
  }
}

function renderLeaderDevice(profile, extraClass) {
  const layout = computeLeaderLayout(profile);
  const svg = svgNode("svg", { class: `device-svg leader-svg ${extraClass}`, viewBox: `0 0 ${layout.canvas.w} ${layout.canvas.h}`, role: "group" });
  svg.setAttribute("aria-label", profile.name);
  const rootEl = svgNode("g", {});
  svg.appendChild(rootEl);
  buildLeaderSceneInto(rootEl, layout, profile);
  return svg;
}

// The action names bound to a control, deduped (one control often carries the same
// command across several gameplay contexts). For the controller-scheme diagram we
// only surface REAL action names (displayNameSource localized/curated) and drop raw
// engine ids — the in-game "Controller Scheme" shows clean action words, never code
// names like SCAARDodge/AltQuenCasting/CiriHolster*/ComboDigit*/Alternate. The full
// list (including internal helpers) stays one click away in the key popover, so this
// is progressive disclosure, not data loss. See user complaint: "Beschriftungen ...
// beschissen". (Popover keeps using commandTitleText for the complete list.)
function boundActionNames(ik, scan) {
  if (!scan || !scan.commands) return [];
  const names = scan.commands
    .filter((command) => command.keys.some((key) => key.key === ik) && hasResolvedName(command))
    .map((command) => command.displayName);
  return [...new Set(names)].filter(Boolean);
}

// Fill each leader label, in-game "Controller Scheme" style: the ACTION NAME is the
// primary, well-readable line; the physical button (label) sits above it as a small,
// dimmed caption — the colored glyph on the device already says which button it is.
// Action names are resolved-only (boundActionNames drops raw engine ids and the "+N"
// counter); the full list stays in the click popover (progressive disclosure).
// Keep a binding colour's HUE (so the caption still reads as its category — vanilla
// movement/action/menu, mod, unbound) but lift dark tones toward light so they stay
// legible on the near-black controller stage. Pure category colour made M4 (unbound,
// near-black) and the dim sage movements unreadable; flat light text lost the colour
// coding the user wants. This brightens without desaturating the hue.
function readableOnDark(raw) {
  const m = /#?([0-9a-fA-F]{6})/.exec(raw || "");
  if (!m) return "#e8dfca";
  let r = parseInt(m[1].slice(0, 2), 16), g = parseInt(m[1].slice(2, 4), 16), b = parseInt(m[1].slice(4, 6), 16);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const target = 165; // minimum perceived brightness for a caption on the dark stage
  if (lum < target) {
    const t = Math.min(0.82, (target - lum) / 255 + 0.22);
    r = Math.round(r + (255 - r) * t); g = Math.round(g + (255 - g) * t); b = Math.round(b + (255 - b) * t);
  }
  return `rgb(${r}, ${g}, ${b})`;
}

function applyLeaderLabels(svg, profile, scan) {
  if (!svg) return;
  const maxLines = leaderOpt(profile, "maxLines");
  // Default label metrics come from CSS (head 15px, action 24px, lineH 26). When a
  // profile carries an explicit fontSize (the editor's A−/A+ control), it scales the
  // whole block: tspan px are set inline and lineH scales with it. Without fontSize the
  // tspans stay unstyled so CSS renders exactly as before (default unchanged).
  const fs = profile.fontSize;
  const scale = fs ? fs / LEADER_BASE_FONT : 1;
  const lineH = LEADER.lineH * scale;
  svg.querySelectorAll("[data-key]").forEach((g) => {
    const text = g.querySelector(".leader-label");
    if (!text) return;
    const ik = g.getAttribute("data-key");
    const key = profile.keys.find((item) => item.ik === ik);
    const textX = text.getAttribute("x");
    const isBound = !!(scan && scan.commands && scan.commands.some((c) => c.keys.some((k) => k.key === ik)));
    let lines = boundActionNames(ik, scan).slice(0, maxLines);
    if (!lines.length && isBound) {
      // Bound only to unresolved (mod/engine) actions like SCAARDodge: still show it IS
      // bound (its humanized name) instead of a blank "—" that looks like a free button.
      const raw = scan.commands.filter((c) => c.keys.some((k) => k.key === ik)).map((c) => c.displayName).filter(Boolean);
      lines = [...new Set(raw)].slice(0, maxLines);
    }
    if (!lines.length) lines.push("—");
    text.textContent = ""; // rebuild tspans for the new binding state
    // Lift a near-black unbound anchor dot so the marker (e.g. M4) is clearly visible.
    if (!isBound) {
      const dot = g.querySelector(".key-shape");
      dot && dot.style && dot.style.setProperty("fill", "#6b655b");
    }
    // Center the head+actions block vertically on the label's anchor row.
    const total = 1 + lines.length;
    const head = svgNode("tspan", { class: "leader-head", x: textX, dy: -((total - 1) * lineH) / 2 });
    if (fs) head.setAttribute("font-size", round2(LEADER_HEAD_FONT * scale));
    // Colour the caption by its binding category, brightened to stay readable on the dark
    // stage. Set via inline style (not a fill attribute) so it beats the CSS .leader-head
    // fill rule — otherwise dark categories (unbound M4, the grey "other" of M5) showed raw.
    head.style.setProperty("fill", readableOnDark(g.style && g.style.getPropertyValue("--key-fill")));
    head.textContent = key ? (key.label || ik) : ik;
    text.appendChild(head);
    for (const name of lines) {
      const ts = svgNode("tspan", { class: "leader-action", x: textX, dy: lineH });
      if (fs) ts.setAttribute("font-size", round2(fs));
      ts.textContent = name;
      text.appendChild(ts);
    }
  });
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
    renderDeviceSvg, renderKeyboardSvg, renderMouseSvg, renderGamepadSvg, renderLeaderDevice, computeLeaderLayout, drawEditHandles,
    applyColoring, applyConflicts, applyLeaderLabels, boundActionNames, remapInputSettingsText, groupConflicts, buildRemapPreview
  };
}
