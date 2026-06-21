// Dependency-free unit + property tests for the device-centric-ui pure helpers.
// Run: node test/device-ui.test.js   (no framework; plain assertions + loops)
// Covers Properties 1–3 from docs/specs/device-centric-ui/design.md.
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  validateProfile, matchDevice, computeTopMods, buildColorMap, COLORS, remapInputSettingsText, groupConflicts, buildRemapPreview, computeLeaderLayout,
  ikForKeyboardEvent, KEYCODE_TO_IK
} = require("../public/app.js");
const {
  findConflicts, isVanillaAction, vanillaDefaultFileForLanguage,
  validateInputSettingsSyntax, parseInputSettingsText, sortInputSettingsText, compareInputKeys,
  parseInputXmlText, parseLocalizationCsvText, parseWitcherScriptLocalizationKeys,
  findW3StringsExe, w3StringsToolKind, decodeW3StringsToCachedCsv,
  resolveDisplayName, curatedDisplayName, CURATED_DISPLAY_NAMES, mergeAliasCommands, ALIAS_COMMAND_CANONICAL, cleanLocalizedDisplayName, uiLanguageForTag, preferredLocalizationCodes, humanizeDisplayName, isEngineInternalCommand, handleSave,
  assertValidProfilePayload,
  isAllowedHost, isAllowedOrigin, resolvePublicPath, extractMultipartFile, resolveGamePaths
} = require("../server.js");

// Build a multipart/form-data body the way a browser would: each part is
// `--boundary CRLF headers CRLF CRLF body CRLF`, terminated by `--boundary--`.
// body is a Buffer so binary/UTF-16 payloads stay byte-exact.
function buildMultipart(boundary, parts) {
  const chunks = [];
  for (const part of parts) {
    chunks.push(Buffer.from(`--${boundary}\r\n${part.headers}\r\n\r\n`));
    chunks.push(part.body);
    chunks.push(Buffer.from("\r\n"));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return Buffer.concat(chunks);
}

const registry = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../public/devices/index.json"), "utf8")
).profiles;

let passed = 0;
function ok(name, fn) { fn(); passed += 1; console.log(`  ok  ${name}`); }

