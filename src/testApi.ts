import Phaser from 'phaser';
import { state } from './core/state';
import type { Game } from './scenes/Game';
import type { Hud } from './scenes/Hud';
import type { LevelComplete } from './scenes/LevelComplete';
import { EV, events } from './core/events';
import { virtualKeys, type VirtualKey } from './systems/Input';

// Dev-only contract between the game and automated checks (see references/qa.md).
// Every new mechanic adds its observable state here, additively; never remove fields.
export interface GameState {
    scene: string;
    fps: number;
    player: { x: number; y: number; vx: number; vy: number; onGround: boolean } | null;
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
    timeMs: number;
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
    const activeScene = () => game.scene.getScenes(true).find(s => s.scene.key !== 'Hud') ?? gameScene();

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
            // Game objects are destroyed while Game is stopped (e.g. on the results screen).
            const g = gameScene()?.sys.isActive() ? gameScene() : null;
            const p = g?.player;
            const map = g?.map;
            const cam = g?.cameras.main;
            const hud = game.scene.getScene('Hud') as Hud | null;
            const results = game.scene.getScene('LevelComplete') as LevelComplete | null;
            return {
                scene: activeScene().scene.key,
                fps: game.loop.actualFps,
                player: p?.body ? {
                    x: p.x, y: p.y,
                    vx: p.body.velocity.x, vy: p.body.velocity.y,
                    onGround: p.onGround
                } : null,
                level: map ? { width: map.widthInPixels, height: map.heightInPixels } : null,
                camera: cam ? { scrollX: cam.scrollX, scrollY: cam.scrollY, width: cam.width, height: cam.height } : null,
                deaths: state.deaths,
                coins: state.coins,
                coinsTotal: state.coinsTotal,
                coinsLeft: g?.coins.countActive() ?? 0,
                hud: hud?.sys.isActive() ? { coinsText: hud.coinsLabel } : null,
                checkpoint: { ...state.checkpoint },
                timeMs: state.timeMs,
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
