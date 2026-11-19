import { test, expect, type Page } from '@playwright/test';
import { ENEMY, PLAYER, TILE } from '../../src/config/constants';

// Landmark in src/levels/level1.json: a crow flies up and down in col 133, rows 8-14, above flat
// ground (row 15) in front of the cave hill (col 141).
const PATH = { x: 133 * TILE + TILE / 2, top: 8 * TILE, bottom: 15 * TILE };
const GROUND_Y = 15 * TILE - PLAYER.HEIGHT / 2;

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const crow = async (page: Page) => (await state(page)).enemies.find(e => e.kind === 'crow')!;
const wait = (page: Page, ms: number) => page.evaluate(m => window.__game!.wait(m), ms);
const teleport = (page: Page, x: number, y = GROUND_Y) => page.evaluate(([px, py]) => window.__game!.teleport(px, py), [x, y]);
/** Waits until the crow is low (near the ground) or high (near the top of its path). */
const waitForCrow = (page: Page, where: 'low' | 'high') => page.waitForFunction(([w, top, bottom]) => {
    const c = window.__game!.getState().enemies.find(e => e.kind === 'crow')!;
    return w === 'low' ? c.y > bottom - 20 : c.y < top + 20;
}, [where, PATH.top, PATH.bottom] as const);

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

test('the crow flies up and down its path and turns to face the cat', async ({ page }) => {
    await teleport(page, PATH.x - 4 * TILE);
    const ys: number[] = [];
    for (let i = 0; i < 14; i++) {
        const c = await crow(page);
        expect(c.x).toBeCloseTo(PATH.x, 0);
        expect(c.dir).toBe(-1);                                   // the cat is to its left
        ys.push(c.y);
        await wait(page, 500);
    }
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(PATH.top);
    expect(Math.max(...ys)).toBeLessThanOrEqual(PATH.bottom);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(4 * TILE);

    await teleport(page, PATH.x + 4 * TILE);
    await wait(page, 100);
    expect((await crow(page)).dir).toBe(1);
});

test('touching the crow kills the cat', async ({ page }) => {
    const c = await crow(page);
    await teleport(page, c.x, c.y);
    await page.waitForFunction(() => window.__game!.getState().deaths === 1);
});

test('a meow scares it in mid-air: it freezes, harmless, then flies on', async ({ page }) => {
    await page.evaluate(() => window.__game!.press(['right'], 30));        // face right
    await teleport(page, PATH.x - 3 * TILE);
    await waitForCrow(page, 'low');
    await page.evaluate(() => window.__game!.press(['meow'], 50));
    await page.waitForFunction(() => window.__game!.getState().enemies.find(e => e.kind === 'crow')!.scared);

    const frozen = await crow(page);
    expect(frozen.harmful).toBe(false);
    expect(frozen.anim).toBe('crow-scared');
    await wait(page, 1000);
    expect((await crow(page)).y).toBeCloseTo(frozen.y, 0);                 // hangs in the air

    await page.evaluate(() => window.__game!.press(['right'], 700));      // under / through it
    expect((await state(page)).deaths).toBe(0);

    await wait(page, ENEMY.SCARE_MS);
    const after = await crow(page);
    expect(after.scared).toBe(false);
    await wait(page, 500);
    expect((await crow(page)).y).not.toBeCloseTo(after.y, 0);             // flying again
});

test('a meow does not reach the crow high up its path', async ({ page }) => {
    await page.evaluate(() => window.__game!.press(['right'], 30));
    await teleport(page, PATH.x - 2 * TILE);
    await waitForCrow(page, 'high');
    await page.evaluate(() => window.__game!.press(['meow'], 50));
    await wait(page, 100);
    expect((await crow(page)).scared).toBe(false);
});
