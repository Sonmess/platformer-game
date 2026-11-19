import Phaser from 'phaser';
import { ANIM, ASSETS, DEPTH, MEOW, PHYSICS, PLAYER, PLAYER_FEEL, RUN_ANIM_THRESHOLD, TILE } from '../config/constants';
import { EV, events } from '../core/events';
import { JumpAssist, extraGravity } from '../core/jump';
import { Cooldown, type MeowWave } from '../core/meow';
import type { InputSnapshot } from '../systems/Input';

/** Anything solid the cat can stand on that is a body, not a tile (moving and crumbling platforms). */
export interface Rideable
{
    body: Phaser.Physics.Arcade.Body;
    /** Top-left corner as drawn, in whole pixels. */
    readonly drawX: number;
    readonly drawY: number;
}

/**
 * The player's physics hitbox (an invisible rectangle). The visible cat is a separate sprite that
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
    /** Kept across respawns, so the HUD's refill bar stays in sync. */
    readonly meowCooldown = new Cooldown(MEOW.COOLDOWN_MS);
    private meowPoseMs = 0;
    /**
     * The moving platform under the cat after the latest physics step (null if none), and the one found
     * during the step in progress. Per physics step, not per frame: on fast screens many frames run no step.
     */
    private standingOn: Rideable | null = null;
    private contact: Rideable | null = null;

    constructor (scene: Phaser.Scene, x: number, y: number)
    {
        super(scene, x, y, PLAYER.WIDTH, PLAYER.HEIGHT);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setVisible(false);

        // Feet are on the frame's bottom row, so anchor the sprite at the hitbox bottom centre.
        this.sprite = scene.add.sprite(x, y, ASSETS.CAT.idle.key).setOrigin(0.5, 1).setDepth(DEPTH.PLAYER);
        this.sprite.play(ANIM.CAT_IDLE);
        // POST_UPDATE runs after Arcade has moved the body for this frame (no one-frame lag).
        scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncSprite, this);
        const world = scene.physics.world;
        world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, this.countStep, this);
        this.once(Phaser.GameObjects.Events.DESTROY, () => {
            scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncSprite, this);
            world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, this.countStep, this);
            this.sprite.destroy();
        });
        this.body.setCollideWorldBounds(true);
        this.body.setMaxVelocity(PLAYER_FEEL.runSpeed, PLAYER_FEEL.maxFallSpeed);
    }

    get onGround (): boolean
    {
        // Tiles set blocked.down (kept between steps); a moving platform (another body) only reports in its
        // collider callback, so remember whether the latest physics step found the cat on one.
        return this.body.blocked.down || this.standingOn !== null;
    }

    /** WORLD_STEP comes after the colliders: whatever they reported is the state until the next step. */
    private countStep (): void
    {
        this.standingOn = this.contact;
        this.contact = null;
    }

    /**
     * Called from a platform collider; returns whether the cat stands on top of it (during a physics step).
     * The cat takes the platform's vertical speed, so it rides instead of falling a little each frame on the way
     * down or being flung off when the platform slows at the top. (A jump sets its own speed later this frame.)
     */
    standOnPlatform (platform: Rideable): boolean
    {
        if (this.body.bottom > platform.body.top + 1) return false;   // side or head bump, not standing
        this.contact = platform;
        this.body.setVelocityY(platform.body.velocity.y);
        return true;
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

        // Meow: allowed on the ground and in the air; the open-mouth frame shows briefly.
        this.meowCooldown.update(deltaMs);
        this.meowPoseMs = Math.max(0, this.meowPoseMs - deltaMs);
        if (input.meowPressed && this.meowCooldown.trigger()) {
            this.meowPoseMs = MEOW.POSE_MS;
            events.emit(EV.PLAYER_MEOW, { ...this.meowWave(), cooldownMs: MEOW.COOLDOWN_MS });
        }

        // Asymmetric gravity: heavier fall, brief hang at the apex.
        body.setGravityY(onGround ? 0 : extraGravity(body.velocity.y, PHYSICS, PLAYER_FEEL));

        if (!this.wasOnGround && onGround) events.emit(EV.PLAYER_LAND, { impact: this.lastVy });
        this.wasOnGround = onGround;
        this.lastVy = body.velocity.y;
    }

    /** What the meow reaches, from the cat's head forward. */
    private meowWave (): MeowWave
    {
        const c = this.body.center;
        return {
            x: c.x + this.facing * MEOW.HEAD_OFFSET.x,
            y: c.y + MEOW.HEAD_OFFSET.y,
            dir: this.facing,
            range: MEOW.RANGE_TILES * TILE,
            halfHeight: MEOW.HALF_HEIGHT_TILES * TILE,
            behind: MEOW.BEHIND_PX
        };
    }

    /** Current animation key; exposed to the test API. */
    get anim (): string
    {
        return this.sprite.anims.currentAnim?.key ?? '';
    }

    private syncSprite (): void
    {
        const body = this.body;
        const platform = this.standingOn;
        if (platform) {
            // Snap to the platform's drawn pixel grid, so cat and platform move as one (no 1 px shimmer).
            // body.x, not body.center: a platform carry moves x during the collider, center catches up a step later.
            this.sprite.setPosition(platform.drawX + Math.round(body.x + body.halfWidth - platform.body.x), platform.drawY);
        } else {
            this.sprite.setPosition(body.center.x, body.bottom);
        }
        this.sprite.setFlipX(this.facing < 0);

        let anim: string;
        if (this.meowPoseMs > 0) anim = ANIM.CAT_MEOW;
        else if (!this.onGround) anim = body.velocity.y < 0 ? ANIM.CAT_JUMP : ANIM.CAT_FALL;
        else anim = Math.abs(body.velocity.x) > RUN_ANIM_THRESHOLD ? ANIM.CAT_RUN : ANIM.CAT_IDLE;
        this.sprite.play(anim, true);
    }

    teleport (x: number, y: number): void
    {
        this.standingOn = null;
        this.body.reset(x, y);
    }

    /** Instantly place the player standing at a feet position, with no momentum carried over. */
    respawn (feetX: number, feetY: number): void
    {
        this.body.reset(feetX, feetY - PLAYER.HEIGHT / 2);
        this.standingOn = null;
        this.body.setAcceleration(0, 0);
        this.wasOnGround = true;    // no landing event for the respawn itself
        this.jump.reset();
        this.body.setGravityY(0);
        this.lastVy = 0;
    }
}
