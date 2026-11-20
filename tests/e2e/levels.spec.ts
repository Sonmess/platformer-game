import { test, expect, type Page } from '@playwright/test';
import { GAME_OVER, LEVELS, LIVES, PLAYER, RESULTS, TILE } from '../../src/config/constants';
import { landmarks } from './landmarks';

// Every level in LEVELS (constants.ts) loads from its own Tiled map; "?play=N" (dev only) starts level N.

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const playing = (page: Page) => page.waitForFunction(() => {
    const s = window.__game?.getState();
    return s?.scene === 'Game' && s.hud !== null && s.player?.onGround === true && Math.abs(s.player.vy) < 1;
});

for (const [i, def] of LEVELS.entries()) {
    const n = i + 1;
    test(`level ${n} (${def.map}) loads from its own map`, async ({ page }) => {
        await page.goto(`/?play=${n}`);
        await playing(page);
        const s = await state(page);
        const L = landmarks(n);
        expect(s).toMatchObject({ levelNumber: n, levelName: def.name, deaths: 0, lives: 3 });
        expect(s.coinsTotal).toBe(L.FEATHERS.length);
        expect(s.parallax.map(l => l.key)).toEqual(def.parallax.map(l => l.key));
        const map = await page.evaluate(() => {
            const g = window.__game!.game.scene.getScene('Game') as unknown as { map: { width: number; height: number; tilesets: { name: string; image: { key: string } }[] } };
            return { width: g.map.width, height: g.map.height, tiles: g.map.tilesets[0].image.key };
        });
        expect(map).toEqual({ width: L.LEVEL.cols, height: L.LEVEL.height / TILE, tiles: def.tiles.key });
    });
}

test('restarting level 2 from its results 10× yields an identical initial state, still in level 2', async ({ page }) => {
    test.setTimeout(240_000);
    const L = landmarks(2);
    const snapshot = async () => {
        const s = await state(page);
        return { levelNumber: s.levelNumber, player: s.player, deaths: s.deaths, lives: s.lives, coins: s.coins, coinsTotal: s.coinsTotal,
            points: s.points, totalPoints: s.totalPoints, coinsLeft: s.coinsLeft, yarnsLeft: s.yarnsLeft, hud: s.hud,
            checkpoint: s.checkpoint, campfiresLit: s.campfiresLit, crumbles: s.crumbles, stalactites: s.stalactites,
            enemies: s.enemies.map(e => ({ kind: e.kind, scared: e.scared, harmful: e.harmful, gone: e.gone })),
            music: { track: s.music.track, instances: s.music.instances }, listeners: s.listeners, parallax: s.parallax };
    };
    await page.goto('/?play=2');
    await playing(page);
    await page.evaluate(() => window.__game!.wait(300));
    const first = await snapshot();
    const S0 = L.STALACTITES[0], yarn = { x: 145.5 * TILE, y: 14.5 * TILE }, feather = L.FEATHERS[0];
    for (let i = 0; i < 10; i++) {
        // Dirty the run: stand under the first stalactite until it hits, take the yarn ball and a feather, then finish.
        await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [S0.x, 15 * TILE - PLAYER.HEIGHT / 2]);
        await page.waitForFunction(() => window.__game!.getState().deaths === 1 && !window.__game!.getState().player!.dying);
        await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [yarn.x, yarn.y]);
        await page.waitForFunction(() => window.__game!.getState().player!.big);
        await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [feather.x, feather.y]);
        await page.waitForFunction(() => window.__game!.getState().coins === 1);
        await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [L.GOAL.x, L.GOAL.y]);
        await page.waitForFunction(() => window.__game!.getState().scene === 'LevelComplete');
        await page.evaluate(() => window.__game!.wait(700));                 // the results ignore keys for a moment
        await page.evaluate(() => window.__game!.press(['replay'], 100));     // R: the same level again
        await playing(page);
        await page.evaluate(() => window.__game!.wait(300));
        expect(await snapshot(), `after restart ${i + 1}`).toEqual(first);
    }
});

test('going from level 2 to the title and into level 1 leaks no listeners', async ({ page }) => {
    await page.goto('/?play');
    await playing(page);
    const fresh = (await state(page)).listeners;

    await page.goto('/?play=2');
    await playing(page);
    await page.evaluate(() => window.__game!.press(['pause'], 50));
    await page.waitForFunction(() => window.__game!.getState().paused);
    await page.evaluate(() => window.__game!.press(['quit'], 50));
    await page.waitForFunction(() => window.__game!.getState().scene === 'Title');
    await page.evaluate(() => window.__game!.wait(400));
    await page.evaluate(() => window.__game!.press(['confirm'], 100));
    await playing(page);
    const s = await state(page);
    expect(s.levelNumber).toBe(1);
    expect(s.listeners).toEqual(fresh);
    expect(s.player!.y).toBeCloseTo(15 * TILE - PLAYER.HEIGHT / 2, 0);
});

// ── Moving on between levels (M4 step 2) ───────────────────────────────────────────────────

const toGoal = async (page: Page, level: number) => {
    const { GOAL } = landmarks(level);
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [GOAL.x, GOAL.y]);
    await page.waitForFunction(() => window.__game!.getState().scene === 'LevelComplete');
    await page.evaluate(d => window.__game!.wait(d), RESULTS.INPUT_DELAY_MS);
};
/** Into the first pit of level 1 (cols 50-53) or level 2 (cols 52-55, below its feathers), and back after the death animation. */
const dieInPit = async (page: Page, level: number) => {
    const deaths = (await state(page)).deaths;
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), level === 1 ? [51 * TILE, 12 * TILE] : [53.5 * TILE, 14 * TILE]);
    await page.waitForFunction(d => window.__game!.getState().deaths > d && !window.__game!.getState().player?.dying, deaths);
};

