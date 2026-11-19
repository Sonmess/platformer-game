import { test, expect, type Page } from '@playwright/test';
import { PLAYER, TILE } from '../../src/config/constants';
import { CROWS, PLATFORMS } from './landmarks';

// The second half of src/levels/level1.json (cols 113-229) played through section by section, like a player:
// hold right, jump at the edges, meow at enemies in reach, wait for platforms and crows. Each test starts at the
// section's checkpoint and must reach the next one without dying.

const feet = (row: number) => row * TILE - PLAYER.HEIGHT / 2;     // centre y of the cat standing on `row`
const at = (col: number) => col * TILE + TILE / 2;
const H1 = PLATFORMS.findIndex(p => !p.vertical);                   // sideways over the wide pit
const V1 = PLATFORMS.findIndex(p => p.vertical);                    // up to the ledge
const BRIDGE_CROW = CROWS.findIndex(c => !c.vertical && c.width > 8 * TILE);
const FINALE_CROW = CROWS.findIndex(c => c.vertical);

declare global {
    interface Window {
        __bot: {
            until (pred: string, timeoutMs?: number): Promise<void>;
            runRight (toX: number, opts?: { jumps?: number[]; jumpMs?: number; meow?: boolean; timeoutMs?: number }): Promise<void>;
            jumpRight (releaseAtX: number, jumpMs?: number): Promise<void>;
        };
    }
}

/** A tiny scripted player living in the page; conditions are expressions over `s` (the game state). */
function installBot ()
{
    const g = () => window.__game!;
    const died = (deaths: number) => g().getState().deaths !== deaths;
    window.__bot = {
        async until (pred, timeoutMs = 20000)
        {
            const test = new Function('s', `return (${pred});`) as (s: ReturnType<NonNullable<typeof window.__game>["getState"]>) => boolean;
            for (let t = 0; !test(g().getState()); t += 16) {
                if (t > timeoutMs) throw new Error(`bot: timed out waiting for ${pred}`);
                await g().wait(16);
            }
        },
        async runRight (toX, { jumps = [], jumpMs = 250, meow = false, timeoutMs = 20000 } = {})
        {
            const start = g().getState().deaths;
            const pending = [...jumps].sort((a, b) => a - b);
            g().hold(['right']);
            try {
                for (let t = 0; ; t += 16) {
                    const s = g().getState();
                    if (died(start)) throw new Error(`bot: died near x=${Math.round(s.player!.x / 16)} tiles`);
                    if (s.player!.x >= toX) return;
                    if (t > timeoutMs) throw new Error('bot: runRight timed out');
                    while (pending.length && s.player!.x >= pending[0]) {
                        pending.shift();
                        g().press(['jump'], jumpMs);
                    }
                    const threat = s.enemies.some(e => e.harmful && e.x - s.player!.x > -8 && e.x - s.player!.x < 3.5 * 16 && Math.abs(e.y - s.player!.y) < 24);
                    if (meow && threat && s.meow.cooldownMs === 0) g().press(['meow'], 50);
                    await g().wait(16);
                }
            } finally {
                g().release(['right']);
            }
        },
        /** Jumps to the right, steering until the cat's x passes `releaseAtX`, then lands. */
        async jumpRight (releaseAtX, jumpMs = 300)
        {
            const start = g().getState().deaths;
            g().hold(['right']);
            g().press(['jump'], jumpMs);
            try {
                for (let t = 0; g().getState().player!.x < releaseAtX; t += 16) {
                    if (t > 3000) throw new Error('bot: jumpRight never got there');
                    await g().wait(16);
                }
            } finally {
                g().release(['right']);
            }
            await g().wait(50);
            for (let t = 0; !g().getState().player!.onGround; t += 16) {
                if (died(start) || t > 3000) throw new Error('bot: jumpRight did not land');
                await g().wait(16);
            }
            if (died(start)) throw new Error('bot: died during jumpRight');
        }
    };
}

async function startAt (page: Page, col: number, row: number)
{
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [at(col), feet(row)]);
    await page.waitForFunction(() => window.__game!.getState().player!.onGround);
}

