import Phaser from 'phaser';
import { DEATH, DEPTH, JUICE, MEOW, PLAYER_FEEL, POWER, STALACTITE, type FeatherKind } from '../config/constants';
import { EV, events, type DeathCause } from '../core/events';
import type { ClimbKind } from '../core/climb';
import type { ClawSwipe } from '../core/claw';
import type { MeowWave } from '../core/meow';
import type { Player } from '../entities/Player';
import { nearView } from './view';

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
    /** Feather sparkles, one emitter per kind (its colours). */
    private readonly coinSparks: Record<FeatherKind, Phaser.GameObjects.Particles.ParticleEmitter>;
    private readonly lifeSparks: Phaser.GameObjects.Particles.ParticleEmitter;
    private readonly powerSparks: Phaser.GameObjects.Particles.ParticleEmitter;
    private readonly fireSparks: Phaser.GameObjects.Particles.ParticleEmitter;
    private readonly deathBits: Phaser.GameObjects.Particles.ParticleEmitter;
    private readonly scareDrops: Phaser.GameObjects.Particles.ParticleEmitter;
    private readonly furPuff: Phaser.GameObjects.Particles.ParticleEmitter;
    private readonly poisonDrops: Phaser.GameObjects.Particles.ParticleEmitter;
    /** Bark or leaf bits where the paws grab and climb, one emitter per kind (its colours). */
    private readonly climbBits: Record<ClimbKind, Phaser.GameObjects.Particles.ParticleEmitter>;
    /** Stone bits: pebbles trickling from a shaking stalactite, pieces where one shatters. */
    private readonly stoneBits: Phaser.GameObjects.Particles.ParticleEmitter;
    private readonly pebbleTimers: Phaser.Time.TimerEvent[] = [];
    private readonly treasureSparks: Phaser.GameObjects.Particles.ParticleEmitter;
    private readonly handlers: [string, (...args: never[]) => void][];
    // The cat sprite's tweens, kept apart so a jump's squash never cuts the respawn blink short.
    private popTween?: Phaser.Tweens.Tween;
    private blinkTween?: Phaser.Tweens.Tween;
    private deathTween?: Phaser.Tweens.TweenChain;

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
        this.coinSparks = { normal: sparks(JUICE.COIN.normal.tint), silver: sparks(JUICE.COIN.silver.tint), gold: sparks(JUICE.COIN.gold.tint) };
        this.lifeSparks = sparks(JUICE.LIFE.tint);
        this.powerSparks = sparks(JUICE.POWER.tint);
        this.fireSparks = sparks(JUICE.CHECKPOINT.tint);
        this.deathBits = sparks(JUICE.DEATH.tint);
        this.scareDrops = sparks(JUICE.SCARE.tint);
        this.furPuff = sparks(JUICE.CLAW.HIT_TINT);
        // Slower than sparks: the drops stay inside the cloud, so they never suggest a bigger hazard than it is.
        this.poisonDrops = scene.add.particles(0, 0, JUICE.SPARK.key, {
            speed: JUICE.POISON.DROP_SPEED,
            angle: { min: 0, max: 360 },
            lifespan: JUICE.POISON.DROP_LIFESPAN,
            scale: { start: 2, end: 1 },
            alpha: { start: 1, end: 0 },
            tint: [...JUICE.POISON.TINT],
            emitting: false
        }).setDepth(DEPTH.EFFECTS);

        const bits = (tint: readonly number[]) => scene.add.particles(0, 0, JUICE.SPARK.key, {
            speed: JUICE.CLIMB.SPEED,
            angle: { min: 0, max: 360 },
            gravityY: JUICE.CLIMB.GRAVITY_Y,
            lifespan: JUICE.CLIMB.LIFESPAN,
            alpha: { start: 1, end: 0 },
            tint: [...tint],
            emitting: false
        }).setDepth(DEPTH.EFFECTS);
        this.climbBits = { trunk: bits(JUICE.CLIMB.TINT.trunk), vine: bits(JUICE.CLIMB.TINT.vine) };
        this.stoneBits = bits(JUICE.STALACTITE.TINT);
        this.treasureSparks = sparks(JUICE.TREASURE.tint);

        this.handlers = [
            [EV.PLAYER_JUMP, this.onJump],
            [EV.PLAYER_GRAB, this.onGrab],
            [EV.PLAYER_CLIMB_STEP, this.onClimbStep],
            [EV.STALACTITE_SHAKE, this.onStalactiteShake],
            [EV.TREASURE_COLLECT, ({ x, y }: { x: number; y: number }) => this.treasureSparks.explode(JUICE.TREASURE.sparks, x, y)],
            [EV.STALACTITE_SHATTER, this.onStalactiteShatter],
            [EV.PLAYER_RESPAWN, this.stopPebbles],
            [EV.PLAYER_LAND, this.onLand],
            [EV.PLAYER_DIE, this.onDie],
            [EV.PLAYER_RESPAWN, this.onRespawn],
            [EV.COIN_COLLECT, this.onCoin],
            [EV.LIFE_GAIN, this.onLifeGain],
            [EV.PLAYER_GROW, this.onSizeChange],
            [EV.PLAYER_SHRINK, this.onShrink],
            [EV.CHECKPOINT_REACH, this.onCheckpoint],
            [EV.PLAYER_MEOW, this.onMeow],
            [EV.ENEMY_SCARE, this.onEnemyScare],
            [EV.PLAYER_CLAW, this.onClaw],
            [EV.ENEMY_FLEE, this.onEnemyFlee],
            [EV.SNAKE_WARN, this.onSnakeWarn],
            [EV.SNAKE_SPRAY, this.onSnakeSpray],
            [EV.CRUMBLE_FALL, this.onCrumbleFall]
        ];
        for (const [name, fn] of this.handlers) events.on(name, fn, this);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            for (const [name, fn] of this.handlers) events.off(name, fn, this);
        });
    }

    /** Live particles across all emitters; exposed to the test API. */
    get particles (): number
    {
        return [this.dust, ...Object.values(this.coinSparks), this.lifeSparks, this.powerSparks, this.fireSparks, this.deathBits, this.scareDrops, this.furPuff, this.poisonDrops, ...Object.values(this.climbBits), this.stoneBits, this.treasureSparks]
            .reduce((n, e) => n + e.getAliveParticleCount(), 0);
    }

    private onJump ({ fromClimb = false }: { fromClimb?: boolean } = {}): void
    {
        const { scaleX, scaleY, ms, dust } = JUICE.JUMP;
        this.pop(scaleX, scaleY, ms);
        if (!fromClimb) this.puff(dust);            // no ground under the paws on a vine
    }

    private onGrab ({ x, y, kind }: { x: number; y: number; kind: ClimbKind }): void
    {
        this.climbBits[kind].explode(JUICE.CLIMB.GRAB_BITS, x, y);
    }

    /** A loose stalactite: pebbles trickle down from where it hangs until it falls. */
    private onStalactiteShake ({ x, y }: { x: number; y: number }): void
    {
        if (!nearView(this.scene.cameras.main, x, y)) return;
        const S = JUICE.STALACTITE;
        const timer = this.scene.time.addEvent({
            delay: S.PEBBLE_EVERY_MS,
            repeat: Math.floor(STALACTITE.SHAKE_MS / S.PEBBLE_EVERY_MS),
            callback: () => this.stoneBits.explode(S.PEBBLES, x, y + STALACTITE.SPRITE_HEIGHT / 3)
        });
        this.pebbleTimers.push(timer);
    }

    /** It hits the floor: a burst of pieces and a little camera shake. */
    private onStalactiteShatter ({ x, y }: { x: number; y: number }): void
    {
        if (!nearView(this.scene.cameras.main, x, y)) return;
        const S = JUICE.STALACTITE;
        this.stoneBits.explode(S.BITS, x, y);
        this.shake(S.SHAKE_MS, S.SHAKE_INTENSITY);
    }

    private stopPebbles (): void
    {
        this.pebbleTimers.forEach(t => t.remove());
        this.pebbleTimers.length = 0;
    }

    private onClimbStep ({ x, y, kind }: { x: number; y: number; kind: ClimbKind }): void
    {
        this.climbBits[kind].explode(JUICE.CLIMB.STEP_BITS, x, y);
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

    private onDie ({ x, y, cause }: { x: number; y: number; cause: DeathCause }): void
    {
        const D = JUICE.DEATH;
        this.deathBits.explode(D.particles, x, y);
        this.shake(D.shakeMs, D.shakeIntensity);
        if (cause === 'pit') return;            // already off the bottom of the screen

        // Knocked out: a little hop, then a spin and a drop off the screen, fading (Player shows the hurt frame).
        const sprite = this.player.sprite;
        this.popTween?.stop();
        this.blinkTween?.stop();
        sprite.setScale(1).setAlpha(1);
        this.deathTween = this.scene.tweens.chain({
            targets: sprite,
            tweens: [
                { y: sprite.y - D.popPx, duration: D.popMs, ease: 'Quad.easeOut' },
                { y: sprite.y + D.fallPx, angle: D.spinDeg * this.player.facing, alpha: 0, duration: D.fallMs, ease: 'Quad.easeIn' }
            ]
        });
    }

    private onRespawn (): void
    {
        const R = JUICE.RESPAWN;
        const sprite = this.player.sprite;
        this.deathTween?.stop();
        sprite.setAngle(0).setAlpha(1);
        this.pop(R.fromScale, R.fromScale, R.ms);
        this.blink(DEATH.INVULNERABLE_MS);      // while invulnerable
    }

    private onCoin ({ x, y, kind }: { x: number; y: number; kind: FeatherKind }): void
    {
        this.coinSparks[kind].explode(JUICE.COIN[kind].sparks, x, y);
    }

    private onLifeGain ({ x, y }: { x: number; y: number }): void
    {
        this.lifeSparks.explode(JUICE.LIFE.sparks, x, y);
    }

    private onCheckpoint ({ x, y }: { x: number; y: number }): void
    {
        // Sparks fly up out of the campfire (its base is at the respawn point).
        this.fireSparks.explode(JUICE.CHECKPOINT.sparks, x, y - JUICE.CHECKPOINT.sparkHeight);
    }

    /** Sound-wave arcs rolling out from the cat's mouth to the edge of the meow's reach, fading as they go. */
    private onMeow (wave: MeowWave): void
    {
        const W = MEOW.WAVE;
        const g = this.scene.add.graphics().setDepth(DEPTH.EFFECTS);
        const half = Phaser.Math.DegToRad(W.ANGLE_DEG);
        const facing = wave.dir > 0 ? 0 : Math.PI;
        const progress = { t: 0 };
        this.scene.tweens.add({
            targets: progress,
            t: 1,
            duration: W.MS,
            ease: 'Sine.easeOut',
            onUpdate: () => {
                g.clear();
                for (let i = 0; i < W.ARCS; i++) {
                    const r = progress.t * wave.range - i * W.SPACING_PX;
                    if (r <= 0) continue;
                    g.lineStyle(W.LINE, W.COLOR, (1 - progress.t) * (1 - i / W.ARCS));
                    g.beginPath();
                    g.arc(wave.x, wave.y, r, facing - half, facing + half);
                    g.strokePath();
                }
            },
            onComplete: () => g.destroy()
        });
    }

    private onEnemyScare ({ x, y }: { x: number; y: number }): void
    {
        this.scareDrops.explode(JUICE.SCARE.drops, x, y);
    }

    /** Three slanted claw marks in front of the paw, sliding down-forward and fading. */
    private onClaw (swipe: ClawSwipe): void
    {
        const C = JUICE.CLAW;
        const g = this.scene.add.graphics().setDepth(DEPTH.EFFECTS);
        const cx = swipe.x + swipe.dir * (swipe.reach - C.LENGTH_PX / 2);
        const progress = { t: 0 };
        const draw = () => {
            g.clear();
            g.lineStyle(C.LINE, C.COLOR, 1 - progress.t);
            const slide = progress.t * C.SLIDE_PX;
            for (let i = 0; i < C.LINES; i++) {
                const x = cx + swipe.dir * ((i - (C.LINES - 1) / 2) * C.SPACING_PX + slide);
                const y = swipe.y + slide;
                g.lineBetween(x - swipe.dir * C.SLANT_PX / 2, y - C.LENGTH_PX / 2, x + swipe.dir * C.SLANT_PX / 2, y + C.LENGTH_PX / 2);
            }
        };
        draw();     // visible on the swipe's own frame
        this.scene.tweens.add({ targets: progress, t: 1, duration: C.MS, ease: 'Quad.easeOut', onUpdate: draw, onComplete: () => g.destroy() });
    }

    /** A clawed enemy: a puff of fur where it was hit (the enemy animates its own escape). */
    private onEnemyFlee ({ x, y }: { x: number; y: number }): void
    {
        this.furPuff.explode(JUICE.CLAW.HIT_SPARKS, x, y);
    }

    /** The snake puffs up its hood: a few drops of poison drip around it (the sprite shows the hood). */
    private onSnakeWarn ({ x, y }: { x: number; y: number }): void
    {
        if (!nearView(this.scene.cameras.main, x, y)) return;
        this.poisonDrops.explode(JUICE.POISON.WARN_DROPS, x, y);
    }

    /**
     * The poison cloud: a translucent disc of exactly the hurting radius swells up, then fades out over the time it
     * hurts, with drops bursting out of it.
     */
    private onSnakeSpray ({ x, y, radius, ms }: { x: number; y: number; radius: number; ms: number }): void
    {
        const P = JUICE.POISON;
        if (!nearView(this.scene.cameras.main, x, y)) return;
        const g = this.scene.add.graphics().setDepth(DEPTH.EFFECTS).setPosition(x, y).setScale(P.FROM_SCALE);
        g.fillStyle(P.COLOR, P.ALPHA).fillCircle(0, 0, radius);
        g.lineStyle(P.RIM_LINE, P.COLOR, P.RIM_ALPHA).strokeCircle(0, 0, radius);
        this.scene.tweens.chain({
            targets: g,
            tweens: [
                { scale: 1, duration: P.GROW_MS, ease: 'Back.easeOut' },
                { alpha: 0, duration: ms - P.GROW_MS, ease: 'Quad.easeIn' }
            ],
            onComplete: () => g.destroy()
        });
        this.poisonDrops.explode(P.DROPS, x, y);
    }

    /** Dust puffs along the whole width of a crumbling platform as it gives way. */
    private onCrumbleFall ({ x, y, width }: { x: number; y: number; width: number }): void
    {
        for (let px = x + JUICE.CRUMBLE.spacing / 2; px < x + width; px += JUICE.CRUMBLE.spacing) {
            this.dust.explode(JUICE.CRUMBLE.dustPerPuff, px, y + JUICE.CRUMBLE.offsetY);
        }
    }

    /** Dust at the paws. Uses the hitbox: the sprite still sits where the last frame left it. */
    private puff (count: number): void
    {
        const body = this.player.body;
        this.dust.explode(count, body.center.x, body.bottom);
    }

    /**
     * Squash & stretch on the visible cat only (never the hitbox), easing back to its resting scale (1, or bigger
     * with a yarn ball). The factors are relative to that resting scale.
     */
    private pop (scaleX: number, scaleY: number, ms: number): void
    {
        const sprite = this.player.sprite;
        const base = this.player.baseScale;
        this.popTween?.stop();                  // only the scale tween: a blink may be running alongside
        sprite.setScale(scaleX * base, scaleY * base);     // now, not on the tween's first update (a frame later)
        this.popTween = this.scene.tweens.add({
            targets: sprite,
            scaleX: base,
            scaleY: base,
            duration: ms,
            ease: 'Back.easeOut'
        });
    }

    /** Growing or shrinking: flicker between the two sizes a few times, ending at the new one; sparkles. */
    private onSizeChange ({ x, y }: { x: number; y: number }): void
    {
        const P = JUICE.POWER;
        const sprite = this.player.sprite;
        const to = this.player.baseScale;
        const from = to === 1 ? POWER.BIG_SCALE : 1;
        this.popTween?.stop();
        this.powerSparks.explode(P.sparks, x, y);
        let step = 0;
        sprite.setScale(from);
        this.popTween = this.scene.tweens.addCounter({
            from: 0, to: 2 * P.flickers, duration: 2 * P.flickers * P.flickerMs,
            onUpdate: tween => {
                const n = Math.floor(tween.getValue() ?? 0);
                if (n !== step) { step = n; sprite.setScale(n % 2 === 1 ? to : from); }
            },
            onComplete: () => sprite.setScale(to)
        });
    }

    /** Hit while big: the same flicker, and blink while invulnerable. */
    private onShrink (e: { x: number; y: number }): void
    {
        this.onSizeChange(e);
        this.blink(POWER.HURT_INVULNERABLE_MS);
    }

    private blink (ms: number): void
    {
        const R = JUICE.RESPAWN;
        const sprite = this.player.sprite;
        this.blinkTween?.stop();
        sprite.setAlpha(1);
        this.blinkTween = this.scene.tweens.add({
            targets: sprite,
            alpha: R.blinkAlpha,
            duration: R.blinkMs,
            yoyo: true,
            repeat: Math.max(0, Math.floor(ms / (2 * R.blinkMs)) - 1),
            onComplete: () => sprite.setAlpha(1)
        });
    }

    private shake (ms: number, intensity: number): void
    {
        this.scene.cameras.main.shake(ms, intensity);
    }
}
