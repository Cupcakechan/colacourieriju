// player.js — the Iju courier: position, 8-dir movement, animation state, sprite loading.
// Asset-test scope: idle / walk / jump + facing. Cargo/fizz logic comes in the jam window.

import { CONFIG } from "./config.js";

export function createPlayer(startX, startY) {
  const S = CONFIG.SPRITE;

  // Load every Anim_Dir sheet. frames are auto-detected from sheet width on load,
  // so 8- and 10-frame sheets both work with no per-file config.
  const sheets = {}; // key `Anim_Dir` -> { img, frames, ready, failed }
  for (const anim of S.anims) {
    for (const dir of S.dirs) {
      const key = `${anim}_${dir}`;
      const img = new Image();
      const rec = { img, frames: 1, ready: false, failed: false };
      img.onload = () => { rec.frames = Math.max(1, Math.round(img.width / S.frameW)); rec.ready = true; };
      img.onerror = () => { rec.failed = true; }; // missing sheet -> placeholder (graceful)
      img.src = `${S.path}${key}.png`;
      sheets[key] = rec;
    }
  }

  const p = { x: startX, y: startY, dir: "S", anim: "Idle", frame: 0, animTime: 0, jumpTimer: 0 };

  const fpsFor = (a) => (a === "Walk" ? S.walkFps : a === "Jump" ? S.jumpFps : S.idleFps);

  // screen coords (y down) -> nearest of 8 compass directions
  function dirFromVector(x, y) {
    const deg = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; // 0=E, 90=S, 180=W, 270=N
    const i = Math.round(deg / 45) % 8;
    return ["E", "SE", "S", "SW", "W", "NW", "N", "NE"][i];
  }

  function update(dt, input, bounds) {
    const ax = input.axis();
    const moving = ax.x !== 0 || ax.y !== 0;

    let vx = ax.x, vy = ax.y;
    if (moving) {
      const m = Math.hypot(vx, vy); // normalize so diagonals aren't faster
      vx /= m; vy /= m;
      p.dir = dirFromVector(ax.x, ax.y);
    }

    if (input.consumePressed("Space") && p.jumpTimer <= 0) p.jumpTimer = CONFIG.JUMP_DURATION;
    if (p.jumpTimer > 0) p.jumpTimer -= dt;

    // move, then clamp the collider inside the walkable bounds (grass interior)
    p.x += vx * CONFIG.PLAYER_SPEED * dt;
    p.y += vy * CONFIG.PLAYER_SPEED * dt;
    const c = CONFIG.PLAYER_COLLIDER;
    p.x = Math.max(bounds.minX - c.offX, Math.min(p.x, bounds.maxX - c.offX - c.w));
    p.y = Math.max(bounds.minY - c.offY, Math.min(p.y, bounds.maxY - c.offY - c.h));

    // animation state machine: jump overrides, else walk while moving, else idle
    const nextAnim = p.jumpTimer > 0 ? "Jump" : moving ? "Walk" : "Idle";
    if (nextAnim !== p.anim) { p.anim = nextAnim; p.frame = 0; p.animTime = 0; }

    const sheet = sheets[`${p.anim}_${p.dir}`];
    const nFrames = sheet && sheet.ready ? sheet.frames : 1;
    const frameDur = 1 / fpsFor(p.anim);
    p.animTime += dt;
    while (p.animTime >= frameDur) { p.animTime -= frameDur; p.frame = (p.frame + 1) % nFrames; }
  }

  function draw(ctx, camX, camY) {
    const sheet = sheets[`${p.anim}_${p.dir}`];
    const sx = Math.floor(p.x - camX), sy = Math.floor(p.y - camY);
    if (sheet && sheet.ready) {
      const fi = p.frame % sheet.frames; // guard if dir changed to a shorter sheet
      ctx.drawImage(sheet.img, fi * S.frameW, 0, S.frameW, S.frameH, sx, sy, S.frameW, S.frameH);
    } else {
      // placeholder so a missing/not-yet-added sheet is visible, not blank
      ctx.fillStyle = "#c0463a";
      ctx.fillRect(sx + 15, sy + 22, 34, 38);
      ctx.fillStyle = "#fff"; ctx.font = "10px monospace"; ctx.textAlign = "center";
      ctx.fillText(p.dir, sx + 32, sy + 44);
    }
  }

  return { state: p, update, draw, sheets };
}
