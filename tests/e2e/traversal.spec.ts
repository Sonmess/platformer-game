import { test, expect, type Page } from '@playwright/test';
import { PLAYER, TILE } from '../../src/config/constants';

// Each obstacle in src/levels/level1.json must stay clearable with the current jump tuning.
// Scripted like a player: run up, press jump at the take-off column, keep holding right.
interface Obstacle { name: string; startCol: number; standRow: number; takeoffCol: number; passCol: number; landRow: number }

const OBSTACLES: Obstacle[] = [
    { name: 'first pit (4 tiles)', startCol: 45, standRow: 15, takeoffCol: 49, passCol: 55, landRow: 15 },
    { name: 'wide pit, onto the floating platform', startCol: 58, standRow: 15, takeoffCol: 61, passCol: 65, landRow: 12 },
    { name: 'wide pit, off the floating platform', startCol: 65, standRow: 12, takeoffCol: 67, passCol: 72, landRow: 15 },
    { name: 'wall (3 tiles)', startCol: 74, standRow: 15, takeoffCol: 78, passCol: 83, landRow: 15 },
    { name: 'climb to the first platform', startCol: 89, standRow: 15, takeoffCol: 90, passCol: 94, landRow: 12 },
    { name: 'climb to the second platform', startCol: 93, standRow: 12, takeoffCol: 95, passCol: 98, landRow: 9 },
    { name: 'climb to the top platform', startCol: 98, standRow: 9, takeoffCol: 100, passCol: 103, landRow: 6 },
    { name: 'last pit (4 tiles)', startCol: 104, standRow: 15, takeoffCol: 107, passCol: 113, landRow: 15 }
];

const feetToCentre = (row: number) => row * TILE - PLAYER.HEIGHT / 2;

async function settleAt (page: Page, col: number, row: number)
{
    await page.evaluate(([x, y]) => window.__game!.teleport(x, y), [col * TILE + TILE / 2, feetToCentre(row)]);
    await page.waitForFunction(() => {
        const p = window.__game!.getState().player!;
        return p.onGround && Math.abs(p.vy) < 1;
    });
}

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.waitForFunction(() => window.__game?.getState().player?.onGround === true);
});

for (const o of OBSTACLES) {
    test(`can clear: ${o.name}`, async ({ page }) => {
        await settleAt(page, o.startCol, o.standRow);
        const deathsBefore = (await page.evaluate(() => window.__game!.getState())).deaths;

        await page.evaluate(async ([takeoffX, passX]) => {
            const g = window.__game!;
            const run = g.press(['right'], 4000);
            await new Promise<void>(resolve => {
                const check = () => { if (g.getState().player!.x >= takeoffX) { g.game.events.off('step', check); resolve(); } };
                g.game.events.on('step', check);
            });
            void g.press(['jump'], 600);                                    // held = full jump
            await new Promise<void>(resolve => {
                const check = () => {
                    const p = g.getState().player!;
                    if ((p.x >= passX && p.onGround) || g.getState().deaths > 0) { g.game.events.off('step', check); resolve(); }
                };
                g.game.events.on('step', check);
            });
            void run;
        }, [(o.takeoffCol + 0.5) * TILE, o.passCol * TILE]);

        const s = await page.evaluate(() => window.__game!.getState());
        expect(s.deaths, 'died while crossing').toBe(deathsBefore);
        expect(s.player!.x).toBeGreaterThanOrEqual(o.passCol * TILE);
        expect(s.player!.y).toBeCloseTo(feetToCentre(o.landRow), 0);
    });
}
