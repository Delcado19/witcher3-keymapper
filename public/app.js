let scan = null;
let activeCommand = null;

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
  loadingBar: document.querySelector("#loadingBar")
} : {};

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
  currentSvg: null
};

async function load() {
  showLoading(true);
  try {
    // Scan, hardware detection and the device registry load in parallel (design.md
    // "Datenfluss beim Seitenstart"). Devices/registry degrade gracefully.
    const [scanRes, devRes, registry] = await Promise.all([
      fetch("/api/scan"),
      fetch("/api/devices").catch(() => null),
      state.registry.length ? Promise.resolve(state.registry) : loadRegistry().catch(() => [])
    ]);
    scan = await scanRes.json();
    if (!scanRes.ok) throw new Error(scan.error || "Scan fehlgeschlagen");
    state.registry = Array.isArray(registry) ? registry : [];
    if (devRes && devRes.ok) {
      const dev = await devRes.json();
      state.devices = dev.devices || [];
      state.inputLanguage = dev.inputLanguage || null;
    } else if (devRes === null) {
      showToast("Hardware-Erkennung nicht verfügbar", "info");
    }
    resolveKeyboardProfile();
    render();
    await renderDeviceView();
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
  els.paths.textContent = `${scan.paths.inputSettings} | Mods: ${scan.paths.modsDir}`;
  els.stats.innerHTML = [
    ["Bindings", scan.stats.bindings],
    ["Aktionen", scan.stats.actions],
    ["Befehle", scan.stats.commands],
    ["Sektionen", scan.stats.sections],
    ["Tasten", scan.stats.keys],
    ["Mod-Actions", scan.stats.modActions]
  ].map(([label, value]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join("");

  const currentSource = els.sourceFilter.value;
  const sources = [...new Set(scan.commands.map((item) => item.source))].sort();
  els.sourceFilter.innerHTML = `<option value="">Alle Quellen</option>${sources.map((source) => {
    return `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`;
  }).join("")}`;
  els.sourceFilter.value = currentSource;

  renderConflicts();
  renderCommands();
}

function renderConflicts() {
  els.conflictCount.textContent = `${scan.conflicts.length} Treffer`;
  if (!scan.conflicts.length) {
    els.conflicts.innerHTML = `<div class="empty muted">Keine Konflikte gefunden.</div>`;
    return;
  }
  // data-conflict-key lets the SVG popover scroll to & highlight the entry
  // (Requirement 5.5); sources[] shows vanilla vs. mod per command (Req 5.3).
  els.conflicts.innerHTML = scan.conflicts.slice(0, 80).map((conflict) => {
    const chips = conflict.commands.map((name, i) => {
      const src = (conflict.sources && conflict.sources[i]) || "unknown";
      return `<span class="chip" title="${escapeHtml(src)}">${escapeHtml(name)} <span class="chip-src">${escapeHtml(shortSource(src))}</span></span>`;
    }).join("");
    return `
    <article class="conflict ${conflict.severity}" data-conflict-key="${escapeHtml(conflict.key)}" tabindex="0">
      <div>
        <div class="commandTitle">${escapeHtml(conflict.keyLabel)}</div>
        <span class="source">${escapeHtml(conflict.section)} | Zeilen ${conflict.lines.join(", ")}</span>
      </div>
      <div class="chips">${chips}</div>
      <div class="muted">${conflict.severity === "high" ? "Kritisch prüfen" : "Kontext-Doppelbelegung"}</div>
      <div></div>
    </article>`;
  }).join("");
}

function shortSource(src) {
  return src === "game/input.xml" ? "Vanilla" : src;
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

  els.resultCount.textContent = `${filtered.length} Treffer`;
  els.commands.innerHTML = filtered.map((command) => {
    const keys = command.keys.length ? command.keys : [{ label: "Ungebunden", device: "unbound", key: "IK_None" }];
    return `
      <article class="command">
        <div>
          <div class="commandTitle">${escapeHtml(command.id)}</div>
          <span class="source">${escapeHtml(command.displayName)} | ${escapeHtml(command.source)}</span>
        </div>
        <div class="chips">${keys.map((key) => keyChip(key)).join("")}</div>
        <div class="muted">${escapeHtml(command.actions.join(", "))}</div>
        <button data-remap="${escapeHtml(command.id)}">Ändern</button>
      </article>
    `;
  }).join("");

  document.querySelectorAll("[data-remap]").forEach((button) => {
    button.addEventListener("click", () => openRemap(button.dataset.remap));
  });
}

function keyChip(key) {
  const hold = key.state === "Duration" ? ` halten ${key.idleTime || ""}s` : "";
  return `<span class="chip ${key.device}">${escapeHtml(key.label)}${escapeHtml(hold)}</span>`;
}

function openRemap(commandId) {
  activeCommand = scan.commands.find((command) => command.id === commandId);
  if (!activeCommand) return;
  els.remapTitle.textContent = `${activeCommand.id} ändern`;
  els.remapText.textContent = `Ändert alle Bindings der Actions: ${activeCommand.actions.join(", ")}`;
  els.newKey.value = "";
  els.dialog.showModal();
}

if (typeof document !== "undefined") {
  els.remapForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeCommand) return;
    const response = await fetch("/api/remap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actions: activeCommand.actions, newKey: els.newKey.value })
    });
    const result = await response.json();
    if (!response.ok) {
      // Toast instead of alert() (Task 8 / Requirement 9.6).
      showToast(result.error || "Remap fehlgeschlagen", "error");
      return;
    }
    els.dialog.close();
    showToast(`Geändert: ${result.changed} Zeilen · Backup: ${result.backup}`, "success");
    await load();
  });

  els.search.addEventListener("input", renderCommands);
  els.sourceFilter.addEventListener("change", renderCommands);
  els.deviceFilter.addEventListener("change", renderCommands);
  els.refresh.addEventListener("click", load);

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
  return device === "keyboard" ? "Tastatur" : device === "mouse" ? "Maus" : "Gamepad";
}

