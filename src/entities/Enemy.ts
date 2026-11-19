import Phaser from 'phaser';
import { DEPTH, ENEMY, FLEE } from '../config/constants';
import { EV, events } from '../core/events';
import { Scare } from '../core/meow';

export type EnemyKind = 'hedgehog' | 'crow' | 'snake';

/**
 * Shared enemy behaviour: an invisible Arcade hitbox (all physics and tests use it) with a sprite that
 * follows it after the physics step, like the Player. A meow scares the enemy: it stops, plays its
 * scared look, shakes, and is harmless until it recovers. A claw makes it flee: the hitbox is switched off at once,
 * the sprite runs (or flies) away and fades, and it stays gone until the level restarts. Subclasses only move and pick
 * animations.
 */
export abstract class Enemy extends Phaser.GameObjects.Rectangle
{
    declare body: Phaser.Physics.Arcade.Body;
    readonly sprite: Phaser.GameObjects.Sprite;
    /** 1 = right, -1 = left. */
    dir: 1 | -1 = 1;
    private readonly fright = new Scare(ENEMY.SCARE_MS, ENEMY.WARN_MS);
    private shakeMs = 0;
    private shakeOffset = 0;
    /** Clawed and fled: no hitbox, no updates, no sprite sync (a tween owns the sprite). Back only with the level. */
    gone = false;
    /** Spines: clawing it unscared pricks the cat (see clawOutcome). */
    abstract readonly spiky: boolean;
    /** A meow does nothing to it (the snake). */
    readonly fearless: boolean = false;

    /** `spriteOriginY`: the sprite row (0..1) that sits on the hitbox bottom (a crow's feet dangle below it). */
    constructor (scene: Phaser.Scene, readonly kind: EnemyKind, x: number, y: number, width: number, height: number, texture: string, spriteOriginY = 1)
    {
        super(scene, x, y, width, height);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setVisible(false);

        this.sprite = scene.add.sprite(x, y, texture).setOrigin(0.5, spriteOriginY).setDepth(DEPTH.PLAYER - 1);
        scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncSprite, this);
        this.once(Phaser.GameObjects.Events.DESTROY, () => {
            scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncSprite, this);
            this.sprite.destroy();
        });
    }

    /** Touching it kills the cat. */
    get harmful (): boolean
    {
        return !this.gone && !this.fright.scared;
    }

    get scared (): boolean
    {
        return this.fright.scared;
    }

    /** Fright left (ms); exposed to the test API. */
    get scaredMs (): number
    {
        return this.fright.scared ? this.fright.remainingMs : 0;
    }

    scare (): void
    {
        if (this.fearless) return;
        const wasScared = this.fright.scared;
        this.fright.scare();
        this.body.setVelocity(0, 0);
        if (!wasScared) events.emit(EV.ENEMY_SCARE, { x: this.x, y: this.y, kind: this.kind });
    }

    /** Clawed: run away from the cat (`away` = direction) and leave the level. */
    flee (away: 1 | -1): void
    {
        if (this.gone) return;
        this.gone = true;
        this.body.stop();
        this.body.enable = false;
        this.dir = away;
        events.emit(EV.ENEMY_FLEE, { x: this.x, y: this.y, kind: this.kind, dir: away });

        const look = FLEE[this.kind];
        const sprite = this.sprite.setFlipX(away < 0).setPosition(this.body.center.x, this.body.bottom);
        this.showFleeing(sprite);
        sprite.anims.timeScale = look.animScale;
        this.scene.tweens.add({ targets: sprite, x: sprite.x + away * look.dx, alpha: 0, duration: FLEE.MS, ease: 'Quad.easeIn' });
        // A hedgehog hops once as it bolts; a crow climbs away (one tween per property, so they never fight).
        if (look.hopPx > 0) this.scene.tweens.add({ targets: sprite, y: sprite.y - look.hopPx, duration: FLEE.MS / 4, yoyo: true, ease: 'Quad.easeOut' });
        else this.scene.tweens.add({ targets: sprite, y: sprite.y + look.dy, duration: FLEE.MS, ease: 'Quad.easeIn' });
    }

    /** `player` = the cat's hitbox: a scared enemy recovers only once the cat is off it. */
    update (deltaMs: number, player: Phaser.Geom.Rectangle): void
    {
        if (this.gone) return;
        const free = !Phaser.Geom.Intersects.RectangleToRectangle(this.getBounds(), player);
        if (this.fright.update(deltaMs, free)) events.emit(EV.ENEMY_RECOVER, { x: this.x, y: this.y, kind: this.kind });

        if (this.fright.scared) {
            this.body.setVelocityX(0);
            this.shakeMs -= deltaMs;
            if (this.shakeMs <= 0) {
                this.shakeMs = this.fright.warning ? ENEMY.WARN_SHAKE_MS : ENEMY.SHAKE_MS;
                this.shakeOffset = this.shakeOffset > 0 ? -ENEMY.SHAKE_PX : ENEMY.SHAKE_PX;
            }
        } else {
            this.shakeOffset = 0;
            this.move(deltaMs, player);
        }
    }

    /** Does a hazard of its own (the snake's poison cloud) reach `box`, the cat's hitbox? */
    poisons (_box: Phaser.Geom.Rectangle): boolean
    {
        return false;
    }

    /** Normal (unscared) behaviour for one frame; `player` only for looking at the cat, never for chasing. */
    protected abstract move (deltaMs: number, player: Phaser.Geom.Rectangle): void;

    /** Animation and frame for the current state. */
    protected abstract show (sprite: Phaser.GameObjects.Sprite): void;

    /** Animation while fleeing (normal movement, sped up). */
    protected abstract showFleeing (sprite: Phaser.GameObjects.Sprite): void;

    private syncSprite (): void
    {
        if (this.gone) return;
        const body = this.body;
        this.sprite.setPosition(body.center.x + this.shakeOffset, body.bottom);
        this.sprite.setFlipX(this.dir < 0);
        this.show(this.sprite);
    }
}
