// config.js — every tunable in one place, so balancing is a one-value change.
// Gameplay values match GDD §11. MAP/SPRITE/OBJECTS sections drive the asset-test harness.

export const CONFIG = {
  // --- Resolution & grid ---
  INTERNAL_W: 960,
  INTERNAL_H: 540,
  TILE: 32, // fallback tile size; the real value is read from map.json

  // --- Map: a Sprite Fusion export (map.json + its own packed spritesheet) ---
  // For a new map, drop the export's two files into assets/maps/, replacing these.
  MAP: {
    json: "assets/maps/map.json",
    tilesheet: "assets/maps/spritesheet.png",
  },

  // --- Player ---
  PLAYER_SPEED: 140, // px/s
  // WALL collider (vs hedges/walls), given as INSETS from each edge of the 64×64 frame.
  // Each side is an INDEPENDENT dial — changing one never moves the others. A BIGGER inset
  // pulls that edge inward, letting the Iju tuck closer to the hedge on that side. (Hedge
  // art sits inset within its tiles, so a few px of inset here closes the gap.)
  // Derived box: x = [left .. 64-right], y = [top .. 64-bottom].
  PLAYER_WALL: { top: 30, bottom: 14, left: 24, right: 24 },
  // Feet-only box (vs object footprints like rocks) and the y-sort anchor, in frame coords.
  PLAYER_FOOT: { w: 34, h: 12, offX: 15, offY: 48 },

  // --- Fizz / grading / streak / session — wired in during the jam window ---
  FIZZ_MAX: 100,
  FIZZ_RISE_MOVING: 12,
  FIZZ_SETTLE_STOPPED: 18,
  FIZZ_BUMP: 8,
  FIZZ_JUMP: 6,
  GRADE: { perfect: 20, good: 50, shaken: 85 },
  POINTS: { perfect: 100, good: 60, shaken: 25, burst: 0 },
  STREAK: { t1: 3, t2: 6, mult1: 1.5, mult2: 2.0 },
  SHIFT_SECONDS: 120,
  JUMP_DURATION: 0.4,

  // --- Sprite sheets (assets/sprites/ named Anim_Dir.png; frames auto-detected) ---
  SPRITE: {
    frameW: 64,
    frameH: 64,
    anims: ["Idle", "Walk", "Jump"],
    dirs: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"],
    path: "assets/sprites/",
    idleFps: 8,
    walkFps: 12,
    jumpFps: 14,
  },

  // --- World objects (rocks, props; later houses/shrines) -------------------
  // types: the registry — art + footprint per object kind.
  //   w,h     = sprite draw size (usually the PNG's native size)
  //   anchorY = sprite-local y where the object meets the ground (its "feet")
  //   fpW,fpH = the SOLID contact band; centered on the sprite, resting on anchorY
  // placements: where each object sits — x,y is the world TOP-LEFT of its sprite.
  //   Click anywhere in the harness to print a ready-to-paste coord to the console.
  // debugFootprints: yellow = wall box, cyan = the Iju's foot box, red = object base.
  OBJECTS: {
    debugFootprints: true,
    types: {
      // Rock.png is 32×32; its pixels sit at x5–27, y3–24, so the base is ~20 wide
      // ending near y24. A 20×8 band there collides with the rock and nothing else.
      rock: { sprite: "assets/sprites/Rock.png", w: 32, h: 32, anchorY: 24, fpW: 20, fpH: 8 },
    },
    placements: [
      { type: "rock", x: 470, y: 300 },
      { type: "rock", x: 780, y: 320 },
      { type: "rock", x: 560, y: 500 },
      { type: "rock", x: 840, y: 470 },
    ],
  },

  // --- Colors ---
  COLORS: {
    bg: "#11131a",
    text: "#e8e8ec",
    accent: "#d83a2e",
    fizzLow: "#3ad36b",
    fizzHigh: "#d83a2e",
  },
};
