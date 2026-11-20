import { test, expect, type Page } from '@playwright/test';
import { AUDIO, CLAW, FLEE, LIVES, PLAYER, RESULTS, TILE } from '../../src/config/constants';
import { CROWS, GOAL, HEDGEHOGS } from './landmarks';

// Landmarks in src/levels/level1.json: columns 90-107 are flat ground (row 15); the first hedgehog patrols cols
// 18-31 on flat ground. The up-and-down crow of the finale has spikes two tiles to its left, so the cat claws it
// from the right. The first pit is at cols 50-53.
const GROUND_Y = 15 * TILE - PLAYER.HEIGHT / 2;
const FLAT_X = 98 * TILE;
const FIRST_PIT = { x: 51 * TILE, y: 12 * TILE };
const VERTICAL = CROWS.findIndex(c => c.vertical);
const CROW_BOTTOM = CROWS[VERTICAL].y + CROWS[VERTICAL].height;
/** Its index in getState().enemies (hedgehogs first, then crows, each in level order). */
const CROW = HEDGEHOGS.length + VERTICAL;
/** Hitbox centres this far apart: just inside the claw's reach (hitbox half widths 9 + 7, reach 14). */
const CLAW_GAP = 28;

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const wait = (page: Page, ms: number) => page.evaluate(m => window.__game!.wait(m), ms);
const teleport = (page: Page, x: number, y = GROUND_Y) => page.evaluate(([px, py]) => window.__game!.teleport(px, py), [x, y]);
const claw = (page: Page) => page.evaluate(() => window.__game!.press(['claw'], 50));
const hedgehog = async (page: Page) => (await state(page)).enemies[0];

/** Faces the first hedgehog from `gap` px to its left (on the ground) and swipes at once, before it walks on. */
async function clawHedgehogFromLeft (page: Page, gap = CLAW_GAP)
{
    await page.evaluate(() => window.__game!.press(['right'], 30));        // face right
    await page.evaluate(async ([g, y]) => {
        const api = window.__game!;
        api.teleport(api.getState().enemies[0].x - g, y);
        await api.press(['claw'], 50);
    }, [gap, GROUND_Y]);
}

/** Waits for the finale's crow to fly low, then swipes at it from the right, facing left. */
async function clawCrow (page: Page)
{
    const i = CROW;
    await page.evaluate(() => window.__game!.press(['left'], 30));         // face left
    await page.waitForFunction(([idx, bottom]) => window.__game!.getState().enemies[idx].y > bottom - 20, [i, CROW_BOTTOM]);
    await page.evaluate(async ([idx, g]) => {
        const api = window.__game!;
        const c = api.getState().enemies[idx];
        api.teleport(c.x + g, c.y);
        await api.press(['claw'], 50);
    }, [i, CLAW_GAP]);
    return i;
}

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

test('C swipes in front of the cat: raised paw, sound, short cooldown; works in the air and to the left', async ({ page }) => {
    await teleport(page, FLAT_X);
    await page.waitForFunction(() => window.__game!.getState().player!.onGround);
    await page.keyboard.press('c');
    await page.waitForFunction(() => window.__game!.getState().claw.count === 1);
    let s = await state(page);
    expect(s.claw.last).toMatchObject({ dir: 1, behind: CLAW.BEHIND_PX, halfHeight: CLAW.HALF_HEIGHT_PX });
    expect(s.claw.last!.reach).toBe(PLAYER.WIDTH / 2 + CLAW.REACH_PX);
    expect(s.player!.anim).toBe('cat-claw');
    expect(s.sfx.at(-1)).toBe(AUDIO.SFX.CLAW.key);
    expect(s.claw.cooldownMs).toBeGreaterThan(0);

    await claw(page);                                                     // still cooling down
    expect((await state(page)).claw.count).toBe(1);
    await wait(page, CLAW.COOLDOWN_MS);
    expect((await state(page)).player!.anim).not.toBe('cat-claw');

    await page.evaluate(() => window.__game!.press(['left'], 100));
    await page.evaluate(async () => {
        const g = window.__game!;
        g.press(['jump'], 300);
        await g.wait(150);
        await g.press(['claw'], 50);
    });
    s = await state(page);
    expect(s.claw.count).toBe(2);
    expect(s.claw.last!.dir).toBe(-1);
    expect(s.player!.onGround).toBe(false);
});

