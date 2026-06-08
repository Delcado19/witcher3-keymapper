const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
const { URL } = require("node:url");
const { execFile, execFileSync } = require("node:child_process");

const root = __dirname;
const publicDir = path.join(root, "public");

const defaults = {
  inputSettings: path.join(root, "input.settings"),
  gameRoot: "F:\\GOG Galaxy\\Games\\The Witcher 3 Wild Hunt GOTY",
  gameInputXml: "F:\\GOG Galaxy\\Games\\The Witcher 3 Wild Hunt GOTY\\bin\\config\\r4game\\user_config_matrix\\pc\\input.xml",
  vanillaDefaultDir: "F:\\GOG Galaxy\\Games\\The Witcher 3 Wild Hunt GOTY\\bin\\config\\r4game\\legacy\\base",
  modsDir: "F:\\GOG Galaxy\\Games\\The Witcher 3 Wild Hunt GOTY\\Mods",
  w3stringsCacheDir: path.join(root, ".cache", "w3strings")
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
  const syntax = validateInputSettingsSyntax(lines);
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
    for (const part of splitBindingParams(bindingMatch[2])) {
      const eq = part.indexOf("=");
      if (eq === -1) continue;
      const name = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      if (name && value) params[name] = value;
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

  return { text, lines, entries, syntax };
}

// input.settings is INI-like but not generic INI: binding rows must be
// `IK_*=(Action=...)`, `[InputSettings]` can carry metadata such as `Version=55`,
// and Witcher also allows valueless flags such as `Reprocess`. Validate that
// shape before scanning so malformed loaded files are not silently reduced to
// "missing bindings".
function validateInputSettingsSyntax(lines) {
  const diagnostics = [];
  let section = "";
  let bindingCount = 0;

  lines.forEach((raw, index) => {
    const lineNumber = index + 1;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith(";") || trimmed.startsWith("#")) return;

    const sectionMatch = trimmed.match(/^\[([^\[\]]+)]$/);
    if (sectionMatch) {
      section = sectionMatch[1].trim();
      if (!section) addSyntaxDiagnostic(diagnostics, "error", lineNumber, "Section name is empty.");
      return;
    }

    const bindingMatch = trimmed.match(/^(IK_[A-Za-z0-9_]+)=\((.*)\)$/);
    if (!bindingMatch) {
      if (/^[A-Za-z][A-Za-z0-9_]*=.+$/.test(trimmed)) {
        if (!section) addSyntaxDiagnostic(diagnostics, "error", lineNumber, "Metadata assignment appears before any section header.");
        return;
      }
      addSyntaxDiagnostic(diagnostics, "error", lineNumber, "Expected [Section] or IK_*=(Action=...) binding.");
      return;
    }
    bindingCount += 1;
    if (!section) addSyntaxDiagnostic(diagnostics, "error", lineNumber, "Binding appears before any section header.");

    const params = splitBindingParams(bindingMatch[2]);
    if (!params.length) {
      addSyntaxDiagnostic(diagnostics, "error", lineNumber, "Binding parameter list is empty.");
      return;
    }

    let hasAction = false;
    for (const part of params) {
      const eq = part.indexOf("=");
      if (eq === -1) continue; // Witcher valueless flag, e.g. Reprocess.
      const name = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      if (!name || !value) {
        addSyntaxDiagnostic(diagnostics, "error", lineNumber, "Binding parameter name or value is empty.");
        continue;
      }
      if (name === "Action") hasAction = true;
    }
    if (!hasAction) addSyntaxDiagnostic(diagnostics, "error", lineNumber, "Binding is missing required Action parameter.");
  });

  if (!bindingCount) addSyntaxDiagnostic(diagnostics, "error", 0, "No IK_* bindings found.");
  const errors = diagnostics.filter((item) => item.severity === "error");
  return {
    valid: errors.length === 0,
    errors,
    warnings: diagnostics.filter((item) => item.severity === "warning")
  };
}

function addSyntaxDiagnostic(diagnostics, severity, lineNumber, message) {
  diagnostics.push({ severity, lineNumber, message });
}

