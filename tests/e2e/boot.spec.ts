import { test, expect } from '@playwright/test';

// Headless Chromium logs GPU driver notices as warnings; they are not game output. It also warns when
// Phaser tries to resume audio (e.g. on a focus change) before any user gesture: the browser's
// autoplay policy, not a bug — a real player's first key press unlocks the sound.
const IGNORED = ['GL Driver Message', 'The AudioContext was not allowed to start'];

test('game boots into the title screen without console errors', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', m => {
        if ((m.type() === 'error' || m.type() === 'warning') && !IGNORED.some(t => m.text().includes(t))) {
            problems.push(m.text());
        }
    });
    page.on('pageerror', e => problems.push(e.message));

    await page.goto('/');
    await page.waitForFunction(() => window.__game?.getState().scene === 'Title');

    const state = await page.evaluate(() => window.__game!.getState());
    expect(state.scene).toBe('Title');

    await page.screenshot({ path: 'test-results/boot.png' });
    expect(problems).toEqual([]);
});
