import { describe, expect, it } from 'vitest';
import { approach } from '../../src/core/math';

describe('approach', () => {
    it('covers `rate` of the distance in one 60 FPS frame', () => {
        expect(approach(0, 100, 0.25, 1000 / 60)).toBeCloseTo(25, 6);
    });

    it('is frame-rate independent', () => {
        let at60 = 0;
        for (let i = 0; i < 60; i++) at60 = approach(at60, 100, 0.1, 1000 / 60);
        let at30 = 0;
        for (let i = 0; i < 30; i++) at30 = approach(at30, 100, 0.1, 1000 / 30);
        expect(at30).toBeCloseTo(at60, 6);
    });

    it('never overshoots the target', () => {
        expect(approach(0, 100, 0.5, 1000)).toBeLessThanOrEqual(100);
        expect(approach(0, 100, 0.5, 1000)).toBeGreaterThan(99.9);
    });
});
