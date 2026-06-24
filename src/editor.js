// editor.js — in-harness asset-placement tool (DEV-ONLY; OFF by default).
// Toggle with [E]. Pick a type from the palette, click to place it into the live
// scene, click-drag to move, [Del] to remove, [X] to copy the whole placements list
// to the clipboard (paste it into OBJECTS.placements in config.js). Pan the camera
// with WASD/Arrows while editing; [B] toggles the footprint overlay; mouse-wheel
// scrolls the palette list. HOLD SHIFT while placing or dragging to snap to the grid;
// [F] toggles whether the SELECTED object collides (a per-object override; see "SOLID" below).
//
// PALETTE — drill-down: the panel first shows CATEGORIES; click one to see the objects
// tagged with it (plus a "‹ back" row). Categories are defined HERE in CATEGORIES (a
// dev-tool concern, kept out of the gameplay config) — a type not listed in any category
// falls into a guarded "misc" bucket, so nothing is ever unreachable. The list is built
// from the LIVE registry, so any type you add to OBJECTS.types appears automatically.
//
// SNAP — hold Shift while placing/dragging to lock the object's BASE (its contact point /
// feet) onto a GRID_SNAP grid. Bases (not top-lefts) snap, so objects of different sizes
// line up where they sit — which is what reads as a clean row/column in a y-sorted view.
// A faint grid is drawn while Shift is held so you can see the lattice you're snapping to.
//
// SOLID — [F] flips the SELECTED placement between solid and walk-through (still y-sorted), as a
// per-OBJECT override of its type default. Use it for a one-off decoration (a flower you can walk
// over) without adding a new type. The override exports with [X] and persists. The selected
// object's outline is WHITE when solid, BLUE when walk-through. (For a whole KIND that never
// collides, set solid:false on the TYPE in config.js instead.)
//
// Scene-aware: instead of fixed references it reads the ACTIVE scene's camera/objects/map
// through getScene(), so one editor instance follows whatever scene is current (the
// scene-manager owns it). The type registry is global, shared by every scene.
//
// Self-contained dev tool: its tunables live HERE (not config.js) so the module can be
// removed in one step for the shipping build — delete the import + the editor wiring in
// scene-manager.js and this file, and nothing else changes.

import { CONFIG } from "./config.js";

// --- editor-only tunables (kept local so the module stays strippable) ---
const PAN_SPEED = 420; // px/s camera pan while editing (snappier than the Iju's walk)
const THUMB = 40;      // palette thumbnail cell size, px
const PANEL_PAD = 8;   // inner padding of the palette panel
const MSG_TIME = 2.0;  // seconds a status message stays on screen
const ROW_H = THUMB + 10;   // vertical pitch of a list row (cell + gap)
const HEADER_H = 24;        // panel title row
const BACK_H = 22;          // "‹ back" row (types view only)
const FOOTER_H = 34;        // count + status lines under the list
const PANEL_W = THUMB + 132; // thumbnail + label column
const PANEL_Y = 10;          // panel top (px from the screen top)
const WHEEL_STEP = 40;       // px scrolled per wheel notch
const GRID_SNAP = 16;        // hold-Shift snap grid, world px. Set to 32 to snap to map tiles.

// Category → member type names. PURELY an editor convenience (no gameplay effect), so it
// lives here, not in config.js. STARTER TAGS — reorder/rename/move freely; it's just data.
// A type missing from every list shows under "misc". Listing a name that doesn't exist in
// the registry is harmless (it's simply skipped), so expected-soon props can be pre-listed.
const CATEGORIES = {
  buildings: ["temple", "teahouse", "disheveled", "house1", "yokaihouse"],
  cola:      ["crates", "colacrate", "stackedcolas", "table"],
  nature:    ["mossyrock", "stonelantern"],
  ground:    ["stonepath"],
  deco:      ["trappedsoul"],
};
const UNCATEGORIZED = "misc";

const clamp = (v, a, b) => Math.max(a, Math.min(v, b));

