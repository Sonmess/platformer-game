import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';
import { installTestApi } from './testApi';

const game = new Phaser.Game(gameConfig);

if (import.meta.env.DEV) {
    installTestApi(game);
}
