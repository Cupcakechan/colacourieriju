// main.js — ASSET-TEST HARNESS. Loads your Sprite Fusion map and drives the Iju over it.
// Gameplay systems (delivery.js / ui.js + fizz, grade, score) stay stubbed for the jam window.

import { CONFIG } from "./config.js";
import { createInput } from "./input.js";
import { createPlayer } from "./player.js";
import { createCamera } from "./camera.js";
import { loadMap } from "./map.js";

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

// loading note while the map fetch + image load resolve
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

  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.05) dt = 0.05; // clamp big gaps (backgrounded tab)

    player.update(dt, input, map.bounds);
    const c = CONFIG.PLAYER_COLLIDER, s = player.state;
    camera.follow(s.x + c.offX + c.w / 2, s.y + c.offY + c.h / 2);

    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    map.draw(ctx, camera.cam.x, camera.cam.y);
    player.draw(ctx, camera.cam.x, camera.cam.y);

    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(8, 8, 252, 46);
    ctx.fillStyle = CONFIG.COLORS.text; ctx.font = "11px monospace"; ctx.textAlign = "left";
    ctx.fillText("ASSET TEST — WASD/Arrows to move, Space to jump", 14, 24);
    ctx.fillText(`anim: ${s.anim}   dir: ${s.dir}   frame: ${s.frame}`, 14, 40);

    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
start();
