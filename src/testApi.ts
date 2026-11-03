import type Phaser from 'phaser';

// Dev-only contract between the game and automated checks (see references/qa.md).
// Every new mechanic adds its observable state here — additively, never remove fields.
export interface GameState {
    scene: string;
    fps: number;
}

export interface GameTestApi {
    game: Phaser.Game;
    getState(): GameState;
}

declare global {
    interface Window { __game?: GameTestApi }
}

export function installTestApi (game: Phaser.Game): void
{
    window.__game = {
        game,
        getState: () => ({
            scene: game.scene.getScenes(true)[0]?.scene.key ?? '',
            fps: game.loop.actualFps
        })
    };
}
