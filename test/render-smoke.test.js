// Headless DOM-stub smoke test for the SVG render pipeline (Tasks 5/6).
// No browser/jsdom needed: a tiny SVG-ish DOM shim lets us assert structure —
// key count, data-key attributes, --key-fill colouring, conflict classes.
// This is structural, not pixel-level; the final visual check is a human in the
// browser. Run: node test/render-smoke.test.js
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

// ---- Minimal DOM shim (only what the render functions touch) ----
function makeClassList() {
  const set = new Set();
  return {
    add: (c) => set.add(c),
    remove: (c) => set.delete(c),
    toggle: (c, on) => (on === undefined ? (set.has(c) ? set.delete(c) : set.add(c)) : (on ? set.add(c) : set.delete(c))),
    contains: (c) => set.has(c)
  };
}
function matches(el, sel) {
  if (sel === "[data-key]") return "data-key" in el.attrs;
  if (sel.startsWith(".")) {
    const cls = sel.slice(1);
    // class may be set via classList (applyColoring) or the class attribute (render)
    if (el.classList.contains(cls)) return true;
    return (el.attrs.class || "").split(/\s+/).includes(cls);
  }
  return el.tag === sel;
}
function walk(el, fn) { for (const c of el.children) { fn(c); walk(c, fn); } }
class El {
  constructor(tag) {
    this.tag = tag; this.attrs = {}; this.children = []; this._text = "";
    this.classList = makeClassList();
    const props = {};
    this.style = { setProperty: (k, v) => { props[k] = v; }, getPropertyValue: (k) => props[k] || "" };
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  addEventListener() { /* no-op: editor wiring is exercised structurally, not driven */ }
  appendChild(c) { this.children.push(c); return c; }
  get firstChild() { return this.children[0] || null; }
  insertBefore(node, ref) {
    const i = ref ? this.children.indexOf(ref) : -1;
    if (i < 0) this.children.unshift(node); else this.children.splice(i, 0, node);
    return node;
  }
  set textContent(v) { this._text = v; this.children = []; }
  get textContent() { return this._text || this.children.map((c) => c.textContent).join(""); }
  querySelectorAll(sel) { const out = []; walk(this, (el) => { if (matches(el, sel)) out.push(el); }); return out; }
  querySelector(sel) { let f = null; walk(this, (el) => { if (!f && matches(el, sel)) f = el; }); return f; }
}
global.document = {
  createElementNS: (_ns, tag) => new El(tag),
  createElement: (tag) => new El(tag)
};
global.requestAnimationFrame = () => {};

// require AFTER document is defined? No — app.js auto-run guard checks document.
// We want the auto-run (load()) skipped, so delete document during require, then restore.
const savedDoc = global.document;
delete global.document;
const ui = require("../public/app.js");
global.document = savedDoc;

const profile = JSON.parse(fs.readFileSync(path.join(__dirname, "../public/devices/iso-de-105/profile.json"), "utf8"));
const mouse = JSON.parse(fs.readFileSync(path.join(__dirname, "../public/devices/mouse-5btn/profile.json"), "utf8"));
const gamepad = JSON.parse(fs.readFileSync(path.join(__dirname, "../public/devices/xbox-ctrl/profile.json"), "utf8"));

let passed = 0;
function ok(name, fn) { fn(); passed += 1; console.log(`  ok  ${name}`); }

ok("keyboard SVG has one [data-key] per profile key (105)", () => {
  const svg = ui.renderKeyboardSvg(profile);
  assert.strictEqual(svg.querySelectorAll("[data-key]").length, profile.keys.length);
});

ok("every key carries data-key, tabindex and an aria-label", () => {
  const svg = ui.renderKeyboardSvg(profile);
  for (const g of svg.querySelectorAll("[data-key]")) {
    assert.ok(g.getAttribute("data-key").startsWith("IK_"));
    assert.strictEqual(g.getAttribute("tabindex"), "0");
    assert.ok(g.getAttribute("aria-label"));
  }
});

ok("ISO-Enter renders as a rounded rect", () => {
  const svg = ui.renderKeyboardSvg(profile);
  const enter = svg.querySelectorAll("[data-key]").find((g) => g.getAttribute("data-key") === "IK_Enter");
  const rect = enter.children.find((c) => c.tag === "rect");
  assert.ok(rect && Number(rect.getAttribute("rx")) > 0, "expected rounded rect");
});

ok("keyboard SVG renders every key as rounded rect", () => {
  const svg = ui.renderKeyboardSvg(profile);
  const shapes = svg.querySelectorAll(".key-shape");
  assert.strictEqual(shapes.length, profile.keys.length);
  for (const shape of shapes) {
    assert.strictEqual(shape.tag, "rect");
    assert.strictEqual(Number(shape.getAttribute("rx")), 8);
  }
});

ok("applyColoring sets --key-fill per category/source", () => {
  const svg = ui.renderKeyboardSvg(profile);
  const scan = {
    commands: [
      { id: "Roll", source: "game/input.xml", keys: [{ key: "IK_Space" }] },
      { id: "ModThing", source: "modFriendlyHUD", keys: [{ key: "IK_W" }] }
    ],
    conflicts: []
  };
  const cm = ui.buildColorMap(scan.commands, scan.conflicts);
  ui.applyColoring(svg, cm, scan);
  const byKey = (ik) => svg.querySelectorAll("[data-key]").find((g) => g.getAttribute("data-key") === ik);
  assert.strictEqual(byKey("IK_Space").style.getPropertyValue("--key-fill"), ui.COLORS.vanillaAction);
  assert.notStrictEqual(byKey("IK_W").style.getPropertyValue("--key-fill"), ui.COLORS.unbound);
  assert.ok(byKey("IK_W").classList.contains("bound"));
  // aria-label updated with binding summary
  assert.ok(byKey("IK_Space").getAttribute("aria-label").includes("Roll"));
});

ok("applyConflicts marks high/medium keys", () => {
  const svg = ui.renderKeyboardSvg(profile);
  ui.applyConflicts(svg, [{ key: "IK_E", severity: "high" }, { key: "IK_R", severity: "medium" }]);
  const byKey = (ik) => svg.querySelectorAll("[data-key]").find((g) => g.getAttribute("data-key") === ik);
  assert.ok(byKey("IK_E").classList.contains("conflict-high"));
  assert.ok(byKey("IK_R").classList.contains("conflict-medium"));
});

// Mouse/gamepad now use the leader-line model: a PNG backdrop, one circular anchor
// marker per control (the .key-shape applyColoring drives) and one 90° leader line
// per control, with the labels parked off-device.
ok("mouse SVG: 6 leader keys, artwork + leader lines", () => {
  const svg = ui.renderMouseSvg(mouse);
  assert.ok(svg.getAttribute("class").includes("leader-svg"));
  assert.strictEqual(svg.querySelectorAll("[data-key]").length, 6);
  assert.strictEqual(svg.querySelectorAll(".device-artwork").length, 1);
  assert.strictEqual(svg.querySelectorAll(".key-shape").filter((n) => n.tag === "circle").length, 6);
  assert.strictEqual(svg.querySelectorAll(".leader-line").length, 6);
});

ok("gamepad SVG: 16 leader keys, artwork + leader lines", () => {
  const svg = ui.renderGamepadSvg(gamepad);
  assert.ok(svg.getAttribute("class").includes("leader-svg"));
  assert.strictEqual(svg.querySelectorAll("[data-key]").length, 16);
  assert.strictEqual(svg.querySelectorAll(".device-artwork").length, 1);
  assert.strictEqual(svg.querySelectorAll(".key-shape").filter((n) => n.tag === "circle").length, 16);
  assert.strictEqual(svg.querySelectorAll(".leader-line").length, 16);
});

ok("applyLeaderLabels: action name is primary, button label is the head caption", () => {
  const svg = ui.renderGamepadSvg(gamepad);
  const scan = { commands: [
    { id: "Dodge", displayName: "Dodge", displayNameSource: "curated", keys: [{ key: "IK_Pad_A_CROSS" }] }
  ] };
  ui.applyLeaderLabels(svg, gamepad, scan);
  const g = svg.querySelectorAll("[data-key]").find((n) => n.getAttribute("data-key") === "IK_Pad_A_CROSS");
  const label = g.querySelector(".leader-label");
  assert.ok(label.textContent.includes("A"), "physical button label stays as the head caption");
  assert.ok(label.textContent.includes("Dodge"), "resolved action name is the primary line");
});

// The controller scheme must show clean action words only — never raw engine ids
// (SCAARDodge, AltQuenCasting, …) and no "+N" counter. boundActionNames drops any
// command whose displayNameSource is not localized/curated; the popover keeps them.
ok("applyLeaderLabels: drops humanized engine ids and never shows a +N counter", () => {
  const svg = ui.renderGamepadSvg(gamepad);
  const scan = { commands: [
    { id: "GallopCanter", displayName: "Gallop", displayNameSource: "curated", keys: [{ key: "IK_Pad_A_CROSS" }] },
    { id: "ConfirmRadialMenuSelection", displayName: "ConfirmRadialMenuSelection", displayNameSource: "humanized", keys: [{ key: "IK_Pad_A_CROSS" }] },
    { id: "GI_Accelerate", displayName: "GI_Accelerate", displayNameSource: "humanized", keys: [{ key: "IK_Pad_A_CROSS" }] }
  ] };
  ui.applyLeaderLabels(svg, gamepad, scan);
  const g = svg.querySelectorAll("[data-key]").find((n) => n.getAttribute("data-key") === "IK_Pad_A_CROSS");
  const txt = g.querySelector(".leader-label").textContent;
  assert.ok(txt.includes("Gallop"), "resolved name shown");
  assert.ok(!txt.includes("ConfirmRadialMenuSelection") && !txt.includes("GI_Accelerate"), "humanized ids dropped");
  assert.ok(!/\+\d/.test(txt), "no +N counter in the diagram");
});

// boundActionNames is resolved-only for the diagram (the popover uses the full list).
ok("boundActionNames returns only localized/curated names, deduped", () => {
  const scan = { commands: [
    { id: "CastSign", displayName: "Cast Sign", displayNameSource: "localized", keys: [{ key: "IK_E" }] },
    { id: "CastSignCtx2", displayName: "Cast Sign", displayNameSource: "localized", keys: [{ key: "IK_E" }] },
    { id: "RawHelper", displayName: "RawHelper", displayNameSource: "humanized", keys: [{ key: "IK_E" }] }
  ] };
  const names = ui.boundActionNames("IK_E", scan);
  assert.deepStrictEqual(names, ["Cast Sign"], "deduped, humanized dropped");
});

ok("renderDeviceSvg dispatches by type", () => {
  assert.strictEqual(ui.renderDeviceSvg(mouse).getAttribute("class").includes("mouse-svg"), true);
  assert.strictEqual(ui.renderDeviceSvg(gamepad).getAttribute("class").includes("gamepad-svg"), true);
  assert.strictEqual(ui.renderDeviceSvg(profile).getAttribute("class").includes("keyboard-svg"), true);
});

// The layout editor's affordance layer must build without error and mark the PNG, a
// resize handle, and every anchor + label as a drag target (structural, not driven).
ok("drawEditHandles: builds PNG/resize/anchor/label affordances for every key", () => {
  const svg = ui.renderGamepadSvg(gamepad);
  ui.drawEditHandles(svg, gamepad, ui.computeLeaderLayout(gamepad));
  assert.strictEqual(svg.querySelectorAll(".edit-art").length, 1, "PNG is a move target");
  assert.strictEqual(svg.querySelectorAll(".edit-art-resize").length, 1, "one resize handle");
  assert.strictEqual(svg.querySelectorAll(".edit-anchor").length, gamepad.keys.length, "every anchor draggable");
  assert.strictEqual(svg.querySelectorAll(".edit-label").length, gamepad.keys.length, "every label draggable");
});

console.log(`\n${passed} Render-Tests bestanden.`);
