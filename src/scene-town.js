// scene-town.js — the town scene (this is the former asset-test harness body).
// Owns its own map + tileset + objects + camera + player. Exposes camera/objects/map
// so the manager's editor can operate on it. An `npcs` slot is reserved so Pass 2's
// villager animator plugs in without reshaping this file.

import { CONFIG } from "./config.js";
import { createPlayer } from "./player.js";
import { createCamera } from "./camera.js";
import { loadMap } from "./map.js";
import { createObjects } from "./objects.js";

export function createTownScene(/* opts */) {
  const F = CONFIG.SPRITE; // 64×64 frame
  let map = null, camera = null, player = null, objects = null;
  // let npcs = null; // (Pass 2) wandering villagers built on the shared animator

  // Async because the Sprite Fusion map loads over the network; the manager awaits this
  // before the scene goes active (and shows the loading/failure screen meanwhile).
  async function load() {
    map = await loadMap(CONFIG.MAP.json, CONFIG.MAP.tilesheet);
    camera = createCamera(map.width, map.height);
    player = createPlayer(map.width / 2 - 32, map.height / 2 - 32); // start in the map center
    objects = createObjects(); // placed props/buildings from CONFIG.OBJECTS
    // npcs = createNpcs({ map, objects }); // (Pass 2)
  }

  function update(dt, input) {
    player.update(dt, input, map, objects); // map = solid tiles, objects = solid footprints
    const s = player.state;
    camera.follow(s.x + F.frameW / 2, s.y + F.frameH / 2); // center on the Iju's frame
    // npcs.update(dt, map, objects); // (Pass 2)
  }

  function draw(ctx) {
    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    map.draw(ctx, camera.cam.x, camera.cam.y);

    // y-sort: draw player + objects ordered by feet-Y so nearer things overlap farther ones.
    const s = player.state;
    const ft = CONFIG.PLAYER_FOOT;
    const playerFeetY = s.y + ft.offY + ft.h; // the Iju's feet (bottom of the foot box)
    const drawList = objects.items.concat([
      { sortY: playerFeetY, draw: (g, camX, camY) => player.draw(g, camX, camY) },
    ]);
    // (Pass 2) npcs.items would also push into drawList here for correct depth
    drawList.sort((a, b) => a.sortY - b.sortY);
    for (const d of drawList) d.draw(ctx, camera.cam.x, camera.cam.y);

    // asset-test HUD
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(8, 8, 360, 56);
    ctx.fillStyle = CONFIG.COLORS.text; ctx.font = "11px monospace"; ctx.textAlign = "left";
    ctx.fillText("ASSET TEST — WASD/Arrows move, Space jump · [E] editor", 14, 24);
    ctx.fillText(`anim: ${s.anim}   dir: ${s.dir}   frame: ${s.frame}`, 14, 40);
    ctx.fillText(`objects: ${objects.count}`, 14, 56);
  }

  return {
    load, update, draw,
    get camera() { return camera; },
    get objects() { return objects; },
    get map() { return map; },
  };
}
