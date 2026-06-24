# Cola Courier: Iju — Project Handoff

> **Purpose:** a session-state snapshot to resume cleanly. The **GDD** (`Cola_Courier_Iju_GDD.md`) is the design source of truth; this doc is *where the build actually stands and what's next*.
> **Updated:** 2026-06-24 · Pre-jam prep — framework passes done; level-building + Yokai NPC category next.
> **Repo:** https://github.com/Cupcakechan/colacourieriju.git

---

## TL;DR
The **asset-test harness** is now a multi-scene framework. Two scenes (town + depot) each load their own Sprite Fusion map and tileset; the 8-direction Iju walks over them with tile + per-object collision and y-sorted depth; props/buildings/ground-decals drop in through a data registry and an in-harness placement editor; wandering NPCs and the Iju's burst/celebrate FX run on a shared animator; a HUD renderer draws fizz/score/grade/streak/timer/arrow from a state object; and you move between scenes through **object-anchored doors** (walking into a building's entrance teleports you). The **gameplay systems (fizz, delivery, grade, score, shift timer)** are still deliberately stubbed — that's the 72-hour jam-window work. Pre-jam = assets + framework only; gameplay assembly happens in-window.

---

## Built & working (tested, pushed)

### Core loop & rendering
- **Canvas** at 960×540, pixel-crisp (`imageSmoothingEnabled = false`), scaled to the window with letterbox. `main.js` is a thin bootstrap: sets up the canvas, builds the scene manager, registers scenes, boots one, runs the rAF loop (delegated to the manager). `BOOT_SCENE` const switches the start scene (`"pickup"` or `"town"`) for testing.
- **Camera** (`camera.js`) follows the Iju's frame and clamps to map bounds; centers maps smaller than the viewport.

### Scene system (Pass 1 + Pass 4)
- **`scene-manager.js`** — owns the *active* scene and the *single* editor, routes `update`/`draw`, and performs transitions. A scene's `update(dt, input)` may return a `{ to, spawn }` request; the manager swaps scenes, guarded by a `transitioning` flag so the request can't re-fire during the (async) load. `spawnAt` is passed to the scene factory, which positions the Iju in `load()`.
- **`scene-town.js`** — the town scene: map + tileset + objects + camera + player + NPCs + Iju FX + HUD + a door. Exposes `camera`/`objects`/`map` so the manager's editor can operate on it.
- **`scene-pickup.js`** — the depot/pickup scene: its own map + tileset + objects + a door back to town. Loads the real depot export, falling back to a code-drawn room if the files are absent.
- **`placeholder-map.js`** — a code-drawn stand-in matching the `map.js` interface (tile/cols/rows/width/height/bounds/isSolid/draw), so a scene runs before a real export exists.
- **`doors.js`** — shared door controller. Supports **static** config zones *and* **object-anchored** doors (see below). Arrival guard (`armed`) keeps a freshly-entered scene from bouncing you back out the door you spawned on.

