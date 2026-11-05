import { test, expect } from '@playwright/test';

// references/qa.md: steady ~60 FPS; flag drops below ~55 after a few seconds of play.
// Runs the busiest case: running and jumping (camera, all parallax layers and dust moving).
// FPS also depends on whatever else the machine is doing, so a dip gets a retry before it fails.
test.describe.configure({ retries: 2 });

test('holds ~60 FPS while running and jumping through the level', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);

    const fps = await page.evaluate(async () => {
        const g = window.__game!;
        const samples: number[] = [];
        for (let i = 0; i < 10; i++) {
            g.press(['right'], 500);
            if (i % 2 === 0) g.press(['jump'], 200);
            await g.wait(500);
            samples.push(g.game.loop.actualFps);
        }
        return samples.slice(4);        // after the first ~2 s (actualFps is a running average)
    });
    expect(Math.min(...fps)).toBeGreaterThan(55);
});
