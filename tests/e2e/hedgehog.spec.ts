import { test, expect, type Page } from '@playwright/test';
import { AUDIO, ENEMY, PLAYER, TILE } from '../../src/config/constants';

// Landmarks in src/levels/level1.json: the first hedgehog patrols cols 18-31 on flat ground (row 15).
const PATROL = { minX: 18 * TILE, maxX: 32 * TILE };
const GROUND_Y = 15 * TILE - PLAYER.HEIGHT / 2;

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const hedgehog = async (page: Page) => (await state(page)).enemies[0];
const wait = (page: Page, ms: number) => page.evaluate(m => window.__game!.wait(m), ms);
const teleport = (page: Page, x: number, y = GROUND_Y) => page.evaluate(([px, py]) => window.__game!.teleport(px, py), [x, y]);

/** Puts the cat on the ground `tiles` tiles left of the first hedgehog, facing it (right). */
async function standLeftOfHedgehog (page: Page, tiles: number)
{
    await page.evaluate(() => window.__game!.press(['right'], 30));    // face right
    const h = await hedgehog(page);
    await teleport(page, h.x - tiles * TILE);
    await page.waitForFunction(() => window.__game!.getState().player!.onGround);
}

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

test('the hedgehog patrols inside its range, both ways, and never falls', async ({ page }) => {
    const xs: number[] = [], dirs = new Set<number>();
    for (let i = 0; i < 24; i++) {
        const h = await hedgehog(page);
        expect(h.kind).toBe('hedgehog');
        expect(h.y).toBeCloseTo(15 * TILE - 5, 0);           // on the ground
        xs.push(h.x);
        dirs.add(h.dir);
        await wait(page, 500);
    }
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(PATROL.minX);
    expect(Math.max(...xs)).toBeLessThanOrEqual(PATROL.maxX);
    expect(dirs).toEqual(new Set([1, -1]));
});

test('touching a hedgehog kills the cat', async ({ page }) => {
    const h = await hedgehog(page);
    await teleport(page, h.x, h.y);
    await page.waitForFunction(() => window.__game!.getState().deaths === 1);
});

test('a meow in reach scares it: it curls up, shakes, and the cat walks through unharmed', async ({ page }) => {
    await standLeftOfHedgehog(page, 3);
    await page.evaluate(() => window.__game!.press(['meow'], 50));
    await page.waitForFunction(() => window.__game!.getState().enemies[0].scared);

    const scared = await hedgehog(page);
    expect(scared.harmful).toBe(false);
    expect(scared.anim).toBe('hedgehog-scared');
    expect(scared.scaredMs).toBeGreaterThan(ENEMY.SCARE_MS - 500);
    expect((await state(page)).sfx).toContain(AUDIO.SFX.SCARE.key);

    const x0 = scared.x;
    await page.evaluate(() => window.__game!.press(['right'], 900));      // straight through it
    const s = await state(page);
    expect(s.deaths).toBe(0);
    expect(s.player!.x).toBeGreaterThan(x0 + TILE);
    expect(s.enemies[0].x).toBeCloseTo(x0, 0);                            // frozen in place

    await wait(page, ENEMY.SCARE_MS);
    const recovered = await hedgehog(page);
    expect(recovered.scared).toBe(false);
    expect(recovered.harmful).toBe(true);
    expect(recovered.anim).toBe('hedgehog-walk');
});

test('a meow out of reach or behind the cat does nothing', async ({ page }) => {
    await standLeftOfHedgehog(page, 6);                                    // reach is 4 tiles
    await page.evaluate(() => window.__game!.press(['meow'], 50));
    await wait(page, 100);
    expect((await hedgehog(page)).scared).toBe(false);

    await standLeftOfHedgehog(page, 2);
    await page.evaluate(() => window.__game!.press(['left'], 30));        // turn away
    await wait(page, 2000);                                                // cooldown
    await page.evaluate(() => window.__game!.press(['meow'], 50));
    await wait(page, 100);
    expect((await hedgehog(page)).scared).toBe(false);
});

test('a scared hedgehog does not recover while the cat stands on it', async ({ page }) => {
    await standLeftOfHedgehog(page, 2);
    await page.evaluate(() => window.__game!.press(['meow'], 50));
    await page.waitForFunction(() => window.__game!.getState().enemies[0].scared);
    const h = await hedgehog(page);
    await teleport(page, h.x);                                             // right on top of it
    await wait(page, ENEMY.SCARE_MS + 500);
    expect((await hedgehog(page)).scared).toBe(true);
    expect((await state(page)).deaths).toBe(0);

    await page.evaluate(() => window.__game!.press(['right'], 600));      // step off
    await wait(page, 100);
    expect((await hedgehog(page)).scared).toBe(false);
    expect((await state(page)).deaths).toBe(0);
});
