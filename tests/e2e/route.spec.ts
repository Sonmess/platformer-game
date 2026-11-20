import { test, expect, type Page } from '@playwright/test';
import { PLAYER, TILE } from '../../src/config/constants';
import { CROWS, PLATFORMS, SNAKES, TRUNKS, VINES, landmarks, snakeIndex } from './landmarks';

// The whole of src/levels/level1.json played through section by section, like a player: hold right, jump at the
// edges, meow at enemies in reach, claw snakes in the calm between their sprays, climb trunks and vines for the
// feathers, wait for platforms and crows. Each test starts at the section's checkpoint (the first at the start) and
// must reach the next one without dying.

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
            clawSnake (index: number): Promise<void>;
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
                    if (t > timeoutMs) throw new Error(`bot: runRight timed out at x=${(s.player!.x / 16).toFixed(1)}, y=${(s.player!.y / 16).toFixed(1)} tiles`);
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
                    if (t > 3000) throw new Error(`bot: jumpRight never got there (at ${(g().getState().player!.x / 16).toFixed(1)},${(g().getState().player!.y / 16).toFixed(1)})`);
                    await g().wait(16);
                }
            } finally {
                g().release(['right']);
            }
            await g().wait(50);
            for (let t = 0; !g().getState().player!.onGround; t += 16) {
                if (died(start) || t > 3000) throw new Error(`bot: jumpRight did not land (at ${(g().getState().player!.x / 16).toFixed(1)},${(g().getState().player!.y / 16).toFixed(1)})`);
                await g().wait(16);
            }
            if (died(start)) throw new Error('bot: died during jumpRight');
        },
        /** Waits for a fresh calm between the snake's sprays, walks up to it and claws it away. */
        async clawSnake (index)
        {
            await this.until(`s.enemies[${index}].phase === 'spray'`);
            await this.until(`s.enemies[${index}].phase === 'calm'`);
            // Walk up to it, measuring the gap as it slithers closer, and swipe once it is within reach.
            g().hold(['right']);
            try {
                for (let t = 0; g().getState().enemies[index].x - g().getState().player!.x > 30 || !g().getState().player!.onGround; t += 16) {
                    if (t > 5000) throw new Error('bot: never reached the snake');
                    await g().wait(16);
                }
                g().press(['claw'], 50);
            } finally {
                g().release(['right']);
            }
            try { await this.until(`s.enemies[${index}].gone`, 2000); } catch { const e = g().getState().enemies[index]; throw new Error(`bot: claw missed the snake at ${(e.x / 16).toFixed(1)} (cat at ${(g().getState().player!.x / 16).toFixed(1)},${(g().getState().player!.y / 16).toFixed(1)}, phase ${e.phase})`); }
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
const clawSnake = (page: Page, index: number) => page.evaluate(i => window.__bot.clawSnake(i), index);
const hold = (page: Page, keys: string[]) => page.evaluate(k => window.__game!.hold(k as never), keys);
const release = (page: Page, keys: string[]) => page.evaluate(k => window.__game!.release(k as never), keys);
const state = (page: Page) => page.evaluate(() => window.__game!.getState());
const centre = (z: { x: number; width: number }) => z.x + z.width / 2;
/** The snake (its index in getState().enemies) patrolling a column. */
const snakeAt = (col: number) => snakeIndex(SNAKES.findIndex(sn => sn.col <= col && col < sn.col + sn.width / TILE));
/** The trunk / vine standing in a column. */
const trunkAt = (col: number) => TRUNKS.find(t => t.col === col)!;
const vineAt = (col: number) => VINES.find(v => v.col === col)!;

test.beforeEach(async ({ page }) => {
    await page.addInitScript(installBot);
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

test('start: up the tree and down the vine for the feathers, past the hedgehog, over the plateau and the first pit', async ({ page }) => {
    const vine = vineAt(7);
    await startAt(page, 1, 15);
    await hold(page, ['up']);                                                   // up the trunk, pulled up at the top
    await until(page, "s.climb.lastLetGo === 'top'");
    await release(page, ['up']);
    await hold(page, ['right']);                                                // onto the ledge (silver feather), off its end
    await until(page, `s.player.x >= ${vine.x - 4}`);
    await hold(page, ['up']);                                                   // catch the vine while falling
    await until(page, 's.player.climbing');
    await release(page, ['right']);
    await until(page, 's.points >= 6');                                         // the feather above
    await release(page, ['up']);
    await hold(page, ['down']);                                                 // and the two below, down to the ground
    await until(page, '!s.player.climbing && s.player.onGround');
    await release(page, ['down']);
    expect((await state(page)).points).toBe(8);

    await runRight(page, at(56), { meow: true, jumps: [12.5, 30.5, 34.8, 38.6, 49].map(c => c * TILE), jumpMs: 400 });
    const s = await state(page);
    expect(s.deaths).toBe(0);
    expect(s.checkpoint.x).toBe(at(56));
});

test('wide pit: up the trunk to the gold feather, down onto the floating platform, across', async ({ page }) => {
    const tree = trunkAt(59);
    await startAt(page, 56, 15);
    await runRight(page, centre(tree) - 4);                                     // walking up to a trunk does not grab it
    await hold(page, ['up']);
    await until(page, "s.climb.lastLetGo === 'top'");
    await release(page, ['up']);
    await hold(page, ['right']);
    await until(page, `s.player.onGround && s.player.y < ${feet(8)}`);        // on the ledge
    await until(page, `s.player.onGround && s.player.y > ${feet(10)}`);       // off its end, down onto the floating platform
    await release(page, ['right']);
    expect((await state(page)).player!.y).toBeCloseTo(feet(12), 0);
    expect((await state(page)).points).toBe(11);                                // the gold one and the blue over the platform
    await runRight(page, 67 * TILE);
    await jumpRight(page, at(70));                                              // lands short of the checkpoint (not over it)
    await runRight(page, at(74));
    const s = await state(page);
    expect(s.deaths).toBe(0);
    expect(s.checkpoint.x).toBe(at(73));
});

test('climb section: claw the snake, over the wall and the spikes, under the platforms, over the last pit', async ({ page }) => {
    await startAt(page, 73, 15);
    await clawSnake(page, snakeAt(77));
    await runRight(page, at(113), { jumps: [78, 85.5, 107].map(c => c * TILE), jumpMs: 400 });
    const s = await state(page);
    expect(s.deaths).toBe(0);
    expect(s.checkpoint.x).toBe(at(113));
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

test('finale: the snake on the cliff, the spikes, the crow, the hedgehog, up the vine to the cave roof and in', async ({ page }) => {
    const vine = vineAt(219);
    await startAt(page, 190, 9);
    await clawSnake(page, snakeAt(194));
    await hold(page, ['left']);                                                 // back to the campfire for a run-up
    await until(page, `s.player.x <= ${at(190)}`);
    await release(page, ['left']);
    await runRight(page, 204.5 * TILE, { jumps: [199.5 * TILE] });             // off the cliff, over the spikes (buffered on landing)
    const top = CROWS[FINALE_CROW].y;
    await until(page, `s.enemies.filter(e => e.kind === 'crow')[${FINALE_CROW}].y < ${top + 20}`);
    await runRight(page, centre(vine) - 4, { meow: true });
    // The vine ends above the cat's reach: up jumps and catches it on the way.
    await hold(page, ['up']);
    await until(page, 's.player.climbing');
    await until(page, `s.player.y < ${7.5 * TILE}`);
    await release(page, ['up']);
    const before = (await state(page)).points;
    await hold(page, ['right']);
    await page.evaluate(() => window.__game!.press(['jump'], 200));            // jump off onto the roof
    await until(page, `s.player.onGround && s.player.x > ${226 * TILE}`);    // past the silver feather
    await release(page, ['right']);
    expect((await state(page)).points).toBe(before + 5);
    await hold(page, ['left']);                                                 // off the roof, down in front of the cave
    await until(page, `s.player.onGround && s.player.y > ${feet(14)}`);
    await release(page, ['left']);
    await page.evaluate(() => window.__game!.hold(['right']));
    await page.waitForFunction(() => window.__game!.getState().scene === 'LevelComplete');
    await page.evaluate(() => window.__game!.release(['right']));
    expect((await page.evaluate(() => window.__game!.getState())).deaths).toBe(0);
});

// ── Level 2, the cave (M4 step 8) ────────────────────────────────────────────────────────────
test.describe('level 2 (the cave)', () => {
    const L2 = landmarks(2);
    const snake2At = (col: number) => L2.snakeIndex(L2.SNAKES.findIndex(sn => sn.col <= col && col < sn.col + sn.width / TILE));
    const vine2At = (col: number) => L2.VINES.find(v => v.col === col)!;
    const platform = L2.PLATFORMS[0];

    test.beforeEach(async ({ page }) => {
        await page.goto('/?play=2');
        await page.waitForFunction(() => window.__game?.getState().player?.onGround === true && window.__game.getState().levelNumber === 2);
    });

    test('entrance: the yarn ball, past the first stalactite to the first campfire', async ({ page }) => {
        await runRight(page, at(29));
        const s = await state(page);
        expect(s.deaths).toBe(0);
        expect(s.player!.big).toBe(true);                                     // took the yarn ball on the way
        expect(s.checkpoint.x).toBe(at(28));
    });

    test('hedgehog and stalactites: meow past the hedgehog, run under the stalactites, over the pit', async ({ page }) => {
        await startAt(page, 28, 15);
        await runRight(page, at(62), { meow: true, jumps: [51 * TILE], jumpMs: 400 });
        const s = await state(page);
        expect(s.deaths).toBe(0);
        expect(s.checkpoint.x).toBe(at(61));
    });

    test('the chasm: moving platform, two limestone crumbles, the ledge, claw the snake', async ({ page }) => {
        await startAt(page, 61, 15);
        await runRight(page, 63.4 * TILE);                                       // a step back from the edge: the platform starts right at it
        await until(page, `s.platforms[0].x <= ${platform.x + 4}`);
        await jumpRight(page, platform.x + 1.5 * TILE);
        expect((await state(page)).player!.y).toBeCloseTo(feet(13), 0);
        await until(page, `s.platforms[0].x >= ${platform.x + platform.width - 3 * TILE - 4}`);
        await jumpRight(page, 77 * TILE, 250);                                    // onto the first crumble
        await jumpRight(page, 81 * TILE, 250);                                    // the second, a tile higher
        await jumpRight(page, 86 * TILE, 250);                                    // the ledge
        expect((await state(page)).player!.y).toBeCloseTo(feet(11), 0);
        await clawSnake(page, snake2At(93));
        await runRight(page, at(99));
        const s = await state(page);
        expect(s.deaths).toBe(0);
        expect(s.checkpoint.x).toBe(at(98));
    });

    test('roots: up the root onto the cliff (gold), down, a jump onto the root over the wide pit', async ({ page }) => {
        const first = vine2At(105), second = vine2At(125);
        await startAt(page, 98, 15);
        await runRight(page, centre(first) - 4);
        await hold(page, ['up']);
        await until(page, 's.player.climbing');
        await until(page, `s.player.y < ${feet(7) - 6}`);                       // above the cliff top
        await release(page, ['up']);
        await hold(page, ['right']);
        await page.evaluate(() => window.__game!.press(['jump'], 250));
        await until(page, `s.player.onGround && s.player.y < ${feet(8)}`);     // on the cliff
        await release(page, ['right']);
        const before = (await state(page)).points;
        await runRight(page, at(121));                                           // over the cliff top, down again
        expect((await state(page)).points).toBeGreaterThanOrEqual(before + 10);
        await until(page, 's.player.onGround');

        // The second root ends too high to reach from the floor: up jumps and catches it.
        await hold(page, ['right', 'up']);
        await until(page, 's.player.climbing');
        await release(page, ['right', 'up']);
        expect((await state(page)).player!.climbKind).toBe('vine');
        expect(Math.abs((await state(page)).player!.x - centre(second))).toBeLessThan(2);
        await hold(page, ['right']);
        await page.evaluate(() => window.__game!.press(['jump'], 300));
        await until(page, 's.player.onGround');
        await release(page, ['right']);
        await runRight(page, at(134));
        const s = await state(page);
        expect(s.deaths).toBe(0);
        expect(s.checkpoint.x).toBe(at(133));
    });

    test('snake and corridor: claw the snake, over the pit, run through the stalactite corridor', async ({ page }) => {
        await startAt(page, 133, 15);
        await clawSnake(page, snake2At(139));
        await runRight(page, at(172), { jumps: [147 * TILE], jumpMs: 400 });
        const s = await state(page);
        expect(s.deaths).toBe(0);
        expect(s.stalactites.filter(t => t.phase === 'shattered').length).toBeGreaterThanOrEqual(4);   // all fell behind the cat
        expect(s.checkpoint.x).toBe(at(171));
    });

    test('the exit: meow past the hedgehog, over the crumbles, out of the cave', async ({ page }) => {
        await startAt(page, 171, 15);
        await runRight(page, 182.5 * TILE, { meow: true });
        await jumpRight(page, 185 * TILE, 300);                                  // onto the first crumble
        await jumpRight(page, 189 * TILE, 250);                                  // the second
        await page.evaluate(() => window.__game!.hold(['right']));
        await page.waitForFunction(() => window.__game!.getState().scene === 'LevelComplete');
        await page.evaluate(() => window.__game!.release(['right']));
        const s = await state(page);
        expect(s.deaths).toBe(0);
        expect(s.finalScreen).toBe(true);
    });
});
