import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { AUDIO, COIN, LIVES, TILE } from '../../src/config/constants';

// Feathers ("coins" in code) from src/levels/level1.json: Tiled points of type "feather" with an int "value".
interface TiledObject { type: string; x: number; y: number; properties?: { name: string; value: number }[] }
const level1 = JSON.parse(readFileSync('src/levels/level1.json', 'utf8')) as { layers: Array<{ objects?: TiledObject[] }> };
const FEATHERS = level1.layers.flatMap(l => l.objects ?? []).filter(o => o.type === 'feather')
    .map(o => ({ x: o.x, y: o.y, value: o.properties?.find(p => p.name === COIN.VALUE_PROPERTY)?.value ?? 1 }));
const POINTS_TOTAL = FEATHERS.reduce((sum, f) => sum + f.value, 0);

// A blue feather floating above the plateau (col 38, row 11) and the first pit (cols 50-53).
const PLATEAU_FEATHER = { x: 38 * TILE + TILE / 2, y: 11 * TILE + TILE / 2 };
const FIRST_PIT_COL = 51;

const state = (page: Page) => page.evaluate(() => window.__game!.getState());

async function collectAt (page: Page, feather: { x: number; y: number })
{
    const before = (await state(page)).coins;
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [feather.x, feather.y]);
    await page.waitForFunction(n => window.__game!.getState().coins > n, before);
}

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
    await page.waitForFunction(() => window.__game?.getState().hud !== null);
});

test('the level starts with every feather in place and no points', async ({ page }) => {
    const s = await state(page);
    expect(FEATHERS.length).toBeGreaterThan(0);
    expect(new Set(FEATHERS.map(f => f.value))).toEqual(new Set([1, 5, 10]));     // blue, silver and gold
    expect(s).toMatchObject({ coins: 0, coinsTotal: FEATHERS.length, coinsLeft: FEATHERS.length, points: 0, pointsTotal: POINTS_TOTAL });
    expect(s.hud!.coinsText).toBe('0');
});

test('a feather is picked up once and adds its points to the HUD', async ({ page }) => {
    await collectAt(page, PLATEAU_FEATHER);
    await page.evaluate(() => window.__game!.wait(300));
    const s = await state(page);
    expect(s).toMatchObject({ coins: 1, coinsLeft: FEATHERS.length - 1, points: 1 });
    expect(s.hud!.coinsText).toBe('1');
    expect(s.sfx).toContain(AUDIO.SFX.COIN.key);
});

test('silver is worth 5 and gold 10', async ({ page }) => {
    for (const value of [5, 10]) {
        const feather = FEATHERS.find(f => f.value === value)!;
        const before = (await state(page)).points;
        await collectAt(page, feather);
        expect((await state(page)).points).toBe(before + value);
    }
});

test(`every ${COIN.LIFE_EVERY} points give a lost life back`, async ({ page }) => {
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [FIRST_PIT_COL * TILE, 12 * TILE]);
    await page.waitForFunction(() => window.__game!.getState().deaths === 1 && !window.__game!.getState().player!.dying);
    expect((await state(page)).lives).toBe(LIVES.START - 1);

    // The most precious feathers first, until the threshold is crossed (quickly, while still invulnerable).
    const best = [...FEATHERS].sort((a, b) => b.value - a.value);
    for (const f of best) {
        if ((await state(page)).points >= COIN.LIFE_EVERY) break;
        await collectAt(page, f);
    }
    await page.evaluate(() => window.__game!.wait(100));
    const s = await state(page);
    expect(s.points).toBeGreaterThanOrEqual(COIN.LIFE_EVERY);
    expect(s.lives).toBe(LIVES.START);
    expect(s.hud!.livesShown).toBe(LIVES.START);
    expect(s.sfx).toContain(AUDIO.SFX.LIFE.key);
});

test(`with all lives left, ${COIN.LIFE_EVERY} points give an extra life (a fourth cat head)`, async ({ page }) => {
    const best = [...FEATHERS].sort((a, b) => b.value - a.value);
    for (const f of best) {
        if ((await state(page)).points >= COIN.LIFE_EVERY) break;
        await collectAt(page, f);
    }
    await page.evaluate(() => window.__game!.wait(100));
    const s = await state(page);
    expect(s.deaths).toBe(0);
    expect(s.lives).toBe(LIVES.START + 1);
    expect(s.hud!.livesShown).toBe(LIVES.START + 1);
    expect(s.sfx).toContain(AUDIO.SFX.LIFE.key);
});

test('collected feathers stay collected after a death', async ({ page }) => {
    await collectAt(page, PLATEAU_FEATHER);
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [FIRST_PIT_COL * TILE, 12 * TILE]);
    await page.waitForFunction(() => window.__game!.getState().deaths === 1 && !window.__game!.getState().player!.dying);   // and back at the checkpoint

    const s = await state(page);
    expect(s).toMatchObject({ coins: 1, coinsLeft: FEATHERS.length - 1, points: 1 });
});
