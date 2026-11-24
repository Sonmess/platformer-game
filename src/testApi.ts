import Phaser from 'phaser';
import { PROGRESS, levelDef } from './config/constants';
import { browserStore, loadFound } from './core/progress';
import { state } from './core/state';
import type { Game } from './scenes/Game';
import type { Hud } from './scenes/Hud';
import type { LevelComplete } from './scenes/LevelComplete';
import type { Title } from './scenes/Title';
import { EV, events } from './core/events';
import { Snake } from './entities/Snake';
import { Bat } from './entities/Bat';
import { sfxLog } from './systems/Audio';
import { music } from './systems/Music';
import type { ClawSwipe } from './core/claw';
import type { MeowWave } from './core/meow';
import { virtualKeys, type VirtualKey } from './systems/Input';

// Dev-only contract between the game and automated checks (see references/qa.md).
// Every new mechanic adds its observable state here, additively; never remove fields.
export interface GameState {
    scene: string;
    fps: number;
    /** The level being (or last) played, 1-based, and its name. (`level` is the map size.) */
    levelNumber: number;
    levelName: string;
    /**
     * `dying`: the death animation plays (controls off); `invulnerable`: just respawned; `awaitingRelease`: the
     * arrows are ignored until let go. `spriteAlpha`/`spriteAngle` show the death and blink animations.
     */
    player: {
        x: number; y: number; vx: number; vy: number; onGround: boolean; anim: string; flipX: boolean; spriteX: number; spriteY: number;
        dying: boolean; invulnerable: boolean; awaitingRelease: boolean; spriteAlpha: number; spriteAngle: number;
        /** Puffed up by a yarn ball; `spriteScale` is the sprite's current x scale. */
        big: boolean; spriteScale: number;
        /** Holding on to a vine or trunk (gravity off), and which kind (null when not climbing). */
        climbing: boolean; climbKind: string | null;
    } | null;
    level: { width: number; height: number } | null;
    camera: { scrollX: number; scrollY: number; width: number; height: number } | null;
    deaths: number;
    /** Lives left (9 at the start of a run, game over at 0). */
    lives: number;
    coins: number;
    coinsTotal: number;
    /** Feather points (1 / 5 / 10 each) in this level and the level's total; `runPoints` = earlier levels of the run,
     *  `totalPoints` = both (the HUD shows it). */
    points: number;
    pointsTotal: number;
    runPoints: number;
    totalPoints: number;
    /** Coins still in the level. */
    coinsLeft: number;
    /** Yarn balls still in the level. */
    yarnsLeft: number;
    /** `livesShown`: cat heads in the top-right corner (one per life). */
    hud: { coinsText: string; meowReady: boolean; livesShown: number } | null;
    /** Meow: cooldown left (ms), how many meows this page has seen, and the last one's reach. */
    meow: { cooldownMs: number; count: number; last: MeowWave | null };
    /** Claw (C): cooldown left (ms), how many swipes this page has seen, and the last one's reach. */
    claw: { cooldownMs: number; count: number; last: ClawSwipe | null };
    /** Respawn point at the player's feet. */
    checkpoint: { x: number; y: number };
    /**
     * Enemies in level order: hitbox centre, facing, scared and how much fright is left (ms), harmful; `gone` = clawed
     * and fled (no hitbox until the level restarts), `spriteAlpha` fades as it runs off. Snakes only: `phase` of the
     * poison cycle (calm/warn/spray) and the poison `cloud` while it sprays; null for other enemies.
     */
    enemies: { kind: string; x: number; y: number; dir: number; scared: boolean; scaredMs: number; harmful: boolean; anim: string; gone: boolean; spriteAlpha: number; phase: string | null; cloud: { x: number; y: number; radius: number } | null }[];
    /** Moving platforms in level order: top-left corner and velocity. */
    platforms: { x: number; y: number; width: number; vx: number; vy: number; drawX: number; drawY: number }[];
    /** Crumbling platforms in level order: top-left corner, phase (solid/shaking/falling/gone) and the drawn image. */
    crumbles: { x: number; y: number; width: number; phase: string; solid: boolean; imageX: number; imageY: number; visible: boolean }[];
    /** Vines and trunks (trunks first, then vines, each in level order): the climbable rectangle. */
    climbables: { kind: string; x: number; y: number; width: number; height: number }[];
    /** Climbing events seen on this page: grabs, and the last let-go (how: jump/top/drop/ground/end). */
    climb: { grabs: number; steps: number; lastLetGo: string | null };
    /** Stalactites in level order: where it hangs (top centre), phase (hanging/shaking/falling/shattered), how far it fell. */
    stalactites: { x: number; y: number; phase: string; dropPx: number; visible: boolean }[];
    /** Golden fish: found in this level / hidden in it, and the ids ever found (saved in the browser). */
    treasures: { found: number; total: number; saved: string[]; left: number };
    /** Secret rooms in level order: is the cat inside, and the fake rock's alpha (1 = looks solid). */
    secrets: { inside: boolean; alpha: number; dust: number }[];
    /** The level's way out around the goal (the cave): the image's bounds and live fireflies; null when there is none. */
    exit: { left: number; right: number; top: number; bottom: number; fireflies: number } | null;
    /** Per checkpoint (level order): is its campfire burning? */
    campfiresLit: boolean[];
    timeMs: number;
    /** Background layers, far to near: texture offset in px (= camera scrollX × factor, rounded). */
    parallax: { key: string; factor: number; offsetX: number }[];
    /** Parallax FOLLOW_UPDATE listeners on the main camera; must stay 1 across restarts. */
    parallaxListeners: number;
    /** Juice: live particles, the visible cat's scale (squash & stretch), camera shake running. */
    effects: { particles: number; catScaleX: number; catScaleY: number; shaking: boolean } | null;
    /** Background loop: playing, M-muted, ducked by the pause, current volume, which track (sound key), whether a
     *  crossfade runs, and how many copies of the track exist. */
    music: { playing: boolean; muted: boolean; ducked: boolean; volume: number; track: string; fading: boolean; instances: number };
    /** Keys of recently played sound effects, newest last. */
    sfx: string[];
    /** The level is frozen under the pause overlay. */
    paused: boolean;
    /** While the title screen is shown: background scroll (px) and the blinking prompt. */
    title: { scrollX: number; promptVisible: boolean; unlocked: number; selected: number } | null;
    /** Result lines while the LevelComplete screen is shown; `finalScreen` = after the last level. */
    results: string[] | null;
    finalScreen: boolean;
    /** Event-bus subscriber counts; must not grow across restarts (listener leaks). */
    listeners: Record<string, number>;
}

