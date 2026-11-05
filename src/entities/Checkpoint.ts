import Phaser from 'phaser';
import { ANIM, ASSETS } from '../config/constants';

/** Trigger zone from a Tiled rectangle with a campfire at its centre; it burns while it is the current checkpoint. */
export class Checkpoint extends Phaser.GameObjects.Zone
{
    declare body: Phaser.Physics.Arcade.StaticBody;
    /** Respawn point at the player's feet. */
    readonly respawn: { x: number; y: number };
    private readonly fire: Phaser.GameObjects.Sprite;
    private isCurrent = false;

    constructor (scene: Phaser.Scene, x: number, y: number, w: number, h: number)
    {
        super(scene, x, y, w, h);
        this.setOrigin(0);
        scene.add.existing(this);
        scene.physics.add.existing(this, true);

        const cx = x + w / 2;
        this.respawn = { x: cx, y: y + h };
        this.fire = scene.add.sprite(cx, y + h, ASSETS.CAMPFIRE.unlit.key).setOrigin(0.5, 1);
    }

    /** The checkpoint the player will respawn at (only one at a time). */
    get current (): boolean
    {
        return this.isCurrent;
    }

    /** Exposed to the test API. */
    get lit (): boolean
    {
        return this.fire.anims.isPlaying;
    }

    setCurrent (current: boolean): this
    {
        this.isCurrent = current;
        if (current) this.fire.play(ANIM.CAMPFIRE);
        else this.fire.stop().setTexture(ASSETS.CAMPFIRE.unlit.key);
        return this;
    }
}
