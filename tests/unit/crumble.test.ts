import { describe, expect, it } from 'vitest';
import { Crumble } from '../../src/core/crumble';

const make = () => new Crumble(500, 600, 3000);

describe('Crumble', () => {
    it('stays solid until touched', () => {
        const c = make();
        expect(c.update(10_000, true)).toBeNull();
        expect(c.phase).toBe('solid');
    });

    it('shakes, falls, disappears and comes back, in order and on time', () => {
        const c = make();
        expect(c.touch()).toBe(true);
        expect(c.solid).toBe(true);                         // still standable while shaking
        expect(c.update(499, true)).toBeNull();
        expect(c.update(1, true)).toBe('falling');
        expect(c.solid).toBe(false);
        expect(c.update(600, true)).toBe('gone');
        expect(c.update(2999, true)).toBeNull();
        expect(c.update(1, true)).toBe('solid');
    });

    it('a second touch while shaking does not restart the timer', () => {
        const c = make();
        c.touch();
        c.update(400, true);
        expect(c.touch()).toBe(false);
        expect(c.update(100, true)).toBe('falling');
    });

    it('waits to come back while its spot is taken', () => {
        const c = make();
        c.touch();
        c.update(500, true);
        c.update(600, true);
        expect(c.update(5000, false)).toBeNull();
        expect(c.phase).toBe('gone');
        expect(c.update(16, true)).toBe('solid');
    });

    it('reset puts it back at once', () => {
        const c = make();
        c.touch();
        c.update(500, true);
        c.reset();
        expect(c.phase).toBe('solid');
        expect(c.solid).toBe(true);
    });
});
