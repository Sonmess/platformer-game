import Phaser from 'phaser';
import { ANIM, ASSETS, COIN } from '../config/constants';

/** Collectible cherry with a small static overlap body, centred on its Tiled point. */
export class Coin extends Phaser.GameObjects.Sprite
{
    declare body: Phaser.Physics.Arcade.StaticBody;

    constructor (scene: Phaser.Scene, x: number, y: number)
    {
        super(scene, x, y, ASSETS.CHERRY.key, 0);
        scene.add.existing(this);
        scene.physics.add.existing(this, true);
        this.body.setSize(COIN.HITBOX, COIN.HITBOX, true);
        this.play(ANIM.CHERRY);
    }
}