// ---- Unit tests ----
ok("matchDevice: exact VID:PID hit -> iso-de-105", () => {
  const m = matchDevice("1E7D", "307A", registry, "en-US");
  assert.strictEqual(m.id, "iso-de-105");
});
ok("matchDevice: VID:PID is case-insensitive", () => {
  assert.strictEqual(matchDevice("1e7d", "307a", registry, null).id, "iso-de-105");
});
ok("matchDevice: null language, no hit -> null (dropdown trigger)", () => {
  assert.strictEqual(matchDevice(null, null, registry, null), null);
});
ok("validateProfile: missing required field is rejected", () => {
  assert.strictEqual(validateProfile({ id: "x", name: "n", type: "keyboard", layout: "l" }), false); // no keys
  assert.strictEqual(validateProfile({ id: "x", name: "n", type: "keyboard", layout: "l", keys: [] }), true);
});
ok("buildColorMap: empty commands -> empty map", () => {
  assert.strictEqual(buildColorMap([], []).size, 0);
});
ok("buildColorMap: vanilla key -> vanilla colour", () => {
  const cmds = [{ source: "game/input.xml", keys: [{ key: "IK_A" }] }];
  assert.strictEqual(buildColorMap(cmds, []).get("IK_A"), COLORS.vanillaAction);
});
ok("buildColorMap: conflict key -> high colour", () => {
  const cmds = [{ source: "game/input.xml", keys: [{ key: "IK_B" }] }];
  assert.strictEqual(buildColorMap(cmds, [{ key: "IK_B", severity: "high" }]).get("IK_B"), COLORS.high);
});
ok("buildColorMap: mixed vanilla sources keep vanilla action colour without scanner conflict", () => {
  const cmds = [
    { id: "SteelSword", source: "game/input.xml", actions: ["SteelSword"], keys: [{ key: "IK_1" }] },
    { source: "unknown", keys: [{ key: "IK_1" }] }
  ];
  assert.strictEqual(buildColorMap(cmds, []).get("IK_1"), COLORS.vanillaAction);
});
ok("buildColorMap: vanilla movement wins over secondary action aliases", () => {
  const cmds = [
    { id: "GI_AxisLeftY", source: "game/input.xml", actions: ["GI_AxisLeftY"], keys: [{ key: "IK_W" }] },
    { id: "ItemsPadUp", source: "game/input.xml", actions: ["ItemsPadUp"], keys: [{ key: "IK_W" }] },
    { source: "unknown", keys: [{ key: "IK_E" }] }
  ];
  assert.strictEqual(buildColorMap(cmds, []).get("IK_W"), COLORS.vanillaMovement);
});
ok("buildColorMap: vanilla menu colour is distinct", () => {
  const cmds = [{ id: "PanelInv", source: "game/input.xml", actions: ["PanelInv"], keys: [{ key: "IK_I" }] }];
  assert.strictEqual(buildColorMap(cmds, []).get("IK_I"), COLORS.vanillaMenu);
});
ok("buildColorMap: known vanilla menu action keeps menu colour even when sourced from a mod file", () => {
  const cmds = [{ id: "PanelInv", source: "modMergedFiles", actions: ["PanelInv"], keys: [{ key: "IK_I" }] }];
  assert.strictEqual(buildColorMap(cmds, []).get("IK_I"), COLORS.vanillaMenu);
});
ok("buildColorMap: mod-only extended item actions do not become vanilla actions", () => {
  const cmds = [{ id: "UseItem3", source: "modFriendlyHUD", actions: ["UseItem3"], keys: [{ key: "IK_3" }] }];
  assert.notStrictEqual(buildColorMap(cmds, []).get("IK_3"), COLORS.vanillaAction);
});
ok("buildColorMap: mixed mod-only sources without scanner conflict are neutral", () => {
  const cmds = [
    { source: "modA", keys: [{ key: "IK_E" }] },
    { source: "unknown", keys: [{ key: "IK_E" }] }
  ];
  assert.strictEqual(buildColorMap(cmds, []).get("IK_E"), COLORS.other);
});
ok("buildColorMap: IK_None is ignored", () => {
  const cmds = [{ source: "modX", keys: [{ key: "IK_None" }] }];
  assert.strictEqual(buildColorMap(cmds, []).has("IK_None"), false);
});
ok("findConflicts: vanilla-only conflicts are ignored", () => {
  const entries = [
    { section: "Combat", key: "IK_E", action: "VanillaA", lineNumber: 1 },
    { section: "Combat", key: "IK_E", action: "VanillaB", lineNumber: 2 },
    { section: "Combat", key: "IK_F", action: "VanillaA", lineNumber: 3 },
    { section: "Combat", key: "IK_F", action: "ModA", lineNumber: 4 }
  ];
  const sourceByCommandId = new Map([
    ["VanillaA", "game/input.xml"],
    ["VanillaB", "game/input.xml"],
    ["ModA", "modFriendlyHUD"]
  ]);
  const conflicts = findConflicts(entries, new Map(), sourceByCommandId);
  assert.strictEqual(conflicts.some((conflict) => conflict.key === "IK_E"), false);
  assert.strictEqual(conflicts.some((conflict) => conflict.key === "IK_F"), true);
});
ok("isVanillaAction: official controls actions are vanilla even when input.xml misses them", () => {
  assert.strictEqual(isVanillaAction("SwordSheathe", new Set()), true);
  assert.strictEqual(isVanillaAction("AltQuenCasting", new Set()), true);
  assert.strictEqual(isVanillaAction("MoveForward", new Set(["MoveForward"])), true);
  assert.strictEqual(isVanillaAction("ShowDeveloperMode", new Set(["ShowDeveloperMode"])), true);
  assert.strictEqual(isVanillaAction("ModLootEverything", new Set()), false);
});
ok("vanillaDefaultFileForLanguage: maps keyboard language to legacy layout ini", () => {
  assert.ok(vanillaDefaultFileForLanguage("de-DE").endsWith("input_qwertz.ini"));
  assert.ok(vanillaDefaultFileForLanguage("fr-FR").endsWith("input_azerty.ini"));
  assert.ok(vanillaDefaultFileForLanguage("en-US").endsWith("input_qwerty.ini"));
  assert.ok(vanillaDefaultFileForLanguage(null).endsWith("input_qwerty.ini"));
});
ok("validateInputSettingsSyntax: accepts Witcher bindings and valueless flags", () => {
  const parsed = parseInputSettingsText([
    "[InputSettings]",
    "Version=55",
    "[Exploration]",
    "IK_E=(Action=Use,State=Duration,IdleTime=0.1)",
    "IK_RightMouse=(Action=Focus,Reprocess)"
  ].join("\n"));
  assert.strictEqual(parsed.syntax.valid, true);
  assert.strictEqual(parsed.entries.length, 2);
  assert.strictEqual(parsed.entries[1].action, "Focus");
});
ok("validateInputSettingsSyntax: reports malformed loaded input.settings lines", () => {
  const syntax = validateInputSettingsSyntax([
    "IK_E=(Action=Use)",
    "[Exploration]",
    "IK_F=(State=Duration)",
    "Not a binding"
  ]);
  assert.strictEqual(syntax.valid, false);
  assert.deepStrictEqual(syntax.errors.map((item) => item.lineNumber), [1, 3, 4]);
  assert.ok(syntax.errors.some((item) => item.message.includes("before any section")));
  assert.ok(syntax.errors.some((item) => item.message.includes("missing required Action")));
});
ok("parseInputXmlText: reads Witcher input metadata display keys", () => {
  const vars = parseInputXmlText([
    '<Var builder="Input" id="MoveFwd" displayName="move_forward" tags="movement" actions="MoveFwd;GI_AxisLeftY" />',
    '<Var builder="Other" id="Ignored" displayName="ignored" actions="Ignored" />'
  ].join("\n"));
  assert.strictEqual(vars.length, 1);
  assert.strictEqual(vars[0].id, "MoveFwd");
  assert.strictEqual(vars[0].displayName, "move_forward");
  assert.deepStrictEqual(vars[0].actions, ["MoveFwd", "GI_AxisLeftY"]);
});
ok("parseLocalizationCsvText: reads full and abbreviated Witcher localization rows", () => {
  const map = parseLocalizationCsvText([
    ";meta[language=en]",
    "; id      |key(hex)|key(str)| text",
    "2110365062|        |PauseGameToggle|Pause game",
    "panel_Mods|Mods"
  ].join("\n"));
  assert.strictEqual(map.get("PauseGameToggle"), "Pause game");
  assert.strictEqual(map.get("panel_Mods"), "Mods");
});
ok("parseWitcherScriptLocalizationKeys: extracts GetLocString keys from .ws text", () => {
  const keys = parseWitcherScriptLocalizationKeys([
    'theGame.GetGuiManager().ShowNotification(GetLocStringByKeyExt("ahdal_radiusDistanceSet"));',
    "var label = GetLocString('panel_Mods');"
  ].join("\n"));
  assert.deepStrictEqual(keys, ["ahdal_radiusDistanceSet", "panel_Mods"]);
});
ok("findW3StringsExe: detects optional local decoder when available", () => {
  const exe = findW3StringsExe();
  if (exe) assert.ok(/w3strings(?:-ng)?\.exe$/i.test(exe));
  assert.strictEqual(w3StringsToolKind("C:\\tools\\w3strings-ng.exe"), "ng");
  assert.strictEqual(w3StringsToolKind("C:\\tools\\w3strings.exe"), "legacy");
});
ok("decodeW3StringsToCachedCsv: passes dictionary keys to w3strings-ng", () => {
  const exe = findW3StringsExe();
  const source = "F:\\GOG Galaxy\\Games\\The Witcher 3 Wild Hunt GOTY\\content\\content0\\de.w3strings";
  if (!exe || !fs.existsSync(source)) return;

  const csv = decodeW3StringsToCachedCsv(source, exe, new Set(["move_forward", "toggle_walk_run"]));
  assert.ok(csv && fs.existsSync(csv));
  const decoded = fs.readFileSync(csv, "utf8");
  assert.ok(decoded.includes("|move_forward|") || decoded.includes("|toggle_walk_run|"));
});
ok("resolveDisplayName: prefers localization and humanizes raw display keys", () => {
  const localized = new Map([["PauseGameToggle", "Pause game"]]);
  assert.strictEqual(resolveDisplayName("PauseGameToggle", localized), "Pause game");
  assert.strictEqual(resolveDisplayName("ControlLayout_RunSprint", localized), "Run Sprint");
  assert.strictEqual(resolveDisplayName("panel_groupname_fast_attack", localized), "Fast Attack");
  assert.strictEqual(humanizeDisplayName("move_forward"), "Move Forward");
  // Letter->digit split so arbitrary mod ids read cleanly (generic, no curation).
  assert.strictEqual(humanizeDisplayName("UseItem1"), "Use Item 1");
  assert.strictEqual(humanizeDisplayName("UseItem10"), "Use Item 10");
});
ok("isEngineInternalCommand: tags vanilla engine plumbing, leaves player/mod actions visible", () => {
  // Stick/axis proxies, combo multiplexers and radial-menu internals are hidden
  // behind the toggle; real player and mod actions stay in the default list.
  for (const id of ["GI_AxisLeftX", "GI_MouseDampY", "ComboDigitLeft", "ConfirmRadialMenuSelection", "CloseRadialMenu", "ChangeChoiceAxis", "PanelFakeHud"]) {
    assert.strictEqual(isEngineInternalCommand(id), true, id);
  }
  for (const id of ["RadialMenu", "MoveFwd", "UseItem1", "ItemsPadUp", "ShowPotionsHelper", "SCAARDodge"]) {
    assert.strictEqual(isEngineInternalCommand(id), false, id);
  }
});
ok("ikForKeyboardEvent: maps KeyboardEvent.code to the real IK_ spelling used in input.settings", () => {
  // Spellings verified against the live scan (IK_NumPad3, IK_LControl, IK_Tilde, …).
  assert.strictEqual(ikForKeyboardEvent({ code: "KeyA" }), "IK_A");
  assert.strictEqual(ikForKeyboardEvent({ code: "Digit3" }), "IK_3");
  assert.strictEqual(ikForKeyboardEvent({ code: "Numpad3" }), "IK_NumPad3");
  assert.strictEqual(ikForKeyboardEvent({ code: "F11" }), "IK_F11");
  assert.strictEqual(ikForKeyboardEvent({ code: "ControlLeft" }), "IK_LControl");
  assert.strictEqual(ikForKeyboardEvent({ code: "Backquote" }), "IK_Tilde");
  assert.strictEqual(ikForKeyboardEvent({ code: "NumpadDecimal" }), "IK_NumPeriod");
  // Every mapped value must be a valid IK_ token (matches the dialog's pattern).
  for (const ik of Object.values(KEYCODE_TO_IK)) assert.ok(/^IK_[A-Za-z0-9_]+$/.test(ik), ik);
  // Unmapped codes return null so capture keeps waiting instead of binding junk.
  assert.strictEqual(ikForKeyboardEvent({ code: "MediaPlayPause" }), null);
});
ok("curatedDisplayName: returns language-specific official/community names, '' for unknown ids", () => {
  // Step 2.2: official in-game labels (verbatim, including the hyphen spacing).
  assert.strictEqual(curatedDisplayName("MoveFwd", "de"), "Bewegung - Oben");
  assert.strictEqual(curatedDisplayName("MoveFwd", "en"), "Movement - Up");
  // Hold-attack variants are disambiguated from the localized tap actions.
  assert.strictEqual(curatedDisplayName("SpecialAttackLight", "de"), "Schneller Angriff (halten)");
  // Non-"de" locales fall back to English.
  assert.strictEqual(curatedDisplayName("PanelMap", "fr"), "Map");
  // Commands without a curated entry must not be invented.
  assert.strictEqual(curatedDisplayName("FastMenu", "de"), "");
  assert.strictEqual(curatedDisplayName("NotARealCommand", "en"), "");
});
ok("mergeAliasCommands: folds alias bindings into the canonical command, deletes the alias, leaves orphans alone", () => {
  const map = new Map([
    ["RadialMenu", { id: "RadialMenu", displayName: "Quick Access Menu", displayNameSource: "localized", actions: ["RadialMenu"], bindings: [{ section: "Exploration", key: "IK_Tab" }] }],
    ["FastMenu", { id: "FastMenu", displayName: "Fast Menu", displayNameSource: "humanized", actions: ["FastMenu"], bindings: [{ section: "Combat", key: "IK_Tab" }] }],
    // Canonical missing for this alias -> must be left untouched, never silently dropped.
    ["GotoGlossary", { id: "GotoGlossary", displayName: "Goto Glossary", displayNameSource: "humanized", actions: ["GotoGlossary"], bindings: [{ section: "Exploration", key: "IK_G" }] }]
  ]);
  mergeAliasCommands(map);
  assert.ok(!map.has("FastMenu"), "merged alias is removed");
  const radial = map.get("RadialMenu");
  assert.strictEqual(radial.displayName, "Quick Access Menu", "canonical keeps its real name");
  assert.strictEqual(radial.bindings.length, 2, "alias bindings folded in");
  assert.deepStrictEqual(radial.actions, ["RadialMenu", "FastMenu"], "actions merged so a remap still hits both");
  assert.ok(map.has("GotoGlossary"), "alias without canonical stays so no binding disappears");
  // The alias map must only point at canonical ids, never at another alias.
  for (const canonical of Object.values(ALIAS_COMMAND_CANONICAL)) {
    assert.ok(!(canonical in ALIAS_COMMAND_CANONICAL), `${canonical} is canonical, must not also be an alias key`);
  }
});
ok("CURATED_DISPLAY_NAMES: no curated label collides with another curated label, and known alias variants are excluded", () => {
  // Engine alias variants would duplicate an already-localized row, so they are
  // intentionally left humanized (deduplication is Step 3, not translation).
  for (const excluded of ["FastMenu", "HoldFastMenu", "GotoGlossary", "IngameMenu", "OpenMeditation", "ExplorationInteraction", "SprintGallop"]) {
    assert.ok(!(excluded in CURATED_DISPLAY_NAMES), `${excluded} must stay humanized`);
  }
  // Every entry must define both languages.
  for (const [id, names] of Object.entries(CURATED_DISPLAY_NAMES)) {
    assert.ok(names.de && names.en, `${id} must have de and en`);
  }
});
ok("cleanLocalizedDisplayName: strips Witcher XML font markup from localized names", () => {
  assert.strictEqual(cleanLocalizedDisplayName('<font size="18">Aktuell (drücken) / Umschalten (halten)</font>'), "Aktuell (drücken) / Umschalten (halten)");
});
ok("preferredLocalizationCodes: German uses German with English fallback, others stay English", () => {
  assert.deepStrictEqual(preferredLocalizationCodes("de-DE"), ["de", "en"]);
  assert.deepStrictEqual(preferredLocalizationCodes("en-US"), ["en"]);
  assert.deepStrictEqual(preferredLocalizationCodes("fr-FR"), ["en"]);
  assert.deepStrictEqual(preferredLocalizationCodes(null), ["en"]);
  assert.strictEqual(uiLanguageForTag("de-AT"), "de");
  assert.strictEqual(uiLanguageForTag("pl-PL"), "en");
});
ok("compareInputKeys: section sort order follows keyboard groups", () => {
  const keys = [
    "IK_UnknownB", "IK_None", "IK_Pad_A_CROSS", "IK_Pad_LeftTrigger", "IK_LeftMouse",
    "IK_RightMouse", "IK_F2", "IK_NumPad1", "IK_NumSlash", "IK_1", "IK_B", "IK_A",
    "IK_0", "IK_NumPad0", "IK_F1", "IK_Tab", "IK_Escape", "IK_Tilde", "IK_OEM_102",
    "IK_UnknownA"
  ];
  assert.deepStrictEqual(keys.sort(compareInputKeys), [
    "IK_A", "IK_B", "IK_0", "IK_1", "IK_NumPad0", "IK_NumPad1",
    "IK_NumSlash", "IK_F1", "IK_F2", "IK_LeftMouse", "IK_RightMouse", "IK_Tab",
    "IK_Escape", "IK_Tilde", "IK_OEM_102", "IK_Pad_A_CROSS", "IK_Pad_LeftTrigger",
    "IK_None", "IK_UnknownA", "IK_UnknownB"
  ]);
});
ok("sortInputSettingsText: sorts bindings inside each section and keeps same-key order", () => {
  const sorted = sortInputSettingsText([
    "[Combat]",
    "IK_F1=(Action=Help)",
    "IK_B=(Action=Second)",
    "IK_A=(Action=First)",
    "IK_B=(Action=SecondHold,State=Duration,IdleTime=0.2)",
    "IK_0=(Action=Zero)",
    "IK_NumPad0=(Action=NumZero)",
    "IK_None=(Action=Disabled)",
    "",
    "[InputSettings]",
    "Version=55"
  ].join("\n"));
  assert.strictEqual(sorted, [
    "[Combat]",
    "IK_A=(Action=First)",
    "IK_B=(Action=Second)",
    "IK_B=(Action=SecondHold,State=Duration,IdleTime=0.2)",
    "IK_0=(Action=Zero)",
    "IK_NumPad0=(Action=NumZero)",
    "IK_F1=(Action=Help)",
    "IK_None=(Action=Disabled)",
    "",
    "[InputSettings]",
    "Version=55"
  ].join("\n"));
});
ok("handleSave: writes sorted content and creates backup for existing targets", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "witcher3-keymapper-"));
  const target = path.join(dir, "input.settings");
  const unsorted = [
    "[Combat]",
    "IK_F1=(Action=Help)",
    "IK_B=(Action=B)",
    "IK_0=(Action=Zero)",
    "IK_A=(Action=A)",
    "IK_None=(Action=Disabled)"
  ].join("\n");

  const first = handleSave({ targetPath: target, content: unsorted });
  assert.strictEqual(first.backup, null);
  assert.strictEqual(fs.readFileSync(target, "utf8"), [
    "[Combat]",
    "IK_A=(Action=A)",
    "IK_B=(Action=B)",
    "IK_0=(Action=Zero)",
    "IK_F1=(Action=Help)",
    "IK_None=(Action=Disabled)"
  ].join("\n"));

  const second = handleSave({ targetPath: target, content: unsorted });
  assert.ok(second.backup && fs.existsSync(second.backup));
});
ok("topbar HTML: no standalone Sort button and Reload is compact", () => {
  const html = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");
  assert.strictEqual(html.includes("sortFile"), false);
  assert.ok(html.includes("<span>Reload</span>"));
  assert.strictEqual(html.includes("<span>Settings</span>"), false);
  assert.ok(html.includes("Reload project input.settings from disk"));
  assert.ok(html.includes('<header class="topbar" aria-label="Witcher 3 Keymap Editor">'));
  assert.strictEqual(html.includes("brand-line-main"), false);
  assert.strictEqual(html.includes("brand-claws"), false);
});
ok("topbar CSS: header uses the PNG directly without tiling", () => {
  const css = fs.readFileSync(path.join(__dirname, "../public/styles.css"), "utf8");
  // The banner is full-bleed: the topbar carries the logo's exact 2172x480 aspect ratio, so
  // both the blurred backdrop (.topbar::before) and the sharp logo (.topbar-logo) use the PNG
  // at `center / cover no-repeat` — full window width, height grows with width, no tiling and
  // (because the box matches the image ratio) no crop. Replaces the earlier `contain` logo.
  assert.ok(css.includes('background: url("/assets/keymapper-header.png") center / cover no-repeat;'));
  assert.ok(css.includes("aspect-ratio: 2172 / 480;"));
  assert.strictEqual(css.includes("center / contain no-repeat"), false);
});
ok("dialog HTML: cancel buttons bypass required-field validation", () => {
  const html = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");
  const cancelButtons = html.match(/<button value="cancel" formnovalidate>/g) || [];
  assert.strictEqual(cancelButtons.length, 2);
});
ok("findConflicts: tap/hold pairs on one key are ignored", () => {
  const entries = [
    { section: "Combat", key: "IK_Backspace", action: "FastMenu", state: "", lineNumber: 1 },
    { section: "Combat", key: "IK_Backspace", action: "HoldFastMenu", state: "Duration", idleTime: "0.2", lineNumber: 2 }
  ];
  assert.strictEqual(findConflicts(entries, new Map(), new Map()).length, 0);
});
ok("findConflicts: keyboard movement plus GI axis helper is ignored", () => {
  const entries = [
    { section: "Combat", key: "IK_W", action: "MoveFwd", state: "", lineNumber: 1 },
    { section: "Combat", key: "IK_W", action: "GI_AxisLeftY", state: "Axis", value: "1", lineNumber: 2 }
  ];
  assert.strictEqual(findConflicts(entries, new Map(), new Map()).length, 0);
});
ok("findConflicts: contextual interaction aliases are ignored", () => {
  const entries = [
    { section: "Exploration", key: "IK_E", action: "Interaction", lineNumber: 1 },
    { section: "Exploration", key: "IK_E", action: "PlaceTrophy", lineNumber: 2 },
    { section: "Exploration", key: "IK_E", action: "BuryBody", lineNumber: 3 }
  ];
  assert.strictEqual(findConflicts(entries, new Map(), new Map()).length, 0);
});
ok("findConflicts: debug-only rows do not create gameplay conflicts", () => {
  const entries = [
    { section: "Combat", key: "IK_Pad_B_CIRCLE", action: "DebugInput", lineNumber: 1 },
    { section: "Combat", key: "IK_Pad_B_CIRCLE", action: "Dodge", lineNumber: 2 }
  ];
  assert.strictEqual(findConflicts(entries, new Map(), new Map()).length, 0);
});
ok("findConflicts: D-pad sword and oil aliases are ignored", () => {
  const entries = [
    { section: "Combat", key: "IK_Pad_DigitLeft", action: "OilSteel", lineNumber: 1 },
    { section: "Combat", key: "IK_Pad_DigitLeft", action: "SwordSheathe", lineNumber: 2 },
    { section: "Combat", key: "IK_Pad_DigitLeft", action: "SteelSword", lineNumber: 3 },
    { section: "Combat", key: "IK_Pad_DigitLeft", action: "ComboDigitLeft", lineNumber: 4 }
  ];
  assert.strictEqual(findConflicts(entries, new Map(), new Map()).length, 0);
});
ok("findConflicts: panel and abort aliases are ignored", () => {
  const entries = [
    { section: "Boat", key: "IK_O", action: "PanelCraft", lineNumber: 1 },
    { section: "Boat", key: "IK_O", action: "PanelFakeHud", lineNumber: 2 },
    { section: "Boat", key: "IK_Pad_B_CIRCLE", action: "HorseDismount", lineNumber: 3 },
    { section: "Boat", key: "IK_Pad_B_CIRCLE", action: "VehicleItemActionAbort", lineNumber: 4 }
  ];
  assert.strictEqual(findConflicts(entries, new Map(), new Map()).length, 0);
});
ok("findConflicts: alternate and guard aliases are ignored", () => {
  const entries = [
    { section: "RadialMenu", key: "IK_Pad_LeftTrigger", action: "Alternate", lineNumber: 1 },
    { section: "RadialMenu", key: "IK_Pad_LeftTrigger", action: "LockAndGuard", lineNumber: 2 }
  ];
  assert.strictEqual(findConflicts(entries, new Map(), new Map()).length, 0);
});
ok("findConflicts: non-aliased same-activation commands still conflict", () => {
  const entries = [
    { section: "Combat", key: "IK_E", action: "Interaction", lineNumber: 1 },
    { section: "Combat", key: "IK_E", action: "ModLootEverything", lineNumber: 2 }
  ];
  const conflicts = findConflicts(entries, new Map(), new Map());
  assert.strictEqual(conflicts.length, 1);
  assert.deepStrictEqual(conflicts[0].commands.sort(), ["Interaction", "ModLootEverything"].sort());
});
ok("findConflicts: mod-vs-gameplay conflicts remain visible", () => {
  const entries = [
    { section: "Combat", key: "IK_Pad_LeftTrigger", action: "AutoLootRadius", lineNumber: 1 },
    { section: "Combat", key: "IK_Pad_LeftTrigger", action: "Focus", lineNumber: 2 }
  ];
  const conflicts = findConflicts(entries, new Map(), new Map());
  assert.strictEqual(conflicts.length, 1);
  assert.deepStrictEqual(conflicts[0].commands.sort(), ["AutoLootRadius", "Focus"].sort());
});
ok("remapInputSettingsText: session remap respects action and oldKey", () => {
  const text = [
    "[Exploration]",
    "IK_E=(Action=Use,State=Duration)",
    "IK_F=(Action=Use,State=Duration)",
    "IK_E=(Action=Jump,State=Duration)"
  ].join("\n");
  const result = remapInputSettingsText(text, ["Use"], "IK_None", "IK_E");
  assert.strictEqual(result.changed, 1);
  assert.ok(result.content.includes("IK_None=(Action=Use,State=Duration)"));
  assert.ok(result.content.includes("IK_F=(Action=Use,State=Duration)"));
  assert.ok(result.content.includes("IK_E=(Action=Jump,State=Duration)"));
});

