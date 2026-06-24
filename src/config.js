// config.js — every tunable in one place, so balancing is a one-value change.
// Gameplay values match GDD §11. MAP/SPRITE/OBJECTS/NPCS sections drive the asset-test harness.

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

  // --- World objects (props, buildings) -------------------------------------
  // types: the registry — art + footprint per object kind.
  //   w,h     = sprite draw size (MUST equal the PNG's native size, or it draws blurry)
  //   anchorY = sprite-local y where the object meets the ground (its "feet")
  //   fpW,fpH = the SOLID contact band; centered on the sprite, resting on anchorY
  // placements: where each object sits — x,y is the world TOP-LEFT of its sprite.
  //   Open the editor with [E] to place visually, then [X] to export this block.
  // debugFootprints: yellow = wall box, cyan = the Iju's foot box, red = object base, magenta = NPC foot.
  OBJECTS: {
    debugFootprints: true,
    types: {
      // Buildings (256×256): roof overhang non-solid; base band ≈ 190 wide on the 235 line.
      temple:     { sprite: "assets/sprites/temple.png",     w: 256, h: 256, anchorY: 235, fpW: 190, fpH: 35 },
      teahouse:   { sprite: "assets/sprites/teahouse.png",   w: 256, h: 256, anchorY: 235, fpW: 190, fpH: 35 },
      disheveled: { sprite: "assets/sprites/disheveled.png", w: 256, h: 256, anchorY: 235, fpW: 190, fpH: 35 },
      house1:     { sprite: "assets/sprites/house1.png",     w: 256, h: 256, anchorY: 235, fpW: 190, fpH: 35 },
      yokaihouse: { sprite: "assets/sprites/yokaihouse.png", w: 256, h: 256, anchorY: 235, fpW: 190, fpH: 35 },
      // Large building (384×256): base spans most of the width — GDD large ≈ 290.
      sodahq:     { sprite: "assets/sprites/sodahq.png",     w: 384, h: 256, anchorY: 235, fpW: 290, fpH: 35 },
      // Small props (40×40): base band near bottom-center. STARTING values — verify with [B].
      stonelantern: { sprite: "assets/sprites/stonelantern.png", w: 40, h: 40, anchorY: 36, fpW: 24, fpH: 10 },
      mossyrock:    { sprite: "assets/sprites/mossyrock.png",    w: 40, h: 40, anchorY: 36, fpW: 24, fpH: 10 },
    },
    placements: [
      { type: "temple", x: 939, y: 343 },
      { type: "teahouse", x: 685, y: 343 },
      { type: "mossyrock", x: 1260, y: 800 },
      { type: "sodahq", x: 314, y: 344 },
      { type: "yokaihouse", x: 1276, y: 603 },
      { type: "stonelantern", x: 1207, y: 546 },
    ],
  },

  // --- NPCs: wandering villagers (built on the shared animator) -------------
  // Placeholder-first: until {variant}_{Anim}_{Dir}.png sheets exist, villagers render as
  // labeled colored boxes that still wander. Sheets are 4-dir N/E/S/W with W MIRRORED from E,
  // so you author 3 sheets per anim (N/E/S). Frame count auto-detected from sheet width.
  NPCS: {
    path: "assets/sprites/",
    frameW: 48, frameH: 48,
    dirs: ["N", "E", "S", "W"],
    mirror: { W: "E" },          // draw W as E flipped — no W sheet to author
    anims: { Idle: { fps: 6, loop: true }, Walk: { fps: 8, loop: true } },
    variants: ["villagerA", "villagerB", "villagerC"], // each villager picks one at random
    placeholderColors: { villagerA: "#c8a06a", villagerB: "#6a9ec8", villagerC: "#7ac88a" },
    speed: 45,                   // px/s — an unhurried stroll (the Iju walks at 140)
    foot: { w: 24, h: 10, offX: 12, offY: 38 }, // collision foot box within the 48×48 frame
    idleTime: [0.8, 2.5],        // random idle beat (s)
    walkTime: [0.6, 2.0],        // random walk beat (s)
    spawns: [                    // start points; villagers wander from here — move to open ground
      { x: 1170, y: 536 },       // (the old Villager3 spot)
      { x: 760, y: 560 },
      { x: 1010, y: 700 },
    ],
  },

  // --- Iju one-shot FX: burst / celebrate (1-direction S, play-once) --------
  // Triggered by [1]/[2] in the harness to verify playback. Placeholder flashes for
  // placeholderSeconds until Burst_S.png / Celebrate_S.png exist, then real frames play.
  IJU_FX: {
    path: "assets/sprites/",
    prefix: "",                  // files are just Burst_S.png / Celebrate_S.png
    frameW: 64, frameH: 64,
    dirs: ["S"],
    anims: { Burst: { fps: 14, loop: false }, Celebrate: { fps: 12, loop: false } },
    placeholder: { color: "#d83a2e" }, // label falls back to the anim name (Burst / Celebrate)
    placeholderSeconds: 0.8,
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
