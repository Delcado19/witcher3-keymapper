const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { URL } = require("node:url");
const { execFile } = require("node:child_process");

const root = __dirname;
const publicDir = path.join(root, "public");

const defaults = {
  inputSettings: path.join(root, "input.settings"),
  gameInputXml: "F:\\GOG Galaxy\\Games\\The Witcher 3 Wild Hunt GOTY\\bin\\config\\r4game\\user_config_matrix\\pc\\input.xml",
  modsDir: "F:\\GOG Galaxy\\Games\\The Witcher 3 Wild Hunt GOTY\\Mods"
};

const keyLabels = new Map(Object.entries({
  IK_LeftMouse: "Left Mouse",
  IK_RightMouse: "Right Mouse",
  IK_MiddleMouse: "Middle Mouse",
  IK_Mouse4: "Mouse 4",
  IK_Mouse5: "Mouse 5",
  IK_MouseZ: "Mouse Wheel",
  IK_LShift: "Left Shift",
  IK_RShift: "Right Shift",
  IK_LControl: "Left Ctrl",
  IK_Alt: "Alt",
  IK_Escape: "Esc",
  IK_Space: "Space",
  IK_Tab: "Tab",
  IK_Backspace: "Backspace",
  IK_Enter: "Enter",
  IK_Tilde: "~",
  IK_NumPeriod: "Numpad .",
  IK_NumMinus: "Numpad -",
  IK_Pad_A_CROSS: "Gamepad A / Cross",
  IK_Pad_B_CIRCLE: "Gamepad B / Circle",
  IK_Pad_X_SQUARE: "Gamepad X / Square",
  IK_Pad_Y_TRIANGLE: "Gamepad Y / Triangle",
  IK_Pad_LeftTrigger: "Gamepad LT / L2",
  IK_Pad_RightTrigger: "Gamepad RT / R2",
  IK_Pad_LeftShoulder: "Gamepad LB / L1",
  IK_Pad_RightShoulder: "Gamepad RB / R1",
  IK_Pad_LeftThumb: "Gamepad L3",
  IK_Pad_RightThumb: "Gamepad R3",
  IK_Pad_Start: "Gamepad Start / Options",
  IK_Pad_Back_Select: "Gamepad Back / Select",
  IK_Pad_DigitUp: "D-Pad Up",
  IK_Pad_DigitDown: "D-Pad Down",
  IK_Pad_DigitLeft: "D-Pad Left",
  IK_Pad_DigitRight: "D-Pad Right",
  IK_None: "Unbound"
}));

// Witcher 3 config XMLs are commonly UTF-16LE with BOM, while input.settings is
// usually plain ASCII/UTF-8. Decode by BOM so mod labels and action metadata are
// not silently missed. Shared by file reads (readText) and in-memory uploads
// (/api/load), so both honor the same encoding rules (Requirement 11.4).
function decodeBuffer(data, label = "buffer") {
  if (data[0] === 0xff && data[1] === 0xfe) return data.toString("utf16le").replace(/^\uFEFF/, "");
  if (data[0] === 0xfe && data[1] === 0xff) {
    throw new Error(`Unsupported UTF-16BE file: ${label}`);
  }
  return data.toString("utf8").replace(/^\uFEFF/, "");
}

function readText(file) {
  return decodeBuffer(fs.readFileSync(file), file);
}

// parseInputSettings reads from disk; parseInputSettingsText parses an already
// decoded string so /api/load can scan an uploaded buffer without touching disk.
function parseInputSettings(file) {
  return parseInputSettingsText(readText(file));
}

function parseInputSettingsText(text) {
  const lines = text.split(/\r?\n/);
  let section = "";
  const entries = [];

  lines.forEach((raw, index) => {
    const trimmed = raw.trim();
    const sectionMatch = trimmed.match(/^\[(.+)]$/);
    if (sectionMatch) {
      section = sectionMatch[1];
      return;
    }

    const bindingMatch = trimmed.match(/^(IK_[^=]+)=\((.+)\)$/);
    if (!bindingMatch) return;

    const params = {};
    for (const part of bindingMatch[2].split(",")) {
      const [name, value] = part.split("=");
      if (name && value) params[name.trim()] = value.trim();
    }

    entries.push({
      lineNumber: index + 1,
      section,
      key: bindingMatch[1],
      keyLabel: labelKey(bindingMatch[1]),
      action: params.Action || "",
      state: params.State || "",
      value: params.Value || "",
      idleTime: params.IdleTime || "",
      raw
    });
  });

  return { text, lines, entries };
}

