import { describe, expect, it } from 'vitest';
import { EdgeLatch } from '../../src/systems/inputEdges';

describe('EdgeLatch', () => {
    it('reports pressed only on the first held frame', () => {
        const l = new EdgeLatch();
        expect(l.update(true)).toEqual({ pressed: true, released: false });
        expect(l.update(true)).toEqual({ pressed: false, released: false });
    });

    it('reports released only on the first frame after holding', () => {
        const l = new EdgeLatch();
        l.update(true);
        expect(l.update(false)).toEqual({ pressed: false, released: true });
        expect(l.update(false)).toEqual({ pressed: false, released: false });
    });

    it('reset forgets the held state', () => {
        const l = new EdgeLatch();
        l.update(true);
        l.reset();
        expect(l.update(true).pressed).toBe(true);
    });

    it('reset to held: a key still down after the reset is not a new press', () => {
        const l = new EdgeLatch();
        l.reset(true);
        expect(l.update(true).pressed).toBe(false);
        expect(l.update(false).released).toBe(true);
    });
});