function splitBindingParams(text) {
  return String(text || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

const KEY_SORT_GROUPS = [
  { pattern: /^IK_([A-Z])$/, rank: (match) => match[1].charCodeAt(0) - 65 },
  { pattern: /^IK_(\d)$/, rank: (match) => Number(match[1]) },
  { pattern: /^IK_NumPad(\d)$/, rank: (match) => Number(match[1]) },
  { pattern: /^IK_Num(Slash|Star|Minus|Plus|Period|Enter)$/, order: ["Slash", "Star", "Minus", "Plus", "Period", "Enter"] },
  { pattern: /^IK_F(\d{1,2})$/, rank: (match) => Number(match[1]) - 1 },
  { keys: ["IK_LeftMouse", "IK_RightMouse", "IK_MiddleMouse", "IK_Mouse4", "IK_Mouse5", "IK_MouseZ", "IK_MouseX", "IK_MouseY"] },
  { keys: ["IK_LShift", "IK_RShift", "IK_LControl", "IK_RControl", "IK_Alt", "IK_Tab", "IK_CapsLock", "IK_Space", "IK_Backspace", "IK_Enter", "IK_Escape"] },
  { keys: ["IK_Insert", "IK_Delete", "IK_Home", "IK_End", "IK_PageUp", "IK_PageDown", "IK_Up", "IK_Down", "IK_Left", "IK_Right"] },
  { keys: ["IK_Tilde", "IK_Minus", "IK_Equals", "IK_LeftBracket", "IK_RightBracket", "IK_Backslash", "IK_Semicolon", "IK_Apostrophe", "IK_Comma", "IK_Period", "IK_Slash", "IK_OEM_102"] },
  { keys: [
    "IK_Pad_A_CROSS", "IK_Pad_B_CIRCLE", "IK_Pad_X_SQUARE", "IK_Pad_Y_TRIANGLE",
    "IK_Pad_LeftShoulder", "IK_Pad_RightShoulder", "IK_Pad_LeftTrigger", "IK_Pad_RightTrigger",
    "IK_Pad_LeftThumb", "IK_Pad_RightThumb", "IK_Pad_LeftAxisX", "IK_Pad_LeftAxisY",
    "IK_Pad_RightAxisX", "IK_Pad_RightAxisY", "IK_Pad_DigitUp", "IK_Pad_DigitDown",
    "IK_Pad_DigitLeft", "IK_Pad_DigitRight", "IK_Pad_Start", "IK_Pad_Back_Select"
  ] },
  { pattern: /^IK_PS4_/, rank: (_, key) => key },
  { keys: ["IK_None"] }
];

function keySortTuple(key) {
  for (let groupIndex = 0; groupIndex < KEY_SORT_GROUPS.length; groupIndex += 1) {
    const group = KEY_SORT_GROUPS[groupIndex];
    if (group.keys) {
      const index = group.keys.indexOf(key);
      if (index !== -1) return [groupIndex, index, key];
      continue;
    }
    const match = key.match(group.pattern);
    if (!match) continue;
    if (group.order) return [groupIndex, group.order.indexOf(match[1]), key];
    return [groupIndex, group.rank(match, key), key];
  }
  return [KEY_SORT_GROUPS.length, key, key];
}

function compareInputKeys(a, b) {
  const left = keySortTuple(a);
  const right = keySortTuple(b);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const av = left[index];
    const bv = right[index];
    if (av === bv) continue;
    if (typeof av === "number" && typeof bv === "number") return av - bv;
    return String(av).localeCompare(String(bv));
  }
  return 0;
}

function sortInputSettingsText(text) {
  const lines = String(text || "").split(/\r?\n/);
  assertValidInputSettings(validateInputSettingsSyntax(lines));

  const blocks = [];
  let preamble = [];
  let current = null;
  for (const line of lines) {
    if (/^\s*\[[^\[\]]+]\s*$/.test(line)) {
      current = { header: line, body: [] };
      blocks.push(current);
      continue;
    }
    if (current) current.body.push(line);
    else preamble.push(line);
  }

  const out = [...preamble.filter((line) => line.trim())];
  for (const block of blocks) {
    if (out.length) out.push("");
    out.push(block.header);
    out.push(...sortSectionBody(block.body));
  }
  return out.join("\n") + (text.endsWith("\n") ? "\n" : "");
}

function sortSectionBody(lines) {
  const metadata = [];
  const bindings = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const bindingMatch = line.trim().match(/^(IK_[A-Za-z0-9_]+)=\(/);
    if (!bindingMatch) {
      metadata.push(line);
      continue;
    }
    bindings.push({ line, key: bindingMatch[1], index: bindings.length });
  }
  bindings.sort((a, b) => compareInputKeys(a.key, b.key) || a.index - b.index);
  return metadata.concat(bindings.map((item) => item.line));
}

function parseOptionalInputSettings(file) {
  if (!fs.existsSync(file)) return { text: "", lines: [], entries: [] };
  return { ...parseInputSettings(file), file };
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
  return parseInputXmlText(text);
}

function parseInputXmlText(text) {
  const vars = [];
  const rx = /<Var\b[^>]*builder="Input"[^>]*>/g;
  for (const match of String(text || "").matchAll(rx)) {
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

function findModInputXmlFiles(modsDir) {
  const files = [];
  if (!fs.existsSync(modsDir)) return files;
  for (const modName of fs.readdirSync(modsDir)) {
    const modPath = path.join(modsDir, modName);
    if (!fs.statSync(modPath).isDirectory()) continue;
    collectModInputXmlFiles(modPath, files, modName);
  }
  return files;
}

function collectModInputXmlFiles(dir, files, modName, depth = 0) {
  if (depth > 8) return;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      collectModInputXmlFiles(full, files, modName, depth + 1);
      continue;
    }
    if (/^(input\.xml|input_xml\.txt)$/i.test(item.name)) files.push({ path: full, modName });
  }
}

function parseInputXmlFiles(files) {
  const vars = [];
  for (const file of files) {
    try {
      for (const item of parseInputXml(file.path || file)) {
        vars.push({ ...item, source: file.modName || "game/input.xml" });
      }
    } catch {
      // A malformed mod metadata file should not prevent scanning keybindings.
    }
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

function loadLocalizationMap(modsDir, languageTag) {
  const preferred = preferredLocalizationCodes(languageTag);
  const dictionaryKeys = collectLocalizationDictionaryKeys(defaults.gameRoot, modsDir);
  const files = findLocalizationCsvFiles(modsDir)
    .map((file) => ({ ...file, score: localizationLanguageScore(file.language, preferred) }))
    .sort((a, b) => a.score - b.score || a.path.localeCompare(b.path));

  const map = new Map();
  for (const file of files) {
    let text = "";
    try {
      text = readText(file.path);
    } catch {
      continue;
    }
    for (const [key, value] of parseLocalizationCsvText(text)) {
      if (key && value) map.set(key, value);
    }
  }
  for (const [key, value] of loadW3StringsLocalizationMap(defaults.gameRoot, modsDir, languageTag, dictionaryKeys)) {
    if (key && value) map.set(key, value);
  }
  return map;
}

function findLocalizationCsvFiles(modsDir) {
  const files = [];
  if (!fs.existsSync(modsDir)) return files;
  for (const modName of fs.readdirSync(modsDir)) {
    const modPath = path.join(modsDir, modName);
    if (!fs.statSync(modPath).isDirectory()) continue;
    collectLocalizationCsvFiles(modPath, files, modName);
  }
  return files;
}

function collectLocalizationCsvFiles(dir, files, modName, depth = 0) {
  if (depth > 8) return;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      collectLocalizationCsvFiles(full, files, modName, depth + 1);
      continue;
    }
    if (!/\.csv$/i.test(item.name)) continue;
    files.push({ path: full, modName, language: detectLocalizationLanguage(item.name, safeReadLanguageMeta(full)) });
  }
}

function safeReadLanguageMeta(file) {
  try {
    return readText(file).split(/\r?\n/, 8).join("\n");
  } catch {
    return "";
  }
}

function detectLocalizationLanguage(fileName, head = "") {
  const meta = String(head || "").match(/;meta\[language=([^\]]+)]/i);
  if (meta) return meta[1].toLowerCase();
  const parts = String(fileName || "").toLowerCase().split(/[._-]/).filter(Boolean);
  const known = ["ar", "br", "cn", "cz", "de", "en", "es", "fr", "it", "jp", "kr", "mx", "pl", "pt", "ru", "tr", "zh"];
  return parts.find((part) => known.includes(part)) || "";
}

