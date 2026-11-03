import { describe, expect, it } from 'vitest';
import { derivePhysics, PLAYER_FEEL, TILE } from '../../src/config/constants';

describe('derivePhysics', () => {
    const p = derivePhysics(PLAYER_FEEL, TILE);
    const h = PLAYER_FEEL.jumpHeightTiles * TILE;

    it('reaches the designed jump height (v² / 2g)', () => {
        expect(p.jumpVelocity ** 2 / (2 * p.gravity)).toBeCloseTo(h, 6);
    });

    it('reaches the apex at timeToApex (|v| / g)', () => {
        expect(-p.jumpVelocity / p.gravity).toBeCloseTo(PLAYER_FEEL.timeToApex, 6);
    });

    it('cannot tunnel through a tile at max fall speed (60 FPS)', () => {
        expect(PLAYER_FEEL.maxFallSpeed / 60).toBeLessThan(TILE);
    });
});
