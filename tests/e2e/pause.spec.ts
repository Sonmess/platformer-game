import { test, expect, type Page } from '@playwright/test';
import { PLAYER, TILE } from '../../src/config/constants';

// Landmark in src/levels/level1.json: columns 90-107 are flat ground.
const GROUND_Y = 15 * TILE - PLAYER.HEIGHT / 2;
const FLAT_X = 92 * TILE;

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const wait = (page: Page, ms: number) => page.evaluate(m => window.__game!.wait(m), ms);

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [FLAT_X, GROUND_Y]);
    await page.waitForFunction(() => window.__game!.getState().player!.onGround);
});

test('Esc freezes the level mid-run; Esc again continues it', async ({ page }) => {
    // Pause while running and in the air, the hardest moment to freeze cleanly.
    await page.evaluate(() => { const g = window.__game!; g.press(['right'], 2000); g.press(['jump'], 150); });
    await wait(page, 120);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__game!.getState().paused);

    const frozen = await state(page);
    expect(frozen.scene).toBe('Pause');
    await wait(page, 600);
    const later = await state(page);
    expect(later.player).toEqual(frozen.player);              // position, velocity, animation
    expect(later.timeMs).toBe(frozen.timeMs);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__game!.getState().paused);
    await wait(page, 300);
    const resumed = await state(page);
    expect(resumed.scene).toBe('Game');
    expect(resumed.timeMs).toBeGreaterThan(frozen.timeMs);
});

test('P pauses too, and the key that resumes does not pause again', async ({ page }) => {
    await page.keyboard.press('p');
    await page.waitForFunction(() => window.__game!.getState().paused);
    await page.keyboard.press('p');
    await page.waitForFunction(() => !window.__game!.getState().paused);
    await wait(page, 300);
    expect((await state(page)).paused).toBe(false);
});

test('a jump pressed during the pause is not buffered into the resumed game', async ({ page }) => {
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__game!.getState().paused);
    await page.keyboard.press('Space');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__game!.getState().paused);
    await wait(page, 300);
    const s = await state(page);
    expect(s.player!.onGround).toBe(true);
    expect(s.sfx).not.toContain('sfx-jump');
});

test('Q in the pause menu goes to the title, and a new game starts clean', async ({ page }) => {
    const listeners = (await state(page)).listeners;
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__game!.getState().paused);
    await page.keyboard.press('q');
    await page.waitForFunction(() => window.__game!.getState().scene === 'Title');
    const onTitle = await state(page);
    expect(onTitle.hud).toBeNull();
    expect(onTitle.paused).toBe(false);

    await wait(page, 400);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__game!.getState().player?.onGround === true);
    const s = await state(page);
    expect(s.listeners).toEqual(listeners);
    expect(s.parallaxListeners).toBe(1);
    expect(s.deaths).toBe(0);
});