function labelKey(key) {
  if (keyLabels.has(key)) return keyLabels.get(key);
  if (/^IK_NumPad\d$/.test(key)) return `Numpad ${key.slice(-1)}`;
  if (/^IK_F\d+$/.test(key)) return key.slice(3);
  if (/^IK_[A-Z0-9]$/.test(key)) return key.slice(3);
  return key.replace(/^IK_/, "").replaceAll("_", " ");
}

function deviceForKey(key) {
  if (key === "IK_None") return "unbound";
  if (key.includes("Pad_") || key.includes("PS4_")) return "gamepad";
  if (key.includes("Mouse")) return "mouse";
  return "keyboard";
}

function parseInputXml(file) {
  if (!fs.existsSync(file)) return [];
  const text = readText(file);
  const vars = [];
  const rx = /<Var\b[^>]*builder="Input"[^>]*>/g;
  for (const match of text.matchAll(rx)) {
    const tag = match[0];
    const attr = (name) => {
      const found = tag.match(new RegExp(`${name}="([^"]*)"`));
      return found ? found[1] : "";
    };
    const actions = attr("actions").split(";").map((value) => value.trim()).filter(Boolean);
    vars.push({
      id: attr("id"),
      displayName: attr("displayName"),
      displayType: attr("displayType"),
      tags: attr("tags"),
      actions
    });
  }
  return vars;
}

function findActionSources(modsDir, actions) {
  const result = new Map();
  if (!fs.existsSync(modsDir)) return result;

  const actionSet = new Set(actions);
  const files = [];
  for (const modName of fs.readdirSync(modsDir)) {
    const modPath = path.join(modsDir, modName);
    if (!fs.statSync(modPath).isDirectory()) continue;
    collectRelevantFiles(modPath, files, modName);
  }

  // The source index is intentionally conservative: it only marks an action as
  // mod-owned when the literal action id appears in a mod's binding metadata,
  // not merely because a script happens to mention a vanilla action name.
  for (const file of files) {
    let text = "";
    try {
      text = readText(file.path);
    } catch {
      continue;
    }
    for (const action of actionSet) {
      if (!result.has(action) && text.includes(action)) result.set(action, file.modName);
    }
  }
  return result;
}

function collectRelevantFiles(dir, files, modName, depth = 0) {
  if (depth > 8) return;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      collectRelevantFiles(full, files, modName, depth + 1);
      continue;
    }
    if (/^(input_xml\.txt|key_bindings\.txt|input\.settings\.part\.txt)$/i.test(item.name)) {
      files.push({ path: full, modName });
    }
  }
}

