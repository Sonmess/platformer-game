import { test, expect, type Page } from '@playwright/test';
import { PLAYER, TILE } from '../../src/config/constants';
import { readFileSync } from 'node:fs';

const level1 = JSON.parse(readFileSync('src/levels/level1.json', 'utf8')) as { width: number; height: number };

// Landmarks in src/levels/level1.json (tile coordinates).
const GROUND_TOP_ROW = 15;
const WALL_LEFT_COL = 80;           // 2-tile wall, rows 12-14
const FLOATING = { col: 66, row: 12 };  // platform 65-67 over the pit 62-70

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const standY = (row: number) => row * TILE - PLAYER.HEIGHT / 2;

async function teleportAndSettle (page: Page, x: number, y: number)
{
    await page.evaluate(([px, py]) => window.__game!.teleport(px, py), [x, y]);
    await page.waitForFunction(() => {
        const p = window.__game!.getState().player!;
        return p.onGround && Math.abs(p.vy) < 1;
    });
}

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

test('level size matches the Tiled map', async ({ page }) => {
    const s = await state(page);
    expect(s.level).toEqual({ width: level1.width * TILE, height: level1.height * TILE });
});

test('player spawns on the ground at the map spawn point', async ({ page }) => {
    const s = await state(page);
    expect(s.player!.y).toBeCloseTo(standY(GROUND_TOP_ROW), 0);
});

test('a wall stops the player', async ({ page }) => {
    await teleportAndSettle(page, (WALL_LEFT_COL - 4) * TILE, standY(GROUND_TOP_ROW));
    await page.evaluate(() => window.__game!.press(['right'], 1000));
    const s = await state(page);
    expect(s.player!.x + PLAYER.WIDTH / 2).toBeLessThanOrEqual(WALL_LEFT_COL * TILE + 0.5);
    expect(s.player!.onGround).toBe(true);
});

test('player lands on a floating platform instead of falling through', async ({ page }) => {
    await teleportAndSettle(page, FLOATING.col * TILE + TILE / 2, (FLOATING.row - 3) * TILE);
    const s = await state(page);
    expect(s.player!.y).toBeCloseTo(standY(FLOATING.row), 0);
});
