// editor.js — in-harness asset-placement tool (DEV-ONLY; OFF by default).
// Toggle with [E]. Pick a type from the palette, click to place it into the live
// scene, click-drag to move, [Del] to remove, [X] to copy the whole placements list
// to the clipboard (paste it into OBJECTS.placements in config.js). Pan the camera
// with WASD/Arrows while editing; [B] toggles the footprint overlay.
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

export function createEditor({ canvas, getScene, types }) {
  const VW = CONFIG.INTERNAL_W, VH = CONFIG.INTERNAL_H;
  const typeNames = Object.keys(types || {});

  let active = false;
  let selectedType = typeNames[0] || null; // which type a scene-click will place
  let selected = null;                      // the placed object currently grabbed
  let dragging = false;
  let dragDX = 0, dragDY = 0;               // grab offset so the object doesn't jump
  let camX = VW / 2, camY = VH / 2;         // free-pan camera CENTER (camera clamps it)
  let msg = "", msgT = 0;                   // transient status line

  // Palette = a column of cells on the RIGHT edge (buildings are wide, so the left and
  // center of the scene stay clear). Geometry is derived from the registry each draw,
  // so adding a type to OBJECTS.types makes it appear here automatically.
  function paletteRect() {
    const rowH = THUMB + 10;
    const w = THUMB + 132; // thumbnail + label column
    const headerH = 24, footerH = 34; // title row + (count + message) lines
    const h = headerH + typeNames.length * rowH + footerH;
    return { x: VW - w - 10, y: 10, w, h, rowH, headerH };
  }
  function rowRectAt(i) {
    const pr = paletteRect();
    return { x: pr.x + PANEL_PAD, y: pr.y + pr.headerH + i * pr.rowH, w: pr.w - PANEL_PAD * 2, h: THUMB };
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

    // 1) palette click (screen space) only changes the active type — never places.
    if (pointIn(sx, sy, paletteRect())) {
      for (let i = 0; i < typeNames.length; i++) {
        if (pointIn(sx, sy, rowRectAt(i))) { selectedType = typeNames[i]; flash(`type: ${selectedType}`); break; }
      }
      return;
    }

    // 2) scene click (world space): grab an existing object first, else place a new one.
    const wx = sx + sc.camera.cam.x, wy = sy + sc.camera.cam.y;
    const hit = sc.objects.hitTest(wx, wy);
    if (hit) {
      selected = hit;
    } else if (selectedType) {
      // place so the object's BASE (centered on anchorY) lands under the cursor
      const def = types[selectedType];
      selected = sc.objects.add(selectedType, wx - def.w / 2, wy - def.anchorY);
      flash(`+${selectedType}`);
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
    sc.objects.moveTo(selected, wx + dragDX, wy + dragDY);
  }
  function onUp() { dragging = false; }

  // ---- keyboard: toggle / delete / export / debug ---------------------------
  function onKey(e) {
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
    }
  }

  // Build a paste-able OBJECTS.placements block and copy it to the clipboard.
  // Clipboard works on http://localhost (npx serve = a secure context); if a browser
  // ever blocks it we still log the block to the console, so nothing is lost.
  function exportPlacements() {
    const sc = getScene();
    if (!sc || !sc.objects) return;
    const ps = sc.objects.getPlacements();
    const lines = ps.map((p) => `      { type: "${p.type}", x: ${Math.round(p.x)}, y: ${Math.round(p.y)} },`);
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
  window.addEventListener("mouseup", onUp);   // catch mouseup even if it lands off-canvas
  window.addEventListener("keydown", onKey);

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

    // highlight the grabbed object (world -> screen via the camera offset)
    if (selected) {
      const def = types[selected.type];
      if (def) {
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          Math.floor(selected.x - sc.camera.cam.x) + 0.5,
          Math.floor(selected.y - sc.camera.cam.y) + 0.5,
          def.w - 1, def.h - 1
        );
      }
    }

    // palette panel
    const pr = paletteRect();
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
    ctx.fillStyle = CONFIG.COLORS.text;
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    ctx.fillText("PALETTE", pr.x + PANEL_PAD, pr.y + 16);

    for (let i = 0; i < typeNames.length; i++) {
      const name = typeNames[i];
      const def = types[name];
      const r = rowRectAt(i);
      const isSel = name === selectedType;

      ctx.fillStyle = isSel ? "rgba(216,58,46,0.30)" : "rgba(255,255,255,0.05)";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = isSel ? CONFIG.COLORS.accent : "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

      // thumbnail (sprite scaled into the cell; blur is fine for a dev tool)
      const rec = sc.objects.imageFor(name);
      if (rec && rec.ready) {
        const scale = Math.min(THUMB / def.w, THUMB / def.h);
        const dw = def.w * scale, dh = def.h * scale;
        ctx.drawImage(rec.img, r.x + (THUMB - dw) / 2, r.y + (THUMB - dh) / 2, dw, dh);
      } else {
        ctx.fillStyle = "#7a7f8a";
        ctx.fillRect(r.x + 6, r.y + 6, THUMB - 12, THUMB - 12);
      }

      ctx.fillStyle = CONFIG.COLORS.text;
      ctx.font = "12px monospace";
      ctx.fillText(name, r.x + THUMB + 8, r.y + 18);
      ctx.fillStyle = "rgba(232,232,236,0.65)";
      ctx.font = "10px monospace";
      ctx.fillText(`${def.w}×${def.h}`, r.x + THUMB + 8, r.y + 32);
    }

    // count + transient status under the cells
    ctx.font = "11px monospace";
    ctx.fillStyle = CONFIG.COLORS.text;
    ctx.fillText(`objects: ${sc.objects.count}   sel: ${selected ? selected.type : "—"}`, pr.x + PANEL_PAD, pr.y + pr.h - 24);
    if (msgT > 0) {
      ctx.fillStyle = CONFIG.COLORS.accent;
      ctx.fillText(msg, pr.x + PANEL_PAD, pr.y + pr.h - 9);
    }

    // bottom-left key legend (screen space)
    const legend = "EDITOR — [E] exit · WASD pan · click = place / drag · [Del] remove · [X] copy to clipboard · [B] footprints";
    ctx.font = "11px monospace";
    const lw = ctx.measureText(legend).width;
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(8, VH - 26, lw + 16, 20);
    ctx.fillStyle = CONFIG.COLORS.text;
    ctx.fillText(legend, 16, VH - 12);
  }

  return {
    update, draw,
    get active() { return active; },
    get camX() { return camX; },
    get camY() { return camY; },
  };
}
