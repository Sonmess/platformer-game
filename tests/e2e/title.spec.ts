import { test, expect, type Page } from '@playwright/test';
import { RESULTS, TITLE } from '../../src/config/constants';
import { GOAL } from './landmarks';

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const wait = (page: Page, ms: number) => page.evaluate(m => window.__game!.wait(m), ms);
const waitForScene = (page: Page, scene: string) =>
    page.waitForFunction(s => window.__game?.getState().scene === s, scene);

async function waitForPlaying (page: Page)
{
    await page.waitForFunction(() => {
        const s = window.__game?.getState();
        return s?.scene === 'Game' && s.hud !== null && s.player?.onGround === true;
    });
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForScene(page, 'Title');
});

test('title screen drifts the forest, blinks the prompt and shows no HUD', async ({ page }) => {
    const first = (await state(page)).title!;
    let sawHidden = false, sawVisible = false;
    for (let i = 0; i < 6; i++) {
        await wait(page, TITLE.PROMPT_BLINK_MS / 2);
        const t = (await state(page)).title!;
        if (t.promptVisible) sawVisible = true; else sawHidden = true;
    }
    const s = await state(page);
    expect(s.title!.scrollX).toBeGreaterThan(first.scrollX);
    expect(sawVisible && sawHidden).toBe(true);
    expect(s.hud).toBeNull();
    expect(s.player).toBeNull();
});

test('jump does nothing on the title; confirm starts the level', async ({ page }) => {
    await wait(page, TITLE.INPUT_DELAY_MS);
    await page.evaluate(() => window.__game!.press(['jump'], 100));
    await wait(page, TITLE.FADE_MS * 2);
    expect((await state(page)).scene).toBe('Title');

    await page.keyboard.press('Enter');                     // a real key, not only the test API
    await waitForPlaying(page);
    const s = await state(page);
    expect(s.deaths).toBe(0);
    expect(s.coins).toBe(0);
});

test('Esc on the results goes back to the title, and the next run starts clean', async ({ page }) => {
    await wait(page, TITLE.INPUT_DELAY_MS);
    await page.evaluate(() => window.__game!.press(['confirm'], 100));
    await waitForPlaying(page);
    const firstRun = await state(page);

    for (let i = 0; i < 3; i++) {
        await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [GOAL.x, GOAL.y]);
        await waitForScene(page, 'LevelComplete');
        await wait(page, RESULTS.INPUT_DELAY_MS);
        await page.keyboard.press('Escape');
        await waitForScene(page, 'Title');

        await wait(page, TITLE.INPUT_DELAY_MS);
        await page.evaluate(() => window.__game!.press(['confirm'], 100));
        await waitForPlaying(page);
        const s = await state(page);
        expect(s.listeners, `run ${i + 2}`).toEqual(firstRun.listeners);
        expect(s.parallaxListeners).toBe(1);
        expect(s.deaths).toBe(0);
        expect(s.timeMs).toBeLessThan(firstRun.timeMs + 2000);
    }
});
