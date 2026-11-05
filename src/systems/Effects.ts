import Phaser from 'phaser';
import { DEPTH, JUICE, PLAYER_FEEL } from '../config/constants';
import { EV, events } from '../core/events';
import type { Player } from '../entities/Player';

/** Bakes the square particle textures (once; textures outlive scene restarts). */
export function bakeEffectTextures (scene: Phaser.Scene): void
{
    const size = JUICE.PARTICLE_SIZE;
    for (const { key, color } of [JUICE.DUST, JUICE.SPARK]) {
        if (scene.textures.exists(key)) continue;
        const g = scene.add.graphics();
        g.fillStyle(color).fillRect(0, 0, size, size);
        g.generateTexture(key, size, size);
        g.destroy();
    }
}

/**
 * All juice: subscribes to gameplay events and only touches visuals (the cat sprite's scale,
 * particles, camera shake). Gameplay never calls it; without it the game plays the same.
 */
export class Effects
{
    private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
    /** One emitter per spark colour set; each particle picks a random tint from its set. */
    private readonly coinSparks: Phaser.GameObjects.Particles.ParticleEmitter;
    private readonly fireSparks: Phaser.GameObjects.Particles.ParticleEmitter;
    private readonly deathBits: Phaser.GameObjects.Particles.ParticleEmitter;
    private readonly handlers: [string, (...args: never[]) => void][];

    constructor (private readonly scene: Phaser.Scene, private readonly player: Player)
    {
        this.dust = scene.add.particles(0, 0, JUICE.DUST.key, {
            // Along the paws, not one point (an emit zone adds to explode()'s position; an x op would not).
            emitZone: { type: 'random', source: { getRandomPoint: p => { p.x = Phaser.Math.Between(-JUICE.DUST.spreadX, JUICE.DUST.spreadX); p.y = 0; } } },
            speed: JUICE.DUST.speed,
            angle: { min: 195, max: 345 },          // up and to both sides (y points down)
            gravityY: JUICE.DUST.gravityY,
            lifespan: JUICE.DUST.lifespan,
            scale: JUICE.DUST.scale,
            alpha: { start: 0.9, end: 0 },
            emitting: false
        }).setDepth(DEPTH.EFFECTS);

        const sparks = (tint: readonly number[]) => scene.add.particles(0, 0, JUICE.SPARK.key, {
            speed: JUICE.SPARK.speed,
            angle: { min: 0, max: 360 },
            lifespan: JUICE.SPARK.lifespan,
            scale: JUICE.SPARK.scale,
            alpha: { start: 1, end: 0 },
            tint: [...tint],
            emitting: false
        }).setDepth(DEPTH.EFFECTS);
        this.coinSparks = sparks(JUICE.COIN.tint);
        this.fireSparks = sparks(JUICE.CHECKPOINT.tint);
        this.deathBits = sparks(JUICE.DEATH.tint);

        this.handlers = [
            [EV.PLAYER_JUMP, this.onJump],
            [EV.PLAYER_LAND, this.onLand],
            [EV.PLAYER_DIE, this.onDie],
            [EV.PLAYER_RESPAWN, this.onRespawn],
            [EV.COIN_COLLECT, this.onCoin],
            [EV.CHECKPOINT_REACH, this.onCheckpoint]
        ];
        for (const [name, fn] of this.handlers) events.on(name, fn, this);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            for (const [name, fn] of this.handlers) events.off(name, fn, this);
        });
    }

    /** Live particles across all emitters; exposed to the test API. */
    get particles (): number
    {
        return [this.dust, this.coinSparks, this.fireSparks, this.deathBits].reduce((n, e) => n + e.getAliveParticleCount(), 0);
    }

    private onJump (): void
    {
        const { scaleX, scaleY, ms, dust } = JUICE.JUMP;
        this.pop(scaleX, scaleY, ms);
        this.puff(dust);
    }

    private onLand ({ impact }: { impact: number }): void
    {
        const L = JUICE.LAND;
        if (impact < L.minImpact) return;
        const strength = Phaser.Math.Clamp(impact / PLAYER_FEEL.maxFallSpeed, 0, 1);
        // Squash grows with the impact: a short hop barely squashes, a long fall squashes fully.
        this.pop(1 + (L.scaleX - 1) * strength, 1 + (L.scaleY - 1) * strength, L.ms);
        this.puff(Math.round(L.dustMin + (L.dustMax - L.dustMin) * strength));
        if (strength >= L.shakeAbove) this.shake(L.shakeMs, L.shakeIntensity);
    }

    private onDie ({ x, y }: { x: number; y: number }): void
    {
        const D = JUICE.DEATH;
        this.deathBits.explode(D.particles, x, y);
        this.shake(D.shakeMs, D.shakeIntensity);
    }

    private onRespawn (): void
    {
        const { fromScale, ms } = JUICE.RESPAWN;
        this.pop(fromScale, fromScale, ms);
    }

    private onCoin ({ x, y }: { x: number; y: number }): void
    {
        this.coinSparks.explode(JUICE.COIN.sparks, x, y);
    }

    private onCheckpoint ({ x, y }: { x: number; y: number }): void
    {
        // Sparks fly up out of the campfire (its base is at the respawn point).
        this.fireSparks.explode(JUICE.CHECKPOINT.sparks, x, y - JUICE.CHECKPOINT.sparkHeight);
    }

    /** Dust at the paws. Uses the hitbox: the sprite still sits where the last frame left it. */
    private puff (count: number): void
    {
        const body = this.player.body;
        this.dust.explode(count, body.center.x, body.bottom);
    }

    /** Squash & stretch on the visible cat only (never the hitbox), easing back to scale 1. */
    private pop (scaleX: number, scaleY: number, ms: number): void
    {
        const sprite = this.player.sprite;
        this.scene.tweens.killTweensOf(sprite);
        sprite.setScale(scaleX, scaleY);        // now, not on the tween's first update (a frame later)
        this.scene.tweens.add({
            targets: sprite,
            scaleX: 1,
            scaleY: 1,
            duration: ms,
            ease: 'Back.easeOut'
        });
    }

    private shake (ms: number, intensity: number): void
    {
        this.scene.cameras.main.shake(ms, intensity);
    }
}
