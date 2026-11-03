import { Scene } from 'phaser';
import { GAME } from '../config/constants';

export class Game extends Scene
{
    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2, 'platformer-game', {
            fontFamily: 'monospace', fontSize: '16px', color: '#ffffff'
        }).setOrigin(0.5);
    }
}
