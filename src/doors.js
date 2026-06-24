// doors.js — shared door controller used by every scene. A door is a config zone
// { rect, to, spawn, label }: when the Iju's foot box enters `rect`, the scene returns a
// transition request and the manager swaps to scene `to`, spawning the Iju at `spawn`
// (a coordinate in the TARGET scene). Used by both town and pickup so the logic lives once.
//
// Arrival guard: a freshly entered scene starts DISARMED and only arms once the Iju is clear
// of every door — so spawning next to (or on) a door never bounces you straight back.

import { CONFIG } from "./config.js";

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function createDoorController(sceneName) {
  const doors = (CONFIG.DOORS && CONFIG.DOORS[sceneName]) || [];
  let armed = false; // becomes true once the Iju has been clear of all doors at least once

  // footRect = the Iju's foot box in world space. Returns { to, spawn } or null.
  function check(footRect) {
    const hit = doors.find((d) => aabb(footRect, d.rect));
    if (!armed) { if (!hit) armed = true; return null; } // wait until clear of doors to arm
    return hit ? { to: hit.to, spawn: hit.spawn } : null;
  }

  function draw(ctx, camX, camY) {
    for (const d of doors) {
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
