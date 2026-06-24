// placeholder-map.js — a code-drawn stand-in that matches the map.js interface
// (tile / cols / rows / width / height / bounds / isSolid / draw), so a scene can run with
// its own distinct-looking floor BEFORE a real Sprite Fusion export exists. Swap it for
// loadMap(json, tilesheet) one line later and nothing else in the scene changes.
//
// Fully walkable (only out-of-bounds is solid); the camera centers rooms smaller than the
// view, and the player is contained by the bounds clamp.

export function createPlaceholderMap({ cols, rows, tile, label }) {
  const width = cols * tile, height = rows * tile;

  function isSolid(tx, ty) {
    return tx < 0 || ty < 0 || tx >= cols || ty >= rows; // edges only; interior is open
  }

  function draw(ctx, camX, camY) {
    const x0 = Math.floor(0 - camX), y0 = Math.floor(0 - camY);
    ctx.fillStyle = "#2b3340"; // slate floor — visibly different from the town
    ctx.fillRect(x0, y0, width, height);

    ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1; // grid
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) { const gx = Math.floor(c * tile - camX) + 0.5; ctx.moveTo(gx, y0); ctx.lineTo(gx, y0 + height); }
    for (let r = 0; r <= rows; r++) { const gy = Math.floor(r * tile - camY) + 0.5; ctx.moveTo(x0, gy); ctx.lineTo(x0 + width, gy); }
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 2; // border
    ctx.strokeRect(x0 + 1, y0 + 1, width - 2, height - 2);

    if (label) {
      ctx.fillStyle = "rgba(232,232,236,0.5)"; ctx.font = "16px monospace"; ctx.textAlign = "center";
      ctx.fillText(label, x0 + width / 2, y0 + height / 2);
    }
  }

  return {
    tile, cols, rows, width, height,
    bounds: { minX: 0, maxX: width, minY: 0, maxY: height },
    isSolid, draw, isPlaceholder: true,
  };
}
