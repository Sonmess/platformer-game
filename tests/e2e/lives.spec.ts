import { test, expect, type Page } from '@playwright/test';
import { AUDIO, GAME_OVER, LIVES, TILE } from '../../src/config/constants';

// Landmark in src/levels/level1.json: the first pit, cols 50-53 (before the first checkpoint, so a death
// there always respawns at the spawn).
const FIRST_PIT = { x: 51 * TILE, y: 12 * TILE };

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const wait = (page: Page, ms: number) => page.evaluate(m => window.__game!.wait(m), ms);

/** Falls into the first pit and waits until the death animation is over (respawn or game over). */
async function dieOnce (page: Page)
{
    const before = (await state(page)).deaths;
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [FIRST_PIT.x, FIRST_PIT.y]);
    await page.waitForFunction(d => window.__game!.getState().deaths === d + 1, before);
    await page.waitForFunction(() => {
        const s = window.__game!.getState();
        return s.scene === 'GameOver' || (s.player !== null && !s.player.dying);
    });
}

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

test('the cat starts with three lives and each death takes one; the HUD shows one cat head per life', async ({ page }) => {
    let s = await state(page);
    expect(s.lives).toBe(LIVES.START);
    expect(s.hud!.livesShown).toBe(LIVES.START);

    await dieOnce(page);
    s = await state(page);
    expect(s.lives).toBe(LIVES.START - 1);
    expect(s.hud!.livesShown).toBe(LIVES.START - 1);
});

test('losing the last life shows "game over"; Enter starts the level again with three lives', async ({ page }) => {
    test.setTimeout(90_000);
    for (let i = 0; i < LIVES.START; i++) await dieOnce(page);
    let s = await state(page);
    expect(s.scene).toBe('GameOver');
    expect(s.lives).toBe(0);
    expect(s.hud).toBeNull();
    expect(s.sfx.at(-1)).toBe(AUDIO.SFX.GAME_OVER.key);
    expect(s.music.playing).toBe(false);                      // the jingle plays alone
    expect(s.sfx.filter(k => k === AUDIO.SFX.DIE.key)).toHaveLength(LIVES.START);   // a hurt cat sound per death

    await page.keyboard.press('Enter');                       // too early: still showing the screen
    await wait(page, 100);
    expect((await state(page)).scene).toBe('GameOver');

    await wait(page, GAME_OVER.INPUT_DELAY_MS);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__game!.getState().player?.onGround === true);
    s = await state(page);
    expect(s).toMatchObject({ scene: 'Game', lives: LIVES.START, deaths: 0, coins: 0 });
    expect(s.music).toMatchObject({ playing: true, instances: 1 });  // and the loop is back
    expect(s.player!.x).toBeCloseTo(3.5 * TILE, 0);
});

test('Esc on the "game over" screen goes back to the title', async ({ page }) => {
    test.setTimeout(90_000);
    for (let i = 0; i < LIVES.START; i++) await dieOnce(page);
    await wait(page, GAME_OVER.INPUT_DELAY_MS);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__game!.getState().scene === 'Title');
    expect((await state(page)).music.playing).toBe(true);     // the title starts the music again
});
