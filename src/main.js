// main.js — ASSET-TEST HARNESS. Loads your Sprite Fusion map, places world objects,
// and drives the Iju over it with tile + per-object collision and y-sorted depth.
// Gameplay systems (delivery.js / ui.js + fizz, grade, score) stay stubbed for the jam window.
//
// Press [E] to open the placement EDITOR (editor.js): pick a type, click to place, drag
// to move, [Del] to remove, [X] to copy the placements list to the clipboard.

import { CONFIG } from "./config.js";
import { createInput } from "./input.js";
import { createPlayer } from "./player.js";
import { createCamera } from "./camera.js";
import { loadMap } from "./map.js";
import { createObjects } from "./objects.js";
import { createEditor } from "./editor.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = CONFIG.INTERNAL_W;
canvas.height = CONFIG.INTERNAL_H;
ctx.imageSmoothingEnabled = false; // crisp pixel art

function fitToWindow() {
  const s = Math.min(window.innerWidth / CONFIG.INTERNAL_W, window.innerHeight / CONFIG.INTERNAL_H);
  canvas.style.width = `${Math.floor(CONFIG.INTERNAL_W * s)}px`;
  canvas.style.height = `${Math.floor(CONFIG.INTERNAL_H * s)}px`;
}
window.addEventListener("resize", fitToWindow);
fitToWindow();

ctx.fillStyle = CONFIG.COLORS.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = CONFIG.COLORS.text; ctx.font = "14px monospace"; ctx.textAlign = "center";
ctx.fillText("loading map…", canvas.width / 2, canvas.height / 2);

async function start() {
  let map;
  try {
    map = await loadMap(CONFIG.MAP.json, CONFIG.MAP.tilesheet);
  } catch (e) {
    ctx.fillStyle = CONFIG.COLORS.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = CONFIG.COLORS.accent; ctx.font = "13px monospace"; ctx.textAlign = "center";
    ctx.fillText("couldn't load assets/maps/map.json (run via npx serve, not file://)", canvas.width / 2, canvas.height / 2);
    console.error(e);
    return;
  }

  const input = createInput();
  const camera = createCamera(map.width, map.height);
  const player = createPlayer(map.width / 2 - 32, map.height / 2 - 32); // start in the map center
  const objects = createObjects(); // placed props/obstacles from CONFIG.OBJECTS
  const editor = createEditor({ canvas, camera, objects, map, types: (CONFIG.OBJECTS && CONFIG.OBJECTS.types) || {} });
  const F = CONFIG.SPRITE; // 64×64 frame

  // Click anywhere to print that world point to the console — handy for placing objects.
  // Skipped while the editor is open (the editor handles its own mouse input).
  let lastClick = null;
  canvas.addEventListener("click", (e) => {
    if (editor.active) return;
    const rect = canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (CONFIG.INTERNAL_W / rect.width);
    const sy = (e.clientY - rect.top) * (CONFIG.INTERNAL_H / rect.height);
    lastClick = { x: Math.round(sx + camera.cam.x), y: Math.round(sy + camera.cam.y) };
    console.log(`object coord (sprite top-left): { type: "rock", x: ${lastClick.x}, y: ${lastClick.y} }`);
  });

  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.05) dt = 0.05; // clamp big gaps (backgrounded tab)

    const s = player.state;
    if (editor.active) {
      // editing: freeze the Iju and free-pan the camera with WASD/Arrows
      editor.update(dt, input);
      camera.follow(editor.camX, editor.camY);
    } else {
      player.update(dt, input, map, objects); // map = solid tiles, objects = solid footprints
      camera.follow(s.x + F.frameW / 2, s.y + F.frameH / 2); // center on the Iju's frame
    }

    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    map.draw(ctx, camera.cam.x, camera.cam.y);

    // y-sort: draw player + objects ordered by feet-Y so nearer things overlap farther ones.
    const ft = CONFIG.PLAYER_FOOT;
    const playerFeetY = s.y + ft.offY + ft.h; // the Iju's feet (bottom of the foot box)
    const drawList = objects.items.concat([
      { sortY: playerFeetY, draw: (g, camX, camY) => player.draw(g, camX, camY) },
    ]);
    drawList.sort((a, b) => a.sortY - b.sortY);
    for (const d of drawList) d.draw(ctx, camera.cam.x, camera.cam.y);

    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(8, 8, 360, 64);
    ctx.fillStyle = CONFIG.COLORS.text; ctx.font = "11px monospace"; ctx.textAlign = "left";
    ctx.fillText("ASSET TEST — WASD/Arrows move, Space jump · [E] editor", 14, 24);
    ctx.fillText(`anim: ${s.anim}   dir: ${s.dir}   frame: ${s.frame}`, 14, 40);
    ctx.fillText(`objects: ${objects.count}   last click: ${lastClick ? lastClick.x + ", " + lastClick.y : "—"}`, 14, 56);

    editor.draw(ctx); // overlay; no-op when the editor is closed

    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
start();
