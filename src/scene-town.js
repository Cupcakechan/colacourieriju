// scene-town.js — the town scene (former asset-test harness body). Owns its own map +
// tileset + objects + camera + player + NPCs. Exposes camera/objects/map so the manager's
// editor can operate on it.
//
// Pass 2: wandering villagers + Iju burst/celebrate on [1]/[2].
// Pass 3: a dummy-state UI TEST BED — scrub keys drive the HUD renderer (ui.js) so every
// element can be eyeballed at real resolution. No gameplay logic; delivery.js feeds ui.js
// real state in the jam. Scrub keys: [ ] fizz · G grade · M streak · T pause (shift+T reset) · O arrow.

import { CONFIG } from "./config.js";
import { createPlayer } from "./player.js";
import { createCamera } from "./camera.js";
import { loadMap } from "./map.js";
import { createObjects } from "./objects.js";
import { createNpcs } from "./npcs.js";
import { createAnimator } from "./animator.js";
import { createUI } from "./ui.js";

// --- UI test-bed constants (dev-only; the real values live in CONFIG / arrive from delivery.js) ---
const FIZZ_SCRUB = 60;                 // fizz units/sec while [ or ] is held
const GRADE_POPUP_TIME = 1.5;          // s a grade badge stays up
const STREAK_MULTS = [1.0, 1.5, 2.0];  // tiers cycled by [M]
const GRADE_NAMES = ["Perfect", "Good", "Shaken", "Burst"]; // cycled by [G]
const ARROW_TARGETS = [                // world points cycled by [O] (some off-screen)
  { x: 506, y: 472 },   // ~ sodahq (shop)
  { x: 1067, y: 471 },  // ~ temple
  { x: 1850, y: 1350 }, // far corner
  { x: 200, y: 200 },   // near origin
];

export function createTownScene(/* opts */) {
  const F = CONFIG.SPRITE; // 64×64 frame
  let map = null, camera = null, player = null, objects = null, npcs = null;
  let ijuFx = null, fxActive = false; // Burst/Celebrate one-shot playback
  let ui = null;

  // dummy HUD state the scrub keys drive (delivery.js will own the real version)
  const u = {
    fizz: 30, fizzMax: CONFIG.FIZZ_MAX,
    score: 0,
    streakIdx: 0,
    timeLeft: CONFIG.SHIFT_SECONDS, paused: false,
    gradeName: null, gradePoints: 0, gradeT: 0, gradeIdx: 0,
    arrowIdx: 0,
  };

  async function load() {
    map = await loadMap(CONFIG.MAP.json, CONFIG.MAP.tilesheet);
    camera = createCamera(map.width, map.height);
    player = createPlayer(map.width / 2 - 32, map.height / 2 - 32); // start in the map center
    objects = createObjects();
    npcs = createNpcs({ map, objects });
    ijuFx = createAnimator(CONFIG.IJU_FX);
    ui = createUI();
  }

  function update(dt, input) {
    player.update(dt, input, map, objects);
    const s = player.state;
    camera.follow(s.x + F.frameW / 2, s.y + F.frameH / 2);
    npcs.update(dt);

    // Iju one-shot test: [1] burst, [2] celebrate
    if (input.consumePressed("Digit1")) { ijuFx.play("Burst", "S"); fxActive = true; }
    if (input.consumePressed("Digit2")) { ijuFx.play("Celebrate", "S"); fxActive = true; }
    if (fxActive) { ijuFx.update(dt); if (ijuFx.isDone()) fxActive = false; }

    // --- UI scrub (no gameplay logic) ---
    if (input.isDown("BracketRight")) u.fizz = Math.min(u.fizzMax, u.fizz + FIZZ_SCRUB * dt); // ] up
    if (input.isDown("BracketLeft")) u.fizz = Math.max(0, u.fizz - FIZZ_SCRUB * dt);          // [ down
    if (input.consumePressed("KeyG")) { // pop the next grade badge (and bump score by points × mult)
      u.gradeName = GRADE_NAMES[u.gradeIdx];
      u.gradePoints = CONFIG.POINTS[u.gradeName.toLowerCase()] ?? 0;
      u.gradeT = GRADE_POPUP_TIME;
      u.score += Math.round(u.gradePoints * STREAK_MULTS[u.streakIdx]);
      u.gradeIdx = (u.gradeIdx + 1) % GRADE_NAMES.length;
    }
    if (input.consumePressed("KeyM")) u.streakIdx = (u.streakIdx + 1) % STREAK_MULTS.length;
    if (input.consumePressed("KeyT")) { // T = pause/resume, shift+T = reset
      if (input.isDown("ShiftLeft") || input.isDown("ShiftRight")) u.timeLeft = CONFIG.SHIFT_SECONDS;
      else u.paused = !u.paused;
    }
    if (input.consumePressed("KeyO")) u.arrowIdx = (u.arrowIdx + 1) % ARROW_TARGETS.length;

    if (!u.paused) u.timeLeft = Math.max(0, u.timeLeft - dt);
    if (u.gradeT > 0) u.gradeT = Math.max(0, u.gradeT - dt);
  }

  function draw(ctx) {
    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    map.draw(ctx, camera.cam.x, camera.cam.y);

    const s = player.state;
    const ft = CONFIG.PLAYER_FOOT;
    const playerFeetY = s.y + ft.offY + ft.h;
    const ijuDraw = fxActive
      ? (g, camX, camY) => ijuFx.draw(g, Math.floor(s.x - camX), Math.floor(s.y - camY))
      : (g, camX, camY) => player.draw(g, camX, camY);

    const drawList = objects.items.concat(npcs.items, [{ sortY: playerFeetY, draw: ijuDraw }]);
    drawList.sort((a, b) => a.sortY - b.sortY);
    for (const d of drawList) d.draw(ctx, camera.cam.x, camera.cam.y);

    // game HUD (dummy-driven; delivery.js feeds the real state in the jam)
    const cam = camera.cam, tgt = ARROW_TARGETS[u.arrowIdx];
    ui.draw(ctx, {
      fizz: u.fizz, fizzMax: u.fizzMax,
      score: u.score,
      streakMult: STREAK_MULTS[u.streakIdx],
      timeLeft: u.timeLeft,
      grade: u.gradeT > 0 ? { name: u.gradeName, points: u.gradePoints, t: u.gradeT / GRADE_POPUP_TIME } : null,
      arrow: {
        fromX: s.x + F.frameW / 2 - cam.x, fromY: s.y + F.frameH / 2 - cam.y,
        toX: tgt.x - cam.x, toY: tgt.y - cam.y, show: true,
      },
    });

    // dev HUD (relocated bottom-left so the fizz bar up top is clear)
    const bx = 8, bw = 440, bh = 68, by = ctx.canvas.height - bh - 8;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = CONFIG.COLORS.text; ctx.font = "11px monospace"; ctx.textAlign = "left";
    ctx.fillText("DEV — [E] editor   [1]/[2] FX   [ and ] fizz", bx + 6, by + 16);
    ctx.fillText("G grade   M streak   T pause (shift+T reset)   O arrow", bx + 6, by + 32);
    ctx.fillText(`anim: ${s.anim}   dir: ${s.dir}   frame: ${s.frame}`, bx + 6, by + 48);
    ctx.fillText(`objects: ${objects.count}   villagers: ${npcs.count}`, bx + 6, by + 64);
  }

  return {
    load, update, draw,
    get camera() { return camera; },
    get objects() { return objects; },
    get map() { return map; },
  };
}