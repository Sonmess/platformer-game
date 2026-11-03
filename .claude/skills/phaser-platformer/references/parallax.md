# Parallax backgrounds and visual depth

Parallax is the cheapest way to make a 2D game look professional. Goal: 4–5 layers that move
at different speeds relative to the **camera** (not a constant drift), plus atmosphere.

## 1. Layer plan

| Layer | Scroll factor | Content | Look |
|---|---|---|---|
| Sky | 0.0 | gradient, sun/moon | most desaturated, lightest |
| Far | 0.1–0.2 | distant mountains / skyline | low contrast, tinted toward sky color |
| Mid | 0.3–0.5 | hills, trees, buildings | medium contrast |
| Near | 0.6–0.8 | bushes, details | more saturated, darker |
| Gameplay | 1.0 | tilemap, player, enemies | full contrast — must read clearly |
| Foreground (optional) | 1.1–1.3 | blurred leaves, posts | dark silhouettes, sparse, never hide hazards |

**Atmospheric perspective:** the farther the layer, the closer its color is to the sky color
and the lower its contrast. This one rule creates most of the sense of depth.

Keep the gameplay layer the most readable thing on screen: backgrounds must never have
the same value/saturation as platforms or hazards.

## 2. Implementation: TileSprite driven by camera scroll

For horizontally repeating layers, use a screen-sized `TileSprite` fixed to the camera and
shift its texture offset by the camera position times the factor. This scrolls infinitely
without moving objects around and doesn't break at level edges.

```ts
// src/systems/Parallax.ts
import Phaser from 'phaser';

export interface ParallaxLayerDef {
  key: string;        // texture key
  factor: number;     // 0 = static sky, 1 = moves with the world
  y?: number;         // vertical placement on screen
  factorY?: number;   // optional vertical parallax (keep small, e.g. factor * 0.3)
}

export class Parallax {
  private layers: { sprite: Phaser.GameObjects.TileSprite; def: ParallaxLayerDef }[] = [];

  constructor(private scene: Phaser.Scene, defs: ParallaxLayerDef[]) {
    const { width, height } = scene.scale;
    defs.forEach((def, i) => {
      const tex = scene.textures.get(def.key).getSourceImage();
      const sprite = scene.add
        .tileSprite(0, def.y ?? height - tex.height, width, tex.height, def.key)
        .setOrigin(0, 0)
        .setScrollFactor(0)            // pinned to the camera…
        .setDepth(-100 + i);           // …and behind gameplay
      this.layers.push({ sprite, def });
    });
  }

  update(): void {
    const cam = this.scene.cameras.main;
    for (const { sprite, def } of this.layers) {
      sprite.tilePositionX = cam.scrollX * def.factor;   // …but its texture scrolls
      if (def.factorY) sprite.tilePositionY = cam.scrollY * def.factorY;
    }
  }
}
```

Call `parallax.update()` from the scene's `update()` **after** the camera has followed
(or in a `postupdate` listener) to avoid one-frame jitter. If you see jitter, round
`tilePositionX` when using pixel art.

Alternative for non-repeating set pieces (a single castle, a moon): a normal image with
`setScrollFactor(factor)`. Phaser applies the factor to camera scroll natively.

Before relying on any of the APIs above, confirm them against the current Phaser 4 docs
(TileSprite and scroll factor behavior are stable, but verify).

## 3. Assets

Option A — **procedural textures (greybox and prototype):** draw mountains/hills with
`Graphics` (layered sine/noise silhouettes, gradient sky), then bake them to textures once in
the Preload/Boot scene so runtime cost is a single TileSprite per layer. Make each texture
seamlessly tileable horizontally (same height at x=0 and x=width).

Option B — **art assets (final look):** one PNG per layer, width a multiple of the game width,
horizontally seamless, transparent above the silhouette. Good free/CC0 sources exist (e.g.
itch.io parallax packs, Kenney.nl). Record the license of every asset in `assets/CREDITS.md`.

Keep all layer textures and palette colors in `constants.ts` (`PARALLAX_LAYERS` array), so a
level can swap its whole background by swapping one config.

## 4. Atmosphere extras (cheap, high impact)

- Ambient particles in a mid layer (dust motes, falling leaves, snow, fireflies) with a
  scroll factor matching that layer.
- Slow independent cloud drift on the far layer (add a small time-based offset to
  `tilePositionX` on top of the camera-driven one).
- Vertical gradient sky (never a flat color).
- A subtle vignette or light overlay on top of everything (screen-fixed).
- Day/night or per-level palette: one palette object per level in `constants.ts`.

## 5. Checklist

- [ ] ≥ 4 layers with clearly different speeds
- [ ] Farther layers are lighter / closer to sky color, lower contrast
- [ ] No seams visible when scrolling; no jitter when the camera stops
- [ ] Gameplay layer reads instantly; hazards never blend into the background
- [ ] Works at both level edges (camera bounds) and after restart
