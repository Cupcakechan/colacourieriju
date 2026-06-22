# Cola Courier: Iju — Project Handoff

> **Purpose:** a session-state snapshot to resume cleanly. The **GDD** (`Cola_Courier_Iju_GDD.md`) is the design source of truth; this doc is *where the build actually stands and what's next*.
> **Updated:** 2026-06-22 · Pre-jam prep — asset-placement tool is the active task
> **Repo:** https://github.com/Cupcakechan/colacourieriju.git

---

## TL;DR
The **asset-test harness** is built and working: a Sprite Fusion map loads, the 8-direction Iju walks over it with tile + per-object collision and y-sorted depth, and props/buildings drop in through a data registry. It proves the moment-to-moment foundation. The **gameplay systems (fizz, delivery, grade, score, shift timer)** are deliberately stubbed — they're the 72-hour jam-window work. Pre-jam, only assets + the framework are built; the gameplay assembly happens in-window.

---

## Built & working (tested, in the project)
- **Canvas** at 960×540, pixel-crisp (`imageSmoothingEnabled = false`), scaled to the window. Camera follows the Iju's frame and clamps to map bounds.
- **Map** (`map.js`) — loads a Sprite Fusion export (`assets/maps/map.json` + `spritesheet.png`), reads tile size from JSON, turns collider layers into solid tiles. Town map is ≈64×48 tiles (≈2048×1536 px).
- **Iju** (`player.js`) — 8-direction idle / walk / jump from `assets/sprites/{Anim}_{Dir}.png` strips (frame count auto-detected from sheet width). Free 8-dir movement, axis-separated so it slides along walls instead of sticking.
- **Tile collision** — the Iju's wall box is defined as per-side **insets** (`PLAYER_WALL`), each side an independent dial; tuned so it tucks close to all four hedges.
- **Object system** (`objects.js`) — a registry (`OBJECTS.types`: `sprite`, `w/h`, `anchorY`, `fpW/fpH`) plus `placements`. Each object draws 1:1 and contributes a tight **base footprint** to collision (`PLAYER_FOOT`, feet-only). Objects + player are **y-sorted**, so the Iju passes behind tall buildings.
- **Debug overlay** (`CONFIG.OBJECTS.debugFootprints`, currently **ON**): yellow = wall box, cyan = foot box, red = object footprint. **Click anywhere** in the harness to print a ready-to-paste `{ type, x, y }` coord to the console.

## Stubbed (jam-window work)
- `delivery.js` — pickup/dropoff zones, fizz meter, grade, score, streak, shift timer.
- `ui.js` — fizz bar, score, grade popups, off-screen destination arrow.
- Keep both **data-driven** (cargo types / delivery list / a `modifier` hook) so the hidden Theme 2 slots in as data, not a rewrite (GDD §10).

---

## Current asset & tuning state (exact values live in `config.js`)
- **Iju = the size anchor, 64px.** Not scaled — pixel art can't shrink crisply except to half (32px), which is too small. Everything else is sized to read next to it.
- **Buildings draw 1:1 at 256px.** Registry `w/h` must equal the PNG's native size — a smaller box downscales and blurs (this was the tea-house "not crisp" bug). `temple.png` and `teahouse.png` are in; footprints tuned to ≈ `anchorY 235 / fpW 190 / fpH 35`.
- **Object registry:** `rock` (32), `temple` (256), `teahouse` (256). **Placements** are a scattered *test scene* (4 rocks + temple + tea house), not the final town layout.
- **Villager:** the 48×48 `Villager1.png` was a temporary **scale-comparison probe** (to eyeball NPC height beside the Iju) and has been **removed** — no villager sprite is committed. The **48×48 sizing decision stands** for the NPC pass (it read ≈84% of the Iju's height, clearly below it); the 4-direction walk sheet is still to author then.
- **Debug overlay is ON** — flip `debugFootprints` to `false` before shipping.

## Decisions locked this stretch (don't re-open without reason)
- Iju stays 64px; **scale the world, not the Iju** (buildings doubled to 2×, map enlarged) — re-authoring static art is far cheaper than redoing animations, and the Iju can't downscale crisply anyway.
- **Pixel-art crispness rule:** draw every sprite 1:1 (registry size = PNG size); shrinking smears it. Author at the target size, never downscale.
- Wall collision = **per-side inset box** (`PLAYER_WALL`); object collision = **separate foot box** (`PLAYER_FOOT`) — decoupled so fixing one never breaks the other.
- NPC villagers **48×48** (clearly below the Iju, but enough pixels for legible walk frames).
- 32px ground tiles + 960×540 resolution stay.

---

## How we work
- **Build loop:** Claude builds in a sandbox → verifies (`node --check`, logic checks) → zips only the **changed** files with project-relative paths → you extract over the project root, run `npx serve`, test in the browser, then commit with the provided message.
- **Environment:** Windows, Node/npm, **no Python** — all commands are Windows-friendly single-liners. Dev server is `npx serve` (ES modules need http, not `file://`).
- **Method:** options-first for non-trivial calls (2–3 named options + a recommendation, then wait); MVP before polish; **one system per pass**, each tested and committed before the next; full files by default; a git checkpoint after each confirmed feature.
- **Placing objects (current):** click in the harness → copy the printed `{ type, x, y }` line → paste it into `OBJECTS.placements` in `config.js`. **Being replaced** by the in-harness placement tool (next step): visual place + one-paste export of the whole list.

---

## Direction note (parked — not yet scoped)
Daniel's intended gameplay shape, captured for continuity — **not** being built pre-jam: the Iju **picks up** soda, then **traverses the town (and possibly other areas)** to **deliver**, framed as a **starting "level" that opens out into the wider world**. This extends the GDD §3 pickup → deliver → score loop with (a) an intro/start area and (b) multiple traversable zones. Fold into GDD §3 / §12 when we scope it (jam-window, or earlier on Daniel's say-so).

---

## Next steps (rough order)
1. **Build the in-harness asset-placement tool** (current task) — pick the object type, click to place into the live scene, move/delete, and **export the whole `placements` list in one paste**. Replaces the click-then-hand-copy loop; tooling/scaffold, jam-legal.
2. **Populate the town** with that tool — more buildings (house / shop / depot at the 2× sizes in GDD §14) and props; lay out tight delivery routes.
3. Author the villager **4-direction walk sheet** (48px) when the NPC pass begins.
4. Flip `debugFootprints` **off** once placement and tuning are done.
5. **Jam window:** build `delivery.js` + `ui.js` — fizz meter, grade, score, streak, shift timer, destination arrow — kept data-driven for the Theme-2 pivot (GDD §8 staged passes, §10 flexibility plan).