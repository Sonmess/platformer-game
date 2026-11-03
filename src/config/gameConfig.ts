import Phaser from 'phaser';
import { GAME } from './constants';
import { Boot } from '../scenes/Boot';
import { Game } from '../scenes/Game';

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
        arcade: { gravity: { x: 0, y: 0 }, debug: false }
    },
    scene: [Boot, Game]
};
