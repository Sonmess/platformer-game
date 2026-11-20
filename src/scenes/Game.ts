import Phaser, { Scene } from 'phaser';
import { ASSETS, COIN, DEATH, GROUND_TILES, HAZARD, LEVEL, LEVELS, PLATFORM, PLAYER, PROGRESS, SECRET, STALACTITE, TILE, TITLE, levelDef, levelNumber, type LevelDef } from '../config/constants';
import { EV, events, type DeathCause } from '../core/events';
import { clawHits, clawOutcome, type ClawSwipe } from '../core/claw';
import { inMeowRange, type MeowWave } from '../core/meow';
import { state, type LevelEntry } from '../core/state';
import { browserStore, loadFound, saveFound, unlockLevel } from '../core/progress';
import { tileVariant } from '../core/tiles';
import { CaveExit } from '../entities/CaveExit';
import { Checkpoint } from '../entities/Checkpoint';
import { Climbable } from '../entities/Climbable';
import { Coin } from '../entities/Coin';
import { Crow } from '../entities/Crow';
import { CrumblePlatform, bakeCrumbleTextures, crumbleTexturePrefix } from '../entities/CrumblePlatform';
import type { Enemy } from '../entities/Enemy';
import { Goal } from '../entities/Goal';
import { Hedgehog } from '../entities/Hedgehog';
import { Snake } from '../entities/Snake';
import { Stalactite } from '../entities/Stalactite';
import { Secret } from '../entities/Secret';
import { Treasure } from '../entities/Treasure';
import { Yarn } from '../entities/Yarn';
import { MovingPlatform, bakePlatformTextures, platformTexturePrefix } from '../entities/MovingPlatform';
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
    crumbles: CrumblePlatform[] = [];
    climbables: Climbable[] = [];
    stalactites: Stalactite[] = [];
    secrets: Secret[] = [];
    treasures: Phaser.Physics.Arcade.StaticGroup;
    /** The level's way out drawn around the goal, if it has one (the cave). */
    exit: CaveExit | null = null;
    coins: Phaser.Physics.Arcade.StaticGroup;
    yarns: Phaser.Physics.Arcade.StaticGroup;
    /** The level being played (1-based) and its definition. */
    level = 1;
    private def: LevelDef;
    private completed = false;
    /** Time left of the death animation before the cat reappears at the checkpoint (0 = not dying). */
    private respawnInMs = 0;

    constructor ()
    {
        super('Game');
    }

    init (data?: { level?: number; entry?: LevelEntry })
    {
        this.level = levelNumber(data?.level ?? 1);
        state.enter(data?.entry ?? 'new');
        this.def = levelDef(this.level);
        this.completed = false;
        this.respawnInMs = 0;
    }

    create ()
    {
        const def = this.def;
        this.parallax = new Parallax(this, def.parallax, def.skyColor);

        this.map = this.make.tilemap({ key: def.map });
        const tileset = this.map.addTilesetImage(this.map.tilesets[0].name, def.tiles.key)!;
        // Platform looks come from this level's tiles; baked once per level (textures outlive restarts).
        const platformPrefix = platformTexturePrefix(def.map), crumblePrefix = crumbleTexturePrefix(def.map);
        bakePlatformTextures(this.textures, def.tiles.key, platformPrefix);
        bakeCrumbleTextures(this.textures, def.crumble.key, crumblePrefix);
        this.map.createLayer(LEVEL.DECOR_LAYER, tileset);
        const ground = this.map.createLayer(LEVEL.GROUND_LAYER, tileset) as Phaser.Tilemaps.TilemapLayer;
        ground.setCollisionByProperty({ collides: true });
        // Variety: swap plain tiles for their variants (after the collision setup; a tile keeps its collision flags).
        ground.forEachTile(t => { t.index = tileVariant(t.index, t.x, t.y, GROUND_TILES.VARIANTS, GROUND_TILES.PLAIN_SHARE); });

        const { widthInPixels: w, heightInPixels: h } = this.map;
        this.physics.world.setBounds(0, 0, w, h);
        this.physics.world.setBoundsCollision(true, true, true, false);    // open bottom: pits kill

        const spawn = this.map.findObject(LEVEL.OBJECT_LAYER, o => o.name === LEVEL.SPAWN_OBJECT)!;
        const coinObjects = this.objectsOfType(LEVEL.COIN_TYPE);
        const valueOf = (o: Phaser.Types.Tilemaps.TiledObject) =>
            (o.properties as { name: string; value: number }[] | undefined)?.find(p => p.name === COIN.VALUE_PROPERTY)?.value ?? 1;
        const treasureObjects = this.objectsOfType(LEVEL.TREASURE_TYPE);
        state.reset(this.level, { x: spawn.x!, y: spawn.y! }, coinObjects.length, coinObjects.reduce((sum, o) => sum + valueOf(o), 0), treasureObjects.length);

        // Vines and trunks first: they are drawn behind everything that moves.
        const rect = (o: Phaser.Types.Tilemaps.TiledObject) => ({ x: o.x!, y: o.y!, width: o.width!, height: o.height! });
        this.climbables = [
            ...this.objectsOfType(LEVEL.TRUNK_TYPE).map(o => new Climbable(this, 'trunk', rect(o))),
            ...this.objectsOfType(LEVEL.VINE_TYPE).map(o => new Climbable(this, 'vine', rect(o)))
        ];

        this.player = new Player(this, spawn.x!, spawn.y! - PLAYER.HEIGHT / 2);
        this.player.climbables = this.climbables;
        this.physics.add.collider(this.player, ground);
        this.platforms = this.objectsOfType(LEVEL.PLATFORM_TYPE).map(o => new MovingPlatform(this, { x: o.x!, y: o.y!, width: o.width!, height: o.height! },
            (o.properties as { name: string; value: number }[] | undefined)?.find(p => p.name === PLATFORM.TILES_PROPERTY)?.value ?? PLATFORM.DEFAULT_TILES, platformPrefix));
        this.physics.add.collider(this.player, this.platforms, (_p, platform) => this.player.standOnPlatform(platform as MovingPlatform));
        this.crumbles = this.objectsOfType(LEVEL.CRUMBLE_TYPE).map(o => new CrumblePlatform(this, { x: o.x!, y: o.y!, width: o.width! }, crumblePrefix, () => this.player.getBounds()));
        this.physics.add.collider(this.player, this.crumbles,
            (_p, c) => { if (this.player.standOnPlatform(c as CrumblePlatform)) (c as CrumblePlatform).touch(); },
            (_p, c) => (c as CrumblePlatform).solid);     // a fallen one lets the cat through
        this.physics.add.overlap(this.player, this.createSpikes(), () => this.killPlayer('spikes'));
        this.physics.add.overlap(this.player, this.createCheckpoints(), (_p, cp) => this.reachCheckpoint(cp as Checkpoint));

        this.coins = this.physics.add.staticGroup(coinObjects.map(o => new Coin(this, o.x!, o.y!, valueOf(o))));
        this.physics.add.overlap(this.player, this.coins, (_p, coin) => this.collectCoin(coin as Coin));
        this.physics.add.overlap(this.player, this.createGoals(), () => this.completeLevel());
        this.yarns = this.physics.add.staticGroup(this.objectsOfType(LEVEL.YARN_TYPE).map(o => new Yarn(this, o.x!, o.y!)));
        this.physics.add.overlap(this.player, this.yarns, (_p, y) => this.collectYarn(y as Yarn));

        // Secret rooms: fake rock (no collision) that only a small cat squeezes into; golden fish inside.
        this.secrets = this.objectsOfType(LEVEL.SECRET_TYPE).map(o => new Secret(this, { x: o.x!, y: o.y!, width: o.width!, height: o.height! }, ground,
            (o.properties as { name: string; value: string }[] | undefined)?.find(p => p.name === SECRET.ENTRANCE_PROPERTY)?.value === 'left' ? 'left' : 'right'));
        this.physics.add.collider(this.player, this.secrets.map(s => s.barrier), undefined, () => this.player.big);
        const found = loadFound(browserStore(), PROGRESS.TREASURES_KEY);
        this.treasures = this.physics.add.staticGroup(treasureObjects.map((o, i) => {
            const id = `${def.map}:${i}`;
            return new Treasure(this, o.x!, o.y!, id, found.includes(id));
        }));
        this.physics.add.overlap(this.player, this.treasures, (_p, t) => this.collectTreasure(t as Treasure));

        // Stalactites fall to the first solid tile below them (or out of the level over a pit).
        this.stalactites = this.objectsOfType(LEVEL.STALACTITE_TYPE).map(o => new Stalactite(this, o.x!, o.y!, this.fallDistance(ground, o.x!, o.y! + STALACTITE.SPRITE_HEIGHT)));
        const hedgehogs = this.objectsOfType(LEVEL.HEDGEHOG_TYPE).map(o => new Hedgehog(this, rect(o), ground));
        const crows = this.objectsOfType(LEVEL.CROW_TYPE).map(o => new Crow(this, rect(o)));
        const snakes = this.objectsOfType(LEVEL.SNAKE_TYPE).map(o => new Snake(this, rect(o), ground));
        this.enemies = [...hedgehogs, ...crows, ...snakes];
        this.physics.add.collider([...hedgehogs, ...snakes], ground);     // crows fly a fixed path
        this.physics.add.overlap(this.player, this.enemies, (_p, e) => { if ((e as Enemy).harmful) this.killPlayer('enemy'); });
        // A meow scares every enemy within its reach (enemies never read the player directly).
        const onMeow = (wave: MeowWave) => this.enemies.forEach(e => { if (!e.gone && inMeowRange(wave, e.body.center)) e.scare(); });
        events.on(EV.PLAYER_MEOW, onMeow);
        events.on(EV.PLAYER_CLAW, this.onClaw, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            events.off(EV.PLAYER_MEOW, onMeow);
            events.off(EV.PLAYER_CLAW, this.onClaw, this);
        });

        // Juice and sound only listen to events; the game plays the same without them.
        new SoundEffects(this);
        this.effects = new Effects(this, this.player);
        this.controls = new Input(this);
        music.start(this, def.music);     // crossfades when the level's track differs
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
        if (this.player.dying) {
            // The controls are off; the world goes on while the death animation plays.
            this.respawnInMs -= delta;
            if (this.respawnInMs <= 0) {
                if (state.gameOver) this.endGame();
                else this.respawnPlayer();
            }
        } else {
            this.player.update(input, delta);
            if (this.player.body.top > this.map.heightInPixels + HAZARD.FALL_MARGIN) this.killPlayer('pit');
            this.cameraRig.update(delta);
        }
        for (const crumble of this.crumbles) crumble.update(delta);
        const playerBounds = this.player.getBounds();
        for (const s of this.stalactites) s.update(delta, playerBounds);
        for (const s of this.secrets) s.update(delta, playerBounds);
        if (this.stalactites.some(s => s.hurts(playerBounds))) this.killPlayer('stalactite');
        for (const enemy of this.enemies) enemy.update(delta, playerBounds);
        if (this.enemies.some(e => e.poisons(playerBounds))) this.killPlayer('poison');
    }

    /** Pixels from `tipY` down to the top of the first colliding ground tile in column `x`; past the level over a pit. */
    private fallDistance (ground: Phaser.Tilemaps.TilemapLayer, x: number, tipY: number): number
    {
        const bottom = this.map.heightInPixels;
        for (let y = Math.floor(tipY / TILE) * TILE + TILE / 2; y < bottom; y += TILE) {
            const tile = ground.getTileAtWorldXY(x, y);
            if (tile?.collides && tile.pixelY >= tipY) return tile.pixelY - tipY;
        }
        return bottom + STALACTITE.FALL_OUT_PX - tipY;
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
        const goals = this.objectsOfType(LEVEL.GOAL_TYPE);
        const last = goals[goals.length - 1];
        this.exit = this.def.exit && last ? new CaveExit(this, this.def.exit.key, last.x! + last.width!, last.y! + last.height!) : null;
        return goals.map(o => new Goal(this, o.x!, o.y!, o.width!, o.height!));
    }

    /** No lives left: after the death animation, the "game over" screen instead of a respawn. */
    private endGame (): void
    {
        this.completed = true;
        events.emit(EV.GAME_OVER, { coins: state.coins, coinsTotal: state.coinsTotal, timeMs: state.timeMs });
        this.scene.stop('Hud');
        this.scene.start('GameOver');
    }

    private completeLevel (): void
    {
        if (this.completed) return;
        this.completed = true;
        unlockLevel(browserStore(), PROGRESS.STORAGE_KEY, this.level + 1, LEVELS.length);     // saved for the title screen
        events.emit(EV.LEVEL_COMPLETE, { coins: state.coins, coinsTotal: state.coinsTotal, deaths: state.deaths, timeMs: state.timeMs });
        this.scene.stop('Hud');
        this.scene.start('LevelComplete');
    }

    private collectCoin (coin: Coin): void
    {
        const { x, y, value, kind } = coin;
        this.coins.remove(coin, true, true);
        const lifeGained = state.collect(value);
        events.emit(EV.COIN_COLLECT, { x, y, value, kind, coins: state.coins, coinsTotal: state.coinsTotal, points: state.points });
        if (lifeGained) {
            events.emit(EV.LIFE_GAIN, { x: this.player.x, y: this.player.y });
            events.emit(EV.LIVES_CHANGE, { lives: state.lives });
        }
    }

    /** A golden fish: counted for this level and remembered in the browser for good. */
    private collectTreasure (treasure: Treasure): void
    {
        if (this.player.dying) return;
        const { x, y, id, foundBefore } = treasure;
        this.treasures.remove(treasure, true, true);
        state.treasures++;
        saveFound(browserStore(), PROGRESS.TREASURES_KEY, id);
        events.emit(EV.TREASURE_COLLECT, { x, y, id, firstTime: !foundBefore });
    }

    /** A yarn ball: the cat puffs up (already big: the ball is still taken). */
    private collectYarn (yarn: Yarn): void
    {
        if (this.player.dying) return;
        this.yarns.remove(yarn, true, true);
        if (this.player.big) return;
        this.player.grow();
        events.emit(EV.PLAYER_GROW, { x: this.player.x, y: this.player.y });
    }

    /** A claw swipe: every enemy it reaches flees, except an unscared hedgehog, whose spines prick the cat. */
    private onClaw (swipe: ClawSwipe): void
    {
        let pricked = false;
        for (const e of this.enemies) {
            if (e.gone || !clawHits(swipe, e.body)) continue;
            if (clawOutcome(e.spiky, e.scared) === 'flee') e.flee(swipe.dir);
            else pricked = true;
        }
        if (pricked) this.killPlayer('enemy');
    }

    private killPlayer (cause: DeathCause): void
    {
        // Already down (several hazards in one step count once), or just respawned (a pit still counts).
        if (this.player.dying || (this.player.invulnerable && cause !== 'pit')) return;
        // Big (yarn): a hit only shrinks the cat. A pit is always the end.
        if (this.player.big && cause !== 'pit') {
            this.player.shrink();
            events.emit(EV.PLAYER_SHRINK, { x: this.player.x, y: this.player.y, cause });
            return;
        }

        const lives = state.loseLife();
        events.emit(EV.PLAYER_DIE, { x: this.player.x, y: this.player.y, cause, lives });
        events.emit(EV.LIVES_CHANGE, { lives });
        this.player.die();
        this.cameraRig.hold();
        this.respawnInMs = DEATH.ANIM_MS;
    }

    /** After the death animation: back at the checkpoint, with every crumbling platform in place. */
    private respawnPlayer (): void
    {
        const { x, y } = state.checkpoint;
        this.player.respawn(x, y);
        this.crumbles.forEach(c => c.reset());
        this.stalactites.forEach(s => s.reset());
        this.cameraRig.resume();
        this.controls.reset();      // a key still held from before the death is not a new press
        events.emit(EV.PLAYER_RESPAWN, { x, y });
    }
}
