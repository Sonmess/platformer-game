import Phaser from 'phaser';
import { CRUMBLE, DEPTH, PLATFORM, TILE } from '../config/constants';
import { Crumble, type CrumblePhase } from '../core/crumble';
import { EV, events } from '../core/events';

/** Texture prefix of a level's crumbling platforms (one texture per width: prefix + tiles). */
export const crumbleTexturePrefix = (mapKey: string) => `${CRUMBLE.TEXTURE_PREFIX}${mapKey}-`;

/**
 * One texture per width (2..MAX_TILES tiles) under `prefix + n` from a level's crumbling-platform strip (texture
 * `stripKey`: left end, middle, right end): a look of its own, so a platform that gives way never passes for a solid one.
 */
export function bakeCrumbleTextures (textures: Phaser.Textures.TextureManager, stripKey: string, prefix: string): void
{
    const src = textures.get(stripKey).getSourceImage() as HTMLImageElement;
    for (let n = 2; n <= PLATFORM.MAX_TILES; n++) {
        const key = prefix + n;
        if (textures.exists(key)) continue;
        const canvas = textures.createCanvas(key, n * TILE, TILE)!;
        for (let i = 0; i < n; i++) {
            const piece = i === 0 ? 0 : i === n - 1 ? 2 : 1;
            canvas.context.drawImage(src, piece * TILE, 0, TILE, TILE, i * TILE, 0, TILE, TILE);
        }
        canvas.refresh();
    }
}

/**
 * A platform that gives way: stand on it and it shakes for a moment, then drops (no longer solid) and
 * comes back after a while. Game resets it when the cat respawns. The body never moves; only the
 * image shakes, falls and fades, so collisions stay simple.
 */
export class CrumblePlatform extends Phaser.GameObjects.Rectangle
{
    declare body: Phaser.Physics.Arcade.Body;
    readonly image: Phaser.GameObjects.Image;
    private readonly life = new Crumble(CRUMBLE.SHAKE_MS, CRUMBLE.FALL_MS, CRUMBLE.RESPAWN_MS);
    private readonly home: { x: number; y: number };

    constructor (scene: Phaser.Scene, rect: { x: number; y: number; width: number }, texturePrefix: string, private readonly playerBounds: () => Phaser.Geom.Rectangle)
    {
        const n = Phaser.Math.Clamp(Math.round(rect.width / TILE), 2, PLATFORM.MAX_TILES);
        super(scene, rect.x, rect.y, n * TILE, TILE);
        this.setOrigin(0).setVisible(false);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.body.setAllowGravity(false);
        this.body.setImmovable(true);
        this.home = { x: rect.x, y: rect.y };
        this.image = scene.add.image(rect.x, rect.y, texturePrefix + n).setOrigin(0).setDepth(DEPTH.PLATFORMS);
        this.once(Phaser.GameObjects.Events.DESTROY, () => this.image.destroy());
    }

    get phase (): CrumblePhase
    {
        return this.life.phase;
    }

    /** Solid for the collider (still solid while shaking). */
    get solid (): boolean
    {
        return this.life.solid;
    }

    get drawX (): number
    {
        return this.home.x;
    }

    get drawY (): number
    {
        return this.home.y;
    }

    /** The cat stands on it. */
    touch (): void
    {
        if (this.life.touch()) events.emit(EV.CRUMBLE_SHAKE, { x: this.home.x, y: this.home.y, width: this.width });
    }

    /** Back in place, solid and still (the cat respawned). */
    reset (): void
    {
        this.life.reset();
        this.scene.tweens.killTweensOf(this.image);
        this.image.setPosition(this.home.x, this.home.y).setAlpha(1).setVisible(true);
    }

    update (deltaMs: number): void
    {
        const spotFree = !Phaser.Geom.Intersects.RectangleToRectangle(this.getBounds(), this.playerBounds());
        const changed = this.life.update(deltaMs, spotFree);
        if (changed === 'falling') events.emit(EV.CRUMBLE_FALL, { x: this.home.x, y: this.home.y, width: this.width });
        if (changed === 'solid') {
            this.image.setPosition(this.home.x, this.home.y).setVisible(true).setAlpha(0);
            this.scene.tweens.add({ targets: this.image, alpha: 1, duration: CRUMBLE.FADE_IN_MS });
        }
        this.draw();
    }

    private draw (): void
    {
        const t = this.life.elapsedMs;
        switch (this.life.phase) {
        case 'shaking': {
            const step = Math.floor(t / CRUMBLE.SHAKE_STEP_MS);
            this.image.setPosition(this.home.x + (step % 2 === 0 ? CRUMBLE.SHAKE_PX : -CRUMBLE.SHAKE_PX), this.home.y);
            break;
        }
        case 'falling': {
            const s = t / 1000;
            this.image.setPosition(this.home.x, Math.round(this.home.y + 0.5 * CRUMBLE.FALL_GRAVITY * s * s));
            this.image.setAlpha(1 - t / CRUMBLE.FALL_MS);
            break;
        }
        case 'gone':
            this.image.setVisible(false);
            break;
        default:
            break;
        }
    }
}