function preferredLocalizationCodes(languageTag) {
  const primary = String(languageTag || "").toLowerCase().split(/[-_]/)[0];
  if (primary === "de") return ["de", "en"];
  return ["en"];
}

function localizationLanguageScore(language, preferred) {
  const index = preferred.indexOf(String(language || "").toLowerCase());
  return index === -1 ? 0 : 100 - index;
}

function parseLocalizationCsvText(text) {
  const entries = new Map();
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith(";")) continue;
    const columns = line.split("|").map((part) => part.trim());
    if (columns.length >= 4) {
      entries.set(columns[2], columns.slice(3).join("|").trim());
    } else if (columns.length >= 2) {
      entries.set(columns[0], columns.slice(1).join("|").trim());
    }
  }
  return entries;
}

function collectLocalizationDictionaryKeys(gameRoot, modsDir) {
  const keys = new Set();
  const xmlFiles = [{ path: defaults.gameInputXml }, ...findModInputXmlFiles(modsDir)];
  for (const item of parseInputXmlFiles(xmlFiles)) {
    if (item.id) keys.add(item.id);
    if (item.displayName) keys.add(item.displayName);
    for (const action of item.actions || []) if (action) keys.add(action);
  }

  for (const file of findLocalizationCsvFiles(modsDir)) {
    try {
      for (const key of parseLocalizationCsvText(readText(file.path)).keys()) keys.add(key);
    } catch {
      // Dictionary quality is best-effort; unreadable mod files are skipped.
    }
  }

  const scriptFiles = findWitcherScriptFiles(gameRoot, modsDir);
  for (const file of scriptFiles) {
    try {
      for (const key of parseWitcherScriptLocalizationKeys(readText(file.path))) keys.add(key);
    } catch {
      // Some mod scripts may be encoded oddly or partially generated.
    }
  }
  return keys;
}

