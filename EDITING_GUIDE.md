# Editing Guide — Cola Courier: Iju

A practical, go-to reference for building out the world: adding objects, tuning their footprints, organizing the editor palette, and using the in-harness editor. This is a **dev doc** — keep it in the project root next to `PROJECT_HANDOFF.md`, out of the shipped folder.

Two places hold the data you'll touch:

- **`src/config.js`** — the gameplay data: the object **registry** (`OBJECTS.types`) and the **placements** (where instances sit in each scene). This is the source of truth that ships.
- **`src/editor.js`** — the **palette categories** (`CATEGORIES`) and the editor's own settings. This is a dev-only tool; categories here have **no gameplay effect** and are stripped with the editor at ship time.

---

## 1. Mental model (read once)

- A **type** is a *kind* of object — one entry in `OBJECTS.types` (its art + size + footprint). Example: `mossyrock`.
- A **placement** is one *instance* of a type in the world — one entry in a scene's placements list: `{ type, x, y }`. You can have many placements of the same type.
- The **editor** ([E]) lets you place/move instances visually, then **[X]** copies the placements list to your clipboard so you can paste it back into `config.js`. The editor's live changes are **in memory only** until you export — see §9.
- Each scene has its **own** placements: the **town** uses `OBJECTS.placements`, the **depot** uses `PICKUP.placements`. The editor exports whichever scene is currently active.

---

## 2. Add a new object — step by step

Worked example: adding a **flower** prop you can walk over.

