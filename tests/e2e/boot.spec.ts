import { test, expect } from '@playwright/test';

// Headless Chromium logs GPU driver notices as warnings; they are not game output.
const IGNORED = ['GL Driver Message'];

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
