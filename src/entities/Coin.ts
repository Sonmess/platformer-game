import Phaser from 'phaser';
import { COIN } from '../config/constants';

/** Greybox coin: a circle with a static overlap body, centred on its Tiled point. */
export class Coin extends Phaser.GameObjects.Arc
{
    declare body: Phaser.Physics.Arcade.StaticBody;

    constructor (scene: Phaser.Scene, x: number, y: number)
    {
        super(scene, x, y, COIN.RADIUS, 0, 360, false, COIN.COLOR);
        this.setStrokeStyle(1, COIN.OUTLINE);
        scene.add.existing(this);
        scene.physics.add.existing(this, true);
    }
}
