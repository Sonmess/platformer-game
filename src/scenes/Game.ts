import Phaser, { Scene } from 'phaser';
import { ASSETS, HAZARD, LEVEL, PLATFORM, PLAYER, TILE, TITLE } from '../config/constants';
import { EV, events, type DeathCause } from '../core/events';
import { inMeowRange, type MeowWave } from '../core/meow';
import { state } from '../core/state';
import { Checkpoint } from '../entities/Checkpoint';
import { Coin } from '../entities/Coin';
import { Crow } from '../entities/Crow';
import type { Enemy } from '../entities/Enemy';
import { Goal } from '../entities/Goal';
import { Hedgehog } from '../entities/Hedgehog';
import { MovingPlatform } from '../entities/MovingPlatform';
import { Player } from '../entities/Player';
import { SoundEffects } from '../systems/Audio';
import { CameraRig } from '../systems/CameraRig';
import { Effects } from '../systems/Effects';
import { Input } from '../systems/Input';
import { music } from '../systems/Music';
import { Parallax } from '../systems/Parallax';

export class Game extends Scene
{
    player: Player;
    map: Phaser.Tilemaps.Tilemap;
    private controls: Input;
    private cameraRig: CameraRig;
    parallax: Parallax;
    effects: Effects;
    checkpoints: Checkpoint[] = [];
    enemies: Enemy[] = [];
    platforms: MovingPlatform[] = [];
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
        this.parallax = new Parallax(this);

        this.map = this.make.tilemap({ key: LEVEL.MAP_KEY });
        const tileset = this.map.addTilesetImage(LEVEL.TILESET_NAME, ASSETS.TILESET.key)!;
        this.map.createLayer(LEVEL.DECOR_LAYER, tileset);
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
        this.platforms = this.objectsOfType(LEVEL.PLATFORM_TYPE).map(o => new MovingPlatform(this, { x: o.x!, y: o.y!, width: o.width!, height: o.height! },
            (o.properties as { name: string; value: number }[] | undefined)?.find(p => p.name === PLATFORM.TILES_PROPERTY)?.value ?? PLATFORM.DEFAULT_TILES));
        this.physics.add.collider(this.player, this.platforms, (_p, platform) => this.player.standOnPlatform(platform as MovingPlatform));
        this.physics.add.overlap(this.player, this.createSpikes(), () => this.killPlayer('spikes'));
        this.physics.add.overlap(this.player, this.createCheckpoints(), (_p, cp) => this.reachCheckpoint(cp as Checkpoint));

        this.coins = this.physics.add.staticGroup(coinObjects.map(o => new Coin(this, o.x!, o.y!)));
        this.physics.add.overlap(this.player, this.coins, (_p, coin) => this.collectCoin(coin as Coin));
        this.physics.add.overlap(this.player, this.createGoals(), () => this.completeLevel());

        const rect = (o: Phaser.Types.Tilemaps.TiledObject) => ({ x: o.x!, y: o.y!, width: o.width!, height: o.height! });
        const hedgehogs = this.objectsOfType(LEVEL.HEDGEHOG_TYPE).map(o => new Hedgehog(this, rect(o), ground));
        const crows = this.objectsOfType(LEVEL.CROW_TYPE).map(o => new Crow(this, rect(o)));
        this.enemies = [...hedgehogs, ...crows];
        this.physics.add.collider(hedgehogs, ground);     // crows fly a fixed path
        this.physics.add.overlap(this.player, this.enemies, (_p, e) => { if ((e as Enemy).harmful) this.killPlayer('enemy'); });
        // A meow scares every enemy within its reach (enemies never read the player directly).
        const onMeow = (wave: MeowWave) => this.enemies.forEach(e => { if (inMeowRange(wave, e.body.center)) e.scare(); });
        events.on(EV.PLAYER_MEOW, onMeow);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => events.off(EV.PLAYER_MEOW, onMeow));

        // Juice and sound only listen to events; the game plays the same without them.
        new SoundEffects(this);
        this.effects = new Effects(this, this.player);
        this.controls = new Input(this);
        music.start(this);
        this.cameraRig = new CameraRig(this.cameras.main, this.player, { width: w, height: h });
        this.cameraRig.snap();     // the camera survives scene restarts; never start from the old scroll
        this.cameras.main.fadeIn(TITLE.FADE_MS);

        this.scene.launch('Hud');

        // Keys pressed while paused (the Esc/P that resumed, a jump) must not act once play continues.
        const onResume = () => this.controls.reset();
        this.events.on(Phaser.Scenes.Events.RESUME, onResume);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.RESUME, onResume));
    }

    update (_time: number, delta: number)
    {
        if (this.completed) return;
        const input = this.controls.read();
        music.handleKeys(input);
        if (input.pausePressed) {
            this.scene.launch('Pause');
            this.scene.pause();     // freezes physics, timers, tweens, animations and particles
            this.scene.pause('Hud');    // the meow refill bar runs on the Hud's clock
            return;
        }
        state.timeMs += delta;
        this.player.update(input, delta);
        if (this.player.body.top > this.map.heightInPixels + HAZARD.FALL_MARGIN) this.killPlayer('pit');
        this.cameraRig.update(delta);
        const playerBounds = this.player.getBounds();
        for (const enemy of this.enemies) enemy.update(delta, playerBounds);
    }

    private objectsOfType (type: string)
    {
        return this.map.getObjectLayer(LEVEL.OBJECT_LAYER)!.objects.filter(o => o.type === type);
    }

    private createSpikes (): Phaser.Physics.Arcade.StaticGroup
    {
        const group = this.physics.add.staticGroup();

        for (const o of this.objectsOfType(LEVEL.SPIKES_TYPE)) {
            const x = o.x!, y = o.y!, w = o.width!, h = o.height!;
            // One spike image per tile, standing on the tile's bottom edge.
            for (let tx = x; tx < x + w; tx += TILE) {
                this.add.image(tx + TILE / 2, y + h, ASSETS.SPIKES.key).setOrigin(0.5, 1);
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
