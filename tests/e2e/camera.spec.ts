import { test, expect, type Page } from '@playwright/test';
import { CAMERA, PLAYER, TILE } from '../../src/config/constants';
import { LEVEL } from './landmarks';

// Landmarks in src/levels/level1.json: columns 90-107 are flat ground with platforms high above;
// the cave hill at the level's right end has its top on row 9.
const GROUND_Y = 15 * TILE - PLAYER.HEIGHT / 2;
const FLAT_START_X = 91 * TILE;
const FLAT_MID_X = 98 * TILE;
const CAVE_HILL_TOP_Y = 9 * TILE - PLAYER.HEIGHT / 2;

const state = (page: Page) => page.evaluate(() => window.__game!.getState());

async function teleportAndSettle (page: Page, x: number, y: number)
{
    await page.evaluate(([px, py]) => window.__game!.teleport(px, py), [x, y]);
    await page.waitForFunction(() => {
        const p = window.__game!.getState().player!;
        return p.onGround && Math.abs(p.vy) < 1;
    });
    await page.evaluate(() => window.__game!.wait(1500));    // let the camera catch up
}

/** Holds a direction for `ms` of game time and returns the camera scroll range seen meanwhile. */
async function runAndSampleCamera (page: Page, key: 'right' | 'left', ms: number)
{
    return page.evaluate(async ([k, dur]) => {
        const g = window.__game!;
        const xs: number[] = [], ys: number[] = [];
        const id = setInterval(() => { const c = g.getState().camera!; xs.push(c.scrollX); ys.push(c.scrollY); }, 10);
        await g.press([k], dur);
        await g.wait(500);
        clearInterval(id);
        return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
    }, [key, ms] as const);
}

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

test('camera scrolls right as the player runs right', async ({ page }) => {
    await teleportAndSettle(page, FLAT_START_X, GROUND_Y);
    const before = await state(page);
    await page.evaluate(() => window.__game!.press(['right'], 1000));
    await page.evaluate(() => window.__game!.wait(1000));
    const after = await state(page);

    const moved = after.player!.x - before.player!.x;
    expect(moved).toBeGreaterThan(4 * TILE);
    // Camera keeps up with the player (within the deadzone width).
    expect(after.camera!.scrollX - before.camera!.scrollX).toBeGreaterThan(moved - CAMERA.deadzoneW);
});

test('camera never shows outside the level at either end', async ({ page }) => {
    const { level, camera } = await state(page);

    // On top of the cave hill at the level's right end, running into the world edge.
    await teleportAndSettle(page, LEVEL.width - 5 * TILE, CAVE_HILL_TOP_Y);
    const right = await runAndSampleCamera(page, 'right', 800);
    expect(right.maxX).toBeLessThanOrEqual(level!.width - camera!.width + 0.5);
    expect(right.maxX).toBeGreaterThan(level!.width - camera!.width - TILE);    // and it did get there

    await teleportAndSettle(page, 2 * TILE, GROUND_Y);
    const left = await runAndSampleCamera(page, 'left', 800);
    expect(left.minX).toBeGreaterThanOrEqual(-0.5);

    for (const s of [right, left]) {
        expect(s.minY).toBeGreaterThanOrEqual(-0.5);
        expect(s.maxY).toBeLessThanOrEqual(level!.height - camera!.height + 0.5);
    }
});

test('view leads in the facing direction (look-ahead)', async ({ page }) => {
    const screenX = async () => { const s = await state(page); return s.player!.x - s.camera!.scrollX; };
    const { camera } = await state(page);
    const centre = camera!.width / 2;

    await teleportAndSettle(page, FLAT_MID_X, GROUND_Y);
    await page.evaluate(() => window.__game!.press(['right'], 600));
    await page.evaluate(() => window.__game!.wait(1500));
    expect(await screenX()).toBeLessThan(centre - CAMERA.lookAhead / 2);

    await page.evaluate(() => window.__game!.press(['left'], 600));
    await page.evaluate(() => window.__game!.wait(1500));
    expect(await screenX()).toBeGreaterThan(centre + CAMERA.lookAhead / 2);
});