// input defaults to the server-side input.settings, but /api/load passes a
// pre-parsed in-memory upload so a loaded file is scanned without changing the
// default path (Requirement 7.1, 7.10).
function buildScan(input = parseInputSettings(defaults.inputSettings)) {
  const vars = parseInputXml(defaults.gameInputXml);
  const knownActions = new Set(vars.flatMap((item) => item.actions));
  const allActions = [...new Set(input.entries.map((entry) => entry.action).filter(Boolean))];
  const modSources = findActionSources(defaults.modsDir, allActions);

  const commandByAction = new Map();
  for (const item of vars) {
    for (const action of item.actions) commandByAction.set(action, item);
  }

  const commandMap = new Map();
  for (const entry of input.entries) {
    const known = commandByAction.get(entry.action);
    const id = known ? known.id : entry.action;
    if (!commandMap.has(id)) {
      commandMap.set(id, {
        id,
        displayName: known?.displayName || entry.action,
        tags: known?.tags || "",
        source: modSources.get(entry.action) || (knownActions.has(entry.action) ? "game/input.xml" : "unknown"),
        actions: known?.actions || [entry.action],
        bindings: [],
        keys: []
      });
    }
    commandMap.get(id).bindings.push({
      lineNumber: entry.lineNumber,
      section: entry.section,
      key: entry.key,
      keyLabel: entry.keyLabel,
      device: deviceForKey(entry.key),
      action: entry.action,
      state: entry.state,
      idleTime: entry.idleTime
    });
  }

  for (const command of commandMap.values()) {
    const seen = new Set();
    command.keys = command.bindings
      .filter((binding) => {
        const id = `${binding.key}|${binding.state}|${binding.idleTime}`;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((binding) => ({
        key: binding.key,
        label: binding.keyLabel,
        device: binding.device,
        state: binding.state,
        idleTime: binding.idleTime
      }));
  }

  // Binding source per command id, so findConflicts can report which
  // colliding commands are vanilla vs. mod-owned (Requirement 5.4, 13.5).
  const sourceByCommandId = new Map([...commandMap.values()].map((command) => [command.id, command.source]));

  return {
    paths: defaults,
    stats: {
      sections: new Set(input.entries.map((entry) => entry.section)).size,
      bindings: input.entries.length,
      actions: allActions.length,
      keys: new Set(input.entries.map((entry) => entry.key)).size,
      commands: commandMap.size,
      modActions: [...modSources.keys()].length
    },
    commands: [...commandMap.values()].sort((a, b) => a.id.localeCompare(b.id)),
    conflicts: findConflicts(input.entries, commandByAction, sourceByCommandId),
    unlistedActions: allActions.filter((action) => !knownActions.has(action)).sort()
  };
}

// sourceByCommandId (optional) maps a command id to its binding source so each
// conflict can expose a `sources[]` array parallel to `commands[]`
// (Requirement 5.4, 13.5). Omitting it keeps the previous behavior.
function findConflicts(entries, commandByAction, sourceByCommandId) {
  const groups = new Map();
  for (const entry of entries) {
    if (entry.key === "IK_None") continue;
    const command = commandByAction.get(entry.action)?.id || entry.action;
    const id = `${entry.section}|${entry.key}`;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push({ ...entry, command });
  }

  const conflicts = [];
  for (const [id, items] of groups) {
    const commands = [...new Set(items.map((item) => item.command))];
    if (commands.length < 2) continue;
    const sources = commands.map((command) => sourceByCommandId?.get(command) || "unknown");
    if (isVanillaOnlyConflict(sources)) continue;
    const [section, key] = id.split("|");
    conflicts.push({
      section,
      key,
      keyLabel: labelKey(key),
      severity: riskyKey(key, commands) ? "high" : "medium",
      commands,
      sources,
      lines: items.map((item) => item.lineNumber)
    });
  }
  return conflicts.sort((a, b) => {
    const rank = { high: 0, medium: 1 };
    return rank[a.severity] - rank[b.severity] || a.section.localeCompare(b.section);
  });
}

function isVanillaOnlyConflict(sources) {
  // Vanilla-only duplicates are intentional Witcher context aliases, not user
  // remap conflicts. Keep mod/unknown mixes visible for review.
  return sources.length > 0 && sources.every((source) => source === "game/input.xml");
}

function riskyKey(key, commands) {
  return key.includes("LeftTrigger") ||
    key.includes("LeftThumb") ||
    key.includes("NumPad4") ||
    commands.some((command) => /Debug|AutoLoot|PanelFakeHud/.test(command));
}

function remap(body) {
  const actions = Array.isArray(body.actions) ? body.actions.filter(Boolean) : [];
  const newKey = String(body.newKey || "").trim();
  const oldKey = String(body.oldKey || "").trim();
  const sections = Array.isArray(body.sections) ? new Set(body.sections) : null;

  if (!actions.length || !/^IK_[A-Za-z0-9_]+$/.test(newKey)) {
    throw new Error("Need at least one action and a valid IK_* target key.");
  }

  const parsed = parseInputSettings(defaults.inputSettings);
  const actionSet = new Set(actions);
  let changed = 0;
  const nextLines = parsed.lines.map((line) => {
    const trimmed = line.trim();
    const bindingMatch = trimmed.match(/^(IK_[^=]+)=\((.+)\)$/);
    if (!bindingMatch) return line;
    const actionMatch = bindingMatch[2].match(/Action=([^,\)]+)/);
    if (!actionMatch || !actionSet.has(actionMatch[1])) return line;
    const entry = parsed.entries.find((item) => item.raw === line || item.raw.trim() === trimmed);
    if (oldKey && bindingMatch[1] !== oldKey) return line;
    if (sections && entry && !sections.has(entry.section)) return line;

    changed += 1;
    return line.replace(/^(\s*)IK_[^=]+=/, `$1${newKey}=`);
  });

  if (!changed) throw new Error("No matching bindings were changed.");

  const backup = `${defaults.inputSettings}.${timestamp()}.bak`;
  fs.copyFileSync(defaults.inputSettings, backup);
  fs.writeFileSync(defaults.inputSettings, nextLines.join("\n"), "utf8");
  return { changed, backup };
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

// Minimal multipart/form-data extractor for /api/load — returns the raw bytes of
// the first part named "file" (or any part with a filename) so the upload can be
// decoded with the same BOM rules as on-disk files. Dependency-free by design
// (AGENTS.md): no busboy/formidable. Operates on a Buffer to preserve UTF-16.
function extractMultipartFile(buffer, boundary) {
  const dash = Buffer.from(`--${boundary}`);
  const headerSep = Buffer.from("\r\n\r\n");
  const parts = [];
  let start = buffer.indexOf(dash);
  if (start === -1) return null;
  start += dash.length;
  while (start < buffer.length) {
    if (buffer[start] === 0x2d && buffer[start + 1] === 0x2d) break; // closing "--"
    if (buffer[start] === 0x0d && buffer[start + 1] === 0x0a) start += 2; // skip CRLF
    const next = buffer.indexOf(dash, start);
    if (next === -1) break;
    const segment = buffer.slice(start, next);
    const sep = segment.indexOf(headerSep);
    if (sep !== -1) {
      const headers = segment.slice(0, sep).toString("utf8");
      let body = segment.slice(sep + headerSep.length);
      if (body[body.length - 2] === 0x0d && body[body.length - 1] === 0x0a) body = body.slice(0, -2);
      parts.push({ headers, body });
    }
    start = next + dash.length;
  }
  const filePart = parts.find((p) => /name="file"/i.test(p.headers)) ||
    parts.find((p) => /filename="/i.test(p.headers));
  return filePart ? filePart.body : null;
}

// POST /api/save — write Bindings to a client-chosen target file. Backs up an
// existing target first; if the backup fails the write is aborted (Requirement
// 7.2, 7.3, 12.1–12.3). statusCode distinguishes bad input (400) from IO (500).
function handleSave(body) {
  const targetPath = String(body.targetPath || "").trim();
  const content = typeof body.content === "string" ? body.content : null;
  if (!targetPath || content === null) {
    const error = new Error("Need targetPath and content.");
    error.statusCode = 400;
    throw error;
  }
  let backup = null;
  if (fs.existsSync(targetPath)) {
    backup = `${targetPath}.${timestamp()}.bak`;
    try {
      fs.copyFileSync(targetPath, backup);
    } catch (cause) {
      const error = new Error(`Backup failed, write aborted: ${cause.message}`);
      error.statusCode = 500;
      throw error;
    }
  }
  fs.writeFileSync(targetPath, content, "utf8");
  return { saved: targetPath, backup };
}

// Windows-only hardware detection for /api/devices. PowerShell PnP query for
// USB-HID devices + the active Windows input language. Both degrade to empty
// values on failure or non-Windows so the route never 500s (Requirement 8.9, 8.10).
function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout) => (error ? reject(error) : resolve(stdout))
    );
  });
}

