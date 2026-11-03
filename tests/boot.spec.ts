import { test, expect } from '@playwright/test';

test('game boots without console errors', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('GL Driver Message')) problems.push(m.text()); });
    page.on('pageerror', e => problems.push(e.message));

    await page.goto('/');
    await page.waitForFunction(() => (window as any).__game?.scene.isActive('Game'));
    await page.screenshot({ path: 'test-results/boot.png' });

    expect(problems).toEqual([]);
});
