import Phaser from 'phaser';
import { GOAL } from '../config/constants';

/** Level-end trigger zone from a Tiled rectangle, drawn as a greybox flag pole. */
export class Goal extends Phaser.GameObjects.Zone
{
    declare body: Phaser.Physics.Arcade.StaticBody;

    constructor (scene: Phaser.Scene, x: number, y: number, w: number, h: number)
    {
        super(scene, x, y, w, h);
        this.setOrigin(0);
        scene.add.existing(this);
        scene.physics.add.existing(this, true);

        const poleX = x + w / 2;
        scene.add.rectangle(poleX, y, GOAL.POLE_WIDTH, h, GOAL.POLE_COLOR).setOrigin(0.5, 0);
        scene.add.rectangle(poleX + GOAL.POLE_WIDTH / 2, y, GOAL.FLAG_WIDTH, GOAL.FLAG_HEIGHT, GOAL.FLAG_COLOR).setOrigin(0);
    }
}
