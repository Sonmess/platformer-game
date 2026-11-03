import { Scene } from 'phaser';
import { GREYBOX, LEVEL, TILE } from '../config/constants';
import level1 from '../levels/level1.json';

export class Preload extends Scene
{
    constructor ()
    {
        super('Preload');
    }

    preload ()
    {
        this.load.tilemapTiledJSON(LEVEL.MAP_KEY, level1);
    }

    create ()
    {
        this.bakeGreyboxTiles();
        this.scene.start('Game');
    }

    /** Two 16×16 tiles side by side: plain fill, and fill with a lighter top surface. */
    private bakeGreyboxTiles ()
    {
        const g = this.add.graphics();
        for (const [i, top] of [GREYBOX.FILL, GREYBOX.SURFACE].entries()) {
            const x = i * TILE;
            g.fillStyle(GREYBOX.EDGE).fillRect(x, 0, TILE, TILE);
            g.fillStyle(GREYBOX.FILL).fillRect(x + 1, 1, TILE - 2, TILE - 2);
            g.fillStyle(top).fillRect(x, 0, TILE, TILE / 4);
        }
        g.generateTexture(GREYBOX.TEXTURE_KEY, 2 * TILE, TILE);
        g.destroy();
    }
}
