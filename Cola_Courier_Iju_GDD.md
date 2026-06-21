# Cola Courier: Iju — Game Design Document

> **Status:** living source of truth. Jam build doc, kept lean on purpose.
> **Last updated:** 2026-06-20 · Pre-jam planning (no code yet)
> **One-liner:** A yokai cola courier sprints through a misty mountain town keeping the fizz settled — deliver clean, deliver fast, you can't do both.

---

## 1. Concept

Top-down arcade delivery. You play **Iju**, a chibi-leaning yokai mountain beast carrying cola bottles on its back, delivering across a cozy Japanese-inspired ancient mountain town. The hook is the **fizz meter**: movement shakes the cola, so every run is a push-pull between *hurry up* (the shift clock is ticking) and *settle down* (a shaken delivery scores badly). It's a score-attack: deliver as many clean colas as you can before the shift bell.

Reference touchstones: Crazy Taxi (pickup/dropoff + destination arrow + fare rush), Paperboy (deliver-while-dodging, clean-run bonus), Death Stranding (cargo *condition* is the challenge), Overcooked/Diner Dash (escalating service pressure, tips for speed+quality).

---

## 2. Jam context

- **Jam:** Ultimate AI-Powered Game Jam #1 — **72 hours, 2026-07-03 12:00 → 2026-07-06 12:00**.
- **Theme 1 (mandatory, known):** COLA — it *is* the core mechanic (fizz), not set dressing.
- **Theme 2 (hidden):** revealed the instant the jam starts. Optional, but folding it in boosts the "AI Direction & Adaptability" score. Our defense is architecture (see §10), not prediction.
- **Rating criteria we optimize for:** Overall Enjoyment · Theme Fidelity (both themes) · AI Direction & Adaptability (esp. pivoting to Theme 2) · Production Velocity (a *complete*, rich small game beats an ambitious unfinished one).
- **Prep-vs-window rule:** preparing assets, prompt pipelines, and a basic code framework beforehand is allowed; **actual game assembly and integration must happen inside the 72h window.** So pre-jam = assets + this GDD + scaffold (framework only); the gameplay build is in-window.
- **AI usage:** required for ≥1 major component (Code/Art/Audio) + ToS compliance. We satisfy it via AI art + AI-assisted code; we maintain `AI_USAGE.md` disclosing the pipeline.

---

## 3. Core loop

```
   [empty-handed] --walk to pickup--> [PICKUP] --bottles "fill"-->
        ^                                                          \
        |                                                           v
   [score + reset] <--grade (fizz)-- [DELIVER] <--manage fizz-- [carrying]
        |                                                           ^
        +------------------- repeat until shift bell ---------------+
```

While **empty-handed** (heading to a pickup): no fizz pressure — a relaxed walk.
While **carrying** (pickup → dropoff): fizz is live — the tense leg.
At **delivery**: fizz level sets the grade and the points; loop resets to a new order.
Run ends when the **shift clock** hits zero → score screen → "one more go".

---

## 4. Mechanics

### 4.1 Movement
Free **8-direction** movement (not grid). One walk speed. **Jump** is a short hop (its gameplay purpose is a later pass — see §8; in the slice it exists and costs fizz). No sprint in the slice — kept out to keep the core clean; can be added later if playtesting wants a third lever.

### 4.2 Fizz meter (the heart)
A 0–100 meter shown as a UI bar. Crucially, fizz reacts to **agitation, not raw time**, which is what makes "settle" work:

- **Moving while carrying:** fizz rises (the bottles jostle).
- **Standing still while carrying:** fizz **settles** (falls).
- **Bump** an obstacle/NPC: fizz impulse up.
- **Jump** while carrying: fizz impulse up.
- **Empty-handed:** fizz doesn't change at all.

The settle valve is what turns the meter from a pure punishment into a rhythm: sprint a stretch → pause somewhere safe to let it settle → push on.

> **Why it doesn't degenerate into "creep slowly":** the **shift clock** is the counter-pressure. Every second spent settling is a second not delivering. Dawdling to keep fizz low = fewer deliveries = lower total. Rushing = more deliveries but worse grades. The optimum is a managed flow of risk and recovery — that tension *is* the game.

### 4.3 Delivery grades (soft fail — no hard game-over by default)
The fizz level **at the moment you deliver** sets the grade:

