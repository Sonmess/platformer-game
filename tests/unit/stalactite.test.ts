import { describe, expect, it } from 'vitest';
import { StalactiteLife, catUnder } from '../../src/core/stalactite';

const T = { SHAKE_MS: 400, FALL_GRAVITY: 1000, MAX_FALL_SPEED: 400 };
const step = (s: StalactiteLife, ms: number, below = false, dt = 16) => {
    const changes: string[] = [];
    for (let t = 0; t < ms; t += dt) { const c = s.update(dt, below); if (c) changes.push(c); }
    return changes;
};

describe('StalactiteLife', () => {
    it('hangs harmlessly until the cat comes under it', () => {
        const s = new StalactiteLife(T, 100);
        expect(step(s, 2000)).toEqual([]);
        expect(s.phase).toBe('hanging');
        expect(s.harmful).toBe(false);
    });

    it('shakes as a warning, then falls (harmful) and shatters on the floor', () => {
        const s = new StalactiteLife(T, 100);
        expect(s.update(16, true)).toBe('shaking');
        expect(s.harmful).toBe(false);
        expect(s.update(390, false)).toBeNull();                       // still shaking, even with the cat gone
        expect(s.update(10, false)).toBe('falling');
        expect(s.harmful).toBe(true);
        expect(step(s, 1000)).toEqual(['shattered']);
        expect(s.dropPx).toBe(100);
        expect(s.harmful).toBe(false);
    });

    it('falls with gravity, capped at a top speed (frame-rate independent)', () => {
        const fine = new StalactiteLife(T, 1e6), coarse = new StalactiteLife(T, 1e6);
        fine.update(16, true); coarse.update(16, true);
        expect(fine.update(400, false)).toBe('falling');
        expect(coarse.update(400, false)).toBe('falling');
        step(fine, 288, false, 4); step(coarse, 288, false, 32);      // the same 288 ms in small and big steps
        expect(Math.abs(fine.dropPx - coarse.dropPx)).toBeLessThan(6);
        step(fine, 3000, false, 16);
        expect(fine.speed).toBe(T.MAX_FALL_SPEED);
    });

    it('over a pit it never lands; a reset hangs it back', () => {
        const s = new StalactiteLife(T, Infinity);
        s.update(16, true);
        step(s, 5000);
        expect(s.phase).toBe('falling');
        s.reset();
        expect(s).toMatchObject({ phase: 'hanging', dropPx: 0, speed: 0 });
    });
});

describe('catUnder', () => {
    const cat = (cx: number, top: number) => ({ left: cx - 9, right: cx + 9, top });
    it('needs the cat below the tip and close sideways', () => {
        expect(catUnder(100, 50, cat(100, 200), 20)).toBe(true);
        expect(catUnder(100, 50, cat(120, 200), 20)).toBe(true);
        expect(catUnder(100, 50, cat(121, 200), 20)).toBe(false);
        expect(catUnder(100, 50, cat(100, 40), 20)).toBe(false);       // above the tip (on the ceiling)
    });
});
