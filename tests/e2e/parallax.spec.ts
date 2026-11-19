import { test, expect, type Page } from '@playwright/test';
import { PARALLAX, PLAYER, TILE } from '../../src/config/constants';

// Landmark in src/levels/level1.json: columns 90-107 are flat ground.
const GROUND_Y = 15 * TILE - PLAYER.HEIGHT / 2;
const FLAT_X = 98 * TILE;

const state = (page: Page) => page.evaluate(() => window.__game!.getState());

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

test('has the configured background layers, far to near', async ({ page }) => {
    const s = await state(page);
    expect(s.parallax.map(l => l.key)).toEqual(PARALLAX.LAYERS.map(l => l.key));
    expect(s.parallax.length).toBeGreaterThanOrEqual(4);
    const factors = s.parallax.map(l => l.factor);
    expect(factors).toEqual([...factors].sort((a, b) => a - b));
    expect(Math.max(...factors)).toBeLessThan(1);
});

test('layers scroll at different speeds, following the camera', async ({ page }) => {
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [FLAT_X, GROUND_Y]);
    await page.waitForFunction(() => window.__game!.getState().player!.onGround);
    await page.evaluate(() => window.__game!.wait(1500));    // camera catches up and stops

    const s = await state(page);
    const scrollX = s.camera!.scrollX;
    expect(scrollX).toBeGreaterThan(1000);
    for (const layer of s.parallax) {
        expect(Number.isInteger(layer.offsetX)).toBe(true);                // whole pixels: no shimmer
        expect(Math.abs(layer.offsetX - scrollX * layer.factor)).toBeLessThanOrEqual(1);
    }
    // Nearer layers moved further.
    const offsets = s.parallax.map(l => l.offsetX);
    for (let i = 1; i < offsets.length; i++) expect(offsets[i]).toBeGreaterThan(offsets[i - 1]);
});

test('layers are back in place after a respawn at the spawn', async ({ page }) => {
    const start = (await state(page)).parallax;
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [FLAT_X, GROUND_Y]);
    await page.evaluate(() => window.__game!.wait(1000));
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [51 * TILE, 12 * TILE]);   // first pit
    await page.waitForFunction(() => window.__game!.getState().deaths === 1 && !window.__game!.getState().player!.dying);   // and back at the checkpoint
    await page.evaluate(() => window.__game!.wait(200));
    expect((await state(page)).parallax).toEqual(start);
});
