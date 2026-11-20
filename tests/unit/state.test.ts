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
        state.enter('new');
        state.reset();
        expect(state.lives).toBe(LIVES.START);
        expect(LIVES.START).toBe(3);
        expect(state.gameOver).toBe(false);
    });

    it('every death counts and takes a life; at none left the game is over', () => {
        state.enter('new');
        state.reset();
        for (let i = LIVES.START - 1; i >= 0; i--) expect(state.loseLife()).toBe(i);
        expect(state.deaths).toBe(LIVES.START);
        expect(state.gameOver).toBe(true);
        expect(state.loseLife()).toBe(0);                  // never below zero
    });

    it('lives can be gained above the start, but not above the maximum', () => {
        state.enter('new');
        state.reset();
        expect(LIVES.MAX).toBeGreaterThan(LIVES.START);
        for (let n = LIVES.START; n < LIVES.MAX; n++) expect(state.gainLife()).toBe(true);
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

    it('every LIFE_EVERY points give a life, also above the start, never above the maximum', () => {
        state.enter('new');
        state.reset();
        state.loseLife();
        for (let p = 0; p < COIN.LIFE_EVERY - 10; p += 10) expect(state.collect(10)).toBe(false);
        expect(state.collect(10)).toBe(true);               // crossed the threshold: the lost life is back
        expect(state.lives).toBe(LIVES.START);
        for (let p = 0; p < COIN.LIFE_EVERY - 10; p += 10) state.collect(10);
        expect(state.collect(10)).toBe(true);               // and one on top of the start
        expect(state.lives).toBe(LIVES.START + 1);

        state.lives = LIVES.MAX;
        for (let p = 0; p < COIN.LIFE_EVERY; p += 10) expect(state.collect(10)).toBe(false);   // full: nothing
        expect(state.lives).toBe(LIVES.MAX);
    });

    it('a new run clears the points', () => {
        state.collect(10);
        state.enter('new');
        state.reset();
        expect(state).toMatchObject({ points: 0, runPoints: 0, totalPoints: 0 });
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

describe('levels in a run', () => {
    /** Level 1 finished with one life lost and 12 points. */
    function finishFirstLevel ()
    {
        state.enter('new');
        state.reset(1);
        state.loseLife();
        state.collect(10);
        state.collect(2);
    }

    it('the next level keeps the lives and adds the points to the run', () => {
        finishFirstLevel();
        state.enter('next');
        state.reset(2);
        expect(state).toMatchObject({ level: 2, lives: LIVES.START - 1, points: 0, runPoints: 12, totalPoints: 12, deaths: 0 });
    });

    it('extra lives count the points of the whole run', () => {
        finishFirstLevel();
        state.enter('next');
        state.reset(2);
        for (let p = 12; p + 10 < COIN.LIFE_EVERY; p += 10) expect(state.collect(10)).toBe(false);
        expect(state.collect(10)).toBe(true);                  // 12 + 40 crosses 50
        expect(state.lives).toBe(LIVES.START);
    });

    it('replaying a level goes back to how it started; retrying after game over gives three lives', () => {
        finishFirstLevel();
        state.enter('next');
        state.reset(2);
        state.collect(5);
        state.loseLife();
        state.enter('replay');
        state.reset(2);
        expect(state).toMatchObject({ lives: LIVES.START - 1, runPoints: 12, points: 0 });

        while (!state.gameOver) state.loseLife();
        state.enter('retry');
        state.reset(2);
        expect(state).toMatchObject({ lives: LIVES.START, runPoints: 12, points: 0, deaths: 0 });
    });
});