function findWitcherScriptFiles(gameRoot, modsDir) {
  const files = [];
  collectWitcherScriptFiles(path.join(gameRoot, "content"), files);
  collectWitcherScriptFiles(modsDir, files);
  return files;
}

function collectWitcherScriptFiles(dir, files, depth = 0) {
  if (depth > 8 || !fs.existsSync(dir)) return;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      collectWitcherScriptFiles(full, files, depth + 1);
      continue;
    }
    if (/\.ws$/i.test(item.name)) files.push({ path: full });
  }
}

function loadW3StringsLocalizationMap(gameRoot, modsDir, languageTag, dictionaryKeys = new Set()) {
  const exe = findW3StringsExe();
  if (!exe) return new Map();

  const preferred = preferredLocalizationCodes(languageTag);
  const files = findW3StringsFiles(gameRoot, modsDir)
    .map((file) => ({ ...file, score: localizationLanguageScore(file.language, preferred) }))
    .filter((file) => file.score > 0)
    .sort((a, b) => a.score - b.score || a.path.localeCompare(b.path));

  const map = new Map();
  for (const file of files) {
    const csv = decodeW3StringsToCachedCsv(file.path, exe, dictionaryKeys);
    if (!csv) continue;
    let text = "";
    try {
      text = readText(csv);
    } catch {
      continue;
    }
    for (const [key, value] of parseLocalizationCsvText(text)) {
      if (key && value) map.set(key, value);
    }
  }
  return map;
}

function findW3StringsExe() {
  const candidates = [
    process.env.W3STRINGS_NG_EXE,
    path.join(root, "tools", "w3strings-ng", "w3strings-ng.exe"),
    path.join(root, "tools", "w3strings-ng", "w3strings-ng"),
    path.join(root, "tools", "w3strings", "w3strings-ng.exe"),
    path.join(root, "tools", "w3strings", "w3strings-ng"),
    findExecutableOnPath("w3strings-ng"),
    process.env.W3STRINGS_EXE,
    path.join(root, "tools", "w3strings", "w3strings.exe"),
    path.join(root, "tools", "w3strings", "w3strings"),
    findExecutableOnPath("w3strings"),
    "C:\\tmp\\w3strings-encoder-0.4.1\\w3strings.exe"
  ].filter(Boolean);
  return candidates.find((file) => {
    try {
      return fs.existsSync(file) && fs.statSync(file).isFile();
    } catch {
      return false;
    }
  }) || null;
}

function w3StringsToolKind(exe) {
  return /w3strings-ng(?:\.exe)?$/i.test(path.basename(String(exe || ""))) ? "ng" : "legacy";
}

