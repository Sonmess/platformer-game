import Phaser from 'phaser';
import { ASSETS, POWER } from '../config/constants';

/** A yarn ball power-up on its Tiled point: a small static overlap body; it bobs, the body stays put. */
export class Yarn extends Phaser.GameObjects.Image
{
    declare body: Phaser.Physics.Arcade.StaticBody;

    constructor (scene: Phaser.Scene, x: number, y: number)
    {
        super(scene, x, y, ASSETS.YARN.key);
        scene.add.existing(this);
        scene.physics.add.existing(this, true);
        this.body.setSize(POWER.YARN_HITBOX, POWER.YARN_HITBOX, true);
        this.y -= POWER.YARN_BOB_PX;
        scene.tweens.add({ targets: this, y: y + POWER.YARN_BOB_PX, duration: POWER.YARN_BOB_MS, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
    }
}
