// scene-town.js — the town scene (former asset-test harness body). Owns its own map +
// tileset + objects + camera + player + NPCs. Exposes camera/objects/map so the manager's
// editor can operate on it.
//
// Pass 2 additions: wandering villagers (npcs), and an Iju burst/celebrate one-shot played
// over the Iju on [1]/[2] for playback testing. The Iju's normal animation (player.js) is
// untouched — the FX just replaces its draw while it's playing.

import { CONFIG } from "./config.js";
import { createPlayer } from "./player.js";
import { createCamera } from "./camera.js";
import { loadMap } from "./map.js";
import { createObjects } from "./objects.js";
import { createNpcs } from "./npcs.js";
import { createAnimator } from "./animator.js";

export function createTownScene(/* opts */) {
  const F = CONFIG.SPRITE; // 64×64 frame
  let map = null, camera = null, player = null, objects = null, npcs = null;
  let ijuFx = null;    // Burst/Celebrate one-shot animator (test playback)
  let fxActive = false;

  async function load() {
    map = await loadMap(CONFIG.MAP.json, CONFIG.MAP.tilesheet);
    camera = createCamera(map.width, map.height);
    player = createPlayer(map.width / 2 - 32, map.height / 2 - 32); // start in the map center
    objects = createObjects(); // placed props/buildings from CONFIG.OBJECTS
    npcs = createNpcs({ map, objects }); // wandering villagers (placeholder boxes until art lands)
    ijuFx = createAnimator(CONFIG.IJU_FX); // burst/celebrate (placeholder flash until sheets exist)
  }

  function update(dt, input) {
    player.update(dt, input, map, objects); // map = solid tiles, objects = solid footprints
    const s = player.state;
    camera.follow(s.x + F.frameW / 2, s.y + F.frameH / 2); // center on the Iju's frame
    npcs.update(dt);

    // Iju one-shot test: [1] burst, [2] celebrate — play once over the Iju, then revert
    if (input.consumePressed("Digit1")) { ijuFx.play("Burst", "S"); fxActive = true; }
    if (input.consumePressed("Digit2")) { ijuFx.play("Celebrate", "S"); fxActive = true; }
    if (fxActive) { ijuFx.update(dt); if (ijuFx.isDone()) fxActive = false; }
  }

  function draw(ctx) {
    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    map.draw(ctx, camera.cam.x, camera.cam.y);

    const s = player.state;
    const ft = CONFIG.PLAYER_FOOT;
    const playerFeetY = s.y + ft.offY + ft.h; // the Iju's feet (bottom of the foot box)

    // while a one-shot plays, draw the FX in the Iju's place (player.js stays untouched)
    const ijuDraw = fxActive
      ? (g, camX, camY) => ijuFx.draw(g, Math.floor(s.x - camX), Math.floor(s.y - camY))
      : (g, camX, camY) => player.draw(g, camX, camY);

    // y-sort: objects + villagers + the Iju, ordered by feet-Y so nearer things overlap farther.
    const drawList = objects.items.concat(npcs.items, [{ sortY: playerFeetY, draw: ijuDraw }]);
    drawList.sort((a, b) => a.sortY - b.sortY);
    for (const d of drawList) d.draw(ctx, camera.cam.x, camera.cam.y);

    // asset-test HUD
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(8, 8, 360, 56);
    ctx.fillStyle = CONFIG.COLORS.text; ctx.font = "11px monospace"; ctx.textAlign = "left";
    ctx.fillText("ASSET TEST — move · [E] editor · [1]/[2] Iju FX", 14, 24);
    ctx.fillText(`anim: ${s.anim}  dir: ${s.dir}  frame: ${s.frame}`, 14, 40);
    ctx.fillText(`objects: ${objects.count}  villagers: ${npcs.count}`, 14, 56);
  }

  return {
    load, update, draw,
    get camera() { return camera; },
    get objects() { return objects; },
    get map() { return map; },
  };
}
