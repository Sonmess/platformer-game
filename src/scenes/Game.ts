import Phaser, { Scene } from 'phaser';
import { GREYBOX, LEVEL, PLAYER } from '../config/constants';
import { Player } from '../entities/Player';
import { Input } from '../systems/Input';

export class Game extends Scene
{
    player: Player;
    map: Phaser.Tilemaps.Tilemap;
    private controls: Input;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.map = this.make.tilemap({ key: LEVEL.MAP_KEY });
        const tileset = this.map.addTilesetImage(LEVEL.TILESET_NAME, GREYBOX.TEXTURE_KEY)!;
        const ground = this.map.createLayer(LEVEL.GROUND_LAYER, tileset) as Phaser.Tilemaps.TilemapLayer;
        ground.setCollisionByProperty({ collides: true });

        const { widthInPixels: w, heightInPixels: h } = this.map;
        this.physics.world.setBounds(0, 0, w, h);

        const spawn = this.map.findObject(LEVEL.OBJECT_LAYER, o => o.name === LEVEL.SPAWN_OBJECT)!;
        this.player = new Player(this, spawn.x!, spawn.y! - PLAYER.HEIGHT / 2);
        this.physics.add.collider(this.player, ground);
        this.controls = new Input(this);

        // Minimal follow so the whole level is playable; deadzone and look-ahead come in step 3.
        this.cameras.main.setBounds(0, 0, w, h);
        this.cameras.main.startFollow(this.player, true);
    }

    update ()
    {
        this.player.update(this.controls.read());
    }
}
