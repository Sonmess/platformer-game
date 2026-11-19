import { test, expect, type Page } from '@playwright/test';
import { AUDIO, CRUMBLE, TILE } from '../../src/config/constants';

// Landmark in src/levels/level1.json: a 3-tile crumbling platform on row 6, cols 110-112, high above the
// last pit (cols 108-111) and the ground.
const CRUMBLE_AT = { x: 110 * TILE, y: 6 * TILE, width: 3 * TILE };
const FIRST_PIT = { x: 51 * TILE, y: 12 * TILE };

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const crumble = async (page: Page) => (await state(page)).crumbles[0];
const wait = (page: Page, ms: number) => page.evaluate(m => window.__game!.wait(m), ms);
const waitForPhase = (page: Page, phase: string) =>
    page.waitForFunction(p => window.__game!.getState().crumbles[0].phase === p, phase);

/** Drops the cat onto the crumbling platform and waits until it stands on it. */
async function standOnIt (page: Page)
{
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [CRUMBLE_AT.x + CRUMBLE_AT.width / 2, CRUMBLE_AT.y - 12]);
    await page.waitForFunction(() => window.__game!.getState().player!.onGround);
}

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

test('it holds until the cat steps on it', async ({ page }) => {
    const c = await crumble(page);
    expect(c).toMatchObject({ x: CRUMBLE_AT.x, y: CRUMBLE_AT.y, width: CRUMBLE_AT.width, phase: 'solid', solid: true });
    await wait(page, 1000);
    expect((await crumble(page)).phase).toBe('solid');
});

test('stepped on, it shakes, then falls away with the cat, and comes back later', async ({ page }) => {
    await standOnIt(page);
    await waitForPhase(page, 'shaking');
    let s = await state(page);
    expect(s.player!.onGround).toBe(true);                     // still standing while it shakes
    expect(s.sfx).toContain(AUDIO.SFX.CRACK.key);

    await waitForPhase(page, 'falling');
    s = await state(page);
    expect(s.crumbles[0].solid).toBe(false);
    expect(s.sfx).toContain(AUDIO.SFX.CRUMBLE.key);
    await wait(page, 300);
    s = await state(page);
    expect(s.player!.y).toBeGreaterThan(CRUMBLE_AT.y + TILE);  // the cat drops through
    expect(s.crumbles[0].imageY).toBeGreaterThan(CRUMBLE_AT.y); // the pieces fall too

    await waitForPhase(page, 'gone');
    expect((await crumble(page)).visible).toBe(false);
    await wait(page, CRUMBLE.RESPAWN_MS + 200);
    expect(await crumble(page)).toMatchObject({ phase: 'solid', solid: true, visible: true, imageX: CRUMBLE_AT.x, imageY: CRUMBLE_AT.y });
});

test('the cat can still jump off while it shakes', async ({ page }) => {
    await standOnIt(page);
    await waitForPhase(page, 'shaking');
    const y0 = (await state(page)).player!.y;
    await page.evaluate(() => window.__game!.press(['jump'], 300));
    expect((await state(page)).player!.y).toBeLessThan(y0 - TILE);
});

test('a death puts it straight back in place', async ({ page }) => {
    await standOnIt(page);
    await waitForPhase(page, 'falling');
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [FIRST_PIT.x, FIRST_PIT.y]);
    await page.waitForFunction(() => window.__game!.getState().deaths === 1);
    expect(await crumble(page)).toMatchObject({ phase: 'solid', solid: true, visible: true, imageX: CRUMBLE_AT.x, imageY: CRUMBLE_AT.y });
});