1. **Make the art.** Put the PNG in `assets/sprites/`. Name it lowercase, matching the type id you'll use: `flower.png`. (itch.io is case-sensitive — the on-disk name must match the path in code exactly.)
2. **Note its native pixel size** (open it; say it's 32×32). You'll need this exact number next.
3. **Add a type to the registry** in `config.js` → `OBJECTS.types`:
   ```js
   flower: { sprite: "assets/sprites/flower.png", w: 32, h: 32, anchorY: 28, fpW: 14, fpH: 8 },
   ```
   - `w`/`h` **must equal the PNG's native size** (32×32 here) or it draws blurry — this is the one unbreakable rule.
   - `anchorY` / `fpW` / `fpH` are the footprint — starting guesses; you'll tune them with `[B]` in §4.
   - A flower you can always walk over → either add `solid: false` here (whole kind) or toggle it per-instance with `[F]` (§7).
4. **(Optional) categorize it** for the palette in `editor.js` → `CATEGORIES` (see §6). Skip this and it appears under **misc** — still fully reachable.
5. **Run it.** `npx serve`, open the URL, press **[E]**. Open the category (or **misc**) and click in the scene to place. *If you see a grey box instead of the art*, the PNG path/name is wrong — the grey box is the graceful fallback (§9).
6. **Arrange & export.** Place/drag (hold **Shift** to align — §5). Press **[X]** — it copies the whole placements block to your clipboard (and logs it to the console). Paste it over the right list in `config.js`: `OBJECTS.placements` (town) or `PICKUP.placements` (depot).

---

## 3. Registry fields (`OBJECTS.types`)

| Field | Required? | What it does |
|---|---|---|
| `sprite` | yes | Path to the PNG (`assets/sprites/…`). |
| `w`, `h` | yes | Draw size in px. **Must equal the PNG's native pixel size** — mismatch = blur. |
| `anchorY` | for solids | Sprite-local Y where the **base/feet** meet the ground. Sets the footprint's vertical position **and** the y-sort line. |
| `fpW`, `fpH` | for solids | The **solid contact band** (footprint), centered on the sprite, resting on `anchorY`. **`fpW` must be ≤ `w`** or the band pokes out past the sprite. |
| `solid` | optional | `false` → never collides, but still y-sorts (a walk-*behind* prop). Omit → solid. |
| `ground` | optional | `true` → a flat **ground decal**: draws *under* every entity and never collides. No `anchorY`/`fpW`/`fpH` needed. |
| `entrance` | optional | `{ offX, offY, w, h }` doorway rect (sprite-local). Paired with a placement's `door` field, becomes a teleporter (§8). |

Real values for reference (from the current registry):
- Buildings (256×256): `anchorY: 235, fpW: 190, fpH: 35`.
- Cola shop / depot (384×256): `anchorY: 255, fpW: 190, fpH: 35` + an `entrance`.
- Small props (40×40): `anchorY: 36, fpW: 24, fpH: 10`.
- Ground decal: `stonepath` with just `ground: true`.

---

## 4. Footprints — what they are and how to tune them

The **footprint** is the small base band that actually blocks movement — *not* the whole sprite. That's why the Iju can overlap a building's roof or a tree's canopy with its head while its feet stop at the base. Objects are y-sorted by `anchorY`, so the Iju draws **behind** the tall part of a building.

To tune one:

1. Press **[B]** in the editor to show the debug boxes. Colors:
   - **red** = object footprints
   - **yellow** = the Iju's wall box · **cyan** = the Iju's foot box · **magenta** = NPC foot box
2. Place the object and eyeball the **red box** against where the art visually sits on the ground.
3. Adjust in `config.js` and reload:
   - `anchorY` moves the band **up/down** (raise it until the band sits at the base of the art).
   - `fpW` / `fpH` set the band's **width/height** (keep it tight to the base).
4. Re-check. Repeat until the red box hugs the base.

Two rules that prevent the classic bugs: **`w`/`h` = native PNG size** (or blur), and **`fpW` ≤ `w`** (or the band sticks out past the sprite — this was a real bug with a 290-wide band on a 256-wide sprite).

For **buildings**, keep `fpH` small and `anchorY` near the base so only a thin band at the bottom blocks — the roof overhang stays walk-through and the Iju y-sorts behind it.

---

## 5. Placing & aligning in the editor

- **[E]** — toggle the editor on/off.
- Click a palette row to **select** a type → click in the scene to **place** (the object's base lands under the cursor) → **drag** to move → **[Del]** to remove.
- **Hold Shift** while placing or dragging to **snap the base** to a grid (a faint grid appears). Bases snap (not top-lefts), so different-sized objects line up where they *sit* — perfect for rows. Grid is `GRID_SNAP` in `editor.js` (16 by default; set to `32` to snap to map tiles).
- **WASD / Arrows** pan the camera; **mouse wheel** scrolls the palette list when a category is long.
- **[X]** copies the active scene's placements block to the clipboard (also logged to the console as a fallback).

---

## 6. Categories (the palette) — add and edit

Categories organize the drill-down palette and live in `editor.js` → `CATEGORIES`. They're a **dev convenience only** (no gameplay effect), which is why they're here and not in `config.js`.

Current map:
```js
const CATEGORIES = {
  buildings: ["temple", "teahouse", "disheveled", "house1", "yokaihouse"],
  cola:      ["crates", "colacrate", "stackedcolas", "table"],
  nature:    ["mossyrock", "stonelantern"],
  ground:    ["stonepath"],
  deco:      ["trappedsoul"],
};
```

- **Add a category:** add a key whose value is an array of type ids:
  ```js
  hazard: ["puddle", "spikes"],
  ```
  It appears in the palette as soon as ≥1 of its types exists in the registry.
- **Move a type:** cut its id from one array and paste it into another.
- **Uncategorized types** fall into **misc** automatically — always reachable, never stranded. So categorizing is optional polish, not a requirement.
- **Order:** categories show in the order their keys appear in `CATEGORIES` (misc always last). Within a category, items show in **`config.js` definition order** — reorder them there to reorder the palette.
- **Pre-listing is safe:** listing an id that doesn't exist yet (e.g. `stackedcolas` before its art lands) is harmless — it's simply skipped until the type exists.

---

## 7. Per-object collision toggle ([F])

Select an object and press **[F]** to flip **that one instance** between solid and walk-through. It's a per-placement override of the type default.

- The selected object's outline tells you the state: **white = solid**, **blue = walk-through**.
- It **exports** with `[X]` as `solid: true` / `solid: false` and persists.
- **Ground decals** are always non-solid → `[F]` is a no-op on them (it'll say so).

**Which tool for the job?**
- *One specific prop* should be walk-through (a single decorative flower in a doorway) → place it, press **[F]**.
- *A whole kind* never collides (every flower) → set `solid: false` on the **type** in `config.js` (one line). Cleaner than toggling every instance.

---

## 8. Buildings & doors (brief)

A building is just a big type (e.g. 256×256) with a thin base footprint, so the Iju walks behind its roof.

To make a building a **door**:
1. Give the **type** an `entrance: { offX, offY, w, h }` — a doorway rect in the walkable strip in front of its base (tune it with `[B]`, it draws as a red zone).
2. Give the **placement** a `door: { to, spawn, label? }` — `to` is the target scene name, `spawn` is the Iju's arrival point (frame top-left) in that scene.

Walking the Iju's foot box into the entrance teleports to the target scene. The trigger **rides the building**, so you can drag it anywhere in the editor with no coordinate to keep in sync. `[X]` preserves the `door` field on export. (Live example: the cola shop `yokaihouse` → depot.)

---

## 9. Common mistakes

- **Blurry sprite** → `w`/`h` don't match the PNG's native size. Set them to the exact pixels.
- **Footprint sticks out past the building** → `fpW` is larger than `w`. Keep `fpW` ≤ `w`.
- **Object is invisible after placing** → wrong PNG path/filename (you'll see a grey fallback box), or it's a `ground` decal hidden under something. Check the filename — **case-sensitive on itch**.
- **Your edits vanished on reload** → you didn't **[X]**-export and paste into `config.js`. The editor's live changes are in memory only.
- **New prop isn't in the palette** → it's under **misc** because it isn't in `CATEGORIES`. That's fine, or add it to a category (§6).
- **Placed in the wrong scene** → the editor edits the **active** scene. Town objects go in `OBJECTS.placements`; depot objects go in `PICKUP.placements`.

---

## 10. Cheat sheet

**Editor keys:** `[E]` toggle · click = place · drag = move · **Shift** = snap to grid · `[F]` = toggle collision · `[Del]` = remove · `[X]` = export placements · `[B]` = footprints · wheel = scroll palette · WASD = pan.

**Debug colors:** yellow = Iju wall box · cyan = Iju foot box · red = object footprint / door zone · magenta = NPC foot box · **blue outline** = selected walk-through object · **white outline** = selected solid object.

**Unbreakable rules:** registry `w`/`h` = the PNG's native pixels · footprint `fpW` ≤ `w`.
