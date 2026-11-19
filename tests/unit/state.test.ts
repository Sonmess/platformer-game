import { describe, expect, it } from 'vitest';
import { COIN, LIVES } from '../../src/config/constants';
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

describe('lives', () => {
    it('a new run starts with three lives', () => {
        state.lives = 1;
        state.reset();
        expect(state.lives).toBe(LIVES.START);
        expect(LIVES.START).toBe(3);
        expect(state.gameOver).toBe(false);
    });

    it('every death counts and takes a life; at none left the game is over', () => {
        state.reset();
        for (let i = LIVES.START - 1; i >= 0; i--) expect(state.loseLife()).toBe(i);
        expect(state.deaths).toBe(LIVES.START);
        expect(state.gameOver).toBe(true);
        expect(state.loseLife()).toBe(0);                  // never below zero
    });

    it('a life can be gained back, but not above the maximum', () => {
        state.reset();
        state.loseLife();
        expect(state.gainLife()).toBe(true);
        expect(state.lives).toBe(LIVES.MAX);
        expect(state.gainLife()).toBe(false);
        expect(state.lives).toBe(LIVES.MAX);
    });
});

describe('feathers and points', () => {
    it('counts feathers and adds up their points', () => {
        state.reset(1, { x: 0, y: 0 }, 3, 16);
        state.collect(1);
        state.collect(5);
        state.collect(10);
        expect(state).toMatchObject({ coins: 3, coinsTotal: 3, points: 16, pointsTotal: 16 });
    });

    it('every LIFE_EVERY points give back a missing life, never above the maximum', () => {
        state.reset();
        state.loseLife();
        for (let p = 0; p < COIN.LIFE_EVERY - 10; p += 10) expect(state.collect(10)).toBe(false);
        expect(state.collect(10)).toBe(true);               // crossed the threshold
        expect(state.lives).toBe(LIVES.MAX);
        for (let p = 0; p < COIN.LIFE_EVERY; p += 10) expect(state.collect(10)).toBe(false);   // full: nothing
        expect(state.lives).toBe(LIVES.MAX);
    });

    it('a new run clears the points', () => {
        state.collect(10);
        state.reset();
        expect(state.points).toBe(0);
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
