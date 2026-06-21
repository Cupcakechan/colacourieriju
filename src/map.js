// map.js — loads a Sprite Fusion map export (map.json + its packed spritesheet) and draws it.
// map.json is a sparse per-layer tile list; each tile `id` indexes the exported sheet
// left-to-right (cols = sheet width / tile). Any layer flagged `collider` becomes solid.
// See GDD §9. Full per-object collision arrives with the object system (next pass).

import { CONFIG } from "./config.js";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image failed: ${src}`));
    img.src = src;
  });
}

export async function loadMap(jsonUrl, sheetUrl) {
  const j = await (await fetch(jsonUrl)).json();

  const tile = j.tileSize || CONFIG.TILE;
  const cols = j.mapWidth, rows = j.mapHeight;
  const width = cols * tile, height = rows * tile;
  const layers = j.layers || [];

  // solid tiles come from any layer Sprite Fusion marked as a collider
  const solid = new Set();
  for (const L of layers) {
    if (L.collider) for (const t of L.tiles) solid.add(`${t.x},${t.y}`);
  }

  // the exported sheet packs only the tiles used; columns = sheet width / tile
  let sheet = null, sheetCols = 1;
  try {
    sheet = await loadImage(sheetUrl);
    sheetCols = Math.max(1, Math.floor(sheet.width / tile));
  } catch (e) {
    console.error(e); // graceful: fall back to flat-color tiles below
  }

  function draw(ctx, camX, camY) {
    const vw = CONFIG.INTERNAL_W, vh = CONFIG.INTERNAL_H;
    // only draw tiles inside the camera view
    const c0 = Math.floor(camX / tile), r0 = Math.floor(camY / tile);
    const c1 = Math.floor((camX + vw) / tile), r1 = Math.floor((camY + vh) / tile);
    for (const L of layers) {
      for (const t of L.tiles) {
        if (t.x < c0 || t.x > c1 || t.y < r0 || t.y > r1) continue;
        const dx = Math.floor(t.x * tile - camX), dy = Math.floor(t.y * tile - camY);
        if (sheet) {
          const id = +t.id;
          ctx.drawImage(sheet, (id % sheetCols) * tile, Math.floor(id / sheetCols) * tile, tile, tile, dx, dy, tile, tile);
        } else {
          ctx.fillStyle = "#6f5a3e";
          ctx.fillRect(dx, dy, tile, tile);
        }
      }
    }
  }

  return {
    tile, cols, rows, width, height,
    bounds: { minX: 0, maxX: width, minY: 0, maxY: height }, // walkable = whole map (no colliders yet)
    isSolid: (tx, ty) => solid.has(`${tx},${ty}`),
    draw,
  };
}
