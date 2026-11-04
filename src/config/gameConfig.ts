import Phaser from 'phaser';
import { GAME, PHYSICS } from './constants';
import { Boot } from '../scenes/Boot';
import { Game } from '../scenes/Game';
import { Hud } from '../scenes/Hud';
import { LevelComplete } from '../scenes/LevelComplete';
import { Preload } from '../scenes/Preload';

export const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME.WIDTH,
    height: GAME.HEIGHT,
    parent: GAME.PARENT_ID,
    backgroundColor: GAME.BACKGROUND,
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: PHYSICS.gravity }, debug: false }
    },
    scene: [Boot, Preload, Game, Hud, LevelComplete]
};
