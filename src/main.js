// main.js — entry point. FRAMEWORK SHELL ONLY.
// Canvas bootstrap + fit-to-window scaling + a render loop that proves the shell runs.
// Gameplay systems (the stub modules below) are assembled during the 72h jam window.

import { CONFIG } from "./config.js";
// Stubs to be wired in during the jam — imported here so the structure is visible:
// import { createInput } from "./input.js";
// import { createPlayer } from "./player.js";
// import { createCamera } from "./camera.js";
// import { createMap } from "./map.js";
// import { createDelivery } from "./delivery.js";
// import { createUI } from "./ui.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Fixed internal buffer; we draw at this resolution and scale the element with CSS.
canvas.width = CONFIG.INTERNAL_W;
canvas.height = CONFIG.INTERNAL_H;
ctx.imageSmoothingEnabled = false; // crisp pixel art (buffer size never changes, so this sticks)

function fitToWindow() {
  // Largest size that fits the window while preserving 16:9; body bg shows as letterbox.
  const scale = Math.min(
    window.innerWidth / CONFIG.INTERNAL_W,
    window.innerHeight / CONFIG.INTERNAL_H
  );
  canvas.style.width = `${Math.floor(CONFIG.INTERNAL_W * scale)}px`;
  canvas.style.height = `${Math.floor(CONFIG.INTERNAL_H * scale)}px`;
}
window.addEventListener("resize", fitToWindow);
fitToWindow();

// --- Render loop (shell) ---------------------------------------------------
function frame() {
  ctx.fillStyle = CONFIG.COLORS.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Placeholder so the framework is visibly running.
  ctx.fillStyle = CONFIG.COLORS.accent;
  ctx.font = "20px monospace";
  ctx.textAlign = "center";
  ctx.fillText("Cola Courier: Iju", canvas.width / 2, canvas.height / 2 - 10);

  ctx.fillStyle = CONFIG.COLORS.text;
  ctx.font = "12px monospace";
  ctx.fillText("framework shell — gameplay assembled in the jam window", canvas.width / 2, canvas.height / 2 + 16);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
