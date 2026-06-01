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
  remapForm: document.querySelector("#remapForm")
} : {};

async function load() {
  const response = await fetch("/api/scan");
  scan = await response.json();
  if (!response.ok) throw new Error(scan.error || "Scan fehlgeschlagen");
  render();
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
  els.conflicts.innerHTML = scan.conflicts.slice(0, 80).map((conflict) => `
    <article class="conflict ${conflict.severity}">
      <div>
        <div class="commandTitle">${escapeHtml(conflict.keyLabel)}</div>
        <span class="source">${escapeHtml(conflict.section)} | Zeilen ${conflict.lines.join(", ")}</span>
      </div>
      <div class="chips">${conflict.commands.map((name) => `<span class="chip">${escapeHtml(name)}</span>`).join("")}</div>
      <div class="muted">${conflict.severity === "high" ? "Kritisch prüfen" : "Kontext-Doppelbelegung"}</div>
      <div></div>
    </article>
  `).join("");
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
    computeTopMods, buildColorMap, buildLegend, COLORS, MOD_PALETTE
  };
}
