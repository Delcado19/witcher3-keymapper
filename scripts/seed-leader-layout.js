// One-shot migration: seed the mouse/gamepad profiles from the legacy auto-layout
// into the explicit free-form coordinate model the layout editor authors against.
//
// Runs computeLeaderLayout's LEGACY branch once, freezes the result as canvas/art +
// per-key lx/ly, and writes it back to profile.json. After this, the EXPLICIT branch
// renders, so dragging a label can no longer be clobbered by a re-run of the
// auto-layout (advisor: "retire the auto-layout to a seed").
//
// ONE-SHOT, NOT idempotent: seeding DROPS the legacy inputs (artworkSize/leader/side)
// the auto-layout reads, so a second run would recompute garbage from defaults. The
// guard below refuses to touch an already-seeded profile (one that has `canvas`) — to
// re-seed, restore the legacy profile.json from git first, then run once.
//
// Usage: node scripts/seed-leader-layout.js
const fs = require("fs");
const path = require("path");
const { computeLeaderLayout } = require("../public/app.js");

const round = (n) => Math.round(n * 100) / 100; // 2 decimals: ≤0.005px drift, invisible
const PROFILES = ["mouse-5btn", "xbox-ctrl"];

function seedProfile(id) {
  const file = path.join(__dirname, "..", "public", "devices", id, "profile.json");
  const profile = JSON.parse(fs.readFileSync(file, "utf8"));
  if (profile.canvas) {
    console.log(`SKIP ${id}: already seeded (has canvas). Restore legacy profile.json from git to re-seed.`);
    return;
  }
  const layout = computeLeaderLayout(profile); // legacy branch (no canvas present)
  const byIk = new Map(layout.keys.map((entry) => [entry.key.ik, entry]));

  const seeded = {
    id: profile.id,
    name: profile.name,
    type: profile.type,
    layout: profile.layout,
    fallback: profile.fallback,
    artwork: profile.artwork,
    canvas: { w: round(layout.canvas.w), h: round(layout.canvas.h) },
    art: { x: round(layout.art.x), y: round(layout.art.y), w: round(layout.art.w), h: round(layout.art.h) },
    _comment: "Free-form leader-line layout (authored by the in-app layout editor). canvas{w,h} is the fixed viewBox; art{x,y,w,h} is the PNG rect in canvas units. Per key: ax/ay = anchor as % of the PNG (tracks the image when it moves/resizes); lx/ly = the label's text position in canvas units; the leader line is derived from both each render so it cannot detach. A key may carry fontSize to scale its label.",
    keys: profile.keys.map((k) => {
      const e = byIk.get(k.ik);
      const out = { ik: k.ik, label: k.label, ax: k.ax, ay: k.ay, lx: round(e.lx), ly: round(e.ly) };
      if (k.fontSize) out.fontSize = k.fontSize;
      return out;
    })
  };

  // VERIFY equivalence: the explicit branch fed the seeded profile must reproduce the
  // legacy geometry within rounding (≤0.05px). This is the "render identical before
  // building the editor" gate (advisor) — the preview==remap analog from memory.
  const reLayout = computeLeaderLayout(seeded);
  const reByIk = new Map(reLayout.keys.map((entry) => [entry.key.ik, entry]));
  let maxDiff = 0;
  const diffs = [];
  for (const [ik, leg] of byIk) {
    const got = reByIk.get(ik);
    for (const field of ["anchorX", "anchorY", "lx", "ly"]) {
      const d = Math.abs(leg[field] - got[field]);
      if (d > maxDiff) maxDiff = d;
      if (d > 0.05) diffs.push(`${ik}.${field}: legacy ${leg[field]} vs explicit ${got[field]} (Δ${d.toFixed(3)})`);
    }
  }
  for (const dim of [["canvas", "w"], ["canvas", "h"], ["art", "x"], ["art", "y"], ["art", "w"], ["art", "h"]]) {
    const d = Math.abs(layout[dim[0]][dim[1]] - reLayout[dim[0]][dim[1]]);
    if (d > maxDiff) maxDiff = d;
    if (d > 0.05) diffs.push(`${dim[0]}.${dim[1]}: legacy ${layout[dim[0]][dim[1]]} vs explicit ${reLayout[dim[0]][dim[1]]} (Δ${d.toFixed(3)})`);
  }
  if (diffs.length) {
    console.error(`FAIL ${id}: explicit model diverges from legacy:\n  ${diffs.join("\n  ")}`);
    process.exitCode = 1;
    return;
  }
  fs.writeFileSync(file, JSON.stringify(seeded, null, 2) + "\n", "utf8");
  console.log(`OK   ${id}: seeded, max geometry Δ ${maxDiff.toFixed(4)}px (≤0.05 ok). canvas ${seeded.canvas.w}x${seeded.canvas.h}, ${seeded.keys.length} keys.`);
}

for (const id of PROFILES) seedProfile(id);