export interface GameTestApi {
    game: Phaser.Game;
    getState(): GameState;
    /** Hold virtual inputs for `ms` of game time, then release. */
    press(keys: VirtualKey[], ms: number): Promise<void>;
    /** Hold virtual inputs until release() (for scripted runs that steer while polling the state). */
    hold(keys: VirtualKey[]): void;
    release(keys: VirtualKey[]): void;
    teleport(x: number, y: number): void;
    /** Resolve after `ms` of game time (robust when the machine or the tab runs slowly). */
    wait(ms: number): Promise<void>;
}

declare global {
    interface Window { __game?: GameTestApi }
}

export function installTestApi (game: Phaser.Game): void
{
    // Installed once per page: counts every meow event, across restarts.
    const meowLog = { count: 0, last: null as MeowWave | null };
    events.on(EV.PLAYER_MEOW, (w: MeowWave) => { meowLog.count++; meowLog.last = { x: w.x, y: w.y, dir: w.dir, range: w.range, halfHeight: w.halfHeight, behind: w.behind }; });
    const climbLog = { grabs: 0, steps: 0, lastLetGo: null as string | null };
    events.on(EV.PLAYER_GRAB, () => { climbLog.grabs++; });
    events.on(EV.PLAYER_CLIMB_STEP, () => { climbLog.steps++; });
    events.on(EV.PLAYER_LET_GO, ({ how }: { how: string }) => { climbLog.lastLetGo = how; });
    const clawLog = { count: 0, last: null as ClawSwipe | null };
    events.on(EV.PLAYER_CLAW, (s: ClawSwipe) => { clawLog.count++; clawLog.last = { x: s.x, y: s.y, dir: s.dir, reach: s.reach, behind: s.behind, halfHeight: s.halfHeight }; });
    const gameScene = () => game.scene.getScene('Game') as Game;
    // No fallback: while Preload is still loading no scene is running, and that must not read as 'Game'.
    const activeScene = () => game.scene.getScenes(true).find(s => s.scene.key !== 'Hud');

    // Timers run on the game loop, not a scene clock: a press that restarts a scene must still resolve.
    // The loop stops when the tab is hidden, so this is game time, not wall-clock time.
    const afterGameTime = (ms: number, done: () => void) => {
        let elapsed = 0;
        const step = (_time: number, delta: number) => {
            elapsed += delta;
            if (elapsed < ms) return;
            game.events.off(Phaser.Core.Events.STEP, step);
            done();
        };
        game.events.on(Phaser.Core.Events.STEP, step);
    };

    window.__game = {
        game,
        getState: () => {
            // Game objects are destroyed while Game is stopped (e.g. on the results screen); paused, they stay.
            const gs = gameScene();
            const g = gs?.sys.isActive() || gs?.sys.isPaused() ? gs : null;
            const p = g?.player;
            const map = g?.map;
            const cam = g?.cameras.main;
            const hud = game.scene.getScene('Hud') as Hud | null;
            const results = game.scene.getScene('LevelComplete') as LevelComplete | null;
            const title = game.scene.getScene('Title') as Title | null;
            return {
                scene: activeScene()?.scene.key ?? '',
                fps: game.loop.actualFps,
                levelNumber: state.level,
                levelName: levelDef(state.level).name,
                player: p?.body ? {
                    x: p.x, y: p.y,
                    vx: p.body.velocity.x, vy: p.body.velocity.y,
                    onGround: p.onGround,
                    anim: p.anim,
                    flipX: p.sprite.flipX,
                    spriteX: p.sprite.x, spriteY: p.sprite.y,
                    dying: p.dying, invulnerable: p.invulnerable, awaitingRelease: p.awaitingRelease,
                    big: p.big, spriteScale: p.sprite.scaleX,
                    climbing: p.climbing, climbKind: p.climbingOn?.kind ?? null,
                    spriteAlpha: p.sprite.alpha, spriteAngle: p.sprite.angle
                } : null,
                level: map ? { width: map.widthInPixels, height: map.heightInPixels } : null,
                camera: cam ? { scrollX: cam.scrollX, scrollY: cam.scrollY, width: cam.width, height: cam.height } : null,
                deaths: state.deaths,
                lives: state.lives,
                coins: state.coins,
                coinsTotal: state.coinsTotal,
                points: state.points,
                pointsTotal: state.pointsTotal,
                runPoints: state.runPoints,
                totalPoints: state.totalPoints,
                coinsLeft: g?.coins.countActive() ?? 0,
                yarnsLeft: g?.yarns.countActive() ?? 0,
                hud: hud?.sys.isActive() || hud?.sys.isPaused() ? { coinsText: hud.coinsLabel, meowReady: hud.meowReady, livesShown: hud.livesShown } : null,
                meow: { cooldownMs: p?.meowCooldown.remainingMs ?? 0, count: meowLog.count, last: meowLog.last },
                claw: { cooldownMs: p?.clawCooldown.remainingMs ?? 0, count: clawLog.count, last: clawLog.last },
                checkpoint: { ...state.checkpoint },
                enemies: g?.enemies.map(e => ({ kind: e.kind, x: e.x, y: e.y, dir: e.dir, scared: e.scared, scaredMs: e.scaredMs, harmful: e.harmful, anim: e.sprite.texture.key, gone: e.gone, spriteAlpha: e.sprite.alpha, phase: e instanceof Snake || e instanceof Bat ? e.phase : null, cloud: e instanceof Snake ? e.cloud : null })) ?? [],
                platforms: g?.platforms.map(p => ({ x: p.x, y: p.y, width: p.width, vx: p.body.velocity.x, vy: p.body.velocity.y, drawX: p.image.x, drawY: p.image.y })) ?? [],
                crumbles: g?.crumbles.map(c => ({ x: c.x, y: c.y, width: c.width, phase: c.phase, solid: c.solid, imageX: c.image.x, imageY: c.image.y, visible: c.image.visible })) ?? [],
                climbables: g?.climbables.map(c => ({ kind: c.kind, x: c.x, y: c.y, width: c.width, height: c.height })) ?? [],
                climb: { ...climbLog },
                stalactites: g?.stalactites.map(s => ({ x: s.x, y: s.y, phase: s.phase, dropPx: s.dropPx, visible: s.image.visible })) ?? [],
                treasures: { found: state.treasures, total: state.treasuresTotal, saved: loadFound(browserStore(), PROGRESS.TREASURES_KEY), left: g?.treasures.countActive() ?? 0 },
                secrets: g?.secrets.map(s => ({ inside: s.inside, alpha: s.alpha, dust: s.dust.getAliveParticleCount() })) ?? [],
                exit: g?.exit ? (() => { const b = g.exit.image.getBounds(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, fireflies: g.exit.fireflies.getAliveParticleCount() }; })() : null,
                campfiresLit: g?.checkpoints.map(c => c.lit) ?? [],
                timeMs: state.timeMs,
                parallax: g?.parallax.layers.map(({ sprite, def }) => ({ key: def.key, factor: def.factor, offsetX: sprite.tilePositionX })) ?? [],
                parallaxListeners: cam?.listenerCount(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE) ?? 0,
                effects: g && p ? { particles: g.effects.particles, catScaleX: p.sprite.scaleX, catScaleY: p.sprite.scaleY, shaking: cam!.shakeEffect.isRunning } : null,
                sfx: [...sfxLog],
                music: { ...music.state, instances: game.sound.getAll(music.state.track).length },
                paused: gs?.sys.isPaused() ?? false,
                title: title?.sys.isActive() ? { scrollX: title.scrollX, promptVisible: title.promptVisible, unlocked: title.unlocked, selected: title.selected } : null,
                results: results?.sys.isActive() ? [...results.lines] : null,
                finalScreen: results?.sys.isActive() ? results.final : false,
                listeners: Object.fromEntries(Object.values(EV).map(e => [e, events.listenerCount(e)]))
            };
        },
        hold: keys => keys.forEach(k => virtualKeys.add(k)),
        release: keys => keys.forEach(k => virtualKeys.delete(k)),
        press: (keys, ms) => new Promise(resolve => {
            keys.forEach(k => virtualKeys.add(k));
            afterGameTime(ms, () => {
                keys.forEach(k => virtualKeys.delete(k));
                resolve();
            });
        }),
        teleport: (x, y) => gameScene().player.teleport(x, y),
        wait: ms => new Promise(resolve => {
            afterGameTime(ms, resolve);
        })
    };
}
