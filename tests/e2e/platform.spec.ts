import { test, expect, type Page } from '@playwright/test';
import { PLAYER, TILE } from '../../src/config/constants';

// Landmarks in src/levels/level1.json: a 2-tile platform moves up and down in cols 116-117 (top between
// rows 7 and 12) and a 3-tile platform moves left and right on row 7 between cols 119 and 131.
const VERTICAL = { x: 116 * TILE, topMin: 7 * TILE, topMax: 12 * TILE };
const HORIZONTAL = { y: 7 * TILE, xMin: 119 * TILE, xMax: 132 * TILE - 3 * TILE };

const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const wait = (page: Page, ms: number) => page.evaluate(m => window.__game!.wait(m), ms);

/** Drops the cat onto platform `i` and waits until it stands there. */
async function boardPlatform (page: Page, i: number)
{
    await page.evaluate(idx => {
        const p = window.__game!.getState().platforms[idx];
        window.__game!.teleport(p.x + p.width / 2, p.y - 12);
    }, i);
    await page.waitForFunction(() => window.__game!.getState().player!.onGround);
}

/** Samples the cat's position relative to platform `i` for `ms` of game time. */
async function rideOffsets (page: Page, i: number, ms: number)
{
    return page.evaluate(async ([idx, dur]) => {
        const g = window.__game!;
        const out: { dx: number; dy: number; onGround: boolean; px: number; py: number }[] = [];
        for (let t = 0; t < dur; t += 100) {
            const s = g.getState();
            const p = s.platforms[idx];
            out.push({ dx: s.player!.x - p.x, dy: p.y - s.player!.y, onGround: s.player!.onGround, px: p.x, py: p.y });
            await g.wait(100);
        }
        return out;
    }, [i, ms] as const);
}

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

test('platforms travel back and forth along their paths', async ({ page }) => {
    const v: number[] = [], h: number[] = [];
    for (let i = 0; i < 20; i++) {
        const [pv, ph] = (await state(page)).platforms;
        expect(pv.x).toBe(VERTICAL.x);
        expect(ph.y).toBe(HORIZONTAL.y);
        v.push(pv.y);
        h.push(ph.x);
        await wait(page, 400);
    }
    expect(Math.min(...v)).toBeGreaterThanOrEqual(VERTICAL.topMin - 1);
    expect(Math.max(...v)).toBeLessThanOrEqual(VERTICAL.topMax + 1);
    expect(Math.max(...v) - Math.min(...v)).toBeGreaterThan(3 * TILE);
    expect(Math.min(...h)).toBeGreaterThanOrEqual(HORIZONTAL.xMin - 1);
    expect(Math.max(...h)).toBeLessThanOrEqual(HORIZONTAL.xMax + 1);
    expect(Math.max(...h) - Math.min(...h)).toBeGreaterThan(6 * TILE);
});

test('the cat rides a sideways platform without sliding', async ({ page }) => {
    await boardPlatform(page, 1);
    const ride = await rideOffsets(page, 1, 3000);
    expect(ride.every(r => r.onGround)).toBe(true);
    expect(Math.max(...ride.map(r => r.px)) - Math.min(...ride.map(r => r.px))).toBeGreaterThan(2 * TILE);
    const dx = ride.map(r => r.dx);
    expect(Math.max(...dx) - Math.min(...dx)).toBeLessThan(1);           // carried exactly
    expect((await state(page)).player!.anim).toBe('cat-idle');
});

test('the cat rides an up-and-down platform both ways and stays standing', async ({ page }) => {
    await boardPlatform(page, 0);
    const ride = await rideOffsets(page, 0, 4500);                        // more than one full round trip
    expect(ride.every(r => r.onGround)).toBe(true);
    expect(Math.max(...ride.map(r => r.py)) - Math.min(...ride.map(r => r.py))).toBeGreaterThan(3 * TILE);
    for (const r of ride) expect(r.dy).toBeCloseTo(PLAYER.HEIGHT / 2, 0);  // feet on the platform top
    expect((await state(page)).deaths).toBe(0);
});

test('drawn every frame, the riding cat keeps the same pixel offset to the platform (no shimmer)', async ({ page }) => {
    for (const i of [0, 1]) {
        await boardPlatform(page, i);
        await wait(page, 300);
        const offsets = await page.evaluate(idx => new Promise<string[]>(resolve => {
            const seen = new Set<string>();
            let frames = 0;
            const sample = () => {
                const s = window.__game!.getState();
                const p = s.platforms[idx];
                seen.add(`${s.player!.spriteX - p.drawX},${p.drawY - s.player!.spriteY}`);
                if (++frames < 150) requestAnimationFrame(sample); else resolve([...seen]);
            };
            requestAnimationFrame(sample);
        }), i);
        expect(offsets, `platform ${i}`).toHaveLength(1);
    }
});

test('landing on the up-and-down platform does not bounce, whichever way it moves', async ({ page }) => {
    for (const phase of ['up', 'down'] as const) {
        const result = await page.evaluate(([ph, halfHeight]) => new Promise<{ touched: boolean; maxGap: number }>(resolve => {
            const g = window.__game!;
            const platform = () => g.getState().platforms[0];
            const moving = () => ph === 'up' ? platform().vy < -20 : platform().vy > 20;
            const start = () => {
                if (!moving()) { requestAnimationFrame(start); return; }
                const p = platform();
                g.teleport(p.x + p.width / 2, p.y - 50);
                let touched = false, maxGap = 0, frames = 0;
                const watch = () => {
                    const s = g.getState();
                    const gap = s.platforms[0].y - (s.player!.y + halfHeight);     // platform top - cat feet
                    if (gap < 0.5) touched = true;
                    else if (touched) maxGap = Math.max(maxGap, gap);
                    if (++frames < 120) requestAnimationFrame(watch); else resolve({ touched, maxGap });
                };
                requestAnimationFrame(watch);
            };
            start();
        }), [phase, PLAYER.HEIGHT / 2] as const);
        expect(result.touched, phase).toBe(true);
        expect(result.maxGap, phase).toBeLessThan(0.5);
    }
});

test('the cat can jump off a moving platform', async ({ page }) => {
    await boardPlatform(page, 1);
    await wait(page, 300);
    const before = await state(page);
    const peak = await page.evaluate(async () => {
        const g = window.__game!;
        g.press(['jump'], 400);
        let minY = Infinity;
        for (let i = 0; i < 30; i++) { minY = Math.min(minY, g.getState().player!.y); await g.wait(20); }
        return minY;
    });
    expect(before.player!.y - peak).toBeGreaterThan(2 * TILE);
});