ok("buildRemapPreview: total equals binding count (incl. IK_None), grouped by section, key validated", () => {
  const command = {
    id: "SpecialAttackLight",
    bindings: [
      { section: "Combat", key: "IK_LeftMouse" },
      { section: "Combat", key: "IK_None" },
      { section: "Exploration", key: "IK_Pad_X_SQUARE" }
    ]
  };
  // remap() matches by action across all sections incl. IK_None, so the preview
  // must count every binding (the trust check that preview == server `changed`).
  const valid = buildRemapPreview(command, "IK_NumPad3");
  assert.strictEqual(valid.total, 3);
  assert.strictEqual(valid.sectionCount, 2);
  assert.strictEqual(valid.newKey, "IK_NumPad3");
  const combat = valid.sections.find((s) => s.section === "Combat");
  assert.deepStrictEqual(combat.keys, ["IK_LeftMouse", "IK_None"]);
  // Invalid/partial target key is not echoed as a destination.
  assert.strictEqual(buildRemapPreview(command, "Num3").newKey, "");
  // Missing bindings degrade gracefully.
  assert.strictEqual(buildRemapPreview({ id: "x" }, "IK_A").total, 0);
});

ok("findConflicts: reports the canonical id for merged aliases so the sidebar matches the list", () => {
  const entries = [
    { section: "Exploration", key: "IK_Space", action: "JumpRoll", state: "Duration", idleTime: "0", lineNumber: 10 },
    { section: "Exploration", key: "IK_Space", action: "ExplorationInteraction", state: "Duration", idleTime: "0", lineNumber: 11 }
  ];
  const commandByAction = new Map(); // neither action is an input.xml command -> id == action
  const sourceByCommandId = new Map([["JumpRoll", "modFriendlyHUD"], ["ExplorationInteraction", "game/input.xml"]]);
  const conflicts = findConflicts(entries, commandByAction, sourceByCommandId);
  assert.strictEqual(conflicts.length, 1);
  // ExplorationInteraction is folded into Interaction in the mappings list (Step 3B),
  // so the conflict must speak "Interaction", never the raw alias id, or the linked
  // highlight would point at a list row that no longer exists.
  assert.ok(conflicts[0].commands.includes("Interaction"), "canonical id is reported");
  assert.ok(!conflicts[0].commands.includes("ExplorationInteraction"), "raw alias id is not leaked");
  const idx = conflicts[0].commands.indexOf("Interaction");
  assert.strictEqual(conflicts[0].sources[idx], "game/input.xml", "source stays aligned after relabel");
});