### Maps
- **`map.js`** loads a Sprite Fusion export (`map.json` + packed `spritesheet.png`), reads tile size from JSON, and turns any layer flagged `collider: true` into solid tiles (the layer *name* is irrelevant — only the flag matters).
- **Town:** `assets/maps/map.json` + `spritesheet.png` — **65×48** tiles (≈2080×1536 px), green tileset, **stone paths removed** (placed as ground-decal objects instead). Collision is a clean **border ring** (Iju can't leave the map); interior is open.
- **Depot:** `assets/maps/depot.json` + `depot.png` — **24×16** walled room (≈768×512 px), perimeter solid, interior open (≈ x32–736, y32–480). Smaller than the viewport, so the camera centers it.

### Player — the Iju (`player.js`)
- 8-direction idle / walk / jump from `assets/sprites/{Anim}_{Dir}.png` strips; frame count auto-detected from sheet width. Free 8-dir movement, axis-separated so it slides along walls instead of sticking.
- **Two decoupled collision boxes:** a wall box from per-side **insets** (`PLAYER_WALL`, each side an independent dial) for tiles/walls, and a separate **foot box** (`PLAYER_FOOT`) for object footprints + the y-sort anchor.

### Object system (`objects.js`)
- Registry `OBJECTS.types[name] = { sprite, w, h, anchorY, fpW, fpH, solid?, ground?, entrance? }`; `placements[] = { type, x, y, door? }` (x,y = world top-left). `createObjects(placements?)` takes an optional per-scene list (town uses `OBJECTS.placements`, pickup uses `PICKUP.placements`); the type registry is shared.
- Each solid object draws 1:1 and contributes a tight **base footprint** to collision; objects + player are **y-sorted** so the Iju passes behind tall buildings.
- **`solid: false`** → no collision, still y-sorted (a walk-*behind* prop).
- **`ground: true`** → a flat **ground decal** (stone path / stain): drawn *beneath* every entity and never collides (implies non-solid). No `anchorY`/`fpW`/`fpH` needed.
- Placements list is mutable at runtime so the editor can add/move/delete and `rebuild()` regenerates draw + collision data in place.

### In-harness placement editor (`editor.js`) — DEV-ONLY, off by default
- Toggle **[E]**. Scene-aware: reads the *active* scene via `getScene()`, so one editor instance works in both town and depot with no re-wiring. Self-contained (its tunables live in the file) so it can be stripped in one step for shipping.
- Palette on the right (auto-built from the registry); click = select type, click = place, drag = move, **[Del]** = remove, **[X]** = copy the whole `placements` block to the clipboard, **[B]** = toggle the debug overlay, WASD = pan.
- **[X] export preserves a placement's `door` field** (so re-exporting during layout doesn't drop an object-anchored teleporter). anchorY-less ground decals place **centered on the cursor** (fixes an earlier `y=NaN` → invisible bug).

### Animation + NPCs + Iju FX (Pass 2)
- **`animator.js`** — reusable sprite-sheet animator: auto-frame-detect from sheet width, per-anim fps + loop|one-shot, optional direction **mirroring** (e.g. W drawn from E, flipped), a module-level image cache keyed by URL, and labeled placeholders. One-shot placeholders hold a visible beat (`placeholderSeconds`) so a trigger can be tested before the art exists.
- **`npcs.js`** — wandering villagers: each picks a random variant and runs an idle↔walk wander loop, moving with foot-box collision against tiles + object footprints, y-sorted with everyone else. Placeholder-first (a labeled colored box that still wanders). NPCs don't collide with each other or the Iju, and the bump→fizz reaction is intentionally **not** here (jam-window gameplay).
- **Iju FX** — burst / celebrate one-shots play on **[1]/[2]** in the town, drawn over the Iju (`player.js` untouched).

### UI HUD (Pass 3)
- **`ui.js`** — a **pure** renderer: `createUI().draw(ctx, state)` draws the fizz bar (green→red, trembles near max), destination arrow (edge-clamps when the target is off-screen, hovers above it when on-screen), grade popup (fades + floats), score, streak ×multiplier, and shift timer (mm:ss, blinks when low). No input, no game logic — in the jam, `delivery.js` produces `state` and hands it here, so this exact renderer ships. State contract is documented at the top of the file.
- The town drives it with a **dummy scrub** (no gameplay logic): `[`/`]` fizz, **G** grade, **M** streak, **T** pause (Shift+T reset), **O** arrow target.

### Scene transitions — object-anchored doors (this session's last pass)
- A door is **either** a static `CONFIG.DOORS[scene]` zone **or** *object-anchored*: a placement with a `door: { to, spawn }` field, whose trigger rect is built from the building's **live position** + its type's `entrance: { offX, offY, w, h }` rect. The trigger **rides the building**, so it can be dragged anywhere during layout with no hardcoded door coordinate to keep in sync.
- **Town → depot** is the cola shop's (`yokaihouse`) entrance. **Depot → town** is a static gate at the bottom-center of the depot room.

---

## Stubbed (jam-window work)
- **`delivery.js`** — pickup/dropoff zones, fizz meter, grade on delivery, score, streak, shift timer. Currently an empty factory.
- **`ui.js` is built** (the renderer), but fed by the dummy scrub; `delivery.js` will produce the real `state` and pass it to the same renderer in the jam.
- Keep both **data-driven** (cargo types / delivery list / a `modifier` hook) so the hidden Theme 2 slots in as data, not a rewrite (GDD §10).

