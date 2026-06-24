// config.js — every tunable in one place, so balancing is a one-value change.
// Gameplay values match GDD §11. MAP/SPRITE/OBJECTS/NPCS/PICKUP/DOORS drive the asset-test harness.

export const CONFIG = {
  // --- Resolution & grid ---
  INTERNAL_W: 960,
  INTERNAL_H: 540,
  TILE: 32, // fallback tile size; the real value is read from each map's json

  // --- Town map: a Sprite Fusion export (map.json + its own packed spritesheet) ---
  // Drop the export's two files into assets/maps/, replacing these. (Town's stone paths were
  // removed from the tileset — they get placed as walkable ground-decal objects via the editor.)
  MAP: {
    json: "assets/maps/map.json",
    tilesheet: "assets/maps/spritesheet.png",
  },

  // --- Player ---
  PLAYER_SPEED: 140, // px/s
  PLAYER_WALL: { top: 30, bottom: 14, left: 24, right: 24 }, // wall-collider insets in the 64×64 frame
  PLAYER_FOOT: { w: 34, h: 12, offX: 15, offY: 48 },         // feet box (vs object footprints) + y-sort anchor

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
  // types: the registry — art + footprint per object kind (SHARED across all scenes).
  //   w,h     = sprite draw size (MUST equal the PNG's native size, or it draws blurry)
  //   anchorY = sprite-local y where the object meets the ground (its "feet")
  //   fpW,fpH = the SOLID contact band; centered on the sprite, resting on anchorY
  // placements: the TOWN's objects — x,y is the world TOP-LEFT of each sprite.
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
      yokaisoda:     { sprite: "assets/sprites/yokaihouse.png",     w: 256, h: 256, anchorY: 235, fpW: 290, fpH: 35 },

      // Large building (384×256): base spans most of the width — GDD large ≈ 290.
      // Small props (40×40): base band near bottom-center. STARTING values — verify with [B].
      stonelantern: { sprite: "assets/sprites/stonelantern.png", w: 40, h: 40, anchorY: 36, fpW: 24, fpH: 10 },
      mossyrock:    { sprite: "assets/sprites/mossyrock.png",    w: 40, h: 40, anchorY: 36, fpW: 24, fpH: 10 },
    },
    placements: [
      { type: "temple", x: 939, y: 343 },
      { type: "teahouse", x: 685, y: 343 },
      { type: "mossyrock", x: 1260, y: 800 },
      { type: "yokaisoda", x: 1276, y: 603 },
      { type: "stonelantern", x: 1207, y: 546 },
    ],
  },

  // --- NPCs: wandering villagers (built on the shared animator) -------------
  NPCS: {
    path: "assets/sprites/",
    frameW: 48, frameH: 48,
    dirs: ["N", "E", "S", "W"],
    mirror: { W: "E" },
    anims: { Idle: { fps: 6, loop: true }, Walk: { fps: 8, loop: true } },
    variants: ["villagerA", "villagerB", "villagerC"],
    placeholderColors: { villagerA: "#c8a06a", villagerB: "#6a9ec8", villagerC: "#7ac88a" },
    speed: 45,
    foot: { w: 24, h: 10, offX: 12, offY: 38 },
    idleTime: [0.8, 2.5],
    walkTime: [0.6, 2.0],
    spawns: [
      { x: 1170, y: 536 },
      { x: 760, y: 560 },
      { x: 1010, y: 700 },
    ],
  },

  // --- Iju one-shot FX: burst / celebrate (1-direction S, play-once) --------
  IJU_FX: {
    path: "assets/sprites/",
    prefix: "",
    frameW: 64, frameH: 64,
    dirs: ["S"],
    anims: { Burst: { fps: 14, loop: false }, Celebrate: { fps: 12, loop: false } },
    placeholder: { color: "#d83a2e" },
    placeholderSeconds: 0.8,
  },

  // --- Pickup scene (the depot start) ---------------------------------------
  // Real depot export (24×16 walled room). Files must be named distinctly from the town's
  // (the town uses map.json / spritesheet.png) — put the depot at assets/maps/depot.json and
  // assets/maps/depot.png. If those are missing, scene-pickup falls back to the placeholder room.
  PICKUP: {
    json: "assets/maps/depot.json",
    tilesheet: "assets/maps/depot.png",
    map: { cols: 24, rows: 16, tile: 32, label: "DEPOT (placeholder)" }, // fallback room (matches export dims)
    placements: [], // lay out the depot interior with the editor, then [X] export into this list
  },

  // --- Doors: per-scene transition zones -------------------------------------
  // Each: { rect (world px), to (target scene), spawn (a point in the TARGET scene,
  // frame TOP-LEFT), label }. Walking the Iju's foot box into rect triggers the swap.
  // Depot is a walled 24×16 room (interior ≈ x32–736, y32–480). Placeholders — nudge to suit;
  // the depot door becomes the building's entrance once we do the object-anchored teleporter.
  DOORS: {
    pickup: [
      { rect: { x: 320, y: 416, w: 128, h: 48 }, to: "town", spawn: { x: 470, y: 470 }, label: "to town" },
    ],
    town: [
      { rect: { x: 470, y: 600, w: 70, h: 56 }, to: "pickup", spawn: { x: 336, y: 224 }, label: "to depot" },
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