ok("isAllowedHost: only loopback Host headers are accepted (DNS-rebinding guard)", () => {
  assert.strictEqual(isAllowedHost({ headers: { host: "127.0.0.1:5177" } }), true);
  assert.strictEqual(isAllowedHost({ headers: { host: "localhost:5177" } }), true);
  assert.strictEqual(isAllowedHost({ headers: { host: "localhost" } }), true);
  assert.strictEqual(isAllowedHost({ headers: {} }), true); // curl without Host header
  assert.strictEqual(isAllowedHost({ headers: { host: "attacker.com" } }), false);
  assert.strictEqual(isAllowedHost({ headers: { host: "evil.example:5177" } }), false);
});
ok("isAllowedOrigin: only loopback or absent Origin is accepted (CSRF guard)", () => {
  assert.strictEqual(isAllowedOrigin({ headers: {} }), true); // same-document fetch / curl
  assert.strictEqual(isAllowedOrigin({ headers: { origin: "http://127.0.0.1:5177" } }), true);
  assert.strictEqual(isAllowedOrigin({ headers: { origin: "http://localhost:5177" } }), true);
  assert.strictEqual(isAllowedOrigin({ headers: { origin: "https://evil.example" } }), false);
  assert.strictEqual(isAllowedOrigin({ headers: { origin: "not a url" } }), false);
});

