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
  layoutMode: document.querySelector("#layoutMode"),
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
  currentSvg: null,
  currentProfile: null,
  layoutMode: false,
  layoutDrag: null
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

// Witcher 3 repeats the same bindings across many context sections (Boat,
// Combat, Exploration, *_Replacer_Ciri …), so the per-section scanner reports
// the *same* logical conflict dozens of times. Group identical conflicts
// (same key + same command set) into one entry that lists the affected sections,
// instead of showing raw line numbers — much shorter and not "doppelt/dreifach".
function groupConflicts(conflicts) {
  const map = new Map();
  for (const c of conflicts) {
    const sig = `${c.key}|${[...c.commands].sort().join(",")}`;
    const existing = map.get(sig);
    if (!existing) {
      map.set(sig, {
        key: c.key, keyLabel: c.keyLabel, commands: c.commands,
        sources: c.sources || [], severity: c.severity, sections: [c.section]
      });
    } else {
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
  els.conflictCount.textContent = `${groups.length} Konflikte`;
  if (!groups.length) {
    els.conflicts.innerHTML = `<div class="empty muted">Keine Konflikte gefunden.</div>`;
    return;
  }
  // data-conflict-key lets the SVG popover scroll to & highlight the entry
  // (Requirement 5.5); sources[] shows vanilla vs. mod per command (Req 5.3).
  els.conflicts.innerHTML = groups.slice(0, 120).map((grp) => {
    const commandList = grp.commands.map((name, i) => {
      const src = grp.sources[i] || "unknown";
      return `<span class="compact-token" title="${escapeHtml(src)}">${escapeHtml(name)} <span>${escapeHtml(shortSource(src))}</span></span>`;
    }).join("");
    const shown = grp.sections.slice(0, 3).map(escapeHtml).join(", ");
    const extra = grp.sections.length > 3 ? ` +${grp.sections.length - 3} weitere` : "";
    const count = grp.sections.length > 1 ? ` · ${grp.sections.length} Sektionen` : "";
    const severity = grp.severity === "high" ? "Kritisch" : "Kontext";
    return `
    <article class="conflict ${grp.severity}" data-conflict-key="${escapeHtml(grp.key)}" tabindex="0">
      <div class="compact-key">
        <strong>${escapeHtml(grp.keyLabel)}</strong>
        <span>${escapeHtml(severity)}</span>
      </div>
      <div class="compact-main">${commandList}</div>
      <div class="compact-meta">${shown}${extra}${count}</div>
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
    const actions = command.actions.length > 2
      ? `${command.actions.slice(0, 2).join(", ")} +${command.actions.length - 2}`
      : command.actions.join(", ");
    return `
      <article class="command">
        <div class="compact-main">
          <div class="commandTitle">${escapeHtml(command.id)}</div>
          <span class="source">${escapeHtml(command.displayName)} · ${escapeHtml(shortSource(command.source))}</span>
        </div>
        <div class="compact-keys">${keys.map((key) => keyChip(key)).join("")}</div>
        <div class="compact-meta" title="${escapeHtml(command.actions.join(", "))}">${escapeHtml(actions)}</div>
        <button class="compact-action" data-remap="${escapeHtml(command.id)}">Ändern</button>
      </article>
    `;
  }).join("");

  document.querySelectorAll("[data-remap]").forEach((button) => {
    button.addEventListener("click", () => openRemap(button.dataset.remap));
  });
}

function keyChip(key) {
  const hold = key.state === "Duration" ? ` halten ${key.idleTime || ""}s` : "";
  return `<span class="chip ${key.device}" title="${escapeHtml(key.key || "")}">${escapeHtml(key.label)}${escapeHtml(hold)}</span>`;
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

  els.layoutMode?.addEventListener("click", () => {
    if (state.activeDevice === "keyboard") return;
    state.layoutMode = !state.layoutMode;
    closePopover();
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
  if (device === "keyboard") return "Tastatur";
  if (device === "controllers") return "Maus/Gamepad";
  return device === "mouse" ? "Maus" : "Gamepad";
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
    showDeviceEmpty("Kein Tastaturlayout erkannt — bitte Layout wählen.");
    return;
  }
  if (!deviceHasBindings(state.activeDevice)) {
    showDeviceEmpty(`Keine Belegung für „${deviceLabel(state.activeDevice)}" gefunden.`);
    return;
  }

  const profiles = (await Promise.all(activeProfileIds().map((id) => getProfile(id)))).filter(Boolean);
  if (!profiles.length) { showDeviceEmpty("Geräteprofil konnte nicht geladen werden."); return; }

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
    console.warn("Layout-Overrides konnten nicht geladen werden", error);
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
    console.warn("Layout-Override konnte nicht gespeichert werden", error);
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
  g.setAttribute("aria-label", `${key.label || key.ik}: unbelegt`);
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
    applyColoring, applyConflicts
  };
}
