// objects.js — placed world objects (props, buildings; ground decals like paths/stains).
// Each object renders ON TOP of the ground and (if solid) contributes a TIGHT footprint to
// collision — just its base, not a whole tile. Objects + player are y-sorted in the scene so
// the Iju passes behind taller objects. Data lives in CONFIG.OBJECTS:
//   types[name]  = { sprite, w, h, anchorY, fpW, fpH, solid?, ground? }  // registry (SHARED by all scenes)
//   placements[] = { type, x, y, solid?, door? }                        // x,y = world top-left of sprite
//
// solid/ground (both default off the obvious way):
//   • default            → SOLID + y-sorted (a normal prop/building).
//   • type solid: false  → no collision, still y-sorted (a walk-BEHIND prop, e.g. a tall banner).
//   • placement solid:   → (optional, true|false) OVERRIDES the type default for that ONE object,
//                          so the editor's [F] key can make a single prop walk-through (or solid)
//                          without changing the type. Ground decals ignore it (always non-solid).
//   • ground: true       → a flat GROUND DECAL: draws beneath every y-sorted entity and never
//                          collides (implies non-solid). This is how stone paths / stains /
//                          fallen leaves get placed via the editor without blocking movement.
//
// createObjects(placements) takes an OPTIONAL placement list so each scene can have its own
// objects (town uses CONFIG.OBJECTS.placements by default; pickup passes CONFIG.PICKUP.placements).
// The type registry is shared. The list is MUTABLE at runtime so the editor can add/move/delete/
// toggle and rebuild() regenerates the draw + collision data.

import { CONFIG } from "./config.js";

// Ground decals sort by their own feet line MINUS this bias, so they always land below every
// entity (whose sortY is a real world-Y, ~0..map height) while still layering among themselves.
const GROUND_SORT_BIAS = 100000;

export function createObjects(placementsInput) {
  const O = CONFIG.OBJECTS || { types: {}, placements: [] };
  const types = O.types || {};

  // Working COPY of the chosen placement list, so editing never mutates the CONFIG literal.
  // Spread keeps every field (incl. `solid` / `door`), so a saved override survives the copy.
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

  // Effective solidity of one placement: ground decals never collide; otherwise a per-placement
  // `solid` override wins, falling back to the type default (solid unless the type opts out).
  function isSolidPlacement(place, def) {
    if (def.ground === true) return false;
    return place.solid ?? (def.solid !== false);
  }

  function rebuild() {
    items.length = 0;
    solids.length = 0;
    for (const place of placements) {
      const def = types[place.type];
      if (!def) { console.warn(`objects: unknown type "${place.type}"`); continue; }
      const rec = spriteFor(def);
      const x = place.x, y = place.y;

      // A `ground` decal is flat and never collides. Anything else is solid UNLESS the type
      // opts out (solid:false) OR this specific placement overrides it (place.solid:false).
      const isGround = def.ground === true;
      const isSolid = isSolidPlacement(place, def);

      // Only solids carry a footprint into collision.
      let foot = null;
      if (isSolid) {
        foot = {
          x: x + def.w / 2 - def.fpW / 2,
          y: y + def.anchorY - def.fpH,
          w: def.fpW,
          h: def.fpH,
        };
        solids.push(foot);
      }

      // Draw order = feet line. Ground decals subtract the big bias so they sit under all entities;
      // anchorY may be omitted on a flat decal, so fall back to the sprite bottom for ordering.
      const contactY = y + (def.anchorY ?? def.h);
      const sortY = isGround ? contactY - GROUND_SORT_BIAS : contactY;

      items.push({
        sortY,
        draw(ctx, camX, camY) {
          const sx = Math.floor(x - camX), sy = Math.floor(y - camY);
          if (rec && rec.ready) {
            ctx.drawImage(rec.img, sx, sy, def.w, def.h);
          } else {
            ctx.fillStyle = isGround ? "#5b6b4a" : "#7a7f8a"; // ground gets a flatter tint while art loads
            ctx.fillRect(sx, sy, def.w, def.h);
          }
          if (foot && O.debugFootprints) { // only solids have a footprint to outline
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
  // Ground/non-solid objects aren't in `solids`, so they're transparent to movement.
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
        const sortY = place.y + (def.anchorY ?? def.h); // guard decals with no anchorY (no NaN)
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
  // Flip this ONE placement's solid override against the type default, then rebuild so collision
  // + draw pick it up. Ground decals are always non-solid → no-op (returns null). Returns the new
  // effective solidity (true|false). The override persists through the editor's [X] export.
  function toggleSolid(place) {
    const def = types[place.type];
    if (!def || def.ground === true) return null;
    place.solid = !isSolidPlacement(place, def);
    rebuild();
    return place.solid;
  }
  function imageFor(type) {
    const def = types[type];
    return def ? spriteFor(def) : null;
  }

  rebuild(); // initial build from the chosen placements

  return {
    items, solids, blocks, rebuild,
    hitTest, add, remove, moveTo, toggleSolid, imageFor,
    getPlacements: () => placements,
    get count() { return items.length; },
  };
}