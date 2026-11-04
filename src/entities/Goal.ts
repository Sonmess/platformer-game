import Phaser from 'phaser';
import { ASSETS } from '../config/constants';

/** Level-end trigger zone from a Tiled rectangle, drawn as a door standing at its centre. */
export class Goal extends Phaser.GameObjects.Zone
{
    declare body: Phaser.Physics.Arcade.StaticBody;

    constructor (scene: Phaser.Scene, x: number, y: number, w: number, h: number)
    {
        super(scene, x, y, w, h);
        this.setOrigin(0);
        scene.add.existing(this);
        scene.physics.add.existing(this, true);
        scene.add.image(x + w / 2, y + h, ASSETS.DOOR.key).setOrigin(0.5, 1);
    }
}
