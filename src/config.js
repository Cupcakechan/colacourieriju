// config.js — every tunable in one place, so balancing is a one-value change.
// Gameplay values match GDD §11. MAP/SPRITE/OBJECTS/NPCS/YOKAI/PICKUP/DOORS drive the asset-test harness.

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

  // --- World objects (props, buildings, ground decals) ----------------------
  // types: the registry — art + footprint per object kind (SHARED across all scenes).
  //   w,h       = sprite draw size (MUST equal the PNG's native size, or it draws blurry)
  //   anchorY   = sprite-local y where the object meets the ground (its "feet")
  //   fpW,fpH   = the SOLID contact band; centered on the sprite, resting on anchorY
  //   solid     = (optional) false → no collision, still y-sorted (a walk-BEHIND prop)
  //   ground    = (optional) true  → a flat decal: drawn UNDER every entity + never collides
  //               (stone paths / stains). No anchorY/fpW/fpH needed.
  //   entrance  = (optional) {offX,offY,w,h} a doorway rect (sprite-local) in the WALKABLE strip
  //               in front of the base; with a placement `door` field it becomes a live teleporter.
  // placements: the TOWN's objects — x,y is the world TOP-LEFT of each sprite.
  //   door      = (optional) {to,spawn,label?} on a placement → an OBJECT-ANCHORED teleporter that
  //               rides this building (rect = its position + the type's `entrance`). spawn is a
  //               point in the TARGET scene (frame TOP-LEFT).
  //   Open the editor with [E] to place visually, then [X] to export this block (door fields kept).
  // debugFootprints: yellow = wall box, cyan = the Iju's foot box, red = object base / door zones,
  //   magenta = NPC foot.
  OBJECTS: {
    debugFootprints: true,
    types: {
      // Buildings (256×256): roof overhang non-solid; base band ≈ 190 wide on the 235 line.
      temple:     { sprite: "assets/sprites/temple.png",     w: 256, h: 256, anchorY: 235, fpW: 190, fpH: 35 },
      teahouse:   { sprite: "assets/sprites/teahouse.png",   w: 256, h: 256, anchorY: 235, fpW: 190, fpH: 35 },
      disheveled: { sprite: "assets/sprites/disheveled.png", w: 256, h: 256, anchorY: 235, fpW: 190, fpH: 35 },
      house1:     { sprite: "assets/sprites/house1.png",     w: 256, h: 256, anchorY: 235, fpW: 190, fpH: 35 },
      // Cola shop / depot (384×256). entrance = the doorway zone in the walkable strip below the
      // base; paired with the placement's `door` field it teleports to the depot. Tune with [B].
      yokaihouse: { sprite: "assets/sprites/yokaihouse.png", w: 384, h: 256, anchorY: 255, fpW: 190, fpH: 35,
                    entrance: { offX: 140, offY: 255, w: 104, h: 44 } },
      // Small props (40×40): base band near bottom-center. STARTING values — verify with [B].
      stonelantern: { sprite: "assets/sprites/stonelantern.png", w: 40, h: 40, anchorY: 36, fpW: 24, fpH: 10 },
      mossyrock:    { sprite: "assets/sprites/mossyrock.png",    w: 40, h: 40, anchorY: 36, fpW: 24, fpH: 10 },
      crates:    { sprite: "assets/sprites/crates.png",    w: 40, h: 40, anchorY: 36, fpW: 24, fpH: 10 },
      colacrate:    { sprite: "assets/sprites/colacrate.png",    w: 40, h: 40, anchorY: 36, fpW: 24, fpH: 10 },

      // Ground decal: walkable + drawn under everything. Place paths freely with the editor.
      stonepath:    { sprite: "assets/sprites/stonepath.png",    w: 32, h: 32, ground: true },
    },
    placements: [
      { type: "temple", x: 939, y: 343 },
      { type: "teahouse", x: 685, y: 343 },
      { type: "mossyrock", x: 1260, y: 800 },
      // The cola shop is the depot teleporter: walking into its entrance → the pickup scene.
      // The trigger rides this building, so move it freely during layout — no door coord to sync.
      { type: "yokaihouse", x: 19, y: 21, door: { to: "pickup", spawn: { x: 336, y: 224 } } },
      { type: "stonelantern", x: 1207, y: 546 },
    ],
  },

  // --- NPCs: wandering villagers (built on the shared animator) -------------
  // Lives in the TOWN. Read by scene-town via createNpcs(CONFIG.NPCS, { map, objects }).
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

  // --- Yokai NPCs: ambient spirits living in the depot/pickup starting area --
  // A SEPARATE group from the town villagers, but structurally identical (same 48×48 frames,
  // 4-dir, W←E mirror, Idle/Walk) so it runs on the very same npcs.js + animator.js — only the
  // data differs. Read by scene-pickup via createNpcs(CONFIG.YOKAI, { map, objects }).
  //   spawns  = DEPOT-INTERIOR coords. The depot room is ≈768×512 (interior ≈ x32–736 / y32–480,
  //             smaller than the 960×540 view, so the camera centers it). These are STARTING
  //             values — tune freely; wandering uses foot-box collision, so a slightly-off spawn
  //             just idles and re-routes rather than getting stuck.
  //   sheets  = swap in later by filename (zero code change): assets/sprites/YokaiA_Idle_{Dir}.png
  //             + YokaiA_Walk_{Dir}.png. Until then each renders as the violet placeholder box.
  YOKAI: {
    path: "assets/sprites/",
    frameW: 48, frameH: 48,
    dirs: ["N", "E", "S", "W"],
    mirror: { W: "E" },
    anims: { Idle: { fps: 6, loop: true }, Walk: { fps: 8, loop: true } },
    variants: ["YokaiA"],
    placeholderColors: { YokaiA: "#9a6ac8" }, // violet — clear of the 3 villager tints + the magenta debug box
    speed: 45,
    foot: { w: 24, h: 10, offX: 12, offY: 38 },
    idleTime: [0.8, 2.5],
    walkTime: [0.6, 2.0],
    spawns: [
      { x: 200, y: 180 },
      { x: 520, y: 200 },
      { x: 360, y: 320 },
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
  // STATIC doors live here; OBJECT-ANCHORED doors come from a placement's `door` field (above).
  // Each static door: { rect (world px), to, spawn (TARGET-scene frame TOP-LEFT), label }.
  // Depot is a walled 24×16 room (interior ≈ x32–736, y32–480).
  //   pickup → town: static gate at the bottom-center of the depot room.
  //   town → pickup: now provided by the cola shop's object-anchored entrance, so this is empty.
  // NOTE: the pickup→town `spawn` (where you land in town) is a fixed point for now (Option 2).
  //   Once the cola shop's final spot is locked, set it to the shop's front — or we add the
  //   symmetric auto-return (land in front of the shop) as a small follow-up.
  DOORS: {
    pickup: [
      { rect: { x: 320, y: 416, w: 128, h: 48 }, to: "town", spawn: { x: 470, y: 470 }, label: "to town" },
    ],
    town: [],
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
