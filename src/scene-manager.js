// scene-manager.js — owns the active scene and the (single) editor, and performs scene
// transitions. Scenes register by name; go(name, {spawnAt}) creates + loads one and makes it
// active, passing spawnAt through to the scene factory so the Iju arrives at the right gate.
// The editor reads the *active* scene's camera/objects/map via getScene(), so it follows
// whatever scene is current (works in town AND pickup) with no re-attaching of listeners.
//
// Transitions: a scene's update(dt, input) may return a { to, spawn } request (e.g. the Iju
// walked into a door); the manager swaps scenes, guarded by a `transitioning` flag so the
// request can't fire repeatedly during the (brief, async) load.

import { CONFIG } from "./config.js";
import { createEditor } from "./editor.js";

export function createSceneManager({ canvas, ctx, input }) {
  const scenes = {}; // name -> factory(opts) => scene
  let active = null; // the live scene instance
  let transitioning = false;

  const editor = createEditor({
    canvas,
    getScene: () => active,
    types: (CONFIG.OBJECTS && CONFIG.OBJECTS.types) || {},
  });

  function register(name, factory) { scenes[name] = factory; }

  // Create + load a scene and make it active. opts.spawnAt (a point in the NEW scene) is
  // passed to the factory, which positions the Iju there in load().
  async function go(name, opts = {}) {
    const factory = scenes[name];
    if (!factory) throw new Error(`scene-manager: unknown scene "${name}"`);
    const sc = factory(opts);
    await sc.load();
    active = sc;
    return sc;
  }

  function update(dt) {
    if (!active) return;
    if (editor.active) {
      // editing: freeze the scene's player, free-pan its camera with WASD/Arrows
      editor.update(dt, input);
      active.camera.follow(editor.camX, editor.camY);
      return;
    }
    const req = active.update(dt, input);
    if (req && req.to && !transitioning) {
      transitioning = true;
      go(req.to, { spawnAt: req.spawn })
        .then(() => { transitioning = false; })
        .catch((e) => { transitioning = false; console.error("scene transition failed:", e); });
    }
  }

  function draw() {
    if (!active) return;
    active.draw(ctx);   // each scene clears + draws its own world + HUD
    editor.draw(ctx);   // overlay; no-op when the editor is closed
  }

  return { register, go, update, draw, editor, get active() { return active; } };
}
