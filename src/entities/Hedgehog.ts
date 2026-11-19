import Phaser from 'phaser';
import { ANIM, ASSETS, HEDGEHOG } from '../config/constants';
import { Enemy } from './Enemy';

/**
 * Walks back and forth on the ground inside its patrol range (a Tiled rectangle); turns at the range
 * ends, at walls and before ledges, so it never falls off.
 */
export class Hedgehog extends Enemy
{
    private readonly minX: number;
    private readonly maxX: number;
    readonly spiky = true;

    constructor (scene: Phaser.Scene, patrol: { x: number; y: number; width: number; height: number }, private readonly ground: Phaser.Tilemaps.TilemapLayer)
    {
        const feetY = patrol.y + patrol.height;
        super(scene, 'hedgehog', patrol.x + patrol.width / 2, feetY - HEDGEHOG.HEIGHT / 2, HEDGEHOG.WIDTH, HEDGEHOG.HEIGHT, ASSETS.HEDGEHOG.walk.key);
        this.minX = patrol.x + HEDGEHOG.WIDTH / 2;
        this.maxX = patrol.x + patrol.width - HEDGEHOG.WIDTH / 2;
    }

    protected move (): void
    {
        const body = this.body;
        const aheadX = this.dir > 0 ? body.right + 1 : body.left - 1;
        const groundAhead = this.ground.hasTileAtWorldXY(aheadX, body.bottom + 1);
        const blocked = this.dir > 0 ? body.blocked.right : body.blocked.left;
        const atEnd = this.dir > 0 ? this.x >= this.maxX : this.x <= this.minX;
        if (body.blocked.down && (blocked || atEnd || !groundAhead)) this.dir = this.dir > 0 ? -1 : 1;
        body.setVelocityX(this.dir * HEDGEHOG.SPEED);
    }

    protected show (sprite: Phaser.GameObjects.Sprite): void
    {
        if (this.scared) sprite.stop().setTexture(ASSETS.HEDGEHOG.scared.key);
        else sprite.play(ANIM.HEDGEHOG_WALK, true);
    }

    protected showFleeing (sprite: Phaser.GameObjects.Sprite): void
    {
        sprite.play(ANIM.HEDGEHOG_WALK, true);
    }
}
