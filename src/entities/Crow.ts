import Phaser from 'phaser';
import { ANIM, ASSETS, CROW } from '../config/constants';
import { pingPong } from '../core/path';
import { Enemy } from './Enemy';

/**
 * Flies back and forth along its path (a Tiled rectangle): wider than tall = left-right, otherwise
 * up-down. No gravity; it slows down at both ends. An up-down crow keeps looking at the cat.
 */
export class Crow extends Enemy
{
    private readonly from: Phaser.Math.Vector2;
    private readonly to: Phaser.Math.Vector2;
    private readonly length: number;
    private readonly vertical: boolean;
    private travelled = 0;
    readonly spiky = false;

    constructor (scene: Phaser.Scene, path: { x: number; y: number; width: number; height: number })
    {
        const vertical = path.height > path.width;
        const cx = path.x + path.width / 2, cy = path.y + path.height / 2;
        const from = vertical ? new Phaser.Math.Vector2(cx, path.y + CROW.HEIGHT / 2) : new Phaser.Math.Vector2(path.x + CROW.WIDTH / 2, cy);
        const to = vertical ? new Phaser.Math.Vector2(cx, path.y + path.height - CROW.HEIGHT / 2) : new Phaser.Math.Vector2(path.x + path.width - CROW.WIDTH / 2, cy);
        super(scene, 'crow', from.x, from.y, CROW.WIDTH, CROW.HEIGHT, ASSETS.CROW.fly.key, CROW.SPRITE_ORIGIN_Y);

        this.from = from;
        this.to = to;
        this.vertical = vertical;
        this.length = Phaser.Math.Distance.BetweenPoints(from, to);
        // Positioned directly along the path: no gravity, no integration (the hitbox follows each frame).
        this.body.setAllowGravity(false);
        this.body.moves = false;
        this.dir = -1;      // face the way the cat comes from
    }

    protected move (deltaMs: number, player: Phaser.Geom.Rectangle): void
    {
        this.travelled += CROW.SPEED * deltaMs / 1000;
        const { t, dir } = pingPong(this.travelled, this.length);
        this.setPosition(Phaser.Math.Linear(this.from.x, this.to.x, t), Phaser.Math.Linear(this.from.y, this.to.y, t));
        this.dir = this.vertical ? (player.centerX < this.x ? -1 : 1) : dir;
    }

    protected show (sprite: Phaser.GameObjects.Sprite): void
    {
        if (this.scared) sprite.stop().setTexture(ASSETS.CROW.scared.key);
        else sprite.play(ANIM.CROW_FLY, true);
    }

    protected showFleeing (sprite: Phaser.GameObjects.Sprite): void
    {
        sprite.play(ANIM.CROW_FLY, true);
    }
}
