import { describe, expect, it } from 'vitest';
import { Cooldown, Scare, inMeowRange, type MeowWave } from '../../src/core/meow';

describe('Cooldown', () => {
    it('is ready at first and locks for its duration after a use', () => {
        const c = new Cooldown(2000);
        expect(c.trigger()).toBe(true);
        expect(c.trigger()).toBe(false);
        c.update(1999);
        expect(c.ready).toBe(false);
        c.update(1);
        expect(c.trigger()).toBe(true);
    });

    it('never goes below zero and reset makes it ready', () => {
        const c = new Cooldown(500);
        c.trigger();
        c.update(10_000);
        expect(c.remainingMs).toBe(0);
        c.trigger();
        c.reset();
        expect(c.ready).toBe(true);
    });
});

describe('inMeowRange', () => {
    const right: MeowWave = { x: 100, y: 50, dir: 1, range: 64, halfHeight: 24, behind: 8 };

    it('reaches forward up to the range, not further', () => {
        expect(inMeowRange(right, { x: 164, y: 50 })).toBe(true);
        expect(inMeowRange(right, { x: 165, y: 50 })).toBe(false);
    });

    it('reaches only a little behind the head', () => {
        expect(inMeowRange(right, { x: 92, y: 50 })).toBe(true);
        expect(inMeowRange(right, { x: 91, y: 50 })).toBe(false);
    });

    it('is limited vertically', () => {
        expect(inMeowRange(right, { x: 120, y: 74 })).toBe(true);
        expect(inMeowRange(right, { x: 120, y: 75 })).toBe(false);
    });

    it('mirrors when facing left', () => {
        const left: MeowWave = { ...right, dir: -1 };
        expect(inMeowRange(left, { x: 40, y: 50 })).toBe(true);
        expect(inMeowRange(left, { x: 120, y: 50 })).toBe(false);
    });
});

describe('Scare', () => {
    it('lasts its duration, warning near the end, then recovers once', () => {
        const s = new Scare(3000, 600);
        s.scare();
        expect(s.update(2000, true)).toBe(false);
        expect(s.scared && !s.warning).toBe(true);
        expect(s.update(500, true)).toBe(false);
        expect(s.warning).toBe(true);
        expect(s.update(500, true)).toBe(true);
        expect(s.scared).toBe(false);
        expect(s.update(500, true)).toBe(false);
    });

    it('waits to recover while it may not (the cat is on top of it)', () => {
        const s = new Scare(1000, 200);
        s.scare();
        expect(s.update(1500, false)).toBe(false);
        expect(s.scared).toBe(true);
        expect(s.update(16, true)).toBe(true);
    });

    it('a new meow restarts the fright', () => {
        const s = new Scare(1000, 200);
        s.scare();
        s.update(900, true);
        s.scare();
        expect(s.update(900, true)).toBe(false);
        expect(s.scared).toBe(true);
    });
});
