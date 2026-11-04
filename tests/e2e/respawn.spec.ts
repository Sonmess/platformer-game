import { test, expect, type Page } from '@playwright/test';
import { TILE } from '../../src/config/constants';

// Landmarks in src/levels/level1.json (tile coordinates).
const SPAWN = { x: 3.5 * TILE, y: 15 * TILE };          // feet
const FIRST_PIT_COL = 51;                               // pit 50-53
const WIDE_PIT_COL = 64;                                // pit 62-70
const SPIKES_AFTER_WALL_COL = 85;                       // spikes 85-86 on row 14
const CHECKPOINT_1 = { col: 56, feetY: 15 * TILE };     // zone 56, rows 13-14

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const game = (page: Page) => ({
    teleport: (x: number, y: number) => page.evaluate(([px, py]) => window.__game!.teleport(px, py), [x, y]),
    wait: (ms: number) => page.evaluate(m => window.__game!.wait(m), ms),
    waitForDeaths: (n: number) => page.waitForFunction(d => window.__game!.getState().deaths >= d, n)
});

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

test('starts with no deaths and the checkpoint at the spawn', async ({ page }) => {
    const s = await state(page);
    expect(s.deaths).toBe(0);
    expect(s.checkpoint).toEqual(SPAWN);
});

test('falling into a pit respawns at the spawn and counts a death', async ({ page }) => {
    await game(page).teleport(FIRST_PIT_COL * TILE, 12 * TILE);
    await game(page).waitForDeaths(1);
    await game(page).wait(200);

    const s = await state(page);
    expect(s.deaths).toBe(1);
    expect(s.player!.x).toBeCloseTo(SPAWN.x, 0);
    expect(s.player!.onGround).toBe(true);
    // Camera snapped back instead of sliding across the level.
    expect(s.player!.x - s.camera!.scrollX).toBeGreaterThanOrEqual(0);
    expect(s.player!.x - s.camera!.scrollX).toBeLessThanOrEqual(s.camera!.width);
});

test('touching spikes kills exactly once', async ({ page }) => {
    await game(page).teleport(SPIKES_AFTER_WALL_COL * TILE + TILE, 12 * TILE);
    await game(page).waitForDeaths(1);
    await game(page).wait(300);
    expect((await state(page)).deaths).toBe(1);
});

test('reaching a checkpoint moves the respawn point there', async ({ page }) => {
    const cpX = CHECKPOINT_1.col * TILE + TILE / 2;
    await game(page).teleport(cpX, 13 * TILE);
    await page.waitForFunction(x => window.__game!.getState().checkpoint.x === x, cpX);
    expect((await state(page)).checkpoint).toEqual({ x: cpX, y: CHECKPOINT_1.feetY });

    await game(page).teleport(WIDE_PIT_COL * TILE, 12 * TILE);
    await game(page).waitForDeaths(1);
    await game(page).wait(200);
    const s = await state(page);
    expect(s.player!.x).toBeCloseTo(cpX, 0);
    expect(s.player!.onGround).toBe(true);
});
