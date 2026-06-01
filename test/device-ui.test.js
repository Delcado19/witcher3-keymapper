// Dependency-free unit + property tests for the device-centric-ui pure helpers.
// Run: node test/device-ui.test.js   (no framework; plain assertions + loops)
// Covers Properties 1–3 from .kiro/specs/device-centric-ui/design.md.
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const {
  validateProfile, matchDevice, computeTopMods, buildColorMap, COLORS
} = require("../public/app.js");

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
  assert.strictEqual(buildColorMap(cmds, []).get("IK_A"), COLORS.vanilla);
});
ok("buildColorMap: conflict key -> high colour", () => {
  const cmds = [{ source: "game/input.xml", keys: [{ key: "IK_B" }] }];
  assert.strictEqual(buildColorMap(cmds, [{ key: "IK_B", severity: "high" }]).get("IK_B"), COLORS.high);
});
ok("buildColorMap: IK_None is ignored", () => {
  const cmds = [{ source: "modX", keys: [{ key: "IK_None" }] }];
  assert.strictEqual(buildColorMap(cmds, []).has("IK_None"), false);
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
