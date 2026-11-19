import Phaser from 'phaser';
import { ASSETS, DEPTH, PLATFORM, TILE } from '../config/constants';
import { pingPong } from '../core/path';

/** Bakes one texture per platform width (2..MAX_TILES tiles) from the level tileset: left end, middle, right end. */
export function bakePlatformTextures (textures: Phaser.Textures.TextureManager): void
{
    const src = textures.get(ASSETS.TILESET.key).getSourceImage() as HTMLImageElement;
    const tileAt = (gid: number) => {
        const i = gid - 1;
        return { sx: (i % PLATFORM.TILESET_COLUMNS) * TILE, sy: Math.floor(i / PLATFORM.TILESET_COLUMNS) * TILE };
    };
    for (let n = 2; n <= PLATFORM.MAX_TILES; n++) {
        const key = PLATFORM.TEXTURE_PREFIX + n;
        if (textures.exists(key)) continue;
        const canvas = textures.createCanvas(key, n * TILE, TILE)!;
        for (let i = 0; i < n; i++) {
            const gid = i === 0 ? PLATFORM.GIDS.LEFT : i === n - 1 ? PLATFORM.GIDS.RIGHT : PLATFORM.GIDS.MID;
            const { sx, sy } = tileAt(gid);
            canvas.context.drawImage(src, sx, sy, TILE, TILE, i * TILE, 0, TILE, TILE);
        }
        canvas.refresh();
    }
}

/**
 * A solid platform that travels back and forth along its path (a Tiled rectangle).
 *
 * Physics: an invisible immovable body moved by velocity, so Arcade carries a cat standing on it
 * sideways (`friction.x`). The velocity is set once per physics step (WORLD_STEP, fixed 60 Hz) to
 * reach the next point of the path — never from the frame delta: on a 120/144 Hz screen many frames
 * run no physics step, and a frame-based speed would then jump.
 *
 * Look: the tiles are a separate image drawn at whole pixels; a rider's sprite snaps to the same
 * pixel grid (see Player), so cat and platform never shimmer against each other.
 */
export class MovingPlatform extends Phaser.GameObjects.Rectangle
{
    declare body: Phaser.Physics.Arcade.Body;
    readonly image: Phaser.GameObjects.Image;
    private readonly from: Phaser.Math.Vector2;
    private readonly to: Phaser.Math.Vector2;
    private readonly length: number;
    private travelled = 0;

    constructor (scene: Phaser.Scene, path: { x: number; y: number; width: number; height: number }, tiles: number)
    {
        const n = Phaser.Math.Clamp(Math.round(tiles), 2, PLATFORM.MAX_TILES);
        const w = n * TILE;
        const vertical = path.height > path.width;
        // Top-left corner at both ends of the path.
        const from = new Phaser.Math.Vector2(path.x, path.y);
        const to = vertical ? new Phaser.Math.Vector2(path.x, path.y + path.height - TILE) : new Phaser.Math.Vector2(path.x + path.width - w, path.y);
        super(scene, from.x, from.y, w, TILE);
        this.setOrigin(0).setVisible(false);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.body.setAllowGravity(false);
        this.body.setImmovable(true);

        this.from = from;
        this.to = to;
        this.length = Phaser.Math.Distance.BetweenPoints(from, to);
        this.image = scene.add.image(from.x, from.y, PLATFORM.TEXTURE_PREFIX + n).setOrigin(0).setDepth(DEPTH.PLATFORMS);

        const world = scene.physics.world;
        world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, this.step, this);
        scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncImage, this);
        this.once(Phaser.GameObjects.Events.DESTROY, () => {
            world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, this.step, this);
            scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncImage, this);
            this.image.destroy();
        });
        this.step(1 / scene.physics.world.fps);
    }

    /** Top-left corner as drawn (whole pixels); riders snap their sprites to this. */
    get drawX (): number
    {
        return Math.round(this.body.x);
    }

    get drawY (): number
    {
        return Math.round(this.body.y);
    }

    /** After each physics step: the velocity that lands exactly on the next point of the path. */
    private step (stepSeconds: number): void
    {
        this.travelled += PLATFORM.SPEED * stepSeconds;
        const { t } = pingPong(this.travelled, this.length);
        const x = Phaser.Math.Linear(this.from.x, this.to.x, t);
        const y = Phaser.Math.Linear(this.from.y, this.to.y, t);
        this.body.setVelocity((x - this.body.x) / stepSeconds, (y - this.body.y) / stepSeconds);
    }

    private syncImage (): void
    {
        this.image.setPosition(this.drawX, this.drawY);
    }
}
