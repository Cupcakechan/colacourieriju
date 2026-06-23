// scene-manager.js — owns the active scene and the (single) editor.
// Scenes register by name; go(name) creates + loads one and makes it active. The editor
// is created ONCE here and reads the *active* scene's camera/objects/map through a
// getScene() accessor, so it follows whatever scene is current with no re-attaching of
// listeners. Each scene owns its own map/tileset/objects, which is what lets a future
// PickupScene look completely different from the town (Pass 4).
//
// Update/draw routing matches the old main.js exactly: while the editor is open the Iju
// is frozen and the editor pans the active scene's camera; otherwise the scene updates
// normally (player moves, camera follows).

import { CONFIG } from "./config.js";
import { createEditor } from "./editor.js";

export function createSceneManager({ canvas, ctx, input }) {
  const scenes = {}; // name -> factory(opts) => scene
  let active = null; // the live scene instance

  // The editor reads the active scene live; types is the shared global registry.
  const editor = createEditor({
    canvas,
    getScene: () => active,
    types: (CONFIG.OBJECTS && CONFIG.OBJECTS.types) || {},
  });

  function register(name, factory) { scenes[name] = factory; }

  // Create + load a scene and make it active. spawnAt is reserved for the door
  // transition in Pass 4 (drop the player at a named gate on arrival).
  async function go(name, opts = {}) {
    const factory = scenes[name];
    if (!factory) throw new Error(`scene-manager: unknown scene "${name}"`);
    const sc = factory(opts);
    await sc.load();
    active = sc;
    if (opts.spawnAt && sc.spawn) sc.spawn(opts.spawnAt);
    return sc;
  }

  function update(dt) {
    if (!active) return;
    if (editor.active) {
      // editing: freeze the scene's player, free-pan its camera with WASD/Arrows
      editor.update(dt, input);
      active.camera.follow(editor.camX, editor.camY);
    } else {
      active.update(dt, input);
    }
  }

  function draw() {
    if (!active) return;
    active.draw(ctx);   // each scene clears + draws its own world + HUD
    editor.draw(ctx);   // overlay; no-op when the editor is closed
  }

  return { register, go, update, draw, editor, get active() { return active; } };
}
