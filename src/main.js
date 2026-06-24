// main.js — thin bootstrap + game loop. Sets up the canvas, builds the scene manager,
// registers the scenes, boots one, and runs the loop (which delegates to the manager).
// All world logic lives in the scene modules; the scene manager owns the editor + transitions.
//
// Press [E] in any scene to open the placement EDITOR (editor.js).

import { CONFIG } from "./config.js";
import { createInput } from "./input.js";
import { createSceneManager } from "./scene-manager.js";
import { createTownScene } from "./scene-town.js";
import { createPickupScene } from "./scene-pickup.js";

const BOOT_SCENE = "pickup"; // the depot start; change to "town" to land in the town while testing

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

function centerText(text, color, size) {
  ctx.fillStyle = CONFIG.COLORS.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color; ctx.font = `${size}px monospace`; ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}
centerText("loading…", CONFIG.COLORS.text, 14);

async function start() {
  const input = createInput();
  const manager = createSceneManager({ canvas, ctx, input });
  manager.register("town", createTownScene);
  manager.register("pickup", createPickupScene);

  try {
    await manager.go(BOOT_SCENE);
  } catch (e) {
    centerText("couldn't load the map (run via npx serve, not file://)", CONFIG.COLORS.accent, 13);
    console.error(e);
    return;
  }

  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.05) dt = 0.05; // clamp big gaps (backgrounded tab)

    manager.update(dt);
    manager.draw(); // scene clears + draws its world, then the editor overlay

    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
start();