ok("resolvePublicPath: serves files inside publicDir, rejects traversal escapes", () => {
  assert.ok(resolvePublicPath("/").endsWith(path.join("public", "index.html")));
  assert.ok(resolvePublicPath("/app.js").endsWith(path.join("public", "app.js")));
  assert.ok(resolvePublicPath("/devices/index.json").includes(path.join("public", "devices")));
  // Decoded "../" escapes (a percent-encoded ".." reaches here as a real "..").
  assert.strictEqual(resolvePublicPath("/../server.js"), null);
  assert.strictEqual(resolvePublicPath("/../../etc/passwd"), null);
  // Sibling-prefix trick that a bare startsWith(publicDir) would have allowed.
  assert.strictEqual(resolvePublicPath("/../public-secret/x"), null);
});

ok("extractMultipartFile: extracts the file field body as raw bytes", () => {
  const boundary = "----w3ascii";
  const body = Buffer.from("[Exploration]\nIK_A=(Action=Test)\n", "utf8");
  const buf = buildMultipart(boundary, [
    { headers: 'Content-Disposition: form-data; name="file"; filename="input.settings"', body }
  ]);
  assert.deepStrictEqual(extractMultipartFile(buf, boundary), body);
});
ok("extractMultipartFile: preserves UTF-16LE bytes and picks the file part among others", () => {
  const boundary = "----w3utf16";
  // BOM + UTF-16LE content — /api/load must hand this to decodeBuffer byte-exact.
  const body = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("[InputSettings]", "utf16le")]);
  const buf = buildMultipart(boundary, [
    { headers: 'Content-Disposition: form-data; name="lang"', body: Buffer.from("de") },
    { headers: 'Content-Disposition: form-data; name="file"; filename="input.settings"', body }
  ]);
  const out = extractMultipartFile(buf, boundary);
  assert.deepStrictEqual(out, body);
  assert.strictEqual(out[0], 0xff);
  assert.strictEqual(out[1], 0xfe);
});
ok("extractMultipartFile: returns null when no file/filename part is present", () => {
  const boundary = "----w3none";
  const buf = buildMultipart(boundary, [
    { headers: 'Content-Disposition: form-data; name="lang"', body: Buffer.from("de") }
  ]);
  assert.strictEqual(extractMultipartFile(buf, boundary), null);
});
ok("extractMultipartFile: returns null when the boundary is absent", () => {
  assert.strictEqual(extractMultipartFile(Buffer.from("no multipart boundary here"), "----w3x"), null);
});