| Grade | Fizz at delivery | Points | Feel |
|---|---|---|---|
| **Perfect** | ≤ 20 | 100 | crisp delivery, celebrate anim |
| **Good** | ≤ 50 | 60 | fine |
| **Shaken** | ≤ 85 | 25 | sloppy |
| **Burst** | > 85, or hit 100 en route | 0 | soda everywhere (burst anim), no pay, keep playing |

A Burst costs **score, not the run.** (Values are placeholders — see §11.)

### 4.4 Streak multiplier
Consecutive non-Burst deliveries build a multiplier; a Burst resets it.

| Clean streak | Multiplier |
|---|---|
| 0–2 | ×1.0 |
| 3–5 | ×1.5 |
| 6+ | ×2.0 |

**Delivery score = grade points × current multiplier.**

### 4.5 Session & scoring
**Timed shift** (placeholder 120 s). Deliver as many orders as possible before the bell; final score = sum of all delivery scores. Shift end → score screen with deliveries made, best grade streak, and total. *(This session structure is a design call — see §12.)*

### 4.6 Cargo visuals
Bottles are **always full** on the sprite (cosmetic). The logical state (empty-handed vs carrying) is shown by the **destination arrow** (points to the pickup, then the dropoff) and a small UI cargo pip — not by the sprite. An empty-bottle sprite variant is optional end-of-jam polish only.

---

## 5. Controls

| Action | Keys |
|---|---|
| Move (8-dir) | `WASD` / Arrow keys |
| Jump | `Space` |
| Restart run | `R` (on score screen) |
| (Settle) | automatic — stop moving while carrying |

Pickup/deliver trigger automatically by entering the pickup/dropoff zone (no button).

---

## 6. Feel & presentation

- **Internal resolution 960×540**, scaled up to fill the window with letterboxing; pixel-crisp (`ctx.imageSmoothingEnabled = false` + CSS `image-rendering: pixelated`).
- **Camera** follows the player, **clamped to map bounds** (never scrolls past the edge).
- **Fizz juice:** the bottles jiggle harder and the character (then screen) trembles as fizz climbs near max — danger telegraphed through the character, not just the bar.
- **Burst anim** on every Burst delivery (frequent, single-direction). **Celebrate anim** on Perfect / streak milestone. These are core juice, not just end-screens.
- Art direction (motifs, palette) is the artist's lane — out of scope for this doc beyond the dimensional specs in §9.

---

## 7. Slice 0 — first testable loop

The smallest thing that proves the loop is fun. Built in-window, each step tested + committed before the next:

1. Canvas + fullscreen scaling + pixel rendering
2. Camera follow + bounds clamp
3. Tileset map larger than the viewport (placeholder tiles)
4. Free 8-direction movement (placeholder rectangle Iju)
5. Pickup point + dropoff point (fixed positions)
6. Cargo state empty-handed → carrying → empty-handed (logical; placeholder color swap)
7. Fizz meter: rises while moving+carrying, **settles while stopped**, +bump impulse
8. Delivery awards a **grade** + points
9. Destination arrow
10. Instant restart

---

## 8. Staged passes (after Slice 0)

One system per pass, in rough priority order:

1. **Shift timer + score screen** — turns the loop into a real score-attack (this is what makes the fizz/settle tension bite).
2. **Streak multiplier**
3. **NPCs + obstacle bumps** — the fizz-from-bump pressure on the route
4. **Jump with a purpose** — a real use (hop a low fence shortcut / dodge), so the fizz cost is a genuine trade-off
5. **Real art swap-in** (tiles, Iju sheets, props, buildings)
6. **Fizz juice** (jiggle/tremble) + **burst/celebrate** anim hookup
7. **Audio** (fizz hiss, delivery chime, burst splash)
8. **Theme 2 integration** (data-driven — see §10)
9. **Polish** (relief/vent spots, hazards, escalation, title/score screens)

---

## 9. Technical architecture

**Stack:** plain HTML / CSS / JS / Canvas. **ES modules** (`<script type="module">`), no build step. Local dev via `npx serve` (Node-based; no Python). Deploy: zipped static files to itch.io (served over https — modules work there).

