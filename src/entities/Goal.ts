import Phaser from 'phaser';

/**
 * Level-end trigger zone from a Tiled rectangle. It sits inside the cave mouth, which is drawn by
 * the tilemap itself (ground + decor layers), so the zone has no sprite of its own.
 */
export class Goal extends Phaser.GameObjects.Zone
{
    declare body: Phaser.Physics.Arcade.StaticBody;

    constructor (scene: Phaser.Scene, x: number, y: number, w: number, h: number)
    {
        super(scene, x, y, w, h);
        this.setOrigin(0);
        scene.add.existing(this);
        scene.physics.add.existing(this, true);
    }
}
