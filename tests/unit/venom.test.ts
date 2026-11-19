import { describe, expect, it } from 'vitest';
import { Venom, inCloud } from '../../src/core/venom';

const T = { CALM_MS: 1000, WARN_MS: 400, SPRAY_MS: 600 };

describe('Venom cycle', () => {
    it('goes calm → warn → spray → calm, reporting each change once', () => {
        const v = new Venom(T);
        expect(v.phase).toBe('calm');
        expect(v.update(999)).toBeNull();
        expect(v.update(1)).toBe('warn');
        expect(v.update(399)).toBeNull();
        expect(v.update(1)).toBe('spray');
        expect(v.update(600)).toBe('calm');
        expect(v.phase).toBe('calm');
    });

    it('keeps the leftover time across a change (frame-rate independent)', () => {
        const v = new Venom(T);
        v.update(1100);                     // 100 ms into the warning
        expect(v.phase).toBe('warn');
        expect(v.remainingMs).toBe(300);
    });

    it('a full cycle takes the sum of the phases, whatever the step size', () => {
        for (const step of [7, 16.7, 33.3]) {
            const v = new Venom(T);
            let t = 0, changes = 0;
            while (changes < 3) { t += step; if (v.update(step)) changes++; }
            expect(t).toBeGreaterThanOrEqual(2000);
            expect(t).toBeLessThan(2000 + step);
        }
    });
});

describe('inCloud', () => {
    const cloud = { x: 100, y: 100, radius: 24 };
    it('reaches a box whose nearest edge is within the radius', () => {
        expect(inCloud(cloud, { x: 120, y: 90, width: 18, height: 14 })).toBe(true);      // 20 px to the right
        expect(inCloud(cloud, { x: 124, y: 90, width: 18, height: 14 })).toBe(true);      // edge exactly on the radius
        expect(inCloud(cloud, { x: 125, y: 90, width: 18, height: 14 })).toBe(false);
    });
    it('measures to the corner diagonally', () => {
        expect(inCloud(cloud, { x: 116, y: 116, width: 10, height: 10 })).toBe(true);     // corner 16·√2 ≈ 22.6 px away
        expect(inCloud(cloud, { x: 117, y: 117, width: 10, height: 10 })).toBe(false);    // 17·√2 ≈ 24.04 px: just out
    });
    it('a box around the centre counts', () => {
        expect(inCloud(cloud, { x: 90, y: 90, width: 20, height: 20 })).toBe(true);
    });
});
