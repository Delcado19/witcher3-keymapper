let scan = null;
let activeCommand = null;

const els = {
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
};

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
    alert(result.error || "Remap fehlgeschlagen");
    return;
  }
  els.dialog.close();
  alert(`Geändert: ${result.changed} Zeilen\nBackup: ${result.backup}`);
  await load();
});

els.search.addEventListener("input", renderCommands);
els.sourceFilter.addEventListener("change", renderCommands);
els.deviceFilter.addEventListener("change", renderCommands);
els.refresh.addEventListener("click", load);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

load().catch((error) => {
  document.body.innerHTML = `<main><h1>Fehler</h1><p>${escapeHtml(error.message)}</p></main>`;
});
