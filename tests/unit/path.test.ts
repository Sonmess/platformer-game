import { describe, expect, it } from 'vitest';
import { pingPong } from '../../src/core/path';

describe('pingPong', () => {
    it('starts at 0, reaches the end after one length and comes back after two', () => {
        expect(pingPong(0, 100)).toEqual({ t: 0, dir: 1 });
        expect(pingPong(100, 100).t).toBeCloseTo(1);
        expect(pingPong(100, 100).dir).toBe(-1);
        expect(pingPong(200, 100).t).toBeCloseTo(0);
        expect(pingPong(200, 100).dir).toBe(1);
    });

    it('is in the middle halfway, both ways', () => {
        expect(pingPong(50, 100).t).toBeCloseTo(0.5);
        expect(pingPong(150, 100).t).toBeCloseTo(0.5);
        expect(pingPong(150, 100).dir).toBe(-1);
    });

    it('slows down near the ends (eased)', () => {
        const nearEnd = pingPong(99, 100).t - pingPong(98, 100).t;
        const middle = pingPong(51, 100).t - pingPong(50, 100).t;
        expect(nearEnd).toBeLessThan(middle / 10);
    });

    it('stays put for a zero-length path', () => {
        expect(pingPong(123, 0)).toEqual({ t: 0, dir: 1 });
    });
});
