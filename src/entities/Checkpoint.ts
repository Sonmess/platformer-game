import Phaser from 'phaser';
import { CHECKPOINT } from '../config/constants';

/** Trigger zone from a Tiled rectangle with a greybox flag pole drawn at its centre. */
export class Checkpoint extends Phaser.GameObjects.Zone
{
    declare body: Phaser.Physics.Arcade.StaticBody;
    /** Respawn point at the player's feet. */
    readonly respawn: { x: number; y: number };
    private readonly flag: Phaser.GameObjects.Rectangle;
    private isCurrent = false;

    constructor (scene: Phaser.Scene, x: number, y: number, w: number, h: number)
    {
        super(scene, x, y, w, h);
        this.setOrigin(0);
        scene.add.existing(this);
        scene.physics.add.existing(this, true);

        const cx = x + w / 2;
        this.respawn = { x: cx, y: y + h };
        scene.add.rectangle(cx, y, CHECKPOINT.POLE_WIDTH, h, CHECKPOINT.IDLE_COLOR).setOrigin(0.5, 0);
        this.flag = scene.add.rectangle(cx + CHECKPOINT.POLE_WIDTH / 2, y, CHECKPOINT.FLAG_SIZE, CHECKPOINT.FLAG_SIZE, CHECKPOINT.IDLE_COLOR).setOrigin(0);
    }

    /** The checkpoint the player will respawn at (only one at a time). */
    get current (): boolean
    {
        return this.isCurrent;
    }

    setCurrent (current: boolean): this
    {
        this.isCurrent = current;
        this.flag.setFillStyle(current ? CHECKPOINT.ACTIVE_COLOR : CHECKPOINT.IDLE_COLOR);
        return this;
    }
}
