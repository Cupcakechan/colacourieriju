// player.js — the Iju courier: position, 8-dir movement, solid collision, animation, sprites.
// Asset-test scope: idle / walk / jump + facing + tile AND per-object collision.
// Fizz/cargo come in the jam window.

import { CONFIG } from "./config.js";

export function createPlayer(startX, startY) {
  const S = CONFIG.SPRITE;

  // Load every Anim_Dir sheet; frame count auto-detected from sheet width on load.
  const sheets = {};
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
    const deg = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    const i = Math.round(deg / 45) % 8;
    return ["E", "SE", "S", "SW", "W", "NW", "N", "NE"][i];
  }

  // would the Iju be blocked if the frame's top-left were at (px, py)? objects is
  // optional so the player still runs without it.
  function blocked(px, py, map, objects) {
    const c = CONFIG.PLAYER_COLLIDER, tile = map.tile;
    const left = px + c.offX, top = py + c.offY;
    const right = left + c.w - 1, bottom = top + c.h - 1;
    // Tiles (walls/hedges): the BODY box stops at a wall. Its bottom edge (offY+h)
    // sets how close the Iju can tuck against the bottom hedge — see config.
    for (let ty = Math.floor(top / tile); ty <= Math.floor(bottom / tile); ty++) {
      for (let tx = Math.floor(left / tile); tx <= Math.floor(right / tile); tx++) {
        if (map.isSolid(tx, ty)) return true;
      }
    }
    // Objects (ground props): only the FEET catch a small base footprint, so the Iju
    // can brush past a rock with its head/torso overlapping it (correct top-down depth).
    if (objects) {
      const f = CONFIG.PLAYER_FOOT;
      if (objects.blocks(px + f.offX, py + f.offY, f.w, f.h)) return true;
    }
    return false;
  }

  function update(dt, input, map, objects) {
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

    // Move one axis at a time and reject a blocked axis — this lets the Iju slide
    // along a wall/obstacle instead of sticking when pushing into it diagonally.
    const moveX = vx * CONFIG.PLAYER_SPEED * dt;
    const moveY = vy * CONFIG.PLAYER_SPEED * dt;
    if (moveX !== 0 && !blocked(p.x + moveX, p.y, map, objects)) p.x += moveX;
    if (moveY !== 0 && !blocked(p.x, p.y + moveY, map, objects)) p.y += moveY;

    // keep the collider inside the map edges
    const c = CONFIG.PLAYER_COLLIDER, b = map.bounds;
    p.x = Math.max(b.minX - c.offX, Math.min(p.x, b.maxX - c.offX - c.w));
    p.y = Math.max(b.minY - c.offY, Math.min(p.y, b.maxY - c.offY - c.h));

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
      ctx.fillStyle = "#c0463a";
      ctx.fillRect(sx + 15, sy + 22, 34, 38);
      ctx.fillStyle = "#fff"; ctx.font = "10px monospace"; ctx.textAlign = "center";
      ctx.fillText(p.dir, sx + 32, sy + 44);
    }
    if (CONFIG.OBJECTS && CONFIG.OBJECTS.debugFootprints) {
      // yellow = body box (walls/hedges), cyan = feet box (objects/rocks)
      const c = CONFIG.PLAYER_COLLIDER, f = CONFIG.PLAYER_FOOT;
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(240,210,60,0.8)";
      ctx.strokeRect(Math.floor(p.x + c.offX - camX) + 0.5, Math.floor(p.y + c.offY - camY) + 0.5, c.w - 1, c.h - 1);
      ctx.strokeStyle = "rgba(80,180,255,0.9)";
      ctx.strokeRect(Math.floor(p.x + f.offX - camX) + 0.5, Math.floor(p.y + f.offY - camY) + 0.5, f.w - 1, f.h - 1);
    }
  }

  return { state: p, update, draw, sheets };
}
