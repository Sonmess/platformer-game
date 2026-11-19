import Phaser from 'phaser';
import { ANIM, ASSETS, CLAW, CLIMB, DEATH, DEPTH, MEOW, PHYSICS, PLAYER, PLAYER_FEEL, POWER, RUN_ANIM_THRESHOLD, TILE } from '../config/constants';
import { EV, events } from '../core/events';
import { JumpAssist, extraGravity } from '../core/jump';
import type { ClawSwipe } from '../core/claw';
import { atTop, climbVelocity, launchVelocity, pastBottom, wantsGrab, zoneAt, zoneCentreX, type Box, type ClimbZone } from '../core/climb';
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
    readonly clawCooldown = new Cooldown(CLAW.COOLDOWN_MS);
    private clawPoseMs = 0;
    /**
     * The moving platform under the cat after the latest physics step (null if none), and the one found
     * during the step in progress. Per physics step, not per frame: on fast screens many frames run no step.
     */
    private standingOn: Rideable | null = null;
    private contact: Rideable | null = null;
    /** Knocked out: the death animation plays, the body is off (no collisions), the controls do nothing. */
    dying = false;
    private invulnerableMs = 0;
    /** After a respawn the arrows are ignored until both are let go (a held arrow must not walk into the pit again). */
    awaitingRelease = false;
    /** Puffed up by a yarn ball: a hit only shrinks it (see Game.killPlayer). The hitbox does not change. */
    big = false;
    /** The level's vines and trunks (set by Game). */
    climbables: readonly ClimbZone[] = [];
    /** The vine or trunk the cat holds on to (null = not climbing). Gravity is off while climbing. */
    climbingOn: ClimbZone | null = null;
    /** After letting go, no new grab until this runs out. */
    private regrabMs = 0;
    /** Distance climbed since the last climbing step (sound, bits). */
    private climbedPx = 0;

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

    get climbing (): boolean
    {
        return this.climbingOn !== null;
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

    /** The sprite's resting scale (Effects squashes and stretches around it). */
    get baseScale (): number
    {
        return this.big ? POWER.BIG_SCALE : 1;
    }

    /** Picked up a yarn ball: puff up. */
    grow (): void
    {
        this.big = true;
        this.sprite.setScale(this.baseScale);
    }

    /** Hit while big: back to the small cat, briefly invulnerable, no life lost. */
    shrink (): void
    {
        this.big = false;
        this.sprite.setScale(this.baseScale);
        this.invulnerableMs = POWER.HURT_INVULNERABLE_MS;
    }

    /** Just respawned (or shrunk): spikes and enemies do not hurt (falling into a pit still does). */
    get invulnerable (): boolean
    {
        return this.invulnerableMs > 0;
    }

    /** Knocked out: stop where it is and switch the body off; Effects animates the sprite, Game respawns it. */
    die (): void
    {
        this.dying = true;
        this.climbingOn = null;
        this.body.setAllowGravity(true);
        this.meowPoseMs = 0;
        this.clawPoseMs = 0;
        this.body.stop();
        this.body.enable = false;
        this.standingOn = this.contact = null;
    }

    update (input: InputSnapshot, deltaMs: number): void
    {
        const body = this.body;
        this.invulnerableMs = Math.max(0, this.invulnerableMs - deltaMs);
        this.regrabMs = Math.max(0, this.regrabMs - deltaMs);
        if (this.awaitingRelease && !input.left && !input.right) this.awaitingRelease = false;
        const steer = !this.awaitingRelease;
        const dir = steer ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;

        // Climbing: a vine or trunk within reach; up grabs it (and does not jump there), a trunk also catches a jump.
        const reachable = zoneAt(this.climbables, this.box, CLIMB.SIDE_MARGIN_PX, CLIMB.REACH_PX);
        if (reachable && !this.climbing && this.regrabMs === 0
            && wantsGrab({ kind: reachable.kind, up: input.up, onGround: this.onGround, dir, dx: zoneCentreX(reachable) - body.center.x })) {
            this.grab(reachable);
        }
        if (this.climbing) this.climb(input, dir, deltaMs);
        const nearClimbable = this.climbing || reachable !== null;
        const onGround = this.onGround;

        // Horizontal: acceleration while held, drag to stop; weaker in the air. Held by the paws: none of it.
        if (this.climbing) {
            body.setAcceleration(0, 0);
            body.setDrag(0, 0);
            this.jump.reset();
        } else if (dir !== 0) {
            this.facing = dir > 0 ? 1 : -1;
            if (onGround && Math.sign(body.velocity.x) === -dir) body.setVelocityX(0); // snap-turn
            body.setAccelerationX(dir * PHYSICS.groundAccel * (onGround ? 1 : PLAYER_FEEL.airControl));
            body.setDragX(0);
        } else {
            body.setAccelerationX(0);
            body.setDragX(PHYSICS.groundDecel * (onGround ? 1 : PLAYER_FEEL.airDragMult));
        }

        // Jump with coyote time and buffer. At a vine or trunk up climbs, so only the jump button jumps there.
        if (!this.climbing && this.jump.update(deltaMs / 1000, onGround, nearClimbable ? input.jumpButtonPressed : input.jumpPressed)) {
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

        // Claw: a quick swipe, also in the air; Game decides what it hits.
        this.clawCooldown.update(deltaMs);
        this.clawPoseMs = Math.max(0, this.clawPoseMs - deltaMs);
        if (input.clawPressed && this.clawCooldown.trigger()) {
            this.clawPoseMs = CLAW.POSE_MS;
            this.meowPoseMs = 0;
            events.emit(EV.PLAYER_CLAW, { ...this.clawSwipe(), cooldownMs: CLAW.COOLDOWN_MS });
        }

        // Asymmetric gravity: heavier fall, brief hang at the apex. (Off altogether while climbing.)
        body.setGravityY(onGround || this.climbing ? 0 : extraGravity(body.velocity.y, PHYSICS, PLAYER_FEEL));

        if (!this.wasOnGround && onGround && !this.climbing) events.emit(EV.PLAYER_LAND, { impact: this.lastVy });
        this.wasOnGround = onGround || this.climbing;     // climbing down onto the ground is no landing
        this.lastVy = body.velocity.y;
    }

    private get box (): Box
    {
        const b = this.body;
        return { left: b.x, right: b.right, top: b.y, bottom: b.bottom };
    }

    /** Take hold: centred on the vine/trunk, gravity off, momentum gone. */
    private grab (zone: ClimbZone): void
    {
        this.climbingOn = zone;
        this.climbedPx = 0;
        const body = this.body;
        body.setAllowGravity(false);
        body.setGravityY(0);
        body.reset(zoneCentreX(zone), body.center.y);       // stops it, too
        this.standingOn = this.contact = null;
        this.cut = true;
        this.meowPoseMs = this.clawPoseMs = 0;
        events.emit(EV.PLAYER_GRAB, { x: body.center.x, y: body.y, kind: zone.kind });
    }

    /** One frame on a vine or trunk: climb up/down, jump off, pull up at the top, let go at the bottom. */
    private climb (input: InputSnapshot, dir: number, deltaMs: number): void
    {
        const zone = this.climbingOn!;
        const body = this.body;
        if (dir !== 0) this.facing = dir > 0 ? 1 : -1;

        if (input.jumpButtonPressed) {
            if (dir === 0) {
                this.letGo('drop');                          // no side held: just let go
                return;
            }
            this.letGo('jump');
            body.setVelocity(dir * CLIMB.KICK_SPEED, launchVelocity(CLIMB.JUMP_TILES * TILE, PHYSICS.gravity));
            this.cut = false;                                // variable height, like any jump
            events.emit(EV.PLAYER_JUMP, { fromClimb: true });
            return;
        }
        const box = this.box;
        if (input.up && !input.down && atTop(zone, box)) {
            this.letGo('top');
            body.setVelocityY(launchVelocity(CLIMB.TOP_HOP_TILES * TILE, PHYSICS.gravity));
            return;
        }
        if (input.down && !input.up && body.blocked.down) {
            this.letGo('ground');
            return;
        }
        // Below the end of a vine (grabbed at the very tip, or climbed down off it) the cat drops, unless it climbs up.
        if (!input.up && pastBottom(zone, box)) {
            this.letGo('end');
            return;
        }

        let vy = climbVelocity(input.up, input.down, CLIMB.SPEED);
        if (vy < 0 && box.top + vy * deltaMs / 1000 < zone.y) vy = (zone.y - box.top) * 1000 / deltaMs;    // stop at the top
        body.setVelocity(0, vy);
        this.climbedPx += Math.abs(vy) * deltaMs / 1000;
        if (this.climbedPx >= CLIMB.STEP_PX) {
            this.climbedPx -= CLIMB.STEP_PX;
            events.emit(EV.PLAYER_CLIMB_STEP, { x: body.center.x, y: body.y, kind: zone.kind });
        }
    }

    /** Stop climbing (gravity back on); `how` says why, for effects and tests. */
    private letGo (how: 'jump' | 'top' | 'drop' | 'ground' | 'end'): void
    {
        const zone = this.climbingOn;
        if (!zone) return;
        this.climbingOn = null;
        this.regrabMs = CLIMB.REGRAB_MS;
        this.body.setAllowGravity(true);
        events.emit(EV.PLAYER_LET_GO, { x: this.body.center.x, y: this.body.y, kind: zone.kind, how });
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

    /** What the claw reaches: from the hitbox centre to a little past its front edge. */
    private clawSwipe (): ClawSwipe
    {
        const c = this.body.center;
        return {
            x: c.x, y: c.y, dir: this.facing,
            reach: this.body.halfWidth + CLAW.REACH_PX,
            behind: CLAW.BEHIND_PX,
            halfHeight: CLAW.HALF_HEIGHT_PX
        };
    }

    /** Current animation key; exposed to the test API. */
    get anim (): string
    {
        return this.sprite.anims.currentAnim?.key ?? '';
    }

    private syncSprite (): void
    {
        if (this.dying) {
            this.sprite.play(ANIM.CAT_HURT, true);     // Effects moves it (the hop and the fall)
            return;
        }
        const body = this.body;
        const platform = this.standingOn;
        if (this.climbing) {
            this.sprite.setPosition(body.center.x, body.bottom + CLIMB.SPRITE_OFFSET_Y);
            this.sprite.setFlipX(this.facing < 0);
            this.sprite.play(body.velocity.y !== 0 ? ANIM.CAT_CLIMB : ANIM.CAT_CLING, true);
            return;
        }
        if (platform) {
            // Snap to the platform's drawn pixel grid, so cat and platform move as one (no 1 px shimmer).
            // body.x, not body.center: a platform carry moves x during the collider, center catches up a step later.
            this.sprite.setPosition(platform.drawX + Math.round(body.x + body.halfWidth - platform.body.x), platform.drawY);
        } else {
            this.sprite.setPosition(body.center.x, body.bottom);
        }
        this.sprite.setFlipX(this.facing < 0);

        let anim: string;
        if (this.clawPoseMs > 0) anim = ANIM.CAT_CLAW;
        else if (this.meowPoseMs > 0) anim = ANIM.CAT_MEOW;
        else if (!this.onGround) anim = body.velocity.y < 0 ? ANIM.CAT_JUMP : ANIM.CAT_FALL;
        else anim = Math.abs(body.velocity.x) > RUN_ANIM_THRESHOLD ? ANIM.CAT_RUN : ANIM.CAT_IDLE;
        this.sprite.play(anim, true);
    }

    teleport (x: number, y: number): void
    {
        this.standingOn = null;
        this.climbingOn = null;
        this.regrabMs = 0;
        this.body.setAllowGravity(true);
        this.body.reset(x, y);
    }

    /**
     * Place the player standing at a feet position, with no momentum carried over, briefly invulnerable and
     * ignoring the arrows until they are let go.
     */
    respawn (feetX: number, feetY: number): void
    {
        this.dying = false;
        this.body.enable = true;
        this.invulnerableMs = DEATH.INVULNERABLE_MS;
        this.big = false;                               // a new life starts small
        this.awaitingRelease = true;
        this.climbingOn = null;
        this.regrabMs = 0;
        this.body.setAllowGravity(true);
        this.body.reset(feetX, feetY - PLAYER.HEIGHT / 2);
        this.standingOn = null;
        this.body.setAcceleration(0, 0);
        this.wasOnGround = true;    // no landing event for the respawn itself
        this.jump.reset();
        this.body.setGravityY(0);
        this.lastVy = 0;
    }
}