async function detectDevicesWin32() {
  if (process.platform !== "win32") return [];
  try {
    const out = await runPowerShell(
      "Get-PnpDevice -Class HIDClass -Status OK | Select-Object FriendlyName,DeviceID | ConvertTo-Json"
    );
    const parsed = JSON.parse(out || "[]");
    const list = Array.isArray(parsed) ? parsed : [parsed];
    const devices = [];
    for (const entry of list) {
      const match = String(entry.DeviceID || "").match(/VID_([0-9A-F]{4})&PID_([0-9A-F]{4})/i);
      if (!match) continue;
      const name = entry.FriendlyName || "";
      // FriendlyNames are localized (de-DE Windows reports "Tastatur"/"Maus"),
      // and many HID nodes are generic ("HID-konformer Systemcontroller"), so
      // this type is only a hint — the client matches by VID:PID first.
      const type = /keyboard|tastatur/i.test(name) ? "keyboard"
        : /mouse|maus/i.test(name) ? "mouse"
        : "gamepad";
      devices.push({ vid: match[1].toUpperCase(), pid: match[2].toUpperCase(), name, type });
    }
    return devices;
  } catch {
    return [];
  }
}

async function detectLayoutLanguageWin32() {
  if (process.platform !== "win32") return null;
  try {
    const out = await runPowerShell("(Get-WinUserLanguageList)[0].LanguageTag");
    const tag = String(out || "").trim();
    return tag || null;
  } catch {
    return null;
  }
}

