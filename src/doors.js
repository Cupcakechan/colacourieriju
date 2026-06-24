// doors.js — shared door controller used by every scene. A door is EITHER a STATIC config zone
// (CONFIG.DOORS[scene]) OR an OBJECT-ANCHORED entrance: a placement that carries a `door` field,
// whose trigger rect is built from the building's LIVE position + its type's `entrance` rect.
// Either way, when the Iju's foot box enters the rect, the scene returns a transition request and
// the manager swaps to scene `to`, spawning the Iju at `spawn` (a coordinate in the TARGET scene).
//
// Object-anchored doors RIDE the building: dragging it in the editor moves the trip with it, so
// there's no hardcoded coordinate to keep in sync during layout.
//
// Arrival guard: a freshly entered scene starts DISARMED and only arms once the Iju is clear of
// every door — so spawning next to (or on) a door never bounces you straight back.

import { CONFIG } from "./config.js";

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// objects (optional): the scene's object set. Placements with a `door:{to,spawn,label?}` field
// become live doors, their rect taken from the type's `entrance:{offX,offY,w,h}` (sprite-local).
export function createDoorController(sceneName, objects = null) {
  const staticDoors = (CONFIG.DOORS && CONFIG.DOORS[sceneName]) || [];
  const types = (CONFIG.OBJECTS && CONFIG.OBJECTS.types) || {};
  let armed = false; // becomes true once the Iju has been clear of all doors at least once

  // Object-anchored doors, recomputed from the LIVE placements each call so a building dragged
  // in the editor carries its entrance with it. A placement needs a `door` field AND its type
  // needs an `entrance` rect; otherwise it's skipped (a plain building is not a portal).
  function objectDoors() {
    if (!objects) return [];
    const out = [];
    for (const p of objects.getPlacements()) {
      if (!p.door) continue;
      const e = types[p.type] && types[p.type].entrance;
      if (!e) continue;
      out.push({
        rect: { x: p.x + e.offX, y: p.y + e.offY, w: e.w, h: e.h },
        to: p.door.to,
        spawn: p.door.spawn,
        label: p.door.label || `to ${p.door.to}`,
      });
    }
    return out;
  }

  function allDoors() { return staticDoors.concat(objectDoors()); }

  // footRect = the Iju's foot box in world space. Returns { to, spawn } or null.
  function check(footRect) {
    const hit = allDoors().find((d) => aabb(footRect, d.rect));
    if (!armed) { if (!hit) armed = true; return null; } // wait until clear of doors to arm
    return hit ? { to: hit.to, spawn: hit.spawn } : null;
  }

  function draw(ctx, camX, camY) {
    for (const d of allDoors()) {
      const x = Math.floor(d.rect.x - camX), y = Math.floor(d.rect.y - camY);
      ctx.fillStyle = "rgba(216,58,46,0.18)";
      ctx.fillRect(x, y, d.rect.w, d.rect.h);
      ctx.strokeStyle = "rgba(216,58,46,0.8)"; ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, d.rect.w - 1, d.rect.h - 1);
      if (d.label) {
        ctx.fillStyle = "#e8e8ec"; ctx.font = "11px monospace"; ctx.textAlign = "center";
        ctx.fillText(d.label, x + d.rect.w / 2, y - 4);
      }
    }
  }

  return { check, draw };
}
