import { test, expect, type Page } from '@playwright/test';
import { AUDIO, RESULTS, TITLE } from '../../src/config/constants';
import { GOAL, landmarks } from './landmarks';

const { MUSIC, CAVE_MUSIC } = AUDIO;

const music = async (page: Page) => (await page.evaluate(() => window.__game!.getState())).music;
const wait = (page: Page, ms: number) => page.evaluate(m => window.__game!.wait(m), ms);
const waitForScene = (page: Page, scene: string) =>
    page.waitForFunction(s => window.__game?.getState().scene === s, scene);

/** From the title into level 1 (once level 2 is unlocked the title would continue there, so choose level 1). */
async function startLevel (page: Page)
{
    await wait(page, TITLE.INPUT_DELAY_MS);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__game!.getState().player?.onGround === true);
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForScene(page, 'Title');
});

test('the loop is loaded and plays from the title screen', async ({ page }) => {
    expect(await page.evaluate(k => window.__game!.game.cache.audio.exists(k), MUSIC.key)).toBe(true);
    expect(await music(page)).toEqual({ playing: true, muted: false, ducked: false, volume: MUSIC.volume, track: MUSIC.key, fading: false, instances: 1 });
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
    for (const back of ['KeyR', 'Escape', 'KeyR']) {           // R = the same level again
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

// ── The cave has its own loop (M4 step 6) ────────────────────────────────────────────────

const isPlaying = (page: Page, key: string) =>
    page.evaluate(k => (window.__game!.game.sound.get(k) as { isPlaying: boolean } | null)?.isPlaying ?? false, key);

test('going on from level 1 to the cave crossfades to the cave loop, and the forest loop stops', async ({ page }) => {
    await startLevel(page);
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [GOAL.x, GOAL.y]);
    await waitForScene(page, 'LevelComplete');
    await wait(page, RESULTS.INPUT_DELAY_MS);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__game!.getState().levelNumber === 2 && window.__game!.getState().scene === 'Game');
    let m = await music(page);
    expect(m).toMatchObject({ track: CAVE_MUSIC.key, playing: true, instances: 1 });

    await wait(page, AUDIO.MUSIC_FADE_MS + 300);
    m = await music(page);
    expect(m).toMatchObject({ track: CAVE_MUSIC.key, fading: false, volume: CAVE_MUSIC.volume, instances: 1 });
    expect(await isPlaying(page, MUSIC.key)).toBe(false);
    expect(await isPlaying(page, CAVE_MUSIC.key)).toBe(true);
});

test('in the cave the pause ducks the cave loop, M mutes it, and the title brings the forest loop back', async ({ page }) => {
    await page.goto('/?play=2');
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
    await wait(page, AUDIO.MUSIC_FADE_MS + 300);
    expect(await music(page)).toMatchObject({ track: CAVE_MUSIC.key, volume: CAVE_MUSIC.volume, fading: false });

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__game!.getState().paused);
    expect((await music(page)).volume).toBe(CAVE_MUSIC.pausedVolume);
    await page.keyboard.press('m');
    await page.waitForFunction(() => window.__game!.getState().music.muted);
    expect((await music(page)).volume).toBe(0);
    await page.keyboard.press('m');
    await page.keyboard.press('q');
    await waitForScene(page, 'Title');
    await wait(page, AUDIO.MUSIC_FADE_MS + 300);
    expect(await music(page)).toMatchObject({ track: MUSIC.key, volume: MUSIC.volume, fading: false, instances: 1 });
    expect(await isPlaying(page, CAVE_MUSIC.key)).toBe(false);
});

// ── The dusk forest has its own evening loop (M5 step 3) ──────────────────────────────────────

test('going on from the cave to the dusk forest crossfades to the evening loop, and the cave loop stops', async ({ page }) => {
    const { DUSK_MUSIC } = AUDIO;
    const caveGoal = landmarks(2).GOAL;
    await page.goto('/?play=2');
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [caveGoal.x, caveGoal.y]);
    await waitForScene(page, 'LevelComplete');
    await wait(page, RESULTS.INPUT_DELAY_MS);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__game!.getState().levelNumber === 3 && window.__game!.getState().scene === 'Game');
    expect(await music(page)).toMatchObject({ track: DUSK_MUSIC.key, playing: true, instances: 1 });

    await wait(page, AUDIO.MUSIC_FADE_MS + 300);
    expect(await music(page)).toMatchObject({ track: DUSK_MUSIC.key, fading: false, volume: DUSK_MUSIC.volume, instances: 1 });
    expect(await isPlaying(page, CAVE_MUSIC.key)).toBe(false);
});
