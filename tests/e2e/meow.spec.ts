import { test, expect, type Page } from '@playwright/test';
import { AUDIO, MEOW, PLAYER, TILE } from '../../src/config/constants';

// Landmark in src/levels/level1.json: columns 90-107 are flat ground.
const GROUND_Y = 15 * TILE - PLAYER.HEIGHT / 2;
const FLAT_X = 98 * TILE;

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const wait = (page: Page, ms: number) => page.evaluate(m => window.__game!.wait(m), ms);
const meowCount = async (page: Page) => (await state(page)).meow.count;

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [FLAT_X, GROUND_Y]);
    await page.waitForFunction(() => window.__game!.getState().player!.onGround);
});

test('X meows: the event reaches 4 tiles ahead of the cat, with pose, sound and HUD cooldown', async ({ page }) => {
    await page.keyboard.press('x');
    await page.waitForFunction(() => window.__game!.getState().meow.count === 1);
    const s = await state(page);
    const last = s.meow.last!;

    expect(last.dir).toBe(1);
    expect(last.range).toBe(MEOW.RANGE_TILES * TILE);
    expect(last.x).toBeGreaterThan(s.player!.x);             // from the head, in front of the body centre
    expect(Math.abs(last.y - s.player!.y)).toBeLessThan(TILE);
    expect(s.player!.anim).toBe('cat-meow');
    expect(s.sfx.at(-1)).toBe(AUDIO.SFX.MEOW.key);
    expect(s.hud!.meowReady).toBe(false);
    expect(s.meow.cooldownMs).toBeGreaterThan(MEOW.COOLDOWN_MS - 500);

    await wait(page, MEOW.POSE_MS + 100);
    expect((await state(page)).player!.anim).not.toBe('cat-meow');
});

test('the cooldown blocks meowing again until it runs out', async ({ page }) => {
    await page.evaluate(() => window.__game!.press(['meow'], 50));
    expect(await meowCount(page)).toBe(1);

    await wait(page, 300);
    await page.evaluate(() => window.__game!.press(['meow'], 50));
    await wait(page, 100);
    expect(await meowCount(page)).toBe(1);                    // still cooling down

    await wait(page, MEOW.COOLDOWN_MS);
    const s = await state(page);
    expect(s.meow.cooldownMs).toBe(0);
    expect(s.hud!.meowReady).toBe(true);
    await page.evaluate(() => window.__game!.press(['meow'], 50));
    expect(await meowCount(page)).toBe(2);
});

test('facing left meows to the left; meowing works in the air too', async ({ page }) => {
    await page.evaluate(() => window.__game!.press(['left'], 100));
    await page.evaluate(async () => {
        const g = window.__game!;
        g.press(['jump'], 300);
        await g.wait(150);
        await g.press(['meow'], 50);
    });
    const s = await state(page);
    expect(s.meow.count).toBe(1);
    expect(s.meow.last!.dir).toBe(-1);
    expect(s.meow.last!.x).toBeLessThan(s.player!.x);
});

test('the cooldown stands still while the game is paused', async ({ page }) => {
    await page.evaluate(() => window.__game!.press(['meow'], 50));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__game!.getState().paused);
    const before = (await state(page)).meow.cooldownMs;
    await wait(page, 800);
    const after = await state(page);
    expect(after.meow.cooldownMs).toBe(before);
    expect(after.hud!.meowReady).toBe(false);
});
