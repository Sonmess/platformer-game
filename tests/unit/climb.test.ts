import { describe, expect, it } from 'vitest';
import { atTop, climbVelocity, launchVelocity, pastBottom, wantsGrab, zoneAt, type Box, type ClimbZone } from '../../src/core/climb';

const vine: ClimbZone = { kind: 'vine', x: 100, y: 0, width: 16, height: 200 };
const trunk: ClimbZone = { kind: 'trunk', x: 40, y: 100, width: 16, height: 140 };
/** An 18×14 hitbox with its centre at (cx, cy). */
const at = (cx: number, cy: number): Box => ({ left: cx - 9, right: cx + 9, top: cy - 7, bottom: cy + 7 });

describe('zoneAt', () => {
    it('finds the zone under the hitbox centre, give or take the side margin', () => {
        expect(zoneAt([vine, trunk], at(108, 100), 4, 4)).toBe(vine);
        expect(zoneAt([vine, trunk], at(97, 100), 4, 4)).toBe(vine);       // 3 px beside it
        expect(zoneAt([vine, trunk], at(95, 100), 4, 4)).toBeNull();       // 5 px beside it
        expect(zoneAt([vine, trunk], at(48, 200), 4, 4)).toBe(trunk);
    });

    it('lets the paws reach a little past the hitbox vertically', () => {
        // Vine bottom at 200: a hitbox whose top is 3 px below it still reaches, 5 px does not.
        expect(zoneAt([vine], at(108, 210), 4, 4)).toBe(vine);
        expect(zoneAt([vine], at(108, 212), 4, 4)).toBeNull();
        // Trunk top at 100: a hitbox bottom 4 px above it still reaches.
        expect(zoneAt([trunk], at(48, 89), 4, 4)).toBe(trunk);
        expect(zoneAt([trunk], at(48, 88), 4, 4)).toBeNull();
    });

    it('picks the nearest of two overlapping zones', () => {
        const near: ClimbZone = { ...vine, x: 110 };
        expect(zoneAt([vine, near], at(118, 100), 4, 4)).toBe(near);
    });
});

describe('wantsGrab', () => {
    it('up grabs a vine or a trunk, on the ground or in the air', () => {
        for (const kind of ['vine', 'trunk'] as const) {
            for (const onGround of [true, false]) expect(wantsGrab({ kind, up: true, onGround, dir: 0, dx: 0 })).toBe(true);
        }
    });

    it('a vine needs up', () => {
        expect(wantsGrab({ kind: 'vine', up: false, onGround: false, dir: 1, dx: 5 })).toBe(false);
    });

    it('a trunk catches a jump against it, but not a walk past it or a jump away from it', () => {
        expect(wantsGrab({ kind: 'trunk', up: false, onGround: false, dir: 1, dx: 5 })).toBe(true);
        expect(wantsGrab({ kind: 'trunk', up: false, onGround: false, dir: -1, dx: -5 })).toBe(true);
        expect(wantsGrab({ kind: 'trunk', up: false, onGround: true, dir: 1, dx: 5 })).toBe(false);
        expect(wantsGrab({ kind: 'trunk', up: false, onGround: false, dir: -1, dx: 5 })).toBe(false);
        expect(wantsGrab({ kind: 'trunk', up: false, onGround: false, dir: 0, dx: 5 })).toBe(false);
    });
});

describe('climbing', () => {
    it('up climbs, down slides down, both or neither hold still', () => {
        expect(climbVelocity(true, false, 70)).toBe(-70);
        expect(climbVelocity(false, true, 70)).toBe(70);
        expect(climbVelocity(true, true, 70)).toBe(0);
        expect(climbVelocity(false, false, 70)).toBe(0);
    });

    it('knows the top (head at the zone top) and the end of a vine (middle below its bottom)', () => {
        expect(atTop(trunk, at(48, 107))).toBe(true);
        expect(atTop(trunk, at(48, 108))).toBe(false);
        expect(pastBottom(vine, at(108, 200))).toBe(false);
        expect(pastBottom(vine, at(108, 201))).toBe(true);
    });

    it('launch speed reaches the asked height', () => {
        const g = 900, v = launchVelocity(24, g);
        expect(v).toBeLessThan(0);
        expect((v * v) / (2 * g)).toBeCloseTo(24, 6);
    });
});