export function createEditor({ canvas, getScene, types }) {
  const VW = CONFIG.INTERNAL_W, VH = CONFIG.INTERNAL_H;
  const PANEL_X = VW - PANEL_W - 10;       // right-anchored
  const PANEL_MAX_H = VH - PANEL_Y - 44;   // cap height; leaves room for the bottom legend
  const typeNames = Object.keys(types || {});

  let active = false;
  let selectedType = typeNames[0] || null; // which type a scene-click will place
  let selected = null;                      // the placed object currently grabbed
  let dragging = false;
  let dragDX = 0, dragDY = 0;               // grab offset so the object doesn't jump
  let camX = VW / 2, camY = VH / 2;         // free-pan camera CENTER (camera clamps it)
  let msg = "", msgT = 0;                   // transient status line
  let shiftHeld = false;                    // Shift state, for the snap-grid preview overlay

  // palette drill-down state (remembered across [E] toggles)
  let paletteView = "categories";           // "categories" | "types"
  let currentCategory = null;               // the category drilled into (set before switching to "types")
  let scrollOffset = 0;                     // px scrolled within the current list

  // ---- category grouping (derived from the LIVE registry) -------------------
  function categoryOf(name) {
    for (const cat of Object.keys(CATEGORIES)) if (CATEGORIES[cat].includes(name)) return cat;
    return UNCATEGORIZED; // unlisted types are still reachable, just bucketed here
  }
  // distinct categories that actually contain ≥1 existing type, in CATEGORIES order (misc last)
  function groupedCategories() {
    const order = [...Object.keys(CATEGORIES), UNCATEGORIZED];
    const map = new Map();
    for (const name of typeNames) {
      const cat = categoryOf(name);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(name);
    }
    return order.filter((c) => map.has(c)).map((c) => ({ name: c, types: map.get(c) }));
  }
  function typesInCurrentCategory() {
    const g = groupedCategories().find((c) => c.name === currentCategory);
    return g ? g.types : [];
  }
  // rows for the current view: category objects {name,types} OR type-name strings
  function currentRows() {
    return paletteView === "categories" ? groupedCategories() : typesInCurrentCategory();
  }

  // panel + list geometry for the current view (height grows with content, capped + scrolled)
  function listMetrics() {
    const rows = currentRows();
    const backH = paletteView === "types" ? BACK_H : 0;
    const contentH = rows.length * ROW_H;
    const chromeH = HEADER_H + backH + FOOTER_H;
    const panelH = Math.min(PANEL_MAX_H, chromeH + contentH);
    const listTop = PANEL_Y + HEADER_H + backH;
    const listBottom = PANEL_Y + panelH - FOOTER_H;
    const listVisibleH = listBottom - listTop;
    const maxScroll = Math.max(0, contentH - listVisibleH);
    return { rows, backH, panelH, listTop, listBottom, listVisibleH, contentH, maxScroll };
  }
  function paletteRect() {
    const m = listMetrics();
    return { x: PANEL_X, y: PANEL_Y, w: PANEL_W, h: m.panelH };
  }
  function backRowRect() {
    return { x: PANEL_X + PANEL_PAD, y: PANEL_Y + HEADER_H, w: PANEL_W - PANEL_PAD * 2, h: BACK_H };
  }

  // Snap a sprite's TOP-LEFT so its BASE (contact point: center-x, anchorY) lands on the grid.
  // Ground decals have no anchorY, so the sprite center is the contact point (matches placement).
  // We snap the base — not the top-left — so different-sized objects align where they sit.
  function snapToGrid(def, tlx, tly) {
    const ax = def.w / 2, ay = def.anchorY ?? def.h / 2;
    const bx = Math.round((tlx + ax) / GRID_SNAP) * GRID_SNAP;
    const by = Math.round((tly + ay) / GRID_SNAP) * GRID_SNAP;
    return { x: bx - ax, y: by - ay };
  }

  function flash(text) { msg = text; msgT = MSG_TIME; }

  // CSS pixels -> the fixed 960×540 buffer (the canvas is scaled to the window).
  function screenFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      sx: (e.clientX - rect.left) * (VW / rect.width),
      sy: (e.clientY - rect.top) * (VH / rect.height),
    };
  }
  const pointIn = (px, py, r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;

  // ---- mouse: place / select / drag -----------------------------------------
  function onDown(e) {
    if (!active) return;
    const sc = getScene();
    if (!sc || !sc.objects) return;
    e.preventDefault(); // stop the canvas starting a text/selection drag mid-edit
    const { sx, sy } = screenFromEvent(e);

    // 1) palette click (screen space): drill into a category / pick a type / go back.
    //    Never places into the scene.
    if (pointIn(sx, sy, paletteRect())) {
      const m = listMetrics();
      // back row (types view only)
      if (paletteView === "types" && pointIn(sx, sy, backRowRect())) {
        paletteView = "categories"; scrollOffset = 0; flash("categories");
        return;
      }
      // list rows — only count clicks landing inside the (clipped) visible list band
      if (sy >= m.listTop && sy <= m.listBottom) {
        for (let i = 0; i < m.rows.length; i++) {
          const ry = m.listTop - scrollOffset + i * ROW_H;
          const cell = { x: PANEL_X + PANEL_PAD, y: ry, w: PANEL_W - PANEL_PAD * 2, h: THUMB };
          if (pointIn(sx, sy, cell)) {
            if (paletteView === "categories") {
              currentCategory = m.rows[i].name; paletteView = "types"; scrollOffset = 0;
              flash(`category: ${currentCategory}`);
            } else {
              selectedType = m.rows[i]; flash(`type: ${selectedType}`);
            }
            break;
          }
        }
      }
      return;
    }

    // 2) scene click (world space): grab an existing object first, else place a new one.
    const wx = sx + sc.camera.cam.x, wy = sy + sc.camera.cam.y;
    const hit = sc.objects.hitTest(wx, wy);
    if (hit) {
      selected = hit;
    } else if (selectedType) {
      // Place so the object's BASE (anchorY) lands under the cursor. Ground decals carry no
      // anchorY, so fall back to the sprite center — without this guard, `wy - undefined` is
      // NaN and the decal is placed off into NaN-land (counted, but drawn nowhere).
      const def = types[selectedType];
      let tlx = wx - def.w / 2, tly = wy - (def.anchorY ?? def.h / 2);
      if (e.shiftKey) ({ x: tlx, y: tly } = snapToGrid(def, tlx, tly)); // hold Shift → snap base to grid
      selected = sc.objects.add(selectedType, tlx, tly);
      flash(`+${selectedType}${e.shiftKey ? " (snap)" : ""}`);
    } else {
      selected = null;
      return;
    }
    // begin a drag, preserving where on the sprite we grabbed (no snap-to-cursor)
    dragging = true;
    dragDX = selected.x - wx;
    dragDY = selected.y - wy;
  }
  function onMove(e) {
    if (!active || !dragging || !selected) return;
    const sc = getScene();
    if (!sc || !sc.objects) return;
    const { sx, sy } = screenFromEvent(e);
    const wx = sx + sc.camera.cam.x, wy = sy + sc.camera.cam.y;
    let nx = wx + dragDX, ny = wy + dragDY;
    // hold Shift while dragging → snap the base to the grid (grab offset is ignored while snapping)
    if (e.shiftKey) ({ x: nx, y: ny } = snapToGrid(types[selected.type], nx, ny));
    sc.objects.moveTo(selected, nx, ny);
  }
  function onUp() { dragging = false; }

  // ---- mouse wheel: scroll the palette list when it overflows ---------------
  function onWheel(e) {
    if (!active) return;
    const { sx, sy } = screenFromEvent(e);
    if (!pointIn(sx, sy, paletteRect())) return; // only when the cursor is over the palette
    const m = listMetrics();
    if (m.maxScroll <= 0) return;                // nothing to scroll
    scrollOffset = clamp(scrollOffset + Math.sign(e.deltaY) * WHEEL_STEP, 0, m.maxScroll);
    e.preventDefault();
  }

  // ---- keyboard: toggle / delete / export / debug ---------------------------
  function onKey(e) {
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") shiftHeld = true; // track for the snap-grid overlay
    if (e.code === "KeyE") { // toggle editor mode from anywhere
      active = !active;
      if (active) {
        const sc = getScene();
        const cx = sc ? sc.camera.cam.x : 0, cy = sc ? sc.camera.cam.y : 0;
        camX = cx + VW / 2; camY = cy + VH / 2; // seed pan so the view doesn't jump
        flash("editor ON");
      }
      dragging = false;
      e.preventDefault();
      return;
    }
    if (!active) return;
    if (e.code === "Delete" || e.code === "Backspace") {
      if (selected) {
        const sc = getScene();
        if (sc && sc.objects) sc.objects.remove(selected);
        selected = null; flash("deleted");
      }
      e.preventDefault();
    } else if (e.code === "KeyX") {
      exportPlacements();
      e.preventDefault();
    } else if (e.code === "KeyB") {
      CONFIG.OBJECTS.debugFootprints = !CONFIG.OBJECTS.debugFootprints; // live toggle, read by objects + player
      flash(`debug ${CONFIG.OBJECTS.debugFootprints ? "ON" : "OFF"}`);
      e.preventDefault();
    } else if (e.code === "KeyF") {
      // flip the SELECTED object's collision (per-placement override; ground decals can't be solid)
      if (!selected) {
        flash("select an object first ([F] toggles its collision)");
      } else {
        const sc = getScene();
        const res = sc && sc.objects && sc.objects.toggleSolid ? sc.objects.toggleSolid(selected) : null;
        flash(res === null ? `${selected.type}: always non-solid` : `${selected.type} solid ${res ? "ON" : "OFF"}`);
      }
      e.preventDefault();
    }
  }
  function onKeyUp(e) {
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") shiftHeld = false;
  }

  // Build a paste-able OBJECTS.placements block and copy it to the clipboard.
  // Clipboard works on http://localhost (npx serve = a secure context); if a browser
  // ever blocks it we still log the block to the console, so nothing is lost.
  function exportPlacements() {
    const sc = getScene();
    if (!sc || !sc.objects) return;
    const ps = sc.objects.getPlacements();
    // Preserve a hand-added `door:{to,spawn}` on a placement so re-exporting during layout
    // doesn't silently drop an object-anchored teleporter. (x,y come from the live placement.)
    const lines = ps.map((p) => {
      const solid = p.solid !== undefined ? `, solid: ${p.solid}` : ""; // keep per-object [F] override
      const door = p.door ? `, door: ${JSON.stringify(p.door)}` : "";
      return `      { type: "${p.type}", x: ${Math.round(p.x)}, y: ${Math.round(p.y)}${solid}${door} },`;
    });
    const block = `placements: [\n${lines.join("\n")}\n    ],`;
    console.log("// ---- paste into OBJECTS.placements in config.js ----\n" + block);
    const done = () => flash(`copied ${ps.length} placements`);
    const fail = () => flash(`clipboard blocked — see console (${ps.length})`);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(block).then(done).catch(fail);
      } else { fail(); }
    } catch (_) { fail(); }
  }

  canvas.addEventListener("mousedown", onDown);
  canvas.addEventListener("mousemove", onMove);
  canvas.addEventListener("wheel", onWheel, { passive: false }); // passive:false so we can preventDefault
  window.addEventListener("mouseup", onUp);   // catch mouseup even if it lands off-canvas
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKeyUp);  // clear shiftHeld so the snap-grid overlay hides

  // ---- per-frame update: pan the camera (the Iju is frozen while editing) ----
  function update(dt, input) {
    if (msgT > 0) msgT = Math.max(0, msgT - dt);
    if (!active) return;
    const sc = getScene();
    if (!sc) return;
    const ax = input.axis();
    camX += ax.x * PAN_SPEED * dt;
    camY += ax.y * PAN_SPEED * dt;
    // clamp the pan CENTER to the map so we can't scroll into the void
    camX = Math.max(VW / 2, Math.min(camX, Math.max(VW / 2, sc.map.width - VW / 2)));
    camY = Math.max(VH / 2, Math.min(camY, Math.max(VH / 2, sc.map.height - VH / 2)));
  }

  // ---- draw the overlay (called last each frame, screen space) --------------
  function draw(ctx) {
    if (!active) return;
    const sc = getScene();
    if (!sc) return;

    if (shiftHeld) drawSnapGrid(ctx, sc); // faint lattice you're snapping to (under the highlight/HUD)

    // highlight the grabbed object (world -> screen). Outline shows its collision state:
    // WHITE = solid, BLUE = walk-through (so the [F] toggle reads at a glance, even with [B] off).
    if (selected) {
      const def = types[selected.type];
      if (def) {
        const walkThrough = def.ground === true || (selected.solid ?? (def.solid !== false)) === false;
        ctx.strokeStyle = walkThrough ? "rgba(120,200,255,0.95)" : "rgba(255,255,255,0.95)";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          Math.floor(selected.x - sc.camera.cam.x) + 0.5,
          Math.floor(selected.y - sc.camera.cam.y) + 0.5,
          def.w - 1, def.h - 1
        );
      }
    }

    drawPalette(ctx, sc);

    // bottom-left key legend (screen space)
    const legend = "EDITOR — [E] exit · WASD pan · click = place / drag · Shift = snap · [F] solid · [Del] remove · [X] copy · [B] footprints · wheel = scroll";
    ctx.font = "11px monospace";
    const lw = ctx.measureText(legend).width;
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(8, VH - 26, lw + 16, 20);
    ctx.fillStyle = CONFIG.COLORS.text;
    ctx.textAlign = "left";
    ctx.fillText(legend, 16, VH - 12);
  }

  // faint world-space grid (GRID_SNAP spacing), drawn only while Shift is held
  function drawSnapGrid(ctx, sc) {
    const camX = sc.camera.cam.x, camY = sc.camera.cam.y;
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.floor(camX / GRID_SNAP) * GRID_SNAP; x <= camX + VW; x += GRID_SNAP) {
      const px = Math.floor(x - camX) + 0.5;
      ctx.moveTo(px, 0); ctx.lineTo(px, VH);
    }
    for (let y = Math.floor(camY / GRID_SNAP) * GRID_SNAP; y <= camY + VH; y += GRID_SNAP) {
      const py = Math.floor(y - camY) + 0.5;
      ctx.moveTo(0, py); ctx.lineTo(VW, py);
    }
    ctx.stroke();
  }

  // palette panel: header → (back row) → clipped scrolling list → scrollbar → footer
  function drawPalette(ctx, sc) {
    const m = listMetrics();
    scrollOffset = clamp(scrollOffset, 0, m.maxScroll); // stay valid if content changed since last frame
    const pr = { x: PANEL_X, y: PANEL_Y, w: PANEL_W, h: m.panelH };

    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(pr.x, pr.y, pr.w, pr.h);

    // header
    ctx.fillStyle = CONFIG.COLORS.text;
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    ctx.fillText(paletteView === "categories" ? "PALETTE" : `PALETTE — ${currentCategory}`, pr.x + PANEL_PAD, pr.y + 16);

    // back row (types view)
    if (paletteView === "types") {
      const b = backRowRect();
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1;
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      ctx.fillStyle = CONFIG.COLORS.text; ctx.font = "12px monospace";
      ctx.fillText("‹ back to categories", b.x + 6, b.y + 15);
    }

    // scrolling list, clipped to the region between the (back) header and the footer
    ctx.save();
    ctx.beginPath();
    ctx.rect(pr.x, m.listTop, pr.w, m.listVisibleH);
    ctx.clip();

    for (let i = 0; i < m.rows.length; i++) {
      const ry = m.listTop - scrollOffset + i * ROW_H;
      if (ry + THUMB < m.listTop || ry > m.listBottom) continue; // off-view → skip
      const r = { x: pr.x + PANEL_PAD, y: ry, w: pr.w - PANEL_PAD * 2, h: THUMB };

      if (paletteView === "categories") {
        const cat = m.rows[i]; // { name, types:[...] }
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1;
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

        // icon: the first member type's thumbnail (so the category reads at a glance)
        const iconType = cat.types[0];
        const def = iconType ? types[iconType] : null;
        const rec = iconType ? sc.objects.imageFor(iconType) : null;
        if (rec && rec.ready && def) {
          const scale = Math.min(THUMB / def.w, THUMB / def.h);
          const dw = def.w * scale, dh = def.h * scale;
          ctx.drawImage(rec.img, r.x + (THUMB - dw) / 2, r.y + (THUMB - dh) / 2, dw, dh);
        } else {
          ctx.fillStyle = "#7a7f8a";
          ctx.fillRect(r.x + 6, r.y + 6, THUMB - 12, THUMB - 12);
        }

        ctx.fillStyle = CONFIG.COLORS.text; ctx.font = "12px monospace";
        ctx.fillText(cat.name, r.x + THUMB + 8, r.y + 18);
        ctx.fillStyle = "rgba(232,232,236,0.65)"; ctx.font = "10px monospace";
        ctx.fillText(`${cat.types.length} item${cat.types.length === 1 ? "" : "s"} ›`, r.x + THUMB + 8, r.y + 32);
      } else {
        const name = m.rows[i];
        const def = types[name];
        const isSel = name === selectedType;

        ctx.fillStyle = isSel ? "rgba(216,58,46,0.30)" : "rgba(255,255,255,0.05)";
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = isSel ? CONFIG.COLORS.accent : "rgba(255,255,255,0.18)"; ctx.lineWidth = 1;
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

        const rec = sc.objects.imageFor(name);
        if (rec && rec.ready) {
          const scale = Math.min(THUMB / def.w, THUMB / def.h);
          const dw = def.w * scale, dh = def.h * scale;
          ctx.drawImage(rec.img, r.x + (THUMB - dw) / 2, r.y + (THUMB - dh) / 2, dw, dh);
        } else {
          ctx.fillStyle = "#7a7f8a";
          ctx.fillRect(r.x + 6, r.y + 6, THUMB - 12, THUMB - 12);
        }

        ctx.fillStyle = CONFIG.COLORS.text; ctx.font = "12px monospace";
        ctx.fillText(name, r.x + THUMB + 8, r.y + 18);
        ctx.fillStyle = "rgba(232,232,236,0.65)"; ctx.font = "10px monospace";
        ctx.fillText(`${def.w}×${def.h}`, r.x + THUMB + 8, r.y + 32);
      }
    }
    ctx.restore(); // end clip

    // scrollbar hint when the list overflows
    if (m.maxScroll > 0) {
      const trackX = pr.x + pr.w - 4;
      const thumbH = Math.max(20, m.listVisibleH * (m.listVisibleH / m.contentH));
      const thumbY = m.listTop + (m.listVisibleH - thumbH) * (scrollOffset / m.maxScroll);
      ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.fillRect(trackX, m.listTop, 3, m.listVisibleH);
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(trackX, thumbY, 3, thumbH);
    }

    // footer: object count + current selection, then the transient status line
    ctx.font = "11px monospace"; ctx.textAlign = "left"; ctx.fillStyle = CONFIG.COLORS.text;
    ctx.fillText(`objects: ${sc.objects.count}   sel: ${selected ? selected.type : (selectedType || "—")}`, pr.x + PANEL_PAD, pr.y + pr.h - 24);
    if (msgT > 0) {
      ctx.fillStyle = CONFIG.COLORS.accent;
      ctx.fillText(msg, pr.x + PANEL_PAD, pr.y + pr.h - 9);
    }
  }

  return {
    update, draw,
    get active() { return active; },
    get camX() { return camX; },
    get camY() { return camY; },
  };
}