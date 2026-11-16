import { test, expect, type Page } from '@playwright/test';
import { AUDIO, RESULTS, TILE, TITLE } from '../../src/config/constants';

const GOAL = { x: 143 * TILE + TILE, y: 14 * TILE };       // inside the goal zone in the cave mouth
const { MUSIC } = AUDIO;

const music = async (page: Page) => (await page.evaluate(() => window.__game!.getState())).music;
const wait = (page: Page, ms: number) => page.evaluate(m => window.__game!.wait(m), ms);
const waitForScene = (page: Page, scene: string) =>
    page.waitForFunction(s => window.__game?.getState().scene === s, scene);

async function startLevel (page: Page)
{
    await wait(page, TITLE.INPUT_DELAY_MS);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__game!.getState().player?.onGround === true);
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForScene(page, 'Title');
});

test('the loop is loaded and plays from the title screen', async ({ page }) => {
    expect(await page.evaluate(k => window.__game!.game.cache.audio.exists(k), MUSIC.key)).toBe(true);
    expect(await music(page)).toEqual({ playing: true, muted: false, ducked: false, volume: MUSIC.volume, instances: 1 });
});

test('M mutes and unmutes the music on the title and in the level', async ({ page }) => {
    await page.keyboard.press('m');
    await page.waitForFunction(() => window.__game!.getState().music.muted);
    expect((await music(page)).volume).toBe(0);

    await startLevel(page);
    expect((await music(page)).muted).toBe(true);           // the choice carries into the level
    await page.keyboard.press('m');
    await page.waitForFunction(() => !window.__game!.getState().music.muted);
    expect((await music(page)).volume).toBe(MUSIC.volume);
});

test('the pause ducks the music; resuming or quitting restores it', async ({ page }) => {
    await startLevel(page);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__game!.getState().paused);
    expect(await music(page)).toMatchObject({ playing: true, ducked: true, volume: MUSIC.pausedVolume });

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__game!.getState().paused);
    expect(await music(page)).toMatchObject({ ducked: false, volume: MUSIC.volume });

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__game!.getState().paused);
    await page.keyboard.press('q');
    await waitForScene(page, 'Title');
    expect(await music(page)).toMatchObject({ playing: true, ducked: false, volume: MUSIC.volume });
});

test('finishing, restarting and going back to the title never duplicates or restarts the loop', async ({ page }) => {
    await startLevel(page);
    for (const back of ['Enter', 'Escape', 'Enter']) {
        await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [GOAL.x, GOAL.y]);
        await waitForScene(page, 'LevelComplete');
        await wait(page, RESULTS.INPUT_DELAY_MS);
        await page.keyboard.press(back);
        if (back === 'Escape') {
            await waitForScene(page, 'Title');
            await startLevel(page);
        } else {
            await page.waitForFunction(() => window.__game!.getState().player?.onGround === true);
        }
        expect(await music(page)).toMatchObject({ playing: true, instances: 1 });
    }
});
