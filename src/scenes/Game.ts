import Phaser, { Scene } from 'phaser';
import { GREYBOX, HAZARD, LEVEL, PLAYER, TILE } from '../config/constants';
import { EV, events, type DeathCause } from '../core/events';
import { state } from '../core/state';
import { Checkpoint } from '../entities/Checkpoint';
import { Coin } from '../entities/Coin';
import { Goal } from '../entities/Goal';
import { Player } from '../entities/Player';
import { CameraRig } from '../systems/CameraRig';
import { Input } from '../systems/Input';

export class Game extends Scene
{
    player: Player;
    map: Phaser.Tilemaps.Tilemap;
    private controls: Input;
    private cameraRig: CameraRig;
    private checkpoints: Checkpoint[] = [];
    coins: Phaser.Physics.Arcade.StaticGroup;
    private lastDeathFrame = -1;
    private completed = false;

    constructor ()
    {
        super('Game');
    }

    init ()
    {
        this.lastDeathFrame = -1;
        this.completed = false;
    }

    create ()
    {
        this.map = this.make.tilemap({ key: LEVEL.MAP_KEY });
        const tileset = this.map.addTilesetImage(LEVEL.TILESET_NAME, GREYBOX.TEXTURE_KEY)!;
        const ground = this.map.createLayer(LEVEL.GROUND_LAYER, tileset) as Phaser.Tilemaps.TilemapLayer;
        ground.setCollisionByProperty({ collides: true });

        const { widthInPixels: w, heightInPixels: h } = this.map;
        this.physics.world.setBounds(0, 0, w, h);
        this.physics.world.setBoundsCollision(true, true, true, false);    // open bottom: pits kill

        const spawn = this.map.findObject(LEVEL.OBJECT_LAYER, o => o.name === LEVEL.SPAWN_OBJECT)!;
        const coinObjects = this.objectsOfType(LEVEL.COIN_TYPE);
        state.reset(1, { x: spawn.x!, y: spawn.y! }, coinObjects.length);

        this.player = new Player(this, spawn.x!, spawn.y! - PLAYER.HEIGHT / 2);
        this.physics.add.collider(this.player, ground);
        this.physics.add.overlap(this.player, this.createSpikes(), () => this.killPlayer('spikes'));
        this.physics.add.overlap(this.player, this.createCheckpoints(), (_p, cp) => this.reachCheckpoint(cp as Checkpoint));

        this.coins = this.physics.add.staticGroup(coinObjects.map(o => new Coin(this, o.x!, o.y!)));
        this.physics.add.overlap(this.player, this.coins, (_p, coin) => this.collectCoin(coin as Coin));
        this.physics.add.overlap(this.player, this.createGoals(), () => this.completeLevel());

        this.controls = new Input(this);
        this.cameraRig = new CameraRig(this.cameras.main, this.player, { width: w, height: h });
        this.cameraRig.snap();     // the camera survives scene restarts; never start from the old scroll

        this.scene.launch('Hud');
    }

    update (_time: number, delta: number)
    {
        if (this.completed) return;
        state.timeMs += delta;
        this.player.update(this.controls.read(), delta);
        if (this.player.y - PLAYER.HEIGHT / 2 > this.map.heightInPixels + HAZARD.FALL_MARGIN) this.killPlayer('pit');
        this.cameraRig.update(delta);
    }

    private objectsOfType (type: string)
    {
        return this.map.getObjectLayer(LEVEL.OBJECT_LAYER)!.objects.filter(o => o.type === type);
    }

    private createSpikes (): Phaser.Physics.Arcade.StaticGroup
    {
        const group = this.physics.add.staticGroup();
        const g = this.add.graphics().fillStyle(HAZARD.SPIKE_COLOR);
        const toothW = TILE / HAZARD.SPIKE_TEETH_PER_TILE;

        for (const o of this.objectsOfType(LEVEL.SPIKES_TYPE)) {
            const x = o.x!, y = o.y!, w = o.width!, h = o.height!;
            for (let tx = x; tx < x + w; tx += toothW) {
                g.fillTriangle(tx, y + h, tx + toothW / 2, y, tx + toothW, y + h);
            }
            const zone = this.add.zone(x + HAZARD.SPIKE_INSET_X, y + HAZARD.SPIKE_INSET_TOP,
                w - 2 * HAZARD.SPIKE_INSET_X, h - HAZARD.SPIKE_INSET_TOP).setOrigin(0);
            group.add(zone);
        }
        return group;
    }

    private createCheckpoints (): Checkpoint[]
    {
        this.checkpoints = this.objectsOfType(LEVEL.CHECKPOINT_TYPE)
            .map(o => new Checkpoint(this, o.x!, o.y!, o.width!, o.height!));
        return this.checkpoints;
    }

    private reachCheckpoint (cp: Checkpoint): void
    {
        if (cp.current) return;
        this.checkpoints.forEach(c => c.setCurrent(c === cp));
        state.checkpoint = { ...cp.respawn };
        events.emit(EV.CHECKPOINT_REACH, { ...cp.respawn });
    }

    private createGoals (): Goal[]
    {
        return this.objectsOfType(LEVEL.GOAL_TYPE).map(o => new Goal(this, o.x!, o.y!, o.width!, o.height!));
    }

    private completeLevel (): void
    {
        if (this.completed) return;
        this.completed = true;
        events.emit(EV.LEVEL_COMPLETE, { coins: state.coins, coinsTotal: state.coinsTotal, deaths: state.deaths, timeMs: state.timeMs });
        this.scene.stop('Hud');
        this.scene.start('LevelComplete');
    }

    private collectCoin (coin: Coin): void
    {
        const { x, y } = coin;
        this.coins.remove(coin, true, true);
        state.coins++;
        events.emit(EV.COIN_COLLECT, { x, y, coins: state.coins, coinsTotal: state.coinsTotal });
    }

    private killPlayer (cause: DeathCause): void
    {
        // Overlapping several hazards in one step must count as a single death.
        if (this.game.loop.frame === this.lastDeathFrame) return;
        this.lastDeathFrame = this.game.loop.frame;

        state.deaths++;
        events.emit(EV.PLAYER_DIE, { x: this.player.x, y: this.player.y, cause });

        const { x, y } = state.checkpoint;
        this.player.respawn(x, y);
        this.cameraRig.snap();
        events.emit(EV.PLAYER_RESPAWN, { x, y });
    }
}
