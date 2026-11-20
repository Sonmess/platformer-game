import Phaser from 'phaser';
import { ANIM, ASSETS, DEPTH, TREASURE } from '../config/constants';

/**
 * A golden fish (a treasure) on its Tiled point: a small static overlap body; it bobs and glints, the body stays put.
 * `id` names it for the saved progress ("<map>:<n>"); one found in an earlier run glows fainter but can still be taken.
 */
export class Treasure extends Phaser.GameObjects.Sprite
{
    declare body: Phaser.Physics.Arcade.StaticBody;

    constructor (scene: Phaser.Scene, x: number, y: number, readonly id: string, readonly foundBefore: boolean)
    {
        super(scene, x, y, ASSETS.GOLDEN_FISH.key);
        scene.add.existing(this);
        scene.physics.add.existing(this, true);
        this.body.setSize(TREASURE.HITBOX, TREASURE.HITBOX, true);
        this.play(ANIM.GOLDEN_FISH).setDepth(DEPTH.TREASURE);      // behind the fake rock
        if (foundBefore) this.setAlpha(TREASURE.FOUND_BEFORE_ALPHA);
        this.y -= TREASURE.BOB_PX;
        scene.tweens.add({ targets: this, y: y + TREASURE.BOB_PX, duration: TREASURE.BOB_MS, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
    }
}
