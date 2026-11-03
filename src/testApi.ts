import type Phaser from 'phaser';
import type { Game } from './scenes/Game';
import { virtualKeys, type VirtualKey } from './systems/Input';

// Dev-only contract between the game and automated checks (see references/qa.md).
// Every new mechanic adds its observable state here, additively; never remove fields.
export interface GameState {
    scene: string;
    fps: number;
    player: { x: number; y: number; vx: number; vy: number; onGround: boolean } | null;
    level: { width: number; height: number } | null;
}

export interface GameTestApi {
    game: Phaser.Game;
    getState(): GameState;
    /** Hold virtual inputs for `ms` of game time, then release. */
    press(keys: VirtualKey[], ms: number): Promise<void>;
    teleport(x: number, y: number): void;
}

declare global {
    interface Window { __game?: GameTestApi }
}

export function installTestApi (game: Phaser.Game): void
{
    const gameScene = () => game.scene.getScene('Game') as Game;

    window.__game = {
        game,
        getState: () => {
            const p = gameScene()?.player;
            const map = gameScene()?.map;
            return {
                scene: game.scene.getScenes(true)[0]?.scene.key ?? '',
                fps: game.loop.actualFps,
                player: p?.body ? {
                    x: p.x, y: p.y,
                    vx: p.body.velocity.x, vy: p.body.velocity.y,
                    onGround: p.onGround
                } : null,
                level: map ? { width: map.widthInPixels, height: map.heightInPixels } : null
            };
        },
        press: (keys, ms) => new Promise(resolve => {
            keys.forEach(k => virtualKeys.add(k));
            gameScene().time.delayedCall(ms, () => {
                keys.forEach(k => virtualKeys.delete(k));
                resolve();
            });
        }),
        teleport: (x, y) => gameScene().player.teleport(x, y)
    };
}