async function handleDevices(res) {
  const [devices, inputLanguage] = await Promise.all([detectDevicesWin32(), detectLayoutLanguageWin32()]);
  sendJson(res, 200, { devices, inputLanguage });
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

function serveStatic(res, pathname) {
  const target = pathname === "/" ? path.join(publicDir, "index.html") : path.join(publicDir, pathname);
  const resolved = path.resolve(target);
  if (!resolved.startsWith(publicDir) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = path.extname(resolved).toLowerCase();
  const types = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript", ".svg": "image/svg+xml" };
  res.writeHead(200, { "content-type": `${types[ext] || "text/plain"}; charset=utf-8` });
  fs.createReadStream(resolved).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (req.method === "GET" && url.pathname === "/api/scan") return sendJson(res, 200, buildScan());
    if (req.method === "POST" && url.pathname === "/api/remap") {
      let raw = "";
      req.on("data", (chunk) => { raw += chunk; });
      req.on("end", () => {
        try {
          sendJson(res, 200, remap(JSON.parse(raw || "{}")));
        } catch (error) {
          sendJson(res, 400, { error: error.message });
        }
      });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/devices") {
      // Detection never rejects, but guard anyway so a surprise still yields an
      // empty, non-500 result per Requirement 8.9.
      handleDevices(res).catch(() => sendJson(res, 200, { devices: [], inputLanguage: null }));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/load") {
      const chunks = [];
      req.on("data", (chunk) => { chunks.push(chunk); });
      req.on("end", () => {
        try {
          const ct = req.headers["content-type"] || "";
          const boundary = ct.match(/boundary=(.+)$/);
          if (!boundary) throw new Error("Missing multipart boundary.");
          const fileBuf = extractMultipartFile(Buffer.concat(chunks), boundary[1].replace(/^"|"$/g, ""));
          if (!fileBuf) throw new Error("No file field in upload.");
          const parsed = parseInputSettingsText(decodeBuffer(fileBuf, "upload"));
          if (!parsed.entries.length) {
            throw new Error("Not a valid input.settings: no IK_* bindings found.");
          }
          // Scan the upload in memory; defaults.inputSettings stays untouched (Req 7.10).
          sendJson(res, 200, buildScan(parsed));
        } catch (error) {
          sendJson(res, 400, { error: error.message });
        }
      });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/save") {
      let raw = "";
      req.on("data", (chunk) => { raw += chunk; });
      req.on("end", () => {
        try {
          sendJson(res, 200, handleSave(JSON.parse(raw || "{}")));
        } catch (error) {
          sendJson(res, error.statusCode || 500, { error: error.message });
        }
      });
      return;
    }
    if (req.method === "GET") return serveStatic(res, decodeURIComponent(url.pathname));
    res.writeHead(405);
    res.end("Method not allowed");
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

if (require.main === module) {
  const port = Number(process.env.PORT || 5177);
  server.listen(port, "127.0.0.1", () => {
    console.log(`Witcher 3 Keymapper running at http://127.0.0.1:${port}`);
  });
}

module.exports = {
  findConflicts,
  isVanillaOnlyConflict
};
