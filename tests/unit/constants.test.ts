import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/config/constants';

// ADR 0002: pixel art at a logical resolution that scales to 1920×1080 by an integer factor.
describe('GAME resolution', () => {
    it('is 16:9', () => {
        expect(GAME.WIDTH * 9).toBe(GAME.HEIGHT * 16);
    });

    it('scales to 1920×1080 by an integer zoom', () => {
        expect(Number.isInteger(1920 / GAME.WIDTH)).toBe(true);
        expect(1920 / GAME.WIDTH).toBe(1080 / GAME.HEIGHT);
    });
});
