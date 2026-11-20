import { test, expect, type Page } from '@playwright/test';
import { AUDIO, PLAYER, STALACTITE, TILE } from '../../src/config/constants';
import { landmarks } from './landmarks';

// Falling stalactites (M4 step 7), in level 2 (the cave): the first one hangs over flat floor (row 15) a few tiles
// after the spawn (and its yarn ball), nothing else within 10 tiles of it.
const { STALACTITES } = landmarks(2);
const S0 = STALACTITES[0];
const GROUND_Y = 15 * TILE - PLAYER.HEIGHT / 2;

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const wait = (page: Page, ms: number) => page.evaluate(m => window.__game!.wait(m), ms);
const teleport = (page: Page, x: number, y = GROUND_Y) => page.evaluate(([px, py]) => window.__game!.teleport(px, py), [x, y]);
const phase = async (page: Page, i = 0) => (await state(page)).stalactites[i].phase;

test.beforeEach(async ({ page }) => {
    await page.goto('/?play=2');
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

test('the cave has stalactites; they hang still while the cat is not under them', async ({ page }) => {
    expect((await state(page)).stalactites.length).toBe(STALACTITES.length);
    await teleport(page, S0.x - 3 * TILE);
    await wait(page, 1000);
    const s = await state(page);
    expect(s.stalactites[0]).toMatchObject({ x: S0.x, y: S0.y, phase: 'hanging', dropPx: 0, visible: true });
    expect(s.deaths).toBe(0);
});

test('standing under one: it shakes first (rumble, harmless), then falls, hurts the cat and shatters', async ({ page }) => {
    await teleport(page, S0.x);
    await page.waitForFunction(() => window.__game!.getState().stalactites[0].phase === 'shaking');
    let s = await state(page);
    expect(s.deaths).toBe(0);
    expect(s.sfx).toContain(AUDIO.SFX.RUMBLE.key);

    await wait(page, STALACTITE.SHAKE_MS / 2);
    expect(await phase(page)).toBe('shaking');                              // the warning lasts
    expect((await state(page)).deaths).toBe(0);

    await page.waitForFunction(() => window.__game!.getState().deaths === 1);
    s = await state(page);
    expect(s.stalactites[0].dropPx).toBeGreaterThan(0);
    await page.waitForFunction(() => window.__game!.getState().stalactites[0].phase === 'shattered');
    s = await state(page);
    expect(s.stalactites[0].visible).toBe(false);
    expect(s.sfx).toContain(AUDIO.SFX.SHATTER.key);
});

test('a cat that keeps running gets past: the stalactites fall behind it', async ({ page }) => {
    await teleport(page, S0.x - 3 * TILE);
    await page.waitForFunction(() => window.__game!.getState().player!.onGround);
    await page.evaluate(() => window.__game!.press(['right'], 1500));
    await page.waitForFunction(() => window.__game!.getState().stalactites[0].phase === 'shattered');
    const s = await state(page);
    expect(s.deaths).toBe(0);
    expect(s.player!.x).toBeGreaterThan(S0.x + 2 * TILE);
});

test('after the respawn it hangs again', async ({ page }) => {
    await teleport(page, S0.x);
    await page.waitForFunction(() => window.__game!.getState().deaths === 1 && !window.__game!.getState().player!.dying);
    await page.waitForFunction(() => window.__game!.getState().stalactites[0].phase === 'hanging');
    const s = await state(page);
    expect(s.stalactites[0]).toMatchObject({ phase: 'hanging', dropPx: 0, visible: true });
});