ok("resolveGamePaths: derives all game sub-paths from the game root", () => {
  const gameRoot = path.join("X:", "Games", "Witcher 3");
  const p = resolveGamePaths(gameRoot);
  assert.strictEqual(p.gameRoot, gameRoot);
  assert.strictEqual(p.modsDir, path.join(gameRoot, "Mods"));
  assert.strictEqual(p.gameInputXml, path.join(gameRoot, "bin", "config", "r4game", "user_config_matrix", "pc", "input.xml"));
  assert.strictEqual(p.vanillaDefaultDir, path.join(gameRoot, "bin", "config", "r4game", "legacy", "base"));
});

ok("groupConflicts: context-section variants of one key overload collapse into a single entry", () => {
  // Same mod offender (AutoLootRadius) on one key, but the vanilla companions differ
  // per context section — these used to render as three separate conflict rows.
  const raw = [
    { section: "Exploration", key: "IK_Pad_LeftTrigger", keyLabel: "LT", commands: ["AutoLootRadius", "Focus"], sources: ["modAutoLoot", "game/input.xml"], severity: "high" },
    { section: "Combat", key: "IK_Pad_LeftTrigger", keyLabel: "LT", commands: ["AutoLootRadius", "Alternate", "LockAndGuard"], sources: ["modAutoLoot", "game/input.xml", "game/input.xml"], severity: "high" },
    { section: "Combat_Replacer_Ciri", key: "IK_Pad_LeftTrigger", keyLabel: "LT", commands: ["AutoLootRadius", "LockAndGuard"], sources: ["modAutoLoot", "game/input.xml"], severity: "high" }
  ];
  const grouped = groupConflicts(raw);
  assert.strictEqual(grouped.length, 1);
  assert.strictEqual(grouped[0].sections.length, 3);
  // The merged row still lists every command seen sharing the key.
  assert.deepStrictEqual(grouped[0].commands.slice().sort(), ["Alternate", "AutoLootRadius", "Focus", "LockAndGuard"]);
});
ok("groupConflicts: same offender on different keys stays separate", () => {
  const raw = [
    { section: "Exploration", key: "IK_Space", keyLabel: "Space", commands: ["JumpRoll", "ExplorationInteraction"], sources: ["modFriendlyHUD", "game/input.xml"], severity: "medium" },
    { section: "Exploration", key: "IK_Pad_B_CIRCLE", keyLabel: "B", commands: ["JumpRoll", "ExplorationInteraction"], sources: ["modFriendlyHUD", "game/input.xml"], severity: "medium" }
  ];
  assert.strictEqual(groupConflicts(raw).length, 2);
});
ok("groupConflicts: distinct mod offenders on the same key stay separate", () => {
  const raw = [
    { section: "Combat", key: "IK_E", keyLabel: "E", commands: ["ModA", "Interaction"], sources: ["modA", "game/input.xml"], severity: "medium" },
    { section: "Combat", key: "IK_E", keyLabel: "E", commands: ["ModB", "Interaction"], sources: ["modB", "game/input.xml"], severity: "medium" }
  ];
  assert.strictEqual(groupConflicts(raw).length, 2);
});

