import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { TILE } from '../../src/config/constants';

interface TiledObject { type: string; x: number; y: number }
const level1 = JSON.parse(readFileSync('src/levels/level1.json', 'utf8')) as { layers: Array<{ objects?: TiledObject[] }> };
const COINS = level1.layers.flatMap(l => l.objects ?? []).filter(o => o.type === 'coin');

// A coin floating above the plateau (col 38, row 11) and the first pit (cols 50-53).
const PLATEAU_COIN = { x: 38 * TILE + TILE / 2, y: 11 * TILE + TILE / 2 };
const FIRST_PIT_COL = 51;

const state = (page: Page) => page.evaluate(() => window.__game!.getState());

async function collectCoinAt (page: Page, coin: { x: number; y: number })
{
    const before = (await state(page)).coins;
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [coin.x, coin.y]);
    await page.waitForFunction(n => window.__game!.getState().coins > n, before);
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
    await page.waitForFunction(() => window.__game?.getState().hud !== null);
});

test('level starts with every Tiled coin present and the HUD at zero', async ({ page }) => {
    const s = await state(page);
    expect(COINS.length).toBeGreaterThan(0);
    expect(s.coinsTotal).toBe(COINS.length);
    expect(s.coinsLeft).toBe(COINS.length);
    expect(s.coins).toBe(0);
    expect(s.hud!.coinsText).toBe(`0/${COINS.length}`);
});

test('touching a coin collects it once and updates the HUD', async ({ page }) => {
    await collectCoinAt(page, PLATEAU_COIN);
    await page.evaluate(() => window.__game!.wait(300));

    const s = await state(page);
    expect(s.coins).toBe(1);
    expect(s.coinsLeft).toBe(COINS.length - 1);
    expect(s.hud!.coinsText).toBe(`1/${COINS.length}`);
});

test('collected coins stay collected after a death', async ({ page }) => {
    await collectCoinAt(page, PLATEAU_COIN);
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [FIRST_PIT_COL * TILE, 12 * TILE]);
    await page.waitForFunction(() => window.__game!.getState().deaths === 1);

    const s = await state(page);
    expect(s.coins).toBe(1);
    expect(s.coinsLeft).toBe(COINS.length - 1);
});
