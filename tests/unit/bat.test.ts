import { describe, expect, it } from 'vitest';
import { BatFlight } from '../../src/core/bat';

const T = { TRIGGER_X: 40, TRIGGER_BELOW: 120, WAKE_MS: 300, SWOOP_MS: 1000, REST_MS: 800, MAX_REACH_X: 56, MAX_DROP: 100 };

describe('BatFlight', () => {
    it('hangs while the cat is far, beside it at the same height, or above it', () => {
        const b = new BatFlight(T);
        for (const cat of [null, { x: 80, y: 60 }, { x: 0, y: 0 }, { x: 0, y: -20 }, { x: 10, y: 200 }]) {
            expect(b.update(16, cat)).toBeNull();
        }
        expect(b.phase).toBe('hanging');
        expect(b.offset).toEqual({ x: 0, y: 0 });
    });

    it('wakes (the warning) when the cat comes below it, then swoops, rests and hangs again', () => {
        const b = new BatFlight(T);
        expect(b.update(16, { x: 20, y: 60 })).toBe('waking');
        expect(b.target).toEqual({ x: 20, y: 60 });
        expect(b.offset).toEqual({ x: 0, y: 0 });                         // still on the roost while waking
        expect(b.update(299, null)).toBeNull();
        expect(b.update(1, null)).toBe('swooping');
        expect(b.update(1000, null)).toBe('resting');
        expect(b.update(16, { x: 0, y: 50 })).toBeNull();                  // resting: no new swoop yet
        expect(b.update(784, null)).toBe('hanging');
    });

    it('swoops in an arc: at the target halfway, back on the roost at the end, the drop leading the sideways move', () => {
        const b = new BatFlight(T);
        b.update(16, { x: 30, y: 80 });
        b.update(300, null);
        b.update(250, null);                                               // a quarter of the way
        const q = b.offset;
        expect(q.y / 80).toBeGreaterThan(q.x / 30);                       // down first
        b.update(250, null);                                               // halfway
        expect(b.offset.x).toBeCloseTo(30, 5);
        expect(b.offset.y).toBeCloseTo(80, 5);
        b.update(499, null);
        expect(Math.abs(b.offset.x)).toBeLessThan(1);
    });

    it('aims no further than its reach; a reset puts it back to sleep', () => {
        const b = new BatFlight(T);
        b.update(16, { x: -40, y: 119 });
        expect(b.target).toEqual({ x: -40, y: 100 });
        b.reset();
        expect(b).toMatchObject({ phase: 'hanging', elapsedMs: 0, target: { x: 0, y: 0 } });
    });
});
