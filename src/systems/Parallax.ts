import Phaser from 'phaser';
import { DEPTH, LEVELS, type ParallaxLayerDef } from '../config/constants';

/** Loaded image for a layer; Preload bakes it into the layer's own texture (`def.key`). */
export const parallaxSourceKey = (def: ParallaxLayerDef) => `${def.key}-src`;

/** Every level's layers, each once (levels may share layers). */
export const allParallaxLayers = (): ParallaxLayerDef[] =>
    [...new Map(LEVELS.flatMap(l => l.parallax).map(d => [d.key, d])).values()];

/** Bakes each layer's texture: the source image plus `gap` empty px, mirrored when `flip` is set. */
export function bakeParallaxTextures (textures: Phaser.Textures.TextureManager): void
{
    for (const def of allParallaxLayers()) {
        if (textures.exists(def.key)) continue;
        const src = textures.get(parallaxSourceKey(def)).getSourceImage() as HTMLImageElement;
        const canvas = textures.createCanvas(def.key, src.width + (def.gap ?? 0), src.height)!;
        const ctx = canvas.context;
        if (def.flip) {
            ctx.translate(src.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(src, 0, 0);
        canvas.refresh();
    }
}

/**
 * Screen-sized TileSprites pinned to the camera whose texture scrolls by camera scroll × factor.
 * Updated on the camera's FOLLOW_UPDATE (after the follow moved it, right before rendering), so
 * the layers never lag a frame behind the world.
 */
export class Parallax
{
    readonly layers: { sprite: Phaser.GameObjects.TileSprite; def: ParallaxLayerDef }[] = [];

    constructor (scene: Phaser.Scene, layers: readonly ParallaxLayerDef[], skyColor: string)
    {
        const { width, height } = scene.scale;
        const camera = scene.cameras.main;
        camera.setBackgroundColor(skyColor);

        layers.forEach((def, i) => {
            const depth = DEPTH.PARALLAX + i * 2;
            const texHeight = scene.textures.get(def.key).getSourceImage().height;
            const sprite = scene.add.tileSprite(0, 0, width, texHeight, def.key)
                .setOrigin(0).setScrollFactor(0).setDepth(depth);
            if (def.tint !== undefined) sprite.setTint(def.tint);
            if (def.fillBelow !== undefined && texHeight < height) {
                scene.add.rectangle(0, texHeight, width, height - texHeight, def.fillBelow)
                    .setOrigin(0).setScrollFactor(0).setDepth(depth + 1);
            }
            this.layers.push({ sprite, def });
        });

        this.scrollTo(camera.scrollX);
        camera.on(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, this.onFollow, this);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            camera.off(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, this.onFollow, this);
        });
    }

    /** Places the layers as if the camera were at `scrollX` (scenes without a follow camera drive this). */
    scrollTo (scrollX: number): void
    {
        // Whole pixels only: fractional offsets make pixel art shimmer.
        for (const { sprite, def } of this.layers) {
            sprite.tilePositionX = Math.round(scrollX * def.factor);
        }
    }

    private onFollow (camera: Phaser.Cameras.Scene2D.Camera): void
    {
        this.scrollTo(camera.scrollX);
    }
}
