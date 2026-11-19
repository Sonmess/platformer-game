import { test, expect, type Page } from '@playwright/test';
import { ANIM, AUDIO, CLIMB, PLAYER, TILE } from '../../src/config/constants';
import { TRUNKS, VINES } from './landmarks';

// Climbables from src/levels/level1.json: the first trunk stands on the ground (row 15) left of the spawn, with a
// ledge (a floating platform) beside its top; the first vine hangs from the level top down to just above the ground,
// right of the spawn, a little apart from that ledge. Flat ground with nothing to climb: cols 90-107.
const T = TRUNKS[0];
const V = VINES[0];
const centre = (z: { x: number; width: number }) => z.x + z.width / 2;
const GROUND_Y = 15 * TILE - PLAYER.HEIGHT / 2;
const FLAT_X = 98 * TILE;

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const player = async (page: Page) => (await state(page)).player!;
const teleport = (page: Page, x: number, y: number) => page.evaluate(([px, py]) => window.__game!.teleport(px, py), [x, y]);
const hold = (page: Page, keys: string[]) => page.evaluate(k => window.__game!.hold(k as never), keys);
const release = (page: Page, keys: string[]) => page.evaluate(k => window.__game!.release(k as never), keys);
const wait = (page: Page, ms: number) => page.evaluate(m => window.__game!.wait(m), ms);
const until = (page: Page, cond: string) =>
    page.waitForFunction(c => new Function('s', `return ${c}`)(window.__game!.getState()), cond);

async function standAt (page: Page, x: number)
{
    await teleport(page, x, GROUND_Y);
    await until(page, 's.player.onGround && Math.abs(s.player.vy) < 1');
}

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

test('both climbables are in the level', async ({ page }) => {
    const s = await state(page);
    expect(s.climbables.map(c => c.kind)).toEqual(['trunk', 'vine']);
    expect(s.climbables[0]).toMatchObject({ x: T.x, y: T.y, height: T.height });
});

test('up at a trunk grabs it and climbs; letting go of up holds still; down climbs back to the ground', async ({ page }) => {
    await standAt(page, centre(T) + 3);
    await hold(page, ['up']);
    await until(page, 's.player.climbing');
    let p = await player(page);
    expect(p.climbKind).toBe('trunk');
    expect(p.x).toBeCloseTo(centre(T), 0);                          // centred on the trunk
    expect((await state(page)).sfx).toContain(AUDIO.SFX.GRAB.key);

    const y0 = p.y;
    await wait(page, 400);
    p = await player(page);
    expect(y0 - p.y).toBeGreaterThan(CLIMB.SPEED * 0.4 * 0.6);       // up at the climbing speed
    expect(y0 - p.y).toBeLessThan(CLIMB.SPEED * 0.4 * 1.5);
    expect(p.anim).toBe(ANIM.CAT_CLIMB);

    await release(page, ['up']);
    await wait(page, 100);
    const held = await player(page);
    await wait(page, 400);
    p = await player(page);
    expect(p.climbing).toBe(true);                                   // no gravity while holding on
    expect(p.y).toBeCloseTo(held.y, 0);
    expect(p.anim).toBe(ANIM.CAT_CLING);
    expect((await state(page)).climb.steps).toBeGreaterThan(0);
    expect((await state(page)).sfx).toContain(AUDIO.SFX.CLIMB.key);

    await hold(page, ['down']);
    await until(page, '!s.player.climbing && s.player.onGround');
    await release(page, ['down']);
    const s = await state(page);
    expect(s.climb.lastLetGo).toBe('ground');
    expect(s.player!.y).toBeCloseTo(GROUND_Y, 0);
    expect(s.deaths).toBe(0);
});

test('climbing on past the top of the trunk pulls the cat up onto the ledge beside it', async ({ page }) => {
    await teleport(page, centre(T), T.y + 3 * TILE);
    await hold(page, ['up']);
    await until(page, 's.player.climbing');
    await until(page, "s.climb.lastLetGo === 'top'");
    expect((await player(page)).vy).toBeLessThan(0);                // a hop up
    await release(page, ['up']);
    await hold(page, ['right']);
    await until(page, 's.player.onGround');
    await release(page, ['right']);
    const p = await player(page);
    expect(p.y + PLAYER.HEIGHT / 2).toBeCloseTo(T.y, 0);             // feet on the ledge, level with the trunk top
    expect(p.climbing).toBe(false);
});

test('the jump button jumps off a vine to the side held; with no side it just lets go', async ({ page }) => {
    await teleport(page, centre(V), 9 * TILE);
    await hold(page, ['up']);
    await until(page, 's.player.climbing');
    expect((await player(page)).climbKind).toBe('vine');
    await release(page, ['up']);

    // No side: let go and fall.
    await page.evaluate(() => window.__game!.press(['jump'], 50));
    await until(page, '!s.player.climbing');
    expect((await state(page)).climb.lastLetGo).toBe('drop');
    await wait(page, 150);
    expect((await player(page)).vy).toBeGreaterThan(0);

    // Grab again, then jump off to the right: up and away, and no grab back onto the vine.
    await teleport(page, centre(V), 9 * TILE);
    await hold(page, ['up']);
    await until(page, 's.player.climbing');
    await release(page, ['up']);
    await hold(page, ['right']);
    await page.evaluate(() => window.__game!.press(['jump'], 300));
    await release(page, ['right']);
    const s = await state(page);
    expect(s.climb.lastLetGo).toBe('jump');
    expect(s.player!.climbing).toBe(false);
    expect(s.player!.x - centre(V)).toBeGreaterThan(TILE);
    expect(s.sfx).toContain(AUDIO.SFX.JUMP.key);
});

test('a jump against a trunk catches it; walking past it does not', async ({ page }) => {
    await standAt(page, centre(T) + 3 * TILE);
    await hold(page, ['left']);
    await wait(page, 700);                                           // walks to the level's left edge, past the trunk
    expect((await player(page)).climbing).toBe(false);
    await release(page, ['left']);

    await standAt(page, centre(T) + 3 * TILE);
    await hold(page, ['left']);
    await page.evaluate(() => window.__game!.press(['jump'], 200));
    await until(page, 's.player.climbing');
    await release(page, ['left']);
    const p = await player(page);
    expect(p.climbKind).toBe('trunk');
    expect(p.onGround).toBe(false);
});

test('a vine needs up: the jump button jumps through it, up at it climbs instead of jumping', async ({ page }) => {
    await standAt(page, centre(V));
    await page.evaluate(() => window.__game!.press(['jump'], 200));
    let p = await player(page);
    expect(p.climbing).toBe(false);
    expect(p.onGround).toBe(false);
    await until(page, 's.player.onGround');
    const jumps = (await state(page)).sfx.filter(k => k === AUDIO.SFX.JUMP.key).length;

    await hold(page, ['up']);
    await until(page, 's.player.climbing');
    await wait(page, 300);
    await release(page, ['up']);
    p = await player(page);
    expect(p.climbKind).toBe('vine');
    expect(p.vy).toBeLessThanOrEqual(0);                             // climbing, not a jump arc
    expect((await state(page)).sfx.filter(k => k === AUDIO.SFX.JUMP.key).length).toBe(jumps);
});

test('away from vines and trunks, up still jumps', async ({ page }) => {
    await standAt(page, FLAT_X);
    await page.evaluate(() => window.__game!.press(['up'], 200));
    const p = await player(page);
    expect(p.climbing).toBe(false);
    expect(p.onGround).toBe(false);
    expect(GROUND_Y - p.y).toBeGreaterThan(TILE);
});