---

## Current registry & tuning state (exact values in `config.js`)
- **Buildings (256×256):** `temple`, `teahouse`, `disheveled`, `house1` — `anchorY 235 / fpW 190 / fpH 35`.
- **Cola shop / depot (384×256):** `yokaihouse` — `anchorY 255 / fpW 190 / fpH 35`, plus `entrance: { offX: 140, offY: 255, w: 104, h: 44 }` (the doorway zone; tune with **[B]**). Replaced the earlier large `sodahq` (didn't fit the yokai vibe).
- **Small props (40×40):** `stonelantern`, `mossyrock` — `anchorY 36 / fpW 24 / fpH 10`.
- **Ground decal (32×32):** `stonepath` — `ground: true` (walkable, draws under everything). Size is flexible; a longer PNG means fewer placements.
- **Town placements (5):** `temple {939,343}`, `teahouse {685,343}`, `mossyrock {1260,800}`, `yokaihouse {19,21, door → pickup spawn {336,224}}`, `stonelantern {1207,546}`. *(Layout in progress — the yokaihouse is still at a placeholder corner spot; the door rides it, so its position is free to move.)*
- **NPCs:** villagers `villagerA/B/C`, 48×48, 4-direction (W mirrored from E), 3 spawns. Walk sheets still to author.
- **Iju FX:** `Burst` / `Celebrate`, 64×64, 1-direction (S). Sheets still to author.
- **PICKUP:** real depot files wired; `placements` empty (lay out the interior with the editor).
- **DOORS:** `pickup → town` static `{320,416,128,48}` spawn `{470,470}`; `town` is **empty** (replaced by the cola shop's object door).
- **Debug overlay is ON** (`debugFootprints: true`) — flip to `false`, and hide the door-zone markers, before shipping.

### Asset filenames (placeholder-first; real art swaps in by name)
- Maps: `assets/maps/map.json` + `spritesheet.png` (town); `assets/maps/depot.json` + `depot.png` (depot). **These two pairs must stay distinctly named** — the depot's export is renamed to `depot.*` so it doesn't clobber the town's.
- Sprites: `temple/teahouse/disheveled/house1/yokaihouse/stonelantern/mossyrock/stonepath.png`; Iju `{Anim}_{Dir}.png` (8-dir idle/walk/jump); `villager{A,B,C}_{Anim}_{Dir}.png` (48px, 4-dir); `Burst_S.png` / `Celebrate_S.png` (64px).

---

## Decisions locked this stretch (don't re-open without reason)
- **Iju 64px; scale the world, not the Iju** — re-authoring static art is far cheaper than redoing 8-dir animation sheets, and pixel art can't downscale crisply except to half.
- **Pixel-art crispness:** draw every sprite 1:1 — registry `w/h` **must equal** the PNG's native size, or it blurs. (Corollary caught this session: a footprint `fpW` must be **≤ the sprite width**, or the solid band sticks out past the building — `fpW 290` on a 256-wide sprite was the bug.)
- **Wall box (`PLAYER_WALL` insets) vs foot box (`PLAYER_FOOT`)** stay decoupled.
- **Ground decals (`ground: true`) are non-solid + draw-under** — a stone path can run right through a doorway without blocking the Iju.
- **Object-anchored doors over hardcoded door rects** — the trigger rides the building so layout stays free.
- **Free-roam delivery** (not Paperboy autorun) — the fizz/settle mechanic needs player-controlled pacing.
- **NPC villagers 48×48**; **32px tiles + 960×540** stay.
- **One system per pass**, each tested and git-committed before the next; full files by default; placeholder-first so real art is a filename swap.

---

## How we work
- **Build loop:** Claude builds in a sandbox cloned from the repo → verifies (`node --check` + throwaway logic tests) → delivers the changed files → Daniel drops them into the project, runs `npx serve`, tests in the browser, then commits with the provided message.
- **Environment:** Windows, Node/npm, **no Python** — all commands are Windows-friendly single-liners. Dev server is `npx serve` (ES modules need http, not `file://`). Deploy target: zipped static files to itch.io (https).
- **Method:** options-first for non-trivial calls (2–3 named options + a recommendation, then wait); MVP before polish; one system per pass; a git checkpoint after each confirmed feature. Daniel owns jam-boundary judgment and commit/ship timing.

### Controls reference
- **Game:** WASD / Arrows move · Space jump · (R restart, on the future score screen).
- **Editor:** **[E]** toggle · palette click = type · click = place / drag = move · **[Del]** remove · **[X]** export placements (keeps `door`) · **[B]** toggle debug overlay · WASD pan.
- **Town dev/scrub:** **[1]/[2]** Iju FX · `[`/`]` fizz · **G** grade · **M** streak · **T** pause (Shift+T reset) · **O** arrow target.
- **Debug overlay colors:** yellow = wall box · cyan = Iju foot box · red = object footprint / door zones · magenta = NPC foot box.

---

## Next steps (rough order)
1. **Yokai NPC category** (immediate next pass) — a second NPC group alongside Villagers, structurally identical (same frames/animations) but separate for organization. Plan: generalize `npcs.js` to `createNpcs(group, { map, objects })` (parameterized by a config block instead of reading `CONFIG.NPCS`); instantiate it twice in the town (`CONFIG.NPCS` villagers + a new `CONFIG.YOKAI` block, `variants: ["YokaiA"]`, its own spawns/colors); both item lists merge into the same y-sort. One self-contained system → its own tested/committed pass.
2. **Main Menu** (Option 3 — mouse + keyboard) — still queued. New `scene-menu.js` as the boot scene (Start/Controls/About; ↑↓+Enter and hover+click), a small reusable pointer addition to `input.js`, `BOOT_SCENE = "menu"`, a `MENU` config block; code-drawn/themeable. Start → `pickup`.
3. **Populate the real levels** with the editor — lay out the town (buildings, props, stone paths) and the depot interior; **[X]**-export each into `OBJECTS.placements` / `PICKUP.placements`. Lock the cola shop's final spot.
4. **Author the sheets** — villager + Yokai 4-dir walk (48px), Iju `Burst_S` / `Celebrate_S` (64px); they swap in by filename.
5. **Optional polish on the depot loop** — symmetric auto-return (land in front of the cola shop when leaving the depot, instead of the fixed `{470,470}` point).
6. **Pre-ship housekeeping** — flip `debugFootprints` to `false` and hide the door-zone markers.
7. **Jam window** — build `delivery.js` and wire fizz / grade / score / streak / shift timer / destination arrow into the existing `ui.js` renderer; keep it data-driven for the Theme-2 pivot (GDD §8 staged passes, §10 flexibility plan).

---

## Direction note (parked — not yet scoped)
Daniel's intended gameplay shape, captured for continuity — **not** being built pre-jam: the Iju **picks up** soda, then **traverses the town (and possibly other areas)** to **deliver**, framed as a **starting "level" that opens out into the wider world**. The scene framework + object-anchored doors now make this multi-zone shape natural (each zone is a scene; entrances are object-anchored portals). Fold into GDD §3 / §12 when scoped (jam-window, or earlier on Daniel's say-so).

---

## Module map (`src/`)
```
main.js              bootstrap + game loop + scene wiring
config.js            ALL tunables + the object/NPC/door registries
input.js             keyboard state (held + edge-triggered)
camera.js            follow + clamp to map bounds
map.js               Sprite Fusion export load/render + collision
placeholder-map.js   code-drawn fallback room (map.js interface)
player.js            the Iju: 8-dir movement, collision, animation
objects.js           placed objects: registry, footprints, y-sort, solid/ground flags
editor.js            DEV-ONLY in-harness placement tool (scene-aware)
animator.js          reusable sprite-sheet animator (NPCs + Iju FX)
npcs.js              wandering villagers (built on animator)
ui.js                pure HUD renderer (fizz/score/grade/streak/timer/arrow)
doors.js             door controller: static + object-anchored transitions
scene-manager.js     active scene + editor + transitions
scene-town.js        town scene
scene-pickup.js      depot/pickup scene
delivery.js          STUB — jam-window gameplay (fizz/grade/score/streak/timer)
```