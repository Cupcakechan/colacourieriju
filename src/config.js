// config.js — every tunable in one place, so balancing is a one-value change.
// Values match GDD §11 and are placeholders to tune during playtest.

export const CONFIG = {
  // --- Resolution & grid ---
  INTERNAL_W: 960,
  INTERNAL_H: 540,
  TILE: 32,
  MAP_TILES_X: 48, // → 1536 px wide
  MAP_TILES_Y: 32, // → 1024 px tall

  // --- Player ---
  PLAYER_SPEED: 140, // px/s
  PLAYER_COLLIDER: { w: 34, h: 38, offX: 15, offY: 22 }, // box within the 64×64 frame

  // --- Fizz (reacts to movement, not raw time) ---
  FIZZ_MAX: 100,
  FIZZ_RISE_MOVING: 12,    // per second while moving + carrying
  FIZZ_SETTLE_STOPPED: 18, // per second while stopped + carrying
  FIZZ_BUMP: 8,            // impulse per obstacle/NPC bump
  FIZZ_JUMP: 6,            // impulse per jump while carrying

  // --- Delivery grading (fizz level at the moment of delivery) ---
  GRADE: { perfect: 20, good: 50, shaken: 85 }, // ≤ thresholds; above shaken = Burst
  POINTS: { perfect: 100, good: 60, shaken: 25, burst: 0 },
  STREAK: { t1: 3, t2: 6, mult1: 1.5, mult2: 2.0 }, // clean deliveries → multiplier

  // --- Session ---
  SHIFT_SECONDS: 120,
  JUMP_DURATION: 0.4, // s

  // --- Colors ---
  COLORS: {
    bg: "#11131a",
    text: "#e8e8ec",
    accent: "#d83a2e",   // cola red
    fizzLow: "#3ad36b",
    fizzHigh: "#d83a2e",
  },
};
