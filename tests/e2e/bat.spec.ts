import { test, expect, type Page } from '@playwright/test';
import { ASSETS, AUDIO, BAT, PLAYER, TILE } from '../../src/config/constants';
import { landmarks } from './landmarks';

// Bats (M5 step 4), in level 3: the first of the bat grove hangs high (under a ledge in row 9) over flat floor (row 15).
const L = landmarks(3);
const GROVE = L.BATS.findIndex(b => b.x > 145 * TILE);
const B = L.BATS[GROVE];
const I = L.batIndex(GROVE);
const ROOST_Y = B.y + BAT.SPRITE_HEIGHT - BAT.HEIGHT / 2;     // the hitbox centre while it hangs
const GROUND_Y = 15 * TILE - PLAYER.HEIGHT / 2;

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const bat = async (page: Page) => (await state(page)).enemies[I];
const wait = (page: Page, ms: number) => page.evaluate(m => window.__game!.wait(m), ms);
const teleport = (page: Page, x: number, y = GROUND_Y) => page.evaluate(([px, py]) => window.__game!.teleport(px, py), [x, y]);

/** Stands `gap` px left of the bat's branch, facing right, and waits until the bat is low on its swoop, then acts. */
async function standAndWaitForTheDive (page: Page, gap: number)
{
    await page.evaluate(() => window.__game!.press(['right'], 30));
    await teleport(page, B.x - gap);
    await page.evaluate(async ([i, y]) => {
        const g = window.__game!;
        for (let t = 0; t < 4000; t += 16) {
            const e = g.getState().enemies[i];
            if (e.phase === 'swooping' && e.y >= y - 28) return;
            await g.wait(16);
        }
        throw new Error('the bat never dived');
    }, [I, GROUND_Y] as const);
}

test.beforeEach(async ({ page }) => {
    await page.goto('/?play=3');
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
    await teleport(page, B.x - 5 * TILE);                                   // near the grove first: the camera catches up (sounds play only near it)
    await wait(page, 1200);
});

test('a bat hangs on its branch while the cat is not below it', async ({ page }) => {
    let b = await bat(page);
    expect(b).toMatchObject({ kind: 'bat', phase: 'hanging', harmful: true, anim: ASSETS.BAT.hang.key });
    expect(b.x).toBeCloseTo(B.x, 0);
    expect(b.y).toBeCloseTo(ROOST_Y, 0);
    await teleport(page, B.x - 4 * TILE);
    await wait(page, 1000);
    b = await bat(page);
    expect(b.phase).toBe('hanging');
    expect((await state(page)).deaths).toBe(0);
});

test('standing below it: it wakes with a squeak, swoops down onto the cat and hurts it, then flies back up', async ({ page }) => {
    await teleport(page, B.x);
    await page.waitForFunction(i => window.__game!.getState().enemies[i].phase === 'waking', I);
    expect((await state(page)).sfx).toContain(AUDIO.SFX.BAT.key);
    expect((await state(page)).deaths).toBe(0);                            // the warning itself is harmless
    await page.waitForFunction(() => window.__game!.getState().deaths === 1);
    await page.waitForFunction(i => window.__game!.getState().enemies[i].phase === 'resting', I);
    const b = await bat(page);
    expect(b.y).toBeCloseTo(ROOST_Y, 0);                                   // back on its branch
});

test('a cat that keeps running gets past before the bat arrives', async ({ page }) => {
    await teleport(page, B.x + 3 * TILE);                                   // the pit is to the right: run back left under it
    await page.waitForFunction(() => window.__game!.getState().player!.onGround);
    await page.evaluate(() => window.__game!.press(['left'], 1000));
    await page.waitForFunction(i => window.__game!.getState().enemies[i].phase === 'resting', I);
    expect((await state(page)).deaths).toBe(0);
});

test('a meow scares a diving bat back up to its branch, harmless; then the claw drives it away for good', async ({ page }) => {
    await standAndWaitForTheDive(page, 30);
    await page.evaluate(() => window.__game!.press(['meow'], 50));
    await page.waitForFunction(i => window.__game!.getState().enemies[i].scared, I);
    let b = await bat(page);
    expect(b).toMatchObject({ harmful: false, anim: ASSETS.BAT.scared.key });
    const low = b.y;
    await wait(page, 300);
    expect((await bat(page)).y).toBeLessThan(low);                         // fluttering back up
    expect((await state(page)).deaths).toBe(0);

    // Still within reach while it climbs: swipe it away.
    await page.evaluate(([i]) => {
        const g = window.__game!;
        const e = g.getState().enemies[i];
        g.teleport(e.x - 20, e.y);
        void g.press(['claw'], 50);
    }, [I] as const);
    await page.waitForFunction(i => window.__game!.getState().enemies[i].gone, I);
    b = await bat(page);
    expect(b).toMatchObject({ gone: true, harmful: false });
});
