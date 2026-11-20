import Phaser from 'phaser';
import { ASSETS, DEPTH, STALACTITE } from '../config/constants';
import { EV, events } from '../core/events';
import { StalactiteLife, catUnder, type StalactitePhase } from '../core/stalactite';

/**
 * A stalactite hanging from the cave ceiling (a Tiled point: its top centre). The cat passing underneath sets it off:
 * it shakes, falls straight down and shatters on the floor (`fallPx` below its tip, found by Game). No physics body:
 * only the image moves, and Game asks `hurts()` with the cat's hitbox (like the snake's poison).
 */
export class Stalactite
{
    readonly image: Phaser.GameObjects.Image;
    private readonly life: StalactiteLife;

    constructor (scene: Phaser.Scene, readonly x: number, readonly y: number, fallPx: number)
    {
        this.life = new StalactiteLife(STALACTITE, fallPx);
        this.image = scene.add.image(x, y, ASSETS.STALACTITE.key).setOrigin(0.5, 0).setDepth(DEPTH.PLATFORMS);
    }

    get phase (): StalactitePhase
    {
        return this.life.phase;
    }

    /** How far it has fallen (px). */
    get dropPx (): number
    {
        return this.life.dropPx;
    }

    /** The tip, where it is now. */
    get tipY (): number
    {
        return this.y + STALACTITE.SPRITE_HEIGHT + this.life.dropPx;
    }

    /** Hurts the cat while it falls, if their boxes overlap. */
    hurts (cat: Phaser.Geom.Rectangle): boolean
    {
        if (!this.life.harmful) return false;
        const { WIDTH, HEIGHT } = STALACTITE.HITBOX;
        return Phaser.Geom.Intersects.RectangleToRectangle(cat, new Phaser.Geom.Rectangle(this.x - WIDTH / 2, this.tipY - HEIGHT, WIDTH, HEIGHT));
    }

    update (deltaMs: number, cat: Phaser.Geom.Rectangle): void
    {
        const below = catUnder(this.x, this.y + STALACTITE.SPRITE_HEIGHT, { left: cat.left, right: cat.right, top: cat.top }, STALACTITE.TRIGGER_REACH_PX);
        const changed = this.life.update(deltaMs, below);
        if (changed === 'shaking') events.emit(EV.STALACTITE_SHAKE, { x: this.x, y: this.y });
        if (changed === 'falling') events.emit(EV.STALACTITE_FALL, { x: this.x, y: this.y });
        if (changed === 'shattered') events.emit(EV.STALACTITE_SHATTER, { x: this.x, y: this.tipY });
        this.draw();
    }

    /** Hanging again (the cat respawned). */
    reset (): void
    {
        this.life.reset();
        this.draw();
    }

    private draw (): void
    {
        const life = this.life;
        switch (life.phase) {
        case 'shaking': {
            const step = Math.floor(life.elapsedMs / STALACTITE.SHAKE_STEP_MS);
            this.image.setPosition(this.x + (step % 2 === 0 ? STALACTITE.SHAKE_PX : -STALACTITE.SHAKE_PX), this.y).setVisible(true);
            break;
        }
        case 'falling':
            this.image.setPosition(this.x, Math.round(this.y + life.dropPx)).setVisible(true);
            break;
        case 'shattered':
            this.image.setVisible(false);
            break;
        default:
            this.image.setPosition(this.x, this.y).setVisible(true);
        }
    }
}