function findExecutableOnPath(command) {
  const paths = String(process.env.PATH || "").split(path.delimiter).filter(Boolean);
  const extensions = process.platform === "win32"
    ? String(process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";").filter(Boolean)
    : [""];
  for (const dir of paths) {
    for (const ext of extensions) {
      const candidate = path.join(dir, `${command}${ext}`);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function findW3StringsFiles(gameRoot, modsDir) {
  const files = [];
  const contentDir = path.join(gameRoot, "content");
  collectW3StringsFiles(contentDir, files, "game/content");
  collectW3StringsFiles(modsDir, files, "mods");
  return files;
}

function collectW3StringsFiles(dir, files, source, depth = 0) {
  if (depth > 8 || !fs.existsSync(dir)) return;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      collectW3StringsFiles(full, files, source, depth + 1);
      continue;
    }
    if (!/\.w3strings$/i.test(item.name)) continue;
    files.push({ path: full, source, language: detectLocalizationLanguage(item.name) });
  }
}

function decodeW3StringsToCachedCsv(file, exe, dictionaryKeys = new Set()) {
  let workDir = null;
  try {
    const stat = fs.statSync(file);
    const dictionaryHash = hashW3StringsDictionaryKeys(dictionaryKeys);
    const key = crypto.createHash("sha1")
      .update(`${file}\0${stat.size}\0${stat.mtimeMs}\0${dictionaryHash}`)
      .digest("hex");
    const cacheDir = defaults.w3stringsCacheDir;
    workDir = path.join(cacheDir, "work", key);
    const csv = path.join(cacheDir, `${key}.${path.basename(file)}.csv`);
    if (fs.existsSync(csv)) return csv;

    fs.mkdirSync(workDir, { recursive: true });
    const workFile = path.join(workDir, `${key}.w3strings`);
    const outFile = path.join(workDir, `${key}.csv`);
    const dictionaryFile = path.join(workDir, "w3strings.txt");
    fs.copyFileSync(file, workFile);
    writeW3StringsDictionary(dictionaryFile, dictionaryKeys);
    // Decode a cache copy so the game/mod install directories stay read-only.
    // Prefer the GPL Rust CLI (`w3strings-ng decode input output`); keep the
    // old Nexus encoder syntax as a compatibility fallback for local installs.
    if (w3StringsToolKind(exe) === "ng") {
      execFileSync(exe, ["decode", workFile, outFile], { windowsHide: true, encoding: "utf8", timeout: 120000 });
    } else {
      execFileSync(exe, ["--decode", workFile], { windowsHide: true, encoding: "utf8", timeout: 120000 });
      const legacyOut = `${workFile}.csv`;
      if (fs.existsSync(legacyOut)) fs.renameSync(legacyOut, outFile);
    }
    if (!fs.existsSync(outFile)) return null;
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.renameSync(outFile, csv);
    return csv;
  } catch {
    return null;
  } finally {
    if (workDir) fs.rmSync(workDir, { recursive: true, force: true });
  }
}

function hashW3StringsDictionaryKeys(keys) {
  return crypto.createHash("sha1").update(sortedW3StringsDictionaryKeys(keys).join("\n")).digest("hex");
}

function writeW3StringsDictionary(file, keys) {
  fs.writeFileSync(file, sortedW3StringsDictionaryKeys(keys).join("\n"), "utf8");
}

function sortedW3StringsDictionaryKeys(keys) {
  return [...keys].map((key) => String(key || "").trim()).filter(Boolean).sort();
}

function parseWitcherScriptLocalizationKeys(text) {
  const keys = new Set();
  const rx = /\bGetLocString(?:ByKeyExt)?\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of String(text || "").matchAll(rx)) keys.add(match[1]);
  return [...keys].sort();
}

function resolveDisplayName(rawDisplayName, localizationMap) {
  return resolveDisplayNameInfo(rawDisplayName, localizationMap).displayName;
}

function resolveDisplayNameInfo(rawDisplayName, localizationMap) {
  const raw = String(rawDisplayName || "").trim();
  if (!raw) return { displayName: "", displayNameSource: "empty" };
  const localized = cleanLocalizedDisplayName(localizationMap.get(raw));
  if (localized) return { displayName: localized, displayNameSource: "localized" };
  return { displayName: humanizeDisplayName(raw), displayNameSource: "humanized" };
}

