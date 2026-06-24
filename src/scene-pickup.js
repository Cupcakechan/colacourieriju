// scene-pickup.js — the depot / pickup scene (the start of the loop). Owns its own map +
// tileset + objects (the editor works here too) + a door back to the town. Hosts the ambient
// YOKAI NPC group (the spirits that live in the starting area); no UI scrub — that's the
// town's test bed. This scene proves the scene flow, its own tileset, and the yokai group.
//
// Loads the real depot export (CONFIG.PICKUP.json/tilesheet); if those files aren't present
// yet it falls back to the code-drawn placeholder room, so the boot never breaks. Lay the
// depot interior out with the editor — [X] exports into CONFIG.PICKUP.placements.

import { CONFIG } from "./config.js";
import { createPlayer } from "./player.js";
import { createCamera } from "./camera.js";
import { loadMap } from "./map.js";
import { createObjects } from "./objects.js";
import { createNpcs } from "./npcs.js";
import { createPlaceholderMap } from "./placeholder-map.js";
import { createDoorController } from "./doors.js";

export function createPickupScene(opts = {}) {
  const F = CONFIG.SPRITE; // 64×64 frame
  let map = null, camera = null, player = null, objects = null, yokai = null, doors = null;

  async function load() {
    const P = CONFIG.PICKUP;
    try {
      map = await loadMap(P.json, P.tilesheet); // the real depot export
    } catch (e) {
      console.warn("pickup: depot map failed to load — using the placeholder room", e);
      map = createPlaceholderMap(P.map); // graceful fallback: a code-drawn room
    }
    camera = createCamera(map.width, map.height);
    const sp = opts.spawnAt || { x: map.width / 2 - 32, y: map.height / 2 - 32 };
    player = createPlayer(sp.x, sp.y); // arrive at the gate the manager handed us (or center)
    objects = createObjects(P.placements); // pickup's OWN placements (shared type registry)
    yokai = createNpcs(CONFIG.YOKAI, { map, objects }); // ambient spirits living in the depot
    doors = createDoorController("pickup", objects); // objects → object-anchored doors (future depot building)
  }

  function update(dt, input) {
    player.update(dt, input, map, objects);
    const s = player.state;
    camera.follow(s.x + F.frameW / 2, s.y + F.frameH / 2);
    yokai.update(dt); // wander loop only — no bump→fizz/gameplay reaction (jam-window work)
    const ft = CONFIG.PLAYER_FOOT;
    const foot = { x: s.x + ft.offX, y: s.y + ft.offY, w: ft.w, h: ft.h };
    return doors.check(foot); // -> transition request (or null), handled by the manager
  }

  function draw(ctx) {
    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    map.draw(ctx, camera.cam.x, camera.cam.y);
    doors.draw(ctx, camera.cam.x, camera.cam.y); // ground-level door zones

    const s = player.state;
    const ft = CONFIG.PLAYER_FOOT;
    const playerFeetY = s.y + ft.offY + ft.h;
    // yokai join the y-sort so the Iju passes in front of / behind them by feet line, same as town
    const drawList = objects.items.concat(yokai.items, [
      { sortY: playerFeetY, draw: (g, camX, camY) => player.draw(g, camX, camY) },
    ]);
    drawList.sort((a, b) => a.sortY - b.sortY);
    for (const d of drawList) d.draw(ctx, camera.cam.x, camera.cam.y);

    // dev HUD
    const bx = 8, bw = 420, bh = 40, by = ctx.canvas.height - bh - 8;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = CONFIG.COLORS.text; ctx.font = "11px monospace"; ctx.textAlign = "left";
    ctx.fillText("DEPOT — walk into the gate → town   ·   [E] editor", bx + 6, by + 16);
    ctx.fillText(`objects: ${objects.count}   yokai: ${yokai.count}`, bx + 6, by + 32);
  }

  return {
    load, update, draw,
    get camera() { return camera; },
    get objects() { return objects; },
    get map() { return map; },
  };
}