test('Enter on the results of level 1 starts level 2 with the same lives, and the points carry over', async ({ page }) => {
    const L1 = landmarks(1);
    await page.goto('/?play');
    await playing(page);
    const feather = L1.FEATHERS[0];
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [feather.x, feather.y]);
    await page.waitForFunction(() => window.__game!.getState().points === 1);
    await dieInPit(page, 1);
    await toGoal(page, 1);
    expect((await state(page)).finalScreen).toBe(false);

    await page.evaluate(() => window.__game!.press(['confirm'], 100));
    await playing(page);
    const s = await state(page);
    expect(s).toMatchObject({ levelNumber: 2, lives: LIVES.START - 1, points: 0, runPoints: 1, totalPoints: 1, deaths: 0 });
    expect(s.hud).toMatchObject({ coinsText: '1', livesShown: LIVES.START - 1 });
});

test('game over in level 2 starts level 2 again with three lives, keeping the points of level 1', async ({ page }) => {
    test.setTimeout(90_000);
    const L1 = landmarks(1);
    await page.goto('/?play');
    await playing(page);
    const feather = L1.FEATHERS[0];
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [feather.x, feather.y]);
    await page.waitForFunction(() => window.__game!.getState().points === 1);
    await toGoal(page, 1);
    await page.evaluate(() => window.__game!.press(['confirm'], 100));
    await playing(page);

    for (let i = 0; i < LIVES.START - 1; i++) await dieInPit(page, 2);
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [53.5 * TILE, 14 * TILE]);
    await page.waitForFunction(() => window.__game!.getState().scene === 'GameOver');
    await page.evaluate(d => window.__game!.wait(d), GAME_OVER.INPUT_DELAY_MS);
    await page.evaluate(() => window.__game!.press(['confirm'], 100));
    await playing(page);
    expect(await state(page)).toMatchObject({ levelNumber: 2, lives: LIVES.START, runPoints: 1, points: 0, deaths: 0 });
});

test('after the last level the final screen; Enter there starts a new game from level 1', async ({ page }) => {
    await page.goto(`/?play=${LEVELS.length}`);
    await playing(page);
    await dieInPit(page, LEVELS.length);
    await toGoal(page, LEVELS.length);
    const s = await state(page);
    expect(s.finalScreen).toBe(true);

    await page.evaluate(() => window.__game!.press(['confirm'], 100));
    await playing(page);
    expect(await state(page)).toMatchObject({ levelNumber: 1, lives: LIVES.START, runPoints: 0, totalPoints: 0, deaths: 0 });
});

test('the cave has its own background: its layers scroll at their own speeds and the sky is dark', async ({ page }) => {
    const cave = LEVELS[1];
    await page.goto('/?play=2');
    await playing(page);
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [44 * TILE, 15 * TILE - PLAYER.HEIGHT / 2]);
    await page.evaluate(() => window.__game!.wait(1500));                     // the camera catches up
    const s = await state(page);
    expect(s.parallax.map(l => l.key)).toEqual(cave.parallax.map(l => l.key));
    expect(s.parallax.some(l => LEVELS[0].parallax.some(f => f.key === l.key))).toBe(false);   // nothing of the forest
    const scrollX = s.camera!.scrollX;
    expect(scrollX).toBeGreaterThan(200);
    for (const layer of s.parallax) expect(Math.abs(layer.offsetX - scrollX * layer.factor)).toBeLessThanOrEqual(1);
    const offsets = s.parallax.map(l => l.offsetX);
    for (let i = 1; i < offsets.length; i++) expect(offsets[i]).toBeGreaterThan(offsets[i - 1]);
    const sky = await page.evaluate(() => {
        const g = window.__game!.game.scene.getScene('Game') as unknown as { cameras: { main: { backgroundColor: { rgba: string } } } };
        return g.cameras.main.backgroundColor.rgba;
    });
    expect(sky).toBe('rgba(13,11,20,1)');                                     // CAVE_PARALLAX.SKY_COLOR #0d0b14
});

test('the cave ends in a moonlit arch: running into its light finishes the level; the forest has no such exit', async ({ page }) => {
    const L = landmarks(2);
    await page.goto('/?play=2');
    await playing(page);
    let s = await state(page);
    expect(s.exit).not.toBeNull();
    expect(s.exit!.right).toBe(L.LEVEL.width);                                // at the level's right edge
    expect(s.exit!.bottom).toBe(15 * TILE);                                   // standing on the floor
    expect(L.GOAL.x).toBeGreaterThan(s.exit!.right - 48);                    // the goal is inside the opening

    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [193 * TILE, 15 * TILE - PLAYER.HEIGHT / 2]);
    await page.evaluate(() => window.__game!.wait(1500));
    expect((await state(page)).exit!.fireflies).toBeGreaterThan(0);          // fireflies drift in the light
    await page.evaluate(() => window.__game!.hold(['right']));
    await page.waitForFunction(() => window.__game!.getState().scene === 'LevelComplete');
    await page.evaluate(() => window.__game!.release(['right']));

    await page.goto('/?play');
    await playing(page);
    s = await state(page);
    expect(s.exit).toBeNull();
});
