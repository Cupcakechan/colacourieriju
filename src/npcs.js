// npcs.js — wandering villagers (the moving-NPC test bed). Each villager picks a random
// variant and runs a simple wander loop — idle a random beat, then walk a random direction
// for a random beat — moving with foot-box collision against tiles + object footprints
// (the Iju's approach), and y-sorting with everyone else. The bump→fizz reaction is
// deliberately NOT here; that's jam-window gameplay.
//
// Placeholder-first: until {variant}_{Anim}_{Dir}.png sheets exist, each villager renders as
// a labeled colored box that still WANDERS — so movement, collision, and depth are proven
// now, and real sheets swap in by filename later with zero code change.

import { CONFIG } from "./config.js";
import { createAnimator } from "./animator.js";

const DIR_VEC = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
const rand = (a, b) => a + Math.random() * (b - a);

export function createNpcs({ map, objects }) {
  const C = CONFIG.NPCS;
  const variants = C.variants || [];

  // one animator per villager (the sheet pixels themselves are cached by URL in animator.js)
  function makeAnimator(variant, i) {
    return createAnimator({
      path: C.path, prefix: `${variant}_`,
      frameW: C.frameW, frameH: C.frameH,
      dirs: C.dirs, mirror: C.mirror, anims: C.anims,
      placeholder: {
        color: (C.placeholderColors && C.placeholderColors[variant]) || "#9aa",
        label: String.fromCharCode(65 + (i % 26)), // A, B, C…
      },
    });
  }

  const npcs = (C.spawns || []).map((sp) => {
    const vi = variants.length ? Math.floor(Math.random() * variants.length) : 0;
    const variant = variants[vi] || "villager";
    return {
      x: sp.x, y: sp.y, dir: "S", mode: "idle",
      timer: rand(C.idleTime[0], C.idleTime[1]),
      anim: makeAnimator(variant, vi),
    };
  });

  // foot box of a villager whose frame top-left is (px,py): blocked by a solid tile or an
  // object footprint? (Villagers don't block each other or the Iju — kept simple for the test.)
  function blocked(px, py) {
    const f = C.foot;
    const left = px + f.offX, top = py + f.offY;
    const right = left + f.w - 1, bottom = top + f.h - 1;
    const tile = map.tile;
    for (let ty = Math.floor(top / tile); ty <= Math.floor(bottom / tile); ty++)
      for (let tx = Math.floor(left / tile); tx <= Math.floor(right / tile); tx++)
        if (map.isSolid(tx, ty)) return true;
    return objects.blocks(left, top, f.w, f.h);
  }

  const items = []; // y-sortable drawables, rebuilt each frame (villagers move)

  function update(dt) {
    const f = C.foot, b = map.bounds;
    items.length = 0;
    for (const n of npcs) {
      n.timer -= dt;
      if (n.timer <= 0) {
        if (n.mode === "idle") {
          n.mode = "walk";
          n.dir = C.dirs[Math.floor(Math.random() * C.dirs.length)];
          n.timer = rand(C.walkTime[0], C.walkTime[1]);
        } else {
          n.mode = "idle";
          n.timer = rand(C.idleTime[0], C.idleTime[1]);
        }
      }

      if (n.mode === "walk") {
        const [vx, vy] = DIR_VEC[n.dir];
        const mx = vx * C.speed * dt, my = vy * C.speed * dt;
        // axis-separated so a villager slides along a wall instead of sticking; if its one
        // axis is fully blocked it gives up and idles, then later picks a fresh direction.
        let moved = false;
        if (mx !== 0 && !blocked(n.x + mx, n.y)) { n.x += mx; moved = true; }
        if (my !== 0 && !blocked(n.x, n.y + my)) { n.y += my; moved = true; }
        if (!moved) { n.mode = "idle"; n.timer = rand(C.idleTime[0], C.idleTime[1]); }
        // keep the foot box inside the map
        n.x = Math.max(b.minX - f.offX, Math.min(n.x, b.maxX - f.offX - f.w));
        n.y = Math.max(b.minY - f.offY, Math.min(n.y, b.maxY - f.offY - f.h));
      }

      n.anim.setState(n.mode === "walk" ? "Walk" : "Idle", n.dir);
      n.anim.update(dt);

      const sortY = n.y + f.offY + f.h; // feet decide draw order
      items.push({
        sortY,
        draw(ctx, camX, camY) {
          n.anim.draw(ctx, Math.floor(n.x - camX), Math.floor(n.y - camY));
          if (CONFIG.OBJECTS.debugFootprints) { // magenta = NPC foot box (tune C.foot to art)
            ctx.strokeStyle = "rgba(220,80,220,0.9)";
            ctx.lineWidth = 1;
            ctx.strokeRect(
              Math.floor(n.x + f.offX - camX) + 0.5,
              Math.floor(n.y + f.offY - camY) + 0.5,
              f.w - 1, f.h - 1
            );
          }
        },
      });
    }
  }

  return { items, update, get count() { return npcs.length; } };
}
