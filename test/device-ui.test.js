// Dependency-free unit + property tests for the device-centric-ui pure helpers.
// Run: node test/device-ui.test.js   (no framework; plain assertions + loops)
// Covers Properties 1–3 from docs/specs/device-centric-ui/design.md.
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  validateProfile, matchDevice, computeTopMods, buildColorMap, COLORS, remapInputSettingsText
} = require("../public/app.js");
const {
  findConflicts, isVanillaAction, vanillaDefaultFileForLanguage,
  validateInputSettingsSyntax, parseInputSettingsText, sortInputSettingsText, compareInputKeys,
  parseInputXmlText, parseLocalizationCsvText, parseWitcherScriptLocalizationKeys,
  findW3StringsExe, w3StringsToolKind, decodeW3StringsToCachedCsv,
  resolveDisplayName, cleanLocalizedDisplayName, uiLanguageForTag, preferredLocalizationCodes, humanizeDisplayName, handleSave
} = require("../server.js");

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
  assert.ok(css.includes('background: url("/assets/keymapper-header.png");'));
  assert.ok(css.includes("background-size: cover;"));
  assert.ok(css.includes("background-repeat: no-repeat;"));
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

console.log(`\n${passed} Tests bestanden.`);
