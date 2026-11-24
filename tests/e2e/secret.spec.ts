import { test, expect, type Page } from '@playwright/test';
import { AUDIO, PLAYER, PROGRESS, RESULTS, TILE } from '../../src/config/constants';
import { landmarks } from './landmarks';

// The secret room of level 2 (M4 step 11): fake rock inside the cliff, entered from the floor on its right through a
// crack; a golden fish inside. Only a small cat gets in.
const L = landmarks(2);
const ROOM = L.SECRETS[0];
const GROUND_Y = 15 * TILE - PLAYER.HEIGHT / 2;
const OUTSIDE_X = ROOM.x + ROOM.width + 2.5 * TILE;                 // on the floor right of the crack
const YARN = { x: 145.5 * TILE, y: 14.5 * TILE };                  // the cave's second yarn ball

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const wait = (page: Page, ms: number) => page.evaluate(m => window.__game!.wait(m), ms);
const teleport = (page: Page, x: number, y = GROUND_Y) => page.evaluate(([px, py]) => window.__game!.teleport(px, py), [x, y]);

async function walkInForTheFish (page: Page)
{
    await teleport(page, OUTSIDE_X);
    await page.waitForFunction(() => window.__game!.getState().player!.onGround);
    await page.evaluate(() => window.__game!.hold(['left']));
    await page.waitForFunction(() => window.__game!.getState().treasures.found === 1);
    await page.evaluate(() => window.__game!.release(['left']));
}

test.beforeEach(async ({ page }) => {
    await page.goto('/?play=2');
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

test('the wall looks solid; a small cat walks through the crack, the rock turns see-through, the fish is taken and remembered', async ({ page }) => {
    let s = await state(page);
    expect(s.treasures).toMatchObject({ found: 0, total: 1, left: 1, saved: [] });
    expect(s.secrets[0]).toMatchObject({ inside: false, alpha: 1 });

    // A hint: dust drifts out of the crack now and then.
    await teleport(page, OUTSIDE_X);
    await page.waitForFunction(() => window.__game!.getState().secrets[0].dust > 0);

    await walkInForTheFish(page);
    await wait(page, 400);
    s = await state(page);
    expect(s.player!.x).toBeLessThan(ROOM.x + ROOM.width);                 // inside the cliff
    expect(s.secrets[0].inside).toBe(true);
    expect(s.secrets[0].alpha).toBeLessThan(0.5);
    expect(s.treasures).toMatchObject({ found: 1, left: 0, saved: ['level2:0'] });
    expect(s.sfx).toEqual(expect.arrayContaining([AUDIO.SFX.SECRET.key, AUDIO.SFX.TREASURE.key]));
    expect(await page.evaluate(k => localStorage.getItem(k), PROGRESS.TREASURES_KEY)).toBe('["level2:0"]');

    // Out again: the rock looks solid once more.
    await page.evaluate(() => window.__game!.press(['right'], 900));
    await wait(page, 400);
    expect((await state(page)).secrets[0]).toMatchObject({ inside: false, alpha: 1 });
});

test('a big cat (yarn ball) bumps into the crack and stays out', async ({ page }) => {
    await teleport(page, YARN.x, YARN.y);
    await page.waitForFunction(() => window.__game!.getState().player!.big);
    await teleport(page, OUTSIDE_X);
    await page.waitForFunction(() => window.__game!.getState().player!.onGround);
    await page.evaluate(() => window.__game!.press(['left'], 1200));
    const s = await state(page);
    expect(s.player!.x).toBeGreaterThan(ROOM.x + ROOM.width);
    expect(s.secrets[0].inside).toBe(false);
    expect(s.treasures.found).toBe(0);
});

test('the results show the treasure; after a reload the fish is there again, already remembered', async ({ page }) => {
    await walkInForTheFish(page);
    await teleport(page, L.GOAL.x, L.GOAL.y);
    await page.waitForFunction(() => window.__game!.getState().scene === 'LevelComplete');
    expect((await state(page)).results).toContain(`${RESULTS.TEXT.TREASURE}: 1/1`);

    await page.goto('/?play=2');
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
    const s = await state(page);
    expect(s.treasures).toMatchObject({ found: 0, total: 1, left: 1, saved: ['level2:0'] });
});

test('without the fish the results say 0/1; the forest has no treasure line', async ({ page }) => {
    await teleport(page, L.GOAL.x, L.GOAL.y);
    await page.waitForFunction(() => window.__game!.getState().scene === 'LevelComplete');
    expect((await state(page)).results).toContain(`${RESULTS.TEXT.TREASURE}: 0/1`);

    await page.goto('/?play');
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
    const L1 = landmarks(1);
    await teleport(page, L1.GOAL.x, L1.GOAL.y);
    await page.waitForFunction(() => window.__game!.getState().scene === 'LevelComplete');
    expect((await state(page)).results!.some(l => l.startsWith(RESULTS.TEXT.TREASURE))).toBe(false);
});

test('level 3: its room by the vine is not tight, a big cat gets in too', async ({ page }) => {
    const L3 = landmarks(3);
    const room = L3.SECRETS[0];
    await page.goto('/?play=3');
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true && window.__game.getState().levelNumber === 3);
    await teleport(page, 146.5 * TILE, 14.5 * TILE);                                  // the yarn ball of the bat grove
    await page.waitForFunction(() => window.__game!.getState().player!.big);
    // Like a player: onto the vine left of the room, level with it, then a little hop off it into the crack.
    const vine = L3.VINES.find(v => v.col === 116)!;
    await teleport(page, vine.x + vine.width / 2, room.y + room.height - PLAYER.HEIGHT / 2 - 4);
    await page.evaluate(() => window.__game!.hold(['up']));
    await page.waitForFunction(() => window.__game!.getState().player!.climbing);
    await page.evaluate(() => { window.__game!.release(['up']); window.__game!.hold(['right']); void window.__game!.press(['jump'], 120); });
    await page.waitForFunction(() => window.__game!.getState().treasures.found === 1);
    await page.evaluate(() => window.__game!.release(['right']));
    const s = await state(page);
    expect(s.player!.big).toBe(true);
    expect(s.secrets[0].inside).toBe(true);
});
