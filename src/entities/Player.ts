import Phaser from 'phaser';
import { ANIM, ASSETS, DEPTH, FOX_RUN_THRESHOLD, PHYSICS, PLAYER, PLAYER_FEEL } from '../config/constants';
import { EV, events } from '../core/events';
import { JumpAssist, extraGravity } from '../core/jump';
import type { InputSnapshot } from '../systems/Input';

/**
 * The player's physics hitbox (an invisible rectangle). The visible fox is a separate sprite that
 * follows the hitbox after each physics step, so animation and later squash & stretch never touch
 * the simulation.
 */
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
    readonly sprite: Phaser.GameObjects.Sprite;

    constructor (scene: Phaser.Scene, x: number, y: number)
    {
        super(scene, x, y, PLAYER.WIDTH, PLAYER.HEIGHT);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setVisible(false);

        // Feet are on the frame's bottom row, so anchor the sprite at the hitbox bottom centre.
        this.sprite = scene.add.sprite(x, y, ASSETS.FOX.idle.key).setOrigin(0.5, 1).setDepth(DEPTH.PLAYER);
        this.sprite.play(ANIM.FOX_IDLE);
        // POST_UPDATE runs after Arcade has moved the body for this frame (no one-frame lag).
        scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncSprite, this);
        this.once(Phaser.GameObjects.Events.DESTROY, () => {
            scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncSprite, this);
            this.sprite.destroy();
        });
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

    /** Current animation key; exposed to the test API. */
    get anim (): string
    {
        return this.sprite.anims.currentAnim?.key ?? '';
    }

    private syncSprite (): void
    {
        const body = this.body;
        this.sprite.setPosition(body.center.x, body.bottom);
        this.sprite.setFlipX(this.facing < 0);

        let anim: string;
        if (!this.onGround) anim = body.velocity.y < 0 ? ANIM.FOX_JUMP : ANIM.FOX_FALL;
        else anim = Math.abs(body.velocity.x) > FOX_RUN_THRESHOLD ? ANIM.FOX_RUN : ANIM.FOX_IDLE;
        this.sprite.play(anim, true);
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
