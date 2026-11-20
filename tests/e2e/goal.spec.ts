import { test, expect, type Page } from '@playwright/test';
import { LIVES, RESULTS, TILE } from '../../src/config/constants';
import { CRUMBLES, GOAL, VINES } from './landmarks';

// Landmarks in src/levels/level1.json (tile coordinates).
const PLATEAU_COIN = { x: 38 * TILE + TILE / 2, y: 11 * TILE + TILE / 2 };
const FIRST_PIT = { x: 51 * TILE, y: 12 * TILE };
const FIRST_YARN = { x: 36.5 * TILE, y: 11.5 * TILE };                     // on the plateau
const GROUND_Y = 15 * TILE - 7;                                             // cat centre standing on row 15

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const teleport = (page: Page, p: { x: number; y: number }) =>
    page.evaluate(([x, y]) => window.__game!.teleport(x, y), [p.x, p.y]);

async function waitForPlaying (page: Page)
{
    await page.waitForFunction(() => {
        const s = window.__game?.getState();
        return s?.scene === 'Game' && s.hud !== null && s.player?.onGround === true && Math.abs(s.player.vy) < 1;
    });
    await page.evaluate(() => window.__game!.wait(300));    // camera and HUD settle
}

/** Everything that must be identical at the start of every run. */
async function initialSnapshot (page: Page)
{
    const s = await state(page);
    return {
        player: s.player, camera: s.camera, coins: s.coins, coinsLeft: s.coinsLeft, coinsTotal: s.coinsTotal,
        deaths: s.deaths, lives: s.lives, checkpoint: s.checkpoint, hud: s.hud, listeners: s.listeners,
        points: s.points, pointsTotal: s.pointsTotal, yarnsLeft: s.yarnsLeft, climbables: s.climbables, clawCooldownMs: s.claw.cooldownMs,
        parallax: s.parallax, parallaxListeners: s.parallaxListeners,
        paused: s.paused, meowCooldownMs: s.meow.cooldownMs, campfiresLit: s.campfiresLit,
        enemies: s.enemies.map(e => ({ kind: e.kind, scared: e.scared, harmful: e.harmful, gone: e.gone })),
        crumbles: s.crumbles.map(c => ({ phase: c.phase, visible: c.visible, imageX: c.imageX, imageY: c.imageY })),
        musicInstances: s.music.instances
    };
}

async function finishLevel (page: Page)
{
    await teleport(page, GOAL);
    await page.waitForFunction(() => window.__game!.getState().scene === 'LevelComplete');
}

/** R on the results: the same level again. */
async function restartFromResults (page: Page)
{
    await page.evaluate(d => window.__game!.wait(d), RESULTS.INPUT_DELAY_MS);
    await page.evaluate(() => window.__game!.press(['replay'], 100));
    await waitForPlaying(page);
}

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await waitForPlaying(page);
});

test('reaching the goal shows the results with coins, deaths and time', async ({ page }) => {
    await teleport(page, PLATEAU_COIN);
    await page.waitForFunction(() => window.__game!.getState().coins === 1);
    await teleport(page, FIRST_PIT);
    await page.waitForFunction(() => window.__game!.getState().deaths === 1 && !window.__game!.getState().player!.dying);   // and back at the checkpoint

    await finishLevel(page);
    const s = await state(page);
    expect(s.hud).toBeNull();                               // HUD is stopped with the level
    expect(s.results![0]).toBe(`${RESULTS.TEXT.COINS}: 1/${s.pointsTotal}`);     // a blue feather: 1 point
    expect(s.results![1]).toBe(`${RESULTS.TEXT.TOTAL}: 1`);                      // the whole run so far
    expect(s.results![2]).toBe(`${RESULTS.TEXT.LIVES}: ${LIVES.START - 1}`);   // one life lost
    expect(s.results![3]).toMatch(new RegExp(`^${RESULTS.TEXT.TIME}: \\d+:\\d\\d\\.\\d$`));
    expect(s.finalScreen).toBe(false);                     // level 1 is not the last one
    expect(s.timeMs).toBeGreaterThan(0);
});

