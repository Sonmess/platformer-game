import Phaser from 'phaser';
import { ANIM, ASSETS, SNAKE } from '../config/constants';
import { EV, events } from '../core/events';
import { Venom, inCloud, type Circle, type VenomPhase } from '../core/venom';
import { Enemy } from './Enemy';

/**
 * Slithers back and forth on the ground inside its patrol range (a Tiled rectangle), like a hedgehog but slower.
 * Every cycle it stops, puffs up its hood (warning), then sprays a poison cloud around itself; touching it or the
 * cloud hurts. A meow does nothing to it; the claw drives it away, best in the calm between the sprays.
 */
export class Snake extends Enemy
{
    private readonly minX: number;
    private readonly maxX: number;
    private readonly venom = new Venom(SNAKE);
    readonly spiky = false;
    override readonly fearless = true;

    constructor (scene: Phaser.Scene, patrol: { x: number; y: number; width: number; height: number }, private readonly ground: Phaser.Tilemaps.TilemapLayer)
    {
        const feetY = patrol.y + patrol.height;
        super(scene, 'snake', patrol.x + patrol.width / 2, feetY - SNAKE.HEIGHT / 2, SNAKE.WIDTH, SNAKE.HEIGHT, ASSETS.SNAKE.slither.key);
        this.minX = patrol.x + SNAKE.WIDTH / 2;
        this.maxX = patrol.x + patrol.width - SNAKE.WIDTH / 2;
    }

    get phase (): VenomPhase
    {
        return this.venom.phase;
    }

    /** The poison cloud while it sprays (centre and radius), else null. */
    get cloud (): Circle | null
    {
        if (this.gone || this.venom.phase !== 'spray') return null;
        return { x: this.body.center.x, y: this.body.center.y - SNAKE.CLOUD_RAISE_PX, radius: SNAKE.CLOUD_RADIUS_PX };
    }

    override poisons (box: Phaser.Geom.Rectangle): boolean
    {
        const cloud = this.cloud;
        return cloud !== null && inCloud(cloud, box);
    }

    protected move (deltaMs: number): void
    {
        const body = this.body;
        const changed = this.venom.update(deltaMs);
        if (changed === 'warn') events.emit(EV.SNAKE_WARN, { x: body.center.x, y: body.center.y });
        else if (changed === 'spray') events.emit(EV.SNAKE_SPRAY, { ...this.cloud!, ms: SNAKE.SPRAY_MS });

        if (this.venom.phase !== 'calm') {
            body.setVelocityX(0);      // holds still while it warns and sprays
            return;
        }
        const aheadX = this.dir > 0 ? body.right + 1 : body.left - 1;
        const groundAhead = this.ground.hasTileAtWorldXY(aheadX, body.bottom + 1);
        const blocked = this.dir > 0 ? body.blocked.right : body.blocked.left;
        const atEnd = this.dir > 0 ? this.x >= this.maxX : this.x <= this.minX;
        if (body.blocked.down && (blocked || atEnd || !groundAhead)) this.dir = this.dir > 0 ? -1 : 1;
        body.setVelocityX(this.dir * SNAKE.SPEED);
    }

    protected show (sprite: Phaser.GameObjects.Sprite): void
    {
        const phase = this.venom.phase;
        if (phase === 'spray') sprite.stop().setTexture(ASSETS.SNAKE.spray.key);
        else sprite.play(phase === 'warn' ? ANIM.SNAKE_WARN : ANIM.SNAKE_SLITHER, true);
    }

    protected showFleeing (sprite: Phaser.GameObjects.Sprite): void
    {
        sprite.play(ANIM.SNAKE_SLITHER, true);
    }
}
