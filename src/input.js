// input.js — keyboard state: which keys are held, and which were just pressed this frame.
// Real implementation (movement plumbing for the asset-test harness). See GDD §5.

export function createInput() {
  const held = new Set();
  const pressed = new Set(); // edge-triggered this frame (for Space/jump)

  addEventListener("keydown", (e) => {
    if (!held.has(e.code)) pressed.add(e.code);
    held.add(e.code);
    // stop the page from scrolling on arrows / space
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  });
  addEventListener("keyup", (e) => held.delete(e.code));

  return {
    isDown: (code) => held.has(code),
    // raw 8-dir intent from WASD / arrows: each component is -1, 0, or 1
    axis() {
      let x = 0, y = 0;
      if (held.has("KeyA") || held.has("ArrowLeft")) x -= 1;
      if (held.has("KeyD") || held.has("ArrowRight")) x += 1;
      if (held.has("KeyW") || held.has("ArrowUp")) y -= 1;
      if (held.has("KeyS") || held.has("ArrowDown")) y += 1;
      return { x, y };
    },
    // true once per physical press; consumed so a held key fires a single jump
    consumePressed(code) {
      if (pressed.has(code)) { pressed.delete(code); return true; }
      return false;
    },
    endFrame() { pressed.clear(); },
  };
}
