// scene-pickup.js — the depot / pickup scene (the start of the loop). Deliberately minimal:
// its own placeholder map (a distinct room), its own object list so the editor works here too,
// and a door back to the town. No villagers / no UI scrub — that's the town's test bed; this
// scene exists to prove the scene flow (second tileset loads independently + the transition).
//
// Real pickup art later: swap createPlaceholderMap(...) for loadMap(json, tilesheet), and lay
// the depot out with the editor — [X] exports into CONFIG.PICKUP.placements.

import { CONFIG } from "./config.js";
import { createPlayer } from "./player.js";
import { createCamera } from "./camera.js";
import { createObjects } from "./objects.js";
import { createPlaceholderMap } from "./placeholder-map.js";
import { createDoorController } from "./doors.js";

export function createPickupScene(opts = {}) {
  const F = CONFIG.SPRITE; // 64×64 frame
  let map = null, camera = null, player = null, objects = null, doors = null;

  async function load() {
    const P = CONFIG.PICKUP;
    map = createPlaceholderMap(P.map); // swap for loadMap(P.json, P.tilesheet) when art exists
    camera = createCamera(map.width, map.height);
    const sp = opts.spawnAt || { x: map.width / 2 - 32, y: map.height / 2 - 32 };
    player = createPlayer(sp.x, sp.y); // arrive at the gate the manager handed us (or center)
    objects = createObjects(P.placements); // pickup's OWN placements (shared type registry)
    doors = createDoorController("pickup");
  }

  function update(dt, input) {
    player.update(dt, input, map, objects);
    const s = player.state;
    camera.follow(s.x + F.frameW / 2, s.y + F.frameH / 2);
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
    const drawList = objects.items.concat([
      { sortY: playerFeetY, draw: (g, camX, camY) => player.draw(g, camX, camY) },
    ]);
    drawList.sort((a, b) => a.sortY - b.sortY);
    for (const d of drawList) d.draw(ctx, camera.cam.x, camera.cam.y);

    // dev HUD
    const bx = 8, bw = 420, bh = 40, by = ctx.canvas.height - bh - 8;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = CONFIG.COLORS.text; ctx.font = "11px monospace"; ctx.textAlign = "left";
    ctx.fillText("PICKUP (placeholder) — walk into the gate → town   ·   [E] editor", bx + 6, by + 16);
    ctx.fillText(`objects: ${objects.count}`, bx + 6, by + 32);
  }

  return {
    load, update, draw,
    get camera() { return camera; },
    get objects() { return objects; },
    get map() { return map; },
  };
}
