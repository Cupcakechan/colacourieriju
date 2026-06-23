# AI Usage Disclosure — Cola Courier: Iju

Per the Ultimate AI-Powered Game Jam #1 rules, this entry uses generative AI for one or more major components. This file tracks how, and is updated as the pipeline evolves.

**Last updated:** 2026-06-22.

## Code
- Assisted by **Claude (Anthropic)** — design, architecture, scaffolding, and implementation guidance.

## Art
- Pixel art generated/assisted with **PixelLab**:
  - Iju character — idle / walk / jump (8-direction), plus burst and celebrate animations.
  - 32×32 tileset (ground + transitions), props, buildings, UI elements.

## Audio
- **None used yet.** As of this update no AI audio tools have been used and no audio is implemented. If AI audio is added during the jam (e.g. fizz hiss, delivery chime, burst splash), it will be disclosed here at that time.

## Process notes
- Theme 1 (COLA) assets and the basic code framework were prepared before the jam (allowed by the rules).
- Tilemaps are laid out in **Sprite Fusion** (a non-generative tilemap editor) from the PixelLab-generated tiles, then exported to JSON the engine reads — the AI contribution is the tile *art*, not the map layout.
- Actual game assembly and integration happens inside the 72-hour window.
- Theme 2 is integrated after it is revealed at the jam start.