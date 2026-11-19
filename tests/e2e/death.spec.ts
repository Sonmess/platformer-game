import { test, expect, type Page } from '@playwright/test';
import { DEATH, TILE } from '../../src/config/constants';

// Landmarks in src/levels/level1.json (tile coordinates): spikes on row 14 at cols 87-88 (after the wall),
// the first pit at cols 50-53, the spawn at col 3.5 on row 15.
const ON_SPIKES = { x: 88 * TILE, y: 12 * TILE };
const FIRST_PIT = { x: 51 * TILE, y: 12 * TILE };
const SPAWN_X = 3.5 * TILE;

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const wait = (page: Page, ms: number) => page.evaluate(m => window.__game!.wait(m), ms);
const teleport = (page: Page, p: { x: number; y: number }) => page.evaluate(([x, y]) => window.__game!.teleport(x, y), [p.x, p.y]);
const waitForDeaths = (page: Page, n: number) => page.waitForFunction(d => window.__game!.getState().deaths === d, n);
const waitForRespawn = (page: Page) => page.waitForFunction(() => !window.__game!.getState().player!.dying);

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

test('the death animation plays in place with the controls off, then the cat is back at the checkpoint', async ({ page }) => {
    await teleport(page, ON_SPIKES);
    await waitForDeaths(page, 1);
    const first = await state(page);
    expect(first.player).toMatchObject({ dying: true, anim: 'cat-hurt' });

    await page.evaluate(() => window.__game!.hold(['right', 'jump']));     // mashing keys changes nothing
    await wait(page, DEATH.ANIM_MS / 2);
    const mid = await state(page);
    expect(mid.player!.dying).toBe(true);
    expect(mid.player!.x).toBe(first.player!.x);                          // the body stays put
    expect(mid.camera!.scrollX).toBe(first.camera!.scrollX);              // the camera holds still
    expect(mid.player!.spriteAngle).not.toBe(0);                          // the sprite spins off
    await page.evaluate(() => window.__game!.release(['right', 'jump']));

    await waitForRespawn(page);
    const back = await state(page);
    expect(back.player).toMatchObject({ dying: false, invulnerable: true, spriteAngle: 0 });
    expect(back.player!.x).toBeCloseTo(SPAWN_X, 0);
    expect(back.deaths).toBe(1);
});

test('an arrow held through the death does not walk the cat off after the respawn', async ({ page }) => {
    await page.evaluate(() => window.__game!.hold(['right']));
    await teleport(page, FIRST_PIT);
    await waitForDeaths(page, 1);
    await waitForRespawn(page);
    await wait(page, 600);
    let s = await state(page);
    expect(s.player!.x).toBeCloseTo(SPAWN_X, 0);                          // still held, still standing
    expect(s.player!.awaitingRelease).toBe(true);

    await page.evaluate(() => window.__game!.release(['right']));
    await wait(page, 50);
    await page.evaluate(() => window.__game!.press(['right'], 300));      // a fresh press moves it
    s = await state(page);
    expect(s.player!.awaitingRelease).toBe(false);
    expect(s.player!.x).toBeGreaterThan(SPAWN_X + TILE);
});

test('just respawned, spikes do not hurt for a moment, but a pit always does', async ({ page }) => {
    await teleport(page, FIRST_PIT);
    await waitForDeaths(page, 1);
    await waitForRespawn(page);

    await teleport(page, ON_SPIKES);                                       // still invulnerable
    await wait(page, 200);
    expect((await state(page)).deaths).toBe(1);

    await teleport(page, FIRST_PIT);                                       // a pit counts anyway
    await waitForDeaths(page, 2);
    await waitForRespawn(page);

    await wait(page, DEATH.INVULNERABLE_MS + 100);
    expect((await state(page)).player!.invulnerable).toBe(false);
    await teleport(page, ON_SPIKES);
    await waitForDeaths(page, 3);
});
