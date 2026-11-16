import { test, expect, type Page } from '@playwright/test';
import { PLAYER, TILE } from '../../src/config/constants';

// Landmarks in src/levels/level1.json: columns 90-107 are flat ground (platforms high above);
// columns 6-20 are open ground with nothing overhead; first pit at 50-53; first coin row at col 38.
const GROUND_Y = 15 * TILE - PLAYER.HEIGHT / 2;
const FLAT_X = 98 * TILE;
const OPEN_X = 12 * TILE;
const PLATEAU_COIN = { x: 38 * TILE + TILE / 2, y: 11 * TILE + TILE / 2 };

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const effects = async (page: Page) => (await state(page)).effects!;
const wait = (page: Page, ms: number) => page.evaluate(m => window.__game!.wait(m), ms);

async function teleportAndSettle (page: Page, x: number, y: number)
{
    await page.evaluate(([px, py]) => window.__game!.teleport(px, py), [x, y]);
    await page.waitForFunction(() => window.__game!.getState().player!.onGround);
    await wait(page, 800);      // landing effects die out
}

async function expectAtRest (page: Page)
{
    const fx = await effects(page);
    expect(fx.catScaleX).toBe(1);
    expect(fx.catScaleY).toBe(1);
    expect(fx.particles).toBe(0);
    expect(fx.shaking).toBe(false);
}

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

test('jump stretches the cat and puffs dust, then everything returns to rest', async ({ page }) => {
    await teleportAndSettle(page, FLAT_X, GROUND_Y);
    await expectAtRest(page);

    await page.evaluate(() => window.__game!.press(['jump'], 50));
    const fx = await effects(page);
    expect(fx.particles).toBeGreaterThan(0);
    expect(fx.catScaleY).not.toBe(1);
    expect(fx.shaking).toBe(false);             // a normal jump never shakes the screen

    await page.waitForFunction(() => window.__game!.getState().player!.onGround);
    await wait(page, 800);
    await expectAtRest(page);
});

test('spam-jumping always settles back to scale 1', async ({ page }) => {
    await teleportAndSettle(page, FLAT_X, GROUND_Y);
    for (let i = 0; i < 8; i++) {
        await page.evaluate(() => window.__game!.press(['jump'], 40));
        await wait(page, 90);
    }
    await page.waitForFunction(() => window.__game!.getState().player!.onGround);
    await wait(page, 800);
    await expectAtRest(page);
});

test('a long fall squashes the cat and shakes the screen; a full jump landing does not shake', async ({ page }) => {
    await teleportAndSettle(page, FLAT_X, GROUND_Y);
    await page.evaluate(async () => {
        const g = window.__game!;
        g.press(['jump'], 400);
        let shook = false;
        while (!g.getState().player!.onGround || g.getState().player!.vy < 0) { await g.wait(16); }
        for (let i = 0; i < 10; i++) { shook ||= g.getState().effects!.shaking; await g.wait(16); }
        if (shook) throw new Error('full jump landing shook the screen');
    });

    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [OPEN_X, TILE]);    // ~13 tiles above the ground
    const landing = await page.evaluate(async () => {
        const g = window.__game!;
        while (!g.getState().player!.onGround) { await g.wait(8); }
        let minScaleY = Infinity, shook = false;
        for (let i = 0; i < 10; i++) {
            const fx = g.getState().effects!;
            minScaleY = Math.min(minScaleY, fx.catScaleY);
            shook ||= fx.shaking;
            await g.wait(16);
        }
        return { minScaleY, shook };
    });
    expect(landing.minScaleY).toBeLessThan(0.9);
    expect(landing.shook).toBe(true);
    await wait(page, 800);
    await expectAtRest(page);
});

test('collecting a coin bursts sparks', async ({ page }) => {
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [PLATEAU_COIN.x, PLATEAU_COIN.y]);
    await page.waitForFunction(() => window.__game!.getState().coins === 1);
    expect((await effects(page)).particles).toBeGreaterThan(0);
});

test('dying shakes the screen and the cat pops back in at the checkpoint', async ({ page }) => {
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [51 * TILE, 12 * TILE]);
    await page.waitForFunction(() => window.__game!.getState().deaths === 1);
    const fx = await effects(page);
    expect(fx.shaking).toBe(true);
    expect(fx.catScaleY).toBeLessThan(1);

    await wait(page, 800);
    await expectAtRest(page);
});
