// camera.js — follows a world point, clamped to map bounds. Centers maps smaller than the view.
import { CONFIG } from "./config.js";

export function createCamera(mapW, mapH) {
  const vw = CONFIG.INTERNAL_W, vh = CONFIG.INTERNAL_H;
  const cam = { x: 0, y: 0 };

  // if the map is smaller than the viewport, center it; otherwise follow + clamp to the edges
  function axis(center, view, map) {
    if (map <= view) return -(view - map) / 2;
    return Math.max(0, Math.min(center - view / 2, map - view));
  }
  function follow(cx, cy) {
    cam.x = axis(cx, vw, mapW);
    cam.y = axis(cy, vh, mapH);
  }

  return { cam, follow };
}
