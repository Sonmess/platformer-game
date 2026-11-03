import Phaser from 'phaser';
import { PHYSICS, PLAYER, PLAYER_FEEL } from '../config/constants';
import { EV, events } from '../core/events';
import type { InputSnapshot } from '../systems/Input';

export class Player extends Phaser.GameObjects.Rectangle
{
    declare body: Phaser.Physics.Arcade.Body;
    private wasOnGround = false;
    private lastVy = 0;

    constructor (scene: Phaser.Scene, x: number, y: number)
    {
        super(scene, x, y, PLAYER.WIDTH, PLAYER.HEIGHT, PLAYER.COLOR);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.body.setCollideWorldBounds(true);
        this.body.setMaxVelocity(PLAYER_FEEL.runSpeed, PLAYER_FEEL.maxFallSpeed);
    }

    get onGround (): boolean
    {
        return this.body.blocked.down;
    }

    update (input: InputSnapshot): void
    {
        const body = this.body;
        const onGround = this.onGround;

        // Horizontal: acceleration while held, drag to stop.
        const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        if (dir !== 0) {
            if (onGround && Math.sign(body.velocity.x) === -dir) body.setVelocityX(0); // snap-turn
            body.setAccelerationX(dir * PHYSICS.groundAccel);
            body.setDragX(0);
        } else {
            body.setAccelerationX(0);
            body.setDragX(PHYSICS.groundDecel);
        }

        // Basic jump; coyote, buffer and variable height come in step 7.
        if (input.jumpPressed && onGround) {
            body.setVelocityY(PHYSICS.jumpVelocity);
            events.emit(EV.PLAYER_JUMP);
        }

        if (!this.wasOnGround && onGround) events.emit(EV.PLAYER_LAND, { impact: this.lastVy });
        this.wasOnGround = onGround;
        this.lastVy = body.velocity.y;
    }

    teleport (x: number, y: number): void
    {
        this.body.reset(x, y);
    }
}
