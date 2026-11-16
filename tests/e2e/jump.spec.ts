import { test, expect, type Page } from '@playwright/test';
import { PLAYER, PLAYER_FEEL, TILE } from '../../src/config/constants';

// Landmarks in src/levels/level1.json: plateau cols 36-44 with its top at row 12; ground row 15 to its right.
const PLATEAU_TOP = 12 * TILE;
const PLATEAU_EDGE_X = 45 * TILE;                       // first column past the plateau
const GROUND_Y = 15 * TILE - PLAYER.HEIGHT / 2;
const OPEN_GROUND_X = 5 * TILE;                         // flat start area
// Highest climbing platform: cols 103-106, top at row 6, ground (row 15) below its right edge.
const HIGH_TOP = 6 * TILE;
const HIGH_EDGE_X = 107 * TILE;


async function settleAt (page: Page, x: number, y: number)
{
    await page.evaluate(([px, py]) => window.__game!.teleport(px, py), [x, y]);
    await page.waitForFunction(() => {
        const p = window.__game!.getState().player!;
        return p.onGround && Math.abs(p.vy) < 1;
    });
}

/** Holds jump for `ms` of game time and returns how high the player rose (px). */
async function jumpHeight (page: Page, ms: number)
{
    return page.evaluate(async hold => {
        const g = window.__game!;
        const y0 = g.getState().player!.y;
        let minY = y0;
        const track = () => { minY = Math.min(minY, g.getState().player!.y); };
        g.game.events.on('step', track);
        await g.press(['jump'], hold);
        await g.wait(900);
        g.game.events.off('step', track);
        return y0 - minY;
    }, ms);
}

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
    await settleAt(page, OPEN_GROUND_X, GROUND_Y);
});

test('tapping jump gives a clearly lower hop than holding it', async ({ page }) => {
    const full = await jumpHeight(page, 700);
    await settleAt(page, OPEN_GROUND_X, GROUND_Y);
    const tap = await jumpHeight(page, 30);

    const designed = PLAYER_FEEL.jumpHeightTiles * TILE;
    expect(full).toBeGreaterThan(designed * 0.85);
    expect(full).toBeLessThan(designed * 1.15);
    expect(tap).toBeGreaterThan(TILE / 2);                // still a hop, not nothing
    expect(tap).toBeLessThan(full * 0.6);
});

test('the fall is faster than the rise', async ({ page }) => {
    const times = await page.evaluate(async () => {
        const g = window.__game!;
        const y0 = g.getState().player!.y;
        let t = 0, apexT = 0, landT = 0, minY = y0, left = false;
        const step = (_: number, delta: number) => {
            t += delta;
            const p = g.getState().player!;
            if (!p.onGround) left = true;
            if (p.y < minY) { minY = p.y; apexT = t; }
            if (left && p.onGround && !landT) landT = t;
        };
        g.game.events.on('step', step);
        await g.press(['jump'], 700);
        await g.wait(900);
        g.game.events.off('step', step);
        return { rise: apexT, fall: landT - apexT };
    });
    expect(times.fall).toBeLessThan(times.rise);
});

test('coyote time: jumping just after running off a ledge still works', async ({ page }) => {
    await settleAt(page, PLATEAU_EDGE_X - 2 * TILE, PLATEAU_TOP - PLAYER.HEIGHT / 2);
    const minY = await page.evaluate(async () => {
        const g = window.__game!;
        void g.press(['right'], 1500);
        // Wait until the player has walked off the edge, then a little less than the coyote time.
        await new Promise<void>(resolve => {
            const check = () => { if (!g.getState().player!.onGround) { g.game.events.off('step', check); resolve(); } };
            g.game.events.on('step', check);
        });
        // Press right away: the step check sees the fall one frame late and the press is read on the
        // next frame, so this jump starts ~2 frames after leaving the ledge (well inside coyote time).
        let min = Infinity;
        const track = () => { min = Math.min(min, g.getState().player!.y); };
        g.game.events.on('step', track);
        await g.press(['jump'], 500);
        g.game.events.off('step', track);
        return min;
    });
    // A real jump takes the player well above the plateau it walked off.
    expect(minY).toBeLessThan(PLATEAU_TOP - PLAYER.HEIGHT / 2 - 2 * TILE);
});

test('no jump once coyote time has run out', async ({ page }) => {
    // A high ledge, so the late press is also too early for the jump buffer to fire on landing.
    await settleAt(page, HIGH_EDGE_X - 2 * TILE, HIGH_TOP - PLAYER.HEIGHT / 2);
    const minYAfterPress = await page.evaluate(async coyoteMs => {
        const g = window.__game!;
        void g.press(['right'], 1500);
        await new Promise<void>(resolve => {
            const check = () => { if (!g.getState().player!.onGround) { g.game.events.off('step', check); resolve(); } };
            g.game.events.on('step', check);
        });
        await g.wait(coyoteMs * 2.5);
        const yAtPress = g.getState().player!.y;
        let min = Infinity;
        const track = () => { min = Math.min(min, g.getState().player!.y); };
        g.game.events.on('step', track);
        await g.press(['jump'], 300);
        g.game.events.off('step', track);
        return min - yAtPress;
    }, PLAYER_FEEL.coyoteTime * 1000);
    expect(minYAfterPress).toBeGreaterThanOrEqual(-0.5);     // never rose after the late press
});

test('jump buffer: pressing just before landing jumps on touchdown', async ({ page }) => {
    // Drop from 3 tiles up and press jump when ~1/3 tile above the ground (well inside the buffer).
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [OPEN_GROUND_X, GROUND_Y - 3 * TILE]);
    const rose = await page.evaluate(async ([groundY, tile]) => {
        const g = window.__game!;
        await new Promise<void>(resolve => {
            const check = () => { if (g.getState().player!.y > groundY - tile / 3) { g.game.events.off('step', check); resolve(); } };
            g.game.events.on('step', check);
        });
        let min = Infinity;
        const track = () => { min = Math.min(min, g.getState().player!.y); };
        g.game.events.on('step', track);
        await g.press(['jump'], 600);
        await g.wait(200);
        g.game.events.off('step', track);
        return groundY - min;
    }, [GROUND_Y, TILE]);
    expect(rose).toBeGreaterThan(2 * TILE);
});