// ---- Property 1: profile round-trip (Validates Requirement 3.7) ----
// Feature: device-centric-ui, Property 1: profile round-trip
ok("Property 1: profile round-trip (100 iters)", () => {
  for (let i = 0; i < 100; i++) {
    const profile = {
      id: "gen-" + i, name: "Gen " + i, type: ["keyboard", "mouse", "gamepad"][i % 3],
      layout: "lay-" + i, vid: i % 2 ? null : "ABCD", pid: i % 2 ? null : "1234",
      fallback: Boolean(i % 2), fallbackLocales: i % 3 === 0 ? ["de"] : [],
      keys: Array.from({ length: i % 7 }, (_, k) => ({ ik: "IK_" + k, label: "L" + k, x: k, y: 0, w: 1, h: 1, shape: "rect" }))
    };
    const round = JSON.parse(JSON.stringify(profile));
    assert.ok(validateProfile(round));
    for (const f of ["id", "name", "type", "layout"]) assert.strictEqual(round[f], profile[f]);
    assert.deepStrictEqual(round.keys, profile.keys);
  }
});

// ---- Property 2: de-* language -> iso-de-105 (Validates Requirement 8.6) ----
// Feature: device-centric-ui, Property 2: de-language fallback
ok("Property 2: de-* language -> iso-de-105 (100 iters)", () => {
  const regions = ["DE", "AT", "CH", "LU", "BE", "LI", "IT"];
  for (let i = 0; i < 100; i++) {
    const tag = "de-" + regions[i % regions.length];
    const m = matchDevice(null, null, registry, tag);
    assert.strictEqual(m && m.id, "iso-de-105", `failed for ${tag}`);
  }
});

