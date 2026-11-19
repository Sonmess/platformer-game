import { test, expect, type Page } from '@playwright/test';
import { ASSETS, AUDIO, PLAYER, SNAKE, TILE } from '../../src/config/constants';
import { SNAKES, snakeIndex } from './landmarks';

// The first snake patrols flat ground (row 15) after the second checkpoint; the cat is put next to it on that ground,
// always to its left, at a distance measured between hitbox centres.
const GROUND_Y = 15 * TILE - PLAYER.HEIGHT / 2;
const S = snakeIndex(0);
/** Not touching the snake (6 px between the hitboxes), but well inside the cloud. */
const IN_CLOUD = SNAKE.WIDTH / 2 + PLAYER.WIDTH / 2 + 6;
/** The cat's near edge 4 px beyond the cloud's radius. */
const OUT_OF_CLOUD = SNAKE.CLOUD_RADIUS_PX + PLAYER.WIDTH / 2 + 4;
/** Just inside the claw's reach (cat half width 9 + reach 14 + snake half width 8 = 31). */
const CLAW_GAP = 28;

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const snake = async (page: Page) => (await state(page)).enemies[S];
const waitPhase = (page: Page, phase: string) =>
    page.waitForFunction(([i, ph]) => window.__game!.getState().enemies[i as number].phase === ph, [S, phase] as const);
/** Faces right and stands `gap` px (centre to centre) to the snake's left, right now. */
const standLeftOf = (page: Page, gap: number) => page.evaluate(async ([i, g, y]) => {
    const api = window.__game!;
    await api.press(['right'], 30);
    api.teleport(api.getState().enemies[i].x - g, y);
}, [S, gap, GROUND_Y]);

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
    // Near the snake (it is on screen and heard), but out of its reach.
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [SNAKES[0].x - 3 * TILE, GROUND_Y]);
    await page.waitForFunction(() => window.__game!.getState().player!.onGround);
});

test('poison cycle: slithers, stops and warns with a hiss, sprays a cloud, then slithers on', async ({ page }) => {
    await waitPhase(page, 'spray');
    await waitPhase(page, 'calm');                                         // a fresh calm: it has time to move
    const calmX = (await snake(page)).x;
    await page.evaluate(() => window.__game!.wait(300));
    expect((await snake(page)).x).not.toBeCloseTo(calmX, 0);              // moving while calm

    await waitPhase(page, 'warn');
    const warn = await state(page);
    expect(warn.enemies[S].anim).toBe(ASSETS.SNAKE.warn.key);
    expect(warn.sfx).toContain(AUDIO.SFX.HISS.key);
    expect(warn.enemies[S].cloud).toBeNull();

    await waitPhase(page, 'spray');
    const spray = await state(page);
    expect(spray.timeMs - warn.timeMs).toBeGreaterThan(SNAKE.WARN_MS - 50);
    expect(spray.timeMs - warn.timeMs).toBeLessThan(SNAKE.WARN_MS + 100);
    expect(spray.enemies[S].x).toBeCloseTo(warn.enemies[S].x, 1);          // holds still
    expect(spray.enemies[S].anim).toBe(ASSETS.SNAKE.spray.key);
    expect(spray.enemies[S].cloud!.radius).toBe(SNAKE.CLOUD_RADIUS_PX);
    expect(spray.sfx).toContain(AUDIO.SFX.SPRAY.key);
    expect(spray.deaths).toBe(0);                                          // the cat is out of reach

    await waitPhase(page, 'calm');
    const after = await state(page);
    expect(after.timeMs - spray.timeMs).toBeGreaterThan(SNAKE.SPRAY_MS - 50);
    expect(after.enemies[S].cloud).toBeNull();
});

test('the poison cloud hurts a cat that does not touch the snake', async ({ page }) => {
    await waitPhase(page, 'warn');
    await standLeftOf(page, IN_CLOUD);
    await page.evaluate(() => window.__game!.wait(100));
    expect((await state(page)).deaths).toBe(0);                            // the warning itself is harmless
    await page.waitForFunction(() => window.__game!.getState().deaths === 1);
    expect((await snake(page)).phase).toBe('spray');
});

test('just outside the cloud the cat is safe', async ({ page }) => {
    await waitPhase(page, 'warn');
    await standLeftOf(page, OUT_OF_CLOUD);
    await waitPhase(page, 'spray');
    await waitPhase(page, 'calm');
    expect((await state(page)).deaths).toBe(0);
});

test('touching the snake hurts', async ({ page }) => {
    await waitPhase(page, 'calm');
    await standLeftOf(page, 0);
    await page.waitForFunction(() => window.__game!.getState().deaths === 1);
});

test('a claw in the calm between sprays drives the snake away', async ({ page }) => {
    await waitPhase(page, 'spray');
    await waitPhase(page, 'calm');
    await standLeftOf(page, CLAW_GAP);
    await page.evaluate(() => window.__game!.press(['claw'], 50));
    await page.waitForFunction(i => window.__game!.getState().enemies[i].gone, S);
    let s = await state(page);
    expect(s.enemies[S]).toMatchObject({ gone: true, harmful: false });
    expect(s.sfx).toContain(AUDIO.SFX.FLEE.key);

    // Gone for good: no more sprays, and the cat can walk through where it was.
    await page.evaluate(() => window.__game!.press(['right'], 600));
    await page.evaluate(ms => window.__game!.wait(ms), SNAKE.CALM_MS + SNAKE.WARN_MS + SNAKE.SPRAY_MS);
    s = await state(page);
    expect(s.deaths).toBe(0);
    expect(s.enemies[S].cloud).toBeNull();
});

test('a meow does nothing to a snake', async ({ page }) => {
    await waitPhase(page, 'calm');
    await standLeftOf(page, OUT_OF_CLOUD + TILE);
    await page.evaluate(() => window.__game!.press(['meow'], 50));
    await page.evaluate(() => window.__game!.wait(200));
    const s = await state(page);
    expect(s.meow.count).toBe(1);
    expect(s.enemies[S]).toMatchObject({ scared: false, harmful: true });
    expect(s.sfx).not.toContain(AUDIO.SFX.SCARE.key);
    await waitPhase(page, 'warn');                                         // and the cycle goes on
});
