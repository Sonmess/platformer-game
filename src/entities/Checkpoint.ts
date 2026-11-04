import Phaser from 'phaser';
import { ASSETS, CHECKPOINT } from '../config/constants';

/** Trigger zone from a Tiled rectangle with a sign standing at its centre; dim until reached. */
export class Checkpoint extends Phaser.GameObjects.Zone
{
    declare body: Phaser.Physics.Arcade.StaticBody;
    /** Respawn point at the player's feet. */
    readonly respawn: { x: number; y: number };
    private readonly sign: Phaser.GameObjects.Image;
    private isCurrent = false;

    constructor (scene: Phaser.Scene, x: number, y: number, w: number, h: number)
    {
        super(scene, x, y, w, h);
        this.setOrigin(0);
        scene.add.existing(this);
        scene.physics.add.existing(this, true);

        const cx = x + w / 2;
        this.respawn = { x: cx, y: y + h };
        this.sign = scene.add.image(cx, y + h, ASSETS.SIGN.key).setOrigin(0.5, 1).setTint(CHECKPOINT.IDLE_TINT);
    }

    /** The checkpoint the player will respawn at (only one at a time). */
    get current (): boolean
    {
        return this.isCurrent;
    }

    setCurrent (current: boolean): this
    {
        this.isCurrent = current;
        if (current) this.sign.clearTint();
        else this.sign.setTint(CHECKPOINT.IDLE_TINT);
        return this;
    }
}
