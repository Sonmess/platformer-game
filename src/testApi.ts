import Phaser from 'phaser';
import { AUDIO } from './config/constants';
import { state } from './core/state';
import type { Game } from './scenes/Game';
import type { Hud } from './scenes/Hud';
import type { LevelComplete } from './scenes/LevelComplete';
import type { Title } from './scenes/Title';
import { EV, events } from './core/events';
import { sfxLog } from './systems/Audio';
import { music } from './systems/Music';
import { virtualKeys, type VirtualKey } from './systems/Input';

// Dev-only contract between the game and automated checks (see references/qa.md).
// Every new mechanic adds its observable state here, additively; never remove fields.
export interface GameState {
    scene: string;
    fps: number;
    player: { x: number; y: number; vx: number; vy: number; onGround: boolean; anim: string; flipX: boolean } | null;
    level: { width: number; height: number } | null;
    camera: { scrollX: number; scrollY: number; width: number; height: number } | null;
    deaths: number;
    coins: number;
    coinsTotal: number;
    /** Coins still in the level. */
    coinsLeft: number;
    hud: { coinsText: string } | null;
    /** Respawn point at the player's feet. */
    checkpoint: { x: number; y: number };
    /** Per checkpoint (level order): is its campfire burning? */
    campfiresLit: boolean[];
    timeMs: number;
    /** Background layers, far to near: texture offset in px (= camera scrollX × factor, rounded). */
    parallax: { key: string; factor: number; offsetX: number }[];
    /** Parallax FOLLOW_UPDATE listeners on the main camera; must stay 1 across restarts. */
    parallaxListeners: number;
    /** Juice: live particles, the visible cat's scale (squash & stretch), camera shake running. */
    effects: { particles: number; catScaleX: number; catScaleY: number; shaking: boolean } | null;
    /** Background loop: playing, M-muted, ducked by the pause, current volume, and how many copies exist. */
    music: { playing: boolean; muted: boolean; ducked: boolean; volume: number; instances: number };
    /** Keys of recently played sound effects, newest last. */
    sfx: string[];
    /** The level is frozen under the pause overlay. */
    paused: boolean;
    /** While the title screen is shown: background scroll (px) and the blinking prompt. */
    title: { scrollX: number; promptVisible: boolean } | null;
    /** Result lines while the LevelComplete screen is shown. */
    results: string[] | null;
    /** Event-bus subscriber counts; must not grow across restarts (listener leaks). */
    listeners: Record<string, number>;
}

export interface GameTestApi {
    game: Phaser.Game;
    getState(): GameState;
    /** Hold virtual inputs for `ms` of game time, then release. */
    press(keys: VirtualKey[], ms: number): Promise<void>;
    teleport(x: number, y: number): void;
    /** Resolve after `ms` of game time (robust when the machine or the tab runs slowly). */
    wait(ms: number): Promise<void>;
}

declare global {
    interface Window { __game?: GameTestApi }
}

export function installTestApi (game: Phaser.Game): void
{
    const gameScene = () => game.scene.getScene('Game') as Game;
    // No fallback: while Preload is still loading no scene is running, and that must not read as 'Game'.
    const activeScene = () => game.scene.getScenes(true).find(s => s.scene.key !== 'Hud');

    // Timers run on the game loop, not a scene clock: a press that restarts a scene must still resolve.
    // The loop stops when the tab is hidden, so this is game time, not wall-clock time.
    const afterGameTime = (ms: number, done: () => void) => {
        let elapsed = 0;
        const step = (_time: number, delta: number) => {
            elapsed += delta;
            if (elapsed < ms) return;
            game.events.off(Phaser.Core.Events.STEP, step);
            done();
        };
        game.events.on(Phaser.Core.Events.STEP, step);
    };

    window.__game = {
        game,
        getState: () => {
            // Game objects are destroyed while Game is stopped (e.g. on the results screen); paused, they stay.
            const gs = gameScene();
            const g = gs?.sys.isActive() || gs?.sys.isPaused() ? gs : null;
            const p = g?.player;
            const map = g?.map;
            const cam = g?.cameras.main;
            const hud = game.scene.getScene('Hud') as Hud | null;
            const results = game.scene.getScene('LevelComplete') as LevelComplete | null;
            const title = game.scene.getScene('Title') as Title | null;
            return {
                scene: activeScene()?.scene.key ?? '',
                fps: game.loop.actualFps,
                player: p?.body ? {
                    x: p.x, y: p.y,
                    vx: p.body.velocity.x, vy: p.body.velocity.y,
                    onGround: p.onGround,
                    anim: p.anim,
                    flipX: p.sprite.flipX
                } : null,
                level: map ? { width: map.widthInPixels, height: map.heightInPixels } : null,
                camera: cam ? { scrollX: cam.scrollX, scrollY: cam.scrollY, width: cam.width, height: cam.height } : null,
                deaths: state.deaths,
                coins: state.coins,
                coinsTotal: state.coinsTotal,
                coinsLeft: g?.coins.countActive() ?? 0,
                hud: hud?.sys.isActive() ? { coinsText: hud.coinsLabel } : null,
                checkpoint: { ...state.checkpoint },
                campfiresLit: g?.checkpoints.map(c => c.lit) ?? [],
                timeMs: state.timeMs,
                parallax: g?.parallax.layers.map(({ sprite, def }) => ({ key: def.key, factor: def.factor, offsetX: sprite.tilePositionX })) ?? [],
                parallaxListeners: cam?.listenerCount(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE) ?? 0,
                effects: g && p ? { particles: g.effects.particles, catScaleX: p.sprite.scaleX, catScaleY: p.sprite.scaleY, shaking: cam!.shakeEffect.isRunning } : null,
                sfx: [...sfxLog],
                music: { ...music.state, instances: game.sound.getAll(AUDIO.MUSIC.key).length },
                paused: gs?.sys.isPaused() ?? false,
                title: title?.sys.isActive() ? { scrollX: title.scrollX, promptVisible: title.promptVisible } : null,
                results: results?.sys.isActive() ? [...results.lines] : null,
                listeners: Object.fromEntries(Object.values(EV).map(e => [e, events.listenerCount(e)]))
            };
        },
        press: (keys, ms) => new Promise(resolve => {
            keys.forEach(k => virtualKeys.add(k));
            afterGameTime(ms, () => {
                keys.forEach(k => virtualKeys.delete(k));
                resolve();
            });
        }),
        teleport: (x, y) => gameScene().player.teleport(x, y),
        wait: ms => new Promise(resolve => {
            afterGameTime(ms, resolve);
        })
    };
}