**Map:** tileset workflow. 32×32 tiles authored as a tileset (ground + transitions) + prop/building sprites layered on top. Map laid out in a tilemap editor (Sprite Fusion / PixLab / Tiled) and **exported as JSON** the engine reads. Collision is per-tile (flag solid tile indices) + per-object rectangles — reliable and reroutable, which matters for the Theme-2 pivot.

**Module split** (one responsibility each):

```
cola-courier-iju/
├── index.html          canvas element + module entry
├── style.css           fullscreen canvas, letterbox, pixelated
├── .gitignore          node_modules, OS/IDE cruft
├── README.md
├── AI_USAGE.md         AI-pipeline disclosure (maintained from day one)
├── PROJECT_HANDOFF.md  session state (created at end of each session)
├── src/
│   ├── main.js         game loop + state machine + wiring
│   ├── config.js       ALL tunables (§11) — balancing is a one-value change
│   ├── input.js        keyboard state
│   ├── player.js       Iju: position, movement, cargo state, animation
│   ├── camera.js       follow + clamp to map bounds
│   ├── map.js          tile data load/render + collision
│   ├── delivery.js     pickup/dropoff, grade, score, streak
│   └── ui.js           fizz bar, score, grade popup, destination arrow
└── assets/
    ├── sprites/  tiles/  audio/
```

**Map prototype size:** 48×32 tiles = 1536×1024 px (≈1.6× viewport wide, ≈1.9× tall) → short, snappy routes. Scale up later if needed.

Rough zone sketch (final layout decided during build):

```
+------------------------------------------+
| shrine path        houses     mountain   |
|   o lantern                              |
|        +--------+          +--------+    |
|        | DEPOT  |  plaza   | shop   |    |
|        |(pickup)|   o vend |(drop)  |    |
|        +--------+          +--------+    |
|   alley    bridge ~~~~~~   crates        |
+------------------------------------------+
   o = props/relief candidates · ~ = water
```

---

## 10. Theme 2 flexibility plan

Keep content **data-driven** so a surprise theme slots in as data, not a rewrite:

- `deliveries[]` — each: `{ pickup, dropoff, cargoType, modifier }`
- `cargoTypes[]` — each: `{ sprite, fizzRate, points }` (e.g. a premium extra-fizzy cola = higher rate + payout)
- `modifier` field on a delivery/shift — a hook for whatever Theme 2 demands (weather → slip → more fizz; night → visibility; "weird cargo" → odd behavior).

When Theme 2 drops on July 3, we add a cargo row and/or a modifier and wire one effect — that's the "pivot the pipeline on the fly" the jam scores.

---

## 11. Tunable starting values (all live in `config.js`)

All placeholders — tuned during playtest; balancing should never require touching logic.

| Constant | Start value | Notes |
|---|---|---|
| `INTERNAL_W × INTERNAL_H` | 960 × 540 | logical resolution |
| `TILE` | 32 | px |
| `MAP_TILES` | 48 × 32 | → 1536 × 1024 px |
| `PLAYER_SPEED` | 140 | px/s |
| `PLAYER_COLLIDER` | 34 × 38 @ (15,22) | within the 64×64 frame |
| `FIZZ_MAX` | 100 | meter ceiling |
| `FIZZ_RISE_MOVING` | +12 / s | while moving + carrying |
| `FIZZ_SETTLE_STOPPED` | −18 / s | while stopped + carrying |
| `FIZZ_BUMP` | +8 | per bump impulse |
| `FIZZ_JUMP` | +6 | per jump while carrying |
| `GRADE_PERFECT / GOOD / SHAKEN` | ≤20 / ≤50 / ≤85 | fizz thresholds at delivery |
| `POINTS_PERFECT/GOOD/SHAKEN/BURST` | 100 / 60 / 25 / 0 | |
| `STREAK_T1 / T2` | 3 / 6 | clean deliveries → ×1.5 / ×2.0 |
| `SHIFT_SECONDS` | 120 | run length |
| `JUMP_DURATION` | 0.4 | s |

Sanity check on the numbers: a ~10 s carrying leg with no settling = +120 fizz = capped Burst, so fizz management is *mandatory*, not optional — and a few seconds of settling recovers it at the cost of clock time. The tension is real and the values are easy to dial.

---

## 12. Design calls to confirm

Calls I made to keep the design coherent — easy to change, flag any:

