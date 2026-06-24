// animator.js — reusable sprite-sheet animator. Generalizes the Iju's sheet logic so NPCs
// and the Iju's burst/celebrate one-shots share one implementation:
//   - frame count auto-detected from sheet width (width / frameW)
//   - per-anim fps + loop | one-shot
//   - optional direction mirroring (e.g. W drawn from E, flipped) so you author fewer sheets
//   - missing sheet -> labeled placeholder box (never a crash); one-shot placeholders still
//     hold for a visible beat so the TRIGGER can be tested before the art exists
//
// The Iju's own movement animation stays in player.js (it works; not worth the churn).
// This module is what the NEW animated content runs on.

import { CONFIG } from "./config.js";

// Shared across all animators: one Image per URL, frames detected once. Two NPCs of the
// same variant reference the same record (own playback state, shared pixels + metadata).
const sheetCache = {};
function loadSheet(url, frameW) {
  let rec = sheetCache[url];
  if (!rec) {
    const img = new Image();
    rec = { img, frames: 1, ready: false, failed: false };
    img.onload = () => { rec.frames = Math.max(1, Math.round(img.width / frameW)); rec.ready = true; };
    img.onerror = () => { rec.failed = true; }; // missing sheet -> placeholder
    img.src = url;
    sheetCache[url] = rec;
  }
  return rec;
}

// spec: { path, prefix?, frameW, frameH, dirs, mirror?, anims:{name:{fps,loop}}, placeholder?, placeholderSeconds? }
export function createAnimator(spec) {
  const { path, prefix = "", frameW, frameH, dirs, anims } = spec;
  const mirror = spec.mirror || {};
  const placeholder = spec.placeholder || {};
  const placeholderSeconds = spec.placeholderSeconds != null ? spec.placeholderSeconds : 0.8;

  // load every anim × dir that ISN'T a mirror of another dir
  const sheets = {}; // "Anim_Dir" -> sheet record
  for (const animName of Object.keys(anims)) {
    for (const dir of dirs) {
      if (mirror[dir]) continue; // drawn from another dir, no sheet of its own
      sheets[`${animName}_${dir}`] = loadSheet(`${path}${prefix}${animName}_${dir}.png`, frameW);
    }
  }

  // per-instance playback state
  let anim = Object.keys(anims)[0], dir = dirs[0], frame = 0, animTime = 0, done = false;

  // which sheet (and whether to flip) renders this anim+dir
  function resolve(an, dr) {
    if (mirror[dr]) return { sheet: sheets[`${an}_${mirror[dr]}`], flip: true };
    return { sheet: sheets[`${an}_${dr}`], flip: false };
  }

  // continuous use (NPCs): only reset the frame when the ANIM changes (smooth turning)
  function setState(an, dr) {
    if (an !== anim) { anim = an; frame = 0; animTime = 0; done = false; }
    dir = dr;
  }
  // one-shot trigger (Iju FX): always restart from frame 0
  function play(an, dr) {
    anim = an; dir = dr || dir; frame = 0; animTime = 0; done = false;
  }

  function update(dt) {
    const a = anims[anim];
    const { sheet } = resolve(anim, dir);
    const ready = sheet && sheet.ready;
    if (a.loop) {
      const n = ready ? sheet.frames : 1;
      const frameDur = 1 / a.fps;
      animTime += dt;
      while (animTime >= frameDur) { animTime -= frameDur; frame = (frame + 1) % n; }
    } else if (ready) { // one-shot with real art: advance, finish on the last frame
      const frameDur = 1 / a.fps;
      animTime += dt;
      while (animTime >= frameDur) {
        animTime -= frameDur;
        if (frame < sheet.frames - 1) frame++; else done = true;
      }
    } else { // one-shot placeholder: hold a visible beat, then finish (proves the trigger)
      animTime += dt;
      if (animTime >= placeholderSeconds) done = true;
    }
  }

  function draw(ctx, sx, sy) {
    const { sheet, flip } = resolve(anim, dir);
    if (sheet && sheet.ready) {
      const fi = frame % sheet.frames;
      if (flip) { // mirror horizontally about the sprite's own box
        ctx.save();
        ctx.translate(sx + frameW, sy);
        ctx.scale(-1, 1);
        ctx.drawImage(sheet.img, fi * frameW, 0, frameW, frameH, 0, 0, frameW, frameH);
        ctx.restore();
      } else {
        ctx.drawImage(sheet.img, fi * frameW, 0, frameW, frameH, sx, sy, frameW, frameH);
      }
    } else {
      // labeled placeholder: solid box + label so each variant / FX is distinguishable
      ctx.fillStyle = placeholder.color || "#7a7f8a";
      ctx.fillRect(sx, sy, frameW, frameH);
      ctx.fillStyle = "#0b0d12";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(placeholder.label != null ? placeholder.label : anim, sx + frameW / 2, sy + frameH / 2);
      ctx.fillText(dir, sx + frameW / 2, sy + frameH / 2 + 11);
    }
  }

  return {
    setState, play, update, draw,
    isDone: () => done,
    get anim() { return anim; },
    get dir() { return dir; },
    get frame() { return frame; },
  };
}