const until = (page: Page, pred: string, timeoutMs?: number) => page.evaluate(([p, t]) => window.__bot.until(p, t), [pred, timeoutMs] as const);
const runRight = (page: Page, toX: number, opts?: Parameters<Window['__bot']['runRight']>[1]) =>
    page.evaluate(([x, o]) => window.__bot.runRight(x, o), [toX, opts] as const);
const jumpRight = (page: Page, releaseAtX: number, jumpMs?: number) =>
    page.evaluate(([x, ms]) => window.__bot.jumpRight(x, ms), [releaseAtX, jumpMs] as const);

test.beforeEach(async ({ page }) => {
    await page.addInitScript(installBot);
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

test('hedgehogs section: meow past the hedgehog, under the ledge, over the spikes', async ({ page }) => {
    await startAt(page, 113, 15);
    await runRight(page, at(136), { meow: true, jumps: [131.7 * TILE] });
    const s = await page.evaluate(() => window.__game!.getState());
    expect(s.deaths).toBe(0);
    expect(s.checkpoint.x).toBe(at(136));
});

test('moving platforms section: across the wide pit and up to the cliff', async ({ page }) => {
    await startAt(page, 136, 15);
    await runRight(page, 137.2 * TILE);
    // Onto the sideways platform when it is at the near end.
    await until(page, `s.platforms[${H1}].x <= ${PLATFORMS[H1].x + 4}`);
    await jumpRight(page, PLATFORMS[H1].x + 1.5 * TILE);
    expect((await page.evaluate(() => window.__game!.getState())).player!.y).toBeCloseTo(feet(13), 0);
    // Ride to the far end, hop onto the pillar.
    await until(page, `s.platforms[${H1}].x >= ${144 * TILE - 4}`);
    await jumpRight(page, 147.7 * TILE);
    // Onto the vertical platform as it comes up to the pillar's height.
    await until(page, `s.platforms[${V1}].vy < 0 && s.platforms[${V1}].y < ${12.5 * TILE} && s.platforms[${V1}].y > ${11 * TILE}`);
    await jumpRight(page, 150.8 * TILE, 250);
    // Ride to the top, step over to the ledge, then onto the cliff.
    await until(page, `s.platforms[${V1}].y <= ${8 * TILE + 2}`);
    await jumpRight(page, 153.6 * TILE, 250);
    await jumpRight(page, 157 * TILE, 250);
    const s = await page.evaluate(() => window.__game!.getState());
    expect(s.deaths).toBe(0);
    expect(s.player!.y).toBeCloseTo(feet(9), 0);
    expect(s.checkpoint.x).toBe(at(157));
});

test('crumbling bridge: freeze the crow with a meow and run across before the planks fall', async ({ page }) => {
    await startAt(page, 157, 9);
    await runRight(page, 165.5 * TILE);
    await until(page, `s.enemies.filter(e => e.kind === 'crow')[${BRIDGE_CROW}].x < ${172 * TILE} && s.meow.cooldownMs === 0`);
    await page.evaluate(() => window.__game!.press(['meow'], 50));
    await until(page, `s.enemies.filter(e => e.kind === 'crow')[${BRIDGE_CROW}].scared`, 2000);
    await runRight(page, at(190), { jumps: [166.6, 170.6, 175.6, 180.6, 185.6].map(c => c * TILE), jumpMs: 200 });
    const s = await page.evaluate(() => window.__game!.getState());
    expect(s.deaths).toBe(0);
    expect(s.checkpoint.x).toBe(at(190));
});

test('finale: the spikes, the up-and-down crow, the hedgehog and into the cave', async ({ page }) => {
    await startAt(page, 190, 9);
    await runRight(page, 204.5 * TILE, { jumps: [200.2 * TILE] });             // off the cliff, over the spikes
    const top = CROWS[FINALE_CROW].y;
    await until(page, `s.enemies.filter(e => e.kind === 'crow')[${FINALE_CROW}].y < ${top + 20}`);
    await runRight(page, 222 * TILE, { meow: true });
    await page.evaluate(() => window.__game!.hold(['right']));
    await page.waitForFunction(() => window.__game!.getState().scene === 'LevelComplete');
    await page.evaluate(() => window.__game!.release(['right']));
    expect((await page.evaluate(() => window.__game!.getState())).deaths).toBe(0);
});