function deviceHasBindings(device) {
  return scan.commands.some((c) => c.keys.some((k) => k.device === device && k.key !== "IK_None"));
}

function activeProfileId() {
  if (state.activeDevice === "mouse") return "mouse-5btn";
  if (state.activeDevice === "gamepad") return "xbox-ctrl";
  return state.keyboardProfileId;
}

async function getProfile(id) {
  if (!id) return null;
  if (state.profileCache.has(id)) return state.profileCache.get(id);
  const profile = await loadProfile(id);
  if (profile) state.profileCache.set(id, profile);
  return profile;
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
  if (isKeyboard && state.showLayoutDropdown && !state.keyboardProfileId) {
    showDeviceEmpty("Kein Tastaturlayout erkannt — bitte Layout wählen.");
    return;
  }
  if (!deviceHasBindings(state.activeDevice)) {
    showDeviceEmpty(`Keine Belegung für „${deviceLabel(state.activeDevice)}" gefunden.`);
    return;
  }

  const profile = await getProfile(activeProfileId());
  if (!profile) { showDeviceEmpty("Geräteprofil konnte nicht geladen werden."); return; }
  const svg = renderDeviceSvg(profile);
  if (!svg) return; // SVG failed -> toast already shown, keep previous view

  applyColoring(svg, state.colorMap, scan);
  applyConflicts(svg, scan.conflicts);
  attachKeyInteractions(svg);

  els.deviceEmpty.classList.add("hidden");
  els.deviceSvg.innerHTML = "";
  els.deviceSvg.appendChild(svg);
  state.currentSvg = svg;
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
    `<span class="legend-item"><span class="legend-swatch" style="--sw:${item.color}"></span>${escapeHtml(item.label)}</span>`
  ).join("");
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
    g.addEventListener("click", () => openPopover(ik, g));
    g.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openPopover(ik, g); }
    });
  });
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
          <div><div class="commandTitle">${escapeHtml(c.id)}</div><span class="source">${escapeHtml(shortSource(c.source))}</span></div>
          <div class="pop-actions">
            <button data-act="remap" data-cmd="${escapeHtml(c.id)}">Ändern</button>
            <button data-act="clear" data-cmd="${escapeHtml(c.id)}" class="danger">Löschen</button>
          </div>
        </div>`).join("")
    : `<p class="muted">Unbelegt</p>`;
  const conflictNote = conflicts.length
    ? `<div class="pop-conflict">⚠ Konflikt in: ${escapeHtml([...new Set(conflicts.map((c) => c.section))].join(", "))}</div>`
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
    button.textContent = "Wirklich? (Backup + löschen)";
    return;
  }
  clearBinding(ik, commandId);
}

async function clearBinding(ik, commandId) {
  const command = scan.commands.find((c) => c.id === commandId);
  if (!command) return;
  showLoading(true);
  try {
    // oldKey restricts the null-out to THIS key, not every binding of the action.
    const res = await fetch("/api/remap", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ actions: command.actions, newKey: "IK_None", oldKey: ik })
    });
    const result = await res.json();
    if (!res.ok) { showToast(result.error || "Löschen fehlgeschlagen", "error"); return; }
    closePopover();
    showToast(`Gelöscht: ${result.changed} Binding(s) · Backup: ${result.backup}`, "success");
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
  vanilla: "#d2a657",   // game/input.xml
  other: "#6b7280",     // mods outside the top 5
  high: "#ef4444",      // high-severity conflict
  medium: "#f59e0b",    // medium-severity conflict / multi-source key
  unbound: "#2a2f3a"    // neutral / no binding
};
const MOD_PALETTE = ["#4e9af1", "#a78bfa", "#34d399", "#fb923c", "#f472b6"];

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
  if (!res.ok) throw new Error("Geräte-Registry konnte nicht geladen werden");
  const data = await res.json();
  return Array.isArray(data) ? data : (data.profiles || []);
}

async function loadProfile(profileId) {
  const res = await fetch(`/devices/${profileId}/profile.json`);
  if (!res.ok) throw new Error(`Geräteprofil "${profileId}" nicht gefunden`);
  const profile = await res.json();
  if (!validateProfile(profile)) {
    console.error(`Geräteprofil "${profileId}" ungültig: Pflichtfeld fehlt`);
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

// Build IK_* -> colour map from scan commands + conflicts (Requirement 4.1–4.5).
function buildColorMap(commands, conflicts) {
  const topMods = computeTopMods(commands);
  const modColor = new Map(topMods.map((mod) => [mod.source, mod.color]));

  const ikSources = new Map(); // IK_* -> Set(source)
  for (const command of commands) {
    for (const key of command.keys || []) {
      if (!key.key || key.key === "IK_None") continue;
      if (!ikSources.has(key.key)) ikSources.set(key.key, new Set());
      ikSources.get(key.key).add(command.source);
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
    if (sources.size > 1) { map.set(ik, COLORS.medium); continue; } // multi-source = conflict
    const only = [...sources][0];
    if (only === "game/input.xml") map.set(ik, COLORS.vanilla);
    else if (modColor.has(only)) map.set(ik, modColor.get(only));
    else map.set(ik, COLORS.other);
  }
  return map;
}

function buildLegend(topMods, hasOther, hasVanilla) {
  const items = [];
  if (hasVanilla) items.push({ label: "Vanilla", color: COLORS.vanilla });
  for (const mod of topMods) items.push({ label: mod.source, color: mod.color });
  if (hasOther) items.push({ label: "Sonstige Mods", color: COLORS.other });
  items.push({ label: "Konflikt", color: COLORS.high });
  items.push({ label: "Unbelegt", color: COLORS.unbound });
  return items;
}

/* ---------------- Tasks 5 & 6: SVG_Renderer ---------------- */
const UNIT = 54;  // px per key unit
const PAD = 8;    // viewBox padding
const RADIUS = 6; // key corner radius

function svgNode(tag, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
}

// L-shaped ISO-Enter path: full width on the top row, inset on the lower stem.
function isoEnterPath(x, y, w, h) {
  const X = x * UNIT, Y = y * UNIT, W = w * UNIT, H = h * UNIT;
  const notch = 0.25 * UNIT, rowH = UNIT;
  return `M${X} ${Y} h${W} v${H} h${-(W - notch)} v${-(H - rowH)} h${-notch} Z`;
}

function buildKeyEl(key) {
  const g = svgNode("g", { class: "key", "data-key": key.ik, tabindex: "0", role: "button" });
  g.setAttribute("aria-label", `${key.label || key.ik}: unbelegt`);
  const shape = key.shape === "iso-enter"
    ? svgNode("path", { d: isoEnterPath(key.x, key.y, key.w, key.h), class: "key-shape" })
    : svgNode("rect", {
        x: key.x * UNIT, y: key.y * UNIT,
        width: Math.max(key.w * UNIT - 2, 1), height: Math.max(key.h * UNIT - 2, 1),
        rx: RADIUS, class: "key-shape"
      });
  g.appendChild(shape);
  const text = svgNode("text", {
    x: key.x * UNIT + (key.w * UNIT) / 2 - 1,
    y: key.y * UNIT + (key.h * UNIT) / 2 - 1,
    class: "key-label", "text-anchor": "middle", "dominant-baseline": "central"
  });
  text.textContent = key.label || "";
  g.appendChild(text);
  return g;
}

function deviceViewBox(profile) {
  let w, h;
  if (profile.size && profile.size.w) { w = profile.size.w; h = profile.size.h; }
  else {
    w = Math.max(...profile.keys.map((k) => k.x + k.w));
    h = Math.max(...profile.keys.map((k) => k.y + k.h));
  }
  return `0 0 ${w * UNIT + PAD * 2} ${h * UNIT + PAD * 2}`;
}

// All three device types share the same key schema (x/y/w/h/shape), so one core
// builder serves keyboard, mouse and gamepad; wrappers add a device backdrop.
function buildDeviceSvg(profile, extraClass) {
  const svg = svgNode("svg", { class: `device-svg ${extraClass}`, viewBox: deviceViewBox(profile), role: "group" });
  svg.setAttribute("aria-label", profile.name);
  const root = svgNode("g", { transform: `translate(${PAD} ${PAD})` });
  svg.appendChild(root);
  for (const key of profile.keys) root.appendChild(buildKeyEl(key));
  return { svg, root };
}

function renderKeyboardSvg(profile) {
  return buildDeviceSvg(profile, "keyboard-svg").svg;
}

function renderMouseSvg(profile) {
  const { svg, root } = buildDeviceSvg(profile, "mouse-svg");
  const size = profile.size || { w: 4, h: 6 };
  const body = svgNode("rect", {
    x: -6, y: -6, width: size.w * UNIT + 12, height: size.h * UNIT + 12,
    rx: (size.w * UNIT) / 2, class: "device-body"
  });
  root.insertBefore(body, root.firstChild);
  return svg;
}

function renderGamepadSvg(profile) {
  const { svg, root } = buildDeviceSvg(profile, "gamepad-svg");
  const size = profile.size || { w: 10, h: 6 };
  const body = svgNode("rect", {
    x: -6, y: -6, width: size.w * UNIT + 12, height: size.h * UNIT + 12,
    rx: 48, class: "device-body"
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
    showToast(`SVG-Generierung fehlgeschlagen: ${error.message}`, "error");
    return null;
  }
}

function summarizeKey(ik, label, scanData) {
  if (!scanData) return `${label}: unbelegt`;
  const cmds = scanData.commands.filter((c) => c.keys.some((k) => k.key === ik));
  if (!cmds.length) return `${label}: unbelegt`;
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
  load().catch((error) => {
    document.body.innerHTML = `<main><h1>Fehler</h1><p>${escapeHtml(error.message)}</p></main>`;
  });
}

// Node-only export for unit/property tests of the pure helpers (no DOM needed).
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    validateProfile, loadRegistry, loadProfile, matchDevice,
    computeTopMods, buildColorMap, buildLegend, COLORS, MOD_PALETTE,
    renderDeviceSvg, renderKeyboardSvg, renderMouseSvg, renderGamepadSvg,
    applyColoring, applyConflicts, isoEnterPath
  };
}
