import { test, expect, type Page } from '@playwright/test';
import { AUDIO, PLAYER, TILE } from '../../src/config/constants';

// Landmarks in src/levels/level1.json (tile coordinates).
const GROUND_Y = 15 * TILE - PLAYER.HEIGHT / 2;
const FLAT_X = 98 * TILE;                                   // flat ground, cols 90-107
const PLATEAU_COIN = { x: 38 * TILE + TILE / 2, y: 11 * TILE + TILE / 2 };
const CHECKPOINT_1 = { x: 56 * TILE + TILE / 2, y: 13 * TILE };
const FIRST_PIT = { x: 51 * TILE, y: 12 * TILE };
const GOAL = { x: 143 * TILE + TILE, y: 14 * TILE };
const { SFX } = AUDIO;

const sfx = async (page: Page) => (await page.evaluate(() => window.__game!.getState())).sfx;
const teleport = (page: Page, p: { x: number; y: number }) =>
    page.evaluate(([x, y]) => window.__game!.teleport(x, y), [p.x, p.y]);
const waitForSfx = (page: Page, key: string) =>
    page.waitForFunction(k => window.__game!.getState().sfx.includes(k), key);

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

test('every sound effect is loaded', async ({ page }) => {
    const keys = Object.values(SFX).map(s => s.key);
    const loaded = await page.evaluate(k => k.filter(key => window.__game!.game.cache.audio.exists(key)), keys);
    expect(loaded).toEqual(keys);
});

test('standing still is silent; a jump plays the jump sound, its landing the land sound', async ({ page }) => {
    await teleport(page, { x: FLAT_X, y: GROUND_Y });
    await page.waitForFunction(() => window.__game!.getState().player!.onGround);
    await page.evaluate(() => window.__game!.wait(800));
    const before = (await sfx(page)).length;
    await page.evaluate(() => window.__game!.wait(500));
    expect((await sfx(page)).length).toBe(before);

    await page.evaluate(() => window.__game!.press(['jump'], 300));
    await page.waitForFunction(() => window.__game!.getState().player!.onGround);
    await page.evaluate(() => window.__game!.wait(100));
    expect((await sfx(page)).slice(before)).toEqual([SFX.JUMP.key, SFX.LAND.key]);
});

test('coins, checkpoints and deaths play their sounds', async ({ page }) => {
    await teleport(page, PLATEAU_COIN);
    await waitForSfx(page, SFX.COIN.key);

    await teleport(page, CHECKPOINT_1);
    await waitForSfx(page, SFX.CHECKPOINT.key);

    await teleport(page, FIRST_PIT);
    await waitForSfx(page, SFX.DIE.key);
    expect((await sfx(page)).filter(k => k === SFX.DIE.key)).toHaveLength(1);
});

test('reaching the goal plays the jingle', async ({ page }) => {
    await teleport(page, GOAL);
    await page.waitForFunction(() => window.__game!.getState().scene === 'LevelComplete');
    expect((await sfx(page)).at(-1)).toBe(SFX.GOAL.key);
});