test('jump does not restart from the results screen', async ({ page }) => {
    await finishLevel(page);
    await page.evaluate(d => window.__game!.wait(d), RESULTS.INPUT_DELAY_MS);
    await page.evaluate(() => window.__game!.press(['jump'], 200));
    await page.evaluate(() => window.__game!.wait(300));
    expect((await state(page)).scene).toBe('LevelComplete');
});

test('confirm held from the moment the results appear does not skip them', async ({ page }) => {
    await finishLevel(page);
    // Held through the input delay and beyond: the press edge falls inside the delay and is ignored.
    await page.evaluate(d => window.__game!.press(['confirm'], d), RESULTS.INPUT_DELAY_MS * 2);
    await page.evaluate(() => window.__game!.wait(300));
    expect((await state(page)).scene).toBe('LevelComplete');

    // A fresh press after the delay goes on to the next level.
    await page.evaluate(() => window.__game!.press(['confirm'], 100));
    await waitForPlaying(page);
    expect((await state(page)).levelNumber).toBe(2);
});

test('restarting 10× yields an identical initial state', async ({ page }) => {
    test.setTimeout(180_000);
    const first = await initialSnapshot(page);
    expect(first.coins).toBe(0);
    expect(first.deaths).toBe(0);

    for (let i = 0; i < 10; i++) {
        // Dirty the run: scare and claw away the first hedgehog, climb a vine, take a yarn ball (big cat), pause and
        // resume, collect a coin, die, set a crumbling platform shaking, then finish.
        await page.evaluate(async ([y]) => {
            const g = window.__game!;
            await g.press(['right'], 30);                                    // face it
            g.teleport(g.getState().enemies[0].x - 3 * 16, y);
            await g.press(['meow'], 50);
            g.teleport(g.getState().enemies[0].x - 20, y);
            await g.press(['claw'], 50);
        }, [GROUND_Y]);
        await page.waitForFunction(() => window.__game!.getState().enemies[0].gone);
        await teleport(page, { x: VINES[0].x + VINES[0].width / 2, y: 13.5 * TILE });     // below its feathers
        await page.evaluate(() => window.__game!.press(['up'], 200));
        expect((await state(page)).player!.climbing).toBe(true);
        await teleport(page, FIRST_YARN);
        await page.waitForFunction(() => window.__game!.getState().player!.big);
        await page.evaluate(() => window.__game!.press(['pause'], 50));
        await page.waitForFunction(() => window.__game!.getState().paused);
        await page.evaluate(() => window.__game!.press(['pause'], 50));
        await page.waitForFunction(() => !window.__game!.getState().paused);
        await teleport(page, PLATEAU_COIN);
        await page.waitForFunction(() => window.__game!.getState().coins === 1);
        await teleport(page, FIRST_PIT);
        await page.waitForFunction(() => window.__game!.getState().deaths === 1 && !window.__game!.getState().player!.dying);   // and back at the checkpoint
        await teleport(page, { x: CRUMBLES[0].x + CRUMBLES[0].width / 2, y: CRUMBLES[0].y - 12 });
        await page.waitForFunction(() => window.__game!.getState().crumbles[0].phase !== 'solid');
        await finishLevel(page);
        await restartFromResults(page);

        expect(await initialSnapshot(page), `after restart ${i + 1}`).toEqual(first);
    }
});

test('real keys on the results: R plays the level again, Enter goes on to level 2, Space does nothing', async ({ page }) => {
    for (const [key, level] of [['KeyR', 1], ['Enter', 2]] as const) {
        await finishLevel(page);
        await page.evaluate(d => window.__game!.wait(d), RESULTS.INPUT_DELAY_MS);
        await page.keyboard.press('Space');                 // instant tap: down and up in one frame
        await page.evaluate(() => window.__game!.wait(300));
        expect((await state(page)).scene).toBe('LevelComplete');

        await page.keyboard.press(key);
        await waitForPlaying(page);
        expect((await state(page)).levelNumber).toBe(level);
    }
});