test('a clawed crow flees: no longer harmful, flies off fading, and the cat can stand where it was', async ({ page }) => {
    const i = await clawCrow(page);
    await page.waitForFunction(idx => window.__game!.getState().enemies[idx].gone, i);
    let s = await state(page);
    expect(s.enemies[i]).toMatchObject({ gone: true, harmful: false });
    expect(s.sfx).toContain(AUDIO.SFX.FLEE.key);
    const where = s.enemies[i];

    await wait(page, FLEE.MS + 100);
    s = await state(page);
    expect(s.enemies[i].spriteAlpha).toBeCloseTo(0, 1);
    await teleport(page, where.x, where.y);                               // right where the crow was
    await wait(page, 300);
    expect((await state(page)).deaths).toBe(0);
});

test('clawing a hedgehog that is not scared: its spines prick the cat', async ({ page }) => {
    await clawHedgehogFromLeft(page);
    await page.waitForFunction(() => window.__game!.getState().deaths === 1);
    const s = await state(page);
    expect(s.lives).toBe(LIVES.START - 1);
    expect(s.enemies[0]).toMatchObject({ gone: false, harmful: true });
});

test('a claw out of reach does nothing', async ({ page }) => {
    await clawHedgehogFromLeft(page, CLAW_GAP + TILE);
    await wait(page, 100);
    const s = await state(page);
    expect(s.claw.count).toBe(1);
    expect(s.deaths).toBe(0);
    expect(s.enemies[0].gone).toBe(false);
});

test('meow first, then claw: the curled-up hedgehog runs away and the cat walks on', async ({ page }) => {
    await page.evaluate(() => window.__game!.press(['right'], 30));
    const h = await hedgehog(page);
    await teleport(page, h.x - 2 * TILE);
    await page.waitForFunction(() => window.__game!.getState().player!.onGround);
    await page.evaluate(() => window.__game!.press(['meow'], 50));
    await page.waitForFunction(() => window.__game!.getState().enemies[0].scared);

    await clawHedgehogFromLeft(page);
    await page.waitForFunction(() => window.__game!.getState().enemies[0].gone);
    const x0 = (await hedgehog(page)).x;
    await page.evaluate(() => window.__game!.press(['right'], 900));      // through where it was
    const s = await state(page);
    expect(s.deaths).toBe(0);
    expect(s.player!.x).toBeGreaterThan(x0 + TILE);
});

test('a big cat (yarn ball) claws further: a scared hedgehog out of the small cat\'s reach still runs away', async ({ page }) => {
    const gap = CLAW_GAP + CLAW.BIG_EXTRA_REACH_PX - 2;                  // beyond the normal reach, inside the big one
    await teleport(page, 36.5 * TILE, 11.5 * TILE);                       // the first yarn ball, on the plateau
    await page.waitForFunction(() => window.__game!.getState().player!.big);
    await page.evaluate(() => window.__game!.press(['right'], 30));
    await teleport(page, (await hedgehog(page)).x - 2 * TILE);
    await page.evaluate(() => window.__game!.press(['meow'], 50));
    await page.waitForFunction(() => window.__game!.getState().enemies[0].scared);

    await clawHedgehogFromLeft(page, gap);
    await page.waitForFunction(() => window.__game!.getState().enemies[0].gone);
    expect((await state(page)).claw.last!.reach).toBe(PLAYER.WIDTH / 2 + CLAW.REACH_PX + CLAW.BIG_EXTRA_REACH_PX);
});

test('the small cat does not reach as far as the big one', async ({ page }) => {
    await page.evaluate(() => window.__game!.press(['right'], 30));
    await teleport(page, (await hedgehog(page)).x - 2 * TILE);
    await page.evaluate(() => window.__game!.press(['meow'], 50));
    await page.waitForFunction(() => window.__game!.getState().enemies[0].scared);
    await clawHedgehogFromLeft(page, CLAW_GAP + CLAW.BIG_EXTRA_REACH_PX - 2);
    await wait(page, 100);
    expect((await state(page)).enemies[0].gone).toBe(false);
});

test('a fled enemy stays away after the cat dies, and is back when the level restarts', async ({ page }) => {
    const i = await clawCrow(page);
    await page.waitForFunction(idx => window.__game!.getState().enemies[idx].gone, i);

    await teleport(page, FIRST_PIT.x, FIRST_PIT.y);
    await page.waitForFunction(() => window.__game!.getState().deaths === 1 && !window.__game!.getState().player!.dying);
    expect((await state(page)).enemies[i].gone).toBe(true);

    await teleport(page, GOAL.x, GOAL.y);
    await page.waitForFunction(() => window.__game!.getState().scene === 'LevelComplete');
    await wait(page, RESULTS.INPUT_DELAY_MS);
    await page.evaluate(() => window.__game!.press(['confirm'], 100));
    await page.waitForFunction(() => window.__game!.getState().scene === 'Game' && window.__game!.getState().player?.onGround === true);
    const s = await state(page);
    expect(s.enemies[i]).toMatchObject({ gone: false, harmful: true, spriteAlpha: 1 });
});
