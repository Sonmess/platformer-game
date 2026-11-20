import { test, expect, type Page } from '@playwright/test';
import { LEVELS, PROGRESS, RESULTS, TITLE } from '../../src/config/constants';
import { landmarks } from './landmarks';

// Saved progress (M4 step 3): finishing a level unlocks the next one in localStorage; the title screen starts the
// highest unlocked level and the arrows choose among the unlocked ones. Every test gets a fresh browser context,
// so the storage starts empty.

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const wait = (page: Page, ms: number) => page.evaluate(m => window.__game!.wait(m), ms);
const onTitle = async (page: Page) => {
    await page.waitForFunction(() => window.__game?.getState().scene === 'Title');
    await wait(page, TITLE.INPUT_DELAY_MS);
};
const playing = (page: Page) => page.waitForFunction(() => {
    const s = window.__game?.getState();
    return s?.scene === 'Game' && s.hud !== null && s.player?.onGround === true;
});
const finishLevel1 = async (page: Page) => {
    await page.goto('/?play');
    await playing(page);
    const { GOAL } = landmarks(1);
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [GOAL.x, GOAL.y]);
    await page.waitForFunction(() => window.__game!.getState().scene === 'LevelComplete');
};

test('with nothing saved the title offers level 1 only; an arrow cannot pick a locked level', async ({ page }) => {
    await page.goto('/');
    await onTitle(page);
    expect((await state(page)).title).toMatchObject({ unlocked: 1, selected: 1 });
    await page.keyboard.press('ArrowRight');
    await wait(page, 100);
    expect((await state(page)).title!.selected).toBe(1);
    await page.keyboard.press('Enter');
    await playing(page);
    expect((await state(page)).levelNumber).toBe(1);
});

test('finishing level 1 unlocks level 2: after a reload the title continues there, and the arrows go back to 1', async ({ page }) => {
    await finishLevel1(page);
    expect(await page.evaluate(k => localStorage.getItem(k), PROGRESS.STORAGE_KEY)).toBe('2');

    await page.goto('/');
    await onTitle(page);
    expect((await state(page)).title).toMatchObject({ unlocked: 2, selected: 2 });
    await page.keyboard.press('Enter');
    await playing(page);
    expect((await state(page)).levelNumber).toBe(2);

    await page.goto('/');
    await onTitle(page);
    await page.keyboard.press('ArrowLeft');
    await wait(page, 100);
    expect((await state(page)).title!.selected).toBe(1);
    await page.keyboard.press('ArrowLeft');                               // already the first
    await wait(page, 100);
    expect((await state(page)).title!.selected).toBe(1);
    await page.keyboard.press('Enter');
    await playing(page);
    expect((await state(page)).levelNumber).toBe(1);
});

test('replaying level 1 keeps level 2 unlocked', async ({ page }) => {
    await finishLevel1(page);
    await wait(page, RESULTS.INPUT_DELAY_MS);
    await page.evaluate(() => window.__game!.press(['replay'], 100));
    await playing(page);
    expect(await page.evaluate(k => localStorage.getItem(k), PROGRESS.STORAGE_KEY)).toBe('2');
});

test('a garbled saved value is read safely', async ({ page }) => {
    await page.addInitScript(k => localStorage.setItem(k, 'nonsense'), PROGRESS.STORAGE_KEY);
    await page.goto('/');
    await onTitle(page);
    expect((await state(page)).title).toMatchObject({ unlocked: 1, selected: 1 });

    await page.addInitScript(k => localStorage.setItem(k, '99'), PROGRESS.STORAGE_KEY);
    await page.goto('/');
    await onTitle(page);
    expect((await state(page)).title!.unlocked).toBe(LEVELS.length);
});

test('with storage blocked the game starts at level 1 and finishing a level causes no errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('GL Driver')) errors.push(m.text()); });
    await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', { get () { throw new Error('storage blocked'); } });
    });
    await page.goto('/');
    await onTitle(page);
    expect((await state(page)).title).toMatchObject({ unlocked: 1, selected: 1 });

    await finishLevel1(page);
    await page.goto('/');
    await onTitle(page);
    expect((await state(page)).title!.unlocked).toBe(1);
    expect(errors).toEqual([]);
});
