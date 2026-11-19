import Phaser from 'phaser';
import { COIN, FEATHERS, featherKind, type FeatherKind } from '../config/constants';

/**
 * Collectible feather ("coin" in code) with a small static overlap body, centred on its Tiled point.
 * Blue = 1 point, silver = 5, gold = 10. It floats up and down a little; the body stays where it is.
 */
export class Coin extends Phaser.GameObjects.Sprite
{
    declare body: Phaser.Physics.Arcade.StaticBody;
    readonly kind: FeatherKind;

    constructor (scene: Phaser.Scene, x: number, y: number, readonly value: number)
    {
        const kind = featherKind(value);
        super(scene, x, y, FEATHERS[kind].key, 0);
        this.kind = kind;
        scene.add.existing(this);
        scene.physics.add.existing(this, true);
        this.body.setSize(COIN.HITBOX, COIN.HITBOX, true);
        this.play(FEATHERS[kind].anim);
        // Bob around the point; a phase from the position, so neighbours do not move in lockstep.
        this.y -= COIN.BOB_PX;
        scene.tweens.add({
            targets: this, y: y + COIN.BOB_PX, duration: COIN.BOB_MS, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
            delay: (x * 7) % COIN.BOB_MS
        });
    }
}
