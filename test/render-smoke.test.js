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

ok("ISO-Enter renders as an L-shaped path", () => {
  const svg = ui.renderKeyboardSvg(profile);
  const enter = svg.querySelectorAll("[data-key]").find((g) => g.getAttribute("data-key") === "IK_Enter");
  const pathChild = enter.children.find((c) => c.tag === "path");
  assert.ok(pathChild && pathChild.getAttribute("d").includes("Z"), "expected closed L path");
});

ok("applyColoring sets --key-fill per source (vanilla gold, mod colour)", () => {
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
  assert.strictEqual(byKey("IK_Space").style.getPropertyValue("--key-fill"), ui.COLORS.vanilla);
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

ok("mouse SVG: 6 keys + device-body backdrop", () => {
  const svg = ui.renderMouseSvg(mouse);
  assert.strictEqual(svg.querySelectorAll("[data-key]").length, 6);
  assert.ok(svg.querySelectorAll(".device-body").length === 1);
});

ok("gamepad SVG: 16 keys + device-body backdrop", () => {
  const svg = ui.renderGamepadSvg(gamepad);
  assert.strictEqual(svg.querySelectorAll("[data-key]").length, 16);
  assert.ok(svg.querySelectorAll(".device-body").length === 1);
});

ok("renderDeviceSvg dispatches by type", () => {
  assert.strictEqual(ui.renderDeviceSvg(mouse).getAttribute("class").includes("mouse-svg"), true);
  assert.strictEqual(ui.renderDeviceSvg(gamepad).getAttribute("class").includes("gamepad-svg"), true);
  assert.strictEqual(ui.renderDeviceSvg(profile).getAttribute("class").includes("keyboard-svg"), true);
});

console.log(`\n${passed} Render-Tests bestanden.`);
