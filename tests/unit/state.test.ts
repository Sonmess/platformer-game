import { describe, expect, it } from 'vitest';
import { state } from '../../src/core/state';

describe('state.reset', () => {
    it('clears per-run counters and sets the checkpoint to the spawn', () => {
        state.coins = 7;
        state.deaths = 3;
        state.checkpoint = { x: 999, y: 999 };
        state.reset(2, { x: 10, y: 20 });
        expect(state).toMatchObject({ level: 2, coins: 0, deaths: 0, checkpoint: { x: 10, y: 20 } });
    });

    it('copies the spawn instead of keeping a reference', () => {
        const spawn = { x: 1, y: 2 };
        state.reset(1, spawn);
        spawn.x = 100;
        expect(state.checkpoint.x).toBe(1);
    });
});

describe('state.reset coin total', () => {
    it('stores the level coin total and clears collected coins', () => {
        state.coins = 5;
        state.reset(1, { x: 0, y: 0 }, 16);
        expect(state.coins).toBe(0);
        expect(state.coinsTotal).toBe(16);
    });
});
