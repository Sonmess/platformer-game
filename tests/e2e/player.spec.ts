import { test, expect, type Page } from '@playwright/test';
import { PLAYER_FEEL, TILE } from '../../src/config/constants';

const state = (page: Page) => page.evaluate(() => window.__game!.getState());

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

test('player stands on the ground after spawn', async ({ page }) => {
    const s = await state(page);
    expect(s.player!.onGround).toBe(true);
    expect(Math.abs(s.player!.vy)).toBeLessThan(1);
});

test('holding right moves the player right', async ({ page }) => {
    const x0 = (await state(page)).player!.x;
    await page.evaluate(() => window.__game!.press(['right'], 400));
    expect((await state(page)).player!.x).toBeGreaterThan(x0 + TILE);
});

test('holding left moves the player left', async ({ page }) => {
    await page.evaluate(() => window.__game!.teleport(150, 200));
    await page.waitForFunction(() => window.__game!.getState().player!.onGround);
    const x0 = (await state(page)).player!.x;
    await page.evaluate(() => window.__game!.press(['left'], 400));
    expect((await state(page)).player!.x).toBeLessThan(x0 - TILE);
});

test('a held jump rises about the designed height and lands again', async ({ page }) => {
    const y0 = (await state(page)).player!.y;
    // Track the peak inside the page over the whole jump.
    const minY = await page.evaluate(async () => {
        const g = window.__game!;
        let min = Infinity;
        const id = setInterval(() => { min = Math.min(min, g.getState().player!.y); }, 5);
        await g.press(['jump'], 700);                     // held through the apex = full jump
        await g.wait(800);
        clearInterval(id);
        return min;
    });
    const height = y0 - minY;
    const designed = PLAYER_FEEL.jumpHeightTiles * TILE;
    expect(height).toBeGreaterThan(designed * 0.85);
    expect(height).toBeLessThan(designed * 1.15);
    expect((await state(page)).player!.onGround).toBe(true);
});

test('a real key tap shorter than a frame still hops (a short, cut jump)', async ({ page }) => {
    const y0 = (await state(page)).player!.y;
    await page.keyboard.press('Space');                     // keydown + keyup before the next update
    await page.waitForFunction(([y, tile]) => window.__game!.getState().player!.y < y - tile / 2, [y0, TILE]);
});
