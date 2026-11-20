import Phaser from 'phaser';
import { AUDIO, JUICE, PLAYER_FEEL, type FeatherKind } from '../config/constants';
import { EV, events } from '../core/events';
import { nearView } from './view';

type Sfx = typeof AUDIO.SFX[keyof typeof AUDIO.SFX];

/**
 * Keys of recently played sounds, newest last; read by the test API. Module-level, because the
 * goal jingle plays while the Game scene (and its Audio) shuts down.
 */
export const sfxLog: string[] = [];

/**
 * Sound effects, driven only by gameplay events (like Effects). Sounds go through the game-wide
 * sound manager, so a jingle keeps playing across the scene switch to the results screen.
 */
export class SoundEffects
{
    private readonly handlers: [string, (...args: never[]) => void][];
    private comboSteps = 0;
    private lastCoinMs = -Infinity;

    constructor (private readonly scene: Phaser.Scene)
    {
        scene.sound.volume = AUDIO.MASTER_VOLUME;
        this.handlers = [
            [EV.PLAYER_JUMP, () => this.play(AUDIO.SFX.JUMP)],
            [EV.PLAYER_LAND, this.onLand],
            [EV.COIN_COLLECT, this.onCoin],
            [EV.LIFE_GAIN, () => this.play(AUDIO.SFX.LIFE)],
            [EV.PLAYER_GROW, () => this.play(AUDIO.SFX.GROW)],
            [EV.PLAYER_SHRINK, () => this.play(AUDIO.SFX.SHRINK)],
            [EV.CHECKPOINT_REACH, () => this.play(AUDIO.SFX.CHECKPOINT)],
            [EV.PLAYER_DIE, () => this.play(AUDIO.SFX.DIE)],
            [EV.LEVEL_COMPLETE, () => this.play(AUDIO.SFX.GOAL)],
            [EV.GAME_OVER, () => this.play(AUDIO.SFX.GAME_OVER)],
            [EV.PLAYER_MEOW, () => this.play(AUDIO.SFX.MEOW)],
            [EV.PLAYER_GRAB, () => this.play(AUDIO.SFX.GRAB)],
            [EV.PLAYER_CLIMB_STEP, () => this.play(AUDIO.SFX.CLIMB)],
            [EV.ENEMY_SCARE, () => this.play(AUDIO.SFX.SCARE)],
            [EV.PLAYER_CLAW, () => this.play(AUDIO.SFX.CLAW)],
            [EV.ENEMY_FLEE, () => this.play(AUDIO.SFX.FLEE)],
            [EV.SNAKE_WARN, (p: { x: number; y: number }) => this.playNear(AUDIO.SFX.HISS, p)],
            [EV.SNAKE_SPRAY, (p: { x: number; y: number }) => this.playNear(AUDIO.SFX.SPRAY, p)],
            [EV.STALACTITE_SHAKE, (p: { x: number; y: number }) => this.playNear(AUDIO.SFX.RUMBLE, p)],
            [EV.STALACTITE_SHATTER, (p: { x: number; y: number }) => this.playNear(AUDIO.SFX.SHATTER, p)],
            [EV.SECRET_REVEAL, () => this.play(AUDIO.SFX.SECRET)],
            [EV.TREASURE_COLLECT, () => this.play(AUDIO.SFX.TREASURE)],
            [EV.CRUMBLE_SHAKE, () => this.play(AUDIO.SFX.CRACK)],
            [EV.CRUMBLE_FALL, () => this.play(AUDIO.SFX.CRUMBLE)]
        ];
        for (const [name, fn] of this.handlers) events.on(name, fn, this);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            for (const [name, fn] of this.handlers) events.off(name, fn, this);
        });
    }

    private onLand ({ impact }: { impact: number }): void
    {
        // Same threshold as the dust: soft touchdowns (small steps) stay silent.
        if (impact < JUICE.LAND.minImpact) return;
        const strength = Phaser.Math.Clamp(impact / PLAYER_FEEL.maxFallSpeed, 0, 1);
        this.play(AUDIO.SFX.LAND, strength);
    }

    private onCoin ({ kind }: { kind: FeatherKind }): void
    {
        const now = this.scene.time.now;
        const { windowMs, stepCents, maxSteps } = AUDIO.COIN_COMBO;
        this.comboSteps = now - this.lastCoinMs <= windowMs ? Math.min(this.comboSteps + 1, maxSteps) : 0;
        this.lastCoinMs = now;
        this.play(AUDIO.SFX.COIN, 1, AUDIO.FEATHER_PITCH[kind] + this.comboSteps * stepCents);
    }

    /** Sounds of a source that repeats on its own (a snake's cycle): only while it is on screen, or near it. */
    private playNear (sfx: Sfx, { x, y }: { x: number; y: number }): void
    {
        if (nearView(this.scene.cameras.main, x, y)) this.play(sfx);
    }

    private play (sfx: Sfx, volumeScale = 1, detune = 0): void
    {
        const spread = sfx.detune ? Phaser.Math.Between(-sfx.detune, sfx.detune) : 0;
        this.scene.sound.play(sfx.key, { volume: sfx.volume * volumeScale, detune: detune + spread });
        sfxLog.push(sfx.key);
        if (sfxLog.length > AUDIO.LOG_SIZE) sfxLog.shift();
    }
}