// ---- Property 3: non-de language -> ansi-us-104 (Validates Requirement 8.7) ----
// Feature: device-centric-ui, Property 3: non-de-language fallback
ok("Property 3: non-de language -> ansi-us-104 (100 iters)", () => {
  const tags = ["en-US", "fr-FR", "pl-PL", "es-ES", "it-IT", "ja-JP", "en-GB", "ru-RU"];
  for (let i = 0; i < 100; i++) {
    const tag = tags[i % tags.length];
    const m = matchDevice(null, null, registry, tag);
    assert.strictEqual(m && m.id, "ansi-us-104", `failed for ${tag}`);
  }
});

// ---- Property: colorizer determinism (Validates Requirement 4.7, 4.8) ----
ok("Property: buildColorMap is deterministic (100 iters)", () => {
  const cmds = [
    { source: "modA", keys: [{ key: "IK_A" }, { key: "IK_B" }] },
    { source: "modB", keys: [{ key: "IK_C" }] },
    { source: "game/input.xml", keys: [{ key: "IK_D" }] }
  ];
  const first = buildColorMap(cmds, []);
  for (let i = 0; i < 100; i++) {
    const again = buildColorMap(cmds, []);
    assert.deepStrictEqual([...again.entries()].sort(), [...first.entries()].sort());
  }
});

// ---- Leader-layout editor model ----
const mouseProfile = JSON.parse(fs.readFileSync(path.join(__dirname, "../public/devices/mouse-5btn/profile.json"), "utf8"));

ok("computeLeaderLayout: explicit branch derives anchors from art% and side from sign", () => {
  const layout = computeLeaderLayout(mouseProfile);
  assert.ok(layout.canvas.w > 0 && layout.art.w > 0);
  for (const entry of layout.keys) {
    const k = entry.key;
    // anchor is art.x/y + ax/ay% of the art box
    assert.ok(Math.abs(entry.anchorX - (layout.art.x + (k.ax / 100) * layout.art.w)) < 1e-6);
    assert.ok(Math.abs(entry.anchorY - (layout.art.y + (k.ay / 100) * layout.art.h)) < 1e-6);
    // label sits at its stored lx/ly and text-anchor follows which side of the anchor it is
    assert.strictEqual(entry.lx, k.lx);
    assert.strictEqual(entry.textAnchor, entry.anchorX - k.lx >= 0 ? "end" : "start");
  }
});

ok("computeLeaderLayout: moving the PNG moves every anchor but never the labels", () => {
  const before = computeLeaderLayout(mouseProfile);
  const moved = JSON.parse(JSON.stringify(mouseProfile));
  moved.art.x += 50; // shove the PNG right
  const after = computeLeaderLayout(moved);
  const byIk = new Map(after.keys.map((e) => [e.key.ik, e]));
  for (const b of before.keys) {
    const a = byIk.get(b.key.ik);
    assert.ok(Math.abs(a.anchorX - (b.anchorX + 50)) < 1e-6, "anchor tracks the image");
    assert.strictEqual(a.lx, b.lx, "label stays put in the margin");
  }
});

ok("assertValidProfilePayload: accepts a real seeded profile", () => {
  assert.doesNotThrow(() => assertValidProfilePayload("mouse-5btn", mouseProfile));
});

ok("assertValidProfilePayload: rejects bad id, mismatch, missing canvas/art/keys", () => {
  const cases = [
    ["../evil", mouseProfile],
    ["mouse-5btn", { ...mouseProfile, id: "other" }],
    ["mouse-5btn", { ...mouseProfile, canvas: null }],
    ["mouse-5btn", { ...mouseProfile, art: { x: 0, y: 0, w: 1 } }],     // missing h
    ["mouse-5btn", { ...mouseProfile, keys: [] }],
    ["mouse-5btn", { ...mouseProfile, keys: [{ ik: "IK_X", ax: 1, ay: 1, lx: 1 }] }] // missing ly
  ];
  for (const [id, profile] of cases) {
    let threw = null;
    try { assertValidProfilePayload(id, profile); } catch (e) { threw = e; }
    assert.ok(threw, `expected rejection for ${id}`);
    assert.strictEqual(threw.statusCode, 400);
  }
});

console.log(`\n${passed} Tests bestanden.`);
