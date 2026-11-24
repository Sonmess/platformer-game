import Phaser from 'phaser';
import { ANIM, ASSETS, BAT, DEPTH } from '../config/constants';
import { BatFlight, type BatPhase } from '../core/bat';
import { EV, events } from '../core/events';
import { Enemy } from './Enemy';

/**
 * Hangs upside down from a branch stub (a Tiled point: where its feet grip). When the cat comes below it, it wakes
 * (wings open, a squeak), swoops down in an arc to where the cat was and climbs back (`BatFlight`). No gravity:
 * positioned directly like the crow. A meow scares it back up to its branch, harmless for a while; the claw drives it off.
 */
export class Bat extends Enemy
{
    readonly spiky = false;
    private readonly flight = new BatFlight(BAT);
    private readonly roost: Phaser.Math.Vector2;
    readonly branch: Phaser.GameObjects.Image;

    constructor (scene: Phaser.Scene, x: number, y: number)
    {
        // The hitbox centre while it hangs: the sprite's top (its feet) on the branch, the hitbox at the sprite's bottom.
        const roost = new Phaser.Math.Vector2(x, y + BAT.SPRITE_HEIGHT - BAT.HEIGHT / 2);
        super(scene, 'bat', roost.x, roost.y, BAT.WIDTH, BAT.HEIGHT, ASSETS.BAT.hang.key);
        this.roost = roost;
        this.body.setAllowGravity(false);
        this.body.moves = false;
        this.branch = scene.add.image(x, y + 1, ASSETS.BAT.branch.key).setOrigin(0.5, 1).setDepth(DEPTH.CLIMBABLES);
        this.once(Phaser.GameObjects.Events.DESTROY, () => this.branch.destroy());
    }

    get phase (): BatPhase
    {
        return this.flight.phase;
    }

    protected move (deltaMs: number, player: Phaser.Geom.Rectangle): void
    {
        const changed = this.flight.update(deltaMs, { x: player.centerX - this.roost.x, y: player.centerY - this.roost.y });
        if (changed === 'waking') events.emit(EV.BAT_SWOOP, { x: this.roost.x, y: this.roost.y });
        const o = this.flight.offset;
        this.setPosition(this.roost.x + o.x, this.roost.y + o.y);
        this.dir = player.centerX < this.x ? -1 : 1;
    }

    /** Scared: no more swooping; it flutters straight back up to its branch. */
    protected override whileScared (deltaMs: number): void
    {
        this.flight.reset();
        const step = BAT.RETURN_SPEED * deltaMs / 1000;
        const d = Phaser.Math.Distance.Between(this.x, this.y, this.roost.x, this.roost.y);
        if (d <= step) this.setPosition(this.roost.x, this.roost.y);
        else this.setPosition(this.x + (this.roost.x - this.x) / d * step, this.y + (this.roost.y - this.y) / d * step);
    }

    protected show (sprite: Phaser.GameObjects.Sprite): void
    {
        const onRoost = this.x === this.roost.x && this.y === this.roost.y;
        if (this.scared) sprite.stop().setTexture(ASSETS.BAT.scared.key);
        else if (onRoost && (this.flight.phase === 'hanging' || this.flight.phase === 'resting')) sprite.stop().setTexture(ASSETS.BAT.hang.key);
        else sprite.play(ANIM.BAT_FLY, true);
    }

    protected showFleeing (sprite: Phaser.GameObjects.Sprite): void
    {
        sprite.play(ANIM.BAT_FLY, true);
    }
}
