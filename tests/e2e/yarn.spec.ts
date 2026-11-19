import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { AUDIO, LIVES, POWER, TILE } from '../../src/config/constants';

// Yarn balls from src/levels/level1.json (points of type "yarn"); the first sits on the plateau (cols 36-44, top
// row 12) just before its spikes (cols 40-41, row 11). Spikes on row 14 at cols 87-88; the first pit at cols 50-53.
interface TiledObject { type: string; x: number; y: number }
const level1 = JSON.parse(readFileSync('src/levels/level1.json', 'utf8')) as { layers: Array<{ objects?: TiledObject[] }> };
const YARNS = level1.layers.flatMap(l => l.objects ?? []).filter(o => o.type === 'yarn');
const FIRST_YARN = YARNS[0];
const ON_SPIKES = { x: 88 * TILE, y: 12 * TILE };
const FIRST_PIT = { x: 51 * TILE, y: 12 * TILE };

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const wait = (page: Page, ms: number) => page.evaluate(m => window.__game!.wait(m), ms);
const teleport = (page: Page, p: { x: number; y: number }) => page.evaluate(([x, y]) => window.__game!.teleport(x, y), [p.x, p.y]);

async function growBig (page: Page)
{
    await teleport(page, FIRST_YARN);
    await page.waitForFunction(() => window.__game!.getState().player!.big);
    await wait(page, 600);                                   // the grow flicker is over
}

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

test('the level has yarn balls and the cat starts small', async ({ page }) => {
    const s = await state(page);
    expect(YARNS.length).toBeGreaterThan(0);
    expect(s.yarnsLeft).toBe(YARNS.length);
    expect(s.player).toMatchObject({ big: false, spriteScale: 1 });
});

test('a yarn ball puffs the cat up: bigger sprite, same hitbox, the ball is gone', async ({ page }) => {
    const before = await state(page);
    await growBig(page);
    const s = await state(page);
    expect(s.player).toMatchObject({ big: true });
    expect(s.player!.spriteScale).toBeCloseTo(POWER.BIG_SCALE, 2);
    expect(s.yarnsLeft).toBe(YARNS.length - 1);
    expect(s.sfx).toContain(AUDIO.SFX.GROW.key);
    expect(s.lives).toBe(before.lives);
});

test('hit while big: the cat only shrinks, keeps its life and blinks; the next hit costs a life', async ({ page }) => {
    await growBig(page);
    await teleport(page, ON_SPIKES);
    await page.waitForFunction(() => !window.__game!.getState().player!.big);
    let s = await state(page);
    expect(s).toMatchObject({ deaths: 0, lives: LIVES.START });
    expect(s.player).toMatchObject({ dying: false, invulnerable: true });
    expect(s.sfx).toContain(AUDIO.SFX.SHRINK.key);

    await wait(page, POWER.HURT_INVULNERABLE_MS + 200);      // still on the spikes once the blinking ends
    await page.waitForFunction(() => window.__game!.getState().deaths === 1);
    s = await state(page);
    expect(s.lives).toBe(LIVES.START - 1);
});

test('a pit kills even a big cat, and the next life starts small', async ({ page }) => {
    await growBig(page);
    await teleport(page, FIRST_PIT);
    await page.waitForFunction(() => window.__game!.getState().deaths === 1 && !window.__game!.getState().player!.dying);
    await wait(page, 400);                                   // the respawn pop is over
    const s = await state(page);
    expect(s.lives).toBe(LIVES.START - 1);
    expect(s.player).toMatchObject({ big: false });
    expect(s.player!.spriteScale).toBeCloseTo(1, 1);
});
