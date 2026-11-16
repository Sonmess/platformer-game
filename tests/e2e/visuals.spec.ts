import { test, expect, type Page } from '@playwright/test';
import { ANIM, PLAYER, TILE } from '../../src/config/constants';

const GROUND_Y = 15 * TILE - PLAYER.HEIGHT / 2;
const OPEN_GROUND_X = 5 * TILE;

const player = (page: Page) => page.evaluate(() => window.__game!.getState().player!);

test.beforeEach(async ({ page }) => {
    await page.goto('/?play');      // straight into the level
    await page.evaluate(([x, y]) => window.__game?.teleport(x, y), [OPEN_GROUND_X, GROUND_Y]).catch(() => undefined);
    await page.waitForFunction(() => {
        const p = window.__game?.getState().player;
        return p?.onGround === true && Math.abs(p.vx) < 1;
    });
});

test('cat animation follows the movement', async ({ page }) => {
    expect((await player(page)).anim).toBe(ANIM.CAT_IDLE);

    const seen = await page.evaluate(async () => {
        const g = window.__game!;
        const log: Array<{ anim: string; vy: number; onGround: boolean; vx: number }> = [];
        const step = () => { const p = g.getState().player!; log.push({ anim: p.anim, vy: p.vy, onGround: p.onGround, vx: p.vx }); };
        g.game.events.on('poststep', step);
        await g.press(['right'], 400);
        await g.press(['jump'], 600);
        await g.wait(600);
        g.game.events.off('poststep', step);
        return log;
    });

    expect(seen.some(s => s.anim === ANIM.CAT_RUN && s.onGround)).toBe(true);
    expect(seen.some(s => s.anim === ANIM.CAT_JUMP && s.vy < 0)).toBe(true);
    expect(seen.some(s => s.anim === ANIM.CAT_FALL && s.vy > 0)).toBe(true);
    // Never shows the run cycle in the air.
    expect(seen.filter(s => !s.onGround).every(s => s.anim !== ANIM.CAT_RUN)).toBe(true);
});

test('cat faces the way it last moved', async ({ page }) => {
    await page.evaluate(() => window.__game!.press(['left'], 200));
    expect((await player(page)).flipX).toBe(true);
    await page.evaluate(() => window.__game!.press(['right'], 200));
    expect((await player(page)).flipX).toBe(false);
});
