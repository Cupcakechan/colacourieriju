// ui.js — HUD renderer. PURE: draw(ctx, state) reads a state object and draws the fizz bar,
// destination arrow, grade popup, score, streak, and shift timer. No input, no game logic —
// in the jam, delivery.js produces `state` and hands it here, so this exact renderer ships.
// Reads real tunables from CONFIG (colors, grade points, shift length); only the live data
// differs from the shipped game.
//
// state shape:
//   { fizz, fizzMax, score, streakMult, timeLeft,
//     grade: { name, points, t } | null,                  // t = popup life 1→0 (fade)
//     arrow: { fromX, fromY, toX, toY, show } | null }     // all screen px

import { CONFIG } from "./config.js";

const VW = CONFIG.INTERNAL_W, VH = CONFIG.INTERNAL_H;
const GRADE_COLOR = { Perfect: "#3ad36b", Good: "#5aa9e6", Shaken: "#e6a23a", Burst: "#d83a2e" };

const clamp = (v, a, b) => Math.max(a, Math.min(v, b));
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function lerpColor(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const m = (i) => Math.round(A[i] + (B[i] - A[i]) * t);
  return `rgb(${m(0)},${m(1)},${m(2)})`;
}
function fmtTime(sec) { const s = Math.max(0, Math.ceil(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createUI() {
  function draw(ctx, state) {
    drawFizz(ctx, state);
    drawTimer(ctx, state);
    drawScore(ctx, state);
    if (state.arrow && state.arrow.show) drawArrow(ctx, state.arrow);
    if (state.grade && state.grade.t > 0) drawGrade(ctx, state.grade);
  }
  return { draw };
}

// --- fizz bar (top-left): fills 0→max, green→red, trembles near max ---
function drawFizz(ctx, state) {
  const fizz = state.fizz || 0, fizzMax = state.fizzMax || CONFIG.FIZZ_MAX;
  const frac = clamp(fizz / fizzMax, 0, 1);
  let x = 14, y = 14; const w = 220, h = 20;

  // danger tremble: starts at the "Shaken" threshold, grows toward max
  const dangerStart = CONFIG.GRADE.shaken / 100;
  if (frac >= dangerStart) {
    const amt = (frac - dangerStart) / (1 - dangerStart || 1);
    x += (Math.random() * 2 - 1) * 2 * amt;
    y += (Math.random() * 2 - 1) * 2 * amt;
  }

  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(x - 4, y - 4, w + 8, h + 22); // backing + label space
  ctx.fillStyle = "#1b1e27"; ctx.fillRect(x, y, w, h);                            // empty track
  ctx.fillStyle = lerpColor(CONFIG.COLORS.fizzLow, CONFIG.COLORS.fizzHigh, frac); // fill
  ctx.fillRect(x, y, Math.round(w * frac), h);
  ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = "#e8e8ec"; ctx.font = "11px monospace"; ctx.textAlign = "left";
  ctx.fillText(`FIZZ ${Math.round(fizz)}`, x, y + h + 12);
}

// --- shift timer (top-center): mm:ss, blinks red when low ---
function drawTimer(ctx, state) {
  const t = state.timeLeft != null ? state.timeLeft : 0;
  const low = t <= 10;
  ctx.font = "20px monospace"; ctx.textAlign = "center";
  ctx.fillStyle = low && Math.floor(t * 4) % 2 === 0 ? "#d83a2e" : "#e8e8ec";
  ctx.fillText(`TIME ${fmtTime(t)}`, VW / 2, 30);
}

// --- score + streak (top-right) ---
function drawScore(ctx, state) {
  const rx = VW - 14;
  ctx.textAlign = "right";
  ctx.font = "18px monospace"; ctx.fillStyle = "#e8e8ec";
  ctx.fillText(`SCORE ${state.score || 0}`, rx, 26);
  const m = state.streakMult || 1;
  ctx.font = "13px monospace";
  ctx.fillStyle = m >= 2 ? "#3ad36b" : m > 1 ? "#e6c84a" : "rgba(232,232,236,0.7)";
  ctx.fillText(`STREAK ×${m.toFixed(1)}`, rx, 46);
}

// --- destination arrow: points from the Iju toward the target; clamps to the screen edge
//     when the target is off-screen, hovers above it (pointing down) when on-screen ---
function drawArrow(ctx, a) {
  const m = 28;
  const ox = clamp(a.fromX, m, VW - m), oy = clamp(a.fromY, m, VH - m); // ray origin (kept on-screen)
  const dx = a.toX - ox, dy = a.toY - oy;
  const onScreen = a.toX >= m && a.toX <= VW - m && a.toY >= m && a.toY <= VH - m;

  let px, py, ang;
  if (onScreen) {
    px = a.toX; py = a.toY - 26; ang = Math.PI / 2; // hover above target, point down
  } else {
    // exit point of the ray (ox,oy)+(dx,dy) through the inset viewport border
    let t = Infinity;
    if (dx > 0) t = Math.min(t, (VW - m - ox) / dx); else if (dx < 0) t = Math.min(t, (m - ox) / dx);
    if (dy > 0) t = Math.min(t, (VH - m - oy) / dy); else if (dy < 0) t = Math.min(t, (m - oy) / dy);
    if (!isFinite(t)) t = 0;
    px = ox + dx * t; py = oy + dy * t; ang = Math.atan2(dy, dx);
  }

  const s = 12;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(ang);
  ctx.fillStyle = "#ffd23a";
  ctx.beginPath();
  ctx.moveTo(s, 0); ctx.lineTo(-s * 0.7, -s * 0.7); ctx.lineTo(-s * 0.7, s * 0.7); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}

// --- grade popup (center): fades + floats up over its life (t: 1→0) ---
function drawGrade(ctx, g) {
  const t = clamp(g.t, 0, 1);
  const cx = VW / 2, cy = VH * 0.42 - (1 - t) * 24;
  const col = GRADE_COLOR[g.name] || "#e8e8ec";
  const w = 152, h = 54;
  ctx.globalAlpha = t;
  ctx.fillStyle = "rgba(0,0,0,0.6)"; roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 8); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 8); ctx.stroke();
  ctx.fillStyle = col; ctx.font = "20px monospace"; ctx.textAlign = "center";
  ctx.fillText(g.name.toUpperCase(), cx, cy - 1);
  ctx.fillStyle = "#e8e8ec"; ctx.font = "12px monospace";
  ctx.fillText(g.points > 0 ? `+${g.points}` : "no pay", cx, cy + 18);
  ctx.globalAlpha = 1;
}