1. **Session = timed shift** (vs. fixed-N deliveries, or endless). Picked because it gives a natural end, built-in urgency, and a comparable score for "one more go." *Alternative:* "complete N deliveries, scored on total grade + time" (speedrun flavor).
2. **No hard game-over** by default — a Burst costs score, not the run. Want an *optional* session-ender (e.g. shift ends early after X Bursts)? Say so.
3. **No sprint** in the slice — one walk speed keeps the core clean; the stop-to-settle decision already carries the tension. Sprint can be a later optional third lever.
4. **Fizz reacts to movement, not raw time** — required for "settle while stopped" to make sense, and it's physically intuitive (motion shakes the bottles).

---

## 13. Timeline

```
NOW ─────────────► JUL 3 12:00 ──────── 72h ──────► JUL 6 12:00
 (prep — allowed)      (jam starts)                 (submit)
 • build assets        • Theme 2 revealed → integrate
 • this GDD            • assemble: Slice 0 → staged passes → polish
 • scaffold (framework  • maintain AI_USAGE.md
   only, jam-legal)     • submit before bell
```

---

## 14. Asset spec (dimensions — full contract for the art pipeline)

Base grid **32×32**. Sprites authored with the object's base at the bottom of the frame + a small ground shadow (for depth-sorting later). Collision boxes are starting values to tune.

| Asset | Pixel size | Frames | Collision (solid) | Notes |
|---|---|---|---|---|
| Ground tiles (grass/dirt/stone/wood/shrine/water) | 32×32 | 1 ea + transitions | water solid; paths walkable | Wang/dual-grid sets; must tile seamlessly |
| Ground overlays (cracks/leaves/cola stain) | 32×32 | 1 | none | decoration |
| **Iju** idle/walk/jump | 64×64 | ~10 (8 ok) | 34×38 @ (15,22) | **8-dir**, **full bottles only** |
| **Iju** burst | 64×64 | 10–12 | none | **1-dir (S)** |
| **Iju** celebrate | 64×64 | 8–10 | none | **1-dir (S)** |
| Small props (crate/barrel/rock/bush/fence) | 32×32 | 1 | ~28×20 base | fence tileable H+V |
| Lantern | 32×32 | 1 (or 2–4 flicker) | ~14×12 or pass | flicker = polish |
| Cola sign / standee | 32×32 | 1 | optional | COLA dressing |
| Medium props/hazards (stacked crates/stall/well) | 64×64 | 1 | ~64×32 lower | well = relief candidate |
| Slippery hazard (puddle) | 32×32 | 1 | trigger zone | post-slice |
| Vending machine (COLA anchor) | 32×64 | 1 (+ glow) | 32×24 base | doubles as vent/relief; 64×64 for a double |
| NPC villager | 48×48 | 4–6 walk | ~24×18 feet | **4-dir** (mirror W↔E), 2–3 variants |
| Small house | 128×128 | 1 | ~128×56 lower | roof overhang non-solid |
| Medium house | 160×128 | 1 | ~160×56 | |
| Large house/shop | 192×128 | 1 | ~192×56 | |
| Depot (pickup hub) | 192×128 | 1 | structure solid, bay open | open bay = pickup zone |
| Fizz bar (UI) | code-drawn first | — | — | ~220×22 top; sprite optional later |
| Destination arrow (UI) | code-drawn first | — | — | ~20px triangle; 24×24 sprite optional |
| Grade badge (UI) | text first | — | — | 48×24 badge sprites optional |

**Spritesheet layout:** one PNG per animation; directions = rows, frames = columns, fixed 64×64 cells (e.g. `iju_walk_full.png` = 640×512 for 10×8). Row→direction order is set once in `config.js`, so whatever order the export uses is fine as long as it's consistent across idle/walk/jump.

**Filenames:** `iju_idle_full.png`, `iju_walk_full.png`, `iju_jump_full.png`, `iju_burst.png`, `iju_celebrate.png`; `tileset_ground.png`; `prop_crate.png`, `prop_lantern.png`, `prop_vending.png`, `prop_sign.png`, `prop_fence.png`; `npc_villager_a.png`; `bldg_house_sm.png`, `bldg_house_md.png`, `bldg_shop_lg.png`, `bldg_depot.png`.