function cleanLocalizedDisplayName(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function uiLanguageForTag(languageTag) {
  return String(languageTag || "").toLowerCase().startsWith("de") ? "de" : "en";
}

function localizationTagForUiLanguage(uiLanguage) {
  return uiLanguage === "de" ? "de-DE" : "en-US";
}

function humanizeDisplayName(value) {
  const cleaned = String(value || "")
    .replace(/^(ControlLayout|panel_input_action|panel_groupname|panel_button_common|panel_common|input)_/i, "")
    .replace(/^panel_/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return value;
  return cleaned.split(" ").map((word) => {
    if (/^(ui|hud|dpad|dlc|npc|pc)$/i.test(word)) return word.toUpperCase();
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(" ");
}

// input defaults to the server-side input.settings, but /api/load passes a
// pre-parsed in-memory upload so a loaded file is scanned without changing the
// default path (Requirement 7.1, 7.10).
function buildScan(input = parseInputSettings(defaults.inputSettings), requestedLanguage = "") {
  assertValidInputSettings(input.syntax);
  const inputLanguage = detectLayoutLanguageWin32Sync();
  const uiLanguage = uiLanguageForTag(requestedLanguage || inputLanguage);
  const localizationLanguage = localizationTagForUiLanguage(uiLanguage);
  const vars = parseInputXmlFiles([
    { path: defaults.gameInputXml, modName: "game/input.xml" },
    ...findModInputXmlFiles(defaults.modsDir)
  ]);
  const localizationMap = loadLocalizationMap(defaults.modsDir, localizationLanguage);
  const vanillaDefaults = parseOptionalInputSettings(vanillaDefaultFileForLanguage(inputLanguage));
  const vanillaDefaultActions = new Set(vanillaDefaults.entries.map((entry) => entry.action).filter(Boolean));
  const entries = mergeVanillaDefaultEntries(input.entries, vanillaDefaults.entries);
  const knownActions = new Set([...vars.flatMap((item) => item.actions), ...vanillaDefaultActions]);
  const allActions = [...new Set(entries.map((entry) => entry.action).filter(Boolean))];
  const modSources = findActionSources(defaults.modsDir, allActions);

  const commandByAction = new Map();
  for (const item of vars) {
    for (const action of item.actions) {
      const current = commandByAction.get(action);
      if (!current || current.source !== "game/input.xml") commandByAction.set(action, item);
    }
  }

  const commandMap = new Map();
  for (const entry of entries) {
    const known = commandByAction.get(entry.action);
    const id = known ? known.id : entry.action;
    if (!commandMap.has(id)) {
      const display = resolveDisplayNameInfo(known?.displayName || entry.action, localizationMap);
      commandMap.set(id, {
        id,
        displayName: display.displayName,
        displayNameSource: display.displayNameSource,
        displayNameKey: known?.displayName || entry.action,
        tags: known?.tags || "",
        source: modSources.get(entry.action) || (isVanillaAction(entry.action, knownActions) ? "game/input.xml" : "unknown"),
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
    // The save UI posts the current text to /api/save. Including it in scans
    // keeps default-file saves and uploaded session-file saves on the same
    // contract without adding server session state.
    content: input.text,
    syntax: input.syntax,
    stats: {
      sections: new Set(input.entries.map((entry) => entry.section)).size,
      bindings: entries.length,
      actions: allActions.length,
      keys: new Set(entries.map((entry) => entry.key)).size,
      commands: commandMap.size,
      modActions: [...modSources.keys()].length
    },
    inputLanguage,
    uiLanguage,
    vanillaDefaultFile: vanillaDefaults.file || null,
    commands: [...commandMap.values()].sort((a, b) => a.id.localeCompare(b.id)),
    conflicts: findConflicts(entries, commandByAction, sourceByCommandId),
    unlistedActions: allActions.filter((action) => !isVanillaAction(action, knownActions)).sort()
  };
}

function vanillaDefaultFileForLanguage(inputLanguage) {
  const lang = String(inputLanguage || "").toLowerCase();
  const fileName = lang.startsWith("de") ? "input_qwertz.ini"
    : lang.startsWith("fr") ? "input_azerty.ini"
    : "input_qwerty.ini";
  return path.join(defaults.vanillaDefaultDir, fileName);
}

function isVanillaAction(action, knownActions) {
  return knownActions.has(action) || OFFICIAL_VANILLA_ACTIONS.has(action);
}

function mergeVanillaDefaultEntries(primaryEntries, defaultEntries) {
  const primaryActions = new Set(primaryEntries.map((entry) => entry.action).filter(Boolean));
  const supplemental = defaultEntries
    .filter((entry) => entry.action && !primaryActions.has(entry.action))
    .map((entry) => ({
      ...entry,
      section: `VanillaDefaults:${entry.section}`,
      lineNumber: 0
    }));
  return primaryEntries.concat(supplemental);
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
    const candidateItems = conflictRelevantItems(items);
    const commands = [...new Set(candidateItems.map((item) => item.command))];
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
      lines: candidateItems.map((item) => item.lineNumber)
    });
  }
  return conflicts.sort((a, b) => {
    const rank = { high: 0, medium: 1 };
    return rank[a.severity] - rank[b.severity] || a.section.localeCompare(b.section);
  });
}

function conflictRelevantItems(items) {
  const gameplayItems = items.filter((item) => !isIgnoredConflictCommand(item.command));
  if (isBenignCommandSet(gameplayItems.map((item) => item.command))) return [];

  const byActivation = new Map();
  for (const item of gameplayItems) {
    const bucket = activationBucket(item);
    if (!byActivation.has(bucket)) byActivation.set(bucket, []);
    byActivation.get(bucket).push(item);
  }

  const relevant = [];
  for (const bucketItems of byActivation.values()) {
    const commands = [...new Set(bucketItems.map((item) => item.command))];
    // Tap/hold/axis bindings on the same key intentionally coexist in Witcher 3.
    // Only same-activation command sets can physically compete for one input.
    if (commands.length < 2) continue;
    if (isBenignCommandSet(commands)) continue;
    relevant.push(...bucketItems);
  }
  return relevant;
}

function activationBucket(item) {
  const state = item.state || "Press";
  return `${state}|${item.value || ""}|${item.idleTime || ""}`;
}

function isBenignCommandSet(commands) {
  const unique = [...new Set(commands)];
  if (unique.length < 2) return true;
  return BENIGN_COMMAND_GROUPS.some((group) => unique.every((command) => group.has(command)));
}

function isIgnoredConflictCommand(command) {
  return /^Debug(Input)?$/.test(command) ||
    /^Debug_/.test(command) ||
    /^SCN_DBG_/.test(command);
}

// Witcher 3 uses duplicate key rows for contextual aliases: keyboard movement
// also feeds GI axis actions, menu shortcuts share one key, interaction keys
// fan out to context-specific actions, and D-pad helpers multiplex combat item
// actions. These are not remap conflicts unless another non-aliased command
// shares the same activation.
const BENIGN_COMMAND_GROUPS = [
  new Set(["MoveFwd", "MoveBck", "MoveLft", "MoveRght", "GI_AxisLeftX", "GI_AxisLeftY"]),
  new Set(["Interaction", "AttackLight", "Finish", "Finisher", "PlaceTrophy", "BuryBody", "ItemsPadUse", "Sprint", "CbtRoll"]),
  new Set(["HoldToSeeMap", "PanelMap", "PanelMapPC", "FastMenu", "ShowEntryInPanel"]),
  new Set(["HoldToSeeQuests", "PanelJour"]),
  new Set(["HoldToSeeCharStats", "PanelChar"]),
  new Set(["HoldToSeeEssentials", "HubMenu"]),
  new Set(["PanelGlossary", "GotoGlossary"]),
  new Set(["IngameMenu", "ShowEntryInPanel", "GotoGlossary", "PanelInv"]),
  new Set(["FastMenu", "HoldFastMenu", "ShowEntryInPanel", "PanelMap"]),
  new Set(["DrinkPotion1", "DrinkPotion1Hold", "DrinkPotionUpperHold", "ItemsPadUp"]),
  new Set(["DrinkPotion2", "DrinkPotion2Hold", "DrinkPotionLowerHold", "ItemsPadDown"]),
  new Set(["DrinkPotion3", "DrinkPotion3Hold"]),
  new Set(["DrinkPotion4", "DrinkPotion4Hold"]),
  new Set(["AttackLight", "SpecialAttackLight"]),
  new Set(["AttackHeavy", "SpecialAttackHeavy"]),
  new Set(["OilSteel", "SteelSword", "SwordSheathe", "ComboDigitLeft", "ItemsPadLeft", "CiriHolsterWeapon"]),
  new Set(["OilSilver", "SilverSword", "SwordSheathe", "ComboDigitRight", "ItemsPadRight", "CiriHolsterWeapon"]),
  new Set(["Follow", "GallopCanter"]),
  new Set(["VehicleItemActionAbort", "JumpRoll"]),
  new Set(["ThrowCastAbort", "VehicleItemActionAbort"]),
  new Set(["HorseDismount", "VehicleItemActionAbort"]),
  new Set(["PanelCraft", "PanelFakeHud"]),
  new Set(["Alternate", "LockAndGuard", "Focus"])
];

// The official Witcher 3 controls chart shows keyboard, mouse and gamepad as
// parallel first-class inputs. Some stock actions from that scheme are absent
// from input.xml on this install, so keep them source-classified as vanilla
// instead of treating their duplicate bindings as mod/unknown conflicts.
const OFFICIAL_VANILLA_ACTIONS = new Set([
  "Alternate",
  "AltQuenCasting",
  "AttackHeavy",
  "AttackLight",
  "BuryBody",
  "CiriHolsterWeapon",
  "DebugInput",
  "DiveDown",
  "DrinkPotionLowerHold",
  "DrinkPotionUpperHold",
  "FastMenu",
  "Follow",
  "GI_Accelerate",
  "GI_AxisLeftX",
  "GI_AxisLeftY",
  "GI_AxisRightX",
  "GI_AxisRightY",
  "GI_MouseDampX",
  "GI_MouseDampY",
  "GotoGlossary",
  "HoldFastMenu",
  "HorseDismount",
  "HorseKick",
  "IngameMenu",
  "ItemsPadDown",
  "ItemsPadLeft",
  "ItemsPadRight",
  "ItemsPadUp",
  "ItemsPadUse",
  "MeditationAbort",
  "OilSilver",
  "OilSteel",
  "OnShowControlsHelp",
  "OpenMeditation",
  "PanelFakeHud",
  "PanelMap",
  "PlaceTrophy",
  "ShowActiveBuffs",
  "ShowBombsHelper",
  "ShowEntryInPanel",
  "ShowOilsHelper",
  "ShowPotionsHelper",
  "SpecialAttackHeavy",
  "SpecialAttackLight",
  "SwordSheathe",
  "ThrowCastAbort",
  "UseItem1",
  "UseItem2",
  "VehicleItemActionAbort"
]);

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
  assertValidInputSettings(parsed.syntax);
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
  fs.writeFileSync(defaults.inputSettings, sortInputSettingsText(nextLines.join("\n")), "utf8");
  return { changed, backup };
}

function assertValidInputSettings(syntax) {
  if (syntax?.valid) return;
  const errors = syntax?.errors || [];
  const first = errors.slice(0, 3).map((item) =>
    item.lineNumber ? `line ${item.lineNumber}: ${item.message}` : item.message
  ).join("; ");
  const error = new Error(`Invalid input.settings syntax${first ? `: ${first}` : "."}`);
  error.statusCode = 400;
  throw error;
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

// POST /api/save — write bindings to a client-chosen target file. Backs up an
// existing target first; if the backup fails the write is aborted (Requirement
// 7.2, 7.3, 12.1–12.3). statusCode distinguishes bad input (400) from IO (500).
function handleSave(body) {
  const targetPath = String(body.targetPath || "").trim();
  const rawContent = typeof body.content === "string" ? body.content : null;
  if (!targetPath || rawContent === null) {
    const error = new Error("Need targetPath and content.");
    error.statusCode = 400;
    throw error;
  }
  // Save is the canonical normalization point for user-chosen files. Remap also
  // normalizes server-side writes, so every persisted input.settings leaves the
  // app in the same deterministic per-section order.
  const content = body.sort === false ? rawContent : sortInputSettingsText(rawContent);
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
      // FriendlyNames are localized, so include German USB class names too.
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

function detectLayoutLanguageWin32Sync() {
  if (process.platform !== "win32") return null;
  try {
    const out = execFileSync("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "(Get-WinUserLanguageList)[0].LanguageTag"
    ], { windowsHide: true, encoding: "utf8" });
    const tag = String(out || "").trim();
    return tag || null;
  } catch {
    return null;
  }
}

async function handleDevices(res) {
  const [devices, inputLanguage] = await Promise.all([detectDevicesWin32(), detectLayoutLanguageWin32()]);
  sendJson(res, 200, { devices, inputLanguage, uiLanguage: uiLanguageForTag(inputLanguage) });
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
  const types = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp"
  };
  const contentType = types[ext] || "text/plain";
  const charset = /^(text\/|application\/javascript$)/.test(contentType) ? "; charset=utf-8" : "";
  res.writeHead(200, { "content-type": `${contentType}${charset}` });
  fs.createReadStream(resolved).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const requestedLanguage = url.searchParams.get("lang") || req.headers["x-keymapper-language"] || "";
  try {
    if (req.method === "GET" && url.pathname === "/api/scan") return sendJson(res, 200, buildScan(undefined, requestedLanguage));
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
          assertValidInputSettings(parsed.syntax);
          // Scan the upload in memory; defaults.inputSettings stays untouched (Req 7.10).
          sendJson(res, 200, buildScan(parsed, requestedLanguage));
        } catch (error) {
          sendJson(res, error.statusCode || 400, { error: error.message });
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
  isVanillaOnlyConflict,
  conflictRelevantItems,
  isBenignCommandSet,
  isVanillaAction,
  vanillaDefaultFileForLanguage,
  validateInputSettingsSyntax,
  parseInputSettingsText,
  sortInputSettingsText,
  compareInputKeys,
  parseInputXmlText,
  parseLocalizationCsvText,
  parseWitcherScriptLocalizationKeys,
  collectLocalizationDictionaryKeys,
  findW3StringsExe,
  w3StringsToolKind,
  decodeW3StringsToCachedCsv,
  resolveDisplayName,
  resolveDisplayNameInfo,
  cleanLocalizedDisplayName,
  uiLanguageForTag,
  preferredLocalizationCodes,
  humanizeDisplayName,
  handleSave
};
