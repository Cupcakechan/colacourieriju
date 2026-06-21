// objects.js — placed world objects (rocks, props; later houses/shrines).
// Each object renders ON TOP of the ground and contributes a TIGHT footprint to
// collision — just its base, not a whole tile. Objects + player are y-sorted in
// main.js so the Iju passes behind taller objects. All data lives in CONFIG.OBJECTS:
//   types[name]  = { sprite, w, h, anchorY, fpW, fpH }   // the registry
//   placements[] = { type, x, y }                        // x,y = world top-left of sprite
// anchorY is the sprite-local y where the object meets the ground (its "feet"); the
// footprint is an fpW×fpH band centered on the sprite, resting on that anchorY line.

import { CONFIG } from "./config.js";

export function createObjects() {
  const O = CONFIG.OBJECTS || { types: {}, placements: [] };
  const types = O.types || {};
  const placements = O.placements || [];

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

  const solids = []; // foot rects {x,y,w,h} in world space — used by collision
  const items = [];  // drawables {sortY, draw(ctx,camX,camY)} — used by y-sorted render

  for (const place of placements) {
    const def = types[place.type];
    if (!def) { console.warn(`objects: unknown type "${place.type}"`); continue; }
    const rec = spriteFor(def);
    const x = place.x, y = place.y;

    // footprint: fpW×fpH band centered on the sprite, its bottom edge sitting on anchorY
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

  // Does a collider box overlap any object footprint? (AABB, half-open intervals.)
  function blocks(left, top, w, h) {
    for (const r of solids) {
      if (left < r.x + r.w && left + w > r.x && top < r.y + r.h && top + h > r.y) return true;
    }
    return false;
  }

  return { items, solids, blocks, count: items.length };
}
