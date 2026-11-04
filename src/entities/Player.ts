import Phaser from 'phaser';
import { DEPTH, PHYSICS, PLAYER, PLAYER_FEEL } from '../config/constants';
import { EV, events } from '../core/events';
import { JumpAssist, extraGravity } from '../core/jump';
import type { InputSnapshot } from '../systems/Input';

export class Player extends Phaser.GameObjects.Rectangle
{
    declare body: Phaser.Physics.Arcade.Body;
    /** 1 = right, -1 = left; last horizontal input direction. */
    facing: 1 | -1 = 1;
    private wasOnGround = false;
    private lastVy = 0;
    /** The current jump has already been cut short (cut only once per jump). */
    private cut = true;
    private readonly jump = new JumpAssist(PLAYER_FEEL.coyoteTime, PLAYER_FEEL.jumpBuffer);

    constructor (scene: Phaser.Scene, x: number, y: number)
    {
        super(scene, x, y, PLAYER.WIDTH, PLAYER.HEIGHT, PLAYER.COLOR);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setDepth(DEPTH.PLAYER);
        this.body.setCollideWorldBounds(true);
        this.body.setMaxVelocity(PLAYER_FEEL.runSpeed, PLAYER_FEEL.maxFallSpeed);
    }

    get onGround (): boolean
    {
        return this.body.blocked.down;
    }

    update (input: InputSnapshot, deltaMs: number): void
    {
        const body = this.body;
        const onGround = this.onGround;

        // Horizontal: acceleration while held, drag to stop; weaker in the air.
        const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        if (dir !== 0) {
            this.facing = dir > 0 ? 1 : -1;
            if (onGround && Math.sign(body.velocity.x) === -dir) body.setVelocityX(0); // snap-turn
            body.setAccelerationX(dir * PHYSICS.groundAccel * (onGround ? 1 : PLAYER_FEEL.airControl));
            body.setDragX(0);
        } else {
            body.setAccelerationX(0);
            body.setDragX(PHYSICS.groundDecel * (onGround ? 1 : PLAYER_FEEL.airDragMult));
        }

        // Jump with coyote time and buffer.
        if (this.jump.update(deltaMs / 1000, onGround, input.jumpPressed)) {
            body.setVelocityY(PHYSICS.jumpVelocity);
            events.emit(EV.PLAYER_JUMP);
            this.cut = false;
        }
        // Variable height: letting go while rising cuts the jump once (also when a buffered jump
        // starts after the key was already released, or for a tap shorter than a frame).
        if (!input.jumpHeld && body.velocity.y < 0 && !this.cut) {
            this.cut = true;
            body.setVelocityY(body.velocity.y * PLAYER_FEEL.jumpCutMult);
        }

        // Asymmetric gravity: heavier fall, brief hang at the apex.
        body.setGravityY(onGround ? 0 : extraGravity(body.velocity.y, PHYSICS, PLAYER_FEEL));

        if (!this.wasOnGround && onGround) events.emit(EV.PLAYER_LAND, { impact: this.lastVy });
        this.wasOnGround = onGround;
        this.lastVy = body.velocity.y;
    }

    teleport (x: number, y: number): void
    {
        this.body.reset(x, y);
    }

    /** Instantly place the player standing at a feet position, with no momentum carried over. */
    respawn (feetX: number, feetY: number): void
    {
        this.body.reset(feetX, feetY - PLAYER.HEIGHT / 2);
        this.body.setAcceleration(0, 0);
        this.wasOnGround = true;    // no landing event for the respawn itself
        this.jump.reset();
        this.body.setGravityY(0);
        this.lastVy = 0;
    }
}
