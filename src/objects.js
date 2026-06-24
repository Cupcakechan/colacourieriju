// objects.js — placed world objects (rocks, props; later houses/shrines).
// Each object renders ON TOP of the ground and contributes a TIGHT footprint to
// collision — just its base, not a whole tile. Objects + player are y-sorted in
// the scene so the Iju passes behind taller objects. Data lives in CONFIG.OBJECTS:
//   types[name]  = { sprite, w, h, anchorY, fpW, fpH }   // the registry (SHARED by all scenes)
//   placements[] = { type, x, y }                        // x,y = world top-left of sprite
//
// createObjects(placements) takes an OPTIONAL placement list so each scene can have its own
// objects (town uses CONFIG.OBJECTS.placements by default; pickup passes CONFIG.PICKUP.placements).
// The type registry is shared. The list is MUTABLE at runtime so the editor can add/move/delete
// and rebuild() regenerates the draw + collision data.

import { CONFIG } from "./config.js";

export function createObjects(placementsInput) {
  const O = CONFIG.OBJECTS || { types: {}, placements: [] };
  const types = O.types || {};

  // Working COPY of the chosen placement list, so editing never mutates the CONFIG literal.
  // Never reassigned (only push/splice/in-place edits), so getPlacements() stays valid.
  const placements = (placementsInput || O.placements || []).map((p) => ({ ...p }));

  // One Image per distinct sprite; a missing/failed sprite degrades to a flat box
  // (a placeholder is always better than a crash). Cached so repeats share one load.
  const imgCache = {};
  function spriteFor(def) {
    if (!def.sprite) return null;
    let rec = imgCache[def.sprite];
    if (!rec) {
      const img = new Image();
      rec = { img, ready: false, failed: false };
      img.onload = () => { rec.ready = true; };
      img.onerror = () => { rec.failed = true; };
      img.src = def.sprite;
      imgCache[def.sprite] = rec;
    }
    return rec;
  }

  // The scene reads these two arrays every frame, so rebuild() mutates them IN PLACE
  // (never reassigns) to keep the same references live.
  const solids = []; // foot rects {x,y,w,h} in world space — used by collision
  const items = [];  // drawables {sortY, draw(ctx,camX,camY)} — used by y-sorted render

  function rebuild() {
    items.length = 0;
    solids.length = 0;
    for (const place of placements) {
      const def = types[place.type];
      if (!def) { console.warn(`objects: unknown type "${place.type}"`); continue; }
      const rec = spriteFor(def);
      const x = place.x, y = place.y;

      const foot = {
        x: x + def.w / 2 - def.fpW / 2,
        y: y + def.anchorY - def.fpH,
        w: def.fpW,
        h: def.fpH,
      };
      solids.push(foot);

      const sortY = y + def.anchorY; // feet (contact line) decide draw order
      items.push({
        sortY,
        draw(ctx, camX, camY) {
          const sx = Math.floor(x - camX), sy = Math.floor(y - camY);
          if (rec && rec.ready) {
            ctx.drawImage(rec.img, sx, sy, def.w, def.h);
          } else {
            ctx.fillStyle = "#7a7f8a"; // placeholder block until the real sprite loads
            ctx.fillRect(sx, sy, def.w, def.h);
          }
          if (O.debugFootprints) { // outline the solid base so fpW/fpH can be tuned to the art
            ctx.strokeStyle = "rgba(216,58,46,0.9)";
            ctx.lineWidth = 1;
            ctx.strokeRect(
              Math.floor(foot.x - camX) + 0.5,
              Math.floor(foot.y - camY) + 0.5,
              foot.w - 1,
              foot.h - 1
            );
          }
        },
      });
    }
  }

  // Does a collider box overlap any object footprint? (AABB, half-open intervals.)
  function blocks(left, top, w, h) {
    for (const r of solids) {
      if (left < r.x + r.w && left + w > r.x && top < r.y + r.h && top + h > r.y) return true;
    }
    return false;
  }

  // ---- editor-facing helpers (the game path doesn't call these) -------------
  function hitTest(wx, wy) {
    let best = null;
    for (const place of placements) {
      const def = types[place.type];
      if (!def) continue;
      if (wx >= place.x && wx <= place.x + def.w && wy >= place.y && wy <= place.y + def.h) {
        const sortY = place.y + def.anchorY;
        if (!best || sortY > best.sortY) best = { place, sortY };
      }
    }
    return best ? best.place : null;
  }
  function add(type, x, y) {
    const p = { type, x: Math.round(x), y: Math.round(y) };
    placements.push(p);
    rebuild();
    return p;
  }
  function remove(place) {
    const i = placements.indexOf(place);
    if (i !== -1) { placements.splice(i, 1); rebuild(); }
  }
  function moveTo(place, x, y) {
    place.x = Math.round(x);
    place.y = Math.round(y);
    rebuild();
  }
  function imageFor(type) {
    const def = types[type];
    return def ? spriteFor(def) : null;
  }

  rebuild(); // initial build from the chosen placements

  return {
    items, solids, blocks, rebuild,
    hitTest, add, remove, moveTo, imageFor,
    getPlacements: () => placements,
    get count() { return items.length; },
  };
}
