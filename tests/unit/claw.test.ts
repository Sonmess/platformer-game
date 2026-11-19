import { describe, expect, it } from 'vitest';
import { clawBox, clawHits, clawOutcome, type ClawSwipe } from '../../src/core/claw';

const swipe = (dir: 1 | -1): ClawSwipe => ({ x: 100, y: 50, dir, reach: 14, behind: 9, halfHeight: 12 });
const box = (left: number, top: number, w = 14, h = 10) => ({ left, right: left + w, top, bottom: top + h });

describe('claw reach', () => {
    it('spans from behind the origin to the reach, in the facing direction', () => {
        expect(clawBox(swipe(1))).toEqual({ left: 91, right: 114, top: 38, bottom: 62 });
        expect(clawBox(swipe(-1))).toEqual({ left: 86, right: 109, top: 38, bottom: 62 });
    });

    it('hits a box in front, misses one past the reach or behind the cat', () => {
        expect(clawHits(swipe(1), box(110, 45))).toBe(true);
        expect(clawHits(swipe(1), box(115, 45))).toBe(false);
        expect(clawHits(swipe(1), box(70, 45))).toBe(false);
        expect(clawHits(swipe(-1), box(70, 45))).toBe(false);
        expect(clawHits(swipe(-1), box(80, 45))).toBe(true);
    });

    it('reaches a little above and below, not further', () => {
        expect(clawHits(swipe(1), box(105, 30))).toBe(true);     // bottom 40 >= top 38
        expect(clawHits(swipe(1), box(105, 20))).toBe(false);    // bottom 30
        expect(clawHits(swipe(1), box(105, 63))).toBe(false);
    });
});

describe('claw outcome', () => {
    it('an unscared hedgehog pricks; a scared one or a crow flees', () => {
        expect(clawOutcome(true, false)).toBe('prick');
        expect(clawOutcome(true, true)).toBe('flee');
        expect(clawOutcome(false, false)).toBe('flee');
        expect(clawOutcome(false, true)).toBe('flee');
    });
});
